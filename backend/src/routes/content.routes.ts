import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { AuditService } from '../services/AuditService';
import { NotificationService } from '../services/NotificationService';
import path from 'path';
import fs from 'fs';

const router = Router();

// GET content inbox items with filtering
router.get('/inbox', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, status, contentType, search } = req.query;

    const where: any = {};
    if (clientId && clientId !== 'ALL' && clientId !== 'undefined' && clientId !== 'null') {
      where.clientId = clientId as string;
    }
    if (status && status !== 'ALL') where.status = status as string;
    if (contentType && contentType !== 'ALL') where.contentType = contentType as string;
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { driveFile: { filename: { contains: search as string } } },
      ];
    }

    const items = await prisma.contentItem.findMany({
      where,
      include: {
        client: {
          select: { id: true, businessName: true, category: true, logo: true, brandColors: true, approvalRequired: true },
        },
        driveFile: true,
        variants: true,
        approvalRequests: {
          include: {
            reviewedBy: { select: { id: true, name: true, role: true } },
          },
          orderBy: { requestedAt: 'desc' },
          take: 1,
        },
        scheduledPosts: {
          include: {
            socialAccount: { select: { accountName: true, platform: true } },
            publishingLogs: { orderBy: { executedAt: 'desc' }, take: 1 },
          },
          orderBy: { scheduledAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Auto-clean any dead blob: URLs stored in thumbnailUrl
    items.forEach((item) => {
      if (item.thumbnailUrl && item.thumbnailUrl.startsWith('blob:')) {
        item.thumbnailUrl = item.mediaUrl;
        prisma.contentItem.update({
          where: { id: item.id },
          data: { thumbnailUrl: item.mediaUrl },
        }).catch(() => {});
      }
    });

    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET single content item
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.contentItem.findUnique({
      where: { id: req.params.id },
      include: {
        client: {
          include: { brandProfile: true, socialAccounts: true },
        },
        driveFile: true,
        variants: true,
        approvalRequests: {
          include: { requestedBy: true, reviewedBy: true },
          orderBy: { requestedAt: 'desc' },
        },
        scheduledPosts: {
          include: { socialAccount: true },
        },
      },
    });

    if (!item) return res.status(404).json({ error: 'Content item not found' });
    return res.json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT review & map creative (assign platforms, caption, hashtags, submit for approval)
router.put('/:id/review', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, contentType, platforms, caption, hashtags, cta, scheduledAt, submitForApproval } = req.body;

    const item = await prisma.contentItem.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!item) return res.status(404).json({ error: 'Content item not found' });

    // Update base item
    const newStatus = submitForApproval
      ? (item.client.approvalRequired ? 'READY_FOR_APPROVAL' : 'APPROVED')
      : 'DRAFT';

    const updatedItem = await prisma.contentItem.update({
      where: { id },
      data: {
        title: title || item.title,
        contentType: contentType || item.contentType,
        status: newStatus,
      },
    });

    // Save platform variants
    if (platforms && Array.isArray(platforms)) {
      // Clear old variants
      await prisma.contentVariant.deleteMany({ where: { contentItemId: id } });

      for (const plat of platforms) {
        await prisma.contentVariant.create({
          data: {
            contentItemId: id,
            platform: plat,
            caption: caption || '',
            hashtags: hashtags || '',
            cta: cta || item.client.businessName,
          },
        });
      }
    }

    // Handle submission for approval
    const scheduleMeta = {
      publishMode: req.body.publishMode || (scheduledAt ? 'SCHEDULED' : 'IMMEDIATE'),
      scheduledAt: scheduledAt || null,
      platforms: (platforms && platforms.length > 0) ? platforms : ['INSTAGRAM', 'FACEBOOK', 'GOOGLE_BUSINESS'],
      requestedBy: req.user?.name || 'SMM',
    };

    if (submitForApproval && item.client.approvalRequired) {
      await prisma.approvalRequest.create({
        data: {
          contentItemId: id,
          requestedById: req.user?.id || 'admin',
          status: 'PENDING',
          feedbackNote: JSON.stringify(scheduleMeta),
        },
      });

      const schedText = scheduleMeta.publishMode === 'SCHEDULED' && scheduleMeta.scheduledAt
        ? ` (Scheduled for ${new Date(scheduleMeta.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })})`
        : ' (Publish Immediately upon approval)';

      await NotificationService.create({
        userRole: 'ADMIN',
        clientId: item.clientId,
        type: 'PENDING_APPROVAL',
        title: `Approval Required: ${item.client.businessName}`,
        message: `${req.user?.name || 'SMM'} submitted "${updatedItem.title}" (${updatedItem.contentType})${schedText} for approval.`,
      });

      await AuditService.logAction({
        actorName: req.user?.name || 'SMM',
        actorRole: req.user?.role || 'SMM',
        action: 'SUBMIT_FOR_APPROVAL',
        entityType: 'CONTENT',
        entityId: id,
        clientId: item.clientId,
        details: { title: updatedItem.title, platforms },
      });
    } else if (submitForApproval && !item.client.approvalRequired) {
      // Direct approve & queue if approval not required
      await prisma.contentQueueItem.upsert({
        where: { contentItemId: id },
        update: { contentType: updatedItem.contentType },
        create: {
          clientId: item.clientId,
          contentItemId: id,
          contentType: updatedItem.contentType,
          priority: 0,
        },
      });
    }

    return res.json({
      message: submitForApproval ? 'Content submitted for Admin approval' : 'Draft saved successfully',
      item: updatedItem,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST create manual creative
router.post('/create', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    let { clientId, title, contentType, mediaUrl, thumbnailUrl, caption, hashtags, platforms, publishMode, scheduledAt, submitForApproval, platformCaptions, platformHashtags } = req.body;

    if (!title || !mediaUrl) {
      return res.status(400).json({ error: 'title and mediaUrl are required' });
    }

    let client: any = null;
    if (clientId && clientId !== 'ALL' && clientId !== 'demo') {
      client = await prisma.client.findUnique({ where: { id: clientId } });
    }

    if (!client) {
      client = (await prisma.client.findFirst({
        where: { businessName: { contains: 'BrandSetu' } },
      })) || (await prisma.client.findFirst());
    }

    if (!client) {
      client = await prisma.client.create({
        data: {
          businessName: 'BrandSetu Digital',
          category: 'Digital Marketing & Social Media Agency',
          location: 'Indore, India',
          approvalRequired: true,
        },
      });
    }

    clientId = client.id;

    const requestedStatus = req.body.status;
    let finalStatus = 'DRAFT';

    // Admin Approval Master Gate:
    // All client videos, reels, and posts intended for schedule or publish MUST go to Admin for approval first.
    const isApprovalRequired = client.approvalRequired !== false;

    if (requestedStatus === 'DRAFT') {
      finalStatus = 'DRAFT';
    } else if (isApprovalRequired || contentType === 'REEL' || submitForApproval || requestedStatus === 'SCHEDULED' || requestedStatus === 'PUBLISHED' || scheduledAt) {
      finalStatus = 'READY_FOR_APPROVAL';
    } else {
      finalStatus = 'DRAFT';
    }

    if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
      thumbnailUrl = mediaUrl;
    }

    const item = await prisma.contentItem.create({
      data: {
        clientId,
        title,
        contentType: contentType || 'POST',
        status: finalStatus,
        mediaUrl,
        thumbnailUrl: thumbnailUrl || mediaUrl,
        source: 'MANUAL',
        createdById: req.user?.id,
      },
    });

    const targetPlatforms = (platforms && Array.isArray(platforms) && platforms.length > 0)
      ? platforms
      : ['INSTAGRAM', 'FACEBOOK', 'GOOGLE_BUSINESS'];

    for (const p of targetPlatforms) {
      const pCaption = (platformCaptions && platformCaptions[p]) || caption || '';
      const pHashtags = (platformHashtags && platformHashtags[p]) || hashtags || '';
      await prisma.contentVariant.create({
        data: {
          contentItemId: item.id,
          platform: p,
          caption: pCaption,
          hashtags: pHashtags,
        },
      });
    }

    // If SCHEDULED or PUBLISHED, ensure ScheduledPost records are created
    if (finalStatus === 'SCHEDULED' || finalStatus === 'PUBLISHED') {
      const scheduledTime = scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 86400000);

      for (const p of targetPlatforms) {
        let soc = await prisma.socialAccount.findFirst({
          where: { clientId, platform: p },
        });

        if (!soc) {
          const isGmb = p === 'GOOGLE_BUSINESS';
          const isPropBabu = (client.businessName || '').toLowerCase().includes('property babu');
          const defaultAccId = isGmb
            ? (isPropBabu ? '2359884925523845124' : '4475899898765251271')
            : `acc_${p.toLowerCase()}_${Date.now()}`;
          const defaultToken = isGmb
            ? (process.env.GOOGLE_BUSINESS_ACCESS_TOKEN || '')
            : (process.env.META_DEFAULT_ACCESS_TOKEN || `oauth_tok_${p.toLowerCase()}_${Date.now()}`);

          soc = await prisma.socialAccount.create({
            data: {
              clientId,
              platform: p,
              accountName: `${client.businessName} (${p})`,
              accountId: defaultAccId,
              status: 'CONNECTED',
              accessToken: defaultToken,
            },
          });
        }

        const idempotencyKey = `sched_post_${clientId}_${item.id}_${p}_${Date.now()}_${Math.random()}`;

        await prisma.scheduledPost.create({
          data: {
            clientId,
            contentItemId: item.id,
            platform: p,
            socialAccountId: soc.id,
            scheduledAt: scheduledTime,
            publishedAt: finalStatus === 'PUBLISHED' ? new Date() : null,
            timezone: client.timezone || 'Asia/Kolkata',
            status: finalStatus,
            idempotencyKey,
          },
        });
      }
    }

    const scheduleMeta = {
      publishMode: publishMode || (scheduledAt ? 'SCHEDULED' : 'IMMEDIATE'),
      scheduledAt: scheduledAt || null,
      platforms: targetPlatforms,
      requestedBy: req.user?.name || 'SMM',
    };

    if (finalStatus === 'READY_FOR_APPROVAL' || (submitForApproval && client.approvalRequired)) {
      await prisma.approvalRequest.create({
        data: {
          contentItemId: item.id,
          requestedById: req.user?.id || (await prisma.user.findFirst({ select: { id: true } }))?.id || '0fde1a6f-4498-41e6-bdbf-1b207d48c28f',
          status: 'PENDING',
          feedbackNote: JSON.stringify(scheduleMeta),
        },
      });

      const schedText = scheduleMeta.publishMode === 'SCHEDULED' && scheduleMeta.scheduledAt
        ? ` (Scheduled for ${new Date(scheduleMeta.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })})`
        : ' (Publish Immediately upon approval)';

      await NotificationService.create({
        userRole: 'ADMIN',
        clientId,
        type: 'PENDING_APPROVAL',
        title: `New Content Submitted: ${client.businessName}`,
        message: `"${title}" (${contentType || 'POST'}) requires Admin review${schedText}.`,
      });
    }

    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST upload media (images and videos)
router.post('/upload', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { filename, fileData, mimeType } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'fileData is required' });
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Extract base64 content
    const base64Content = fileData.includes(';base64,')
      ? fileData.split(';base64,')[1]
      : fileData;

    const buffer = Buffer.from(base64Content, 'base64');
    const isVideo = mimeType?.startsWith('video/') || (filename && /\.(mp4|mov|webm|mkv|ogg)$/i.test(filename));
    const ext = filename ? path.extname(filename) || (isVideo ? '.mp4' : '.jpg') : (isVideo ? '.mp4' : '.jpg');
    const safeBase = (filename ? path.basename(filename, ext) : 'upload').replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueFilename = req.body.preserveFilename && filename
      ? path.basename(filename)
      : `${Date.now()}-${safeBase}${ext}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    await fs.promises.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${uniqueFilename}`;
    return res.json({
      url: fileUrl,
      filename: uniqueFilename,
      size: buffer.length,
      mimeType: mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE content item / post (For Admin and SMM)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Try finding by contentItemId
    const item = await prisma.contentItem.findUnique({
      where: { id },
      include: { client: true },
    });

    if (item) {
      // Delete content item (cascades to variants, approvals, queue items, scheduled posts, logs)
      await prisma.contentItem.delete({
        where: { id },
      });

      await AuditService.logAction({
        actorName: req.user?.name || 'User',
        actorRole: req.user?.role || 'SMM',
        action: 'DELETE_POST',
        entityType: 'CONTENT_ITEM',
        entityId: id,
        clientId: item.clientId,
        details: { title: item.title },
      });

      return res.json({ success: true, message: `Post "${item.title}" deleted successfully.` });
    }

    // 2. Fallback: check if id is a scheduledPostId
    const scheduled = await prisma.scheduledPost.findUnique({
      where: { id },
      include: { contentItem: true, client: true },
    });

    if (scheduled) {
      const postTitle = scheduled.contentItem?.title || 'Scheduled Post';
      const cId = scheduled.contentItemId;
      await prisma.scheduledPost.delete({ where: { id } });

      const remaining = await prisma.scheduledPost.count({ where: { contentItemId: cId } });
      if (remaining === 0 && cId) {
        await prisma.contentItem.delete({ where: { id: cId } }).catch(() => null);
      }

      await AuditService.logAction({
        actorName: req.user?.name || 'User',
        actorRole: req.user?.role || 'SMM',
        action: 'DELETE_SCHEDULED_POST',
        entityType: 'SCHEDULED_POST',
        entityId: id,
        clientId: scheduled.clientId,
        details: { title: postTitle },
      });

      return res.json({ success: true, message: `Post "${postTitle}" deleted successfully.` });
    }

    return res.status(404).json({ error: 'Post or content item not found.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

