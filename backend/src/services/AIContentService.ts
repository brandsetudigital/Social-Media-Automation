import fs from 'fs';
import path from 'path';
import prisma from '../prisma';

export class AIContentService {
  /**
   * Helper to convert local upload path or image URL to base64 data URL for Gemini/OpenAI multimodal vision
   */
  private static resolveMediaAsDataUrl(mediaUrl?: string): string | undefined {
    if (!mediaUrl) return undefined;
    if (mediaUrl.startsWith('data:image/')) return mediaUrl;

    try {
      let filename = '';
      if (mediaUrl.includes('/uploads/')) {
        filename = mediaUrl.split('/uploads/')[1].split('?')[0];
      } else if (!mediaUrl.startsWith('http') && !mediaUrl.startsWith('blob:')) {
        filename = path.basename(mediaUrl);
      }

      if (filename) {
        const possibleDirs = [
          path.join(process.cwd(), 'uploads'),
          path.join(process.cwd(), 'backend', 'uploads'),
          path.join(__dirname, '../../uploads'),
          path.join(__dirname, '../uploads'),
        ];

        for (const dir of possibleDirs) {
          const filePath = path.join(dir, filename);
          if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
            const buffer = fs.readFileSync(filePath);
            return `data:${mime};base64,${buffer.toString('base64')}`;
          }
        }
      }
    } catch (err) {
      console.warn('[AIContentService] Could not resolve media file to base64:', err);
    }

    return mediaUrl;
  }

  /**
   * Helper to retrieve brand knowledge for a client
   */
  private static async getClientContext(clientId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        brandProfile: true,
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) throw new Error(`Client ${clientId} not found`);

    const bp = client.brandProfile;
    const docs = client.documents || [];
    const documentKnowledge = docs
      .map((d) => `- [${d.fileType}] ${d.title}${d.summary ? `: ${d.summary}` : ''}`)
      .join('\n');

    return {
      businessName: client.businessName,
      category: client.category,
      location: client.location,
      phone: client.phone || '',
      website: client.website || '',
      services: bp?.services || '',
      products: bp?.products || '',
      usp: bp?.usp || 'Premium quality and unmatched customer satisfaction',
      targetAudience: bp?.targetAudience || 'Families, Professionals and Local Customers',
      brandTone: bp?.brandTone || 'Friendly + Premium',
      language: bp?.language || 'Hindi + English',
      keywords: bp?.keywords || '',
      hashtags: bp?.hashtags || '',
      preferredCta: bp?.preferredCta || 'Visit us today or tap the link in bio!',
      restrictedClaims: bp?.restrictedClaims || 'No exaggerated or unsubstantiated guarantees',
      importantNotes: bp?.importantNotes || '',
      documentKnowledge: documentKnowledge || '',
      documentsCount: docs.length,
    };
  }

  /**
   * Calls Google Gemini API (gemini-flash-latest / gemini-2.5-flash-lite / gemini-3.5-flash)
   */
  private static async callGemini(prompt: string, mediaUrl?: string): Promise<{ caption: string; hashtags: string } | null> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) return null;

    try {
      const parts: any[] = [{ text: prompt }];

      // Support Multimodal image input if base64 data URL
      const resolvedMedia = this.resolveMediaAsDataUrl(mediaUrl);
      if (resolvedMedia && resolvedMedia.startsWith('data:image/')) {
        const mimeType = resolvedMedia.substring(resolvedMedia.indexOf(':') + 1, resolvedMedia.indexOf(';'));
        const base64Data = resolvedMedia.substring(resolvedMedia.indexOf(',') + 1);
        parts.unshift({
          inline_data: {
            mime_type: mimeType,
            data: base64Data,
          },
        });
      }

      const candidateModels = ['gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-3.5-flash'];

      for (const modelName of candidateModels) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 1500,
                  responseMimeType: 'application/json',
                },
              }),
            }
          );

          if (!response.ok) {
            continue;
          }

          const data: any = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) continue;

          // Extract JSON from markdown fences if model returned ```json ... ```
          const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          let parsedCaption = '';
          let parsedHashtags = '';

          try {
            const parsed = JSON.parse(cleaned);
            parsedCaption = parsed.caption || '';
            if (Array.isArray(parsed.hashtags)) {
              parsedHashtags = parsed.hashtags.join(' ');
            } else if (typeof parsed.hashtags === 'string') {
              parsedHashtags = parsed.hashtags;
            }
          } catch {
            // Regex fallback if JSON had unescaped quotes or newlines
            const capMatch = cleaned.match(/"caption"\s*:\s*"([\s\S]*?)(?="\s*,\s*"hashtags"|"\s*\})/);
            if (capMatch) {
              parsedCaption = capMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
            } else {
              parsedCaption = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            }

            const tagMatch = cleaned.match(/"hashtags"\s*:\s*"([^"]+)"/);
            if (tagMatch) {
              parsedHashtags = tagMatch[1];
            } else {
              const allTags = cleaned.match(/#[A-Za-z0-9_]+/g);
              if (allTags && allTags.length > 0) {
                parsedHashtags = allTags.join(' ');
              }
            }
          }

          if (parsedCaption) {
            return {
              caption: parsedCaption,
              hashtags: parsedHashtags,
            };
          }
        } catch {
          continue;
        }
      }

      return null;
    } catch (err: any) {
      console.warn(`[Gemini API Exception]: ${err.message}`);
      return null;
    }
  }

  /**
   * Calls OpenAI ChatGPT API (gpt-4o-mini)
   */
  private static async callOpenAI(prompt: string, mediaUrl?: string): Promise<{ caption: string; hashtags: string } | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    try {
      const userContent: any[] = [{ type: 'text', text: prompt }];

      const resolvedMedia = this.resolveMediaAsDataUrl(mediaUrl);
      if (resolvedMedia && (resolvedMedia.startsWith('http') || resolvedMedia.startsWith('data:image/'))) {
        userContent.push({
          type: 'image_url',
          image_url: { url: resolvedMedia },
        });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are the Senior Social Media Strategist for BrandSetu Digital marketing agency. Respond ONLY in valid JSON with keys "caption" and "hashtags".',
            },
            { role: 'user', content: userContent },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        console.warn(`[OpenAI Note]: Status ${response.status} (insufficient quota/credits). Switching to BrandSetu Smart Creative Engine.`);
        return null;
      }

      const data: any = await response.json();
      const rawText = data.choices?.[0]?.message?.content;
      if (!rawText) return null;

      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        return {
          caption: parsed.caption || rawText,
          hashtags: parsed.hashtags || '',
        };
      } catch {
        return { caption: rawText, hashtags: '' };
      }
    } catch (err: any) {
      console.warn(`[OpenAI API Exception]: ${err.message}`);
      return null;
    }
  }

  /**
   * Generates tailored captions for a specific platform & content type
   */
  static async generateCaption(params: {
    clientId: string;
    contentType: 'POST' | 'REEL' | 'STORY' | 'GOOGLE_BUSINESS_POST' | string;
    platform: 'INSTAGRAM' | 'FACEBOOK' | 'GOOGLE_BUSINESS' | 'LINKEDIN' | 'TWITTER' | 'YOUTUBE' | string;
    topic?: string;
    mediaUrl?: string;
    mediaContext?: string;
    toneOverride?: string;
  }) {
    const ctx = await this.getClientContext(params.clientId);
    const tone = params.toneOverride || ctx.brandTone;
    const topic = params.topic || `Special spotlight on ${ctx.businessName}'s signature offerings`;

    // 1. Build prompt for LLM (Gemini / ChatGPT)
    const prompt = `You are the lead content creator at BrandSetu Digital marketing agency.
Create a high-performing, engagement-focused social media caption and relevant hashtags for our client.

CLIENT BRAND KNOWLEDGE:
- Business Name: ${ctx.businessName}
- Category/Industry: ${ctx.category}
- Location: ${ctx.location}
- Phone / Contact: ${ctx.phone}
- Website: ${ctx.website}
- Core Offerings: ${ctx.services} | ${ctx.products}
- Unique Selling Proposition (USP): ${ctx.usp}
- Target Audience: ${ctx.targetAudience}
- Brand Tone: ${tone}
- Language: ${ctx.language} (Conversational Hinglish / Hindi+English if appropriate, else English)
- Preferred Call to Action (CTA): ${ctx.preferredCta}
- Restricted Claims to Avoid: ${ctx.restrictedClaims}
${ctx.documentKnowledge ? `\nCLIENT UPLOADED DOCUMENTS & KNOWLEDGE BASE:\n${ctx.documentKnowledge}\n(Use the facts, offers, services and details from these documents to make the caption highly authentic and accurate)\n` : ''}
POST SPECIFICS:

- Platform: ${params.platform} (INSTAGRAM, FACEBOOK, LINKEDIN, TWITTER, YOUTUBE, or GOOGLE_BUSINESS)
- Content Type: ${params.contentType} (POST, REEL, STORY, GOOGLE_BUSINESS_POST)
- Topic / Creative Title: ${topic}
${params.mediaUrl ? '- Visual Media is attached with this request. Carefully inspect the image visuals, text in the creative (e.g. location, road name, property highlights), phone, logo, and align the caption directly with what is depicted.' : ''}

CRITICAL RULES:
1. FOR CONTACT DETAILS & LOCATION (VERY IMPORTANT):
   - If the creative image contains a phone number, address, or location, ONLY use the exact contact details or location shown in the creative or specified in the client profile.
   - If the creative image and client profile do NOT have a phone number or address, DO NOT invent, hallucinate, or add any placeholder contact number or fake address ("sirf wahi dalna jo image me ho, nahi to nahi dalna"). Never invent random digits or locations.
2. For INSTAGRAM: Start with a powerful hook, use aesthetic emojis, natural line spacing, highlight location & key benefits, ask an engaging question, and end with the client CTA / contact (if available).
3. For FACEBOOK: Friendly, community-oriented, clear details, phone/website contact (if available), and convenient location${ctx.location ? ` in ${ctx.location}` : ''}.
4. For LINKEDIN: Professional perspective on market opportunity, ROI, trust, infrastructure growth, and investment fundamentals.
5. For TWITTER: Concise, punchy alert with key details and link to website (if available).
6. For YOUTUBE: Video description format with timestamps, project highlights, contact (if available), and subscribe CTA.
7. For GOOGLE_BUSINESS: Professional local update, rich SEO keywords${ctx.location ? ` for ${ctx.location}` : ''}, clear directions/call CTA.
8. HASHTAGS: Always provide 10-15 high-reach, localized hashtags (e.g. #${ctx.businessName.replace(/\s+/g, '')} ${ctx.location ? `#${ctx.location.replace(/[^a-zA-Z]/g, '')}` : ''}) relevant to the post and business.

OUTPUT FORMAT:
Return strictly a valid JSON object without any other text or explanation:
{
  "caption": "<generated caption with emojis and spacing>",
  "hashtags": "<generated hashtags space-separated>"
}`;

    // 2. Try Gemini first, then OpenAI ChatGPT with fallback
    let aiResult: { caption: string; hashtags: string } | null = null;
    let modelUsed = 'BrandSetu Smart Engine';

    const preferred = process.env.AI_PROVIDER || 'gemini';

    if (preferred === 'gemini') {
      aiResult = await this.callGemini(prompt, params.mediaUrl);
      if (aiResult) modelUsed = 'Google Gemini AI';
      if (!aiResult && process.env.OPENAI_API_KEY) {
        aiResult = await this.callOpenAI(prompt, params.mediaUrl);
        if (aiResult) modelUsed = 'ChatGPT (gpt-4o-mini)';
      }
    } else {
      aiResult = await this.callOpenAI(prompt, params.mediaUrl);
      if (aiResult) modelUsed = 'ChatGPT (gpt-4o-mini)';
      if (!aiResult) {
        aiResult = await this.callGemini(prompt, params.mediaUrl);
        if (aiResult) modelUsed = 'Google Gemini AI';
      }
    }

    if (aiResult && aiResult.caption) {
      let finalHashtags = aiResult.hashtags?.trim() || '';
      if (!finalHashtags) {
        try {
          finalHashtags = await this.generateHashtags(params.clientId, topic);
        } catch {
          finalHashtags = ctx.hashtags || `#${ctx.businessName.replace(/\s+/g, '')} #SocialMedia`;
        }
      }

      return {
        caption: aiResult.caption,
        hashtags: finalHashtags,
        cta: ctx.preferredCta,
        aiModelUsed: modelUsed,
        brandContextUsed: {
          businessName: ctx.businessName,
          usp: ctx.usp,
          tone,
          audience: ctx.targetAudience,
        },
      };
    }

    // 3. Deterministic Brand-Knowledge & Creative Context Engine (active when cloud LLM quota is pending)
    let caption = '';
    let hashtags = '';
    const phoneContact = ctx.phone ? `📞 ${ctx.phone}` : '';
    const webContact = ctx.website ? `🌐 ${ctx.website}` : '';
    const contactLine = [phoneContact, webContact].filter(Boolean).join(' | ');

    // Clean contact footer: ONLY if explicitly specified and relevant, without forced phone spam
    const formatFooter = (loc?: string) => {
      // Do not append phone numbers or addresses unless specifically relevant
      return '';
    };

    // Detect if client or topic is Real Estate (like Property Babu)
    const topicText = (params.topic || '').toLowerCase();
    const isRealEstate =
      /real\s*estate|property|broker|plot|flat|babu/i.test(ctx.category) ||
      /property\s*babu/i.test(ctx.businessName) ||
      /rau\s*road|plot|property|land|babu/i.test(topicText) ||
      /rau\s*road|plot/i.test(ctx.targetAudience || '') ||
      /plot|land/i.test(ctx.services || '');

    const platformUpper = (params.platform || 'INSTAGRAM').toUpperCase();

    // Clean display title from topic
    const cleanTopic = topic && !topic.includes('spotlight & updates') && !topic.includes('Prime property showcase')
      ? topic
      : (isRealEstate ? 'Prime Verified Property Opportunity' : `${ctx.businessName} Exclusive Update`);

    if (isRealEstate) {
      const locationArea = ctx.location || 'Indore';

      if (platformUpper === 'INSTAGRAM') {
        const templates = [
          `🏡 ${cleanTopic} 📍 ${locationArea}!\n\n` +
          `Looking for prime verified plots in one of the highest-growth corridors? ${ctx.businessName} brings you prime opportunities with 100% transparent and trusted guidance.\n\n` +
          `✨ Key Highlights:\n` +
          `• Prime connectivity to major transit routes\n` +
          `• High capital appreciation & ROI\n` +
          `• 100% verified documentation & clear titles\n\n` +
          `💬 Drop a comment or DM us to get full project details and layout plans! ✨`,

          `🌟 Opportunity Alert: ${cleanTopic}!\n\n` +
          `Whether you're planning your dream home or a smart long-term investment, ${ctx.businessName} ensures you get verified, hassle-free guidance.\n\n` +
          `🔑 Highlights:\n` +
          `✅ 100% Clear title & verified documents\n` +
          `✅ Rapid infrastructure development\n` +
          `✅ High appreciation corridor\n\n` +
          `👉 Save this post and DM us for location and site visit details! 🚀`,

          `✨ Prime Property Opportunity: ${cleanTopic}!\n\n` +
          `Invest smart with ${ctx.businessName}. We guide families & smart investors to verified, high-return property opportunities in ${locationArea}.\n\n` +
          `💬 Interested? Drop a comment "DETAILS" below and we will send you the full breakdown! 👇`
        ];
        caption = templates[Math.floor(Math.random() * templates.length)];
        hashtags = `${ctx.hashtags || '#PropertyBabu #RealEstateIndore #IndoreProperties #PlotsInIndore #IndoreRealEstate #InvestIndore #TrustedPropertyPartner'}`;
      } else if (platformUpper === 'FACEBOOK') {
        caption = `Looking for the perfect property opportunity in ${locationArea}? 🌟\n\n` +
          `${ctx.businessName} is proud to present: ${cleanTopic}!\n\n` +
          `At ${ctx.businessName}, our mission is simple: ${ctx.usp}.\n\n` +
          `Why choose this opportunity:\n` +
          `🔹 Excellent connectivity to major transit hubs\n` +
          `🔹 Peaceful living environment with modern layout planning\n` +
          `🔹 100% transparent paperwork & verified land registry\n\n` +
          `👉 Send us a message or comment below to learn more!`;
        hashtags = `#${ctx.businessName.replace(/\s+/g, '')} #RealEstateIndore #IndorePlots #IndoreProperty #PropertyInvestment`;
      } else if (platformUpper === 'LINKEDIN') {
        caption = `Strategic Real Estate Investment Spotlight: ${cleanTopic}.\n\n` +
          `As ${locationArea} accelerates as a primary economic hub, verified plotted developments present compelling capital appreciation potential for smart investors.\n\n` +
          `Key Investment Highlights:\n` +
          `🔹 Infrastructure Acceleration: Rapid corridor development connecting major highways and business hubs.\n` +
          `🔹 Verification & Governance: 100% clear titles, transparent advisory, and structured closing managed by ${ctx.businessName}.\n\n` +
          `How are you diversifying your portfolio this year? Let's connect and discuss in the comments.`;
        hashtags = `#${ctx.businessName.replace(/\s+/g, '')} #RealEstateInvestment #IndoreEconomy #CommercialRealEstate #AssetManagement`;
      } else if (platformUpper === 'TWITTER' || platformUpper === 'X') {
        caption = `🚀 ${cleanTopic}! 📍\n\n` +
          `Explore verified property opportunities with @${ctx.businessName.replace(/\s+/g, '')}. Clear titles & 100% transparent advisory guaranteed.\n\nDM us for site visit & layout details!`;
        hashtags = `#${ctx.businessName.replace(/\s+/g, '')} #IndorePlots #RealEstateIndore`;
      } else if (platformUpper === 'YOUTUBE') {
        caption = `${cleanTopic} | ${ctx.businessName}\n\n` +
          `Welcome back to the official channel of ${ctx.businessName}!\n\n` +
          `In today's video: ${cleanTopic}.\n` +
          `📌 Highlights:\n` +
          `- Location: ${locationArea}\n` +
          `- Verified clear documentation & expert guidance\n\n` +
          `🔔 Don't forget to Like, Share, and Subscribe for regular updates!`;
        hashtags = `#${ctx.businessName.replace(/\s+/g, '')} #IndoreRealEstate #PropertyGuide`;
      } else {
        // GOOGLE_BUSINESS
        caption = `📢 ${cleanTopic} - ${ctx.businessName}\n\n` +
          `${ctx.businessName} brings you verified opportunities in ${locationArea}. Ideal for families constructing their future home and investors seeking high-appreciation property.\n\n` +
          `⭐ 100% Verified Clear Titles & Transparent Advisory\n` +
          `⭐ Trusted Guidance: ${ctx.usp}`;
        hashtags = `${ctx.hashtags || '#PropertyBabu #RealEstateIndore #IndoreProperties #PlotsInIndore #IndoreRealEstate'}`;
      }
    } else {
      // General Business / Agency / Retail Fallback
      if (platformUpper === 'INSTAGRAM') {
        const generalTemplates = [
          `✨ ${cleanTopic}! 🌟\n\n` +
          `At ${ctx.businessName}, we are dedicated to delivering ${ctx.usp}.\n\n` +
          `Crafted specially for ${ctx.targetAudience}, we bring you quality and excellence you can count on.\n\n` +
          `💬 Drop a comment or DM us to know more! 👇`,

          `🚀 Spotlight: ${cleanTopic}\n\n` +
          `Experience the difference with ${ctx.businessName}! Whether you're looking for top-tier ${ctx.services || ctx.category} or dedicated solutions, we've got you covered.\n\n` +
          `👉 Save this post and connect with our team today! ✨`,

          `💡 Did you know? ${ctx.usp}.\n\n` +
          `Today we are spotlighting ${cleanTopic}. Our team at ${ctx.businessName} is passionate about delivering real value for our community.\n\n` +
          `Tell us your thoughts in the comments below! 👇`
        ];
        caption = generalTemplates[Math.floor(Math.random() * generalTemplates.length)];
        hashtags = `${ctx.hashtags || '#BrandSetu'} #${ctx.businessName.replace(/\s+/g, '')} #${ctx.category.replace(/[^a-zA-Z]/g, '')} #Quality #Excellence #InstaDaily`;
      } else if (platformUpper === 'FACEBOOK') {
        caption = `Exciting news from ${ctx.businessName}! 🎉\n\n` +
          `${cleanTopic}.\n\n` +
          `We are dedicated to serving our wonderful community with:\n` +
          `✅ Exceptional quality & warm service\n` +
          `✅ Solutions tailored for ${ctx.targetAudience}\n\n` +
          `💬 Connect with us today or leave a comment to learn more!`;
        hashtags = `#${ctx.businessName.replace(/\s+/g, '')} #${ctx.category.replace(/[^a-zA-Z]/g, '')}`;
      } else if (platformUpper === 'LINKEDIN') {
        caption = `Driving impact with ${cleanTopic}.\n\n` +
          `At ${ctx.businessName}, we believe in creating real value for ${ctx.targetAudience} by focusing on ${ctx.usp}.\n\n` +
          `Key Takeaways:\n` +
          `🔹 Excellence in delivery across every touchpoint\n` +
          `🔹 Customer-centric approach tailored for sustainable results\n\n` +
          `How is your organization approaching growth this year? Let's connect and discuss in the comments.`;
        hashtags = `#${ctx.businessName.replace(/\s+/g, '')} #Leadership #BusinessGrowth #Innovation`;
      } else if (platformUpper === 'TWITTER' || platformUpper === 'X') {
        caption = `Exciting things happening at ${ctx.businessName}! 🚀\n\n${cleanTopic}. ${ctx.usp}.\n\nWhat are you most excited about? Drop your thoughts below! 👇`;
        hashtags = `#${ctx.businessName.replace(/\s+/g, '')} #Trending`;
      } else if (platformUpper === 'YOUTUBE') {
        caption = `${cleanTopic} | ${ctx.businessName}\n\n` +
          `Welcome to the official channel of ${ctx.businessName}!\n\n` +
          `In today's video: ${cleanTopic}.\n` +
          `📌 About us: ${ctx.businessName} delivers ${ctx.usp}.\n\n` +
          `🔔 Don't forget to Like, Share & Subscribe for more updates!`;
        hashtags = `#${ctx.businessName.replace(/\s+/g, '')} #${ctx.category.replace(/[^a-zA-Z]/g, '')}`;
      } else {
        // GOOGLE_BUSINESS
        caption = `📢 ${cleanTopic} - ${ctx.businessName}\n\n` +
          `Serving authentic, high-quality ${ctx.services || ctx.category} designed for ${ctx.targetAudience}.\n\n` +
          `⭐ ${ctx.usp}`;
        hashtags = `${ctx.hashtags || `#${ctx.businessName.replace(/\s+/g, '')} #${ctx.category.replace(/[^a-zA-Z]/g, '')}`}`;
      }
    }

    return {
      caption,
      hashtags,
      cta: ctx.preferredCta,
      aiModelUsed: 'BrandSetu Brand Knowledge Engine',
      brandContextUsed: {
        businessName: ctx.businessName,
        category: ctx.category,
        location: ctx.location,
        usp: ctx.usp,
        tone,
        audience: ctx.targetAudience,
      },
    };
  }

  /**
   * Generates all 3 platform variations in one shot
   */
  static async generatePlatformVariations(clientId: string, topic?: string) {
    const ig = await this.generateCaption({ clientId, contentType: 'POST', platform: 'INSTAGRAM', topic });
    const fb = await this.generateCaption({ clientId, contentType: 'POST', platform: 'FACEBOOK', topic });
    const gbp = await this.generateCaption({ clientId, contentType: 'GOOGLE_BUSINESS_POST', platform: 'GOOGLE_BUSINESS', topic });

    return {
      instagram: ig,
      facebook: fb,
      googleBusiness: gbp,
    };
  }

  /**
   * Generate curated hashtags based on client location & category using Gemini AI
   */
  static async generateHashtags(clientId: string, topic?: string) {
    const ctx = await this.getClientContext(clientId);

    const prompt = `You are a social media hashtag strategist at BrandSetu Digital.
Generate 15 to 20 trending, niche-specific, and local community hashtags for:
- Client: ${ctx.businessName}
- Industry: ${ctx.category}
- City / Location: ${ctx.location}
${topic ? `- Post Topic: ${topic}` : ''}
${ctx.hashtags ? `- Custom brand tags: ${ctx.hashtags}` : ''}

Format instructions:
Return strictly a valid JSON object:
{
  "caption": "",
  "hashtags": "#Tag1 #Tag2 #Tag3 #Tag4..."
}`;

    try {
      const aiResult = await this.callGemini(prompt);
      if (aiResult?.hashtags && aiResult.hashtags.trim().length > 0) {
        return aiResult.hashtags.trim();
      }
    } catch {
      // Fallback below
    }

    const cleanName = ctx.businessName.replace(/[^a-zA-Z0-9]/g, '');
    const cleanLoc = ctx.location.replace(/[^a-zA-Z0-9]/g, '');
    const cleanCat = ctx.category.replace(/[^a-zA-Z0-9]/g, '');

    const tags = [
      `#${cleanName}`,
      `#${cleanLoc}`,
      `#${cleanCat}`,
      `#${cleanCat}${cleanLoc}`,
      `#Best${cleanCat}In${cleanLoc}`,
      `#Explore${cleanLoc}`,
      `#${cleanLoc}Diaries`,
      `#LocalLove`,
      `#SupportLocal${cleanLoc}`,
      `#TopRecommended`,
      `#MustTry`,
      `#TrendingNow`,
    ];

    if (ctx.hashtags) {
      const custom = ctx.hashtags.split(' ').filter(Boolean);
      return Array.from(new Set([...custom, ...tags])).join(' ');
    }

    return tags.join(' ');
  }

  /**
   * 30-Day AI Content Plan generator
   */
  static async generateMonthlyPlan(params: {
    clientId: string;
    month: string;
    year: number;
    postsCount: number;
    storiesCount: number;
    reelsCount: number;
  }) {
    const ctx = await this.getClientContext(params.clientId);
    const planItems = [];
    const totalItems = params.postsCount + params.storiesCount + params.reelsCount;
    const daysInMonth = 30;

    const topicsPool = [
      `Behind the scenes at ${ctx.businessName}: How we prepare for excellence`,
      `Customer spotlight: Real stories from our beloved ${ctx.location} community`,
      `Weekend special showcase: Why ${ctx.usp} makes all the difference`,
      `Did you know? Pro tips and insider advice on ${ctx.category}`,
      `Meet our passionate team making magic happen daily in ${ctx.location}`,
      `Interactive Poll & Q&A: What should we launch next?`,
      `Limited-time promotional spotlight: Don't miss out this season!`,
      `5 reasons why ${ctx.targetAudience} choose ${ctx.businessName}`,
      `Flash reel: Quick aesthetic tour of our space & offerings`,
      `Myth vs Fact: Clearing up the biggest misconceptions in ${ctx.category}`,
    ];

    let postIdx = 1;
    let storyIdx = 1;
    let reelIdx = 1;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = `${params.year}-${String(params.month === 'September' ? 9 : 10).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const topic = topicsPool[(day - 1) % topicsPool.length];

      // Distribute types evenly across days
      if (day % 3 === 1 && postIdx <= params.postsCount) {
        planItems.push({
          day,
          date: dayDate,
          contentType: 'POST',
          title: `Post #${postIdx}: ${topic}`,
          platforms: ['INSTAGRAM', 'FACEBOOK', 'GOOGLE_BUSINESS'],
          suggestedTime: '12:30 PM',
          topic,
          suggestedCaption: `🌟 ${topic}! Designed specially with ${ctx.usp} in mind for our wonderful ${ctx.location} community.\n\n${ctx.preferredCta}`,
        });
        postIdx++;
      } else if (day % 3 === 2 && reelIdx <= params.reelsCount) {
        planItems.push({
          day,
          date: dayDate,
          contentType: 'REEL',
          title: `Reel #${reelIdx}: Quick High-Energy Feature`,
          platforms: ['INSTAGRAM', 'FACEBOOK'],
          suggestedTime: '07:00 PM',
          topic: `High-energy visual showcase of ${topic}`,
          suggestedCaption: `🔥 Watch this before visiting us in ${ctx.location}! Save this reel for later. 👇`,
        });
        reelIdx++;
      } else if (storyIdx <= params.storiesCount) {
        planItems.push({
          day,
          date: dayDate,
          contentType: 'STORY',
          title: `Story #${storyIdx}: Daily Update & Engagement Poll`,
          platforms: ['INSTAGRAM', 'FACEBOOK'],
          suggestedTime: '10:00 AM',
          topic: `Interactive poll / behind the scenes`,
          suggestedCaption: `Good morning ${ctx.location}! Tap below to vote on your favorite choice today ✨`,
        });
        storyIdx++;
      }
    }

    return {
      clientId: params.clientId,
      businessName: ctx.businessName,
      month: params.month,
      year: params.year,
      summary: {
        posts: postIdx - 1,
        stories: storyIdx - 1,
        reels: reelIdx - 1,
        totalScheduledSlots: planItems.length,
      },
      plan: planItems,
    };
  }
}
