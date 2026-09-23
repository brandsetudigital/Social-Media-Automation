export type UserRole = 'ADMIN' | 'SMM';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: string;
}

export interface ClientBrandProfile {
  id: string;
  clientId: string;
  services: string;
  products: string;
  usp: string;
  targetAudience: string;
  brandTone: string;
  language: string;
  keywords: string;
  hashtags: string;
  preferredCta: string | null;
  openingHours: string | null;
  restrictedClaims: string | null;
  importantNotes: string | null;
}

export interface SocialAccount {
  id: string;
  clientId: string;
  platform: 'FACEBOOK' | 'INSTAGRAM' | 'GOOGLE_BUSINESS';
  accountName: string;
  accountId: string;
  status: 'CONNECTED' | 'EXPIRED' | 'ERROR';
  lastHealthCheck: string;
  lastError: string | null;
}

export interface ClientBufferHealth {
  clientId: string;
  clientName: string;
  requiredDays: number;
  overallStatus: 'GOOD' | 'LOW' | 'CRITICAL';
  metrics: {
    posts: { ready: number; daysCovered: number; status: 'GOOD' | 'LOW' | 'CRITICAL' };
    stories: { ready: number; daysCovered: number; status: 'GOOD' | 'LOW' | 'CRITICAL' };
    reels: { ready: number; daysCovered: number; status: 'GOOD' | 'LOW' | 'CRITICAL' };
  };
  warnings: string[];
}

export interface Client {
  id: string;
  businessName: string;
  category: string;
  location: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  logo: string | null;
  brandColors: string | null;
  timezone: string;
  driveRootFolderId: string | null;
  approvalRequired: boolean;
  requiredBufferDays: number;
  status?: 'ACTIVE' | 'INACTIVE';
  brandProfile?: ClientBrandProfile;
  socialAccounts?: SocialAccount[];
  bufferHealth?: ClientBufferHealth;
  documents?: ClientDocument[];

  _count?: {
    contentItems: number;
    scheduledPosts: number;
    queueItems: number;
  };
}

export interface ClientDocument {
  id: string;
  clientId: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  summary: string | null;
  createdAt: string;
}


export type ContentStatus =
  | 'NEW'
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'READY_FOR_APPROVAL'
  | 'APPROVED'
  | 'QUEUED'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

export type ContentType = 'POST' | 'REEL' | 'STORY' | 'GOOGLE_BUSINESS_POST';

export interface ContentVariant {
  id: string;
  platform: 'FACEBOOK' | 'INSTAGRAM' | 'GOOGLE_BUSINESS';
  caption: string | null;
  hashtags: string | null;
  cta: string | null;
}

export interface ApprovalRequest {
  id: string;
  contentItemId: string;
  contentItem?: ContentItem;
  requestedById: string;
  reviewedById: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  feedbackNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  requestedBy?: { name: string; email: string; role: string };
  reviewedBy?: { name: string; email: string; role: string };
}

export interface ContentItem {
  id: string;
  clientId: string;
  driveFileId: string | null;
  title: string;
  contentType: ContentType;
  status: ContentStatus;
  mediaUrl: string;
  thumbnailUrl: string | null;
  aspectRatio: string | null;
  durationSec: number | null;
  source: 'DRIVE' | 'MANUAL' | 'AI_STUDIO';
  createdAt: string;
  updatedAt: string;
  client?: Client;
  variants?: ContentVariant[];
  approvalRequests?: ApprovalRequest[];
  driveFile?: {
    filename: string;
    folderPath: string;
    driveUrl: string;
  };
}

export interface RuleStep {
  id?: string;
  stepOrder: number;
  stepType: 'CONTENT' | 'GAP';
  contentType?: ContentType;
  gapDays?: number;
  targetTime?: string;
  platforms: string[] | string;
}

export interface RecurringRule {
  id: string;
  clientId: string;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  repeatInfinite: boolean;
  repeatCycles: number;
  timezone: string;
  client?: Client;
  steps: RuleStep[];
}

export interface ScheduledPost {
  id: string;
  clientId: string;
  contentItemId: string;
  platform: 'FACEBOOK' | 'INSTAGRAM' | 'GOOGLE_BUSINESS';
  socialAccountId: string;
  scheduledAt: string;
  timezone: string;
  status: 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'CANCELLED';
  idempotencyKey: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  publishedAt: string | null;
  lastError: string | null;
  client?: Client;
  contentItem?: ContentItem;
  socialAccount?: SocialAccount;
}

export interface PublishingLog {
  id: string;
  scheduledPostId: string;
  clientId: string;
  platform: string;
  status: 'SUCCESS' | 'FAILED';
  errorCode: string | null;
  errorMessage: string | null;
  requestPayload: string | null;
  responseSummary: string | null;
  latencyMs: number;
  executedAt: string;
  client?: { businessName: string; logo: string | null };
  scheduledPost?: { contentItem?: { title: string; contentType: string } };
}

export interface NotificationItem {
  id: string;
  userRole: string | null;
  clientId: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  client?: { businessName: string };
}

export interface AuditLogItem {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  clientId: string | null;
  detailsJson: string | null;
  createdAt: string;
  client?: { businessName: string };
}
