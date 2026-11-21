import { z } from 'zod';

export const generateVisionCaptionSchema = z.object({
  clientId: z.string().optional(),
  imageBase64: z.string().optional(),
  imageUrl: z.string().optional(),
  contextHint: z.string().max(500, 'Context hint cannot exceed 500 characters').optional(),
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
  provider: z.enum(['gemini', 'openai', 'anthropic']).optional(),
  modelId: z.string().optional(),
});

export type GenerateVisionCaptionInput = z.infer<typeof generateVisionCaptionSchema>;
