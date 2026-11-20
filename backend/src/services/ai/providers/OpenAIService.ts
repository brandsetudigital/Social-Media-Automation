import OpenAI from 'openai';
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

export class OpenAIService implements IAIService {
  public readonly provider: SupportedAIProvider = 'openai';
  public readonly defaultModel: string = DEFAULT_PROVIDER_MODELS.openai;

  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    const apiKey = AI_CONFIG.keys.openai;
    if (!apiKey) {
      throw new AIProviderError({
        provider: this.provider,
        code: 'MISSING_API_KEY',
        message: 'OpenAI API key is missing. Please set OPENAI_API_KEY in your environment.',
      });
    }

    if (!this.client) {
      this.client = new OpenAI({
        apiKey,
      });
    }

    return this.client;
  }

  public isAvailable(): boolean {
    return Boolean(AI_CONFIG.keys.openai && AI_CONFIG.keys.openai.trim().length > 0);
  }

  public async generateText(options: AIGenerationOptions): Promise<AIGenerationResult> {
    const startTime = Date.now();
    const model = options.modelId || this.defaultModel;
    const timeoutMs = options.timeoutMs || AI_CONFIG.timeoutMs;
    const client = this.getClient();

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      if (options.systemPrompt && options.systemPrompt.trim().length > 0) {
        messages.push({
          role: 'system',
          content: options.systemPrompt.trim(),
        });
      }

      messages.push({
        role: 'user',
        content: options.prompt,
      });

      const requestPromise = client.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
      });

      const completion = await withTimeout(requestPromise, timeoutMs, this.provider, 'OpenAI Text Generation');

      const rawText = completion.choices[0]?.message?.content?.trim() || '';
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;
      const totalTokens = completion.usage?.total_tokens || (inputTokens + outputTokens);
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
      const message = error.message || 'Unknown error occurred while generating text with OpenAI';

      throw new AIProviderError({
        provider: this.provider,
        code: error.code || 'OPENAI_REQUEST_FAILED',
        statusCode,
        message,
        originalError: error,
      });
    }
  }

  public async generateVision(options: AIVisionOptions): Promise<AIGenerationResult> {
    const startTime = Date.now();
    // Default to gpt-4o-mini if a non-vision model is supplied
    const model = options.modelId || 'gpt-4o-mini';
    const timeoutMs = options.timeoutMs || AI_CONFIG.timeoutMs;
    const client = this.getClient();

    try {
      const mimeType = options.mimeType || 'image/jpeg';
      let cleanBase64 = options.imageBase64;
      if (cleanBase64.includes('base64,')) {
        cleanBase64 = cleanBase64.split('base64,')[1];
      }

      const dataUrl = `data:${mimeType};base64,${cleanBase64}`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      if (options.systemPrompt && options.systemPrompt.trim().length > 0) {
        messages.push({
          role: 'system',
          content: options.systemPrompt.trim(),
        });
      }

      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: options.prompt },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
              detail: 'auto',
            },
          },
        ],
      });

      const requestPromise = client.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
      });

      const completion = await withTimeout(requestPromise, timeoutMs, this.provider, 'OpenAI Vision Analysis');

      const rawText = completion.choices[0]?.message?.content?.trim() || '';
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;
      const totalTokens = completion.usage?.total_tokens || (inputTokens + outputTokens);
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
      const message = error.message || 'Unknown error occurred during OpenAI vision analysis';

      throw new AIProviderError({
        provider: this.provider,
        code: error.code || 'OPENAI_VISION_FAILED',
        statusCode,
        message,
        originalError: error,
      });
    }
  }
}

export const openAIService = new OpenAIService();
