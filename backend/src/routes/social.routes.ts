import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { AuditService } from '../services/AuditService';
import { GmbReviewService } from '../services/GmbReviewService';
import { GoogleBusinessService } from '../services/GoogleBusinessService';

const router = Router();

// GET social accounts (optionally filtered by client)
router.get('/accounts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.query;

    const accounts = await prisma.socialAccount.findMany({
      where: (clientId && clientId !== 'ALL' && clientId !== 'undefined' && clientId !== 'null')
        ? { clientId: clientId as string }
        : undefined,
      include: {
        client: { select: { businessName: true, logo: true } },
        _count: { select: { scheduledPosts: true } },
      },
      orderBy: { platform: 'asc' },
    });

    return res.json(accounts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST connect a social account to a client
router.post('/connect', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, platform, accountName, accountId, accessToken } = req.body;

    if (!clientId || !platform || !accountName || !accountId) {
      return res.status(400).json({ error: 'clientId, platform, accountName, and accountId are required' });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    let finalToken = accessToken?.trim();
    if (platform === 'GOOGLE_BUSINESS') {
      const freshToken = await GoogleBusinessService.getFreshAccessToken();
      if (freshToken) {
        finalToken = freshToken;
      } else if (!finalToken || finalToken.startsWith('GOCSPX-') || finalToken.startsWith('1//')) {
        finalToken = process.env.GOOGLE_BUSINESS_ACCESS_TOKEN || `gmb_tok_${Date.now()}`;
      }
    } else if (!finalToken) {
      finalToken = process.env.META_DEFAULT_ACCESS_TOKEN || `oauth_tok_${platform.toLowerCase()}_${Date.now()}`;
    }

    // Ensure connection is mapped exclusively to this client
    const account = await prisma.socialAccount.create({
      data: {
        clientId,
        platform,
        accountName,
        accountId,
        status: 'CONNECTED',
        accessToken: finalToken,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days validity
        lastHealthCheck: new Date(),
      },
    });

    await AuditService.logAction({
      actorName: req.user?.name || 'User',
      actorRole: req.user?.role || 'SMM',
      action: 'CONNECT_SOCIAL_ACCOUNT',
      entityType: 'ACCOUNT',
      entityId: account.id,
      clientId,
      details: { platform, accountName, accountId },
    });

    if (platform === 'GOOGLE_BUSINESS') {
      GmbReviewService.syncReviewsForClient(clientId).catch((e) =>
        console.warn('[SocialRoutes] Auto-sync on connect warning:', e.message)
      );
    }

    return res.status(201).json(account);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST reconnect an expired account
router.post('/reconnect/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    let freshTok = req.body?.accessToken?.trim();
    const existingAcc = await prisma.socialAccount.findUnique({ where: { id } });
    if (existingAcc?.platform === 'GOOGLE_BUSINESS') {
      const gTok = await GoogleBusinessService.getFreshAccessToken();
      if (gTok) freshTok = gTok;
    }
    if (!freshTok || freshTok.startsWith('GOCSPX-') || freshTok.startsWith('1//')) {
      freshTok = process.env.META_DEFAULT_ACCESS_TOKEN || `oauth_reconnected_${Date.now()}`;
    }

    const account = await prisma.socialAccount.update({
      where: { id },
      data: {
        status: 'CONNECTED',
        accessToken: freshTok,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        lastHealthCheck: new Date(),
        lastError: null,
      },
      include: { client: true },
    });

    await AuditService.logAction({
      actorName: req.user?.name || 'User',
      actorRole: req.user?.role || 'SMM',
      action: 'RECONNECT_SOCIAL_ACCOUNT',
      entityType: 'ACCOUNT',
      entityId: id,
      clientId: account.clientId,
      details: { platform: account.platform, accountName: account.accountName },
    });

    if (account.platform === 'GOOGLE_BUSINESS') {
      GmbReviewService.syncReviewsForClient(account.clientId).catch((e) =>
        console.warn('[SocialRoutes] Auto-sync on reconnect warning:', e.message)
      );
    }

    return res.json({ message: 'Account reconnected successfully', account });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST disconnect account (deletes connection record)
router.post('/disconnect/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const account = await prisma.socialAccount.delete({
      where: { id },
    });

    await AuditService.logAction({
      actorName: req.user?.name || 'User',
      actorRole: req.user?.role || 'SMM',
      action: 'DISCONNECT_SOCIAL_ACCOUNT',
      entityType: 'ACCOUNT',
      entityId: id,
      clientId: account.clientId,
      details: { platform: account.platform, accountName: account.accountName },
    });

    return res.json({ message: 'Account disconnected successfully', account });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE social account
router.delete('/accounts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const account = await prisma.socialAccount.delete({ where: { id } });
    return res.json({ message: 'Account removed successfully', account });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
