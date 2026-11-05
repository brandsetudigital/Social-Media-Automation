import prisma from '../prisma';
import { GoogleBusinessService } from './GoogleBusinessService';
import { AIContentService } from './AIContentService';

export class GmbReviewService {
  /**
   * Generates a tailored, natural, professional AI reply based on star rating & review comment
   */
  static async generateAiReviewReply(params: {
    clientName: string;
    reviewerName: string;
    starRating: number;
    comment?: string | null;
    location?: string;
    phone?: string;
  }): Promise<string> {
    const { clientName, reviewerName, starRating, comment, location, phone } = params;
    const nameToGreet = reviewerName && !reviewerName.toLowerCase().includes('customer') ? reviewerName.trim() : 'Valued Customer';
    const rawComment = (comment || '').trim();

    // 1. Try OpenAI or Gemini LLM for dynamic, authentic human-like reply
    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    const systemPrompt = `You are writing an authentic, human Google Review reply as the business owner/manager of "${clientName}" (${location || 'India'}).
Customer Name: ${nameToGreet}
Rating: ${starRating} Star(s) out of 5
Customer Review: "${rawComment || 'Only gave star rating, no text'}"
${phone ? `Business Helpline: ${phone}` : ''}

CRITICAL RULES:
1. SOUND COMPLETELY HUMAN AND NATURAL — never write robotic, stiff, or canned AI replies.
2. If customer mentioned specific things (food dishes, room comfort, plot registration, marketing leads, staff behavior, delays), DIRECTLY address those details in your reply.
3. If 5 Stars: Express genuine, personal gratitude, mention ${clientName}, and warmly invite them back.
4. If 4 Stars: Thank them warmly, and mention our dedication to making their next experience a full 5-star one.
5. If 3 Stars: Appreciate their constructive review, state our dedication to quality, and welcome direct feedback.
6. If 1-2 Stars: Give a sincere, empathetic apology without making excuses, validate their concern, and invite them to reach out directly at ${phone || 'our customer care helpline'} so the owner/management can resolve it.
7. Length: 2 to 3 sentences maximum.
8. DO NOT use generic phrases like "Dear Valued Customer, we are delighted". Make each reply fresh, unique, and natural.
Return ONLY the final reply text without quotes or preamble.`;

    // Try OpenAI if available
    if (openAiKey) {
      try {
        const oRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.8,
            max_tokens: 200,
          }),
        });
        if (oRes.ok) {
          const oData: any = await oRes.json();
          const txt = oData.choices?.[0]?.message?.content?.trim();
          if (txt) return txt.replace(/^["']|["']$/g, '');
        }
      } catch {}
    }

    // Try Gemini if available
    if (geminiKey) {
      const candidateModels = ['gemini-2.5-flash-lite', 'gemini-flash-latest'];
      for (const modelName of candidateModels) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: { temperature: 0.8, maxOutputTokens: 250 },
              }),
            }
          );
          clearTimeout(timeoutId);
          if (res.ok) {
            const data: any = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) return text.replace(/^["']|["']$/g, '');
          }
        } catch {}
      }
    }

    // 2. High-Quality Contextual & Randomized Dynamic Fallback (Varied & Natural)
    const lowerComment = rawComment.toLowerCase();
    const greetings = [
      `Dear ${nameToGreet},`,
      `Hello ${nameToGreet}!`,
      `Hi ${nameToGreet},`,
      `Thank you ${nameToGreet},`,
      `Warm greetings ${nameToGreet},`
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    let topicSentence = '';
    if (lowerComment.includes('sweet') || lowerComment.includes('gulab') || lowerComment.includes('food') || lowerComment.includes('taste') || lowerComment.includes('dine') || lowerComment.includes('restaurant') || lowerComment.includes('dish') || lowerComment.includes('snack') || lowerComment.includes('dinner') || lowerComment.includes('lunch') || lowerComment.includes('thali') || lowerComment.includes('delicious') || lowerComment.includes('yummy')) {
      const foodPhrases = [
        'We are so happy to know you enjoyed our food and flavors!',
        'Our kitchen team is thrilled to hear your compliments on the taste and quality.',
        'Knowing that you had a wonderful dining experience brings a big smile to our entire team.',
        'Delicious taste and fresh quality are what we care about most every single day.'
      ];
      topicSentence = foodPhrases[Math.floor(Math.random() * foodPhrases.length)];
    } else if (lowerComment.includes('plot') || lowerComment.includes('property') || lowerComment.includes('office') || lowerComment.includes('real estate') || lowerComment.includes('land') || lowerComment.includes('documentation') || lowerComment.includes('registry') || lowerComment.includes('deal') || lowerComment.includes('investment')) {
      const propPhrases = [
        'Ensuring a transparent, smooth, and hassle-free property experience is always our highest commitment.',
        'Thank you for placing your trust in our real estate guidance and documentation support.',
        'We are glad we could assist you in finding the right property with complete clarity and ease.',
        'Helping clients take confident real estate decisions is what we strive for every day.'
      ];
      topicSentence = propPhrases[Math.floor(Math.random() * propPhrases.length)];
    } else if (lowerComment.includes('marketing') || lowerComment.includes('seo') || lowerComment.includes('leads') || lowerComment.includes('growth') || lowerComment.includes('social media') || lowerComment.includes('agency') || lowerComment.includes('digital') || lowerComment.includes('creative') || lowerComment.includes('results')) {
      const digitalPhrases = [
        'Delivering real business results, high-intent leads, and digital growth is what drives our agency every day.',
        'We are proud to be your growth partner and help scale your brand online.',
        'Thank you for recognizing our team\'s dedication to creative strategy and digital performance.',
        'Seeing your business achieve strong digital results is our greatest reward.'
      ];
      topicSentence = digitalPhrases[Math.floor(Math.random() * digitalPhrases.length)];
    } else if (lowerComment.includes('hotel') || lowerComment.includes('room') || lowerComment.includes('stay') || lowerComment.includes('resort') || lowerComment.includes('hospitality') || lowerComment.includes('ambience') || lowerComment.includes('peaceful') || lowerComment.includes('night') || lowerComment.includes('weekend') || lowerComment.includes('comfort')) {
      const hotelPhrases = [
        'We are delighted to know you had a comfortable stay and enjoyed our hospitality.',
        'Providing a relaxing ambience and warm hospitality is always our top priority.',
        'Our hospitality staff is grateful for your appreciation and looks forward to your next visit.',
        'Thank you for choosing us for your stay and sharing such kind feedback.'
      ];
      topicSentence = hotelPhrases[Math.floor(Math.random() * hotelPhrases.length)];
    } else if (lowerComment.includes('fashion') || lowerComment.includes('clothes') || lowerComment.includes('wear') || lowerComment.includes('store') || lowerComment.includes('collection') || lowerComment.includes('shopping') || lowerComment.includes('quality') || lowerComment.includes('fabric')) {
      const fashionPhrases = [
        'We are thrilled that you loved our latest collection and retail experience!',
        'Bringing you the finest quality and style trends is what we love doing most.',
        'Thank you for choosing our store for your shopping and sharing your wonderful words.',
        'We are delighted that you found the perfect collection with us.'
      ];
      topicSentence = fashionPhrases[Math.floor(Math.random() * fashionPhrases.length)];
    } else if (rawComment.length > 3) {
      const generalPhrases = [
        'Thank you for taking the time to share your wonderful feedback with us.',
        'Your kind review means the world to our entire team.',
        'We are truly delighted to read your review and know about your great experience.'
      ];
      topicSentence = generalPhrases[Math.floor(Math.random() * generalPhrases.length)];
    }

    const closings5 = [
      `The entire team at ${clientName} is grateful for your support and looks forward to welcoming you back soon! ✨`,
      `We truly appreciate your kind recommendation. See you again soon at ${clientName}!`,
      `Thank you once again from everyone at ${clientName}. We are always happy to serve you! 🙏`,
      `Your support keeps our team motivated to maintain the highest standards at ${clientName}. Looking forward to your next visit!`
    ];
    const closing5 = closings5[Math.floor(Math.random() * closings5.length)];

    if (starRating >= 4) {
      return `${greeting} ${topicSentence ? topicSentence + ' ' : ''}${closing5}`;
    } else if (starRating === 3) {
      return `${greeting} Thank you for your review. We always aim to deliver a 5-star experience for every customer at ${clientName}. ${topicSentence ? topicSentence + ' ' : ''}Please feel free to share any suggestions with our management team at ${phone || 'our helpline'} so we can make your next experience even better!`;
    } else {
      return `${greeting} We sincerely apologize that your experience with ${clientName} did not meet expectations. Customer satisfaction is our highest priority, and we take your feedback very seriously. Please connect directly with our management at ${phone || 'our customer care helpline'} so we can listen to your concern and make things right for you immediately.`;
    }
  }

  static async syncReviewsForClient(clientId: string): Promise<{ synced: number; replied: number; message?: string }> {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        socialAccounts: {
          where: { platform: 'GOOGLE_BUSINESS', status: 'CONNECTED' },
        },
      },
    });

    if (!client) throw new Error('Client not found');

    const gmbAccount = client.socialAccounts[0];
    if (!gmbAccount) {
      throw new Error(`Client "${client.businessName}" ka Google Business account connected nahi hai. Please Channels tab me connect karein.`);
    }

    let token = gmbAccount?.accessToken && !gmbAccount.accessToken.startsWith('gmb_tok_')
      ? gmbAccount.accessToken
      : (process.env.GOOGLE_BUSINESS_ACCESS_TOKEN || '');

    const freshToken = await GoogleBusinessService.getFreshAccessToken();
    if (freshToken) {
      token = freshToken;
      if (gmbAccount && gmbAccount.accessToken !== freshToken) {
        await prisma.socialAccount.update({
          where: { id: gmbAccount.id },
          data: { accessToken: freshToken, lastHealthCheck: new Date() },
        }).catch(() => {});
      }
    }

    if (!token || token.startsWith('gmb_tok_') || token === 'EXPIRED') {
      throw new Error(`Google Business Profile real Access Token missing/expired for "${client.businessName}". Channels tab me Google account Reconnect karein.`);
    }

    let synced = 0;
    let replied = 0;

    const discovered = await GoogleBusinessService.discoverAccountAndLocation(
      token,
      gmbAccount?.accountId,
      client.businessName
    );

    if (!discovered) {
      throw new Error(`Google Business location nahi mila for "${client.businessName}". Channels tab me Location ID check karein.`);
    }

    const endpoint = `https://mybusiness.googleapis.com/v4/${discovered.accountName}/${discovered.locationName}/reviews`;
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `Google API returned status ${res.status}`;
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error?.message || errMsg;
      } catch {}
      throw new Error(`Google My Business Reviews error: ${errMsg}`);
    }

    const data: any = await res.json();
    const reviews = data.reviews || [];

    for (const r of reviews) {
      const reviewId = r.reviewId || r.name;
      const starMap: Record<string, number> = {
        FIVE: 5,
        FOUR: 4,
        THREE: 3,
        TWO: 2,
        ONE: 1,
      };
      const starRating = starMap[r.starRating] || (typeof r.starRating === 'number' ? r.starRating : 5);
      const reviewerName = r.reviewer?.displayName || 'Customer';
      const reviewerPhotoUrl = r.reviewer?.profilePhotoUrl || null;
      const comment = r.comment || '';
      const reviewCreatedAt = r.createTime ? new Date(r.createTime) : new Date();

      // Check if review already exists
      const existing = await prisma.gmbReview.findUnique({ where: { reviewId } });
      if (!existing) {
        const created = await prisma.gmbReview.create({
          data: {
            clientId,
            socialAccountId: gmbAccount?.id,
            reviewId,
            reviewerName,
            reviewerPhotoUrl,
            starRating,
            comment,
            reviewCreatedAt,
            replyStatus: r.reviewReply ? 'REPLIED' : 'PENDING',
            replyText: r.reviewReply?.comment || null,
            repliedAt: r.reviewReply?.updateTime ? new Date(r.reviewReply.updateTime) : null,
          },
        });
        synced++;

        // Auto-reply if review is not yet replied on Google
        if (!r.reviewReply) {
          await this.replyToReview(created.id, token, discovered);
          replied++;
        }
      } else {
        if (existing.clientId !== clientId) {
          await prisma.gmbReview.update({
            where: { id: existing.id },
            data: { clientId, socialAccountId: gmbAccount?.id },
          });
          synced++;
        }
        if (!existing.replyText && !r.reviewReply && existing.replyStatus === 'PENDING') {
          await this.replyToReview(existing.id, token, discovered);
          replied++;
        }
      }
    }

    return { synced, replied };
  }

  /**
   * Generates AI reply and submits it to Google Business Profile API
   */
  static async replyToReview(
    reviewDbId: string,
    liveToken?: string,
    discoveredLocation?: { accountName: string; locationName: string }
  ): Promise<{ success: boolean; replyText: string; error?: string }> {
    const review = await prisma.gmbReview.findUnique({
      where: { id: reviewDbId },
      include: { client: true },
    });

    if (!review) throw new Error('Review not found');

    // Generate smart AI reply
    const replyText = await this.generateAiReviewReply({
      clientName: review.client.businessName,
      reviewerName: review.reviewerName,
      starRating: review.starRating,
      comment: review.comment,
      location: review.client.location,
      phone: review.client.phone || undefined,
    });

    let token = liveToken || (process.env.GOOGLE_BUSINESS_ACCESS_TOKEN || '');
    const freshToken = await GoogleBusinessService.getFreshAccessToken();
    if (freshToken) token = freshToken;

    let postedToGoogle = false;
    let postError = null;

    if (token && !token.startsWith('gmb_tok_') && token !== 'EXPIRED') {
      try {
        let accountName = discoveredLocation?.accountName;
        let locationName = discoveredLocation?.locationName;

        if (!accountName || !locationName) {
          const gmbAcc = await prisma.socialAccount.findFirst({
            where: { clientId: review.clientId, platform: 'GOOGLE_BUSINESS', status: 'CONNECTED' },
          });
          const disc = await GoogleBusinessService.discoverAccountAndLocation(
            token,
            gmbAcc?.accountId,
            review.client.businessName
          );
          if (disc) {
            accountName = disc.accountName;
            locationName = disc.locationName;
          }
        }

        if (accountName && locationName) {
          const cleanReviewId = review.reviewId.replace(/^.*\/reviews\//, '');
          const endpoint = `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews/${cleanReviewId}/reply`;

          const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ comment: replyText }),
          });

          if (response.ok) {
            postedToGoogle = true;
          } else {
            const errText = await response.text();
            postError = `Google API error: ${errText}`;
          }
        }
      } catch (err: any) {
        postError = err.message;
      }
    }

    // Save reply status in database
    await prisma.gmbReview.update({
      where: { id: reviewDbId },
      data: {
        replyText,
        repliedAt: new Date(),
        replyStatus: postedToGoogle ? 'REPLIED' : postError ? 'FAILED' : 'REPLIED',
        replyError: postError,
      },
    });

    return { success: true, replyText, error: postError || undefined };
  }

  /**
   * Background tick to check and auto-reply to pending reviews across all clients
   */
  static async runAutoReplyWorker(): Promise<{ checked: number; replied: number }> {
    const clients = await prisma.client.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, businessName: true },
    });

    let totalChecked = 0;
    let totalReplied = 0;

    for (const c of clients) {
      try {
        const res = await this.syncReviewsForClient(c.id);
        totalChecked += res.synced;
        totalReplied += res.replied;
      } catch (err: any) {
        console.warn(`[GMB AutoReply Worker] Error syncing client "${c.businessName}":`, err.message);
      }
    }

    // Also reply to any PENDING reviews in DB
    const pendingReviews = await prisma.gmbReview.findMany({
      where: { replyStatus: 'PENDING' },
      take: 20,
    });

    for (const rev of pendingReviews) {
      try {
        await this.replyToReview(rev.id);
        totalReplied++;
      } catch (err: any) {
        console.warn(`[GMB AutoReply Worker] Error replying to pending review ${rev.id}:`, err.message);
      }
    }

    return { checked: totalChecked, replied: totalReplied };
  }
}
