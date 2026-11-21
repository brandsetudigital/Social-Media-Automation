import { z } from 'zod';

export const compareProvidersSchema = z.object({
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
  ctaType: z
    .enum(['comment', 'save', 'share', 'link_in_bio', 'dm', 'general'])
    .default('general'),
  providers: z
    .array(z.enum(['gemini', 'openai', 'groq', 'anthropic']))
    .optional(),
  timeoutMs: z.number().int().min(5000).max(60000).default(30000),
});

export type CompareProvidersInput = z.infer<typeof compareProvidersSchema>;
