import prisma from '../prisma';
import { LiveMetricsService } from './LiveMetricsService';

export class AnalyticsService {
  /**
   * Returns high-level agency and client specific performance metrics
   * Powered by LIVE Meta Graph API synchronization (Instagram & Facebook real data)
   */
  static async getOverview(clientId?: string, range: string = '30D') {
    // 1. Fetch live metrics from Meta Graph API
    const realOverview = await LiveMetricsService.getRealClientOverview(clientId, range);

    // 2. Fetch agency-level totals
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

    const clientInfo = clientId
      ? await prisma.client.findUnique({
          where: { id: clientId },
          select: {
            id: true,
            businessName: true,
            category: true,
            location: true,
            logo: true,
            phone: true,
            website: true,
            status: true,
          },
        })
      : null;

    return {
      ...realOverview,
      clientsCount,
      activeClientsCount,
      accountsCount,
      client: clientInfo || realOverview.client,
      liveSynced: true,
    };
  }

  /**
   * Generates a monthly client report structure backed by real Meta Graph API metrics
   */
  static async generateMonthlyReport(clientId: string, month = 'October', year = 2026) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { brandProfile: true },
    });

    if (!client) throw new Error(`Client ${clientId} not found`);

    // Fetch real live overview for the client over 30 days
    const realData = await LiveMetricsService.getRealClientOverview(clientId, '30D');

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

    const successRate = realData.publishedCount + failed > 0
      ? Math.round((realData.publishedCount / (realData.publishedCount + failed)) * 100)
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
      liveSynced: true,
      summary: {
        totalPublished: realData.publishedCount,
        totalFailed: failed,
        successRate: `${successRate}%`,
        totalLikes: realData.totalLikes,
        totalComments: realData.totalComments,
        totalEngagement: realData.totalEngagement,
        totalReach: realData.totalReach,
        totalImpressions: realData.totalImpressions,
        avgEngagementRate: `${realData.avgEngagementRate}%`,
        followersCount: realData.totalFollowers,
      },
      topPosts: realData.topPosts.slice(0, 5).map((p) => ({
        id: p.id,
        title: p.title,
        caption: p.caption,
        platform: p.platform,
        likes: p.likes,
        comments: p.comments,
        reach: p.reach,
        permalink: p.permalink,
        publishedAt: p.publishedAt,
      })),
      trend: realData.trend,
    };
  }
}
