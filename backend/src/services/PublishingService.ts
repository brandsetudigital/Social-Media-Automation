import prisma from '../prisma';
import { MetaService } from './MetaService';
import { GoogleBusinessService } from './GoogleBusinessService';
import { AuditService } from './AuditService';
import { NotificationService } from './NotificationService';
import { AIContentService } from './AIContentService';


export class PublishingService {
  /**
   * Core publishing execution with strict client isolation & idempotency safeguards
   */
  static async executePublish(scheduledPostId: string): Promise<{ success: boolean; message: string; logId?: string; commentResult?: any }> {
    const post = await prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId },
      include: {
        client: {
          include: { brandProfile: true },
        },
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

    // Resolve variant or content caption & hashtags
    const variant = post.contentItem.variants.find((v) => v.platform === post.platform) || post.contentItem.variants[0];
    const baseCaption = (variant?.caption || post.contentItem.title || '').trim();
    const variantHashtags = (variant?.hashtags || '').trim();
    const brandProfileHashtags = (post.client as any)?.brandProfile?.hashtags?.trim() || '';

    // Generate client-tailored fallback hashtags based on this specific client
    const tailored = AIContentService.generateClientTailoredHashtags(
      {
        businessName: post.client.businessName,
        category: post.client.category,
        location: post.client.location,
        brandProfile: (post.client as any)?.brandProfile,
      },
      post.contentItem.title || baseCaption
    );

    let captionTags: string[] = [];
    let commentTags: string[] = [];

    // Check if variant has structured separator (e.g. ---FIRST_COMMENT--- or || COMMENT:)
    if (variantHashtags.includes('---FIRST_COMMENT---')) {
      const parts = variantHashtags.split('---FIRST_COMMENT---');
      captionTags = parts[0].split(/\s+/).map((t: string) => t.trim()).filter(Boolean).map((t: string) => (t.startsWith('#') ? t : `#${t}`));
      commentTags = parts[1].split(/\s+/).map((t: string) => t.trim()).filter(Boolean).map((t: string) => (t.startsWith('#') ? t : `#${t}`));
    } else if (variantHashtags.includes('|| COMMENT:')) {
      const parts = variantHashtags.split('|| COMMENT:');
      captionTags = parts[0].split(/\s+/).map((t: string) => t.trim()).filter(Boolean).map((t: string) => (t.startsWith('#') ? t : `#${t}`));
      commentTags = parts[1].split(/\s+/).map((t: string) => t.trim()).filter(Boolean).map((t: string) => (t.startsWith('#') ? t : `#${t}`));
    } else {
      const rawTags = (variantHashtags || brandProfileHashtags)
        .split(/\s+/)
        .map((t: string) => t.trim())
        .filter(Boolean)
        .map((t: string) => (t.startsWith('#') ? t : `#${t}`));

      if (rawTags.length >= 8) {
        captionTags = rawTags.slice(0, 5);
        commentTags = rawTags.slice(5, 10);
      } else if (rawTags.length > 0) {
        captionTags = rawTags.slice(0, 5);
        commentTags = tailored.commentHashtags.split(/\s+/).filter(Boolean);
      } else {
        captionTags = tailored.captionHashtags.split(/\s+/).filter(Boolean);
        commentTags = tailored.commentHashtags.split(/\s+/).filter(Boolean);
      }
    }

    // Ensure strictly 4 to 5 caption hashtags for maximum reach & clean aesthetics
    if (captionTags.length === 0) {
      captionTags = tailored.captionHashtags.split(/\s+/).filter(Boolean);
    }
    captionTags = captionTags.slice(0, 5);

    // Ensure strictly 5 first-comment boost hashtags - NEVER MATCHING CAPTION HASHTAGS
    const captionRoots = new Set(captionTags.map((t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '')));
    commentTags = commentTags.filter((t: string) => !captionRoots.has(t.toLowerCase().replace(/[^a-z0-9]/g, '')));

    if (commentTags.length < 5) {
      const extraTags = tailored.commentHashtags.split(/\s+/).filter(Boolean);
      for (const t of extraTags) {
        const root = t.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!captionRoots.has(root) && !commentTags.some((c: string) => c.toLowerCase().replace(/[^a-z0-9]/g, '') === root)) {
          commentTags.push(t);
        }
        if (commentTags.length >= 5) break;
      }
    }
    const genericFallbacks = ['#ExplorePage', '#TrendingNow', '#CommunityVibes', '#DailyHighlight', '#MustVisit'];
    for (const fb of genericFallbacks) {
      if (commentTags.length >= 5) break;
      const root = fb.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!captionRoots.has(root) && !commentTags.some((c: string) => c.toLowerCase().replace(/[^a-z0-9]/g, '') === root)) {
        commentTags.push(fb);
      }
    }
    commentTags = commentTags.slice(0, 5);

    // Clean baseCaption from any trailing hashtag clutter so strictly the top 5 SEO tags are appended
    const cleanBaseCaption = baseCaption.replace(/(?:[\s\r\n]*#[A-Za-z0-9_]+)+$/g, '').trim();
    let fullCaption = cleanBaseCaption;

    if (captionTags.length > 0) {
      const joinedTags = captionTags.slice(0, 5).join(' ');
      fullCaption = fullCaption ? `${fullCaption}\n\n${joinedTags}` : joinedTags;
    }

    const caption = fullCaption;
    const mediaUrl = variant?.specificMediaUrl || post.contentItem.mediaUrl;

    const defaultMetaToken = process.env.META_DEFAULT_ACCESS_TOKEN?.trim() || '';
    const rawAccountToken = post.socialAccount.accessToken?.trim() || '';
    const isInvalidOrOldMetaToken = !rawAccountToken || rawAccountToken.startsWith('oauth_') || rawAccountToken === 'EXPIRED' || rawAccountToken.startsWith('EAAW5ZAi9yVi') || rawAccountToken.startsWith('EAAho53IMHpsBSt');
    let effectiveMetaToken = isInvalidOrOldMetaToken && defaultMetaToken ? defaultMetaToken : (rawAccountToken || defaultMetaToken);

    const doPublish = async (tokenToUse: string) => {
      const targetAccId = post.socialAccount.accountId?.trim() || '';
      if (!targetAccId || targetAccId.startsWith('acc_') || targetAccId.startsWith('page_')) {
        return {
          success: false,
          errorCode: 'ACCOUNT_NOT_CONNECTED',
          errorMessage: `Client '${post.client?.businessName || 'Selected'}' ke paas valid ${post.platform} account connected nahi hai (mil gaya: '${targetAccId || 'None'}'). Kripya Channels tab me jakar client ka real account connect karein.`,
        };
      }

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
        const clientName = post.client?.businessName || (post.contentItem as any)?.client?.businessName || '';
        return await GoogleBusinessService.publishPost({
          locationId: post.socialAccount.accountId,
          clientName,
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

      // Automated First-Comment Strategy: Post 5 client-tailored hashtags as author's first comment
      let commentResult: { success: boolean; commentId?: string; errorMessage?: string } | null = null;
      const commentMessage = commentTags.slice(0, 5).join(' ');

      if (result.externalPostId && commentMessage && (post.platform === 'INSTAGRAM' || post.platform === 'FACEBOOK')) {
        try {
          if (post.platform === 'INSTAGRAM') {
            commentResult = await MetaService.postInstagramComment({
              mediaId: result.externalPostId,
              accessToken: effectiveMetaToken,
              message: commentMessage,
            });
            console.log(`[PublishingService] Auto-comment posted to Instagram (${result.externalPostId}):`, commentResult);
          } else if (post.platform === 'FACEBOOK') {
            commentResult = await MetaService.postFacebookComment({
              postId: result.externalPostId,
              accessToken: effectiveMetaToken,
              message: commentMessage,
            });
            console.log(`[PublishingService] Auto-comment posted to Facebook (${result.externalPostId}):`, commentResult);
          }
        } catch (commentErr: any) {
          console.warn(`[PublishingService] Auto-comment error (non-fatal):`, commentErr.message);
          commentResult = { success: false, errorMessage: commentErr.message };
        }
      }

      const log = await prisma.publishingLog.create({
        data: {
          scheduledPostId: post.id,
          clientId: post.clientId,
          platform: post.platform,
          status: 'SUCCESS',
          requestPayload: JSON.stringify({
            mediaUrl,
            captionSnippet: caption.substring(0, 100),
            captionHashtags: captionTags.join(' '),
            commentHashtags: commentMessage,
          }),
          responseSummary: JSON.stringify({
            ...(result.rawResponse || { externalId: result.externalPostId }),
            autoComment: commentResult || undefined,
          }),
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
        details: {
          platform: post.platform,
          externalPostId: result.externalPostId,
          captionHashtags: captionTags.join(' '),
          firstCommentHashtags: commentMessage,
          commentSuccess: commentResult?.success,
        },
      });

      let successMessage = 'Post published live successfully!';
      if (commentResult?.success) {
        successMessage = 'Post published live with 5 client-tailored first-comment hashtags!';
      } else if (commentResult?.errorMessage) {
        if (commentResult.errorMessage.includes('permission')) {
          successMessage = `Post live ho gaya! Note: Meta Developer App token me 'instagram_manage_comments' permission add karni hogi taaki comments automatically chale jayein.`;
        } else {
          successMessage = `Post live ho gaya! (Comment note: ${commentResult.errorMessage})`;
        }
      }

      return {
        success: true,
        message: successMessage,
        commentResult,
        logId: log.id,
      };
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
