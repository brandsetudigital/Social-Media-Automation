import {
  AI_CONFIG,
  SupportedAIProvider,
  VERIFIED_AI_MODELS,
} from '../../config/ai.config';
import {
  AIGenerationOptions,
  AIGenerationResult,
  AIVisionOptions,
  AIFallbackExhaustedError,
  AIProviderError,
  IAIService,
} from './interfaces/IAIService';
import { openAIService } from './providers/OpenAIService';
import { claudeService } from './providers/ClaudeService';
import { geminiService } from './providers/GeminiService';
import { groqService } from './providers/GroqService';

export class AIFactory {
  private readonly providers: Record<SupportedAIProvider, IAIService> = {
    gemini: geminiService,
    openai: openAIService,
    groq: groqService,
    anthropic: claudeService,
  };

  /**
   * Resolves a specific AI provider service instance, or returns the system default.
   */
  public getProvider(providerName?: SupportedAIProvider): IAIService {
    const target = providerName || AI_CONFIG.defaultProvider;
    const service = this.providers[target];

    if (!service) {
      throw new AIProviderError({
        provider: target,
        code: 'UNSUPPORTED_PROVIDER',
        message: `Provider "${target}" is not supported. Available: ${Object.keys(this.providers).join(', ')}`,
      });
    }

    return service;
  }

  /**
   * Returns a list of all providers that currently have configured API keys.
   */
  public getAvailableProviders(): SupportedAIProvider[] {
    return (Object.keys(this.providers) as SupportedAIProvider[]).filter((provider) =>
      this.providers[provider].isAvailable()
    );
  }

  /**
   * Returns list of configured providers that support multimodal vision analysis.
   */
  public getAvailableVisionProviders(): SupportedAIProvider[] {
    // Groq models currently do not support vision; OpenAI, Gemini, Claude Sonnet do.
    const visionCapable: SupportedAIProvider[] = ['gemini', 'openai', 'anthropic'];
    return visionCapable.filter((provider) => this.providers[provider]?.isAvailable());
  }

  /**
   * Generates text content using the requested provider, with automatic cascading fallback.
   */
  public async generateText(options: AIGenerationOptions): Promise<AIGenerationResult> {
    const primaryProvider = options.provider || AI_CONFIG.defaultProvider;

    // If fallback is explicitly disabled, run directly on primary
    if (options.allowFallback === false) {
      const service = this.getProvider(primaryProvider);
      return await service.generateText(options);
    }

    // Build the ordered fallback execution list
    const configuredChain = options.fallbackChain || AI_CONFIG.fallbackChain;
    const prioritizedChain: SupportedAIProvider[] = [
      primaryProvider,
      ...configuredChain.filter((p) => p !== primaryProvider),
    ];

    const available = this.getAvailableProviders();
    // Prioritize providers that have API keys configured
    const executionOrder: SupportedAIProvider[] = [
      ...prioritizedChain.filter((p) => available.includes(p)),
      ...prioritizedChain.filter((p) => !available.includes(p)),
    ];

    // Remove duplicates
    const uniqueExecutionOrder = Array.from(new Set(executionOrder));

    const attempts: Array<{ provider: SupportedAIProvider; error: string }> = [];

    for (const currentProvider of uniqueExecutionOrder) {
      const service = this.getProvider(currentProvider);

      if (!service.isAvailable()) {
        attempts.push({
          provider: currentProvider,
          error: `API key for provider "${currentProvider}" is not configured in environment.`,
        });
        continue;
      }

      try {
        // If current provider is the primary, keep user-requested modelId (if any).
        // Otherwise, allow the fallback provider to use its default verified model.
        const providerModel = currentProvider === primaryProvider ? options.modelId : undefined;

        const result = await service.generateText({
          ...options,
          modelId: providerModel,
        });

        const usedFallback = currentProvider !== primaryProvider;

        return {
          ...result,
          usedFallback,
          originalProvider: usedFallback ? primaryProvider : undefined,
          attemptedProviders: attempts.map((a) => a.provider),
        };
      } catch (error: any) {
        const errorMsg = error instanceof AIProviderError ? error.message : error?.message || 'Unknown error';
        console.warn(
          `[AIFactory] Provider "${currentProvider}" failed for text generation: ${errorMsg}. Falling back to next available provider...`
        );
        attempts.push({
          provider: currentProvider,
          error: errorMsg,
        });
      }
    }

    // If all providers failed, throw composite fallback exhausted error
    throw new AIFallbackExhaustedError(attempts);
  }

  /**
   * Analyzes image content using a vision-capable provider, with automatic cascading fallback.
   */
  public async generateVision(options: AIVisionOptions): Promise<AIGenerationResult> {
    const rawPrimary = options.provider || AI_CONFIG.defaultProvider;
    // If primary does not support vision (e.g. Groq), substitute with Gemini or OpenAI
    const primaryProvider: SupportedAIProvider =
      rawPrimary === 'groq' ? 'gemini' : rawPrimary;

    if (options.allowFallback === false) {
      const service = this.getProvider(primaryProvider);
      return await service.generateVision(options);
    }

    const configuredChain = options.fallbackChain || ['gemini', 'openai', 'anthropic'];
    // Filter out text-only providers like Groq
    const visionChain = configuredChain.filter((p) => p !== 'groq');

    const prioritizedChain: SupportedAIProvider[] = [
      primaryProvider,
      ...visionChain.filter((p) => p !== primaryProvider),
    ];

    const availableVision = this.getAvailableVisionProviders();
    const executionOrder = Array.from(
      new Set([
        ...prioritizedChain.filter((p) => availableVision.includes(p)),
        ...prioritizedChain.filter((p) => !availableVision.includes(p)),
      ])
    );

    const attempts: Array<{ provider: SupportedAIProvider; error: string }> = [];

    for (const currentProvider of executionOrder) {
      const service = this.getProvider(currentProvider);

      if (!service.isAvailable()) {
        attempts.push({
          provider: currentProvider,
          error: `API key for vision provider "${currentProvider}" is not configured.`,
        });
        continue;
      }

      try {
        const providerModel = currentProvider === primaryProvider ? options.modelId : undefined;

        const result = await service.generateVision({
          ...options,
          modelId: providerModel,
        });

        const usedFallback = currentProvider !== rawPrimary;

        return {
          ...result,
          usedFallback,
          originalProvider: usedFallback ? rawPrimary : undefined,
          attemptedProviders: attempts.map((a) => a.provider),
        };
      } catch (error: any) {
        const errorMsg = error instanceof AIProviderError ? error.message : error?.message || 'Unknown error';
        console.warn(
          `[AIFactory] Vision provider "${currentProvider}" failed: ${errorMsg}. Falling back to next available vision provider...`
        );
        attempts.push({
          provider: currentProvider,
          error: errorMsg,
        });
      }
    }

    throw new AIFallbackExhaustedError(attempts);
  }
}

export const aiFactory = new AIFactory();
