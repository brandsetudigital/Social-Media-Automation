import prisma from '../../prisma';
import { MetaService, PublishResult } from '../MetaService';
import {
  ConnectInstagramAccountInput,
  PublishInstagramImageInput,
  PublishInstagramReelInput,
  PublishInstagramCarouselInput,
  ScheduleInstagramPostInput,
  GetPublishingHistoryInput,
} from '../../validators/instagramPublishing.validator';

export interface InstagramPublishResponse {
  success: boolean;
  externalPostId?: string;
  permalink?: string;
  commentId?: string;
  commentSuccess?: boolean;
  logId?: string;
  errorMessage?: string;
  errorCode?: string;
}

export class InstagramGraphService {
  /**
   * Resolves the connected Instagram SocialAccount record for a given client.
   */
  public async resolveSocialAccount(clientId: string, explicitAccountId?: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        socialAccounts: {
          where: { platform: 'INSTAGRAM' },
        },
      },
    });

    if (!client) {
      throw new Error(`Client with ID "${clientId}" was not found.`);
    }

    let account = explicitAccountId
      ? client.socialAccounts.find((a) => a.accountId === explicitAccountId || a.id === explicitAccountId)
      : client.socialAccounts.find((a) => a.status === 'CONNECTED') || client.socialAccounts[0];

    return { client, account };
  }

  /**
   * Connects an Instagram Professional account to a Client.
   * Validates access token and stores 60-day token lifecycle.
   */
  public async connectAccount(input: ConnectInstagramAccountInput) {
    const client = await prisma.client.findUnique({ where: { id: input.clientId } });
    if (!client) {
      throw new Error(`Client "${input.clientId}" not found.`);
    }

    const token = input.accessToken.trim();
    let detectedName = input.accountName || `Instagram (${input.accountId})`;

    // Verify token live with Meta Graph API if it's a real token (starts with EAA)
    if (token.startsWith('EAA')) {
      try {
        const verifyRes = await fetch(
          `https://graph.facebook.com/v20.0/${input.accountId}?fields=id,username,name&access_token=${token}`
        );
        const data: any = await verifyRes.json();
        if (data && data.username) {
          detectedName = `@${data.username} (${data.name || client.businessName})`;
        } else if (data && data.error) {
          console.warn('[InstagramGraphService] Live token verification note:', data.error.message);
        }
      } catch (err: any) {
        console.warn('[InstagramGraphService] Live check network notice:', err.message);
      }
    }

    // Check if account is already mapped
    const existing = await prisma.socialAccount.findFirst({
      where: {
        clientId: input.clientId,
        platform: 'INSTAGRAM',
        accountId: input.accountId,
      },
    });

    const sixtyDaysLater = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    if (existing) {
      return await prisma.socialAccount.update({
        where: { id: existing.id },
        data: {
          accountName: detectedName,
          accessToken: token,
          status: 'CONNECTED',
          lastError: null,
          tokenExpiresAt: sixtyDaysLater,
          lastHealthCheck: new Date(),
        },
      });
    }

    return await prisma.socialAccount.create({
      data: {
        clientId: input.clientId,
        platform: 'INSTAGRAM',
        accountId: input.accountId,
        accountName: detectedName,
        accessToken: token,
        status: 'CONNECTED',
        tokenExpiresAt: sixtyDaysLater,
        lastHealthCheck: new Date(),
      },
    });
  }

  /**
   * Retrieves all connected Instagram accounts (optionally filtered by client)
   */
  public async getAccounts(clientId?: string) {
    return await prisma.socialAccount.findMany({
      where: {
        platform: 'INSTAGRAM',
        ...(clientId && clientId !== 'ALL' ? { clientId } : {}),
      },
      include: {
        client: {
          select: { id: true, businessName: true, category: true, logo: true, approvalRequired: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Publishes a single image post to Instagram Graph API.
   * Enforces client approval gate if enabled on the client.
   */
  public async publishImage(input: PublishInstagramImageInput): Promise<InstagramPublishResponse> {
    const { client, account } = await this.resolveSocialAccount(input.clientId, input.accountId);

    // 1. Mandatory Approval Guard: Never publish without approval if client requires it!
    if (client.approvalRequired && !input.isApproved) {
      const gateErr = `Publishing blocked by approval gate: Client "${client.businessName}" requires explicit approval before publishing.`;
      console.warn(`[Approval Gate] ${gateErr}`);
      return {
        success: false,
        errorCode: 'APPROVAL_REQUIRED',
        errorMessage: gateErr,
      };
    }

    const effectiveToken = input.accessToken || account?.accessToken || process.env.META_DEFAULT_ACCESS_TOKEN || '';
    const targetAccountId = input.accountId || account?.accountId || '';

    const startTime = Date.now();
    const result: PublishResult = await MetaService.publishInstagram({
      accountId: targetAccountId,
      accessToken: effectiveToken,
      mediaUrl: input.imageUrl,
      caption: input.caption,
      contentType: 'POST',
    });
    const latencyMs = Date.now() - startTime;

    // Optional automated first comment
    let commentResult: any = null;
    if (result.success && result.externalPostId && input.firstComment) {
      commentResult = await MetaService.postInstagramComment({
        mediaId: result.externalPostId,
        accessToken: effectiveToken,
        message: input.firstComment,
      });
    }

    // Ensure a backing ScheduledPost & ContentItem record exists to satisfy schema integrity
    const scheduledPostId = await this.ensureScheduledPostRecord({
      clientId: client.id,
      socialAccountId: account?.id,
      title: input.caption.slice(0, 60),
      caption: input.caption,
      contentType: 'POST',
      mediaUrl: input.imageUrl,
      status: result.success ? 'PUBLISHED' : 'FAILED',
      publishedAt: result.success ? new Date() : undefined,
      lastError: result.errorMessage,
    });

    // Persist Publishing Log
    const log = await prisma.publishingLog.create({
      data: {
        scheduledPostId,
        clientId: client.id,
        platform: 'INSTAGRAM',
        status: result.success ? 'SUCCESS' : 'FAILED',
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        latencyMs,
        requestPayload: JSON.stringify({
          imageUrl: input.imageUrl,
          captionSnippet: input.caption.slice(0, 100),
          firstComment: input.firstComment,
        }),
        responseSummary: JSON.stringify({
          externalPostId: result.externalPostId,
          commentResult,
          rawResponse: result.rawResponse,
        }),
      },
    });

    return {
      success: result.success,
      externalPostId: result.externalPostId,
      permalink: result.rawResponse?.permalink || (result.externalPostId ? `https://instagram.com/p/${result.externalPostId}` : undefined),
      commentId: commentResult?.commentId,
      commentSuccess: commentResult?.success,
      logId: log.id,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    };
  }

  /**
   * Publishes an Instagram Reel (video) to Instagram Graph API.
   * Handles video container creation, async processing polling, and publishing.
   */
  public async publishReel(input: PublishInstagramReelInput): Promise<InstagramPublishResponse> {
    const { client, account } = await this.resolveSocialAccount(input.clientId, input.accountId);

    if (client.approvalRequired && !input.isApproved) {
      return {
        success: false,
        errorCode: 'APPROVAL_REQUIRED',
        errorMessage: `Publishing blocked: Reel requires explicit approval for client "${client.businessName}".`,
      };
    }

    const effectiveToken = input.accessToken || account?.accessToken || process.env.META_DEFAULT_ACCESS_TOKEN || '';
    const targetAccountId = input.accountId || account?.accountId || '';

    const startTime = Date.now();
    const result: PublishResult = await MetaService.publishInstagram({
      accountId: targetAccountId,
      accessToken: effectiveToken,
      mediaUrl: input.videoUrl,
      caption: input.caption,
      contentType: 'REEL',
    });
    const latencyMs = Date.now() - startTime;

    let commentResult: any = null;
    if (result.success && result.externalPostId && input.firstComment) {
      commentResult = await MetaService.postInstagramComment({
        mediaId: result.externalPostId,
        accessToken: effectiveToken,
        message: input.firstComment,
      });
    }

    const scheduledPostId = await this.ensureScheduledPostRecord({
      clientId: client.id,
      socialAccountId: account?.id,
      title: input.caption.slice(0, 60),
      caption: input.caption,
      contentType: 'REEL',
      mediaUrl: input.videoUrl,
      status: result.success ? 'PUBLISHED' : 'FAILED',
      publishedAt: result.success ? new Date() : undefined,
      lastError: result.errorMessage,
    });

    const log = await prisma.publishingLog.create({
      data: {
        scheduledPostId,
        clientId: client.id,
        platform: 'INSTAGRAM',
        status: result.success ? 'SUCCESS' : 'FAILED',
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        latencyMs,
        requestPayload: JSON.stringify({
          videoUrl: input.videoUrl,
          captionSnippet: input.caption.slice(0, 100),
          shareToFeed: input.shareToFeed,
        }),
        responseSummary: JSON.stringify({
          externalPostId: result.externalPostId,
          commentResult,
          rawResponse: result.rawResponse,
        }),
      },
    });

    return {
      success: result.success,
      externalPostId: result.externalPostId,
      permalink: result.rawResponse?.permalink || (result.externalPostId ? `https://instagram.com/reel/${result.externalPostId}` : undefined),
      commentId: commentResult?.commentId,
      commentSuccess: commentResult?.success,
      logId: log.id,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    };
  }

  /**
   * Publishes an Instagram Carousel (2-10 items) to Instagram Graph API.
   */
  public async publishCarousel(input: PublishInstagramCarouselInput): Promise<InstagramPublishResponse> {
    const { client, account } = await this.resolveSocialAccount(input.clientId, input.accountId);

    if (client.approvalRequired && !input.isApproved) {
      return {
        success: false,
        errorCode: 'APPROVAL_REQUIRED',
        errorMessage: `Publishing blocked: Carousel requires explicit approval for client "${client.businessName}".`,
      };
    }

    const effectiveToken = input.accessToken || account?.accessToken || process.env.META_DEFAULT_ACCESS_TOKEN || '';
    const targetAccountId = input.accountId || account?.accountId || '';

    const startTime = Date.now();
    const result: PublishResult = await MetaService.publishInstagram({
      accountId: targetAccountId,
      accessToken: effectiveToken,
      mediaUrl: JSON.stringify(input.mediaUrls),
      caption: input.caption,
      contentType: 'CAROUSEL',
    });
    const latencyMs = Date.now() - startTime;

    let commentResult: any = null;
    if (result.success && result.externalPostId && input.firstComment) {
      commentResult = await MetaService.postInstagramComment({
        mediaId: result.externalPostId,
        accessToken: effectiveToken,
        message: input.firstComment,
      });
    }

    const scheduledPostId = await this.ensureScheduledPostRecord({
      clientId: client.id,
      socialAccountId: account?.id,
      title: input.caption.slice(0, 60),
      caption: input.caption,
      contentType: 'CAROUSEL',
      mediaUrl: JSON.stringify(input.mediaUrls),
      status: result.success ? 'PUBLISHED' : 'FAILED',
      publishedAt: result.success ? new Date() : undefined,
      lastError: result.errorMessage,
    });

    const log = await prisma.publishingLog.create({
      data: {
        scheduledPostId,
        clientId: client.id,
        platform: 'INSTAGRAM',
        status: result.success ? 'SUCCESS' : 'FAILED',
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        latencyMs,
        requestPayload: JSON.stringify({
          mediaCount: input.mediaUrls.length,
          mediaUrls: input.mediaUrls,
          captionSnippet: input.caption.slice(0, 100),
        }),
        responseSummary: JSON.stringify({
          externalPostId: result.externalPostId,
          commentResult,
          rawResponse: result.rawResponse,
        }),
      },
    });

    return {
      success: result.success,
      externalPostId: result.externalPostId,
      permalink: result.rawResponse?.permalink || (result.externalPostId ? `https://instagram.com/p/${result.externalPostId}` : undefined),
      commentId: commentResult?.commentId,
      commentSuccess: commentResult?.success,
      logId: log.id,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    };
  }

  /**
   * Helper to ensure a backing ScheduledPost and ContentItem exist for direct publish calls
   */
  private async ensureScheduledPostRecord(params: {
    clientId: string;
    socialAccountId?: string;
    title: string;
    caption: string;
    contentType: 'POST' | 'REEL' | 'CAROUSEL' | 'STORY';
    mediaUrl: string;
    status: 'PUBLISHED' | 'FAILED';
    publishedAt?: Date;
    lastError?: string;
  }): Promise<string> {
    try {
      let resolvedAccountId = params.socialAccountId;
      if (!resolvedAccountId) {
        const found = await prisma.socialAccount.findFirst({
          where: { clientId: params.clientId, platform: 'INSTAGRAM' },
        });
        if (found) {
          resolvedAccountId = found.id;
        } else {
          const created = await prisma.socialAccount.create({
            data: {
              clientId: params.clientId,
              platform: 'INSTAGRAM',
              accountId: `ig_${Date.now()}`,
              accountName: 'Instagram Default',
              status: 'CONNECTED',
            },
          });
          resolvedAccountId = created.id;
        }
      }

      const contentItem = await prisma.contentItem.create({
        data: {
          clientId: params.clientId,
          title: params.title.slice(0, 60),
          contentType: params.contentType,
          mediaUrl: params.mediaUrl,
          status: params.status,
          variants: {
            create: {
              platform: 'INSTAGRAM',
              caption: params.caption,
            },
          },
        },
      });

      const scheduledPost = await prisma.scheduledPost.create({
        data: {
          clientId: params.clientId,
          contentItemId: contentItem.id,
          socialAccountId: resolvedAccountId,
          platform: 'INSTAGRAM',
          scheduledAt: new Date(),
          publishedAt: params.publishedAt,
          status: params.status,
          lastError: params.lastError,
          idempotencyKey: `direct_pub_${contentItem.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        },
      });

      return scheduledPost.id;
    } catch (err: any) {
      console.warn('[InstagramGraphService.ensureScheduledPostRecord Warning]:', err.message);
      const fallback = await prisma.scheduledPost.findFirst({
        where: { clientId: params.clientId },
      });
      return fallback?.id || '';
    }
  }

  /**
   * Schedules a post for future publishing by the automated scheduler.
   */
  public async schedulePost(input: ScheduleInstagramPostInput) {
    const { client, account } = await this.resolveSocialAccount(input.clientId, input.accountId);

    if (!account) {
      throw new Error(`Client "${client.businessName}" has no connected Instagram account.`);
    }

    const scheduledDate = new Date(input.scheduledAt);
    if (scheduledDate < new Date()) {
      throw new Error('Scheduled date must be in the future.');
    }

    // Create a ContentItem
    const contentItem = await prisma.contentItem.create({
      data: {
        clientId: client.id,
        title: input.caption.slice(0, 60),
        contentType: input.contentType,
        mediaUrl: input.mediaUrl,
        status: client.approvalRequired && !input.isApproved ? 'READY_FOR_APPROVAL' : 'APPROVED',
        variants: {
          create: {
            platform: 'INSTAGRAM',
            caption: input.caption,
            hashtags: input.firstComment ? `---FIRST_COMMENT--- ${input.firstComment}` : undefined,
          },
        },
      },
    });

    // Create the ScheduledPost entry
    const scheduled = await prisma.scheduledPost.create({
      data: {
        clientId: client.id,
        contentItemId: contentItem.id,
        socialAccountId: account.id,
        platform: 'INSTAGRAM',
        scheduledAt: scheduledDate,
        timezone: client.timezone || 'Asia/Kolkata',
        status: 'SCHEDULED',
        idempotencyKey: `sched_ig_${client.id}_${contentItem.id}_${scheduledDate.getTime()}`,
      },
      include: {
        client: { select: { businessName: true } },
        socialAccount: { select: { accountName: true, accountId: true } },
        contentItem: true,
      },
    });

    return scheduled;
  }

  /**
   * Queries Meta container status by creationId.
   */
  public async getContainerStatus(creationId: string, accessToken?: string) {
    const token = accessToken || process.env.META_DEFAULT_ACCESS_TOKEN || '';
    if (!token || !token.startsWith('EAA')) {
      return {
        creationId,
        status_code: 'FINISHED',
        status: 'Sandbox Simulation (Offline)',
      };
    }

    const res = await fetch(
      `https://graph.facebook.com/v20.0/${creationId}?fields=status_code,status&access_token=${token}`
    );
    const data: any = await res.json();
    return {
      creationId,
      status_code: data.status_code || (data.error ? 'ERROR' : 'UNKNOWN'),
      status: data.status || data.error?.message,
      raw: data,
    };
  }

  /**
   * Retrieves paginated publishing logs for Instagram.
   */
  public async getPublishingHistory(query: GetPublishingHistoryInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { platform: 'INSTAGRAM' };
    if (query.clientId && query.clientId !== 'ALL') {
      where.clientId = query.clientId;
    }

    const [items, total] = await Promise.all([
      prisma.publishingLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { executedAt: 'desc' },
        include: {
          client: {
            select: { id: true, businessName: true, category: true, logo: true },
          },
        },
      }),
      prisma.publishingLog.count({ where }),
    ]);

    return {
      items: items.map((log) => ({
        ...log,
        requestPayload: JSON.parse(log.requestPayload || '{}'),
        responseSummary: JSON.parse(log.responseSummary || '{}'),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export const instagramGraphService = new InstagramGraphService();
