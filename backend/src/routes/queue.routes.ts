import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import prisma from '../prisma';

const router = Router();

// GET all queues for a client (Post, Reel, Story, GBP queues)
router.get('/:clientId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;

    const queueItems = await prisma.contentQueueItem.findMany({
      where: { clientId },
      include: {
        contentItem: {
          include: {
            variants: true,
            driveFile: true,
          },
        },
      },
      orderBy: { priority: 'asc' },
    });

    const postQueue = queueItems.filter((q) => q.contentType === 'POST');
    const reelQueue = queueItems.filter((q) => q.contentType === 'REEL');
    const storyQueue = queueItems.filter((q) => q.contentType === 'STORY');
    const gbpQueue = queueItems.filter((q) => q.contentType === 'GOOGLE_BUSINESS_POST');

    return res.json({
      clientId,
      counts: {
        posts: postQueue.length,
        reels: reelQueue.length,
        stories: storyQueue.length,
        gbp: gbpQueue.length,
        total: queueItems.length,
      },
      queues: {
        posts: postQueue,
        reels: reelQueue,
        stories: storyQueue,
        gbp: gbpQueue,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
