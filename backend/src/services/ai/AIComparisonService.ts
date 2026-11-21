import {
  SupportedAIProvider,
  DEFAULT_PROVIDER_MODELS,
} from '../../config/ai.config';
import { aiFactory } from './AIFactory';
import { contentHistoryService } from './ContentHistoryService';
import {
  buildComparisonPrompt,
  INSTAGRAM_SYSTEM_PROMPT,
} from '../../prompts/instagram.prompts';
import { CompareProvidersInput } from '../../validators/aiComparison.validator';
import { AIProviderError } from './interfaces/IAIService';

export interface ProviderComparisonResult {
  provider: SupportedAIProvider;
  modelId: string;
  status: 'success' | 'error';
  hook?: string;
  caption?: string;
  callToAction?: string;
  hashtags?: string[];
  latencyMs: number;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  estimatedCostUSD?: number;
  error?: string;
}

export interface MultiProviderComparisonResponse {
  topic: string;
  timestamp: string;
  totalProvidersAttempted: number;
  successfulCount: number;
  failedCount: number;
  fastestProvider?: SupportedAIProvider;
  lowestCostProvider?: SupportedAIProvider;
  results: ProviderComparisonResult[];
}

function parseComparisonJson(rawText: string): {
  hook: string;
  caption: string;
  callToAction: string;
  hashtags: string[];
} {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

export class AIComparisonService {
  /**
   * Concurrently queries multiple AI providers for the identical topic & prompt.
   * Collects side-by-side results, latencies, token counts, and cost estimates.
   * Does not fail the entire operation if one provider fails (graceful partial failure).
   */
  public async compareProviders(
    input: CompareProvidersInput
  ): Promise<MultiProviderComparisonResponse> {
    const targetProviders: SupportedAIProvider[] =
      input.providers && input.providers.length > 0
        ? input.providers
        : ['gemini', 'openai', 'groq', 'anthropic'];

    const prompt = buildComparisonPrompt({
      topic: input.topic,
      brandName: input.brandName,
      targetAudience: input.targetAudience,
      tone: input.tone,
      ctaType: input.ctaType,
    });

    const timeoutMs = input.timeoutMs || 30000;

    // Fire all provider calls concurrently in parallel
    const executionPromises = targetProviders.map(async (provider): Promise<ProviderComparisonResult> => {
      const startTime = Date.now();
      const service = aiFactory.getProvider(provider);
      const defaultModel = DEFAULT_PROVIDER_MODELS[provider] || service.defaultModel;

      if (!service.isAvailable()) {
        return {
          provider,
          modelId: defaultModel,
          status: 'error',
          error: `API key for provider "${provider}" is not configured in environment.`,
          latencyMs: 0,
        };
      }

      try {
        // Run generation with allowFallback: false so we measure this exact provider
        const generation = await service.generateText({
          prompt,
          systemPrompt: INSTAGRAM_SYSTEM_PROMPT,
          temperature: 0.7,
          maxTokens: 1000,
          timeoutMs,
        });

        let parsed: { hook: string; caption: string; callToAction: string; hashtags: string[] };

        try {
          parsed = parseComparisonJson(generation.rawText);
        } catch {
          // If JSON parse fails, extract lines as fallback
          const raw = generation.rawText;
          const tags = (raw.match(/#[a-zA-Z0-9_]+/g) || []).slice(0, 8);
          parsed = {
            hook: raw.split('\n')[0] || input.topic,
            caption: raw,
            callToAction: 'Drop your thoughts in the comments!',
            hashtags: tags,
          };
        }

        const cleanHashtags = (parsed.hashtags || []).map((t) =>
          t.startsWith('#') ? t : `#${t}`
        );

        return {
          provider,
          modelId: generation.modelId,
          status: 'success',
          hook: parsed.hook,
          caption: parsed.caption,
          callToAction: parsed.callToAction,
          hashtags: cleanHashtags,
          latencyMs: generation.latencyMs,
          tokens: {
            input: generation.inputTokens,
            output: generation.outputTokens,
            total: generation.totalTokens,
          },
          estimatedCostUSD: generation.costUSD,
        };
      } catch (error: any) {
        const elapsed = Date.now() - startTime;
        const errorMsg =
          error instanceof AIProviderError
            ? error.message
            : error?.message || 'Unknown error occurred during provider execution';

        return {
          provider,
          modelId: defaultModel,
          status: 'error',
          error: errorMsg,
          latencyMs: elapsed,
        };
      }
    });

    const settledResults = await Promise.allSettled(executionPromises);

    const results: ProviderComparisonResult[] = settledResults.map((s, idx) => {
      if (s.status === 'fulfilled') {
        return s.value;
      }
      return {
        provider: targetProviders[idx],
        modelId: DEFAULT_PROVIDER_MODELS[targetProviders[idx]],
        status: 'error',
        error: s.reason?.message || 'Unhandled rejection',
        latencyMs: 0,
      };
    });

    const successful = results.filter((r) => r.status === 'success');
    const successfulCount = successful.length;
    const failedCount = results.length - successfulCount;

    // Determine fastest provider among successful responses
    let fastestProvider: SupportedAIProvider | undefined;
    if (successful.length > 0) {
      const sortedByLatency = [...successful].sort((a, b) => a.latencyMs - b.latencyMs);
      fastestProvider = sortedByLatency[0].provider;
    }

    // Determine lowest cost provider among successful responses
    let lowestCostProvider: SupportedAIProvider | undefined;
    if (successful.length > 0) {
      const sortedByCost = [...successful].sort(
        (a, b) => (a.estimatedCostUSD || 0) - (b.estimatedCostUSD || 0)
      );
      lowestCostProvider = sortedByCost[0].provider;
    }

    // Auto-persist comparison run to database
    contentHistoryService
      .saveComparisonLog({
        topic: input.topic,
        providersAttempted: targetProviders,
        results,
        fastestProvider,
        lowestCostProvider,
      })
      .catch((err) => console.warn('[AIComparisonService AutoPersist Warning]:', err.message));

    return {
      topic: input.topic,
      timestamp: new Date().toISOString(),
      totalProvidersAttempted: results.length,
      successfulCount,
      failedCount,
      fastestProvider,
      lowestCostProvider,
      results,
    };
  }
}

export const aiComparisonService = new AIComparisonService();
