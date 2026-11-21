import { Request, Response } from 'express';
import {
  evaluateQualitySchema,
  refineCaptionSchema,
  saveBrandVoiceSchema,
  submitFeedbackSchema,
} from '../validators/brandVoice.validator';
import { brandVoiceService } from '../services/ai/BrandVoiceService';

export class BrandVoiceController {
  /**
   * POST /api/ai/instagram/brand-voice
   * Saves or updates a brand's voice guidelines, tone, vocabulary, and preferences.
   */
  public async saveBrandVoice(req: Request, res: Response): Promise<Response> {
    try {
      const validation = saveBrandVoiceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for brand voice configuration.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const profile = await brandVoiceService.saveBrandVoice(validation.data);
      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      console.error('[BrandVoiceController.saveBrandVoice Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to save brand voice configuration.',
      });
    }
  }

  /**
   * GET /api/ai/instagram/brand-voice/:identifier
   * Retrieves a saved brand voice profile by clientId or brand name.
   */
  public async getBrandVoice(req: Request, res: Response): Promise<Response> {
    try {
      const identifier = req.params.identifier || (req.query.identifier as string);
      if (!identifier) {
        return res.status(400).json({
          success: false,
          error: 'Brand identifier or clientId is required.',
        });
      }

      const profile = await brandVoiceService.getBrandVoice(identifier);
      if (!profile) {
        return res.status(404).json({
          success: false,
          error: `Brand voice profile for "${identifier}" not found.`,
        });
      }

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      console.error('[BrandVoiceController.getBrandVoice Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve brand voice profile.',
      });
    }
  }

  /**
   * POST /api/ai/instagram/refine
   * Rewrites an existing caption in conversational, natural English adhering to brand voice.
   */
  public async refineCaption(req: Request, res: Response): Promise<Response> {
    try {
      const validation = refineCaptionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for caption refinement request.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const result = await brandVoiceService.refineCaption(validation.data);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[BrandVoiceController.refineCaption Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to refine caption.',
      });
    }
  }

  /**
   * POST /api/ai/instagram/evaluate
   * Evaluates caption quality across 6 professional copywriting criteria.
   */
  public async evaluateQuality(req: Request, res: Response): Promise<Response> {
    try {
      const validation = evaluateQualitySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for quality evaluation request.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const evaluation = await brandVoiceService.evaluateContentQuality(validation.data);
      return res.status(200).json({
        success: true,
        data: evaluation,
      });
    } catch (error: any) {
      console.error('[BrandVoiceController.evaluateQuality Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to evaluate content quality.',
      });
    }
  }

  /**
   * POST /api/ai/instagram/feedback
   * Collects human ratings (1-5 stars) and feedback on generated content.
   */
  public submitFeedback(req: Request, res: Response): Response {
    try {
      const validation = submitFeedbackSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for feedback submission.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const stored = brandVoiceService.submitUserFeedback(validation.data);
      return res.status(200).json({
        success: true,
        data: stored,
      });
    } catch (error: any) {
      console.error('[BrandVoiceController.submitFeedback Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to submit feedback.',
      });
    }
  }

  /**
   * GET /api/ai/instagram/feedback
   * Returns all submitted user ratings and feedback logs.
   */
  public getFeedbackLogs(req: Request, res: Response): Response {
    const logs = brandVoiceService.getFeedbackLogs();
    return res.status(200).json({
      success: true,
      data: logs,
    });
  }
}

export const brandVoiceController = new BrandVoiceController();
