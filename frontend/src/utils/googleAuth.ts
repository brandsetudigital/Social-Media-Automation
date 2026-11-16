import { loadGsiScript } from './googleDrivePicker';
import { api } from '../api';

/**
 * 1-Click Google Business Profile OAuth Authorization
 * Directly opens Google Identity Services popup for instant access token approval,
 * verifies it with Google Business API, and saves it permanently to server & all client accounts.
 */
export const requestGoogleBusinessAuth = async (options?: {
  onSuccess?: (message?: string) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
}): Promise<void> => {
  try {
    if (options?.onStatusChange) options.onStatusChange('Loading Google SDK...');
    await loadGsiScript();

    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      throw new Error('Google Identity Services SDK could not be loaded.');
    }

    const clientId =
      (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
      '631631101857-g0g0ckmvv51r3i0j233rqkk82m53295n.apps.googleusercontent.com';

    if (options?.onStatusChange) options.onStatusChange('Opening Google Sign-In popup...');

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/business.manage',
      prompt: 'consent',
      callback: async (response: any) => {
        if (response.error) {
          console.error('[Google Auth] Error:', response);
          if (options?.onError) {
            options.onError(response.error_description || response.error || 'Google login cancelled.');
          }
          return;
        }

        if (response.access_token) {
          try {
            if (options?.onStatusChange) options.onStatusChange('Saving Google token to server & verifying profiles...');
            const res = await api.updateGmbToken(response.access_token);
            if (options?.onSuccess) {
              options.onSuccess(res.message || '✅ Google Business connected successfully! Reviews syncing.');
            }
          } catch (err: any) {
            console.error('[Google Auth] Token save error:', err);
            if (options?.onError) {
              options.onError(err.message || 'Failed to save Google token on server.');
            }
          }
        } else {
          if (options?.onError) options.onError('No access token received from Google.');
        }
      },
    });

    tokenClient.requestAccessToken();
  } catch (err: any) {
    if (options?.onError) options.onError(err.message || 'Failed to start Google sign-in.');
  }
};

