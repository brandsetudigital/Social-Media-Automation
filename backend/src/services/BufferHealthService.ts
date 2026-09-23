import prisma from '../prisma';

export interface ClientBufferStatus {
  clientId: string;
  clientName: string;
  requiredDays: number;
  overallStatus: 'GOOD' | 'LOW' | 'CRITICAL';
  metrics: {
    posts: { ready: number; daysCovered: number; status: 'GOOD' | 'LOW' | 'CRITICAL' };
    stories: { ready: number; daysCovered: number; status: 'GOOD' | 'LOW' | 'CRITICAL' };
    reels: { ready: number; daysCovered: number; status: 'GOOD' | 'LOW' | 'CRITICAL' };
  };
  warnings: string[];
}

export class BufferHealthService {
  /**
   * Calculates advance content buffer status for all clients or a specific client
   */
  static async getBufferStatus(clientId?: string): Promise<ClientBufferStatus[]> {
    const clients = await prisma.client.findMany({
      where: clientId ? { id: clientId } : undefined,
      include: {
        queueItems: {
          include: { contentItem: true },
        },
        recurringRules: {
          where: { isActive: true },
          include: { steps: true },
        },
      },
    });

    const results: ClientBufferStatus[] = [];

    for (const client of clients) {
      const requiredDays = client.requiredBufferDays || 10;

      // Count approved items ready in queue
      const postsReady = client.queueItems.filter(
        (q) => q.contentType === 'POST' && q.contentItem.status === 'APPROVED'
      ).length;

      const storiesReady = client.queueItems.filter(
        (q) => q.contentType === 'STORY' && q.contentItem.status === 'APPROVED'
      ).length;

      const reelsReady = client.queueItems.filter(
        (q) => q.contentType === 'REEL' && q.contentItem.status === 'APPROVED'
      ).length;

      // Estimate consumption rate from rules (default: ~0.5 to 1 per day if rules exist)
      let postRatePerDay = 0.5; // default 1 post every 2 days
      let storyRatePerDay = 0.7; // default ~5 stories a week
      let reelRatePerDay = 0.3; // default ~2 reels a week

      if (client.recurringRules.length > 0) {
        const rule = client.recurringRules[0];
        const postSteps = rule.steps.filter((s) => s.stepType === 'CONTENT' && s.contentType === 'POST').length;
        const storySteps = rule.steps.filter((s) => s.stepType === 'CONTENT' && s.contentType === 'STORY').length;
        const reelSteps = rule.steps.filter((s) => s.stepType === 'CONTENT' && s.contentType === 'REEL').length;
        const cycleDays = rule.steps.reduce((acc, s) => acc + (s.stepType === 'GAP' ? (s.gapDays || 1) : 1), 0) || 7;

        if (postSteps > 0) postRatePerDay = postSteps / cycleDays;
        if (storySteps > 0) storyRatePerDay = storySteps / cycleDays;
        if (reelSteps > 0) reelRatePerDay = reelSteps / cycleDays;
      }

      const postDaysCovered = Math.round(postsReady / (postRatePerDay || 0.5));
      const storyDaysCovered = Math.round(storiesReady / (storyRatePerDay || 0.5));
      const reelDaysCovered = Math.round(reelsReady / (reelRatePerDay || 0.3));

      const getPill = (days: number): 'GOOD' | 'LOW' | 'CRITICAL' => {
        if (days >= requiredDays) return 'GOOD';
        if (days >= Math.floor(requiredDays / 2)) return 'LOW';
        return 'CRITICAL';
      };

      const postStatus = getPill(postDaysCovered);
      const storyStatus = getPill(storyDaysCovered);
      const reelStatus = getPill(reelDaysCovered);

      const warnings: string[] = [];
      if (postStatus !== 'GOOD') {
        const needed = Math.max(1, Math.ceil((requiredDays - postDaysCovered) * postRatePerDay));
        warnings.push(`${client.businessName}: Needs ${needed} more Posts to meet ${requiredDays}-day buffer.`);
      }
      if (storyStatus !== 'GOOD') {
        const needed = Math.max(1, Math.ceil((requiredDays - storyDaysCovered) * storyRatePerDay));
        warnings.push(`${client.businessName}: Needs ${needed} more Stories to meet ${requiredDays}-day buffer.`);
      }
      if (reelStatus !== 'GOOD') {
        const needed = Math.max(1, Math.ceil((requiredDays - reelDaysCovered) * reelRatePerDay));
        warnings.push(`${client.businessName}: Needs ${needed} more Reels to meet ${requiredDays}-day buffer.`);
      }

      let overallStatus: 'GOOD' | 'LOW' | 'CRITICAL' = 'GOOD';
      if (postStatus === 'CRITICAL' || storyStatus === 'CRITICAL' || reelStatus === 'CRITICAL') {
        overallStatus = 'CRITICAL';
      } else if (postStatus === 'LOW' || storyStatus === 'LOW' || reelStatus === 'LOW') {
        overallStatus = 'LOW';
      }

      results.push({
        clientId: client.id,
        clientName: client.businessName,
        requiredDays,
        overallStatus,
        metrics: {
          posts: { ready: postsReady, daysCovered: postDaysCovered, status: postStatus },
          stories: { ready: storiesReady, daysCovered: storyDaysCovered, status: storyStatus },
          reels: { ready: reelsReady, daysCovered: reelDaysCovered, status: reelStatus },
        },
        warnings,
      });
    }

    return results;
  }
}
