import React, { useState, useEffect } from 'react';
import { useClients } from '../../context/ClientContext';
import { api, getMediaUrl } from '../../api';
import {
  X,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Calendar,
  Clock,
  Send,
  Save,
  Smile,
  Hash,
  Share2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Globe,
  Heart,
  HardDrive,
  Link as LinkIcon,
  RefreshCw,
  Folder,
  UploadCloud,
  Check,
  Film,
  Camera,
  MessageCircle,
  Play,
  Video,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { openGoogleDrivePicker } from '../../utils/googleDrivePicker';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
  defaultClientId?: string;
  defaultCaption?: string;
  defaultContentType?: 'POST' | 'REEL' | 'STORY' | string;
  initialTemplate?: {
    title?: string;
    caption?: string;
    hashtags?: string;
    mediaUrl?: string;
    scheduleDate?: string;
    scheduleTime?: string;
  };
}

const getTodayDateStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTimeStr = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  defaultClientId,
  defaultCaption,
  defaultContentType,
  initialTemplate,
}) => {
  const { clients, selectedClient, selectedClientId } = useClients();

  const [brandId, setBrandId] = useState<string>(
    defaultClientId || (selectedClientId !== 'ALL' ? selectedClientId : (clients[0]?.id || ''))
  );

  const getInitialClientTags = (cid: string) => {
    const cl = clients.find((c) => c.id === cid);
    const rawName = cl?.businessName || 'Brand';
    const cleanName = rawName.replace(/[^a-zA-Z0-9]/g, '');
    const cleanLoc = (cl?.location || 'Indore').replace(/[^a-zA-Z0-9]/g, '');
    const cat = ((cl?.category || '') + ' ' + rawName).toLowerCase();

    if (/sweet|food|restaurant|cafe|bakery|namkeen|chaat|mithai|panna/i.test(cat)) {
      return {
        caption: `#${cleanName} #${cleanLoc}Foodie #${cleanLoc}Food #MithaiLovers #FoodLovers`,
        comment: `#${cleanLoc}City #ExploreFood #StreetFood${cleanLoc} #WeekendVibes #FoodieGram`,
      };
    } else if (/real\s*estate|property|plot|flat|builder|construction|babu|broker/i.test(cat)) {
      return {
        caption: `#${cleanName} #${cleanLoc}RealEstate #PlotsIn${cleanLoc} #${cleanLoc}Property #RealEstateIndia`,
        comment: `#${cleanLoc}Properties #PropertyInvestment #InvestIn${cleanLoc} #DreamHome #CommercialProperty`,
      };
    } else if (/fashion|saree|ethnic|boutique|cloth|apparel|dress|airawati/i.test(cat)) {
      return {
        caption: `#${cleanName} #${cleanLoc}Fashion #EthnicWear #SareeLove #IndianFashion`,
        comment: `#SareesOfInstagram #TraditionalWear #FestiveOutfit #ExploreFashion #${cleanLoc}Boutique`,
      };
    } else if (/marketing|digital|agency|brandsetu|social/i.test(cat)) {
      return {
        caption: `#${cleanName} #SocialMediaMarketing #DigitalMarketing${cleanLoc} #BusinessGrowth #BrandBuilding`,
        comment: `#MarketingStrategy #OnlineMarketing #StartupIndia #ExplorePage #BusinessTips`,
      };
    }
    return {
      caption: `#${cleanName} #${cleanLoc} #TopQuality #TrustedBrand #BestService`,
      comment: `#${cleanLoc}City #Explore${cleanLoc} #TrendingNow #LocalLove #ViralFeed`,
    };
  };

  const initialTags = getInitialClientTags(brandId);
  const [captionHashtags, setCaptionHashtags] = useState<string>(initialTags.caption);
  const [commentHashtags, setCommentHashtags] = useState<string>(initialTags.comment);

  const [title, setTitle] = useState(initialTemplate?.title || '');
  const [caption, setCaption] = useState(defaultCaption || initialTemplate?.caption || '');
  const [hashtags, setHashtags] = useState(
    initialTemplate?.hashtags || `${initialTags.caption} \n---FIRST_COMMENT---\n ${initialTags.comment}`
  );
  const [mediaUrl, setMediaUrl] = useState(
    initialTemplate?.mediaUrl ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
  );
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const displayMediaUrl = localPreviewUrl || getMediaUrl(mediaUrl);
  const [contentType, setContentType] = useState(defaultContentType || 'POST');

  const [scheduleDate, setScheduleDate] = useState(() => initialTemplate?.scheduleDate || getTodayDateStr());
  const [scheduleTime, setScheduleTime] = useState(() => initialTemplate?.scheduleTime || getCurrentTimeStr());

  useEffect(() => {
    if (isOpen) {
      const effId = defaultClientId || brandId;
      if (defaultClientId) setBrandId(defaultClientId);
      if (defaultCaption) setCaption(defaultCaption);
      if (defaultContentType) setContentType(defaultContentType);
      if (initialTemplate?.caption) setCaption(initialTemplate.caption);
      if (initialTemplate?.title) setTitle(initialTemplate.title);

      const clientTags = getInitialClientTags(effId);
      if (initialTemplate?.hashtags) {
        if (initialTemplate.hashtags.includes('---FIRST_COMMENT---')) {
          const parts = initialTemplate.hashtags.split('---FIRST_COMMENT---');
          setCaptionHashtags(parts[0].trim());
          setCommentHashtags(parts[1].trim());
          setHashtags(initialTemplate.hashtags);
        } else {
          const splitted = initialTemplate.hashtags.split(/\s+/).filter(Boolean);
          const cTags = splitted.slice(0, 5).join(' ');
          const cmTags = splitted.slice(5, 10).join(' ') || clientTags.comment;
          setCaptionHashtags(cTags);
          setCommentHashtags(cmTags);
          setHashtags(`${cTags} \n---FIRST_COMMENT---\n ${cmTags}`);
        }
      } else {
        setCaptionHashtags(clientTags.caption);
        setCommentHashtags(clientTags.comment);
        setHashtags(`${clientTags.caption} \n---FIRST_COMMENT---\n ${clientTags.comment}`);
      }

      if (initialTemplate?.mediaUrl) {
        setMediaUrl(initialTemplate.mediaUrl);
        setLocalPreviewUrl('');
      }
      setScheduleDate(initialTemplate?.scheduleDate || getTodayDateStr());
      setScheduleTime(initialTemplate?.scheduleTime || getCurrentTimeStr());
    } else {
      setLocalPreviewUrl('');
    }
  }, [isOpen, defaultClientId, defaultCaption, defaultContentType, initialTemplate]);

  // Sync client-specific tags when user switches brand in dropdown
  useEffect(() => {
    if (brandId) {
      const tags = getInitialClientTags(brandId);
      setCaptionHashtags(tags.caption);
      setCommentHashtags(tags.comment);
      const combined = `${tags.caption} \n---FIRST_COMMENT---\n ${tags.comment}`;
      setHashtags(combined);
      setPlatformHashtags((prev) => ({
        ...prev,
        INSTAGRAM: combined,
        FACEBOOK: combined,
      }));
    }
  }, [brandId]);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'INSTAGRAM',
    'FACEBOOK',
  ]);
  const [activePreviewPlatform, setActivePreviewPlatform] = useState<string>('INSTAGRAM');
  const [platformCaptions, setPlatformCaptions] = useState<Record<string, string>>({
    INSTAGRAM: '',
    FACEBOOK: '',
    LINKEDIN: '',
    TWITTER: '',
    YOUTUBE: '',
    GOOGLE_BUSINESS: '',
  });
  const [platformHashtags, setPlatformHashtags] = useState<Record<string, string>>({
    INSTAGRAM: `${initialTags.caption} \n---FIRST_COMMENT---\n ${initialTags.comment}`,
    FACEBOOK: `${initialTags.caption} \n---FIRST_COMMENT---\n ${initialTags.comment}`,
    LINKEDIN: `${initialTags.caption}`,
    TWITTER: `${initialTags.caption}`,
    YOUTUBE: `${initialTags.caption}`,
    GOOGLE_BUSINESS: `${initialTags.caption}`,
  });
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [uploadSource, setUploadSource] = useState<'upload' | 'drive' | 'url' | 'sample'>('upload');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [driveShareLink, setDriveShareLink] = useState('');
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveSyncSuccess, setDriveSyncSuccess] = useState(false);
  const [selectedDriveAssetId, setSelectedDriveAssetId] = useState<string | null>('drv-1');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaFit, setMediaFit] = useState<'contain' | 'cover'>('contain');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // AI Graphic Brand & Contact Safety States
  const [auditResult, setAuditResult] = useState<{
    isValid: boolean;
    detectedBrand: string | null;
    detectedPhone: string | null;
    detectedAddress: string | null;
    detectedWebsite: string | null;
    isBrandMatch: boolean;
    isPhoneMatch: boolean;
    isAddressMatch: boolean;
    conflictingClientName: string | null;
    blockReason: string | null;
    issues: string[];
    extractedTextSummary: string;
    checkedAt: string;
    isSkipped?: boolean;
  } | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  const [showAuditBlockModal, setShowAuditBlockModal] = useState(false);

  const extractVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        const objectUrl = URL.createObjectURL(file);
        video.src = objectUrl;
        video.onloadeddata = () => {
          video.currentTime = Math.min(1, (video.duration || 1) / 2);
        };
        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const thumbUrl = canvas.toDataURL('image/jpeg', 0.8);
              resolve(thumbUrl);
              setTimeout(() => { try { URL.revokeObjectURL(objectUrl); } catch {} }, 5000);
              return;
            }
          } catch {
            // fallback
          }
          resolve('https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80');
          setTimeout(() => { try { URL.revokeObjectURL(objectUrl); } catch {} }, 5000);
        };
        video.onerror = () => {
          resolve('https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80');
          setTimeout(() => { try { URL.revokeObjectURL(objectUrl); } catch {} }, 5000);
        };
        setTimeout(() => {
          resolve('https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80');
          setTimeout(() => { try { URL.revokeObjectURL(objectUrl); } catch {} }, 5000);
        }, 3000);
      } catch {
        resolve('https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80');
      }
    });
  };

  const isVideoMedia = (url?: string | null, type?: string | null, fileName?: string | null): boolean => {
    // 1. Check filename extension - if it's an image, it is NEVER a video
    if (fileName && /\.(png|jpe?g|webp|gif|svg|bmp|tiff)$/i.test(fileName)) return false;
    // If filename has video extension, it is definitely a video
    if (fileName && /\.(mp4|mov|webm|mkv|ogg|m4v|avi)$/i.test(fileName)) return true;

    if (!url) {
      return type === 'REEL' || type === 'VIDEO';
    }

    if (url === '/sample_reel.mp4') return true;
    if (url.startsWith('data:video/')) return true;
    if (url.startsWith('data:image/')) return false;

    const clean = url.toLowerCase().split('?')[0];
    if (/\.(png|jpe?g|webp|gif|svg|bmp|tiff)$/i.test(clean)) return false;
    if (/\.(mp4|mov|webm|mkv|ogg|m4v|avi)$/i.test(clean)) return true;

    // 2. Blob URLs fallback: only consider video if not an image filename
    if (url.startsWith('blob:')) {
      if (fileName && /\.(png|jpe?g|webp|gif|svg|bmp|tiff)$/i.test(fileName)) return false;
      return type === 'REEL' || type === 'VIDEO';
    }

    return false;
  };

  const sampleBrandTemplates = [
    {
      name: 'Brand Video Reel Showcase (9:16)',
      url: '/sample_reel.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      category: 'Instagram Reel',
      type: 'VIDEO',
    },
    {
      name: 'Modern Business Promo',
      url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
      category: 'Agency Promo',
      type: 'IMAGE',
    },
    {
      name: 'Luxury Real Estate Showcase',
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
      category: 'Real Estate',
      type: 'IMAGE',
    },
    {
      name: 'Cafe & Culinary Special',
      url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
      category: 'Food & Beverage',
      type: 'IMAGE',
    },
    {
      name: 'Healthcare & Wellness',
      url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
      category: 'Healthcare',
      type: 'IMAGE',
    },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const localUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(localUrl);
    setMediaUrl(localUrl);

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|ogg)$/i.test(file.name);
    if (isVideo) {
      setContentType('REEL');
      setThumbnailUrl(localUrl);
      extractVideoThumbnail(file).then((thumb) => {
        if (thumb) setThumbnailUrl(thumb);
      });
    } else {
      setContentType('POST');
      setThumbnailUrl(localUrl);
    }

    // Persist to server uploads
    try {
      setIsUploadingMedia(true);
      const uploaded = await api.uploadMedia(file);
      if (uploaded?.url) {
        setMediaUrl(uploaded.url);
        if (!isVideo) {
          setThumbnailUrl(uploaded.url);
          runGraphicAudit(uploaded.url, getEffectiveClientId());
        }
      }
    } catch (uploadErr) {
      console.warn('[CreatePostModal] File upload warning:', uploadErr);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleDriveLinkChange = (link: string) => {
    setDriveShareLink(link);
    setLocalPreviewUrl('');
    const match = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || link.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      setMediaUrl(`https://drive.google.com/uc?export=view&id=${fileId}`);
    } else if (link.trim()) {
      setMediaUrl(link.trim());
    }
  };

  const handleSelectDriveAsset = (asset: {
    id?: string;
    name: string;
    url: string;
    thumbnail?: string;
    type: string;
    size?: string;
    folder?: string;
  }) => {
    setLocalPreviewUrl('');
    setMediaUrl(asset.url);
    if (asset.id) setSelectedDriveAssetId(asset.id);
    setUploadedFileName(asset.name);

    const isVideo = asset.type === 'VIDEO' || asset.type === 'REEL' || isVideoMedia(asset.url, asset.type, asset.name);
    if (isVideo) {
      setContentType('REEL');
      setThumbnailUrl(asset.thumbnail || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80');
    } else {
      setContentType('POST');
      setThumbnailUrl(asset.thumbnail || asset.url);
    }

    if (!title) {
      const cleanTitle = asset.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanTitle);
    }
  };

  const handleSyncDrive = async () => {
    setIsSyncingDrive(true);
    try {
      const activeClientId = getEffectiveClientId();
      await api.syncDrive(activeClientId || undefined);
      setDriveSyncSuccess(true);
      setTimeout(() => setDriveSyncSuccess(false), 3000);
    } catch {
      setDriveSyncSuccess(true);
      setTimeout(() => setDriveSyncSuccess(false), 3000);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Sync brandId when clients or selectedClientId change
  useEffect(() => {
    if (selectedClientId !== 'ALL') {
      setBrandId(selectedClientId);
    } else if (clients.length > 0 && !brandId) {
      setBrandId(clients[0].id);
    }
  }, [selectedClientId, clients]);

  const togglePlatform = (p: string) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((item) => item !== p));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const getEffectiveClientId = () => {
    if (brandId && brandId !== 'ALL') return brandId;
    if (selectedClientId && selectedClientId !== 'ALL') return selectedClientId;
    if (selectedClient?.id) return selectedClient.id;
    if (clients.length > 0) return clients[0].id;
    return '';
  };

  const runGraphicAudit = async (targetMediaUrl?: string, targetBrandId?: string) => {
    const url = targetMediaUrl || mediaUrl;
    const bId = targetBrandId || getEffectiveClientId();
    if (!url || !bId) return;

    if (isVideoMedia(url, contentType, uploadedFileName)) {
      setAuditResult(null);
      return;
    }

    setIsAuditing(true);
    try {
      const res = await api.auditGraphic({
        clientId: bId,
        mediaUrl: url,
      });
      setAuditResult(res);
      if (!res.isValid) {
        setAdminOverride(false);
      }
    } catch (err: any) {
      console.warn('Graphic audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    if (isOpen && mediaUrl && !isVideoMedia(mediaUrl, contentType, uploadedFileName) && !mediaUrl.startsWith('blob:')) {
      runGraphicAudit(mediaUrl, brandId);
    }
  }, [mediaUrl, brandId, isOpen]);

  const handleAiCaption = async (targetPlatform?: any) => {
    setIsAiGenerating(true);
    setStatusMessage(null);
    try {
      const activeClientId = brandId || getEffectiveClientId();
      const clientObj = clients.find((c) => c.id === activeClientId);
      const platformToUse = (typeof targetPlatform === 'string' && targetPlatform)
        ? targetPlatform
        : (activePreviewPlatform || 'INSTAGRAM');

      const defaultTopic = title || (uploadedFileName
        ? uploadedFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        : `${clientObj?.businessName || 'Brand'} spotlight & updates`);

      const res = await api.generateAICaption({
        clientId: activeClientId || undefined,
        topic: defaultTopic,
        tone: 'Trustworthy, secure and engaging',
        platform: platformToUse,
        contentType,
        mediaUrl: mediaUrl || undefined,
      });

      if (res?.caption) {
        setPlatformCaptions((prev) => ({
          ...prev,
          [platformToUse]: res.caption,
        }));
        setCaption(res.caption);
      }

      let capTags = res?.captionHashtags?.trim();
      let comTags = res?.commentHashtags?.trim();

      if (!capTags || !comTags) {
        const clientDefaults = getInitialClientTags(activeClientId);
        if (!capTags) capTags = res?.hashtags?.trim() || clientDefaults.caption;
        if (!comTags) comTags = clientDefaults.comment;
      }

      setCaptionHashtags(capTags);
      setCommentHashtags(comTags);
      const combined = `${capTags} \n---FIRST_COMMENT---\n ${comTags}`;

      setPlatformHashtags((prev) => ({
        ...prev,
        [platformToUse]: combined,
      }));
      setHashtags(combined);

      setStatusMessage({
        type: 'success',
        text: `✨ Caption + 4-5 Reach Hashtags + 5 Auto-Comment tags generated for ${platformIcons[platformToUse]?.name || platformToUse} (${res?.aiModelUsed || 'AI Engine'})`,
      });
    } catch (err: any) {
      console.warn('[CreatePostModal] AI caption error:', err);
      const activeClientId = brandId || getEffectiveClientId();
      const clientObj = clients.find((c) => c.id === activeClientId);
      const brandName = clientObj?.businessName || 'BrandSetu Digital';

      // Only include address or phone if explicitly configured in client profile
      const contactItems: string[] = [];
      if (clientObj?.location) contactItems.push(`📍 ${clientObj.location}`);
      if (clientObj?.phone) contactItems.push(`📞 ${clientObj.phone}`);
      if (clientObj?.website) contactItems.push(`🌐 ${clientObj.website}`);
      const contactSection = contactItems.length > 0 ? `\n\n${contactItems.join(' | ')}` : '';

      const fallbackCaption = `✨ ${title || `${brandName} Showcase`}\n\nWe are committed to delivering the highest quality and value to our community. Connect with us to learn more! 🚀${contactSection}`;
      const plat = (typeof targetPlatform === 'string' && targetPlatform) ? targetPlatform : (activePreviewPlatform || 'INSTAGRAM');

      const clientDefaults = getInitialClientTags(activeClientId);
      setCaptionHashtags(clientDefaults.caption);
      setCommentHashtags(clientDefaults.comment);
      const combined = `${clientDefaults.caption} \n---FIRST_COMMENT---\n ${clientDefaults.comment}`;

      setPlatformCaptions((prev) => ({ ...prev, [plat]: fallbackCaption }));
      setCaption(fallbackCaption);
      setPlatformHashtags((prev) => ({ ...prev, [plat]: combined }));
      setHashtags(combined);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleGenerateHashtags = async (targetPlatform?: string) => {
    setIsGeneratingHashtags(true);
    setStatusMessage(null);
    try {
      const activeClientId = brandId || getEffectiveClientId();
      const clientObj = clients.find((c) => c.id === activeClientId);
      const plat = targetPlatform || activePreviewPlatform || 'INSTAGRAM';
      const defaultTopic = title || caption || (uploadedFileName
        ? uploadedFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        : `${clientObj?.businessName || 'Brand'} spotlight`);

      const res = await api.generateAIHashtags(activeClientId, defaultTopic);
      let capTags = res?.captionHashtags?.trim();
      let comTags = res?.commentHashtags?.trim();

      if (!capTags && res?.hashtags) {
        const splitted = res.hashtags.split(/\s+/).filter((t: string) => t.startsWith('#'));
        capTags = splitted.slice(0, 5).join(' ');
        comTags = splitted.slice(5, 10).join(' ');
      }

      if (!capTags || !comTags) {
        const defaults = getInitialClientTags(activeClientId);
        if (!capTags) capTags = defaults.caption;
        if (!comTags) comTags = defaults.comment;
      }

      setCaptionHashtags(capTags);
      setCommentHashtags(comTags);
      const combined = `${capTags} \n---FIRST_COMMENT---\n ${comTags}`;
      setHashtags(combined);
      setPlatformHashtags((prev) => ({ ...prev, [plat]: combined }));
      setStatusMessage({
        type: 'success',
        text: `✨ Generated 4-5 caption reach tags + 5 auto-comment tags for ${platformIcons[plat]?.name || plat}!`,
      });
    } catch (err: any) {
      console.warn('[CreatePostModal] AI hashtags fallback:', err);
      const activeClientId = brandId || getEffectiveClientId();
      const plat = targetPlatform || activePreviewPlatform || 'INSTAGRAM';
      const defaults = getInitialClientTags(activeClientId);
      setCaptionHashtags(defaults.caption);
      setCommentHashtags(defaults.comment);
      const combined = `${defaults.caption} \n---FIRST_COMMENT---\n ${defaults.comment}`;
      setHashtags(combined);
      setPlatformHashtags((prev) => ({ ...prev, [plat]: combined }));
      setStatusMessage({
        type: 'success',
        text: `✨ Generated smart hashtags for ${platformIcons[plat]?.name || plat}`,
      });
    } finally {
      setIsGeneratingHashtags(false);
    }
  };

  const handleGenerateAllPlatformCaptions = async () => {
    setIsAiGenerating(true);
    setStatusMessage(null);
    try {
      const activeClientId = brandId || getEffectiveClientId();
      const clientObj = clients.find((c) => c.id === activeClientId);
      const platformsToGen = (selectedPlatforms.length > 0 ? selectedPlatforms : ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TWITTER', 'YOUTUBE', 'GOOGLE_BUSINESS']);
      const defaultTopic = title || (uploadedFileName
        ? uploadedFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        : `${clientObj?.businessName || 'Brand'} spotlight & updates`);

      const responses = await Promise.all(
        platformsToGen.map(async (plat) => {
          try {
            const res = await api.generateAICaption({
              clientId: activeClientId || undefined,
              topic: defaultTopic,
              tone: 'Trustworthy, secure and engaging',
              platform: plat,
              contentType,
              mediaUrl: mediaUrl || undefined,
            });
            return { platform: plat, caption: res?.caption || '', hashtags: res?.hashtags || '' };
          } catch {
            return null;
          }
        })
      );

      const newCaps = { ...platformCaptions };
      const newTags = { ...platformHashtags };

      responses.forEach((r) => {
        if (r && r.caption) {
          newCaps[r.platform] = r.caption;
          newTags[r.platform] = r.hashtags;
        }
      });

      setPlatformCaptions(newCaps);
      setPlatformHashtags(newTags);

      if (newCaps[activePreviewPlatform]) {
        setCaption(newCaps[activePreviewPlatform]);
      }
      if (newTags[activePreviewPlatform] !== undefined) {
        setHashtags(newTags[activePreviewPlatform]);
      }

      setStatusMessage({
        type: 'success',
        text: `✨ Unique tailored captions generated for all ${platformsToGen.length} channels!`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Failed to auto-generate all captions. Please try again.',
      });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSubmit = async (action: 'PUBLISH' | 'SCHEDULE' | 'DRAFT') => {
    if (isUploadingMedia) {
      setStatusMessage({ type: 'error', text: 'Media file is still uploading to server. Please wait a moment...' });
      return;
    }

    if (isAuditing) {
      setStatusMessage({ type: 'error', text: 'AI Vision से ग्राफ़िक्स वेरिफाई हो रहा है, कृपया 2 सेकंड प्रतीक्षा करें...' });
      return;
    }

    const activeClientId = getEffectiveClientId();
    const clientObj = clients.find((c) => c.id === activeClientId);
    const isVideo = isVideoMedia(mediaUrl, contentType, uploadedFileName);

    // AI Graphic Quality & Contact Safety Gate:
    // If scheduling or publishing an image, check graphic details against client profile
    if ((action === 'SCHEDULE' || action === 'PUBLISH') && !isVideo && !adminOverride) {
      let currentAudit = auditResult;
      if (!currentAudit && mediaUrl && !mediaUrl.startsWith('blob:')) {
        setIsSubmitting(true);
        setStatusMessage({ type: 'info', text: 'ग्राफ़िक्स में ब्रांड नाम और फ़ोन नंबर जांचा जा रहा है...' });
        try {
          currentAudit = await api.auditGraphic({ clientId: activeClientId, mediaUrl });
          setAuditResult(currentAudit);
        } catch (e) {
          console.warn('Audit error:', e);
        }
        setIsSubmitting(false);
      }

      if (currentAudit && !currentAudit.isValid) {
        setStatusMessage({
          type: 'error',
          text: `🚫 पोस्ट शेड्यूल नहीं हो सकती: ${currentAudit.blockReason || 'ग्राफ़िक्स में ग़लत जानकारी पाई गई'}`,
        });
        setShowAuditBlockModal(true);
        return;
      }
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const effectiveMediaUrl = mediaUrl || '';
      const effectiveThumbnail = (thumbnailUrl && !thumbnailUrl.startsWith('blob:'))
        ? thumbnailUrl
        : (isVideo ? '' : effectiveMediaUrl);

      const activeCaption = platformCaptions[activePreviewPlatform] || caption;
      const currentCombined = `${captionHashtags.trim()} \n---FIRST_COMMENT---\n ${commentHashtags.trim()}`;
      const activeHashtags = platformHashtags[activePreviewPlatform] || currentCombined;

      const effectiveTitle = title.trim() || (activeCaption ? activeCaption.slice(0, 35).trim() : `${clientObj?.businessName || 'Brand'} Post`);

      const updatedPlatformHashtags = { ...platformHashtags };
      for (const p of selectedPlatforms) {
        if (!updatedPlatformHashtags[p] || !updatedPlatformHashtags[p].includes('---FIRST_COMMENT---')) {
          updatedPlatformHashtags[p] = currentCombined;
        }
      }

      await api.createManualContent({
        clientId: activeClientId,
        title: effectiveTitle,
        contentType,
        caption: activeCaption,
        hashtags: activeHashtags,
        platformCaptions,
        platformHashtags: updatedPlatformHashtags,
        mediaUrl: effectiveMediaUrl,
        thumbnailUrl: effectiveThumbnail,
        platforms: selectedPlatforms,
        status: action === 'PUBLISH' ? 'PUBLISHED' : action === 'SCHEDULE' ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: action === 'SCHEDULE' ? new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString() : undefined,
        skipAudit: adminOverride,
      });

      setStatusMessage({
        type: 'success',
        text:
          action === 'PUBLISH'
            ? 'Post published successfully across selected channels!'
            : action === 'SCHEDULE'
              ? `Post scheduled for ${scheduleDate} at ${scheduleTime}!`
              : 'Post saved as draft.',
      });

      setTimeout(() => {
        if (onPostCreated) onPostCreated();
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to submit post',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const platformIcons: Record<string, any> = {
    FACEBOOK: { icon: Facebook, color: 'text-blue-600', name: 'Facebook' },
    INSTAGRAM: { icon: Instagram, color: 'text-pink-600', name: 'Instagram' },
    LINKEDIN: { icon: Linkedin, color: 'text-blue-700', name: 'LinkedIn' },
    TWITTER: { icon: Twitter, color: 'text-sky-500', name: 'X / Twitter' },
    YOUTUBE: { icon: Youtube, color: 'text-red-600', name: 'YouTube' },
    GOOGLE_BUSINESS: { icon: Globe, color: 'text-emerald-600', name: 'Google Business' },
  };

  const currentBrand =
    clients.find((c) => c.id === brandId) ||
    clients.find((c) => c.id === selectedClientId) ||
    selectedClient ||
    clients[0];
  const brandDisplayName = currentBrand?.businessName || 'Property Babu';
  const brandAvatarInitial = brandDisplayName.charAt(0).toUpperCase();
  const brandHandle = brandDisplayName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full my-6 shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">Create Post</h3>
            <p className="text-xs text-gray-500">
              Publish or schedule content across multiple social media platforms simultaneously.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : statusMessage.type === 'info'
                ? 'bg-blue-50 text-blue-800 border border-blue-200 animate-pulse'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : statusMessage.type === 'info' ? (
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Main 2-Column Editor + Live Preview */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Target Brand Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Target Brand *
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4] text-gray-900"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName} ({c.location ? c.location.split(',')[0] : 'Indore'})
                  </option>
                ))}
              </select>
            </div>

            {/* Multi-Channel Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Select Publishing Channels *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.keys(platformIcons).map((pKey) => {
                  const item = platformIcons[pKey];
                  const Icon = item.icon;
                  const isSelected = selectedPlatforms.includes(pKey);

                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => togglePlatform(pKey)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition ${isSelected
                          ? 'border-[#0172F4] bg-blue-50/60 text-[#0172F4] ring-1 ring-[#0172F4]'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#0172F4]' : item.color}`} />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Post Title & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Post Title</label>
                <input
                  type="text"
                  placeholder="e.g. Weekend Festival Offer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Content Type</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                >
                  <option value="POST">Feed Post (Auto Fit 1:1)</option>
                  <option value="REEL">Instagram & Facebook Reel (9:16 Fullscreen Video)</option>
                  <option value="STORY">Instagram & Facebook Story (9:16 Story)</option>
                  <option value="GOOGLE_BUSINESS_POST">Google Business Update</option>
                </select>
              </div>
            </div>

            {/* Media Upload / Source Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">Media Asset *</label>

              {/* Quick Mode Toggle Pills */}
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-100/80 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setUploadSource('upload')}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${uploadSource === 'upload'
                      ? 'bg-white text-[#0172F4] font-bold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadSource('drive')}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${uploadSource === 'drive'
                      ? 'bg-white text-[#0172F4] font-bold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Google Drive</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadSource('url')}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${uploadSource === 'url'
                      ? 'bg-white text-[#0172F4] font-bold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Direct URL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadSource('sample')}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${uploadSource === 'sample'
                      ? 'bg-white text-[#0172F4] font-bold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Templates</span>
                </button>
              </div>

              {/* 1. UPLOAD FROM DEVICE */}
              {uploadSource === 'upload' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*,video/*"
                    className="hidden"
                  />

                  {uploadedFileName ? (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#0172F4] text-white flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{uploadedFileName}</p>
                          {isUploadingMedia ? (
                            <p className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Saving media to server...
                            </p>
                          ) : (
                            <p className="text-[10px] text-emerald-600 font-medium">✓ Uploaded & ready</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedFileName(null);
                            setMediaUrl('');
                            setLocalPreviewUrl('');
                          }}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 hover:border-[#0172F4] hover:bg-blue-50/20 rounded-xl p-4 text-center cursor-pointer transition group"
                    >
                      <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-[#0172F4] mx-auto mb-1.5 transition" />
                      <p className="text-xs font-bold text-gray-800">
                        Click to upload image or video from your computer
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Supports JPG, PNG, WEBP, MP4 (up to 50MB)</p>
                    </div>
                  )}
                </div>
              )}

              {/* 2. GOOGLE DRIVE OPTION */}
              {uploadSource === 'drive' && (
                <div className="space-y-3">
                  {uploadedFileName && mediaUrl ? (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#0172F4] text-white flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{uploadedFileName}</p>
                          <p className="text-[10px] text-emerald-600 font-medium">✓ Selected from Google Drive</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            openGoogleDrivePicker({
                              onSelect: (file) => {
                                setLocalPreviewUrl('');
                                setMediaUrl(file.url);
                                setUploadedFileName(file.name);
                                if (file.type === 'VIDEO' || file.type === 'REEL') {
                                  setContentType('REEL');
                                  setThumbnailUrl(file.thumbnailUrl || '');
                                } else {
                                  setContentType('POST');
                                  setThumbnailUrl(file.thumbnailUrl || file.url);
                                }
                                if (!title) {
                                  setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
                                }
                              },
                            });
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedFileName(null);
                            setMediaUrl('');
                            setLocalPreviewUrl('');
                            setDriveShareLink('');
                          }}
                          className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        openGoogleDrivePicker({
                          onSelect: (file) => {
                            setLocalPreviewUrl('');
                            setMediaUrl(file.url);
                            setUploadedFileName(file.name);
                            if (file.type === 'VIDEO' || file.type === 'REEL') {
                              setContentType('REEL');
                              setThumbnailUrl(file.thumbnailUrl || '');
                            } else {
                              setContentType('POST');
                              setThumbnailUrl(file.thumbnailUrl || file.url);
                            }
                            if (!title) {
                              setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
                            }
                          },
                        });
                      }}
                      className="border-2 border-dashed border-gray-200 hover:border-[#0172F4] hover:bg-blue-50/20 rounded-xl p-6 text-center cursor-pointer transition group"
                    >
                      <HardDrive className="w-7 h-7 text-gray-400 group-hover:text-[#0172F4] mx-auto mb-1.5 transition" />
                      <p className="text-xs font-bold text-gray-800">
                        Click to select image or video from Google Drive
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Choose creatives, photos, or reels directly from your Google Drive
                      </p>
                    </div>
                  )}

                  {/* Google Drive Link Input */}
                  <div className="pt-2 border-t border-gray-100">
                    <input
                      type="text"
                      placeholder="Or paste Google Drive share link (https://drive.google.com/file/d/.../view)"
                      value={driveShareLink}
                      onChange={(e) => handleDriveLinkChange(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                    />
                  </div>
                </div>
              )}

              {/* 3. DIRECT URL LINK */}
              {uploadSource === 'url' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://... image or video (.mp4) link"
                    value={mediaUrl}
                    onChange={(e) => {
                      setMediaUrl(e.target.value);
                      setLocalPreviewUrl('');
                    }}
                    className="flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLocalPreviewUrl('');
                      setMediaUrl('/sample_reel.mp4');
                      setContentType('REEL');
                    }}
                    className="px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Film className="w-3.5 h-3.5 text-purple-600" />
                    <span>Sample Reel</span>
                  </button>
                </div>
              )}

              {/* 4. SAMPLE BRAND TEMPLATES */}
              {uploadSource === 'sample' && (
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {sampleBrandTemplates.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setLocalPreviewUrl('');
                        setMediaUrl(item.url);
                        if (item.type === 'VIDEO') {
                          setContentType('REEL');
                          setThumbnailUrl(item.thumbnail || '');
                        }
                      }}
                      className={`p-2 rounded-lg border cursor-pointer transition flex items-center gap-2 ${mediaUrl === item.url
                          ? 'border-[#0172F4] bg-blue-50/60 ring-1 ring-[#0172F4]'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                    >
                      <div className="relative w-10 h-10 rounded-md overflow-hidden border border-gray-200 shrink-0 bg-gray-900 flex items-center justify-center">
                        <img
                          src={item.thumbnail || item.url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        {item.type === 'VIDEO' && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play className="w-3.5 h-3.5 text-white fill-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-gray-900 truncate">{item.name}</p>
                        <span className="text-[9px] text-gray-400">{item.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Graphic Brand & Contact Safety Verification Banner */}
            {!isVideoMedia(displayMediaUrl, contentType, uploadedFileName) && displayMediaUrl && (
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  isAuditing
                    ? 'bg-blue-50/70 border-blue-200'
                    : auditResult?.isValid
                    ? 'bg-emerald-50/80 border-emerald-300'
                    : auditResult && !auditResult.isValid
                    ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-200 shadow-xs'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isAuditing
                          ? 'bg-blue-600 text-white animate-pulse'
                          : auditResult?.isValid
                          ? 'bg-emerald-600 text-white'
                          : auditResult && !auditResult.isValid
                          ? 'bg-rose-600 text-white animate-bounce'
                          : 'bg-gray-400 text-white'
                      }`}
                    >
                      {isAuditing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : auditResult?.isValid ? (
                        <ShieldCheck className="w-5 h-5" />
                      ) : auditResult && !auditResult.isValid ? (
                        <ShieldAlert className="w-5 h-5" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-gray-900">
                          {isAuditing
                            ? 'AI Vision Graphic Inspection (जांच जारी है...)'
                            : auditResult?.isValid
                            ? '✅ Graphic Verified (ग्राफ़िक्स सत्यापित)'
                            : auditResult && !auditResult.isValid
                            ? '🚫 ग़लत जानकारी डिटेक्ट हुई (Wrong Graphic Detected!)'
                            : 'AI Graphic Safety Check'}
                        </h4>
                        {auditResult?.isValid && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            Safe to Schedule ✓
                          </span>
                        )}
                        {auditResult && !auditResult.isValid && (
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                            Schedule Blocked ✕
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-gray-600 mt-0.5">
                        {isAuditing
                          ? 'इमेज में लिखा ब्रांड नाम, फ़ोन नंबर और पता क्लाइंट डेटा से मैच किया जा रहा है...'
                          : auditResult?.isValid
                          ? `इमेज में ब्रांड नाम और संपर्क जानकारी क्लाइंट (${clients.find(c => c.id === getEffectiveClientId())?.businessName}) से सही मैच है।`
                          : auditResult && !auditResult.isValid
                          ? auditResult.blockReason
                          : 'इमेज अपलोड होने पर AI स्वचालित रूप से जांच करेगा।'}
                      </p>

                      {/* Details / Issues */}
                      {auditResult && !auditResult.isValid && auditResult.issues && auditResult.issues.length > 0 && (
                        <div className="mt-2.5 p-2 bg-rose-100/70 border border-rose-200 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 block">
                            पाई गई गलतियां (Found Discrepancies):
                          </span>
                          {auditResult.issues.map((issue, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-xs text-rose-800 font-medium">
                              <span className="text-rose-600 font-bold">•</span>
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Detected pills when valid */}
                      {auditResult?.isValid && (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                          {auditResult.detectedBrand && (
                            <span className="bg-emerald-100/80 text-emerald-900 px-2 py-0.5 rounded-md font-semibold">
                              🏷️ Brand: {auditResult.detectedBrand}
                            </span>
                          )}
                          {auditResult.detectedPhone && (
                            <span className="bg-emerald-100/80 text-emerald-900 px-2 py-0.5 rounded-md font-semibold">
                              📞 Phone: {auditResult.detectedPhone}
                            </span>
                          )}
                          {auditResult.detectedAddress && (
                            <span className="bg-emerald-100/80 text-emerald-900 px-2 py-0.5 rounded-md font-semibold">
                              📍 Address: {auditResult.detectedAddress}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => runGraphicAudit()}
                      disabled={isAuditing}
                      className="text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Re-run AI graphic verification"
                    >
                      <RefreshCw className={`w-3 h-3 ${isAuditing ? 'animate-spin' : ''}`} />
                      <span>पुनः जांचें</span>
                    </button>

                    {auditResult && !auditResult.isValid && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <UploadCloud className="w-3 h-3" />
                        <span>सही इमेज लगाएं</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Admin Override Checkbox if audit failed */}
                {auditResult && !auditResult.isValid && (
                  <div className="mt-3 pt-2.5 border-t border-rose-200 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={adminOverride}
                        onChange={(e) => setAdminOverride(e.target.checked)}
                        className="w-4 h-4 text-[#0172F4] rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span>Admin Override: मुझे पता है, फिर भी इस इमेज को शेड्यूल करें</span>
                    </label>
                    {adminOverride && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                        ⚠️ Warning: Override Enabled
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Caption Editor with AI Assist */}
            {/* Caption Editor with Channel Tabs & AI Assist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-800">Caption / Description</label>
                  <span className="text-[10px] font-bold bg-blue-50 text-[#0172F4] px-2 py-0.5 rounded-full border border-blue-200">
                    Posting for: {brandDisplayName}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAiCaption(activePreviewPlatform)}
                    disabled={isAiGenerating}
                    className="text-xs font-semibold text-[#0172F4] hover:text-[#005cd3] flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition border border-blue-200 cursor-pointer"
                    title={`Generate tailored caption for ${platformIcons[activePreviewPlatform]?.name || activePreviewPlatform}`}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
                    <span>{isAiGenerating ? 'Writing...' : `✨ AI Write (${platformIcons[activePreviewPlatform]?.name || activePreviewPlatform})`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateAllPlatformCaptions}
                    disabled={isAiGenerating}
                    className="text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center gap-1 px-3 py-1 rounded-lg transition shadow-xs cursor-pointer"
                    title="Generate unique, custom-tailored captions for every selected platform simultaneously"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ AI Auto-Write All Channels</span>
                  </button>
                </div>
              </div>

              {/* Channel Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(selectedPlatforms.length > 0 ? selectedPlatforms : ['INSTAGRAM', 'FACEBOOK']).map((pKey) => {
                  const item = platformIcons[pKey];
                  const Icon = item?.icon || Sparkles;
                  const isActive = activePreviewPlatform === pKey;
                  const hasCustom = !!platformCaptions[pKey];

                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => {
                        setActivePreviewPlatform(pKey);
                        if (platformCaptions[pKey]) setCaption(platformCaptions[pKey]);
                        if (platformHashtags[pKey] !== undefined) setHashtags(platformHashtags[pKey]);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-[#0172F4] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item?.name || pKey}</span>
                      {hasCustom && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              <textarea
                rows={4}
                placeholder={`Write tailored caption for ${platformIcons[activePreviewPlatform]?.name || activePreviewPlatform}...`}
                value={caption}
                onChange={(e) => {
                  const val = e.target.value;
                  setCaption(val);
                  setPlatformCaptions((prev) => ({ ...prev, [activePreviewPlatform]: val }));
                }}
                className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4] leading-relaxed"
              ></textarea>

              <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400">
                <span>{caption.length} characters</span>
                <span className="text-gray-500">Channel: {platformIcons[activePreviewPlatform]?.name || activePreviewPlatform}</span>
              </div>
            </div>

            {/* Dual Hashtag Strategy: 4-5 Caption Tags + 5 First-Comment Tags */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-[#0172F4]" />
                    <span>Hashtags Strategy ({platformIcons[activePreviewPlatform]?.name || activePreviewPlatform})</span>
                  </label>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                    High Reach & Auto-Comment
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGenerateHashtags(activePreviewPlatform)}
                  disabled={isGeneratingHashtags}
                  className="text-[11px] font-semibold text-[#0172F4] hover:text-[#005cd3] flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition border border-blue-200 cursor-pointer"
                  title="Generate niche 4-5 caption tags and 5 first-comment tags for this client"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingHashtags ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingHashtags ? 'Generating Tags...' : '✨ AI Generate Client Hashtags'}</span>
                </button>
              </div>

              {/* 1. Caption Hashtags (4 to 5 best tags) */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-xs font-bold text-gray-800">1. Post Caption Hashtags</span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Top 4-5 Tags (Maximum Reach & Views)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500">
                    {captionHashtags.split(/\s+/).filter(Boolean).length} / 5 tags
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Instagram & Meta algorithm ke mutabik 4-5 best niche keywords caption ke end me lagte hain reach aur views maximise karne ke liye.
                </p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="#BrandName #CityNiche #TopKeyword"
                    value={captionHashtags}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCaptionHashtags(val);
                      const combined = `${val.trim()} \n---FIRST_COMMENT---\n ${commentHashtags.trim()}`;
                      setHashtags(combined);
                      setPlatformHashtags((prev) => ({ ...prev, [activePreviewPlatform]: combined }));
                    }}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4] font-medium text-gray-800"
                  />
                  <Hash className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* 2. First-Comment Hashtags (5 Boost Tags - Auto-Comment) */}
              <div className="p-3 bg-gradient-to-br from-indigo-50/50 to-blue-50/40 rounded-xl border border-indigo-100 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-xs font-bold text-gray-800">2. First-Comment Hashtags</span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      5 Tags (Auto-Comment on Publish)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-600">
                    {commentHashtags.split(/\s+/).filter(Boolean).length} / 5 tags
                  </span>
                </div>
                <p className="text-[11px] text-gray-600">
                  Post live hote hi client ke official account se pehla comment ye 5 hashtags automatically post karega ({clients.find((c) => c.id === brandId)?.businessName || 'Client'} ke hisab se).
                </p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="#ExploreNiche #CityCity #WeekendVibes #NicheGram #Trending"
                    value={commentHashtags}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCommentHashtags(val);
                      const combined = `${captionHashtags.trim()} \n---FIRST_COMMENT---\n ${val.trim()}`;
                      setHashtags(combined);
                      setPlatformHashtags((prev) => ({ ...prev, [activePreviewPlatform]: combined }));
                    }}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-gray-800"
                  />
                  <MessageCircle className="w-3.5 h-3.5 text-indigo-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Scheduling Date & Time */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 block">Schedule Publishing (Optional)</span>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleDate(getTodayDateStr());
                    setScheduleTime(getCurrentTimeStr());
                  }}
                  className="text-[11px] font-semibold text-[#0172F4] hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Reset to current local date & time"
                >
                  <RefreshCw className="w-3 h-3" />
                  Set to Now
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                    Date
                  </label>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 focus-within:ring-1 focus-within:ring-[#0172F4] focus-within:border-[#0172F4]">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="text-xs text-gray-800 bg-transparent focus:outline-none w-full cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                    Time
                  </label>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 focus-within:ring-1 focus-within:ring-[#0172F4] focus-within:border-[#0172F4]">
                    <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="text-xs text-gray-800 bg-transparent focus:outline-none w-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              {scheduleDate && scheduleTime && (
                <div className="text-[11px] text-gray-600 bg-blue-50/70 border border-blue-100 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    Scheduled for:
                  </span>
                  <strong className="text-gray-900 font-semibold">
                    {new Date(`${scheduleDate}T${scheduleTime}:00`).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(`${scheduleDate}T${scheduleTime}:00`).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Phone Preview Mockup (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700">Live Post Preview</span>
              <div className="flex items-center gap-1">
                {selectedPlatforms.map((p) => {
                  const Icon = platformIcons[p]?.icon || Share2;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActivePreviewPlatform(p)}
                      className={`p-1 rounded-md transition ${activePreviewPlatform === p ? 'bg-blue-100 text-[#0172F4]' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Realistic Smartphone Frame Mockup */}
            <div className="w-full max-w-[290px] bg-black rounded-[36px] p-2.5 shadow-2xl border-4 border-gray-800 ring-1 ring-gray-200">
              {/* Phone screen */}
              <div className="bg-white rounded-[28px] overflow-hidden text-xs flex flex-col min-h-[460px] relative">
                {/* Status Bar */}
                <div className={`h-6 flex items-center justify-between px-4 text-[10px] font-semibold z-20 shrink-0 ${contentType === 'REEL' ? 'bg-black/60 text-white backdrop-blur-xs' : 'bg-gray-50 text-gray-600'
                  }`}>
                  <span>9:41</span>
                  <div className="w-12 h-3.5 bg-black rounded-full mx-auto"></div>
                  <span>5G</span>
                </div>

                {/* REEL / STORY VIEW (Realistic Fullscreen 9:16 layout) */}
                {contentType === 'REEL' || contentType === 'STORY' ? (
                  <div className="relative w-full h-[434px] bg-black text-white flex flex-col justify-between overflow-hidden">
                    {/* Media: Video or Image (Full edge-to-edge) */}
                    {displayMediaUrl ? (
                      isVideoMedia(displayMediaUrl, contentType, uploadedFileName) ? (
                        <video
                          key={displayMediaUrl}
                          src={displayMediaUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          controls={false}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          key={displayMediaUrl}
                          src={displayMediaUrl}
                          alt="Visual"
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-purple-950 via-gray-900 to-black text-gray-400 p-4 text-center">
                        <Film className="w-10 h-10 text-purple-400 mb-2 animate-pulse" />
                        <span className="text-xs font-semibold text-gray-300">No Media Selected</span>
                        <span className="text-[10px] text-gray-500 mt-1">Upload a video or photo</span>
                      </div>
                    )}

                    {/* Gradient shading top & bottom for legibility */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none z-10" />

                    {/* Top Status & Header Bar */}
                    <div className="relative z-20 p-3 pt-2 flex items-center justify-between text-white">
                      <div className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-white" />
                        <span className="font-bold text-xs tracking-wide">
                          {contentType === 'STORY' ? 'Story' : 'Reels'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {activePreviewPlatform}
                        </span>
                      </div>
                    </div>

                    {/* Right-hand side Reel Action Bar (Like, Comment, Share) */}
                    <div className="absolute right-2 bottom-16 z-20 flex flex-col items-center gap-3.5 text-white">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-xs flex items-center justify-center hover:scale-110 transition cursor-pointer">
                          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                        </div>
                        <span className="text-[9px] font-semibold mt-0.5">2.4k</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-xs flex items-center justify-center hover:scale-110 transition cursor-pointer">
                          <MessageCircle className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-[9px] font-semibold mt-0.5">86</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-xs flex items-center justify-center hover:scale-110 transition cursor-pointer">
                          <Share2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-[9px] font-semibold mt-0.5">Share</span>
                      </div>

                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[1.5px]">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[8px] font-bold">
                          🎵
                        </div>
                      </div>
                    </div>

                    {/* Bottom Caption & Profile Overlay */}
                    <div className="relative z-20 p-3 pb-3 space-y-1 text-left max-w-[82%]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#0172F4] text-white flex items-center justify-center font-bold text-[9px] ring-1 ring-white">
                          {brandAvatarInitial}
                        </div>
                        <span className="font-bold text-xs text-white drop-shadow-xs">
                          {brandHandle}
                        </span>
                        <span className="text-[9px] font-semibold bg-white/25 backdrop-blur-xs px-1.5 py-0.5 rounded-full text-white">
                          Follow
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-100 leading-snug line-clamp-2 drop-shadow-xs">
                        {caption || 'Exciting things coming up! Watch full reel and follow for more insights.'}
                      </p>

                      {captionHashtags && (
                        <p className="text-[10px] text-blue-300 font-medium truncate drop-shadow-xs">
                          {captionHashtags}
                        </p>
                      )}

                      <div className="flex items-center gap-1 text-[9px] text-gray-300">
                        <span>🎵</span>
                        <span className="truncate">Original audio • {brandDisplayName}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Post Preview (Square 1:1) */
                  <div className="flex flex-col flex-1 overflow-y-auto">
                    {/* Platform Header */}
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#0172F4] text-white flex items-center justify-center font-bold text-[10px]">
                          {brandAvatarInitial}
                        </div>
                        <div>
                          <p className="font-bold text-[11px] leading-tight text-gray-900">
                            {brandHandle}
                          </p>
                          <p className="text-[9px] text-gray-400 leading-none">{activePreviewPlatform}</p>
                        </div>
                      </div>
                    </div>

                    {/* Media Display: Adaptive Mobile Feed Container (zero black bars, matches real Instagram & Facebook feed) */}
                    <div className="w-full bg-white overflow-hidden relative flex items-center justify-center shrink-0 min-h-[140px] max-h-[300px]">
                      {displayMediaUrl ? (
                        isVideoMedia(displayMediaUrl, contentType, uploadedFileName) ? (
                          <div className="w-full bg-black flex items-center justify-center">
                            <video
                              key={displayMediaUrl}
                              src={displayMediaUrl}
                              controls
                              autoPlay
                              muted
                              loop
                              playsInline
                              className="w-full h-auto max-h-[300px] object-contain block"
                            />
                          </div>
                        ) : (
                          <img
                            key={displayMediaUrl}
                            src={displayMediaUrl}
                            alt="Post Visual"
                            className="w-full h-auto max-h-[300px] object-contain block bg-white"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const fallback = (e.target as HTMLElement).nextElementSibling;
                              if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                            }}
                          />
                        )
                      ) : null}

                      {/* Clean styled fallback if no media or load error */}
                      <div
                        className={`w-full h-44 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 p-4 ${displayMediaUrl ? 'hidden' : 'flex'
                          }`}
                      >
                        <ImageIcon className="w-7 h-7 text-gray-400 mb-1" />
                        <span className="text-xs font-semibold text-gray-500">No Media Selected</span>
                        <span className="text-[10px] text-gray-400">Choose an image or video</span>
                      </div>
                    </div>

                    {/* Post Action Icons */}
                    <div className="px-3 py-2 flex items-center justify-between text-gray-700 shrink-0 bg-white">
                      <div className="flex items-center gap-3">
                        <Heart className="w-4 h-4 hover:text-rose-500 cursor-pointer" />
                        <Share2 className="w-4 h-4 cursor-pointer" />
                      </div>
                    </div>

                    {/* Caption & Hashtags text with First Comment Bubble */}
                    <div className="px-3 pb-3 space-y-2 text-[11px] text-gray-800 leading-snug overflow-y-auto max-h-48 bg-white">
                      <p>
                        <span className="font-bold text-gray-900 mr-1.5">
                          {brandHandle}
                        </span>
                        {caption || 'Add your caption to preview how it looks on social media feeds.'}
                      </p>
                      {captionHashtags && (
                        <p className="text-[#0172F4] text-[10px] font-medium leading-relaxed">
                          {captionHashtags}
                        </p>
                      )}

                      {/* First Comment Live Preview Bubble (Matching author comment like in the user's screenshot) */}
                      {commentHashtags && (
                        <div className="mt-2.5 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MessageCircle className="w-3 h-3 text-indigo-500" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              First Comment (Auto-Posted by Author)
                            </span>
                          </div>
                          <div className="p-2 bg-indigo-50/60 rounded-lg border border-indigo-100/80 text-[10.5px]">
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="w-4 h-4 rounded-full bg-[#0172F4] text-white flex items-center justify-center font-bold text-[8px]">
                                {brandAvatarInitial}
                              </div>
                              <span className="font-bold text-gray-900 text-[10px]">{brandHandle}</span>
                              <span className="text-[9px] font-semibold text-gray-500 bg-white px-1 py-0.2 rounded border border-gray-200">
                                Author
                              </span>
                              <span className="text-[9px] text-gray-400">• 1s</span>
                            </div>
                            <p className="text-[#0172F4] font-medium leading-relaxed pl-5">
                              {commentHashtags}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            Discard
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('DRAFT')}
              className="px-3.5 py-2 text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('SCHEDULE')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                auditResult && !auditResult.isValid && !adminOverride
                  ? 'border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700'
                  : 'border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0172F4]'
              }`}
            >
              {auditResult && !auditResult.isValid && !adminOverride ? (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              ) : (
                <Calendar className="w-3.5 h-3.5" />
              )}
              <span>{auditResult && !auditResult.isValid && !adminOverride ? 'Blocked: Fix Graphic' : 'Schedule'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('PUBLISH')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                auditResult && !auditResult.isValid && !adminOverride
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                  : 'bg-[#0172F4] hover:bg-[#005cd3] text-white shadow-blue-500/20'
              }`}
            >
              {auditResult && !auditResult.isValid && !adminOverride ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Publish Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Graphic Safety Blocking Modal */}
      {showAuditBlockModal && auditResult && !auditResult.isValid && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-extrabold text-gray-900 text-center">
              🚫 पोस्ट शेड्यूल नहीं हो सकती!
            </h3>
            <p className="text-xs text-rose-600 font-bold text-center mt-1">
              (Graphic Verification Failed - जानकारी मिसमैच)
            </p>

            <p className="text-xs text-gray-600 text-center mt-2.5 leading-relaxed">
              इस ग्राफ़िक्स में जो जानकारी (ब्रांड नाम, फ़ोन नंबर या पता) है वह चुने गए क्लाइंट की आधिकारिक डिटेल्स से मेल नहीं खाती।
            </p>

            {/* Target Client vs Graphic Mismatch Card */}
            <div className="mt-4 p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="font-semibold text-gray-500">चुना गया क्लाइंट (Target Client):</span>
                <span className="font-bold text-gray-900">{clients.find(c => c.id === getEffectiveClientId())?.businessName}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="font-semibold text-gray-500">क्लाइंट का असली फ़ोन नंबर:</span>
                <span className="font-bold text-gray-900">{clients.find(c => c.id === getEffectiveClientId())?.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-500">क्लाइंट का स्थान (Location):</span>
                <span className="font-bold text-gray-900">{clients.find(c => c.id === getEffectiveClientId())?.location || 'N/A'}</span>
              </div>
            </div>

            {/* Discrepancies List */}
            <div className="mt-4 p-3.5 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>पाई गई गलतियां (Detected Issues):</span>
              </div>
              <div className="space-y-1.5">
                {auditResult.issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-rose-800">
                    <span className="text-rose-500 font-bold">•</span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
              {auditResult.blockReason && (
                <p className="text-xs text-rose-900 font-semibold pt-1 border-t border-rose-200/80">
                  ⚠️ {auditResult.blockReason}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAuditBlockModal(false);
                  fileInputRef.current?.click();
                }}
                className="w-full py-2.5 px-4 bg-[#0172F4] hover:bg-[#005cd3] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>सही ग्राफ़िक्स अपलोड करें (Upload Right Graphic)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAuditBlockModal(false)}
                  className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  क्लाइंट या इमेज बदलें
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminOverride(true);
                    setShowAuditBlockModal(false);
                  }}
                  className="flex-1 py-2 px-3 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Admin Override (फोर्स शेड्यूल करें)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
