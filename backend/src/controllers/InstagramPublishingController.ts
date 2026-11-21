import { Request, Response } from 'express';
import {
  connectInstagramAccountSchema,
  publishInstagramImageSchema,
  publishInstagramReelSchema,
  publishInstagramCarouselSchema,
  scheduleInstagramPostSchema,
  getPublishingHistorySchema,
} from '../validators/instagramPublishing.validator';
import { instagramGraphService } from '../services/instagram/InstagramGraphService';

export class InstagramPublishingController {
  /**
   * POST /api/instagram/accounts/connect
   * Connects an Instagram Professional account to a client.
   */
  public async connectAccount(req: Request, res: Response): Promise<Response> {
    try {
      const validation = connectInstagramAccountSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for Instagram account connection.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const account = await instagramGraphService.connectAccount(validation.data);
      return res.status(200).json({
        success: true,
        message: 'Instagram Professional account connected successfully.',
        data: account,
      });
    } catch (error: any) {
      console.error('[InstagramPublishingController.connectAccount Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to connect Instagram account.',
      });
    }
  }

  /**
   * GET /api/instagram/accounts
   * Lists connected Instagram accounts (optional clientId filter).
   */
  public async getAccounts(req: Request, res: Response): Promise<Response> {
    try {
      const clientId = req.query.clientId as string | undefined;
      const accounts = await instagramGraphService.getAccounts(clientId);
      return res.status(200).json({
        success: true,
        data: accounts,
      });
    } catch (error: any) {
      console.error('[InstagramPublishingController.getAccounts Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch Instagram accounts.',
      });
    }
  }

  /**
   * POST /api/instagram/publish/image
   * Publishes a single image post to Instagram Graph API.
   */
  public async publishImage(req: Request, res: Response): Promise<Response> {
    try {
      const validation = publishInstagramImageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for Instagram photo publish.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const result = await instagramGraphService.publishImage(validation.data);
      if (!result.success) {
        const statusCode = result.errorCode === 'APPROVAL_REQUIRED' ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          errorCode: result.errorCode,
          error: result.errorMessage,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Image published to Instagram successfully.',
        data: result,
      });
    } catch (error: any) {
      console.error('[InstagramPublishingController.publishImage Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to publish image to Instagram.',
      });
    }
  }

  /**
   * POST /api/instagram/publish/reel
   * Publishes an Instagram Reel (video) to Instagram Graph API.
   */
  public async publishReel(req: Request, res: Response): Promise<Response> {
    try {
      const validation = publishInstagramReelSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for Instagram Reel publish.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const result = await instagramGraphService.publishReel(validation.data);
      if (!result.success) {
        const statusCode = result.errorCode === 'APPROVAL_REQUIRED' ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          errorCode: result.errorCode,
          error: result.errorMessage,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Reel published to Instagram successfully.',
        data: result,
      });
    } catch (error: any) {
      console.error('[InstagramPublishingController.publishReel Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to publish reel to Instagram.',
      });
    }
  }

  /**
   * POST /api/instagram/publish/carousel
   * Publishes an Instagram Carousel (multi-image/video) to Instagram Graph API.
   */
  public async publishCarousel(req: Request, res: Response): Promise<Response> {
    try {
      const validation = publishInstagramCarouselSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for Instagram Carousel publish.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const result = await instagramGraphService.publishCarousel(validation.data);
      if (!result.success) {
        const statusCode = result.errorCode === 'APPROVAL_REQUIRED' ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          errorCode: result.errorCode,
          error: result.errorMessage,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Carousel published to Instagram successfully.',
        data: result,
      });
    } catch (error: any) {
      console.error('[InstagramPublishingController.publishCarousel Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to publish carousel to Instagram.',
      });
    }
  }

  /**
   * POST /api/instagram/schedule
   * Schedules a post for future publishing.
   */
  public async schedulePost(req: Request, res: Response): Promise<Response> {
    try {
      const validation = scheduleInstagramPostSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for scheduling Instagram post.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const scheduled = await instagramGraphService.schedulePost(validation.data);
      return res.status(201).json({
        success: true,
        message: 'Post scheduled successfully for Instagram.',
        data: scheduled,
      });
    } catch (error: any) {
      console.error('[InstagramPublishingController.schedulePost Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to schedule post.',
      });
    }
  }

  /**
   * GET /api/instagram/status/:creationId
   * Checks container status for asynchronous uploads.
   */
  public async getStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { creationId } = req.params;
      const status = await instagramGraphService.getContainerStatus(creationId);
      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      console.error('[InstagramPublishingController.getStatus Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to check container status.',
      });
    }
  }

  /**
   * GET /api/instagram/history
   * Retrieves publishing history logs for Instagram.
   */
  public async getHistory(req: Request, res: Response): Promise<Response> {
    try {
      const validation = getPublishingHistorySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for publishing history query.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const history = await instagramGraphService.getPublishingHistory(validation.data);
      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      console.error('[InstagramPublishingController.getHistory Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch publishing history.',
      });
    }
  }
}

export const instagramPublishingController = new InstagramPublishingController();
