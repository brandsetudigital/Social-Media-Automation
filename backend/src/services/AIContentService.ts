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
            const isVideo = ['.mp4', '.mov', '.webm', '.mkv'].includes(ext);

            if (isVideo) {
              // Check if an extracted thumbnail exists for this video
              const base = path.basename(filePath, ext);
              const possibleThumbs = [
                `${base}_thumb.jpg`,
                `${base}_thumb.png`,
                `${base}.jpg`,
                `${base}.png`,
              ];
              for (const tName of possibleThumbs) {
                const tPath = path.join(dir, tName);
                if (fs.existsSync(tPath)) {
                  const tExt = path.extname(tPath).toLowerCase();
                  const tMime = tExt === '.png' ? 'image/png' : tExt === '.webp' ? 'image/webp' : 'image/jpeg';
                  const buffer = fs.readFileSync(tPath);
                  return `data:${tMime};base64,${buffer.toString('base64')}`;
                }
              }

              // Also check if any recent image creative exists in uploads for this client/topic
              try {
                const files = fs.readdirSync(dir);
                const clientPrefix = base.split('-')[1] || '';
                if (clientPrefix && clientPrefix.length > 3) {
                  const matchingImg = files.find(
                    (f) => f.toLowerCase().includes(clientPrefix.toLowerCase()) && /\.(jpe?g|png|webp)$/i.test(f)
                  );
                  if (matchingImg) {
                    const imgPath = path.join(dir, matchingImg);
                    const iExt = path.extname(imgPath).toLowerCase();
                    const iMime = iExt === '.png' ? 'image/png' : iExt === '.webp' ? 'image/webp' : 'image/jpeg';
                    const buffer = fs.readFileSync(imgPath);
                    return `data:${iMime};base64,${buffer.toString('base64')}`;
                  }
                }
              } catch {}

              // Never read a 40MB binary video directly as image/jpeg (causes Gemini payload error)
              return undefined;
            }

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
   * Asynchronously resolves media URL (including remote http/https images) to base64 data URL for Gemini Vision
   */
  private static async resolveMediaAsDataUrlAsync(mediaUrl?: string): Promise<string | undefined> {
    if (!mediaUrl) return undefined;
    if (mediaUrl.startsWith('data:image/')) return mediaUrl;

    const localResolved = this.resolveMediaAsDataUrl(mediaUrl);
    if (localResolved && localResolved.startsWith('data:image/')) {
      return localResolved;
    }

    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(mediaUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const contentType = res.headers.get('content-type') || 'image/jpeg';
          if (contentType.startsWith('image/')) {
            const arrayBuffer = await res.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            return `data:${contentType};base64,${base64}`;
          }
        }
      } catch (err) {
        console.warn('[AIContentService] Could not fetch remote media for vision AI:', err);
      }
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

    // Rich document knowledge extraction (both document summary, content, and file text on disk)
    const docKnowledgeParts: string[] = [];
    const uploadsDir = path.join(process.cwd(), 'uploads');

    for (const d of docs) {
      let docText = (d.summary || '').trim();
      if (d.fileUrl) {
        try {
          const fname = path.basename(d.fileUrl);
          const fullPath = path.join(uploadsDir, fname);
          if (fs.existsSync(fullPath)) {
            const raw = fs.readFileSync(fullPath, 'utf-8');
            docText = `${docText ? `${docText}\n\n` : ''}${raw.substring(0, 4000)}`.trim();
          }
        } catch {}
      }
      if (docText) {
        docKnowledgeParts.push(`--- DOCUMENT: ${d.title} (${d.fileType}) ---\n${docText}`);
      }
    }
    const documentKnowledge = docKnowledgeParts.join('\n\n');

    return {
      businessName: client.businessName,
      category: client.category,
      location: client.location,
      phone: client.phone || '',
      website: client.website || '',
      services: bp?.services || '',
      products: bp?.products || '',
      usp: bp?.usp || 'premium-quality solutions and unmatched customer satisfaction',
      targetAudience: bp?.targetAudience || 'families, professionals, and local businesses',
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
   * Calls Google Gemini API (gemini-3.5-flash-lite / gemini-3.5-flash / gemini-flash-lite-latest)
   */
  private static async callGemini(prompt: string, mediaUrl?: string): Promise<{ caption: string; captionHashtags?: string; commentHashtags?: string; hashtags: string } | null> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) return null;

    try {
      const parts: any[] = [{ text: prompt }];

      // Support Multimodal image input (local or remote base64 data URL)
      const resolvedMedia = await this.resolveMediaAsDataUrlAsync(mediaUrl);
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

      const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];

      for (const modelName of candidateModels) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s failover timeout

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
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
          clearTimeout(timeoutId);

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
          let parsedCaptionHashtags = '';
          let parsedCommentHashtags = '';

          try {
            const parsed = JSON.parse(cleaned);
            parsedCaption = parsed.caption || '';
            if (Array.isArray(parsed.hashtags)) {
              parsedHashtags = parsed.hashtags.join(' ');
            } else if (typeof parsed.hashtags === 'string') {
              parsedHashtags = parsed.hashtags;
            }

            if (parsed.captionHashtags) {
              parsedCaptionHashtags = Array.isArray(parsed.captionHashtags) ? parsed.captionHashtags.join(' ') : parsed.captionHashtags;
            }
            if (parsed.commentHashtags) {
              parsedCommentHashtags = Array.isArray(parsed.commentHashtags) ? parsed.commentHashtags.join(' ') : parsed.commentHashtags;
            }
          } catch {
            // Regex fallback if JSON had unescaped quotes or newlines
            const capMatch = cleaned.match(/"caption"\s*:\s*"([\s\S]*?)(?="\s*,\s*"[a-zA-Z]+"\s*:|"\s*\})/);
            if (capMatch) {
              parsedCaption = capMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
            } else {
              parsedCaption = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            }

            const capTagMatch = cleaned.match(/"captionHashtags"\s*:\s*"([^"]+)"/);
            if (capTagMatch) parsedCaptionHashtags = capTagMatch[1];

            const comTagMatch = cleaned.match(/"commentHashtags"\s*:\s*"([^"]+)"/);
            if (comTagMatch) parsedCommentHashtags = comTagMatch[1];

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
            return AIContentService.cleanCaptionAndSanitizeTags(
              parsedCaption,
              parsedCaptionHashtags || parsedHashtags,
              parsedCommentHashtags
            );
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
  private static async callOpenAI(prompt: string, mediaUrl?: string): Promise<{ caption: string; captionHashtags?: string; commentHashtags?: string; hashtags: string } | null> {
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are the Senior Social Media Strategist for BrandSetu Digital marketing agency. Respond ONLY in valid JSON with keys "caption", "captionHashtags", "commentHashtags", and "hashtags".',
            },
            { role: 'user', content: userContent },
          ],
          temperature: 0.7,
        }),
      });
      clearTimeout(timeoutId);

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
        const caption = parsed.caption || rawText;
        const captionHashtags = parsed.captionHashtags || parsed.hashtags || '';
        const commentHashtags = parsed.commentHashtags || '';

        return AIContentService.cleanCaptionAndSanitizeTags(caption, captionHashtags, commentHashtags);
      } catch {
        return AIContentService.cleanCaptionAndSanitizeTags(rawText);
      }
    } catch (err: any) {
      console.warn(`[OpenAI API Exception]: ${err.message}`);
      return null;
    }
  }

  /**
   * Sanitizes caption from AI sparkle/star emoji spam and robotic clichés
   */
  public static sanitizeAIEmojisAndJargon(text: string): string {
    if (!text) return '';
    let result = text;

    // 1. Remove cheesy sparkle/star header emojis and excessive emoji spam
    result = result.replace(/^[✨🌟⭐💫🚀🎉🔥\s]+|[✨🌟⭐💫🚀🎉🔥\s]+$/g, '');
    result = result.replace(/(^|\n)[✨🌟⭐💫🚀🎉🔥]+\s*([A-Za-z0-9])/g, '$1$2');
    result = result.replace(/([A-Za-z0-9])\s*[✨🌟⭐💫]+\s*(!|\.|\n|$)/g, '$1$2');
    result = result.replace(/✨|🌟/g, ''); // Purge sparkles and glowing stars entirely
    result = result.replace(/^([^\n]+)\n([A-Za-z])/m, '$1\n\n$2'); // Ensure clean paragraph spacing after header

    // 2. Fix grammatical & professional terminology identified by user
    result = result.replace(/\bPremium quality\b/g, 'premium-quality');
    result = result.replace(/\bDedicated to delivering\b/gi, 'committed to delivering');
    result = result.replace(/\bCrafted specially for\b/gi, 'Specially designed to meet the needs of');
    result = result.replace(/\bCrafted especially for\b/gi, 'Specially designed to meet the needs of');
    result = result.replace(/\bLocal Customers\b/g, 'local businesses');
    result = result.replace(/\bFamilies, Professionals and Local Customers\b/gi, 'families, professionals, and local businesses');
    result = result.replace(/\bFamilies, Professionals and Local businesses\b/gi, 'families, professionals, and local businesses');

    // 3. Clean robotic / AI CTA phrases
    result = result.replace(/💬\s*Drop a comment or DM us to know more!\s*👇/gi, 'Have questions? Connect with us via DM or leave a comment below.');
    result = result.replace(/Drop a comment or DM us to know more!\s*👇?/gi, 'Connect with us via DM or leave a comment below.');
    result = result.replace(/quality and excellence you can count on/gi, 'proven results you can rely on');
    result = result.replace(/Whether you're looking for top-tier [^.]+ we've got you covered\./gi, 'We provide focused, reliable solutions tailored to your goals.');

    return result.trim();
  }

  /**
   * Helper to extract clean city name from full address string
   */
  public static extractCity(loc?: string | null): string {
    if (!loc) return 'Indore';
    const clean = loc.trim();
    const knownCities = [
      'Indore', 'Bhopal', 'Ujjain', 'Dewas', 'Jabalpur', 'Gwalior',
      'Mumbai', 'Pune', 'Delhi', 'Jaipur', 'Ahmedabad', 'Bangalore', 'Hyderabad'
    ];
    for (const city of knownCities) {
      if (new RegExp(`\\b${city}\\b`, 'i').test(clean)) {
        return city;
      }
    }
    const parts = clean.split(',').map((p) => p.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const raw = parts[i].replace(/\d+/g, '').trim();
      if (raw && !/madhya\s*pradesh|m\.?p\.?|india|state/i.test(raw)) {
        const singleWord = raw.split(/\s+/)[0].replace(/[^a-zA-Z]/g, '');
        if (singleWord.length >= 3) return singleWord;
      }
    }
    return 'Indore';
  }

  /**
   * Cleans caption body by stripping any trailing hashtag blocks and ensures strictly 5 SEO hashtags
   */
  public static cleanCaptionAndSanitizeTags(
    rawCaption: string,
    rawCaptionHashtags?: string,
    rawCommentHashtags?: string,
    fallbackTags?: { captionHashtags: string; commentHashtags: string }
  ): { caption: string; captionHashtags: string; commentHashtags: string; hashtags: string } {
    // 1. Extract any embedded hashtags from the raw caption
    const embeddedTags = ((rawCaption || '').match(/#[A-Za-z0-9_]+/g) || []).map((t) => t.trim());

    // 2. Strip hashtags from rawCaption (strip trailing blocks of hashtags or standalone tag lines)
    const lines = (rawCaption || '').split('\n');
    while (lines.length > 0) {
      const lastLine = lines[lines.length - 1].trim();
      if (!lastLine) {
        lines.pop();
        continue;
      }
      const lineTags = lastLine.match(/#[A-Za-z0-9_]+/g) || [];
      const lineWords = lastLine.split(/\s+/).filter(Boolean);
      // If line is predominantly or purely hashtags, remove it from caption
      if (lineTags.length > 0 && lineTags.length >= lineWords.length * 0.6) {
        lines.pop();
      } else {
        break;
      }
    }
    let cleanedCaption = lines.join('\n').trim();
    // Also remove any remaining trailing hashtags at the end of the text
    cleanedCaption = cleanedCaption.replace(/(?:[\s\r\n]*#[A-Za-z0-9_]+)+$/g, '').trim();

    // 2.5 Purge cheesy AI emoji sparkles and robotic AI clichés from caption
    cleanedCaption = AIContentService.sanitizeAIEmojisAndJargon(cleanedCaption);

    // 3. Identify brand base tag from fallbackTags.commentHashtags (e.g. #PannaSweets)
    const brandBaseTag = (fallbackTags?.commentHashtags || '').split(/\s+/)[0]?.trim();
    const brandRoot = brandBaseTag ? brandBaseTag.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

    // 4. Pool caption hashtags - keep brand tag and viral tags reserved for comment
    const viralCommentSet = new Set(['fyp', 'reach', 'reels', 'viral', 'trending', 'explore']);
    const captionPool: string[] = [];
    const addCaptionTag = (tag: string) => {
      const t = tag.trim();
      if (!t) return;
      const formatted = t.startsWith('#') ? t : `#${t}`;
      const root = formatted.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (root === brandRoot || viralCommentSet.has(root)) return; // Keep brand and viral tags for comment!
      if (!captionPool.map((x) => x.toLowerCase().replace(/[^a-z0-9]/g, '')).includes(root)) {
        captionPool.push(formatted);
      }
    };

    (rawCaptionHashtags || '').split(/\s+/).forEach(addCaptionTag);
    embeddedTags.forEach(addCaptionTag);
    (fallbackTags?.captionHashtags || '').split(/\s+/).forEach(addCaptionTag);

    // Ensure all 5 algorithm growth tags are in captionPool as requested by user
    const growthCaptionTags = ['#growth', '#engagement', '#like', '#share', '#grow'];
    for (const g of growthCaptionTags) {
      const gRoot = g.replace(/[^a-z0-9]/g, '');
      if (!captionPool.some((x) => x.toLowerCase().replace(/[^a-z0-9]/g, '') === gRoot)) {
        captionPool.push(g);
      }
    }

    // Niche/category tags first (up to 5) + the 5 growth tags
    const nicheCap = captionPool.filter((t) => !growthCaptionTags.map((x) => x.toLowerCase()).includes(t.toLowerCase())).slice(0, 5);
    const finalCaptionTags = [...nicheCap, ...growthCaptionTags].slice(0, 10).join(' ');

    // 5. Pool comment hashtags - ALWAYS start with Brand Base Tag + Viral tags
    const captionRoots = new Set(
      finalCaptionTags.toLowerCase().split(/\s+/).map((x) => x.replace(/[^a-z0-9]/g, ''))
    );
    const commentPool: string[] = [];
    const addCommentTag = (tag: string) => {
      const t = tag.trim();
      if (!t) return;
      const formatted = t.startsWith('#') ? t : `#${t}`;
      const root = formatted.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!captionRoots.has(root) && !commentPool.some((c) => c.toLowerCase().replace(/[^a-z0-9]/g, '') === root)) {
        commentPool.push(formatted);
      }
    };

    // First add brand base tag if available
    if (brandBaseTag) {
      addCommentTag(brandBaseTag);
    }
    // Then add rawCommentHashtags and fallback comment hashtags
    (rawCommentHashtags || '').split(/\s+/).forEach(addCommentTag);
    (fallbackTags?.commentHashtags || '').split(/\s+/).forEach(addCommentTag);

    // Guarantee the 6 required viral reach tags in comment
    const requiredViralComment = ['#fyp', '#reach', '#reels', '#viral', '#trending', '#explore'];
    for (const v of requiredViralComment) {
      addCommentTag(v);
    }

    // High impact comment boost hashtags (up to 12 tags)
    const finalCommentTags = commentPool.slice(0, 12).join(' ');

    return {
      caption: cleanedCaption,
      captionHashtags: finalCaptionTags,
      commentHashtags: finalCommentTags,
      hashtags: finalCaptionTags,
    };
  }

  /**
   * Generates client-tailored, industry-specific 4-5 caption hashtags + 5 first-comment hashtags
   * strictly adapted to client's industry, brand, and city.
   */
  static generateClientTailoredHashtags(client: {
    businessName: string;
    category?: string;
    location?: string;
    brandProfile?: { hashtags?: string; keywords?: string; services?: string } | null;
  }, topic?: string): { captionHashtags: string; commentHashtags: string; allHashtags: string } {
    const rawName = client.businessName || 'Brand';
    let cleanName = rawName.replace(/[^a-zA-Z0-9]/g, '');
    if (/panna/i.test(rawName)) cleanName = 'PannaSweets';
    else if (/property\s*babu/i.test(rawName)) cleanName = 'PropertyBabu';
    else if (/7th\s*cloud/i.test(rawName)) cleanName = '7thCloudResorts';
    else if (/cocodan/i.test(rawName)) cleanName = 'HotelCocodan';
    else if (/airawati/i.test(rawName)) cleanName = 'AirawatiFashions';
    else if (/dagur/i.test(rawName)) cleanName = 'DagurInfra';
    else if (/microbhumi/i.test(rawName)) cleanName = 'Microbhumi';
    else if (/radha\s*ki\s*rasoi/i.test(rawName)) cleanName = 'RadhaKiRasoi';
    else if (/swastik\s*thal/i.test(rawName)) cleanName = 'SwastikThal';
    else if (/brandsetu/i.test(rawName)) cleanName = 'BrandSetuDigital';
    else if (/about\s*us/i.test(rawName)) cleanName = 'AboutUsTheFamilyStore';

    const cleanLoc = this.extractCity(client.location);
    const categoryLower = ((client.category || '') + ' ' + (rawName || '') + ' ' + (topic || '')).toLowerCase();

    // Trending viral reach & growth hashtags as requested by user:
    // Caption: Niche Category tags + #growth #engagement #like #share #grow
    // Comment: Brand Base Tag (#${cleanName}) + #fyp #reach #reels #viral #trending #explore
    const captionGrowthTags = ['#growth', '#engagement', '#like', '#share', '#grow'];
    const commentViralTags = ['#fyp', '#reach', '#reels', '#viral', '#trending', '#explore'];

    let captionTags: string[] = [];
    let commentTags: string[] = [`#${cleanName}`, ...commentViralTags];

    // 1. Resort, Hotel, Club, Bar, Lounge & Hospitality (e.g. 7th Cloud Resorts, Hotel Cocodan)
    if (/resort|hotel|club|bar|lounge|staycation|hospitality|cocodan|7th\s*cloud/i.test(categoryLower)) {
      captionTags = [
        `#${cleanLoc}Nightlife`,
        `#ResortLife`,
        `#WeekendVibes`,
        `#LuxuryStay`,
        `#IndoreParties`,
      ];
      commentTags = [
        `#${cleanName}`,
        '#PartyDestination',
        '#ClubVibes',
        '#CocktailHour',
        '#StaycationVibes',
        ...commentViralTags,
      ];
    }
    // 2. Pure Sweets, Mithai, Bakery & Confectionery (e.g. Panna Sweets)
    else if (/sweet|mithai|bakery|namkeen|confectionery|dessert|panna\s*sweet/i.test(categoryLower)) {
      captionTags = [
        `#${cleanLoc}Sweets`,
        `#MithaiLovers`,
        `#DesiFlavors`,
        `#AuthenticTaste`,
        `#TraditionalMithai`,
      ];
      commentTags = [
        `#${cleanName}`,
        '#IndianSweets',
        '#SweetTooth',
        '#DessertGram',
        '#MithaiMagic',
        ...commentViralTags,
      ];
    }
    // 3. Restaurants, Cafes, Dining & Thal (e.g. Swastik Thal, Radha Ki Rasoi)
    else if (/restaurant|cafe|dining|kitchen|thal|rasoi|dhaba|bhojanalaya|fast\s*food|food/i.test(categoryLower)) {
      captionTags = [
        `#${cleanLoc}Foodie`,
        `#IndoreFoodies`,
        `#FoodLovers`,
        `#FineDining`,
        `#TasteOfIndore`,
      ];
      commentTags = [
        `#${cleanName}`,
        '#FoodGram',
        '#InstaFood',
        '#DeliciousEats',
        '#FoodPhotography',
        ...commentViralTags,
      ];
    } else if (/real\s*estate|property|plot|flat|builder|construction|babu|broker|infra/i.test(categoryLower)) {
      captionTags = [
        `#${cleanLoc}RealEstate`,
        `#PlotsIn${cleanLoc}`,
        `#RealEstateIndia`,
        `#PropertyAdvisory`,
        `#IndoreProperties`,
      ];
      commentTags = [
        `#${cleanName}`,
        '#PropertyInvestment',
        '#PlotsForSale',
        '#TrustedAdvisory',
        '#CommercialProperty',
        ...commentViralTags,
      ];
    } else if (/fashion|saree|ethnic|boutique|cloth|apparel|dress|kurti|garment|family\s*store|about\s*us|airawati/i.test(categoryLower)) {
      captionTags = [
        `#${cleanLoc}Fashion`,
        `#FamilyWear`,
        `#TrendingStyle`,
        `#IndianCouture`,
        `#EthnicFashion`,
      ];
      commentTags = [
        `#${cleanName}`,
        '#SareeLove',
        '#StyleInspo',
        '#BoutiqueCollection',
        '#TraditionalWear',
        ...commentViralTags,
      ];
    } else if (/marketing|digital|agency|brandsetu|social\s*media|seo|software|it\s*services|creative/i.test(categoryLower)) {
      captionTags = [
        `#SocialMediaMarketing`,
        `#DigitalGrowth`,
        `#BrandStrategy`,
        `#AgencyLife`,
        `#BusinessMarketing`,
      ];
      commentTags = [
        `#${cleanName}`,
        '#MarketingAgency',
        '#BrandBuilding',
        '#ContentCreation',
        '#ViralMarketing',
        ...commentViralTags,
      ];
    } else if (/health|clinic|doctor|dental|hospital|wellness|fitness|gym|yoga/i.test(categoryLower)) {
      captionTags = [
        `#${cleanLoc}Health`,
        `#MedicalCare`,
        `#WellnessJourney`,
        `#HealthyLife`,
        `#HealthcareTips`,
      ];
      commentTags = [
        `#${cleanName}`,
        '#DoctorCare',
        '#HealthyLiving',
        '#WellnessGoals',
        '#MedicalClinic',
        ...commentViralTags,
      ];
    } else if (/education|coach|class|school|institute|academy|learn|college/i.test(categoryLower)) {
      captionTags = [
        `#${cleanLoc}Education`,
        `#TopRankers`,
        `#ExamPreparation`,
        `#AcademicExcellence`,
        `#StudySmart`,
      ];
      commentTags = [
        `#${cleanName}`,
        '#LearningHub',
        '#CareerGoals',
        '#StudentSuccess',
        '#EducationFirst',
        ...commentViralTags,
      ];
    } else if (/jewel|gold|diamond|silver|bridal|ornament/i.test(categoryLower)) {
      captionTags = [
        `#${cleanLoc}Jewellery`,
        `#GoldCollection`,
        `#BridalJewels`,
        `#FineCraftsmanship`,
        `#JewelryDesign`,
      ];
      commentTags = [
        `#${cleanName}`,
        '#GoldJewellery',
        '#DiamondJewels',
        '#BridalSet',
        '#TimelessElegance',
        ...commentViralTags,
      ];
    } else {
      // Dynamic synthesis for any other client category
      const cleanCat = (client.category || 'Business').replace(/[^a-zA-Z0-9]/g, '');
      captionTags = [
        `#${cleanCat}${cleanLoc}`,
        `#BestIn${cleanLoc}`,
        `#${cleanCat}India`,
        `#Trusted${cleanCat}`,
      ];
      commentTags = [
        `#${cleanName}`,
        `#${cleanName}${cleanLoc}`,
        ...commentViralTags,
      ];
    }

    // Merge growth caption tags so caption has the 5 growth tags
    captionTags = Array.from(new Set([...captionTags, ...captionGrowthTags]));

    // Merge custom brand tags if client configured them
    if (client.brandProfile?.hashtags) {
      const customList = client.brandProfile.hashtags
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith('#') ? t : `#${t}`));
      if (customList.length > 0) {
        commentTags = [customList[0], ...commentTags.filter((t) => t !== customList[0])].slice(0, 12);
        if (customList.length > 1) {
          const comRoots = new Set(commentTags.map((x) => x.toLowerCase().replace(/[^a-z0-9]/g, '')));
          const nonOverlappingCustom = customList.slice(1).filter((x) => !comRoots.has(x.toLowerCase().replace(/[^a-z0-9]/g, '')));
          if (nonOverlappingCustom.length > 0) {
            captionTags = [nonOverlappingCustom[0], ...captionTags.filter((t) => t !== nonOverlappingCustom[0])].slice(0, 10);
          }
        }
      }
    }

    // Guarantee all 5 growth caption tags (#growth #engagement #like #share #grow) + up to 5 niche tags in caption
    const nicheCap = captionTags.filter((t) => !captionGrowthTags.includes(t.toLowerCase())).slice(0, 5);
    const cTags = Array.from(new Set([...nicheCap, ...captionGrowthTags])).join(' ');

    // Guarantee brand base tag + all 6 viral comment tags (#fyp #reach #reels #viral #trending #explore) in comment
    const cRoots = new Set(cTags.toLowerCase().split(/\s+/).map((x) => x.replace(/[^a-z0-9]/g, '')));
    const nicheCom = commentTags.filter((t) => {
      const root = t.toLowerCase().replace(/[^a-z0-9]/g, '');
      return !cRoots.has(root) && !commentViralTags.includes(t.toLowerCase());
    }).slice(0, 6);
    const cmTags = Array.from(new Set([...nicheCom, ...commentViralTags])).join(' ');

    return {
      captionHashtags: cTags,
      commentHashtags: cmTags,
      allHashtags: `${cTags} ${cmTags}`,
    };
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

- Platform: ${params.platform} (${params.platform})
- Content Type: ${params.contentType} (${params.contentType === 'REEL' ? 'REEL / SHORT VIDEO' : params.contentType})
- Topic / Creative Title: ${topic}
${params.mediaUrl ? `- Visual Media is attached with this request.
CRITICAL VISUAL MEDIA ANALYSIS RULE:
1. Carefully inspect the visual elements in the attached image or video frame:
   - Identify the exact product, food dish, outfit, plot/flat property, or service shown.
   - Read all visible text on the creative (brand name, headings, price/offers, location, road, phone number).
   - Write the caption based DIRECTLY on what is visible in this visual media.
2. For REEL / VIDEO:
   - Start line 1 with an irresistible 3-second hook (e.g., "Wait for the end! 🔥", "Indore ki sabse famous...", "Save this reel for your next visit 📌").
   - Keep the rhythm fast, punchy, and sound-friendly with a viral CTA like "Double tap if you want to try this ❤️" or "Share with your foodie squad 🚀".
3. For POST IMAGE:
   - Start with an engaging headline/hook highlighting the visual subject.
   - Describe the authentic taste, quality, craftsmanship, or value points shown in the photo.
   - Use clean line breaks, aesthetic emojis, and a clear call-to-action.` : ''}

CRITICAL RULES:
1. CAPTION LENGTH GUIDELINES (STRICT WORD COUNTS):
   - For INSTAGRAM: Strictly 40–100 words.
   - For FACEBOOK: Strictly 40–100 words.
   - For LINKEDIN: Strictly 80–150 words.
   - For Promotional posts: Strictly 30–60 words.
   - For Educational posts: Strictly 60–120 words.
   - For Festival posts: Strictly 15–40 words (Warm greeting + emotion only, NO sales pitch!).
2. PURPOSE-DRIVEN CAPTION ARCHITECTURE (DO NOT FORCE ALL ELEMENTS IN EVERY POST):
   - Adapt strictly according to the post purpose:
     * Product post -> Features + Benefits + CTA
     * Service post -> Problem + Solution + Benefits (+ optional CTA)
     * Educational post -> Information + Value + CTA
     * Festival post -> Greeting + Emotion (Keep it warm, heartfelt, and concise; NO sales pitch!)
     * Brand post -> Identity + Trust + USP
3. ANTI-AI JARGON & EMOJI RESTRAINT:
   - NEVER use sparkle/star icons (✨, 🌟) or celebratory emoji spam (🎉, 🚀, 👇, 💬).
   - Use at most 0 to 1 subtle contextual emoji, or NO emojis at all.
   - Use "premium-quality" (lowercase hyphenated modifier).
   - Use "committed to delivering" instead of "dedicated to delivering".
   - Use "specially designed to meet the needs of" instead of "crafted specially for".
   - Do NOT randomly capitalize common nouns (e.g. write "families, professionals, and local businesses").
4. FOR CONTACT DETAILS & LOCATION (VERY IMPORTANT):
   - If the creative image contains a phone number, address, or location, ONLY use the exact contact details or location shown in the creative or specified in the client profile.
   - If the creative image and client profile do NOT have a phone number or address, DO NOT invent, hallucinate, or add any placeholder contact number or fake address ("sirf wahi dalna jo image me ho, nahi to nahi dalna"). Never invent random digits or locations.
5. For INSTAGRAM: Start with a powerful hook, clean spacing, highlight location & key benefits, natural conversational tone, and end with the client CTA / contact (if available).
6. For FACEBOOK: Friendly, community-oriented, clear details, phone/website contact (if available), and convenient location${ctx.location ? ` in ${ctx.location}` : ''}.
7. For LINKEDIN: Professional perspective on market opportunity, ROI, trust, infrastructure growth, and investment fundamentals.
8. For TWITTER: Concise, punchy alert with key details and link to website (if available).
9. For YOUTUBE: Video description format with timestamps, project highlights, contact (if available), and subscribe CTA.
10. For GOOGLE_BUSINESS: Professional local update, rich SEO keywords${ctx.location ? ` for ${ctx.location}` : ''}, clear directions/call CTA.
11. HASHTAG STRATEGY (TARGETED SEO + ALGORITHM GROWTH):
   - In "caption": DO NOT INCLUDE ANY HASHTAGS WHATSOEVER. The caption text must be pure, clean copy (hook, body, value points, CTA). Do NOT append any hashtags at the end of "caption".
   - In "captionHashtags": Return 8 to 10 high-impact keywords/hashtags for the caption (including niche keywords for ${ctx.businessName} and algorithm growth tags: #growth #engagement #like #share #grow).
     Must be targeted keywords strictly relevant to ${ctx.businessName} (${ctx.category} in ${ctx.location}).
      STRICT CATEGORY ISOLATION:
      * If ${ctx.businessName} is a Resort, Hotel, Club, or Bar (e.g. 7th Cloud Resorts, Hotel Cocodan), NEVER use mithai, sweets, or bakery tags. Use #ResortLife #Nightlife #WeekendVibes #LuxuryStay #Staycation.
      * If ${ctx.businessName} is a pure Sweets/Mithai shop (e.g. Panna Sweets), use #MithaiLovers #IndianSweets #AuthenticTaste.
      * If ${ctx.businessName} is a Restaurant or Cafe (e.g. Swastik Thal, Radha Ki Rasoi), use #FoodLovers #FineDining #Foodie (NEVER sweet/mithai tags unless specifically sweet dishes).
      * If Real Estate (e.g. Property Babu, DagurInfra, Microbhumi), use #Plots #RealEstate #PropertyInvestment.
      * If Fashion (e.g. About Us The Family Store, Airawati), use #Fashion #EthnicWear #FamilyWear.
   - In "commentHashtags": Return 8 to 12 targeted viral discovery hashtags for the first comment (MUST include the brand base tag like #${ctx.businessName.replace(/[^a-zA-Z0-9]/g, '')} AND viral tags: #fyp #reach #reels #viral #trending #explore). CRITICAL: "commentHashtags" MUST BE 100% DIFFERENT from "captionHashtags" (ZERO duplicate or overlapping words/tags).

OUTPUT FORMAT:
Return strictly a valid JSON object without any other text or explanation:
{
  "caption": "<generated caption with emojis and spacing, WITHOUT any hashtags>",
  "captionHashtags": "#Tag1 #Tag2 #Tag3 #Tag4 #Tag5 #Tag6 #Tag7 #Tag8",
  "commentHashtags": "#TagA #TagB #TagC #TagD #TagE #TagF #TagG #TagH",
  "hashtags": "#Tag1 #Tag2 #Tag3 #Tag4 #Tag5 #Tag6 #Tag7 #Tag8"
}`;

    // 2. Try Gemini first, then OpenAI ChatGPT with fallback
    let aiResult: { caption: string; captionHashtags?: string; commentHashtags?: string; hashtags: string } | null = null;
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
      const tailored = this.generateClientTailoredHashtags(ctx, topic);
      const sanitized = AIContentService.cleanCaptionAndSanitizeTags(
        aiResult.caption,
        aiResult.captionHashtags,
        aiResult.commentHashtags,
        tailored
      );

      return {
        caption: sanitized.caption,
        captionHashtags: sanitized.captionHashtags,
        commentHashtags: sanitized.commentHashtags,
        hashtags: sanitized.captionHashtags,
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
          `${cleanTopic} | ${locationArea}\n\n` +
          `Looking for prime verified plots in one of the highest-growth corridors? ${ctx.businessName} provides verified property options with 100% transparent and reliable guidance.\n\n` +
          `Key Highlights:\n` +
          `• Direct connectivity to major transit routes\n` +
          `• High capital appreciation and ROI potential\n` +
          `• 100% verified documentation and clear titles\n\n` +
          `Reach out via DM or comment below to receive layout plans and complete project details.`,

          `Property Opportunity: ${cleanTopic}\n\n` +
          `Whether planning your next home or a long-term property investment, ${ctx.businessName} ensures transparent, hassle-free guidance.\n\n` +
          `Highlights:\n` +
          `• 100% clear title and verified paperwork\n` +
          `• Rapid infrastructure growth in this corridor\n` +
          `• High appreciation potential\n\n` +
          `Save this post and message us for location and site visit details.`,

          `Prime Property Opportunity: ${cleanTopic}\n\n` +
          `Smart investing starts with verified land. ${ctx.businessName} guides families and investors to verified, high-return property opportunities in ${locationArea}.\n\n` +
          `Interested? Comment below or send a message to receive the full layout breakdown.`
        ];
        caption = templates[Math.floor(Math.random() * templates.length)];
        hashtags = `${ctx.hashtags || '#PropertyBabu #RealEstateIndore #IndoreProperties #PlotsInIndore #IndoreRealEstate #InvestIndore #TrustedPropertyPartner'}`;
      } else if (platformUpper === 'FACEBOOK') {
        caption = `Property opportunity in ${locationArea}: ${cleanTopic}\n\n` +
          `At ${ctx.businessName}, our mission is straightforward: ${ctx.usp}.\n\n` +
          `Why choose this opportunity:\n` +
          `• Excellent connectivity to major transit hubs\n` +
          `• Peaceful living environment with structured planning\n` +
          `• 100% transparent paperwork & verified land registry\n\n` +
          `Send us a message or leave a comment below to learn more.`;
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
      const audienceClean = (ctx.targetAudience || 'local businesses and growing brands')
        .replace(/Local Customers/gi, 'local businesses')
        .replace(/Families, Professionals and Local Customers/gi, 'families, professionals, and local businesses');
      const uspClean = (ctx.usp || 'reliable excellence')
        .replace(/Premium quality/gi, 'premium-quality solutions')
        .replace(/Dedicated to delivering/gi, 'committed to delivering');

      if (platformUpper === 'INSTAGRAM') {
        const generalTemplates = [
          `${cleanTopic}\n\n` +
          `At ${ctx.businessName}, we are committed to delivering ${uspClean}.\n\n` +
          `Specially designed to meet the needs of ${audienceClean}, our focus is on providing reliable, high-standard solutions you can count on.\n\n` +
          `Have a project or question? Connect with us via DM or leave your thoughts below.`,

          `Spotlight: ${cleanTopic}\n\n` +
          `Consistency and clear communication drive great results. At ${ctx.businessName}, we partner with ${audienceClean} to deliver impactful solutions.\n\n` +
          `Save this post for your reference, or reach out to see how we can collaborate.`,

          `A quick perspective on ${cleanTopic}\n\n` +
          `At ${ctx.businessName}, our mission is straightforward: ${uspClean}.\n\n` +
          `What has been your main focus this month? Let us know in the comments.`
        ];
        caption = generalTemplates[Math.floor(Math.random() * generalTemplates.length)];
        hashtags = `${ctx.hashtags || '#BrandSetu'} #${ctx.businessName.replace(/\s+/g, '')} #${ctx.category.replace(/[^a-zA-Z]/g, '')} #BusinessGrowth #Strategy`;
      } else if (platformUpper === 'FACEBOOK') {
        caption = `${cleanTopic}\n\n` +
          `At ${ctx.businessName}, we are committed to delivering ${uspClean}.\n\n` +
          `Specially designed to meet the needs of ${audienceClean}, our focus remains on providing reliable, high-standard solutions that help you grow.\n\n` +
          `Reach out to our team today or leave a comment to learn more.`;
        hashtags = `#${ctx.businessName.replace(/\s+/g, '')} #${ctx.category.replace(/[^a-zA-Z]/g, '')}`;
      } else if (platformUpper === 'LINKEDIN') {
        caption = `Driving impact with ${cleanTopic}.\n\n` +
          `At ${ctx.businessName}, we believe in creating real value for ${audienceClean} by focusing on ${uspClean}.\n\n` +
          `Key Takeaways:\n` +
          `• Excellence in delivery across every touchpoint\n` +
          `• Customer-centric approach tailored for sustainable results\n\n` +
          `How is your organization approaching growth this year? Let's connect and discuss in the comments.`;
        hashtags = `#${ctx.businessName.replace(/\s+/g, '')} #Leadership #BusinessGrowth #Innovation`;
      } else if (platformUpper === 'TWITTER' || platformUpper === 'X') {
        caption = `${cleanTopic} - updates from ${ctx.businessName}. Focused on ${uspClean}. What are your thoughts on this? Let us know below.`;
        hashtags = `#${ctx.businessName.replace(/\s+/g, '')} #Business`;
      } else if (platformUpper === 'YOUTUBE') {
        caption = `${cleanTopic} | ${ctx.businessName}\n\n` +
          `Welcome to the official channel of ${ctx.businessName}!\n\n` +
          `In today's video: ${cleanTopic}.\n` +
          `About us: ${ctx.businessName} delivers ${uspClean}.\n\n` +
          `Subscribe for regular industry insights and updates.`;
        hashtags = `#${ctx.businessName.replace(/\s+/g, '')} #${ctx.category.replace(/[^a-zA-Z]/g, '')}`;
      } else {
        // GOOGLE_BUSINESS
        caption = `${cleanTopic} - ${ctx.businessName}\n\n` +
          `Serving authentic, high-quality ${ctx.services || ctx.category} designed for ${audienceClean}.\n\n` +
          `Committed to delivering: ${uspClean}`;
        hashtags = `${ctx.hashtags || `#${ctx.businessName.replace(/\s+/g, '')} #${ctx.category.replace(/[^a-zA-Z]/g, '')}`}`;
      }
    }

    const tailored = this.generateClientTailoredHashtags(ctx, topic);
    const sanitized = AIContentService.cleanCaptionAndSanitizeTags(
      caption,
      hashtags,
      undefined,
      tailored
    );

    return {
      caption: sanitized.caption,
      captionHashtags: sanitized.captionHashtags,
      commentHashtags: sanitized.commentHashtags,
      hashtags: sanitized.captionHashtags,
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
Generate client-specific, high-reach SEO hashtags tailored strictly to:
- Client: ${ctx.businessName}
- Industry: ${ctx.category}
- City / Location: ${ctx.location}
${topic ? `- Post Topic: ${topic}` : ''}
${ctx.hashtags ? `- Custom brand tags: ${ctx.hashtags}` : ''}

CRITICAL RULES:
1. Provide "captionHashtags": 8 to 10 high-impact SEO hashtags for caption (niche keywords for ${ctx.businessName} plus growth tags like #growth #engagement #like #share #grow).
2. Provide "commentHashtags": 8 to 12 targeted viral discovery hashtags for the first comment (MUST include the brand base tag #${ctx.businessName.replace(/[^a-zA-Z0-9]/g, '')} and viral tags: #fyp #reach #reels #viral #trending #explore).
3. CRITICAL: "commentHashtags" MUST BE 100% DIFFERENT from "captionHashtags" (ZERO duplicate or overlapping words/tags). Every client MUST have unique hashtags matching their specific niche.

Format instructions:
Return strictly a valid JSON object:
{
  "caption": "",
  "captionHashtags": "#Tag1 #Tag2 #Tag3 #Tag4 #Tag5 #Tag6 #Tag7 #Tag8",
  "commentHashtags": "#TagA #TagB #TagC #TagD #TagE #TagF #TagG #TagH",
  "hashtags": "#Tag1 #Tag2 #Tag3 #Tag4 #Tag5 #Tag6 #Tag7 #Tag8"
}`;

    try {
      const aiResult = await this.callGemini(prompt);
      if (aiResult?.captionHashtags || aiResult?.hashtags) {
        const tailored = this.generateClientTailoredHashtags(ctx, topic);
        const sanitized = AIContentService.cleanCaptionAndSanitizeTags(
          '',
          aiResult.captionHashtags || aiResult.hashtags,
          aiResult.commentHashtags,
          tailored
        );
        return {
          captionHashtags: sanitized.captionHashtags,
          commentHashtags: sanitized.commentHashtags,
          hashtags: sanitized.captionHashtags,
        };
      }
    } catch {
      // Fallback below
    }

    const tailored = this.generateClientTailoredHashtags(ctx, topic);
    return {
      captionHashtags: tailored.captionHashtags,
      commentHashtags: tailored.commentHashtags,
      hashtags: tailored.captionHashtags,
    };
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
