import { Request, Response } from 'express';
import { generateVisionCaptionSchema } from '../validators/visionContent.validator';
import { visionContentService } from '../services/ai/VisionContentService';

export class VisionContentController {
  /**
   * POST /api/ai/instagram/vision/caption
   * Accepts image file upload (multipart/form-data) OR JSON payload (imageBase64 / imageUrl)
   * and generates a grounded Instagram caption with hashtags.
   */
  public async generateImageCaption(req: Request, res: Response): Promise<Response> {
    try {
      const validation = generateVisionCaptionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed for vision caption request.',
          details: validation.error.flatten().fieldErrors,
        });
      }

      const fileBuffer = req.file?.buffer;
      const fileMimeType = req.file?.mimetype;

      // Validate that at least one image source was provided
      if (!fileBuffer && !validation.data.imageBase64 && !validation.data.imageUrl) {
        return res.status(400).json({
          success: false,
          error: 'No image provided. Please upload an image file using form field "image", or provide "imageBase64" or "imageUrl" in the JSON body.',
        });
      }

      const result = await visionContentService.generateCaptionFromImage({
        ...validation.data,
        fileBuffer,
        fileMimeType,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[VisionContentController.generateImageCaption Error]:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate vision-based caption.',
      });
    }
  }
}

export const visionContentController = new VisionContentController();
