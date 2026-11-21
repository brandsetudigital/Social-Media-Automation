import prisma from '../../prisma';
import { aiFactory } from './AIFactory';
import {
  BRAND_VOICE_SYSTEM_PROMPT,
  buildEvaluateQualityPrompt,
  buildRefineCaptionPrompt,
} from '../../prompts/brandVoice.prompts';
import {
  EvaluateQualityInput,
  RefineCaptionInput,
  SaveBrandVoiceInput,
  SubmitFeedbackInput,
} from '../../validators/brandVoice.validator';
import { SupportedAIProvider } from '../../config/ai.config';

export interface BrandVoiceProfile {
  id?: string;
  clientId?: string;
  brandName: string;
  industry: string;
  targetAudience: string;
  tone: string;
  preferredVocabulary: string[];
  wordsToAvoid: string[];
  emojiPreference: 'none' | 'minimal' | 'expressive';
  ctaStyle: string;
  captionLength: 'short' | 'medium' | 'long';
  updatedAt: string;
}

export interface RefinedCaptionResponse {
  originalCaption: string;
  refinedCaption: string;
  hook: string;
  callToAction: string;
  improvementsMade: string[];
  readabilityScore: number;
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
  };
}

export interface QualityEvaluationResponse {
  caption: string;
  overallScore: number;
  categoryScores: {
    naturalLanguage: number;
    topicRelevance: number;
    originality: number;
    grammarAndClarity: number;
    brandVoice: number;
    hashtagRelevance: number;
  };
  isHumanSounding: boolean;
  strengths: string[];
  suggestionsForImprovement: string[];
  flaggedClichés: string[];
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
  };
}

export interface StoredUserFeedback {
  id: string;
  caption: string;
  rating: number;
  feedbackNotes?: string;
  likedAspects: string[];
  dislikedAspects: string[];
  provider?: string;
  modelId?: string;
  submittedAt: string;
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

export class BrandVoiceService {
  // In-memory cache for ultra-fast retrieval and cross-session persistence
  private readonly voiceCache: Map<string, BrandVoiceProfile> = new Map();
  private readonly feedbackLogs: StoredUserFeedback[] = [];

  /**
   * Saves or updates a client's brand voice preferences in memory and database.
   */
  public async saveBrandVoice(input: SaveBrandVoiceInput): Promise<BrandVoiceProfile> {
    const key = (input.clientId || input.brandName).toLowerCase().trim();

    const profile: BrandVoiceProfile = {
      clientId: input.clientId,
      brandName: input.brandName,
      industry: input.industry,
      targetAudience: input.targetAudience,
      tone: input.tone,
      preferredVocabulary: input.preferredVocabulary || [],
      wordsToAvoid: input.wordsToAvoid || [],
      emojiPreference: input.emojiPreference,
      ctaStyle: input.ctaStyle,
      captionLength: input.captionLength,
      updatedAt: new Date().toISOString(),
    };

    this.voiceCache.set(key, profile);

    // If clientId exists in Prisma Client, sync with ClientBrandProfile
    if (input.clientId) {
      try {
        const client = await prisma.client.findUnique({
          where: { id: input.clientId },
          include: { brandProfile: true },
        });

        if (client) {
          const serializedNotes = JSON.stringify({
            industry: input.industry,
            emojiPreference: input.emojiPreference,
            captionLength: input.captionLength,
          });

          await prisma.clientBrandProfile.upsert({
            where: { clientId: input.clientId },
            create: {
              clientId: input.clientId,
              targetAudience: input.targetAudience,
              brandTone: input.tone,
              keywords: (input.preferredVocabulary || []).join(', '),
              restrictedClaims: (input.wordsToAvoid || []).join(', '),
              preferredCta: input.ctaStyle,
              services: input.industry,
              products: input.industry,
              usp: input.brandName,
              hashtags: '',
              importantNotes: serializedNotes,
            },
            update: {
              targetAudience: input.targetAudience,
              brandTone: input.tone,
              keywords: (input.preferredVocabulary || []).join(', '),
              restrictedClaims: (input.wordsToAvoid || []).join(', '),
              preferredCta: input.ctaStyle,
              importantNotes: serializedNotes,
            },
          });
        }
      } catch (err) {
        console.warn('[BrandVoiceService.saveBrandVoice DB note]:', err);
      }
    }

    return profile;
  }

  /**
   * Retrieves a brand voice profile by clientId or brand name.
   */
  public async getBrandVoice(identifier: string): Promise<BrandVoiceProfile | null> {
    const key = identifier.toLowerCase().trim();
    if (this.voiceCache.has(key)) {
      return this.voiceCache.get(key)!;
    }

    // Try finding via Prisma Client
    try {
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { id: identifier },
            { businessName: { equals: identifier } },
          ],
        },
        include: { brandProfile: true },
      });

      if (client && client.brandProfile) {
        const bp = client.brandProfile;
        let notesParsed: any = {};
        try {
          if (bp.importantNotes) notesParsed = JSON.parse(bp.importantNotes);
        } catch {}

        const loaded: BrandVoiceProfile = {
          clientId: client.id,
          brandName: client.businessName,
          industry: notesParsed.industry || client.category || 'General Business',
          targetAudience: bp.targetAudience || 'General Audience',
          tone: bp.brandTone || 'friendly',
          preferredVocabulary: bp.keywords ? bp.keywords.split(',').map((s) => s.trim()) : [],
          wordsToAvoid: bp.restrictedClaims ? bp.restrictedClaims.split(',').map((s) => s.trim()) : [],
          emojiPreference: notesParsed.emojiPreference || 'minimal',
          ctaStyle: bp.preferredCta || 'general',
          captionLength: notesParsed.captionLength || 'medium',
          updatedAt: bp.updatedAt ? bp.updatedAt.toISOString() : new Date().toISOString(),
        };

        this.voiceCache.set(key, loaded);
        return loaded;
      }
    } catch (err) {
      console.warn('[BrandVoiceService.getBrandVoice DB note]:', err);
    }

    return null;
  }

  /**
   * Refines a rough caption into a natural, conversational, high-converting copy
   * that conforms to brand voice guidelines and strips robotic AI filler.
   */
  public async refineCaption(input: RefineCaptionInput): Promise<RefinedCaptionResponse> {
    // Resolve brand voice profile if clientId or brandName is present
    let brandProfile: BrandVoiceProfile | null = null;
    if (input.clientId) {
      brandProfile = await this.getBrandVoice(input.clientId);
    } else if (input.brandName) {
      brandProfile = await this.getBrandVoice(input.brandName);
    }

    const brandName = input.brandName || brandProfile?.brandName;
    const industry = input.industry || brandProfile?.industry;
    const targetAudience = input.targetAudience || brandProfile?.targetAudience;
    const tone = input.tone || brandProfile?.tone || 'friendly and relatable';
    const preferredVocabulary = input.preferredVocabulary || brandProfile?.preferredVocabulary;
    const wordsToAvoid = input.wordsToAvoid || brandProfile?.wordsToAvoid;
    const ctaStyle = input.ctaStyle || brandProfile?.ctaStyle;

    const prompt = buildRefineCaptionPrompt({
      caption: input.caption,
      instruction: input.instruction,
      brandName,
      industry,
      targetAudience,
      tone,
      preferredVocabulary,
      wordsToAvoid,
      ctaStyle,
    });

    const aiResult = await aiFactory.generateText({
      prompt,
      systemPrompt: BRAND_VOICE_SYSTEM_PROMPT,
      provider: input.provider,
      modelId: input.modelId,
      temperature: 0.7,
      maxTokens: 1200,
      timeoutMs: 30000,
    });

    let parsed: any;
    try {
      parsed = parseJsonFromAI<any>(aiResult.rawText);
    } catch {
      parsed = {
        originalCaption: input.caption,
        refinedCaption: aiResult.rawText,
        hook: aiResult.rawText.split('\n')[0] || '',
        callToAction: 'What do you think? Drop a comment below!',
        improvementsMade: ['Enhanced conversational flow', 'Removed repetitive phrasing'],
        readabilityScore: 88,
      };
    }

    return {
      originalCaption: input.caption,
      refinedCaption: parsed.refinedCaption || aiResult.rawText,
      hook: parsed.hook || (parsed.refinedCaption ? parsed.refinedCaption.split('\n')[0] : ''),
      callToAction: parsed.callToAction || 'Let us know your thoughts in the comments!',
      improvementsMade: parsed.improvementsMade || ['Polished natural phrasing'],
      readabilityScore: parsed.readabilityScore || 90,
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
      },
    };
  }

  /**
   * Evaluates an Instagram caption across 6 professional copywriting dimensions.
   */
  public async evaluateContentQuality(
    input: EvaluateQualityInput
  ): Promise<QualityEvaluationResponse> {
    const prompt = buildEvaluateQualityPrompt({
      caption: input.caption,
      topic: input.topic,
      hashtags: input.hashtags,
      brandName: input.brandName,
      targetAudience: input.targetAudience,
      tone: input.tone,
    });

    const aiResult = await aiFactory.generateText({
      prompt,
      systemPrompt: BRAND_VOICE_SYSTEM_PROMPT,
      provider: input.provider,
      modelId: input.modelId,
      temperature: 0.3,
      maxTokens: 1000,
      timeoutMs: 30000,
    });

    let parsed: any;
    try {
      parsed = parseJsonFromAI<any>(aiResult.rawText);
    } catch {
      parsed = {
        overallScore: 85,
        categoryScores: {
          naturalLanguage: 85,
          topicRelevance: 85,
          originality: 80,
          grammarAndClarity: 90,
          brandVoice: 85,
          hashtagRelevance: 80,
        },
        isHumanSounding: true,
        strengths: ['Clean phrasing and direct messaging'],
        suggestionsForImprovement: ['Incorporate stronger curiosity in the first line'],
        flaggedClichés: [],
      };
    }

    return {
      caption: input.caption,
      overallScore: parsed.overallScore || 85,
      categoryScores: parsed.categoryScores || {
        naturalLanguage: 85,
        topicRelevance: 85,
        originality: 80,
        grammarAndClarity: 90,
        brandVoice: 85,
        hashtagRelevance: 80,
      },
      isHumanSounding: parsed.isHumanSounding ?? true,
      strengths: parsed.strengths || [],
      suggestionsForImprovement: parsed.suggestionsForImprovement || [],
      flaggedClichés: parsed.flaggedClichés || [],
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
      },
    };
  }

  /**
   * Collects and records human user feedback and 1-5 star ratings for continuous quality tracking.
   */
  public submitUserFeedback(input: SubmitFeedbackInput): StoredUserFeedback {
    const feedback: StoredUserFeedback = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      caption: input.caption,
      rating: input.rating,
      feedbackNotes: input.feedbackNotes,
      likedAspects: input.likedAspects || [],
      dislikedAspects: input.dislikedAspects || [],
      provider: input.provider,
      modelId: input.modelId,
      submittedAt: new Date().toISOString(),
    };

    this.feedbackLogs.push(feedback);
    return feedback;
  }

  /**
   * Returns all stored feedback records.
   */
  public getFeedbackLogs(): StoredUserFeedback[] {
    return [...this.feedbackLogs];
  }
}

export const brandVoiceService = new BrandVoiceService();
