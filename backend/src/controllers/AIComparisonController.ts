import { Request, Response } from 'express';
import { compareProvidersSchema } from '../validators/aiComparison.validator';
import { aiComparisonService } from '../services/ai/AIComparisonService';

export class AIComparisonController {
  /**
   * POST /api/ai/instagram/compare
   * Simultaneously queries multiple AI providers for side-by-side evaluation
   */
  public async compareProviders(req: Request, res: Response): Promise<Response> {
    try {
      const validation = compareProvidersSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for AI comparison request.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const comparison = await aiComparisonService.compareProviders(validation.data);
      return res.status(200).json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      console.error('[AIComparisonController.compareProviders Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to execute multi-provider AI comparison.',
      });
    }
  }
}

export const aiComparisonController = new AIComparisonController();
