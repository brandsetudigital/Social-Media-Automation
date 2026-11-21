import { z } from 'zod';

export const connectInstagramAccountSchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  accountId: z
    .string()
    .min(1, 'Instagram Account ID is required'),
  accessToken: z.string().min(1, 'Access Token is required'),
  accountName: z.string().optional(),
});

export type ConnectInstagramAccountInput = z.infer<typeof connectInstagramAccountSchema>;

export const publishInstagramImageSchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  accountId: z.string().optional(),
  imageUrl: z.string().min(1, 'imageUrl is required'),
  caption: z.string().min(1, 'caption is required'),
  firstComment: z.string().optional(),
  isApproved: z.boolean().default(true),
  accessToken: z.string().optional(),
});

export type PublishInstagramImageInput = z.infer<typeof publishInstagramImageSchema>;

export const publishInstagramReelSchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  accountId: z.string().optional(),
  videoUrl: z.string().min(1, 'videoUrl is required'),
  caption: z.string().min(1, 'caption is required'),
  coverUrl: z.string().optional(),
  shareToFeed: z.boolean().default(true),
  firstComment: z.string().optional(),
  isApproved: z.boolean().default(true),
  accessToken: z.string().optional(),
});

export type PublishInstagramReelInput = z.infer<typeof publishInstagramReelSchema>;

export const publishInstagramCarouselSchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  accountId: z.string().optional(),
  mediaUrls: z
    .array(z.string().min(1))
    .min(2, 'Carousel requires at least 2 media items')
    .max(10, 'Carousel supports up to 10 media items'),
  caption: z.string().min(1, 'caption is required'),
  firstComment: z.string().optional(),
  isApproved: z.boolean().default(true),
  accessToken: z.string().optional(),
});

export type PublishInstagramCarouselInput = z.infer<typeof publishInstagramCarouselSchema>;

export const scheduleInstagramPostSchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  accountId: z.string().optional(),
  mediaUrl: z.string().min(1, 'mediaUrl is required'),
  caption: z.string().min(1, 'caption is required'),
  contentType: z.enum(['POST', 'REEL', 'CAROUSEL', 'STORY']).default('POST'),
  scheduledAt: z.string().datetime({ message: 'scheduledAt must be a valid ISO 8601 datetime string' }),
  firstComment: z.string().optional(),
  isApproved: z.boolean().default(true),
});

export type ScheduleInstagramPostInput = z.infer<typeof scheduleInstagramPostSchema>;

export const getPublishingHistorySchema = z.object({
  clientId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GetPublishingHistoryInput = z.infer<typeof getPublishingHistorySchema>;
