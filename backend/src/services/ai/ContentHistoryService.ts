import prisma from '../../prisma';
import {
  GetHistoryQueryInput,
  SaveGeneratedContentInput,
} from '../../validators/contentHistory.validator';

export interface ProviderUsageStat {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUSD: number;
  avgLatencyMs: number;
}

export interface AggregatedApiUsageSummary {
  overall: {
    totalRequests: number;
    totalTokens: number;
    totalCostUSD: number;
    avgLatencyMs: number;
  };
  byProvider: Record<string, ProviderUsageStat>;
  byEndpoint: Record<string, { requests: number; costUSD: number; tokens: number }>;
}

export class ContentHistoryService {
  /**
   * Persists an AI generated content item into the database, and logs API usage metrics.
   */
  public async saveGeneratedContent(input: SaveGeneratedContentInput) {
    try {
      // Validate client exists if clientId was provided
      let validClientId: string | null = null;
      if (input.clientId) {
        const client = await prisma.client.findUnique({ where: { id: input.clientId } });
        if (client) validClientId = client.id;
      }

      const created = await prisma.generatedContent.create({
        data: {
          clientId: validClientId,
          topic: input.topic,
          contentType: input.contentType,
          provider: input.provider,
          modelId: input.modelId,
          hook: input.hook,
          caption: input.caption,
          callToAction: input.callToAction,
          hashtags: input.hashtags,
          variationsJson: input.variationsJson,
          visualElements: input.visualElements,
          inputTokens: input.inputTokens,
          outputTokens: input.outputTokens,
          totalTokens: input.totalTokens,
          latencyMs: input.latencyMs,
          costUSD: input.costUSD,
          usedFallback: input.usedFallback,
          status: input.status || 'DRAFT',
        },
      });

      // Automatically record API usage log
      await this.logApiUsage({
        provider: input.provider,
        modelId: input.modelId,
        endpoint: input.contentType.toLowerCase(),
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        totalTokens: input.totalTokens,
        latencyMs: input.latencyMs,
        costUSD: input.costUSD,
        status: 'SUCCESS',
      });

      return created;
    } catch (err: any) {
      console.error('[ContentHistoryService.saveGeneratedContent Error]:', err);
      throw err;
    }
  }

  /**
   * Logs an API execution event into APIUsageLog.
   */
  public async logApiUsage(data: {
    provider: string;
    modelId: string;
    endpoint: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    latencyMs: number;
    costUSD: number;
    status: 'SUCCESS' | 'ERROR';
    errorMessage?: string;
  }) {
    try {
      await prisma.aPIUsageLog.create({
        data: {
          provider: data.provider,
          modelId: data.modelId,
          endpoint: data.endpoint,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          totalTokens: data.totalTokens,
          latencyMs: data.latencyMs,
          costUSD: data.costUSD,
          status: data.status,
          errorMessage: data.errorMessage,
        },
      });
    } catch (err) {
      console.warn('[ContentHistoryService.logApiUsage note]:', err);
    }
  }

  /**
   * Saves a multi-provider comparison run to the database.
   */
  public async saveComparisonLog(data: {
    topic: string;
    providersAttempted: string[];
    results: any[];
    fastestProvider?: string;
    lowestCostProvider?: string;
    selectedProvider?: string;
  }) {
    try {
      return await prisma.contentComparisonLog.create({
        data: {
          topic: data.topic,
          providersAttempted: JSON.stringify(data.providersAttempted),
          resultsJson: JSON.stringify(data.results),
          fastestProvider: data.fastestProvider,
          lowestCostProvider: data.lowestCostProvider,
          selectedProvider: data.selectedProvider,
        },
      });
    } catch (err) {
      console.warn('[ContentHistoryService.saveComparisonLog note]:', err);
      return null;
    }
  }

  /**
   * Saves a human user feedback rating to the database.
   */
  public async saveFeedback(data: {
    contentId?: string;
    caption: string;
    rating: number;
    feedbackNotes?: string;
    likedAspects?: string[];
    dislikedAspects?: string[];
    provider?: string;
    modelId?: string;
  }) {
    try {
      return await prisma.contentFeedback.create({
        data: {
          contentId: data.contentId,
          caption: data.caption,
          rating: data.rating,
          feedbackNotes: data.feedbackNotes,
          likedAspects: data.likedAspects ? JSON.stringify(data.likedAspects) : null,
          dislikedAspects: data.dislikedAspects ? JSON.stringify(data.dislikedAspects) : null,
          provider: data.provider,
          modelId: data.modelId,
        },
      });
    } catch (err) {
      console.warn('[ContentHistoryService.saveFeedback note]:', err);
      return null;
    }
  }

  /**
   * Retrieves paginated content history with optional filtering by client, type, provider, or status.
   */
  public async getGeneratedContentHistory(query: GetHistoryQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.clientId && query.clientId !== 'ALL') {
      where.clientId = query.clientId;
    }
    if (query.contentType && query.contentType !== 'ALL') {
      where.contentType = query.contentType;
    }
    if (query.provider && query.provider !== 'ALL') {
      where.provider = query.provider;
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      prisma.generatedContent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              businessName: true,
              category: true,
            },
          },
          feedbacks: true,
        },
      }),
      prisma.generatedContent.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves a single content record by ID.
   */
  public async getContentById(id: string) {
    return await prisma.generatedContent.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            businessName: true,
            category: true,
          },
        },
        feedbacks: true,
      },
    });
  }

  /**
   * Updates status of a generated content item (e.g. DRAFT -> APPROVED / SCHEDULED).
   */
  public async updateContentStatus(id: string, status: string) {
    return await prisma.generatedContent.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Deletes a content record by ID.
   */
  public async deleteContent(id: string) {
    return await prisma.generatedContent.delete({
      where: { id },
    });
  }

  /**
   * Retrieves recent multi-provider comparison logs.
   */
  public async getComparisonHistory(limit = 20) {
    const logs = await prisma.contentComparisonLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => ({
      ...log,
      providersAttempted: JSON.parse(log.providersAttempted || '[]'),
      results: JSON.parse(log.resultsJson || '[]'),
    }));
  }

  /**
   * Computes aggregated API token consumption, costs, and latencies across providers.
   */
  public async getApiUsageStats(): Promise<AggregatedApiUsageSummary> {
    const logs = await prisma.aPIUsageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const summary: AggregatedApiUsageSummary = {
      overall: {
        totalRequests: logs.length,
        totalTokens: 0,
        totalCostUSD: 0,
        avgLatencyMs: 0,
      },
      byProvider: {},
      byEndpoint: {},
    };

    let totalLatency = 0;

    for (const log of logs) {
      summary.overall.totalTokens += log.totalTokens;
      summary.overall.totalCostUSD += log.costUSD;
      totalLatency += log.latencyMs;

      // By Provider
      if (!summary.byProvider[log.provider]) {
        summary.byProvider[log.provider] = {
          provider: log.provider,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          totalCostUSD: 0,
          avgLatencyMs: 0,
        };
      }
      const p = summary.byProvider[log.provider];
      p.totalRequests += 1;
      if (log.status === 'SUCCESS') p.successfulRequests += 1;
      else p.failedRequests += 1;
      p.inputTokens += log.inputTokens;
      p.outputTokens += log.outputTokens;
      p.totalTokens += log.totalTokens;
      p.totalCostUSD += log.costUSD;
      p.avgLatencyMs += log.latencyMs;

      // By Endpoint
      if (!summary.byEndpoint[log.endpoint]) {
        summary.byEndpoint[log.endpoint] = {
          requests: 0,
          costUSD: 0,
          tokens: 0,
        };
      }
      summary.byEndpoint[log.endpoint].requests += 1;
      summary.byEndpoint[log.endpoint].costUSD += log.costUSD;
      summary.byEndpoint[log.endpoint].tokens += log.totalTokens;
    }

    if (logs.length > 0) {
      summary.overall.avgLatencyMs = Math.round(totalLatency / logs.length);
      summary.overall.totalCostUSD = Number(summary.overall.totalCostUSD.toFixed(6));

      for (const providerKey of Object.keys(summary.byProvider)) {
        const p = summary.byProvider[providerKey];
        p.avgLatencyMs = Math.round(p.avgLatencyMs / p.totalRequests);
        p.totalCostUSD = Number(p.totalCostUSD.toFixed(6));
      }
    }

    return summary;
  }
}

export const contentHistoryService = new ContentHistoryService();
