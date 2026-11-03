import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { GmbReviewService } from '../services/GmbReviewService';

const router = Router();

// 1. GET /api/reviews - Get reviews for a client or all clients
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, starRating, replyStatus } = req.query;

    const where: any = {};
    if (clientId && clientId !== 'ALL' && clientId !== 'undefined') {
      where.clientId = clientId as string;
    }
    if (starRating && starRating !== 'ALL') {
      where.starRating = Number(starRating);
    }
    if (replyStatus && replyStatus !== 'ALL') {
      where.replyStatus = replyStatus as string;
    }

    const reviews = await prisma.gmbReview.findMany({
      where,
      include: {
        client: {
          select: { id: true, businessName: true, logo: true, category: true },
        },
      },
      orderBy: { reviewCreatedAt: 'desc' },
      take: 50,
    });

    const totalCount = await prisma.gmbReview.count({ where });
    const pendingCount = await prisma.gmbReview.count({
      where: { ...(where.clientId ? { clientId: where.clientId } : {}), replyStatus: 'PENDING' },
    });
    const repliedCount = await prisma.gmbReview.count({
      where: { ...(where.clientId ? { clientId: where.clientId } : {}), replyStatus: 'REPLIED' },
    });

    return res.json({
      reviews,
      stats: {
        total: totalCount,
        pending: pendingCount,
        replied: repliedCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch reviews' });
  }
});

// 2. POST /api/reviews/sync-all - Trigger manual sync for all active clients
router.post('/sync-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await GmbReviewService.runAutoReplyWorker();
    return res.json({
      success: true,
      message: `Sync completed across all clients. Synced ${result.checked} reviews, sent ${result.replied} AI replies.`,
      result,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to sync reviews' });
  }
});

// 3. POST /api/reviews/sync/:clientId - Trigger manual sync for a client
router.post('/sync/:clientId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await GmbReviewService.syncReviewsForClient(clientId);
    return res.json({
      success: true,
      message: `Synced ${result.synced} new reviews, sent ${result.replied} AI replies.`,
      result,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to sync reviews' });
  }
});

// 3. POST /api/reviews/:id/reply - Trigger or re-generate AI reply for a review
router.post('/:id/reply', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { customReply } = req.body;

    if (customReply) {
      await prisma.gmbReview.update({
        where: { id },
        data: {
          replyText: customReply,
          repliedAt: new Date(),
          replyStatus: 'REPLIED',
        },
      });
      return res.json({ success: true, replyText: customReply });
    }

    const result = await GmbReviewService.replyToReview(id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to reply to review' });
  }
});

export default router;

