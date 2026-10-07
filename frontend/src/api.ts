function cleanBaseUrl(input?: string): string {
  if (!input) return 'https://mediumspringgreen-wallaby-731721.hostingersite.com/api';
  let clean = input.trim();
  // Strip accidental "VITE_API_URL=" prefix if user pasted key and value together
  clean = clean.replace(/^VITE_API_URL\s*=\s*/i, '');
  // Strip surrounding quotes or url-encoded quotes
  clean = clean.replace(/^["'%22]+|["'%22]+$/g, '').trim();
  // If it points to a domain without http/https, prefix with https://
  if (clean.includes('.') && !clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/')) {
    clean = `https://${clean}`;
  }
  return clean.replace(/\/+$/, '');
}

const API_BASE = cleanBaseUrl((import.meta as any).env?.VITE_API_URL);

export const getMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  const backendBase = API_BASE.replace(/\/api\/?$/, '') || 'https://mediumspringgreen-wallaby-731721.hostingersite.com';
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${backendBase}${cleanUrl}`;
};

export const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('brandsetu_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // // Auth
  // login: (email: string, password: string) =>
  //   apiFetch<{ token: string; user: any }>('/auth/login', {
  //     method: 'POST',
  //     body: JSON.stringify({ email, password }),
  //   }),

  login: async (email: string, password: string) => {
  const response = await apiFetch<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (response.token) {
    localStorage.setItem('brandsetu_token', response.token);
  }

  return response;
},
  getMe: () => apiFetch<{ user: any }>('/auth/me'),

  // Users & Roles Management (Admin/SMM/Client IDs & Passwords)
  getUsers: () => apiFetch<any[]>('/users'),
  createUser: (data: { name: string; email: string; password: string; role: string; status?: string }) =>
    apiFetch<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: { name?: string; email?: string; password?: string; role?: string; status?: string }) =>
    apiFetch<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    apiFetch<any>(`/users/${id}`, { method: 'DELETE' }),

  // Clients
  getClients: () => apiFetch<any[]>('/clients'),
  getClient: (id: string) => apiFetch<any>(`/clients/${id}`),
  createClient: (data: any) =>
    apiFetch<any>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: string, data: any) =>
    apiFetch<any>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleClientStatus: (id: string, status?: 'ACTIVE' | 'INACTIVE') =>
    apiFetch<any>(`/clients/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteClient: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/clients/${id}`, { method: 'DELETE' }),
  updateBrandProfile: (id: string, data: any) =>
    apiFetch<any>(`/clients/${id}/brand-profile`, { method: 'PUT', body: JSON.stringify(data) }),
  getClientDocuments: (clientId: string) =>
    apiFetch<any[]>(`/clients/${clientId}/documents`),
  createClientDocument: (clientId: string, data: { title: string; fileUrl: string; fileType?: string; fileSize?: number; summary?: string }) =>
    apiFetch<any>(`/clients/${clientId}/documents`, { method: 'POST', body: JSON.stringify(data) }),
  deleteClientDocument: (clientId: string, docId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/clients/${clientId}/documents/${docId}`, { method: 'DELETE' }),

  // AI Content Engine
  generateAiCaption: (data: { clientId?: string; contentType?: string; platform?: string; topic?: string; mediaUrl?: string; toneOverride?: string }) =>
    apiFetch<{ caption: string; hashtags: string; cta?: string; aiModelUsed?: string; brandContextUsed?: any }>('/ai/caption', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  generateAiVariations: (clientId: string, topic?: string) =>
    apiFetch<any>('/ai/variations', { method: 'POST', body: JSON.stringify({ clientId, topic }) }),

  // Google Drive
  getDriveStatus: () => apiFetch<any>('/drive/status'),
  syncDrive: (clientId?: string) =>
    apiFetch<any>('/drive/sync', { method: 'POST', body: JSON.stringify({ clientId }) }),
  simulateDriveUpload: (data: any) =>
    apiFetch<any>('/drive/simulate-upload', { method: 'POST', body: JSON.stringify(data) }),
  getDriveFolders: (clientId: string) => apiFetch<any[]>(`/drive/folders/${clientId}`),
  getDriveFiles: (clientId?: string, search?: string) => {
    const q = new URLSearchParams();
    if (clientId && clientId !== 'ALL') q.append('clientId', clientId);
    if (search) q.append('search', search);
    const qs = q.toString();
    return apiFetch<any[]>(`/drive/files${qs ? `?${qs}` : ''}`);
  },
  uploadDirectToDrive: async (clientId: string, file: File, folderType?: string) => {
    return new Promise<{ success: boolean; message: string; file: any }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await apiFetch<{ success: boolean; message: string; file: any }>('/drive/upload-direct', {
            method: 'POST',
            body: JSON.stringify({
              clientId,
              filename: file.name,
              fileData: base64Data,
              mimeType: file.type,
              folderType,
            }),
          });
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file for Drive upload'));
      reader.readAsDataURL(file);
    });
  },
  getDriveConfig: () =>
    apiFetch<{ googleClientId: string; googleApiKey: string; googleDriveFolderId: string; isConfigured: boolean }>('/drive/config'),
  updateDriveConfig: (data: { googleClientId?: string; googleApiKey?: string; googleDriveFolderId?: string }) =>
    apiFetch<{ success: boolean; message: string; isConfigured: boolean }>('/drive/config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Helper to build clean query string without undefined or ALL
  buildQuery: (params?: Record<string, any>): string => {
    if (!params) return '';
    const q = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (
        val !== undefined &&
        val !== null &&
        val !== '' &&
        val !== 'undefined' &&
        val !== 'null' &&
        val !== 'ALL'
      ) {
        q.append(key, String(val));
      }
    }
    const str = q.toString();
    return str ? `?${str}` : '';
  },

  // Content Inbox
  getContentInbox: (params?: { clientId?: string; status?: string; contentType?: string; search?: string }) => {
    const query = api.buildQuery(params);
    return apiFetch<any[]>(`/content/inbox${query}`);
  },
  getContentItem: (id: string) => apiFetch<any>(`/content/${id}`),
  deleteContentItem: (id: string) => apiFetch<any>(`/content/${id}`, { method: 'DELETE' }),
  reviewContent: (id: string, data: any) =>
    apiFetch<any>(`/content/${id}/review`, { method: 'PUT', body: JSON.stringify(data) }),
  createManualContent: (data: any) =>
    apiFetch<any>('/content/create', { method: 'POST', body: JSON.stringify(data) }),
  uploadMedia: async (file: File) => {
    return new Promise<{ url: string; filename: string; size: number; mimeType: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await apiFetch<{ url: string; filename: string; size: number; mimeType: string }>('/content/upload', {
            method: 'POST',
            body: JSON.stringify({
              filename: file.name,
              fileData: base64Data,
              mimeType: file.type,
            }),
          });
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file for upload'));
      reader.readAsDataURL(file);
    });
  },

  // Approvals (Admin Gate)
  getPendingApprovals: (clientId?: string) => {
    const query = api.buildQuery({ clientId });
    return apiFetch<any[]>(`/approvals/pending${query}`);
  },
  approveContent: (id: string, feedbackNote?: string, publishMode: 'IMMEDIATE' | 'SCHEDULED' = 'IMMEDIATE') =>
    apiFetch<any>(`/approvals/${id}/approve`, { method: 'POST', body: JSON.stringify({ feedbackNote, publishMode }) }),
  requestChanges: (id: string, comment: string) =>
    apiFetch<any>(`/approvals/${id}/request-changes`, { method: 'POST', body: JSON.stringify({ comment }) }),
  rejectContent: (id: string, comment?: string) =>
    apiFetch<any>(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ comment }) }),

  // Rules & Cycles
  getRules: (clientId?: string) => {
    const query = api.buildQuery({ clientId });
    return apiFetch<any[]>(`/rules${query}`);
  },
  getRule: (id: string) => apiFetch<any>(`/rules/${id}`),
  createRule: (data: any) =>
    apiFetch<any>('/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id: string, data: any) =>
    apiFetch<any>(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  projectRule: (id: string, startDate?: string, daysLimit = 30) =>
    apiFetch<any>(`/rules/${id}/project`, {
      method: 'POST',
      body: JSON.stringify({ startDate, daysLimit }),
    }),
  fillQueueFromRule: (id: string) =>
    apiFetch<any>(`/rules/${id}/fill-queue`, { method: 'POST' }),
  deleteRule: (id: string) =>
    apiFetch<any>(`/rules/${id}`, { method: 'DELETE' }),

  // Queues
  getClientQueues: (clientId: string) => apiFetch<any>(`/queues/${clientId}`),

  // Calendar & Scheduler
  getCalendarEvents: (params?: { clientId?: string; platform?: string; status?: string }) => {
    const query = api.buildQuery(params);
    return apiFetch<any[]>(`/scheduler/calendar${query}`);
  },
  scheduleSingle: (data: any) =>
    apiFetch<any>('/scheduler/schedule-single', { method: 'POST', body: JSON.stringify(data) }),
  triggerSchedulerTick: () => apiFetch<any>('/scheduler/tick', { method: 'POST' }),
  retryScheduledPost: (id: string) =>
    apiFetch<any>(`/scheduler/retry/${id}`, { method: 'POST' }),
  publishNow: (id: string) =>
    apiFetch<any>(`/scheduler/publish-now/${id}`, { method: 'POST' }),
  deleteScheduledPost: (id: string) =>
    apiFetch<any>(`/scheduler/${id}`, { method: 'DELETE' }),

  // Social Accounts
  getSocialAccounts: (clientId?: string) => {
    const query = api.buildQuery({ clientId });
    return apiFetch<any[]>(`/social/accounts${query}`);
  },
  connectSocialAccount: (data: any) =>
    apiFetch<any>('/social/connect', { method: 'POST', body: JSON.stringify(data) }),
  reconnectSocialAccount: (id: string) =>
    apiFetch<any>(`/social/reconnect/${id}`, { method: 'POST' }),
  disconnectSocialAccount: (id: string) =>
    apiFetch<any>(`/social/disconnect/${id}`, { method: 'POST' }),

  // AI Content Studio
  generateAICaption: (data: any) =>
    apiFetch<any>('/ai/caption', { method: 'POST', body: JSON.stringify(data) }),
  generateAIVariations: (clientId: string, topic?: string) =>
    apiFetch<any>('/ai/variations', { method: 'POST', body: JSON.stringify({ clientId, topic }) }),
  generateAIHashtags: (clientId: string, topic?: string) =>
    apiFetch<any>('/ai/hashtags', { method: 'POST', body: JSON.stringify({ clientId, topic }) }),
  generateAIMonthlyPlan: (data: any) =>
    apiFetch<any>('/ai/monthly-plan', { method: 'POST', body: JSON.stringify(data) }),

  // Analytics & Reports
  getAnalyticsOverview: (clientId?: string) => {
    const query = api.buildQuery({ clientId });
    return apiFetch<any>(`/analytics/overview${query}`);
  },
  getBufferHealth: (clientId?: string) => {
    const query = api.buildQuery({ clientId });
    return apiFetch<any[]>(`/analytics/buffer-health${query}`);
  },
  getClientReport: (clientId: string, month = 'September', year = 2026) =>
    apiFetch<any>(`/analytics/report/${clientId}?month=${month}&year=${year}`),

  // System (Notifications, Audits, Logs)
  getNotifications: (clientId?: string) => {
    const query = api.buildQuery({ clientId });
    return apiFetch<any[]>(`/system/notifications${query}`);
  },
  markNotificationRead: (id: string) =>
    apiFetch<any>(`/system/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () =>
    apiFetch<any>('/system/notifications/read-all', { method: 'POST' }),
  getAuditLogs: (clientId?: string) => {
    const query = api.buildQuery({ clientId });
    return apiFetch<any[]>(`/system/audit-logs${query}`);
  },
  getPublishingLogs: (params?: { clientId?: string; status?: string }) => {
    const query = api.buildQuery(params);
    return apiFetch<any[]>(`/system/publishing-logs${query}`);
  },
};
