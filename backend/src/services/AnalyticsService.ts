import prisma from '../prisma';

export class AnalyticsService {
  /**
   * Returns high-level agency and client specific performance metrics
   */
  static async getOverview(clientId?: string) {
    const clientsCount = await prisma.client.count();
    const activeClientsCount = await prisma.client.count({
      where: { status: { not: 'INACTIVE' } },
    });
    const accountsCount = await prisma.socialAccount.count({
      where: {
        status: 'CONNECTED',
        ...(clientId ? { clientId } : {}),
      },
    });
    
    // Scheduled items: Count all scheduled content items (and scheduled posts)
    const contentScheduled = await prisma.contentItem.count({
      where: {
        status: 'SCHEDULED',
        ...(clientId ? { clientId } : {}),
      },
    });

    const schedPostScheduled = await prisma.scheduledPost.count({
      where: {
        status: 'SCHEDULED',
        ...(clientId ? { clientId } : {}),
      },
    });

    const scheduledCount = Math.max(contentScheduled, schedPostScheduled);

    const publishedContent = await prisma.contentItem.count({
      where: {
        status: 'PUBLISHED',
        ...(clientId ? { clientId } : {}),
      },
    });

    const publishedSched = await prisma.scheduledPost.count({
      where: {
        status: 'PUBLISHED',
        ...(clientId ? { clientId } : {}),
      },
    });

    const publishedCount = Math.max(publishedContent, publishedSched);

    const failedContent = await prisma.contentItem.count({
      where: {
        status: 'FAILED',
        ...(clientId ? { clientId } : {}),
      },
    });

    const failedSched = await prisma.scheduledPost.count({
      where: {
        status: 'FAILED',
        ...(clientId ? { clientId } : {}),
      },
    });

    const failedCount = Math.max(failedContent, failedSched);

    const draftCount = await prisma.contentItem.count({
      where: {
        status: { in: ['DRAFT', 'NEW'] },
        ...(clientId ? { clientId } : {}),
      },
    });

    const pendingApprovalCount = await prisma.contentItem.count({
      where: {
        status: { in: ['READY_FOR_APPROVAL', 'PENDING', 'IN_REVIEW', 'CHANGES_REQUESTED'] },
        ...(clientId ? { clientId } : {}),
      },
    });

    const changesRequestedCount = await prisma.approvalRequest.count({
      where: {
        status: { in: ['CHANGES_REQUESTED', 'REJECTED'] },
        ...(clientId ? { contentItem: { clientId } } : {}),
      },
    });

    const totalPosts = await prisma.contentItem.count({
      where: clientId ? { clientId } : undefined,
    });

    // Precise Start of Day and End of Day according to Indian Standard Time (Asia/Kolkata, UTC+5:30)
    const kolkataFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = kolkataFormatter.format(new Date()); // "YYYY-MM-DD" in IST
    const todayStart = new Date(`${todayStr}T00:00:00+05:30`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999+05:30`);

    // 1. Posts published today
    const publishedTodaySched = await prisma.scheduledPost.count({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: todayStart, lte: todayEnd },
        ...(clientId ? { clientId } : {}),
      },
    });

    const publishedTodayContent = await prisma.contentItem.count({
      where: {
        status: 'PUBLISHED',
        updatedAt: { gte: todayStart, lte: todayEnd },
        ...(clientId ? { clientId } : {}),
      },
    });

    const publishedToday = Math.max(publishedTodaySched, publishedTodayContent);

    // 2. Posts scheduled for today (remaining to be published today)
    const scheduledTodaySched = await prisma.scheduledPost.count({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gte: todayStart, lte: todayEnd },
        ...(clientId ? { clientId } : {}),
      },
    });

    // Also check pending approval requests scheduled for today or future
    const pendingApprovalItems = await prisma.approvalRequest.findMany({
      where: {
        status: 'PENDING',
        contentItem: clientId ? { clientId } : undefined,
      },
      select: { feedbackNote: true },
    });

    let pendingTodaySched = 0;
    let pendingUpcomingSched = 0;

    for (const apr of pendingApprovalItems) {
      try {
        if (apr.feedbackNote && apr.feedbackNote.startsWith('{')) {
          const meta = JSON.parse(apr.feedbackNote);
          if (meta.scheduledAt) {
            const schedDate = new Date(meta.scheduledAt);
            if (schedDate >= todayStart && schedDate <= todayEnd) {
              pendingTodaySched++;
            } else if (schedDate > todayEnd) {
              pendingUpcomingSched++;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    const scheduledToday = scheduledTodaySched + pendingTodaySched;

    // 3. Posts scheduled for upcoming future dates (tomorrow and beyond)
    const scheduledUpcomingSched = await prisma.scheduledPost.count({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gt: todayEnd },
        ...(clientId ? { clientId } : {}),
      },
    });

    const scheduledUpcoming = scheduledUpcomingSched + pendingUpcomingSched;

    const totalScheduled = scheduledCount > 0 ? scheduledCount : (scheduledToday + scheduledUpcoming);

    const successRate = totalScheduled > 0
      ? Math.round((publishedCount / (publishedCount + failedCount || 1)) * 100)
      : 100;

    // Platform breakdown
    const platforms = ['INSTAGRAM', 'FACEBOOK', 'GOOGLE_BUSINESS', 'LINKEDIN', 'TWITTER'];
    const platformBreakdown: Record<string, number> = {};

    for (const p of platforms) {
      const pCount = await prisma.scheduledPost.count({
        where: {
          platform: p,
          ...(clientId ? { clientId } : {}),
        },
      });
      const vCount = await prisma.contentVariant.count({
        where: {
          platform: p,
          contentItem: {
            status: { in: ['SCHEDULED', 'PUBLISHED'] },
            ...(clientId ? { clientId } : {}),
          },
        },
      });
      platformBreakdown[p] = Math.max(pCount, vCount);
    }

    // Reach and engagement metrics
    const metrics = await prisma.analyticsMetric.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { date: 'desc' },
      take: 30,
    });

    const totalReach = metrics.reduce((acc, m) => acc + m.reach, 0);
    const totalImpressions = metrics.reduce((acc, m) => acc + m.impressions, 0);
    const totalLikes = metrics.reduce((acc, m) => acc + m.likes, 0);
    const totalComments = metrics.reduce((acc, m) => acc + m.comments, 0);
    const totalShares = metrics.reduce((acc, m) => acc + m.shares, 0);
    const totalEngagement = metrics.reduce((acc, m) => acc + m.likes + m.comments + m.shares, 0);
    const avgEngagementRate = totalImpressions > 0 ? parseFloat(((totalEngagement / totalImpressions) * 100).toFixed(1)) : 0;
    const avgViewsPerPost = totalPosts > 0 ? Math.round(totalImpressions / totalPosts) : 0;

    return {
      clientsCount,
      activeClientsCount,
      accountsCount,
      totalPosts,
      totalScheduled,
      scheduledCount,
      scheduledToday,
      scheduledUpcoming,
      draftCount,
      publishedCount,
      publishedToday,
      failedCount,
      pendingApprovalCount,
      changesRequestedCount,
      successRate,
      totalReach,
      totalImpressions,
      totalLikes,
      totalComments,
      totalShares,
      totalEngagement,
      avgEngagementRate,
      avgViewsPerPost,
      platformBreakdown,
      metricsHistory: metrics,
    };
  }

  /**
   * Generates a monthly client report structure
   */
  static async generateMonthlyReport(clientId: string, month = 'September', year = 2026) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { brandProfile: true },
    });

    if (!client) throw new Error(`Client ${clientId} not found`);

    const posts = await prisma.scheduledPost.findMany({
      where: {
        clientId,
        status: 'PUBLISHED',
      },
      include: {
        contentItem: true,
      },
      take: 20,
    });

    const failed = await prisma.scheduledPost.count({
      where: { clientId, status: 'FAILED' },
    });

    const successRate = posts.length + failed > 0
      ? Math.round((posts.length / (posts.length + failed)) * 100)
      : 100;

    return {
      reportId: `REP-${clientId.substring(0, 5)}-${month.toUpperCase()}-${year}`,
      client: {
        id: client.id,
        businessName: client.businessName,
        category: client.category,
        location: client.location,
      },
      period: `${month} ${year}`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalPublished: posts.length,
        totalFailed: failed,
        successRate: `${successRate}%`,
        estimatedReach: posts.length * 1420 + 3500,
        estimatedImpressions: posts.length * 2800 + 7200,
        engagementCount: posts.length * 210 + 450,
      },
      topPosts: posts.slice(0, 5).map((p) => ({
        id: p.id,
        title: p.contentItem.title,
        contentType: p.contentItem.contentType,
        platform: p.platform,
        publishedAt: p.publishedAt || p.scheduledAt,
      })),
    };
  }
}
