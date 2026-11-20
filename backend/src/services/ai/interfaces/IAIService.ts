import { SupportedAIProvider } from '../../../config/ai.config';

export interface AIGenerationOptions {
  prompt: string;
  systemPrompt?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AIVisionOptions {
  prompt: string;
  systemPrompt?: string;
  imageBase64: string;
  mimeType?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AIGenerationResult {
  provider: SupportedAIProvider;
  modelId: string;
  rawText: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  costUSD: number;
}

export class AIProviderError extends Error {
  public readonly provider: SupportedAIProvider;
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly isTimeout: boolean;
  public readonly originalError?: unknown;

  constructor(options: {
    message: string;
    provider: SupportedAIProvider;
    code?: string;
    statusCode?: number;
    isTimeout?: boolean;
    originalError?: unknown;
  }) {
    super(options.message);
    this.name = 'AIProviderError';
    this.provider = options.provider;
    this.code = options.code || 'AI_PROVIDER_ERROR';
    this.statusCode = options.statusCode;
    this.isTimeout = options.isTimeout ?? false;
    this.originalError = options.originalError;
    Object.setPrototypeOf(this, AIProviderError.prototype);
  }
}

export interface IAIService {
  readonly provider: SupportedAIProvider;
  readonly defaultModel: string;

  isAvailable(): boolean;
  generateText(options: AIGenerationOptions): Promise<AIGenerationResult>;
  generateVision(options: AIVisionOptions): Promise<AIGenerationResult>;
}
