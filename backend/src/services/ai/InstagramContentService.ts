import { aiFactory } from './AIFactory';
import { contentHistoryService } from './ContentHistoryService';
import {
  buildCaptionPrompt,
  buildContentIdeasPrompt,
  buildHashtagPrompt,
  INSTAGRAM_SYSTEM_PROMPT,
} from '../../prompts/instagram.prompts';
import {
  GenerateCaptionsInput,
  GenerateHashtagsInput,
  GenerateIdeasInput,
} from '../../validators/instagramContent.validator';
import { SupportedAIProvider } from '../../config/ai.config';

export interface CaptionVariation {
  variationId: number;
  style: string;
  hook: string;
  body: string;
  callToAction: string;
  suggestedEmojis: string[];
  fullCaption: string;
}

export interface GeneratedCaptionsResponse {
  topic: string;
  variations: CaptionVariation[];
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
    attemptedProviders?: string[];
  };
}

export interface CategorizedHashtags {
  niche: string[];
  audience: string[];
  topic: string[];
}

export interface GeneratedHashtagsResponse {
  topic: string;
  totalCount: number;
  categorized: CategorizedHashtags;
  allHashtags: string[];
  formattedString: string;
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

export interface ContentIdeaItem {
  id: number;
  title: string;
  format: 'POST' | 'CAROUSEL' | 'REEL';
  pillar: 'EDUCATIONAL' | 'RELATABLE' | 'PROMOTIONAL';
  hook: string;
  conceptSummary: string;
  carouselSlides?: string[];
  reelAudioSuggestion?: string;
  callToAction: string;
}

export interface GeneratedContentIdeasResponse {
  theme: string;
  ideas: ContentIdeaItem[];
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

/**
 * Safely strips markdown code block fences and parses JSON from AI response text.
 */
function parseJsonFromAI<T>(rawText: string): T {
  let cleaned = rawText.trim();

  // Strip markdown code block fences if present (e.g. ```json ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  // Find first '{' or '[' and last '}' or ']'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned) as T;
}

export class InstagramContentService {
  /**
   * Generates 3 distinct Instagram caption variations (Story, Punchy, Educational)
   * with custom hooks, body copy, and organic CTAs.
   */
  public async generateCaptions(input: GenerateCaptionsInput): Promise<GeneratedCaptionsResponse> {
    const prompt = buildCaptionPrompt({
      topic: input.topic,
      brandName: input.brandName,
      targetAudience: input.targetAudience,
      tone: input.tone,
      postPurpose: (input as any).postPurpose,
      ctaType: input.ctaType,
      keywords: input.keywords,
    });

    const aiResult = await aiFactory.generateText({
      prompt,
      systemPrompt: INSTAGRAM_SYSTEM_PROMPT,
      provider: input.provider,
      modelId: input.modelId,
      temperature: 0.75,
      maxTokens: 1500,
      timeoutMs: 30000,
    });

    let parsed: any;
    try {
      parsed = parseJsonFromAI<{ topic: string; variations: CaptionVariation[] }>(aiResult.rawText);
    } catch {
      // Fallback structured object if model returned raw text
      parsed = {
        topic: input.topic,
        variations: [
          {
            variationId: 1,
            style: 'General',
            hook: input.topic,
            body: aiResult.rawText,
            callToAction: 'What are your thoughts on this? Drop a comment below!',
            suggestedEmojis: ['✨', '💬'],
            fullCaption: `${aiResult.rawText}\n\nWhat are your thoughts on this? Drop a comment below!`,
          },
        ],
      };
    }

    const firstVar = (parsed.variations && parsed.variations[0]) || {
      hook: '',
      body: aiResult.rawText,
      callToAction: '',
    };

    // Auto-persist in database in background
    contentHistoryService
      .saveGeneratedContent({
        clientId: (input as any).clientId,
        topic: input.topic,
        contentType: 'CAPTION',
        provider: aiResult.provider,
        modelId: aiResult.modelId,
        hook: firstVar.hook,
        caption: firstVar.fullCaption || firstVar.body,
        callToAction: firstVar.callToAction,
        variationsJson: JSON.stringify(parsed.variations || []),
        inputTokens: aiResult.inputTokens,
        outputTokens: aiResult.outputTokens,
        totalTokens: aiResult.totalTokens,
        latencyMs: aiResult.latencyMs,
        costUSD: aiResult.costUSD,
        usedFallback: aiResult.usedFallback || false,
        status: 'DRAFT',
      })
      .catch((err) => console.warn('[InstagramContentService AutoPersist Warning]:', err.message));

    return {
      topic: parsed.topic || input.topic,
      variations: parsed.variations || [],
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
        attemptedProviders: aiResult.attemptedProviders,
      },
    };
  }

  /**
   * Generates 5-15 highly relevant, non-spam hashtags divided into niche, audience, and topic.
   */
  public async generateHashtags(input: GenerateHashtagsInput): Promise<GeneratedHashtagsResponse> {
    const prompt = buildHashtagPrompt({
      topic: input.topic,
      brandNiche: input.brandNiche,
      count: input.count,
    });

    const aiResult = await aiFactory.generateText({
      prompt,
      systemPrompt: INSTAGRAM_SYSTEM_PROMPT,
      provider: input.provider,
      modelId: input.modelId,
      temperature: 0.5,
      maxTokens: 800,
      timeoutMs: 30000,
    });

    let parsed: any;
    try {
      parsed = parseJsonFromAI<{
        topic: string;
        totalCount: number;
        categorized: CategorizedHashtags;
        allHashtags: string[];
        formattedString: string;
      }>(aiResult.rawText);
    } catch {
      // Extract any hashtags from raw text as fallback
      const tags = (aiResult.rawText.match(/#[a-zA-Z0-9_]+/g) || []).slice(0, input.count || 15);
      parsed = {
        topic: input.topic,
        totalCount: tags.length,
        categorized: {
          niche: tags.slice(0, 5),
          audience: tags.slice(5, 10),
          topic: tags.slice(10),
        },
        allHashtags: tags,
        formattedString: tags.join(' '),
      };
    }

    // Format allHashtags to ensure they have '#' prefix
    const allHashtags = (parsed.allHashtags || []).map((t: string) =>
      t.startsWith('#') ? t : `#${t}`
    );

    const firstVar = (parsed.variations && parsed.variations[0]) || {
      hook: '',
      body: aiResult.rawText,
      callToAction: '',
    };

    // Auto-persist in database in background
    contentHistoryService
      .saveGeneratedContent({
        clientId: (input as any).clientId,
        topic: input.topic,
        contentType: 'CAPTION',
        provider: aiResult.provider,
        modelId: aiResult.modelId,
        hook: firstVar.hook,
        caption: firstVar.fullCaption || firstVar.body,
        callToAction: firstVar.callToAction,
        variationsJson: JSON.stringify(parsed.variations || []),
        inputTokens: aiResult.inputTokens,
        outputTokens: aiResult.outputTokens,
        totalTokens: aiResult.totalTokens,
        latencyMs: aiResult.latencyMs,
        costUSD: aiResult.costUSD,
        usedFallback: aiResult.usedFallback || false,
        status: 'DRAFT',
      })
      .catch((err) => console.warn('[InstagramContentService AutoPersist Warning]:', err.message));

    return {
      topic: parsed.topic || input.topic,
      totalCount: allHashtags.length,
      categorized: {
        niche: (parsed.categorized?.niche || []).map((t: string) => (t.startsWith('#') ? t : `#${t}`)),
        audience: (parsed.categorized?.audience || []).map((t: string) => (t.startsWith('#') ? t : `#${t}`)),
        topic: (parsed.categorized?.topic || []).map((t: string) => (t.startsWith('#') ? t : `#${t}`)),
      },
      allHashtags,
      formattedString: parsed.formattedString || allHashtags.join(' '),
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

  /**
   * Generates creative Instagram content concepts across posts, carousels, and Reels.
   */
  public async generateContentIdeas(input: GenerateIdeasInput): Promise<GeneratedContentIdeasResponse> {
    const prompt = buildContentIdeasPrompt({
      topic: input.topic,
      brandName: input.brandName,
      targetAudience: input.targetAudience,
      count: input.count,
      format: input.format,
    });

    const aiResult = await aiFactory.generateText({
      prompt,
      systemPrompt: INSTAGRAM_SYSTEM_PROMPT,
      provider: input.provider,
      modelId: input.modelId,
      temperature: 0.8,
      maxTokens: 1800,
      timeoutMs: 30000,
    });

    let parsed: any;
    try {
      parsed = parseJsonFromAI<{ theme: string; ideas: ContentIdeaItem[] }>(aiResult.rawText);
    } catch {
      parsed = {
        theme: input.topic,
        ideas: [
          {
            id: 1,
            title: `Content Idea: ${input.topic}`,
            format: 'POST',
            pillar: 'EDUCATIONAL',
            hook: `Here's what you need to know about ${input.topic}`,
            conceptSummary: aiResult.rawText.slice(0, 200),
            callToAction: 'Save this post for later reference!',
          },
        ],
      };
    }

    return {
      theme: parsed.theme || input.topic,
      ideas: parsed.ideas || [],
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

export const instagramContentService = new InstagramContentService();
