import { Request, Response } from 'express';
import {
  getHistoryQuerySchema,
  updateContentStatusSchema,
} from '../validators/contentHistory.validator';
import { contentHistoryService } from '../services/ai/ContentHistoryService';

export class ContentHistoryController {
  /**
   * GET /api/ai/instagram/history
   * Retrieves paginated content history with optional filters (clientId, contentType, provider, status)
   */
  public async getHistory(req: Request, res: Response): Promise<Response> {
    try {
      const validation = getHistoryQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for history query parameters.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const history = await contentHistoryService.getGeneratedContentHistory(validation.data);
      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      console.error('[ContentHistoryController.getHistory Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve content history.',
      });
    }
  }

  /**
   * GET /api/ai/instagram/history/:id
   * Retrieves single generated content item by ID
   */
  public async getContentById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const content = await contentHistoryService.getContentById(id);
      if (!content) {
        return res.status(404).json({
          success: false,
          error: `Generated content item with ID "${id}" was not found.`,
        });
      }

      return res.status(200).json({
        success: true,
        data: content,
      });
    } catch (error: any) {
      console.error('[ContentHistoryController.getContentById Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve content item.',
      });
    }
  }

  /**
   * PATCH /api/ai/instagram/history/:id/status
   * Updates the workflow status of a content item (DRAFT, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED)
   */
  public async updateStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const validation = updateContentStatusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for status update.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const updated = await contentHistoryService.updateContentStatus(id, validation.data.status);
      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('[ContentHistoryController.updateStatus Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update content status.',
      });
    }
  }

  /**
   * DELETE /api/ai/instagram/history/:id
   * Deletes a content item from history
   */
  public async deleteContent(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      await contentHistoryService.deleteContent(id);
      return res.status(200).json({
        success: true,
        message: `Content item "${id}" deleted successfully.`,
      });
    } catch (error: any) {
      console.error('[ContentHistoryController.deleteContent Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete content item.',
      });
    }
  }

  /**
   * GET /api/ai/instagram/usage-stats
   * Aggregates API tokens, costs, and latencies across all AI providers
   */
  public async getUsageStats(_req: Request, res: Response): Promise<Response> {
    try {
      const stats = await contentHistoryService.getApiUsageStats();
      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('[ContentHistoryController.getUsageStats Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to aggregate API usage stats.',
      });
    }
  }

  /**
   * GET /api/ai/instagram/comparisons
   * Retrieves past multi-provider comparison logs
   */
  public async getComparisonHistory(req: Request, res: Response): Promise<Response> {
    try {
      const limit = Number(req.query.limit) || 20;
      const history = await contentHistoryService.getComparisonHistory(limit);
      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      console.error('[ContentHistoryController.getComparisonHistory Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve comparison history.',
      });
    }
  }
}

export const contentHistoryController = new ContentHistoryController();
