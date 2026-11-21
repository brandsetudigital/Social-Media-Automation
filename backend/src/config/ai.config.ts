import dotenv from 'dotenv';
dotenv.config();

export type SupportedAIProvider = 'openai' | 'anthropic' | 'gemini' | 'groq';

export interface ModelPricing {
  inputPer1MTokensUSD: number;
  outputPer1MTokensUSD: number;
}

export interface ModelMetadata {
  id: string;
  provider: SupportedAIProvider;
  displayName: string;
  supportsVision: boolean;
  contextWindow: number;
  pricing: ModelPricing;
}

/**
 * Official and verified current production model IDs from:
 * - OpenAI (platform.openai.com/docs/models)
 * - Anthropic (docs.anthropic.com/en/docs/models-overview)
 * - Google Gemini (ai.google.dev/gemini-api/docs/models)
 * - Groq (console.groq.com/docs/models)
 */
export const VERIFIED_AI_MODELS: Record<string, ModelMetadata> = {
  // OpenAI Models
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    displayName: 'GPT-4o Mini (Fast & Cost-Efficient)',
    supportsVision: true,
    contextWindow: 128000,
    pricing: { inputPer1MTokensUSD: 0.15, outputPer1MTokensUSD: 0.60 },
  },
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    displayName: 'GPT-4o (High-Intelligence Flagship)',
    supportsVision: true,
    contextWindow: 128000,
    pricing: { inputPer1MTokensUSD: 2.50, outputPer1MTokensUSD: 10.00 },
  },

  // Anthropic Claude Models
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    displayName: 'Claude 3.5 Haiku (Lightning Fast & Conversational)',
    supportsVision: false,
    contextWindow: 200000,
    pricing: { inputPer1MTokensUSD: 0.80, outputPer1MTokensUSD: 4.00 },
  },
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    displayName: 'Claude 3.5 Sonnet (Nuanced Creative Copywriting)',
    supportsVision: true,
    contextWindow: 200000,
    pricing: { inputPer1MTokensUSD: 3.00, outputPer1MTokensUSD: 15.00 },
  },

  // Google Gemini Models
  'gemini-3.5-flash': {
    id: 'gemini-3.5-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.5 Flash (Ultra Fast Multimodal)',
    supportsVision: true,
    contextWindow: 1000000,
    pricing: { inputPer1MTokensUSD: 0.15, outputPer1MTokensUSD: 0.60 },
  },
  'gemini-3.5-flash-lite': {
    id: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    displayName: 'Gemini 3.5 Flash Lite (Sub-Second Ultra Fast)',
    supportsVision: true,
    contextWindow: 1000000,
    pricing: { inputPer1MTokensUSD: 0.075, outputPer1MTokensUSD: 0.30 },
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    provider: 'gemini',
    displayName: 'Gemini 2.5 Flash',
    supportsVision: true,
    contextWindow: 1000000,
    pricing: { inputPer1MTokensUSD: 0.15, outputPer1MTokensUSD: 0.60 },
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    provider: 'gemini',
    displayName: 'Gemini 2.5 Pro (Deep Complex Multimodal Reasoning)',
    supportsVision: true,
    contextWindow: 2000000,
    pricing: { inputPer1MTokensUSD: 1.25, outputPer1MTokensUSD: 5.00 },
  },

  // Groq Accelerated Open Models
  'llama-3.3-70b-versatile': {
    id: 'llama-3.3-70b-versatile',
    provider: 'groq',
    displayName: 'Llama 3.3 70B (High-Speed Open Source on Groq)',
    supportsVision: false,
    contextWindow: 128000,
    pricing: { inputPer1MTokensUSD: 0.59, outputPer1MTokensUSD: 0.79 },
  },
  'llama-3.1-8b-instant': {
    id: 'llama-3.1-8b-instant',
    provider: 'groq',
    displayName: 'Llama 3.1 8B (Sub-Second Ultra Fast on Groq)',
    supportsVision: false,
    contextWindow: 128000,
    pricing: { inputPer1MTokensUSD: 0.05, outputPer1MTokensUSD: 0.08 },
  },
};

export const DEFAULT_PROVIDER_MODELS: Record<SupportedAIProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  gemini: 'gemini-3.5-flash-lite',
  groq: 'llama-3.3-70b-versatile',
};

export const AI_CONFIG = {
  defaultProvider: (process.env.DEFAULT_AI_PROVIDER || 'gemini') as SupportedAIProvider,
  defaultModel: process.env.DEFAULT_AI_MODEL || 'gemini-3.5-flash-lite',
  timeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '15000', 10),
  fallbackChain: ['gemini', 'openai', 'groq', 'anthropic'] as SupportedAIProvider[],
  keys: {
    openai: process.env.OPENAI_API_KEY || '',
    anthropic: process.env.ANTHROPIC_API_KEY || '',
    gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
    groq: process.env.GROQ_API_KEY || '',
  },
};

/**
 * Calculates estimated API cost in USD given model and token usage
 */
export function estimateApiCostUSD(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = VERIFIED_AI_MODELS[modelId];
  if (!model) return 0;
  const inputCost = (inputTokens / 1_000_000) * model.pricing.inputPer1MTokensUSD;
  const outputCost = (outputTokens / 1_000_000) * model.pricing.outputPer1MTokensUSD;
  return Number((inputCost + outputCost).toFixed(6));
}

/**
 * Checks provider key availability
 */
export function isProviderConfigured(provider: SupportedAIProvider): boolean {
  return Boolean(AI_CONFIG.keys[provider] && AI_CONFIG.keys[provider].trim().length > 0);
}
