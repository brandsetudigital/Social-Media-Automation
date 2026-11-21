import { Request, Response } from 'express';
import {
  generateCaptionsSchema,
  generateHashtagsSchema,
  generateIdeasSchema,
} from '../validators/instagramContent.validator';
import { instagramContentService } from '../services/ai/InstagramContentService';

export class InstagramContentController {
  /**
   * POST /api/ai/instagram/captions
   * Generates 3 distinct caption variations (Story, Punchy, Educational)
   */
  public async generateCaptions(req: Request, res: Response): Promise<Response> {
    try {
      const validation = generateCaptionsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for caption generation request.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const result = await instagramContentService.generateCaptions(validation.data);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[InstagramContentController.generateCaptions Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate Instagram captions.',
      });
    }
  }

  /**
   * POST /api/ai/instagram/hashtags
   * Generates 5-15 categorized hashtags (niche, audience, topic)
   */
  public async generateHashtags(req: Request, res: Response): Promise<Response> {
    try {
      const validation = generateHashtagsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for hashtag generation request.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const result = await instagramContentService.generateHashtags(validation.data);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[InstagramContentController.generateHashtags Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate Instagram hashtags.',
      });
    }
  }

  /**
   * POST /api/ai/instagram/ideas
   * Generates creative Instagram content ideas (posts, carousels, reels)
   */
  public async generateIdeas(req: Request, res: Response): Promise<Response> {
    try {
      const validation = generateIdeasSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for content ideas request.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const result = await instagramContentService.generateContentIdeas(validation.data);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[InstagramContentController.generateIdeas Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate Instagram content ideas.',
      });
    }
  }
}

export const instagramContentController = new InstagramContentController();
