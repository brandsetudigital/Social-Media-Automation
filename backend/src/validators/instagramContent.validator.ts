import { z } from 'zod';

export const generateCaptionsSchema = z.object({
  topic: z
    .string()
    .min(3, 'Topic must be at least 3 characters long')
    .max(1000, 'Topic cannot exceed 1000 characters'),
  brandName: z.string().optional(),
  targetAudience: z.string().optional(),
  tone: z
    .enum([
      'friendly',
      'professional',
      'humorous',
      'bold',
      'minimalist',
      'inspirational',
      'storyteller',
    ])
    .default('friendly'),
  postPurpose: z
    .enum([
      'product',
      'service',
      'educational',
      'festival',
      'brand',
      'promotional',
      'general',
    ])
    .optional(),
  ctaType: z
    .enum(['comment', 'save', 'share', 'link_in_bio', 'dm', 'general'])
    .default('general'),
  keywords: z.array(z.string()).optional(),
  provider: z.enum(['gemini', 'openai', 'groq', 'anthropic']).optional(),
  modelId: z.string().optional(),
});

export type GenerateCaptionsInput = z.infer<typeof generateCaptionsSchema>;

export const generateHashtagsSchema = z.object({
  topic: z
    .string()
    .min(3, 'Topic must be at least 3 characters long'),
  brandNiche: z.string().optional(),
  count: z
    .number()
    .int()
    .min(5, 'Count must be at least 5')
    .max(30, 'Count cannot exceed 30')
    .default(15),
  provider: z.enum(['gemini', 'openai', 'groq', 'anthropic']).optional(),
  modelId: z.string().optional(),
});

export type GenerateHashtagsInput = z.infer<typeof generateHashtagsSchema>;

export const generateIdeasSchema = z.object({
  topic: z
    .string()
    .min(3, 'Topic must be at least 3 characters long'),
  brandName: z.string().optional(),
  targetAudience: z.string().optional(),
  format: z.enum(['all', 'post', 'carousel', 'reel']).default('all'),
  count: z
    .number()
    .int()
    .min(1, 'Count must be at least 1')
    .max(10, 'Count cannot exceed 10')
    .default(5),
  provider: z.enum(['gemini', 'openai', 'groq', 'anthropic']).optional(),
  modelId: z.string().optional(),
});

export type GenerateIdeasInput = z.infer<typeof generateIdeasSchema>;
