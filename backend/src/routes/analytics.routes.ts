import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import { AnalyticsService } from '../services/AnalyticsService';
import { BufferHealthService } from '../services/BufferHealthService';
import { InstagramInsightsService } from '../services/InstagramInsightsService';
import { VERIFIED_IG_VIEWS } from '../services/LiveMetricsService';
import prisma from '../prisma';

const router = Router();

// GET agency analytics overview
router.get('/overview', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, range, platform } = req.query;
    const cleanClientId = clientId && clientId !== 'ALL' && clientId !== 'undefined' ? (clientId as string) : undefined;
    const cleanPlatform = (platform as string) || 'ALL';
    const overview = await AnalyticsService.getOverview(cleanClientId, (range as string) || '30D', cleanPlatform);
    return res.json(overview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET 10-day content buffer health
router.get('/buffer-health', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.query;
    const cleanClientId = clientId && clientId !== 'ALL' && clientId !== 'undefined' ? (clientId as string) : undefined;
    const buffer = await BufferHealthService.getBufferStatus(cleanClientId);
    return res.json(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET client monthly report
router.get('/report/:clientId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { month, year } = req.query;

    const report = await AnalyticsService.generateMonthlyReport(
      clientId,
      (month as string) || 'September',
      Number(year) || 2026
    );

    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// INSTAGRAM INSIGHTS ANALYTICS & SMART SCHEDULING (PRODUCTION-READY API)
// =========================================================================

// 1. GET /api/analytics/instagram/overview
router.get('/instagram/overview', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, range } = req.query;
    const cleanClientId = clientId && clientId !== 'ALL' && clientId !== 'undefined' && clientId !== 'null'
      ? (clientId as string)
      : undefined;

    const validRange = range === '7D' || range === '90D' ? range : '30D';
    const overview = await InstagramInsightsService.getInstagramOverview(cleanClientId, validRange as any);

    return res.json(overview);
  } catch (err: any) {
    console.error('[API Error: /instagram/overview]:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch Instagram overview' });
  }
});

// 2. GET /api/analytics/instagram/media (Paginated & Filtered Content Performance)
router.get('/instagram/media', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, mediaType, sortBy = 'VIEWS_DESC', limit = 20, offset = 0 } = req.query;
    const cleanClientId = clientId && clientId !== 'ALL' && clientId !== 'undefined' && clientId !== 'null'
      ? (clientId as string)
      : undefined;

    const whereClause: any = {
      ...(cleanClientId ? { clientId: cleanClientId } : {}),
      ageBenchmark: 'LATEST',
    };

    if (mediaType && mediaType !== 'ALL') {
      whereClause.mediaType = mediaType as string;
    }

    let orderBy: any = { views: 'desc' };
    if (sortBy === 'DATE_DESC') orderBy = { publishedAt: 'desc' };
    if (sortBy === 'DATE_ASC') orderBy = { publishedAt: 'asc' };
    if (sortBy === 'LIKES_DESC') orderBy = { likes: 'desc' };
    if (sortBy === 'COMMENTS_DESC') orderBy = { comments: 'desc' };
    if (sortBy === 'SHARES_DESC') orderBy = { shares: 'desc' };
    if (sortBy === 'SAVES_DESC') orderBy = { saves: 'desc' };

    const [items, total] = await Promise.all([
      prisma.instagramMediaInsightSnapshot.findMany({
        where: whereClause,
        orderBy,
        take: Math.min(100, Number(limit) || 20),
        skip: Number(offset) || 0,
      }),
      prisma.instagramMediaInsightSnapshot.count({ where: whereClause }),
    ]);

    return res.json({
      items,
      total,
      limit: Number(limit) || 20,
      offset: Number(offset) || 0,
    });
  } catch (err: any) {
    console.error('[API Error: /instagram/media]:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch Instagram media' });
  }
});

// 3. GET /api/analytics/instagram/recommendations (AI Smart Scheduling Slots)
router.get('/instagram/recommendations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.query;
    if (!clientId || clientId === 'ALL' || clientId === 'undefined') {
      return res.status(400).json({ error: 'Valid clientId is required to generate smart scheduling recommendations.' });
    }

    const recs = await InstagramInsightsService.generatePostingRecommendations(clientId as string);
    return res.json(recs);
  } catch (err: any) {
    console.error('[API Error: /instagram/recommendations]:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate recommendations' });
  }
});

// 4. POST /api/analytics/instagram/sync (Trigger Idempotent Live Snapshots Sync)
router.post('/instagram/sync', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.body;
    const cleanClientId = clientId && clientId !== 'ALL' && clientId !== 'undefined'
      ? (clientId as string)
      : undefined;

    const result = await InstagramInsightsService.syncInstagramInsights(cleanClientId, 'MANUAL_TRIGGER');
    return res.json(result);
  } catch (err: any) {
    console.error('[API Error: /instagram/sync]:', err);
    return res.status(500).json({ error: err.message || 'Instagram Insights synchronization failed' });
  }
});

// 5. GET /api/analytics/instagram/report (Downloadable Executive Intelligence Report)
router.get('/instagram/report', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, period = '30D' } = req.query;
    if (!clientId || clientId === 'ALL' || clientId === 'undefined') {
      return res.status(400).json({ error: 'Valid clientId is required for the Instagram report.' });
    }

    const report = await InstagramInsightsService.generateInstagramReport(clientId as string, period as string);
    return res.json(report);
  } catch (err: any) {
    console.error('[API Error: /instagram/report]:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate Instagram report' });
  }
});

// 6. PATCH /api/analytics/instagram/media/:mediaId (Calibrate/Update Real Post Metrics)
router.patch('/instagram/media/:mediaId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { mediaId } = req.params;
    const { views, likes, comments, shares, saves, reach } = req.body;

    const existing = await prisma.instagramMediaInsightSnapshot.findFirst({
      where: { mediaId, ageBenchmark: 'LATEST' },
    });

    if (!existing) {
      return res.status(404).json({ error: `Media snapshot not found for mediaId: ${mediaId}` });
    }

    const newViews = views !== undefined ? Number(views) : existing.views;
    const newLikes = likes !== undefined ? Number(likes) : existing.likes;
    const newComments = comments !== undefined ? Number(comments) : existing.comments;
    const newShares = shares !== undefined ? Number(shares) : existing.shares;
    const newSaves = saves !== undefined ? Number(saves) : existing.saves;
    const newReach = reach !== undefined ? Number(reach) : (views !== undefined ? Number(views) : existing.reach);
    const newTotalInteractions = (newLikes || 0) + (newComments || 0) + (newShares || 0) + (newSaves || 0);

    await prisma.instagramMediaInsightSnapshot.updateMany({
      where: { mediaId },
      data: {
        views: newViews,
        likes: newLikes,
        comments: newComments,
        shares: newShares,
        saves: newSaves,
        reach: newReach,
        totalInteractions: newTotalInteractions,
        capturedAt: new Date(),
      },
    });

    if (newViews !== null && newViews !== undefined) {
      VERIFIED_IG_VIEWS[mediaId] = Number(newViews);
    }

    // Refresh smart recommendations for this client with updated numbers
    if (existing.clientId) {
      await InstagramInsightsService.generatePostingRecommendations(existing.clientId);
    }

    const updated = await prisma.instagramMediaInsightSnapshot.findFirst({
      where: { mediaId, ageBenchmark: 'LATEST' },
    });

    return res.json({ success: true, updated });
  } catch (err: any) {
    console.error('[API Error: PATCH /instagram/media/:mediaId]:', err);
    return res.status(500).json({ error: err.message || 'Failed to update media metrics' });
  }
});

export default router;
