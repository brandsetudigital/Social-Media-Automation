import { z } from 'zod';

export const getHistoryQuerySchema = z.object({
  clientId: z.string().optional(),
  contentType: z
    .enum(['CAPTION', 'HASHTAGS', 'IDEAS', 'VISION', 'REFINED', 'ALL'])
    .optional(),
  provider: z.enum(['gemini', 'openai', 'groq', 'anthropic', 'ALL']).optional(),
  status: z
    .enum(['DRAFT', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED', 'ALL'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GetHistoryQueryInput = z.infer<typeof getHistoryQuerySchema>;

export const updateContentStatusSchema = z.object({
  status: z.enum(['DRAFT', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']),
});

export type UpdateContentStatusInput = z.infer<typeof updateContentStatusSchema>;

export const saveGeneratedContentSchema = z.object({
  clientId: z.string().optional(),
  topic: z.string().min(1),
  contentType: z.enum(['CAPTION', 'HASHTAGS', 'IDEAS', 'VISION', 'REFINED']),
  provider: z.string(),
  modelId: z.string(),
  hook: z.string().optional(),
  caption: z.string(),
  callToAction: z.string().optional(),
  hashtags: z.string().optional(),
  variationsJson: z.string().optional(),
  visualElements: z.string().optional(),
  inputTokens: z.number().int().default(0),
  outputTokens: z.number().int().default(0),
  totalTokens: z.number().int().default(0),
  latencyMs: z.number().int().default(0),
  costUSD: z.number().default(0.0),
  usedFallback: z.boolean().default(false),
  status: z.enum(['DRAFT', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

export type SaveGeneratedContentInput = z.infer<typeof saveGeneratedContentSchema>;
