import Groq from 'groq-sdk';
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

export class GroqService implements IAIService {
  public readonly provider: SupportedAIProvider = 'groq';
  public readonly defaultModel: string = DEFAULT_PROVIDER_MODELS.groq;

  private client: Groq | null = null;

  private getClient(): Groq {
    const apiKey = AI_CONFIG.keys.groq;
    if (!apiKey) {
      throw new AIProviderError({
        provider: this.provider,
        code: 'MISSING_API_KEY',
        message: 'Groq API key is missing. Please set GROQ_API_KEY in your environment.',
      });
    }

    if (!this.client) {
      this.client = new Groq({
        apiKey,
      });
    }

    return this.client;
  }

  public isAvailable(): boolean {
    return Boolean(AI_CONFIG.keys.groq && AI_CONFIG.keys.groq.trim().length > 0);
  }

  public async generateText(options: AIGenerationOptions): Promise<AIGenerationResult> {
    const startTime = Date.now();
    const model = options.modelId || this.defaultModel;
    const timeoutMs = options.timeoutMs || AI_CONFIG.timeoutMs;
    const client = this.getClient();

    try {
      const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];

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

      const completion = await withTimeout(requestPromise, timeoutMs, this.provider, 'Groq Text Generation');

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
      const message = error.message || 'Unknown error occurred while generating text with Groq';

      throw new AIProviderError({
        provider: this.provider,
        code: error.code || 'GROQ_REQUEST_FAILED',
        statusCode,
        message,
        originalError: error,
      });
    }
  }

  public async generateVision(options: AIVisionOptions): Promise<AIGenerationResult> {
    throw new AIProviderError({
      provider: this.provider,
      code: 'VISION_NOT_SUPPORTED',
      message:
        'Image-based vision analysis is not supported by Groq text models (e.g. Llama 3.3). Please select Google Gemini, OpenAI, or Anthropic Claude for vision analysis.',
    });
  }
}

export const groqService = new GroqService();
