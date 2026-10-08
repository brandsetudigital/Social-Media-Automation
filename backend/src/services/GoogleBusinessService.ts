import { PublishResult } from './MetaService';

export class GoogleBusinessService {
  /**
   * Publishes local post / offer / update to Google Business Profile API
   */
  static async publishPost(params: {
    locationId: string;
    accessToken: string;
    summary: string;
    clientName?: string;
    mediaUrl?: string;
    callToAction?: {
      actionType: 'LEARN_MORE' | 'CALL' | 'BOOK' | 'ORDER';
      url?: string;
    };
  }): Promise<PublishResult> {
    let token = (params.accessToken && !params.accessToken.startsWith('gmb_tok_') && !params.accessToken.startsWith('oauth_') && !params.accessToken.startsWith('EAA')) 
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
      // 1. Resolve Account & Location names via live discovery
      const discovered = await GoogleBusinessService.discoverAccountAndLocation(
        token,
        params.locationId,
        params.clientName
      );

      let accountName = discovered?.accountName;
      let locationName = discovered?.locationName;

      // Fallback if discovery fails or account isn't listed
      if (!accountName || !locationName) {
        const cleanLoc = (params.locationId || '').replace(/^locations\//, '');
        locationName = cleanLoc ? `locations/${cleanLoc}` : 'locations/4475899898765251271';
        accountName = 'accounts/112905889140645258774';
      }

      // Google Business Profile v4 Local Post endpoint
      const endpoint = `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/localPosts`;

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

      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        // Non-JSON response (e.g. HTML error page from Google)
      }

      if (!response.ok) {
        let errMsg = data?.error?.message || `Google Business API returned status ${response.status}`;

        if (response.status === 401 || errMsg.toLowerCase().includes('invalid authentication credentials')) {
          errMsg = 'Google Access Token expired. Please refresh token or update GOOGLE_BUSINESS_REFRESH_TOKEN in .env.';
        } else if (
          errMsg.includes('has not been used in project') ||
          errMsg.includes('disabled') ||
          errMsg.includes('SERVICE_DISABLED') ||
          errMsg.includes('mybusiness.googleapis.com')
        ) {
          errMsg = 'Google My Business API project 631631101857 me disabled hai. Is link pe click karke "Enable" karein: https://console.developers.google.com/apis/api/mybusiness.googleapis.com/overview?project=631631101857';
        } else if (!data) {
          errMsg = `Google API returned HTML response (HTTP ${response.status}). Please ensure Google My Business API is enabled for project 631631101857.`;
        }

        return {
          success: false,
          errorCode: `GMB_API_${response.status}`,
          errorMessage: errMsg,
          rawResponse: data || rawText.slice(0, 500),
        };
      }

      return {
        success: true,
        externalPostId: data?.name || `gbp_${Date.now()}`,
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
   * Discovers primary account and location from Google Business Profile API
   */
  static async discoverAccountAndLocation(
    token: string,
    preferredLocationId?: string,
    clientName?: string
  ): Promise<{ accountName: string; locationName: string; locationTitle?: string } | null> {
    try {
      const accRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!accRes.ok) return null;
      const accData: any = await accRes.json();
      const firstAccount = accData.accounts?.[0]?.name;
      if (!firstAccount) return null;

      const locRes = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${firstAccount}/locations?readMask=name,title,storeCode`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!locRes.ok) return null;
      const locData: any = await locRes.json();
      const locations: any[] = locData.locations || [];
      if (locations.length === 0) return null;

      const targetId = preferredLocationId ? preferredLocationId.replace(/^locations\//, '') : '';
      let matched = locations.find((l: any) => {
        const rawId = l.name?.replace(/^locations\//, '');
        return targetId && (rawId === targetId || l.name === preferredLocationId);
      });

      // If no ID match and clientName provided, match by client name
      if (!matched && clientName) {
        const cleanClient = clientName.toLowerCase().trim();
        matched = locations.find((l: any) => {
          const locTitle = (l.title || '').toLowerCase();
          return locTitle.includes(cleanClient) || cleanClient.includes(locTitle);
        });
      }

      if (!matched) {
        matched = locations[0];
      }

      return {
        accountName: firstAccount,
        locationName: matched.name,
        locationTitle: matched.title,
      };
    } catch {
      return null;
    }
  }
}

