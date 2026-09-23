import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import { AIContentService } from '../services/AIContentService';

import prisma from '../prisma';

const router = Router();

const resolveClientId = async (clientId?: string): Promise<string | null> => {
  if (clientId && clientId !== 'ALL' && clientId !== 'demo') {
    const found = await prisma.client.findUnique({ where: { id: clientId } });
    if (found) return found.id;
  }
  const fallback = (await prisma.client.findFirst({
    where: { businessName: { contains: 'BrandSetu' } },
  })) || (await prisma.client.findFirst());
  return fallback?.id || null;
};

// POST generate caption
router.post('/caption', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    let { clientId, contentType, platform, topic, mediaUrl, toneOverride } = req.body;
    clientId = await resolveClientId(clientId);
    if (!clientId) return res.status(400).json({ error: 'No active brand found' });

    const result = await AIContentService.generateCaption({
      clientId,
      contentType: contentType || 'POST',
      platform: platform || 'INSTAGRAM',
      topic,
      mediaUrl,
      toneOverride,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST generate platform variations (Instagram, Facebook, Google Business)
router.post('/variations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, topic } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });

    const result = await AIContentService.generatePlatformVariations(clientId, topic);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST generate hashtags
router.post('/hashtags', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, topic } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });

    const hashtags = await AIContentService.generateHashtags(clientId, topic);
    return res.json({ hashtags });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST generate 30-day AI monthly content plan
router.post('/monthly-plan', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, month, year, postsCount, storiesCount, reelsCount } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });

    const plan = await AIContentService.generateMonthlyPlan({
      clientId,
      month: month || 'September',
      year: year || 2026,
      postsCount: Number(postsCount) || 20,
      storiesCount: Number(storiesCount) || 10,
      reelsCount: Number(reelsCount) || 8,
    });

    return res.json(plan);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
