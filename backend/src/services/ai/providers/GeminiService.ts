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

export class GeminiService implements IAIService {
  public readonly provider: SupportedAIProvider = 'gemini';
  public readonly defaultModel: string = DEFAULT_PROVIDER_MODELS.gemini;

  private client: any = null;

  private async getClient(): Promise<any> {
    const apiKey = AI_CONFIG.keys.gemini;
    if (!apiKey) {
      throw new AIProviderError({
        provider: this.provider,
        code: 'MISSING_API_KEY',
        message: 'Google Gemini API key is missing. Please set GEMINI_API_KEY in your environment.',
      });
    }

    if (!this.client) {
      // Dynamic import to support ESM-only @google/genai package in Node16 CJS
      const { GoogleGenAI: GenAIClass } = await import('@google/genai');
      this.client = new GenAIClass({
        apiKey,
      });
    }

    return this.client;
  }

  public isAvailable(): boolean {
    return Boolean(AI_CONFIG.keys.gemini && AI_CONFIG.keys.gemini.trim().length > 0);
  }

  public async generateText(options: AIGenerationOptions): Promise<AIGenerationResult> {
    const startTime = Date.now();
    const model = options.modelId || this.defaultModel;
    const timeoutMs = options.timeoutMs || AI_CONFIG.timeoutMs;
    const client = await this.getClient();

    try {
      const config: any = {};
      if (options.systemPrompt && options.systemPrompt.trim().length > 0) {
        config.systemInstruction = options.systemPrompt.trim();
      }
      if (options.temperature !== undefined) {
        config.temperature = options.temperature;
      }
      if (options.maxTokens !== undefined) {
        config.maxOutputTokens = options.maxTokens;
      }

      const requestPromise: Promise<any> = client.models.generateContent({
        model,
        contents: options.prompt,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      const response: any = await withTimeout<any>(requestPromise, timeoutMs, this.provider, 'Gemini Text Generation');

      const rawText = (response?.text || '').trim();
      const inputTokens = response?.usageMetadata?.promptTokenCount || 0;
      const outputTokens = response?.usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = response?.usageMetadata?.totalTokenCount || (inputTokens + outputTokens);
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
      const message = error.message || 'Unknown error occurred while generating text with Google Gemini';

      throw new AIProviderError({
        provider: this.provider,
        code: error.code || 'GEMINI_REQUEST_FAILED',
        statusCode,
        message,
        originalError: error,
      });
    }
  }

  public async generateVision(options: AIVisionOptions): Promise<AIGenerationResult> {
    const startTime = Date.now();
    const model = options.modelId || this.defaultModel;
    const timeoutMs = options.timeoutMs || AI_CONFIG.timeoutMs;
    const client = await this.getClient();

    try {
      let cleanBase64 = options.imageBase64;
      if (cleanBase64.includes('base64,')) {
        cleanBase64 = cleanBase64.split('base64,')[1];
      }

      const mimeType = options.mimeType || 'image/jpeg';

      const config: any = {};
      if (options.systemPrompt && options.systemPrompt.trim().length > 0) {
        config.systemInstruction = options.systemPrompt.trim();
      }
      if (options.temperature !== undefined) {
        config.temperature = options.temperature;
      }
      if (options.maxTokens !== undefined) {
        config.maxOutputTokens = options.maxTokens;
      }

      const contents: any[] = [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
        {
          text: options.prompt,
        },
      ];

      const requestPromise: Promise<any> = client.models.generateContent({
        model,
        contents,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      const response: any = await withTimeout<any>(requestPromise, timeoutMs, this.provider, 'Gemini Vision Analysis');

      const rawText = (response?.text || '').trim();
      const inputTokens = response?.usageMetadata?.promptTokenCount || 0;
      const outputTokens = response?.usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = response?.usageMetadata?.totalTokenCount || (inputTokens + outputTokens);
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
      const message = error.message || 'Unknown error occurred during Google Gemini vision analysis';

      throw new AIProviderError({
        provider: this.provider,
        code: error.code || 'GEMINI_VISION_FAILED',
        statusCode,
        message,
        originalError: error,
      });
    }
  }
}

export const geminiService = new GeminiService();
