import { PublishResult } from './MetaService';

export class GoogleBusinessService {
  /**
   * Publishes local post / offer / update to Google Business Profile API
   */
  static async publishPost(params: {
    locationId: string;
    accessToken: string;
    summary: string;
    mediaUrl?: string;
    callToAction?: {
      actionType: 'LEARN_MORE' | 'CALL' | 'BOOK' | 'ORDER';
      url?: string;
    };
  }): Promise<PublishResult> {
    let token = (params.accessToken && !params.accessToken.startsWith('gmb_tok_')) 
      ? params.accessToken 
      : (process.env.GOOGLE_BUSINESS_ACCESS_TOKEN || '');

    // Auto-refresh using Refresh Token if available
    const freshToken = await GoogleBusinessService.getFreshAccessToken();
    if (freshToken) {
      token = freshToken;
    }

    // If no real Google OAuth token is configured, do not falsely claim live published
    if (!token || token.startsWith('gmb_tok_') || token === 'EXPIRED') {
      return {
        success: false,
        errorCode: 'GBP_LIVE_TOKEN_REQUIRED',
        errorMessage: 'Google Business Profile: Real Google OAuth Access Token required. Live posting to Google Maps pending token configuration.',
      };
    }

    try {
      let locationToUse = params.locationId;
      if (!locationToUse || locationToUse.startsWith('google_business_') || locationToUse.startsWith('gmb_')) {
        const discovered = await GoogleBusinessService.discoverPrimaryLocation(token);
        if (discovered) {
          locationToUse = discovered;
        }
      }

      // Google Business Profile v4 / Business Information API Local Post endpoint
      let endpoint = `https://mybusiness.googleapis.com/v4/accounts/me/locations/${locationToUse}/localPosts`;
      if (locationToUse.includes('/') || locationToUse.startsWith('locations/')) {
        endpoint = `https://mybusiness.googleapis.com/v4/${locationToUse.replace(/^\/?/, '')}/localPosts`;
      }

      const requestBody: any = {
        languageCode: 'en-US',
        summary: params.summary,
        topicType: 'STANDARD',
      };

      if (params.callToAction?.url) {
        requestBody.callToAction = {
          actionType: params.callToAction.actionType || 'LEARN_MORE',
          url: params.callToAction.url,
        };
      }

      // Attach media only if it is a valid public internet URL
      let effectiveMedia = params.mediaUrl;
      if (effectiveMedia && effectiveMedia.startsWith('/uploads')) {
        const liveHost = process.env.LIVE_BACKEND_URL || 'https://mediumspringgreen-wallaby-731721.hostingersite.com';
        effectiveMedia = `${liveHost.replace(/\/$/, '')}${effectiveMedia}`;
      }

      if (effectiveMedia && !effectiveMedia.includes('localhost')) {
        requestBody.media = [
          {
            mediaFormat: 'PHOTO',
            sourceUrl: effectiveMedia,
          },
        ];
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data: any = await response.json();

      if (!response.ok) {
        let errMsg = data.error?.message || `Google Business API returned status ${response.status}`;
        if (response.status === 401 || errMsg.toLowerCase().includes('invalid authentication credentials')) {
          errMsg = 'Google Access Token expired (Google tokens expire after 1 hour). Please provide GOOGLE_BUSINESS_REFRESH_TOKEN in .env for permanent lifetime or generate a fresh token.';
        } else if (errMsg.includes('mybusiness.googleapis.com') || errMsg.includes('has not been used in project') || errMsg.includes('disabled')) {
          errMsg = 'Google requires manual API Access approval for automated local posting. Please submit Google Business Profile API Access form or publish via "+ Add post" on Google Business.';
        }
        return {
          success: false,
          errorCode: `GMB_API_${response.status}`,
          errorMessage: errMsg,
          rawResponse: data,
        };
      }

      return {
        success: true,
        externalPostId: data.name || `gbp_${Date.now()}`,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'GBP_NETWORK_ERROR',
        errorMessage: `Failed to connect to Google Business Profile API: ${err.message}`,
      };
    }
  }

  /**
   * Exchanges Refresh Token for a fresh 1-hour Google Access Token automatically
   */
  static async getFreshAccessToken(): Promise<string | null> {
    const refreshToken = process.env.GOOGLE_BUSINESS_REFRESH_TOKEN?.trim();
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

    if (!refreshToken || !clientId || !clientSecret) {
      return null;
    }

    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data: any = await res.json();
      if (data.access_token) {
        process.env.GOOGLE_BUSINESS_ACCESS_TOKEN = data.access_token;
        return data.access_token;
      }
    } catch (err) {
      console.error('Failed to auto-refresh Google access token:', err);
    }

    return null;
  }

  /**
   * Discovers primary account and location from Google if locationId is missing or placeholder
   */
  static async discoverPrimaryLocation(token: string): Promise<string | null> {
    try {
      const accRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!accRes.ok) return null;
      const accData: any = await accRes.json();
      const firstAccount = accData.accounts?.[0]?.name;
      if (!firstAccount) return null;

      const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${firstAccount}/locations?readMask=name,title`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!locRes.ok) return null;
      const locData: any = await locRes.json();
      const firstLocation = locData.locations?.[0]?.name;
      return firstLocation || null;
    } catch {
      return null;
    }
  }
}

