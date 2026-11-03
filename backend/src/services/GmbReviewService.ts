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
    const nameToGreet = reviewerName || 'Valued Customer';

    // Call Gemini if configured in system
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      const prompt = `You are the official Customer Experience Manager representing "${clientName}" (a business in ${location || 'India'}).
Write a natural, warm, polite, and human Google Review reply in English (or friendly Hinglish if appropriate).

Customer Details:
- Customer Name: ${nameToGreet}
- Rating: ${starRating} Star(s) out of 5
- Customer Review Comment: "${comment || 'No written text provided, just rating'}"
- Business Name: ${clientName}
${phone ? `- Support Contact Phone: ${phone}` : ''}

Guidelines:
1. Greet the customer warmly by name.
2. If 5 or 4 Stars: Thank them sincerely, mention how delighted the team is, mention ${clientName}, and warmly invite them back.
3. If 3 Stars: Thank them for feedback, express commitment to 5-star quality, and invite suggestions.
4. If 1 or 2 Stars: Sincerest professional apology, validate their concern with empathy, do not argue, and invite them to reach out directly at ${phone || 'our customer helpline'} so management can resolve it immediately.
5. Keep it concise (2-4 sentences max). Never say "as an AI". Return ONLY the exact reply message text with no quotes, no markdown, and no extra preamble.`;

      try {
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
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { temperature: 0.6, maxOutputTokens: 250 },
                }),
              }
            );
            clearTimeout(timeoutId);
            if (res.ok) {
              const data: any = await res.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (text) return text.replace(/^"|"$/g, '');
            }
          } catch {}
        }
      } catch (err) {
        console.warn('[GmbReviewService] AI reply generation fallback to deterministic rules:', err);
      }
    }

    // High quality deterministic fallback rules
    if (starRating >= 4) {
      return `Dear ${nameToGreet}, thank you so much for your wonderful 5-star review! The entire team at ${clientName} is delighted to know you had a great experience with us. We look forward to welcoming you back soon! ✨`;
    } else if (starRating === 3) {
      return `Hello ${nameToGreet}, thank you for taking the time to share your feedback with us. We constantly strive to provide a 5-star experience for every customer. Please feel free to reach out to us at ${phone || 'our customer care'} if there is anything we can do to make your next visit even better!`;
    } else {
      return `Dear ${nameToGreet}, we sincerely apologize that your experience with ${clientName} did not meet your expectations. We take all customer feedback very seriously. Please contact us directly at ${phone || 'our customer care'} so our management team can address your concerns and make things right for you immediately.`;
    }
  }

  /**
   * Fetches latest reviews from Google My Business Profile API for a client
   */
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
    if (freshToken) token = freshToken;

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
      } else if (!existing.replyText && !r.reviewReply && existing.replyStatus === 'PENDING') {
        await this.replyToReview(existing.id, token, discovered);
        replied++;
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
          const disc = await GoogleBusinessService.discoverAccountAndLocation(
            token,
            undefined,
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
      } catch {}
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
      } catch {}
    }

    return { checked: totalChecked, replied: totalReplied };
  }
}
