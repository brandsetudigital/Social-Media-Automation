import { Router, Response } from 'express';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { AuditService } from '../services/AuditService';
import { NotificationService } from '../services/NotificationService';
import { PublishingService } from '../services/PublishingService';

const router = Router();

// GET pending approvals (Admin view)
router.get('/pending', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.query;

    const pending = await prisma.approvalRequest.findMany({
      where: {
        status: 'PENDING',
        ...((clientId && clientId !== 'ALL' && clientId !== 'undefined' && clientId !== 'null') ? { contentItem: { clientId: clientId as string } } : {}),
      },
      include: {
        contentItem: {
          include: {
            client: { select: { id: true, businessName: true, category: true, logo: true } },
            variants: true,
            driveFile: true,
          },
        },
        requestedBy: { select: { name: true, email: true, role: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return res.json(pending);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST Approve content (Admin only)
router.post('/:id/approve', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // ApprovalRequest ID or ContentItem ID
    const { feedbackNote, publishMode: reqPublishMode } = req.body;

    let approval = await prisma.approvalRequest.findFirst({
      where: { OR: [{ id }, { contentItemId: id }] },
      include: { contentItem: { include: { client: true, variants: true } } },
    });

    if (!approval) {
      const item = await prisma.contentItem.findUnique({
        where: { id },
        include: { client: true, variants: true },
      });
      if (!item) return res.status(404).json({ error: 'Content item or approval request not found' });

      approval = await prisma.approvalRequest.create({
        data: {
          contentItemId: item.id,
          requestedById: req.user?.id || 'admin',
          status: 'PENDING',
          feedbackNote: feedbackNote || 'Approved directly by Admin',
        },
        include: { contentItem: { include: { client: true, variants: true } } },
      });
    }

    // Parse scheduling metadata from submission if available
    let scheduleMeta: any = null;
    try {
      if (approval.feedbackNote && approval.feedbackNote.startsWith('{')) {
        scheduleMeta = JSON.parse(approval.feedbackNote);
      }
    } catch {
      // not JSON
    }

    // Update approval record
    await prisma.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: 'APPROVED',
        feedbackNote: feedbackNote || 'Approved by Admin',
        reviewedById: req.user?.id,
        reviewedAt: new Date(),
      },
    });

    // CRITICAL FIX: Mark contentItem as APPROVED immediately so PublishingService does not block immediate publication
    await prisma.contentItem.update({
      where: { id: approval.contentItemId },
      data: { status: 'APPROVED' },
    });

    const targetPlatforms = (scheduleMeta?.platforms && scheduleMeta.platforms.length > 0)
      ? scheduleMeta.platforms
      : (approval.contentItem?.variants && approval.contentItem.variants.length > 0)
      ? [...new Set(approval.contentItem.variants.map((v: any) => v.platform))]
      : ['INSTAGRAM', 'FACEBOOK'];

    const existingSched = await prisma.scheduledPost.findFirst({
      where: { contentItemId: approval.contentItemId },
    });

    const scheduledDate = scheduleMeta?.scheduledAt
      ? new Date(scheduleMeta.scheduledAt)
      : existingSched?.scheduledAt
      ? existingSched.scheduledAt
      : new Date(Date.now() + 86400000);

    const publishMode = reqPublishMode || scheduleMeta?.publishMode || 'SCHEDULED';

    let finalStatus = 'SCHEDULED';
    let responseMsg = `Content approved and scheduled for ${approval.contentItem.client.businessName}`;

    if (publishMode === 'IMMEDIATE') {
      // 1. Publish immediately to all selected platforms
      let allSuccess = true;
      let lastFailureMsg = '';

      for (const plat of targetPlatforms) {
        let socialAccount = await prisma.socialAccount.findFirst({
          where: { clientId: approval.contentItem.clientId, platform: plat, status: 'CONNECTED' },
        });

        if (!socialAccount) {
          socialAccount = await prisma.socialAccount.create({
            data: {
              clientId: approval.contentItem.clientId,
              platform: plat,
              accountName: `@${approval.contentItem.client.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
              accountId: `${plat.toLowerCase()}_${Date.now()}`,
              status: 'CONNECTED',
              accessToken: process.env.META_DEFAULT_ACCESS_TOKEN || `oauth_tok_${plat.toLowerCase()}_${Date.now()}`,
              tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            },
          });
        }

        const idempotencyKey = `sched_now_${approval.contentItem.clientId}_${approval.contentItemId}_${plat}_${Date.now()}`;
        const post = await prisma.scheduledPost.create({
          data: {
            clientId: approval.contentItem.clientId,
            contentItemId: approval.contentItemId,
            platform: plat,
            socialAccountId: socialAccount.id,
            scheduledAt: new Date(),
            status: 'SCHEDULED',
            idempotencyKey,
          },
        });

        const pubResult = await PublishingService.executePublish(post.id);
        if (!pubResult.success) {
          allSuccess = false;
          lastFailureMsg = pubResult.message;
          await prisma.scheduledPost.update({
            where: { id: post.id },
            data: { status: 'FAILED', lastError: pubResult.message },
          }).catch(() => {});
        }
      }

      if (allSuccess) {
        finalStatus = 'PUBLISHED';
        responseMsg = `Approved! Creative published live across connected accounts (${targetPlatforms.join(', ')}).`;
      } else {
        finalStatus = 'FAILED';
        responseMsg = `Approved, but live publishing failed: ${lastFailureMsg}`;
      }
    } else if (publishMode === 'SCHEDULED' || scheduledDate) {
      // 2. Create ScheduledPost entries for Calendar view across all selected platforms
      for (const plat of targetPlatforms) {
        let socialAccount = await prisma.socialAccount.findFirst({
          where: { clientId: approval.contentItem.clientId, platform: plat, status: 'CONNECTED' },
        });

        if (!socialAccount) {
          socialAccount = await prisma.socialAccount.create({
            data: {
              clientId: approval.contentItem.clientId,
              platform: plat,
              accountName: `@${approval.contentItem.client.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
              accountId: `${plat.toLowerCase()}_${Date.now()}`,
              status: 'CONNECTED',
              accessToken: process.env.META_DEFAULT_ACCESS_TOKEN || `oauth_tok_${plat.toLowerCase()}_${Date.now()}`,
              tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            },
          });
        }

        const idempotencyKey = `sched_${approval.contentItem.clientId}_${approval.contentItemId}_${plat}_${scheduledDate.getTime()}`;
        await prisma.scheduledPost.upsert({
          where: { idempotencyKey },
          update: { scheduledAt: scheduledDate, status: 'SCHEDULED' },
          create: {
            clientId: approval.contentItem.clientId,
            contentItemId: approval.contentItemId,
            platform: plat,
            socialAccountId: socialAccount.id,
            scheduledAt: scheduledDate,
            status: 'SCHEDULED',
            idempotencyKey,
          },
        });
      }

      finalStatus = 'SCHEDULED';
      responseMsg = `Approved! Post scheduled on Agency Calendar for ${scheduledDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} across ${targetPlatforms.join(', ')}.`;
    } else {
      // 3. Fallback: Add to client content queue for auto-scheduling cycles
      await prisma.contentQueueItem.upsert({
        where: { contentItemId: approval.contentItemId },
        update: {
          contentType: approval.contentItem.contentType,
        },
        create: {
          clientId: approval.contentItem.clientId,
          contentItemId: approval.contentItemId,
          contentType: approval.contentItem.contentType,
          priority: 0,
        },
      });
    }

    // Update content item status
    await prisma.contentItem.update({
      where: { id: approval.contentItemId },
      data: { status: finalStatus },
    });

    // Notify SMM team
    await NotificationService.create({
      userRole: 'SMM',
      clientId: approval.contentItem.clientId,
      type: 'SYSTEM',
      title: 'Content Approved ✓',
      message: `Admin approved "${approval.contentItem.title}" for ${approval.contentItem.client.businessName}. ${responseMsg}`,
    });

    await AuditService.logAction({
      actorName: req.user?.name || 'Admin',
      actorRole: 'ADMIN',
      action: 'APPROVE_CONTENT',
      entityType: 'CONTENT',
      entityId: approval.contentItemId,
      clientId: approval.contentItem.clientId,
      details: { title: approval.contentItem.title, publishMode, scheduledAt: scheduleMeta?.scheduledAt, targetPlatforms },
    });

    return res.json({ message: responseMsg });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST Request changes (Admin only)
router.post('/:id/request-changes', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ error: 'Feedback comment is required when requesting changes' });
    }

    const approval = await prisma.approvalRequest.findFirst({
      where: { OR: [{ id }, { contentItemId: id }] },
      include: { contentItem: { include: { client: true } } },
    });

    if (!approval) return res.status(404).json({ error: 'Approval request not found' });

    await prisma.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: 'CHANGES_REQUESTED',
        feedbackNote: comment,
        reviewedById: req.user?.id,
        reviewedAt: new Date(),
      },
    });

    await prisma.contentItem.update({
      where: { id: approval.contentItemId },
      data: { status: 'CHANGES_REQUESTED' },
    });

    // Notify SMM
    await NotificationService.create({
      userRole: 'SMM',
      clientId: approval.contentItem.clientId,
      type: 'CONTENT_CHANGES_REQUESTED',
      title: `Changes Requested: ${approval.contentItem.client.businessName}`,
      message: `Admin feedback on "${approval.contentItem.title}": "${comment}"`,
    });

    await AuditService.logAction({
      actorName: req.user?.name || 'Admin',
      actorRole: 'ADMIN',
      action: 'REQUEST_CHANGES',
      entityType: 'CONTENT',
      entityId: approval.contentItemId,
      clientId: approval.contentItem.clientId,
      details: { comment },
    });

    return res.json({ message: 'Changes requested successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST Reject content (Admin only)
router.post('/:id/reject', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const approval = await prisma.approvalRequest.findFirst({
      where: { OR: [{ id }, { contentItemId: id }] },
      include: { contentItem: { include: { client: true } } },
    });

    if (!approval) return res.status(404).json({ error: 'Approval request not found' });

    await prisma.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: 'REJECTED',
        feedbackNote: comment || 'Rejected by Admin',
        reviewedById: req.user?.id,
        reviewedAt: new Date(),
      },
    });

    await prisma.contentItem.update({
      where: { id: approval.contentItemId },
      data: { status: 'REJECTED' },
    });

    await NotificationService.create({
      userRole: 'SMM',
      clientId: approval.contentItem.clientId,
      type: 'CONTENT_REJECTED',
      title: `Content Rejected: ${approval.contentItem.title}`,
      message: `Admin rejected creative for ${approval.contentItem.client.businessName}.`,
    });

    await AuditService.logAction({
      actorName: req.user?.name || 'Admin',
      actorRole: 'ADMIN',
      action: 'REJECT_CONTENT',
      entityType: 'CONTENT',
      entityId: approval.contentItemId,
      clientId: approval.contentItem.clientId,
      details: { comment },
    });

    return res.json({ message: 'Content rejected' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
