import fs from 'fs';
import path from 'path';
import { aiFactory } from './AIFactory';
import { contentHistoryService } from './ContentHistoryService';
import {
  buildVisionCaptionPrompt,
  INSTAGRAM_VISION_SYSTEM_PROMPT,
} from '../../prompts/vision.prompts';
import { GenerateVisionCaptionInput } from '../../validators/visionContent.validator';
import { SupportedAIProvider } from '../../config/ai.config';

export interface VisionCaptionResult {
  visualElementsDetected: string[];
  hook: string;
  caption: string;
  callToAction: string;
  hashtags: string[];
  suggestedEmojis: string[];
  fullPostText: string;
  meta: {
    provider: SupportedAIProvider;
    modelId: string;
    latencyMs: number;
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    costUSD: number;
    usedFallback?: boolean;
    originalProvider?: SupportedAIProvider;
  };
}

export interface VisionExecutionOptions extends GenerateVisionCaptionInput {
  fileBuffer?: Buffer;
  fileMimeType?: string;
}

function parseJsonFromAI<T>(rawText: string): T {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned) as T;
}

export class VisionContentService {
  /**
   * Analyzes an uploaded image and generates an authentic, grounded caption with hashtags.
   */
  public async generateCaptionFromImage(options: VisionExecutionOptions): Promise<VisionCaptionResult> {
    let cleanBase64 = '';
    let resolvedMimeType = options.fileMimeType || 'image/jpeg';

    // 1. Process from Multer uploaded file buffer if provided
    if (options.fileBuffer && options.fileBuffer.length > 0) {
      cleanBase64 = options.fileBuffer.toString('base64');
    }
    // 2. Process from raw base64 or Data URL
    else if (options.imageBase64 && options.imageBase64.trim().length > 0) {
      let raw = options.imageBase64.trim();
      if (raw.includes(';base64,')) {
        const parts = raw.split(';base64,');
        const matchMime = parts[0].match(/data:(.*)/);
        if (matchMime && matchMime[1]) {
          resolvedMimeType = matchMime[1];
        }
        cleanBase64 = parts[1];
      } else {
        cleanBase64 = raw;
      }
    }
    // 3. Process from local file path or server uploads
    else if (options.imageUrl && options.imageUrl.trim().length > 0) {
      const url = options.imageUrl.trim();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // Fetch remote image
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        cleanBase64 = buffer.toString('base64');
        resolvedMimeType = response.headers.get('content-type') || 'image/jpeg';
      } else {
        // Local file path
        let filePath = url;
        if (!path.isAbsolute(filePath)) {
          filePath = path.join(process.cwd(), filePath);
        }
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          cleanBase64 = buffer.toString('base64');
          if (filePath.endsWith('.png')) resolvedMimeType = 'image/png';
          else if (filePath.endsWith('.webp')) resolvedMimeType = 'image/webp';
          else resolvedMimeType = 'image/jpeg';
        } else {
          throw new Error(`Specified image file does not exist: ${filePath}`);
        }
      }
    } else {
      throw new Error('No image was provided. Please upload an image file or provide a base64 string.');
    }

    const prompt = buildVisionCaptionPrompt({
      contextHint: options.contextHint,
      brandName: options.brandName,
      targetAudience: options.targetAudience,
      tone: options.tone,
      ctaType: options.ctaType,
    });

    const aiResult = await aiFactory.generateVision({
      prompt,
      systemPrompt: INSTAGRAM_VISION_SYSTEM_PROMPT,
      imageBase64: cleanBase64,
      mimeType: resolvedMimeType,
      provider: options.provider,
      modelId: options.modelId,
      timeoutMs: 35000,
    });

    let parsed: any;
    try {
      parsed = parseJsonFromAI<any>(aiResult.rawText);
    } catch {
      // Fallback parser if output was plain text
      const raw = aiResult.rawText;
      const tags = (raw.match(/#[a-zA-Z0-9_]+/g) || []).slice(0, 8);
      parsed = {
        visualElementsDetected: ['Image subject'],
        hook: raw.split('\n')[0] || 'Take a look at this!',
        caption: raw,
        callToAction: 'What do you think? Drop a comment below!',
        hashtags: tags,
        suggestedEmojis: ['✨', '📸'],
        fullPostText: raw,
      };
    }

    const hashtags = (parsed.hashtags || []).map((t: string) =>
      t.startsWith('#') ? t : `#${t}`
    );

    const fullPostText =
      parsed.fullPostText ||
      `${parsed.hook || ''}\n\n${parsed.caption || ''}\n\n${parsed.callToAction || ''}\n\n${hashtags.join(' ')}`.trim();

    // Auto-persist vision generation into database
    contentHistoryService
      .saveGeneratedContent({
        clientId: options.clientId,
        topic: options.contextHint || options.brandName || 'Image Analysis & Caption',
        contentType: 'VISION',
        provider: aiResult.provider,
        modelId: aiResult.modelId,
        hook: parsed.hook || '',
        caption: parsed.caption || fullPostText,
        callToAction: parsed.callToAction || '',
        hashtags: hashtags.join(' '),
        visualElements: JSON.stringify(parsed.visualElementsDetected || []),
        inputTokens: aiResult.inputTokens,
        outputTokens: aiResult.outputTokens,
        totalTokens: aiResult.totalTokens,
        latencyMs: aiResult.latencyMs,
        costUSD: aiResult.costUSD,
        usedFallback: aiResult.usedFallback || false,
        status: 'DRAFT',
      })
      .catch((err) => console.warn('[VisionContentService AutoPersist Warning]:', err.message));

    return {
      visualElementsDetected: parsed.visualElementsDetected || [],
      hook: parsed.hook || '',
      caption: parsed.caption || '',
      callToAction: parsed.callToAction || '',
      hashtags,
      suggestedEmojis: parsed.suggestedEmojis || [],
      fullPostText,
      meta: {
        provider: aiResult.provider,
        modelId: aiResult.modelId,
        latencyMs: aiResult.latencyMs,
        tokens: {
          input: aiResult.inputTokens,
          output: aiResult.outputTokens,
          total: aiResult.totalTokens,
        },
        costUSD: aiResult.costUSD,
        usedFallback: aiResult.usedFallback,
        originalProvider: aiResult.originalProvider,
      },
    };
  }
}

export const visionContentService = new VisionContentService();
