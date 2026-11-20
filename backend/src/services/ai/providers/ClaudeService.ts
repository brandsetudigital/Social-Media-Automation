import Anthropic from '@anthropic-ai/sdk';
import {
  AI_CONFIG,
  DEFAULT_PROVIDER_MODELS,
  estimateApiCostUSD,
  SupportedAIProvider,
} from '../../../config/ai.config';
import {
  AIGenerationOptions,
  AIGenerationResult,
  AIVisionOptions,
  AIProviderError,
  IAIService,
} from '../interfaces/IAIService';
import { withTimeout } from '../utils/aiTimeout';

export class ClaudeService implements IAIService {
  public readonly provider: SupportedAIProvider = 'anthropic';
  public readonly defaultModel: string = DEFAULT_PROVIDER_MODELS.anthropic;

  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    const apiKey = AI_CONFIG.keys.anthropic;
    if (!apiKey) {
      throw new AIProviderError({
        provider: this.provider,
        code: 'MISSING_API_KEY',
        message: 'Anthropic API key is missing. Please set ANTHROPIC_API_KEY in your environment.',
      });
    }

    if (!this.client) {
      this.client = new Anthropic({
        apiKey,
      });
    }

    return this.client;
  }

  public isAvailable(): boolean {
    return Boolean(AI_CONFIG.keys.anthropic && AI_CONFIG.keys.anthropic.trim().length > 0);
  }

  public async generateText(options: AIGenerationOptions): Promise<AIGenerationResult> {
    const startTime = Date.now();
    const model = options.modelId || this.defaultModel;
    const timeoutMs = options.timeoutMs || AI_CONFIG.timeoutMs;
    const client = this.getClient();

    try {
      const requestParams: Anthropic.Messages.MessageCreateParamsNonStreaming = {
        model,
        max_tokens: options.maxTokens ?? 1024,
        system: options.systemPrompt && options.systemPrompt.trim().length > 0 ? options.systemPrompt.trim() : undefined,
        messages: [
          {
            role: 'user',
            content: options.prompt,
          },
        ],
      };

      const requestPromise = client.messages.create(requestParams);

      const response = await withTimeout(requestPromise, timeoutMs, this.provider, 'Claude Text Generation');

      let rawText = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          rawText += block.text;
        }
      }
      rawText = rawText.trim();

      const inputTokens = response.usage.input_tokens || 0;
      const outputTokens = response.usage.output_tokens || 0;
      const totalTokens = inputTokens + outputTokens;
      const latencyMs = Date.now() - startTime;
      const costUSD = estimateApiCostUSD(model, inputTokens, outputTokens);

      return {
        provider: this.provider,
        modelId: model,
        rawText,
        inputTokens,
        outputTokens,
        totalTokens,
        latencyMs,
        costUSD,
      };
    } catch (error: any) {
      if (error instanceof AIProviderError) {
        throw error;
      }

      const statusCode = error.status || error.statusCode;
      const message = error.message || 'Unknown error occurred while generating text with Anthropic Claude';

      throw new AIProviderError({
        provider: this.provider,
        code: error.code || 'CLAUDE_REQUEST_FAILED',
        statusCode,
        message,
        originalError: error,
      });
    }
  }

  public async generateVision(options: AIVisionOptions): Promise<AIGenerationResult> {
    const startTime = Date.now();
    // Claude 3.5 Haiku is text-only; default vision to Claude 3.5 Sonnet
    const model = options.modelId && options.modelId.includes('sonnet')
      ? options.modelId
      : 'claude-3-5-sonnet-20241022';

    const timeoutMs = options.timeoutMs || AI_CONFIG.timeoutMs;
    const client = this.getClient();

    try {
      let cleanBase64 = options.imageBase64;
      if (cleanBase64.includes('base64,')) {
        cleanBase64 = cleanBase64.split('base64,')[1];
      }

      let mimeType = options.mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)) {
        mimeType = 'image/jpeg';
      }

      const requestParams: Anthropic.Messages.MessageCreateParamsNonStreaming = {
        model,
        max_tokens: options.maxTokens ?? 1024,
        system: options.systemPrompt && options.systemPrompt.trim().length > 0 ? options.systemPrompt.trim() : undefined,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: cleanBase64,
                },
              },
              {
                type: 'text',
                text: options.prompt,
              },
            ],
          },
        ],
      };

      const requestPromise = client.messages.create(requestParams);

      const response = await withTimeout(requestPromise, timeoutMs, this.provider, 'Claude Vision Analysis');

      let rawText = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          rawText += block.text;
        }
      }
      rawText = rawText.trim();

      const inputTokens = response.usage.input_tokens || 0;
      const outputTokens = response.usage.output_tokens || 0;
      const totalTokens = inputTokens + outputTokens;
      const latencyMs = Date.now() - startTime;
      const costUSD = estimateApiCostUSD(model, inputTokens, outputTokens);

      return {
        provider: this.provider,
        modelId: model,
        rawText,
        inputTokens,
        outputTokens,
        totalTokens,
        latencyMs,
        costUSD,
      };
    } catch (error: any) {
      if (error instanceof AIProviderError) {
        throw error;
      }

      const statusCode = error.status || error.statusCode;
      const message = error.message || 'Unknown error occurred during Anthropic Claude vision analysis';

      throw new AIProviderError({
        provider: this.provider,
        code: error.code || 'CLAUDE_VISION_FAILED',
        statusCode,
        message,
        originalError: error,
      });
    }
  }
}

export const claudeService = new ClaudeService();
