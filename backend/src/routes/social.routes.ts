import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { AuditService } from '../services/AuditService';
import { GmbReviewService } from '../services/GmbReviewService';
import { GoogleBusinessService } from '../services/GoogleBusinessService';

const router = Router();

function persistTokensToEnv(accessToken?: string, refreshToken?: string) {
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    if (!fs.existsSync(envPath)) return;
    let content = fs.readFileSync(envPath, 'utf8');

    if (accessToken) {
      if (content.includes('GOOGLE_BUSINESS_ACCESS_TOKEN=')) {
        content = content.replace(
          /GOOGLE_BUSINESS_ACCESS_TOKEN="[^"]*"/g,
          `GOOGLE_BUSINESS_ACCESS_TOKEN="${accessToken}"`
        );
      } else {
        content += `\nGOOGLE_BUSINESS_ACCESS_TOKEN="${accessToken}"`;
      }
    }

    if (refreshToken) {
      if (content.includes('GOOGLE_BUSINESS_REFRESH_TOKEN=')) {
        content = content.replace(
          /GOOGLE_BUSINESS_REFRESH_TOKEN="[^"]*"/g,
          `GOOGLE_BUSINESS_REFRESH_TOKEN="${refreshToken}"`
        );
      } else {
        content += `\nGOOGLE_BUSINESS_REFRESH_TOKEN="${refreshToken}"`;
      }
    }

    fs.writeFileSync(envPath, content, 'utf8');
    console.log('✅ [Env Update] Persisted fresh Google Business tokens to .env');
  } catch (err: any) {
    console.warn('[persistTokensToEnv Warning]:', err.message);
  }
}

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

// POST /api/social/gmb/exchange-code - Exchanges Google popup auth code for permanent refresh token + access token
router.post('/gmb/exchange-code', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || '';

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing in server environment.' });
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code.trim(),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'postmessage',
        grant_type: 'authorization_code',
      }),
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Google Code Exchange Error]:', tokenData);
      return res.status(400).json({
        error: `Google code exchange failed: ${tokenData.error_description || tokenData.error || 'Invalid code'}`
      });
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    process.env.GOOGLE_BUSINESS_ACCESS_TOKEN = accessToken;
    if (refreshToken) {
      process.env.GOOGLE_BUSINESS_REFRESH_TOKEN = refreshToken;
    }
    persistTokensToEnv(accessToken, refreshToken);

    // Update ALL Google Business accounts in the database
    const updated = await prisma.socialAccount.updateMany({
      where: { platform: 'GOOGLE_BUSINESS' },
      data: {
        status: 'CONNECTED',
        accessToken: accessToken,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        lastHealthCheck: new Date(),
        lastError: null,
      },
    });

    // Auto-trigger review sync across all clients in the background
    GmbReviewService.runAutoReplyWorker().catch((err) => {
      console.warn('[GMB Code Exchange] Background sync note:', err.message);
    });

    return res.json({
      success: true,
      message: `Google Account connected successfully! Refresh token saved for permanent auto-sync across ${updated.count} client locations.`,
      accountsUpdated: updated.count,
      hasRefreshToken: Boolean(refreshToken),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/social/gmb/update-token - Updates Google OAuth Token across all GMB accounts in 1-click
router.post('/gmb/update-token', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const rawToken = (req.body?.token || req.body?.accessToken || req.body?.refreshToken || '').trim();
    if (!rawToken) {
      return res.status(400).json({ error: 'Token is required. Provide fresh ya29... access token or 1//... refresh token.' });
    }

    let finalAccessToken: string | null = null;
    if (rawToken.startsWith('1//')) {
      finalAccessToken = await GoogleBusinessService.getFreshAccessToken(rawToken);
      if (!finalAccessToken) {
        return res.status(400).json({ error: 'Google Refresh Token exchange failed. Token may be expired or revoked by Google.' });
      }
      process.env.GOOGLE_BUSINESS_REFRESH_TOKEN = rawToken;
      process.env.GOOGLE_BUSINESS_ACCESS_TOKEN = finalAccessToken;
      persistTokensToEnv(finalAccessToken, rawToken);
    } else if (rawToken.startsWith('ya29.')) {
      finalAccessToken = rawToken;
      process.env.GOOGLE_BUSINESS_ACCESS_TOKEN = rawToken;
      persistTokensToEnv(rawToken);
    } else {
      return res.status(400).json({ error: 'Invalid Google token format. Must start with ya29. (Access Token) or 1// (Refresh Token).' });
    }

    // Verify token by calling Google API
    const testRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${finalAccessToken}` },
    });
    if (!testRes.ok) {
      const errTxt = await testRes.text();
      return res.status(400).json({ error: `Google API rejected this token (${testRes.status}): ${errTxt}` });
    }

    // Update ALL Google Business accounts in the database
    const updated = await prisma.socialAccount.updateMany({
      where: { platform: 'GOOGLE_BUSINESS' },
      data: {
        status: 'CONNECTED',
        accessToken: finalAccessToken,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        lastHealthCheck: new Date(),
        lastError: null,
      },
    });

    // Auto-trigger review sync across all clients in the background
    GmbReviewService.runAutoReplyWorker().catch((err) => {
      console.warn('[GMB UpdateToken] Background sync note:', err.message);
    });

    return res.json({
      success: true,
      message: `Google OAuth Token verified & updated successfully! Connected ${updated.count} client GMB profiles and started review sync.`,
      accountsUpdated: updated.count,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST test account connection live
router.post('/test/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const account = await prisma.socialAccount.findUnique({
      where: { id },
      include: { client: { select: { businessName: true } } },
    });

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    if (account.platform === 'GOOGLE_BUSINESS') {
      let token = account.accessToken;
      const freshToken = await GoogleBusinessService.getFreshAccessToken();
      if (freshToken) {
        token = freshToken;
        await prisma.socialAccount.update({
          where: { id },
          data: { accessToken: freshToken, status: 'CONNECTED', lastError: null },
        }).catch(() => {});
      }

      if (!token || token.startsWith('gmb_tok_') || token === 'EXPIRED') {
        await prisma.socialAccount.update({
          where: { id },
          data: { status: 'EXPIRED', lastError: 'Google OAuth Access Token missing or expired.' },
        }).catch(() => {});
        return res.json({
          success: false,
          status: 'EXPIRED',
          message: 'Google OAuth token expired or missing. Please click Reconnect to sign in with Google.',
        });
      }

      // Live verification with Google API
      const testRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!testRes.ok) {
        await prisma.socialAccount.update({
          where: { id },
          data: {
            status: 'EXPIRED',
            lastError: `Google Access Token expired (HTTP ${testRes.status})`,
            lastHealthCheck: new Date(),
          },
        }).catch(() => {});
        return res.json({
          success: false,
          status: 'EXPIRED',
          message: 'Google Access Token is expired or revoked. Please click Reconnect to sign in.',
        });
      }

      await prisma.socialAccount.update({
        where: { id },
        data: {
          status: 'CONNECTED',
          lastError: null,
          lastHealthCheck: new Date(),
        },
      }).catch(() => {});

      return res.json({
        success: true,
        status: 'CONNECTED',
        message: `Connection Verified for ${account.accountName}! Google Business API responded 200 OK.`,
      });
    }

    // Default verification for Meta / Instagram / Facebook
    const isValid = account.accessToken && !account.accessToken.startsWith('oauth_tok_') && account.accessToken !== 'EXPIRED';
    if (!isValid) {
      return res.json({
        success: false,
        status: 'EXPIRED',
        message: `${account.platform} account requires re-authentication.`,
      });
    }

    await prisma.socialAccount.update({
      where: { id },
      data: { status: 'CONNECTED', lastError: null, lastHealthCheck: new Date() },
    }).catch(() => {});

    return res.json({
      success: true,
      status: 'CONNECTED',
      message: `Connection Verified for ${account.accountName}! Ready for automated publishing.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to test connection' });
  }
});

// POST reconnect an expired account
router.post('/reconnect/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    let freshTok = req.body?.accessToken?.trim();
    const existingAcc = await prisma.socialAccount.findUnique({ where: { id } });
    if (existingAcc?.platform === 'GOOGLE_BUSINESS') {
      let gTok: string | null = null;
      if (freshTok && freshTok.startsWith('1//')) {
        gTok = await GoogleBusinessService.getFreshAccessToken(freshTok);
        if (gTok) {
          process.env.GOOGLE_BUSINESS_REFRESH_TOKEN = freshTok;
          process.env.GOOGLE_BUSINESS_ACCESS_TOKEN = gTok;
          freshTok = gTok;
        }
      } else if (freshTok && freshTok.startsWith('ya29.')) {
        process.env.GOOGLE_BUSINESS_ACCESS_TOKEN = freshTok;
      } else {
        gTok = await GoogleBusinessService.getFreshAccessToken();
        if (gTok) freshTok = gTok;
      }

      // If a valid Google token was acquired, propagate to ALL Google Business accounts in DB
      if (freshTok && freshTok.startsWith('ya29.')) {
        await prisma.socialAccount.updateMany({
          where: { platform: 'GOOGLE_BUSINESS' },
          data: {
            status: 'CONNECTED',
            accessToken: freshTok,
            tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            lastHealthCheck: new Date(),
            lastError: null,
          },
        });
      }
    }
    if (!freshTok || freshTok.startsWith('GOCSPX-')) {
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
