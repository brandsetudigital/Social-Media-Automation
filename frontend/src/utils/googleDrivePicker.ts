// Google Drive Picker API Helper Utility for BrandSetu Digital

export interface PickedDriveFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  thumbnailUrl: string;
  type: 'IMAGE' | 'VIDEO' | 'REEL';
  size?: string;
  accessToken?: string;
}

interface OpenPickerOptions {
  clientId?: string;
  apiKey?: string;
  appId?: string;
  onSelect: (file: PickedDriveFile) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
}

// Load gapi script dynamically if not present
export const loadGapiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).gapi) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(new Error('Failed to load Google API script')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google API script'));
    document.body.appendChild(script);
  });
};

// Load Google Identity Services (GIS) script dynamically if not present
export const loadGsiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(new Error('Failed to load Google Identity Services script')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
    document.body.appendChild(script);
  });
};

/**
 * Open the official Google Drive Picker popup window
 */
export const openGoogleDrivePicker = async (options: OpenPickerOptions): Promise<void> => {
  const { onSelect, onError, onStatusChange } = options;

  const clientId =
    options.clientId ||
    (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
    '631631101857-romjrtsvifvd8l791n15j8g76u0ssp3f.apps.googleusercontent.com';

  const apiKey =
    options.apiKey ||
    (import.meta as any).env?.VITE_GOOGLE_API_KEY ||
    'AIzaSyDluzsT_OaiOXCdJzRfolffzrm7oR5h9WY';

  const appId =
    options.appId ||
    (import.meta as any).env?.VITE_GOOGLE_APP_ID ||
    clientId.split('-')[0] ||
    '631631101857';

  if (!clientId || !apiKey) {
    const msg = 'Google Client ID or API Key is missing in .env configuration.';
    if (onError) onError(msg);
    return;
  }

  try {
    if (onStatusChange) onStatusChange('Loading Google SDK...');
    await Promise.all([loadGapiScript(), loadGsiScript()]);

    const gapi = (window as any).gapi;
    const google = (window as any).google;

    if (!google?.accounts?.oauth2) {
      throw new Error('Google Identity Services SDK could not be initialized.');
    }

    if (onStatusChange) onStatusChange('Preparing Google Drive authorization...');

    // Request OAuth token for Google Drive access
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
      callback: async (response: any) => {
        if (response.error !== undefined) {
          console.error('[Google Picker] OAuth Error:', response);
          if (onError) onError(response.error_description || response.error || 'Google authorization failed.');
          return;
        }

        const accessToken = response.access_token;
        if (onStatusChange) onStatusChange('Opening Google Drive file browser...');

        // Load picker module in gapi
        gapi.load('picker', {
          callback: () => {
            try {
              // Create views: Documents, Images, Videos, Folders
              const docsView = new google.picker.DocsView(google.picker.ViewId.DOCS)
                .setIncludeFolders(true)
                .setSelectFolderEnabled(false)
                .setMimeTypes(
                  'image/png,image/jpeg,image/jpg,image/webp,image/gif,video/mp4,video/quicktime,video/webm,video/mkv'
                );

              const uploadView = new google.picker.DocsUploadView();

              const pickerBuilder = new google.picker.PickerBuilder()
                .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
                .setOAuthToken(accessToken)
                .addView(docsView)
                .addView(uploadView)
                .setDeveloperKey(apiKey)
                .setTitle('BrandSetu Digital - Select Google Drive Creative')
                .setCallback((data: any) => {
                  if (data.action === google.picker.Action.PICKED) {
                    const doc = data.docs[0];
                    const isVideo =
                      doc.mimeType?.startsWith('video/') ||
                      /\.(mp4|mov|webm|mkv|ogg)$/i.test(doc.name);

                    // Build public or authenticated media URLs
                    const directUrl = `https://drive.google.com/uc?export=view&id=${doc.id}`;
                    const thumbUrl =
                      doc.thumbnails?.[0]?.url ||
                      `https://drive.google.com/thumbnail?id=${doc.id}&sz=w800`;

                    const pickedFile: PickedDriveFile = {
                      id: doc.id,
                      name: doc.name,
                      mimeType: doc.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
                      url: directUrl,
                      thumbnailUrl: thumbUrl,
                      type: isVideo ? 'REEL' : 'IMAGE',
                      size: doc.sizeBytes ? `${(doc.sizeBytes / (1024 * 1024)).toFixed(1)} MB` : undefined,
                      accessToken,
                    };

                    if (onStatusChange) onStatusChange(`Selected: ${doc.name}`);
                    onSelect(pickedFile);
                  } else if (data.action === google.picker.Action.CANCEL) {
                    if (onStatusChange) onStatusChange('');
                  }
                });

              if (appId) {
                pickerBuilder.setAppId(appId);
              }

              const picker = pickerBuilder.build();
              picker.setVisible(true);
            } catch (builderErr: any) {
              console.error('[Google Picker] Builder error:', builderErr);
              if (onError) onError(`Failed to build picker: ${builderErr.message}`);
            }
          },
        });
      },
    });

    tokenClient.requestAccessToken({ prompt: '' });
  } catch (err: any) {
    console.error('[Google Picker] Initialization error:', err);
    if (onError) onError(err.message || 'Failed to initialize Google Drive Picker');
  }
};
