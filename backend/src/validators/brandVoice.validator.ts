import { z } from 'zod';

export const saveBrandVoiceSchema = z.object({
  clientId: z.string().optional(),
  brandName: z.string().min(2, 'Brand name must be at least 2 characters'),
  industry: z.string().min(2, 'Industry must be at least 2 characters'),
  targetAudience: z.string().min(3, 'Target audience description required'),
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
  preferredVocabulary: z.array(z.string()).optional().default([]),
  wordsToAvoid: z.array(z.string()).optional().default([]),
  emojiPreference: z.enum(['none', 'minimal', 'expressive']).default('minimal'),
  ctaStyle: z
    .enum(['comment', 'save', 'share', 'link_in_bio', 'dm', 'general'])
    .default('general'),
  captionLength: z.enum(['short', 'medium', 'long']).default('medium'),
});

export type SaveBrandVoiceInput = z.infer<typeof saveBrandVoiceSchema>;

export const refineCaptionSchema = z.object({
  caption: z.string().min(5, 'Caption must be at least 5 characters long'),
  clientId: z.string().optional(),
  instruction: z.string().optional(),
  brandName: z.string().optional(),
  industry: z.string().optional(),
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
    .optional(),
  preferredVocabulary: z.array(z.string()).optional(),
  wordsToAvoid: z.array(z.string()).optional(),
  ctaStyle: z
    .enum(['comment', 'save', 'share', 'link_in_bio', 'dm', 'general'])
    .optional(),
  provider: z.enum(['gemini', 'openai', 'groq', 'anthropic']).optional(),
  modelId: z.string().optional(),
});

export type RefineCaptionInput = z.infer<typeof refineCaptionSchema>;

export const evaluateQualitySchema = z.object({
  caption: z.string().min(5, 'Caption must be at least 5 characters long'),
  topic: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  brandName: z.string().optional(),
  targetAudience: z.string().optional(),
  tone: z.string().optional(),
  provider: z.enum(['gemini', 'openai', 'groq', 'anthropic']).optional(),
  modelId: z.string().optional(),
});

export type EvaluateQualityInput = z.infer<typeof evaluateQualitySchema>;

export const submitFeedbackSchema = z.object({
  caption: z.string().min(3, 'Caption is required for feedback submission'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5 stars'),
  feedbackNotes: z.string().optional(),
  likedAspects: z.array(z.string()).optional(),
  dislikedAspects: z.array(z.string()).optional(),
  provider: z.string().optional(),
  modelId: z.string().optional(),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
