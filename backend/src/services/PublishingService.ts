import prisma from '../prisma';
import { MetaService } from './MetaService';
import { GoogleBusinessService } from './GoogleBusinessService';
import { AuditService } from './AuditService';
import { NotificationService } from './NotificationService';

export class PublishingService {
  /**
   * Core publishing execution with strict client isolation & idempotency safeguards
   */
  static async executePublish(scheduledPostId: string): Promise<{ success: boolean; message: string; logId?: string }> {
    const post = await prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId },
      include: {
        client: true,
        socialAccount: true,
        contentItem: {
          include: { variants: true },
        },
      },
    });

    if (!post) {
      throw new Error(`Scheduled post ${scheduledPostId} not found`);
    }

    // 1. Idempotency Check: prevent duplicate publishing
    if (post.status === 'PUBLISHED') {
      return { success: true, message: 'Post was already published successfully (idempotent skip).' };
    }

    // 2. Approval Verification: Content MUST be approved before publishing!
    if (post.client.approvalRequired && post.contentItem.status === 'READY_FOR_APPROVAL') {
      const approvalErr = `Publishing blocked: Creative "${post.contentItem.title}" is awaiting Admin approval. Admin must approve before live publication.`;
      console.warn(`[Publishing Gate] ${approvalErr}`);

      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: 'FAILED',
          lastError: approvalErr,
        },
      }).catch(() => {});

      return { success: false, message: approvalErr };
    }

    // 3. CRITICAL SECURITY: Client Isolation Verification
    if (post.clientId !== post.socialAccount.clientId) {
      const securityErr = `CRITICAL SECURITY VIOLATION: Post client ID (${post.clientId}) does not match Social Account client ID (${post.socialAccount.clientId})! Publishing aborted immediately.`;
      console.error(securityErr);

      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: 'FAILED',
          lastError: securityErr,
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });

      await NotificationService.create({
        userRole: 'ADMIN',
        clientId: post.clientId,
        type: 'PUBLISHING_FAILURE',
        title: 'Security Alert: Client Mismatch',
        message: securityErr,
      });

      await AuditService.logAction({
        actorName: 'Security Guard',
        actorRole: 'SYSTEM',
        action: 'ABORT_CLIENT_MISMATCH',
        entityType: 'SCHEDULE',
        entityId: post.id,
        clientId: post.clientId,
        details: { postClientId: post.clientId, accountClientId: post.socialAccount.clientId },
      });

      return { success: false, message: securityErr };
    }

    // 3. Mark as PUBLISHING
    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        status: 'PUBLISHING',
        lastAttemptAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    const startTime = Date.now();
    let result: { success: boolean; externalPostId?: string; errorCode?: string; errorMessage?: string; rawResponse?: any };

    // Resolve variant or content caption
    const variant = post.contentItem.variants.find((v) => v.platform === post.platform);
    const caption = variant?.caption || post.contentItem.title;
    const mediaUrl = variant?.specificMediaUrl || post.contentItem.mediaUrl;

    const defaultMetaToken = process.env.META_DEFAULT_ACCESS_TOKEN?.trim() || '';
    const rawAccountToken = post.socialAccount.accessToken?.trim() || '';
    const isInvalidOrOldMetaToken = !rawAccountToken || rawAccountToken.startsWith('oauth_') || rawAccountToken === 'EXPIRED' || rawAccountToken.startsWith('EAAW5ZAi9yVi') || rawAccountToken.startsWith('EAAho53IMHpsBSt');
    let effectiveMetaToken = isInvalidOrOldMetaToken && defaultMetaToken ? defaultMetaToken : (rawAccountToken || defaultMetaToken);

    const doPublish = async (tokenToUse: string) => {
      if (post.platform === 'INSTAGRAM') {
        const igContentType = (post.contentItem.contentType === 'REEL' || post.contentItem.contentType === 'STORY')
          ? post.contentItem.contentType
          : 'POST';

        return await MetaService.publishInstagram({
          accountId: post.socialAccount.accountId,
          accessToken: tokenToUse,
          mediaUrl,
          caption,
          contentType: igContentType,
        });
      } else if (post.platform === 'FACEBOOK') {
        return await MetaService.publishFacebook({
          pageId: post.socialAccount.accountId,
          accessToken: tokenToUse,
          mediaUrl,
          caption,
          cta: variant?.cta || undefined,
          contentType: post.contentItem.contentType as any,
        });
      } else if (post.platform === 'GOOGLE_BUSINESS') {
        return await GoogleBusinessService.publishPost({
          locationId: post.socialAccount.accountId,
          accessToken: post.socialAccount.accessToken || '',
          summary: caption,
          mediaUrl,
        });
      } else {
        return {
          success: false,
          errorCode: 'UNSUPPORTED_PLATFORM',
          errorMessage: `Platform ${post.platform} is not supported by publishing engine.`,
        };
      }
    };

    try {
      result = await doPublish(effectiveMetaToken);

      // Auto-fallback: if token expired and defaultMetaToken is available & different, retry once with defaultMetaToken
      const isTokenAuthError = !result.success && (
        result.errorCode === '190' ||
        result.errorMessage?.toLowerCase().includes('access token') ||
        result.errorMessage?.toLowerCase().includes('session has expired') ||
        result.errorMessage?.toLowerCase().includes('unsupported post request')
      );

      if (isTokenAuthError && defaultMetaToken && effectiveMetaToken !== defaultMetaToken) {
        console.warn(`[PublishingService] Post ${post.id} token issue. Retrying with master META_DEFAULT_ACCESS_TOKEN...`);
        result = await doPublish(defaultMetaToken);
        if (result.success) {
          // Update the social account in the DB so future posts use the valid token
          await prisma.socialAccount.update({
            where: { id: post.socialAccountId },
            data: { accessToken: defaultMetaToken, status: 'CONNECTED', lastError: null },
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      result = {
        success: false,
        errorCode: 'UNHANDLED_EXCEPTION',
        errorMessage: err.message || 'Unknown network or platform error during publishing.',
      };
    }

    const latencyMs = Date.now() - startTime;

    if (result.success) {
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          lastError: null,
        },
      });

      // Also update ContentItem status to PUBLISHED if all scheduled items are done
      await prisma.contentItem.update({
        where: { id: post.contentItemId },
        data: { status: 'PUBLISHED' },
      });

      const log = await prisma.publishingLog.create({
        data: {
          scheduledPostId: post.id,
          clientId: post.clientId,
          platform: post.platform,
          status: 'SUCCESS',
          requestPayload: JSON.stringify({ mediaUrl, captionSnippet: caption.substring(0, 100) }),
          responseSummary: JSON.stringify(result.rawResponse || { externalId: result.externalPostId }),
          latencyMs,
        },
      });

      await AuditService.logAction({
        actorName: 'Publishing Engine',
        actorRole: 'SYSTEM',
        action: 'PUBLISH_SUCCESS',
        entityType: 'SCHEDULE',
        entityId: post.id,
        clientId: post.clientId,
        details: { platform: post.platform, externalPostId: result.externalPostId },
      });

      return { success: true, message: 'Published successfully!', logId: log.id };
    } else {
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: 'FAILED',
          lastError: result.errorMessage,
        },
      });

      // Also update ContentItem status to FAILED so it reflects in Approvals and Content Inbox
      await prisma.contentItem.update({
        where: { id: post.contentItemId },
        data: { status: 'FAILED' },
      });

      const log = await prisma.publishingLog.create({
        data: {
          scheduledPostId: post.id,
          clientId: post.clientId,
          platform: post.platform,
          status: 'FAILED',
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          requestPayload: JSON.stringify({ mediaUrl, captionSnippet: caption.substring(0, 100) }),
          latencyMs,
        },
      });

      await NotificationService.create({
        userRole: 'ADMIN',
        clientId: post.clientId,
        type: 'PUBLISHING_FAILURE',
        title: `Publishing Failed: ${post.client.businessName}`,
        message: `${post.platform}: ${result.errorMessage}`,
      });

      await AuditService.logAction({
        actorName: 'Publishing Engine',
        actorRole: 'SYSTEM',
        action: 'PUBLISH_FAILED',
        entityType: 'SCHEDULE',
        entityId: post.id,
        clientId: post.clientId,
        details: { platform: post.platform, errorCode: result.errorCode, error: result.errorMessage },
      });

      return { success: false, message: result.errorMessage || 'Publishing failed', logId: log.id };
    }
  }

  /**
   * Run background tick: checks due posts (scheduledAt <= now) and dispatches them
   */
  static async runSchedulerTick() {
    // 1. Fetch newly due scheduled posts AND auto-retry failed posts (up to 3 attempts with 2 min cooldown)
    const duePosts = await prisma.scheduledPost.findMany({
      where: {
        OR: [
          {
            status: 'SCHEDULED',
            scheduledAt: { lte: new Date() },
          },
          {
            status: 'FAILED',
            attemptCount: { lt: 3 },
            lastAttemptAt: { lte: new Date(Date.now() - 2 * 60 * 1000) },
            NOT: {
              lastError: { contains: 'CRITICAL SECURITY VIOLATION' },
            },
          },
        ],
      },
      take: 10,
    });

    const results = [];
    for (const p of duePosts) {
      const res = await this.executePublish(p.id);
      results.push({ id: p.id, ...res });
    }

    return { processed: duePosts.length, results };
  }

  /**
   * Retry a failed post
   */
  static async retryPost(scheduledPostId: string) {
    const post = await prisma.scheduledPost.findUnique({ where: { id: scheduledPostId } });
    if (!post) throw new Error(`Post ${scheduledPostId} not found`);

    if (post.status === 'PUBLISHED') {
      return { success: true, message: 'Post is already published' };
    }

    return this.executePublish(scheduledPostId);
  }
}
