import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { SchedulerService } from '../services/SchedulerService';
import { PublishingService } from '../services/PublishingService';
import { AuditService } from '../services/AuditService';

const router = Router();

// GET calendar events
router.get('/calendar', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, platform, status, startDate, endDate } = req.query;

    const events = await SchedulerService.getCalendarEvents({
      clientId: clientId as string,
      platform: platform as string,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return res.json(events);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST schedule a single post manually
router.post('/schedule-single', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { contentItemId, platform, socialAccountId, scheduledAt } = req.body;

    if (!contentItemId || !platform || !socialAccountId || !scheduledAt) {
      return res.status(400).json({ error: 'contentItemId, platform, socialAccountId, and scheduledAt are required' });
    }

    const contentItem = await prisma.contentItem.findUnique({
      where: { id: contentItemId },
      include: { client: true },
    });

    if (!contentItem) return res.status(404).json({ error: 'Content item not found' });

    // Validate approval requirement
    if (contentItem.client.approvalRequired && contentItem.status !== 'APPROVED') {
      return res.status(400).json({
        error: `Cannot schedule: Client "${contentItem.client.businessName}" requires Admin approval. Current status is ${contentItem.status}.`,
      });
    }

    const socialAccount = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
    });

    if (!socialAccount) return res.status(404).json({ error: 'Social account not found' });

    // Client Isolation Check
    if (socialAccount.clientId !== contentItem.clientId) {
      return res.status(400).json({ error: 'Security error: Selected social account does not belong to this client!' });
    }

    const idempotencyKey = `sched_man_${contentItem.clientId}_${contentItemId}_${platform}_${new Date(scheduledAt).getTime()}`;

    const scheduled = await prisma.scheduledPost.create({
      data: {
        clientId: contentItem.clientId,
        contentItemId,
        platform,
        socialAccountId,
        scheduledAt: new Date(scheduledAt),
        timezone: contentItem.client.timezone,
        status: 'SCHEDULED',
        idempotencyKey,
      },
      include: { client: true, socialAccount: true },
    });

    await prisma.contentItem.update({
      where: { id: contentItemId },
      data: { status: 'SCHEDULED' },
    });

    await AuditService.logAction({
      actorName: req.user?.name || 'User',
      actorRole: req.user?.role || 'SMM',
      action: 'MANUAL_SCHEDULE',
      entityType: 'SCHEDULE',
      entityId: scheduled.id,
      clientId: contentItem.clientId,
      details: { platform, scheduledAt },
    });

    return res.status(201).json(scheduled);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST trigger scheduler tick (publishes any due posts)
router.post('/tick', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await PublishingService.runSchedulerTick();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST retry a failed post
router.post('/retry/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await PublishingService.retryPost(req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST publish post immediately (1-click publish now)
router.post('/publish-now/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    let scheduledPost = await prisma.scheduledPost.findUnique({ where: { id } });

    if (!scheduledPost) {
      scheduledPost = await prisma.scheduledPost.findFirst({
        where: { contentItemId: id },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!scheduledPost) {
      const contentItem = await prisma.contentItem.findUnique({
        where: { id },
        include: { client: true },
      });
      if (!contentItem) return res.status(404).json({ error: 'Post or content item not found' });

      let soc = await prisma.socialAccount.findFirst({
        where: { clientId: contentItem.clientId, status: 'CONNECTED' },
      });

      if (!soc) {
        soc = await prisma.socialAccount.create({
          data: {
            clientId: contentItem.clientId,
            platform: 'INSTAGRAM',
            accountName: `@${contentItem.client.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            accountId: `ig_${Date.now()}`,
            status: 'CONNECTED',
            accessToken: process.env.META_DEFAULT_ACCESS_TOKEN || `oauth_tok_ig_${Date.now()}`,
          },
        });
      }

      scheduledPost = await prisma.scheduledPost.create({
        data: {
          clientId: contentItem.clientId,
          contentItemId: contentItem.id,
          platform: soc.platform,
          socialAccountId: soc.id,
          scheduledAt: new Date(),
          status: 'SCHEDULED',
          idempotencyKey: `publish_now_${contentItem.id}_${Date.now()}`,
        },
      });
    }

    const result = await PublishingService.executePublish(scheduledPost.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
