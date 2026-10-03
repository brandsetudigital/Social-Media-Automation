import React, { useState, useEffect, useMemo } from 'react';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
import {
  Plus,
  Calendar as CalendarIcon,
  List as ListIcon,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Sparkles,
  Facebook,
  Instagram,
  Linkedin,
  Eye,
  X,
  Filter,
  Share2,
  Layers,
  ArrowUpRight,
  Film,
  Play,
  Video,
  RefreshCw,
  Building2,
  Columns,
  Grid,
  CalendarDays,
  ExternalLink,
  Edit3,
  Trash2,
  LayoutGrid,
  Globe,
} from 'lucide-react';
import { CreatePostModal } from './CreatePostModal';
import { NavTab } from '../layout/Sidebar';

interface PostsManagerViewProps {
  initialDate?: Date;
  initialCalendarTab?: 'month' | 'week' | 'day';
  initialViewMode?: 'calendar' | 'cards' | 'list';
  initialStatusFilter?: string;
  targetPostId?: string | null;
  onNavigateTab?: (tab: NavTab) => void;
  onOpenCreatePost?: (template?: any) => void;
}

const isVideoMedia = (url?: string | null, type?: string | null): boolean => {
  if (type === 'REEL' || type === 'VIDEO' || type === 'STORY') return true;
  if (!url) return false;
  if (url === '/sample_reel.mp4') return true;
  if (url.startsWith('data:video/') || (url.startsWith('blob:') && type === 'REEL')) return true;
  const clean = url.toLowerCase().split('?')[0];
  return clean.endsWith('.mp4') || clean.endsWith('.mov') || clean.endsWith('.webm') || clean.endsWith('.mkv') || clean.endsWith('.ogg');
};

const getPostCleanTitle = (p: any): string => {
  if (!p) return 'Scheduled Post';
  const rawTitle = (p.title || '').trim();
  const isNumericOrId = /^\d{8,}/.test(rawTitle);
  if (isNumericOrId || !rawTitle || rawTitle.toLowerCase() === 'scheduled social post') {
    if (p.caption && p.caption.trim().length > 0) {
      const cleanCaption = p.caption.replace(/#\S+/g, '').replace(/\s+/g, ' ').trim();
      if (cleanCaption.length > 0) {
        return cleanCaption.length > 28 ? cleanCaption.slice(0, 28) + '…' : cleanCaption;
      }
    }
    return p.contentType === 'REEL' ? 'Instagram Video Reel' : `${p.platform || 'Social'} Post`;
  }
  return rawTitle;
};

const formatPostTime = (d?: Date | string): string => {
  if (!d) return '18:00';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const PostsManagerView: React.FC<PostsManagerViewProps> = ({
  initialDate,
  initialCalendarTab,
  initialViewMode,
  initialStatusFilter,
  targetPostId,
  onNavigateTab,
  onOpenCreatePost,
}) => {
  const { selectedClientId, selectedClient } = useClients();

  // Top toggle: Calendar vs Cards vs List
  const [mainViewMode, setMainViewMode] = useState<'calendar' | 'cards' | 'list'>(initialViewMode || 'calendar');

  // Calendar sub-tabs: Month, Week, Day (Screenshots 2, 3, 4)
  const [calendarTab, setCalendarTab] = useState<'month' | 'week' | 'day'>(initialCalendarTab || 'month');

  // Selected date reference (Default to today's date)
  const [currentDate, setCurrentDate] = useState<Date>(initialDate || new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>((initialDate || new Date()).getDate());

  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || 'ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryFeedback, setRetryFeedback] = useState<string | null>(null);

  // Post detail preview modal
  const [selectedPostDetail, setSelectedPostDetail] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Day Schedule Modal (when clicking "+X more" or viewing posts on a specific day)
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);
  const [dayModalFilter, setDayModalFilter] = useState<string>('ALL');

  // Sub-layout view modes (Column Board vs Hourly Grid for Week view, Timeline Feed vs Slots for Day view)
  const [weekLayoutMode, setWeekLayoutMode] = useState<'board' | 'grid'>('board');
  const [dayLayoutMode, setDayLayoutMode] = useState<'feed' | 'grid'>('feed');

  // Local Create Post modal fallback
  const [localCreateOpen, setLocalCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<any>(null);

  const handleDeletePost = async (post: any) => {
    if (!post) return;
    const postTitle = post.title || 'this post';
    const ok = window.confirm(`Are you sure you want to delete "${postTitle}"? This will permanently remove the post.`);
    if (!ok) return;

    setIsDeleting(true);
    try {
      const targetId = post.contentItemId || post.rawEventId || post.id;
      // Filter out immediately from UI state
      setDeletedIds((prev) => {
        const next = new Set(prev);
        if (post.id) next.add(post.id);
        if (post.contentItemId) next.add(post.contentItemId);
        if (post.rawEventId) next.add(post.rawEventId);
        return next;
      });

      // Call API
      try {
        await api.deleteContentItem(targetId);
      } catch {
        await api.deleteScheduledPost(targetId);
      }

      setSelectedPostDetail(null);
      setDeleteFeedback(`Post "${postTitle}" was deleted successfully.`);
      setTimeout(() => setDeleteFeedback(null), 4000);

      await fetchAllPosts();
    } catch (err: any) {
      alert(`Could not delete post: ${err?.message || 'Server error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetryPost = async () => {
    if (!selectedPostDetail) return;
    setIsRetrying(true);
    setRetryFeedback(null);
    try {
      const targetId = selectedPostDetail.rawEventId || selectedPostDetail.id;
      const res = await api.retryScheduledPost(targetId);
      setRetryFeedback(res?.message || 'Publishing attempt queued successfully! Refreshing status...');
      setTimeout(() => {
        fetchAllPosts();
        setIsRetrying(false);
      }, 1500);
    } catch (err: any) {
      setRetryFeedback(`Retry failed: ${err?.message || 'Check server connection or API tokens'}`);
      setIsRetrying(false);
    }
  };

  const handleEditPost = (post: any) => {
    setSelectedPostDetail(null);
    if (onOpenCreatePost) {
      onOpenCreatePost({
        title: post.title,
        caption: post.caption,
        mediaUrl: post.mediaUrl,
        hashtags: '#BrandSetu #Marketing #Growth',
        defaultClientId: post.clientId,
      });
    } else {
      setCreatePrefill({
        title: post.title,
        caption: post.caption,
        mediaUrl: post.mediaUrl,
        hashtags: '#BrandSetu #Marketing #Growth',
      });
      setLocalCreateOpen(true);
    }
  };

  // Sync when parent props change
  useEffect(() => {
    if (initialDate) {
      setCurrentDate(initialDate);
      setSelectedDay(initialDate.getDate());
    }
  }, [initialDate]);

  useEffect(() => {
    if (initialCalendarTab) setCalendarTab(initialCalendarTab);
  }, [initialCalendarTab]);

  useEffect(() => {
    if (initialViewMode) setMainViewMode(initialViewMode);
  }, [initialViewMode]);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Fetch posts and calendar events
  const fetchAllPosts = async () => {
    try {
      setIsLoading(true);
      const [inboxData, eventsData] = await Promise.all([
        api.getContentInbox({
          clientId: selectedClientId !== 'ALL' ? selectedClientId : undefined,
        }).catch(() => []),
        api.getCalendarEvents({
          clientId: selectedClientId !== 'ALL' ? selectedClientId : undefined,
        }).catch(() => []),
      ]);

      setPosts(inboxData || []);
      setCalendarEvents(eventsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPosts();
  }, [selectedClientId]);

  // Consolidated posts list
  const consolidatedPosts = useMemo(() => {
    const list: any[] = [];
    const seenIds = new Set<string>();

    // From calendar events
    calendarEvents.forEach((evt) => {
      const item = evt.contentItem || {};
      const id = evt.id || item.id;
      if (id && !seenIds.has(id) && !deletedIds.has(id) && !deletedIds.has(item.id) && !deletedIds.has(evt.id)) {
        seenIds.add(id);
        const isReel = item.contentType === 'REEL' || evt.contentType === 'REEL';
        const brandName = evt.client?.businessName || item.client?.businessName || selectedClient?.businessName || 'BrandSetu Digital';
        const accountName = evt.socialAccount?.accountName || `@${brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const rawStatus = (evt.status || item.status || 'SCHEDULED').toUpperCase();
        const lastError = evt.lastError || item.lastError || (rawStatus === 'FAILED' ? 'Meta Graph API Error: Account authentication expired or media format needs verification. Please retry.' : null);
        const feedbackNote = item.approvalRequests?.[0]?.feedbackNote || evt.reviewFeedback || evt.feedbackNote || null;
        const reviewedByName = item.approvalRequests?.[0]?.reviewedBy?.name || evt.reviewedBy || 'Agency Admin';
        const reviewedAt = item.approvalRequests?.[0]?.reviewedAt || null;

        list.push({
          id,
          rawEventId: evt.id,
          contentItemId: item.id || evt.contentItemId,
          clientId: evt.clientId || item.clientId,
          title: item.title || evt.title || 'Scheduled Social Post',
          caption: item.variants?.[0]?.caption || item.caption || evt.caption || '',
          mediaUrl: item.mediaUrl || item.thumbnailUrl || (isReel ? '/sample_reel.mp4' : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'),
          thumbnailUrl: item.thumbnailUrl || (isReel ? 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80' : item.mediaUrl),
          platform: (evt.platform || 'INSTAGRAM').toUpperCase(),
          status: rawStatus,
          scheduledAt: evt.scheduledAt,
          targetDate: new Date(evt.scheduledAt),
          clientName: brandName,
          clientLogo: evt.client?.logo || item.client?.logo || null,
          accountName,
          lastError,
          feedbackNote,
          reviewedByName,
          reviewedAt,
          contentType: item.contentType || evt.contentType || (isReel ? 'REEL' : 'POST'),
        });
      }
    });

    // From content inbox
    posts.forEach((item) => {
      const id = item.id;
      if (id && !seenIds.has(id) && !deletedIds.has(id)) {
        seenIds.add(id);
        const isReel = item.contentType === 'REEL';
        const schedTime = item.scheduledPosts?.[0]?.scheduledAt || item.createdAt;
        const targetDate = schedTime ? new Date(schedTime) : new Date();
        const brandName = item.client?.businessName || selectedClient?.businessName || 'BrandSetu Digital';
        const accountName = item.scheduledPosts?.[0]?.socialAccount?.accountName || `@${brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const rawStatus = (item.status || 'SCHEDULED').toUpperCase();
        const lastError = item.scheduledPosts?.[0]?.lastError || item.lastError || (rawStatus === 'FAILED' ? 'Meta Graph API Error: Publishing session expired.' : null);
        const feedbackNote = item.approvalRequests?.[0]?.feedbackNote || null;
        const reviewedByName = item.approvalRequests?.[0]?.reviewedBy?.name || 'Agency Admin';
        const reviewedAt = item.approvalRequests?.[0]?.reviewedAt || null;

        list.push({
          id,
          rawEventId: item.scheduledPosts?.[0]?.id || id,
          contentItemId: item.id,
          clientId: item.clientId,
          title: item.title || 'Social Media Update',
          caption: item.variants?.[0]?.caption || item.caption || '',
          mediaUrl: item.mediaUrl || item.thumbnailUrl || (isReel ? '/sample_reel.mp4' : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'),
          thumbnailUrl: item.thumbnailUrl || (isReel ? 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80' : item.mediaUrl),
          platform: (item.scheduledPosts?.[0]?.platform || 'INSTAGRAM').toUpperCase(),
          status: rawStatus,
          scheduledAt: schedTime,
          targetDate,
          clientName: brandName,
          clientLogo: item.client?.logo || null,
          accountName,
          lastError,
          feedbackNote,
          reviewedByName,
          reviewedAt,
          contentType: item.contentType || (isReel ? 'REEL' : 'POST'),
        });
      }
    });

    // If list is small, provide realistic demo scheduled posts around today's date
    if (list.length < 5) {
      const baseNow = new Date();
      const getDemoDate = (offsetDays: number, hour: number, minute: number = 0) => {
        const d = new Date(baseNow);
        d.setDate(d.getDate() + offsetDays);
        d.setHours(hour, minute, 0, 0);
        return d;
      };

      const demoDate1 = getDemoDate(0, 10, 30);
      const demoDate2 = getDemoDate(1, 9, 0);
      const demoDate3 = getDemoDate(2, 17, 30);
      const demoDate4 = getDemoDate(0, 14, 0);
      const demoDate5 = getDemoDate(1, 11, 0);
      const demoDate6 = getDemoDate(3, 9, 0);
      const demoDate7 = getDemoDate(-1, 15, 30);

      const demoItems = [
        {
          id: 'demo-1',
          contentItemId: 'demo-item-1',
          clientId: 'demo-client-1',
          title: 'Brand Growth Strategy Reel',
          caption: '3 steps to scale your brand reach organically on Instagram and LinkedIn! #MarketingGrowth #BrandSetu',
          mediaUrl: '/sample_reel.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
          platform: 'INSTAGRAM',
          status: 'SCHEDULED',
          scheduledAt: demoDate1.toISOString(),
          targetDate: demoDate1,
          clientName: selectedClient?.businessName || 'BrandSetu Digital',
          accountName: '@brandsetudigital',
          contentType: 'REEL',
        },
        {
          id: 'demo-changes-1',
          contentItemId: 'demo-item-cr',
          clientId: 'demo-client-cr',
          title: 'Diwali Festive Brand Reel Promo',
          caption: 'Celebrate festive prosperity with exclusive digital transformation packages from BrandSetu!',
          mediaUrl: '/sample_reel.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
          platform: 'INSTAGRAM',
          status: 'CHANGES_REQUESTED',
          scheduledAt: demoDate3.toISOString(),
          targetDate: demoDate3,
          clientName: 'BrandSetu Digital',
          accountName: '@brandsetudigital',
          feedbackNote: 'Please update the end logo slide with the new high-resolution white BrandSetu logo and add hashtags #DiwaliMarketing.',
          reviewedByName: 'Soumitra Vajpayee (Admin)',
          reviewedAt: new Date(baseNow.getTime() - 2 * 3600000).toISOString(),
          contentType: 'REEL',
        },
        {
          id: 'demo-2',
          contentItemId: 'demo-item-2',
          clientId: 'demo-client-2',
          title: 'Client Case Study Spotlight',
          caption: 'How our client generated 4.2x ROI within 45 days through targeted social media campaigns.',
          mediaUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80',
          thumbnailUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80',
          platform: 'LINKEDIN',
          status: 'SCHEDULED',
          scheduledAt: demoDate4.toISOString(),
          targetDate: demoDate4,
          clientName: selectedClient?.businessName || 'BrandSetu Digital',
          accountName: '@brandsetudigital',
          contentType: 'POST',
        },
        {
          id: 'demo-3',
          contentItemId: 'demo-item-3',
          clientId: 'demo-client-3',
          title: 'Weekend Flash Offer Post',
          caption: 'Exclusive weekend digital marketing audit package for new business signups.',
          mediaUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
          thumbnailUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
          platform: 'FACEBOOK',
          status: 'SCHEDULED',
          scheduledAt: demoDate5.toISOString(),
          targetDate: demoDate5,
          clientName: selectedClient?.businessName || 'BrandSetu Digital',
          accountName: '@brandsetudigital',
          contentType: 'POST',
        },
        {
          id: 'demo-4',
          contentItemId: 'demo-item-4',
          clientId: 'demo-client-4',
          title: 'Monday Motivation & Founder Quote',
          caption: 'Consistency is the only metric that turns creativity into an unstoppable brand.',
          mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
          thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
          platform: 'INSTAGRAM',
          status: 'DRAFT',
          scheduledAt: demoDate6.toISOString(),
          targetDate: demoDate6,
          clientName: selectedClient?.businessName || 'BrandSetu Digital',
          accountName: '@brandsetudigital',
          contentType: 'POST',
        },
        {
          id: 'demo-5',
          contentItemId: 'demo-item-5',
          clientId: 'demo-client-5',
          title: 'Automated Lead Generation Carousel',
          caption: 'Swipe through to discover how our automation agents handle multi-channel distribution.',
          mediaUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80',
          thumbnailUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80',
          platform: 'LINKEDIN',
          status: 'PUBLISHED',
          scheduledAt: demoDate7.toISOString(),
          targetDate: demoDate7,
          clientName: selectedClient?.businessName || 'BrandSetu Digital',
          accountName: '@brandsetudigital',
          contentType: 'CAROUSEL',
        },
      ];
      demoItems.forEach((d) => {
        if (!seenIds.has(d.id) && !deletedIds.has(d.id)) {
          seenIds.add(d.id);
          list.push(d);
        }
      });
    }

    return list;
  }, [posts, calendarEvents, selectedClient, deletedIds]);

  // If targetPostId is passed, open detail modal automatically
  useEffect(() => {
    if (targetPostId && consolidatedPosts.length > 0) {
      const match = consolidatedPosts.find(
        (p) => p.id === targetPostId || p.contentItemId === targetPostId || p.rawEventId === targetPostId
      );
      if (match) {
        setSelectedPostDetail(match);
      }
    }
  }, [targetPostId, consolidatedPosts]);

  // Filter posts by search and status
  const filteredPosts = useMemo(() => {
    return consolidatedPosts.filter((p) => {
      const matchesSearch =
        searchQuery === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.accountName && p.accountName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        p.status === statusFilter ||
        (statusFilter === 'SCHEDULED' && p.status === 'SCHEDULED') ||
        (statusFilter === 'PUBLISHED' && p.status === 'PUBLISHED') ||
        (statusFilter === 'DRAFT' && (p.status === 'DRAFT' || p.status === 'READY_FOR_APPROVAL' || p.status === 'IN_REVIEW')) ||
        (statusFilter === 'PENDING_APPROVAL' && (p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT' || p.status === 'READY_FOR_APPROVAL' || p.status === 'IN_REVIEW')) ||
        (statusFilter === 'FAILED' && p.status === 'FAILED') ||
        (statusFilter === 'CHANGES_REQUESTED' && (p.status === 'CHANGES_REQUESTED' || p.status === 'REJECTED'));

      const matchesPlatform =
        platformFilter === 'ALL' ||
        (p.platform || '').toUpperCase() === platformFilter.toUpperCase();

      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [consolidatedPosts, searchQuery, statusFilter, platformFilter]);

  // Derived counts for Card View filter metrics
  const scheduledCount = useMemo(() => consolidatedPosts.filter((p) => p.status === 'SCHEDULED').length, [consolidatedPosts]);
  const publishedCount = useMemo(() => consolidatedPosts.filter((p) => p.status === 'PUBLISHED').length, [consolidatedPosts]);
  const draftCount = useMemo(() => consolidatedPosts.filter((p) => p.status === 'DRAFT' || p.status === 'READY_FOR_APPROVAL' || p.status === 'IN_REVIEW').length, [consolidatedPosts]);
  const failedCount = useMemo(() => consolidatedPosts.filter((p) => p.status === 'FAILED').length, [consolidatedPosts]);
  const changesRequestedCount = useMemo(() => consolidatedPosts.filter((p) => p.status === 'CHANGES_REQUESTED' || p.status === 'REJECTED').length, [consolidatedPosts]);

  // Posts grouped by Day of the current month
  const postsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    filteredPosts.forEach((p) => {
      const d = p.targetDate;
      if (d && d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(p);
      }
    });
    return map;
  }, [filteredPosts, currentDate]);

  // Posts grouped by date string (YYYY-MM-DD) and hour (0-23)
  const postsByDateTime = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredPosts.forEach((p) => {
      const d = p.targetDate;
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${d.getHours()}`;
        if (!map[key]) map[key] = [];
        map[key].push(p);
      }
    });
    return map;
  }, [filteredPosts]);

  // Quick helper to fetch posts for any specific Date object
  const getPostsForDate = (date: Date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    return filteredPosts
      .filter((p) => {
        const dt = p.targetDate;
        return dt && dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
      })
      .sort((a, b) => (a.targetDate?.getTime() || 0) - (b.targetDate?.getTime() || 0));
  };

  // Posts for current Day View
  const dayViewPosts = useMemo(() => {
    return getPostsForDate(currentDate);
  }, [filteredPosts, currentDate]);

  // Posts for Day Schedule Modal (e.g. clicking +X more or clicking a day)
  const dayModalPosts = useMemo(() => {
    if (!dayModalDate) return [];
    const y = dayModalDate.getFullYear();
    const m = dayModalDate.getMonth();
    const d = dayModalDate.getDate();

    return consolidatedPosts
      .filter((p) => {
        const dt = p.targetDate;
        if (!dt) return false;
        const matchesDate = dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
        if (!matchesDate) return false;

        if (dayModalFilter === 'ALL') return true;
        if (dayModalFilter === p.status) return true;
        if (dayModalFilter === 'FAILED' && p.status === 'FAILED') return true;
        if (dayModalFilter === 'CHANGES_REQUESTED' && (p.status === 'CHANGES_REQUESTED' || p.status === 'REJECTED')) return true;
        if (dayModalFilter === 'SCHEDULED' && p.status === 'SCHEDULED') return true;
        if (dayModalFilter === 'PUBLISHED' && p.status === 'PUBLISHED') return true;
        return false;
      })
      .sort((a, b) => (a.targetDate?.getTime() || 0) - (b.targetDate?.getTime() || 0));
  }, [consolidatedPosts, dayModalDate, dayModalFilter]);

  // Month navigation calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon, 2 = Tue...
  const prevMonthDaysCount = new Date(year, month, 0).getDate();

  // Trailing next month cells to complete 35 cells
  const trailingDaysCount = (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7;

  // Week navigation calculations (Sunday - Saturday)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay(); // 0 = Sun
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - dayOfWeek);

    return Array.from({ length: 7 }).map((_, i) => {
      const current = new Date(startOfWeek);
      current.setDate(startOfWeek.getDate() + i);
      return current;
    });
  }, [currentDate]);

  // Date Navigation Handlers
  const handlePrevDate = () => {
    const newDate = new Date(currentDate);
    if (calendarTab === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (calendarTab === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
    setSelectedDay(newDate.getDate());
  };

  const handleNextDate = () => {
    const newDate = new Date(currentDate);
    if (calendarTab === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (calendarTab === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
    setSelectedDay(newDate.getDate());
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today.getDate());
  };

  // Open create modal with prefilled date
  const triggerCreatePost = (dateStr?: string, hour?: number) => {
    const now = new Date();
    const targetDay = selectedDay || currentDate.getDate();
    const defaultDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
    const targetDateStr = dateStr || defaultDateStr;
    const nowHour = String(now.getHours()).padStart(2, '0');
    const nowMin = String(now.getMinutes()).padStart(2, '0');
    const targetTimeStr = hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : `${nowHour}:${nowMin}`;

    const tpl = {
      title: '',
      caption: '',
      scheduleDate: targetDateStr,
      scheduleTime: targetTimeStr,
    };

    if (onOpenCreatePost) {
      onOpenCreatePost(tpl);
    } else {
      setCreatePrefill(tpl);
      setLocalCreateOpen(true);
    }
  };

  // Header date label formatter matching Screenshots 2, 3, 4
  const getDateDisplayLabel = () => {
    if (calendarTab === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (calendarTab === 'week') {
      const first = weekDays[0];
      const last = weekDays[6];
      const firstStr = first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const lastStr = last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${firstStr} - ${lastStr}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  // 24 Hour labels
  const hours = Array.from({ length: 24 }).map((_, i) => {
    const ampm = i < 12 ? 'AM' : 'PM';
    const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
    return { hour24: i, label: `${hour} ${ampm}` };
  });

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Top Header Row (Screenshot 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Posts</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Create, schedule, and manage all your social media posts in one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* + Add Channel Button */}
          <button
            onClick={() => (onNavigateTab ? onNavigateTab('channels') : null)}
            className="px-3.5 py-2 text-xs font-semibold bg-blue-50 text-[#0172F4] border border-blue-200 hover:bg-blue-100 rounded-lg transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Channel</span>
          </button>

          {/* + Create Post Button */}
          <button
            onClick={() => triggerCreatePost()}
            className="px-4 py-2 text-xs font-semibold bg-[#0172F4] hover:bg-[#005cd3] text-white rounded-lg transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Post</span>
          </button>

          {/* Bulk Import Button */}
          <button
            onClick={() => alert('Bulk CSV import ready')}
            className="px-3.5 py-2 text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition flex items-center gap-1.5 shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5 text-gray-500" />
            <span>Bulk Import</span>
          </button>

          {/* Calendar | Cards | List View Toggle (Screenshot 2 Top-Right) */}
          <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-white shadow-xs">
            <button
              onClick={() => setMainViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                mainViewMode === 'calendar'
                  ? 'bg-blue-50 text-[#0172F4] font-bold shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setMainViewMode('cards')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                mainViewMode === 'cards'
                  ? 'bg-blue-50 text-[#0172F4] font-bold shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setMainViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                mainViewMode === 'list'
                  ? 'bg-blue-50 text-[#0172F4] font-bold shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Banner when post is deleted */}
      {deleteFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{deleteFeedback}</span>
          </div>
          <button onClick={() => setDeleteFeedback(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Sub-Header Toolbar (Screenshots 2, 3, 4) */}
      {mainViewMode === 'calendar' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: [Month | Week | Day] Tabs */}
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-white shadow-xs">
            <button
              onClick={() => setCalendarTab('month')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
                calendarTab === 'month'
                  ? 'bg-blue-50 text-[#0172F4] font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setCalendarTab('week')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
                calendarTab === 'week'
                  ? 'bg-blue-50 text-[#0172F4] font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarTab('day')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
                calendarTab === 'day'
                  ? 'bg-blue-50 text-[#0172F4] font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day
            </button>
          </div>

          {/* Right: All Status dropdown, Today, < Date Navigator > */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 font-semibold focus:outline-none shadow-xs cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft / In Review</option>
              <option value="FAILED">Failed (View Reasons)</option>
              <option value="CHANGES_REQUESTED">Changes Requested (Admin)</option>
            </select>

            {/* Today Button */}
            <button
              onClick={handleGoToToday}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition shadow-xs"
            >
              Today
            </button>

            {/* Chevron Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevDate}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition shadow-xs"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm font-bold text-gray-900 px-2 min-w-[130px] sm:min-w-[150px] text-center select-none">
                {getDateDisplayLabel()}
              </span>

              <button
                onClick={handleNextDate}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition shadow-xs"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CALENDAR: MONTH VIEW (Screenshot 2) */}
      {mainViewMode === 'calendar' && calendarTab === 'month' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-white text-center py-3 font-semibold text-xs sm:text-sm text-gray-700">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="select-none">
                {d}
              </div>
            ))}
          </div>

          {/* Month Days Grid (35 cells) */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-200">
            {/* Trailing days from previous month (e.g. Aug 30, 31) */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => {
              const prevDay = prevMonthDaysCount - firstDayOfMonth + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="min-h-[110px] sm:min-h-[125px] p-2 bg-gray-50/40 text-gray-400 select-none flex flex-col justify-between"
                >
                  <div className="flex justify-end">
                    <span className="text-xs font-semibold">{prevDay}</span>
                  </div>
                </div>
              );
            })}

            {/* Current Month Days (1 - 30) */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const now = new Date();
              const isToday = year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
              const isSelected = selectedDay === day;
              const dayPosts = postsByDay[day] || [];
              const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

              return (
                <div
                  key={`curr-${day}`}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[110px] sm:min-h-[125px] p-2 relative group flex flex-col justify-between transition cursor-pointer ${
                    isToday
                      ? 'bg-[#FEF9E7] border-2 border-[#FAD02C] shadow-xs'
                      : isSelected
                      ? 'border-2 border-[#0172F4] bg-blue-50/10'
                      : 'hover:bg-gray-50/60 bg-white'
                  }`}
                >
                  {/* Day Number and Quick Add */}
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerCreatePost(dayDateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-600 transition"
                      title="Schedule post on this day"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    <span
                      className={`text-xs font-semibold ${
                        isToday ? 'text-amber-950 font-bold' : isSelected ? 'text-[#0172F4] font-bold' : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Scheduled Posts in Cell */}
                  <div className="space-y-1.5 overflow-hidden flex-1">
                    {dayPosts.slice(0, 2).map((p) => (
                      <div
                        key={p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPostDetail(p);
                        }}
                        title={`${getPostCleanTitle(p)} - ${p.platform} (${p.status}) - ${formatPostTime(p.targetDate)}`}
                        className={`p-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition shadow-2xs hover:shadow-xs flex items-center gap-1.5 ${
                          p.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
                            : p.status === 'CHANGES_REQUESTED'
                            ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                            : p.status === 'SCHEDULED'
                            ? 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
                            : p.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {/* Thumbnail preview */}
                        <div className="w-5 h-5 rounded overflow-hidden shrink-0 bg-slate-800 flex items-center justify-center border border-black/10">
                          {p.thumbnailUrl || p.mediaUrl ? (
                            <img
                              src={p.thumbnailUrl || p.mediaUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Instagram className="w-3 h-3 text-white" />
                          )}
                        </div>

                        {p.contentType === 'REEL' ? (
                          <Film className="w-3 h-3 text-purple-600 shrink-0" />
                        ) : (
                          <>
                            {p.platform === 'INSTAGRAM' && <Instagram className="w-3 h-3 text-pink-600 shrink-0" />}
                            {p.platform === 'FACEBOOK' && <Facebook className="w-3 h-3 text-blue-600 shrink-0" />}
                            {p.platform === 'LINKEDIN' && <Linkedin className="w-3 h-3 text-sky-700 shrink-0" />}
                          </>
                        )}
                        <span className="truncate flex-1 font-bold">{getPostCleanTitle(p)}</span>

                        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-white/70 border border-black/5 shrink-0 text-slate-600">
                          {formatPostTime(p.targetDate)}
                        </span>
                      </div>
                    ))}

                    {dayPosts.length > 2 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDayModalDate(new Date(year, month, day));
                        }}
                        className="w-full text-left py-1 px-1.5 rounded-md text-[10px] font-bold text-[#0172F4] bg-blue-50/70 hover:bg-blue-100 border border-blue-200/60 transition flex items-center justify-between shadow-2xs group/btn cursor-pointer"
                        title={`View all ${dayPosts.length} posts for this day`}
                      >
                        <span>+{dayPosts.length - 2} more</span>
                        <span className="text-[9px] font-bold text-blue-600 group-hover/btn:translate-x-0.5 transition-transform flex items-center">
                          View all &rarr;
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Empty cell placeholder */}
                  {dayPosts.length === 0 && (
                    <div className="h-4"></div>
                  )}
                </div>
              );
            })}

            {/* Trailing days from next month (e.g. Oct 1, 2, 3) */}
            {Array.from({ length: trailingDaysCount }).map((_, i) => (
              <div
                key={`next-${i}`}
                className="min-h-[110px] sm:min-h-[125px] p-2 bg-gray-50/40 text-gray-400 select-none flex flex-col justify-between"
              >
                <div className="flex justify-end">
                  <span className="text-xs font-semibold">{i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CALENDAR: WEEK VIEW */}
      {mainViewMode === 'calendar' && calendarTab === 'week' && (
        <div className="space-y-3">
          {/* Week Sub-toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700">Week View:</span>
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-white shadow-2xs">
                <button
                  onClick={() => setWeekLayoutMode('board')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    weekLayoutMode === 'board'
                      ? 'bg-blue-50 text-[#0172F4] font-bold shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Weekly Board (7 Days)</span>
                </button>
                <button
                  onClick={() => setWeekLayoutMode('grid')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    weekLayoutMode === 'grid'
                      ? 'bg-blue-50 text-[#0172F4] font-bold shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Hourly Time Slots</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 font-medium">
              Click any post to view details, or click + to schedule on that day
            </p>
          </div>

          {weekLayoutMode === 'board' ? (
            /* Weekly 7-Day Board View: Columns side by side */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {weekDays.map((d, colIdx) => {
                const dayNum = d.getDate();
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                const now = new Date();
                const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && dayNum === now.getDate();
                const dayPosts = getPostsForDate(d);
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                return (
                  <div
                    key={colIdx}
                    className={`rounded-xl border flex flex-col justify-between transition min-h-[440px] bg-white shadow-xs ${
                      isToday ? 'border-amber-300 ring-2 ring-amber-200/70 bg-amber-50/15' : 'border-gray-200'
                    }`}
                  >
                    {/* Column Header */}
                    <div
                      className={`p-2.5 border-b flex items-center justify-between ${
                        isToday ? 'bg-[#FEF9E7] border-amber-200' : 'bg-gray-50/80 border-gray-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-black ${isToday ? 'text-amber-950' : 'text-gray-900'}`}>
                            {dayName}
                          </span>
                          <span
                            className={`text-xs font-bold px-1.5 py-0.2 rounded-md ${
                              isToday ? 'bg-amber-200 text-amber-950' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {dayNum}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {d.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 shadow-2xs">
                          {dayPosts.length}
                        </span>
                        <button
                          onClick={() => triggerCreatePost(dateStr)}
                          className="p-1 rounded-md hover:bg-gray-200 text-gray-600 transition cursor-pointer"
                          title={`Schedule post on ${dayName} ${dayNum}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Column Content: List of Posts */}
                    <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[520px]">
                      {dayPosts.length === 0 ? (
                        <div
                          onClick={() => triggerCreatePost(dateStr)}
                          className="h-32 border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/20 rounded-xl flex flex-col items-center justify-center text-center p-3 transition cursor-pointer group"
                        >
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-[#0172F4] mb-1" />
                          <span className="text-[11px] text-gray-400 group-hover:text-[#0172F4] font-semibold">
                            No posts
                          </span>
                          <span className="text-[10px] text-gray-400 group-hover:text-blue-500">
                            Click to add
                          </span>
                        </div>
                      ) : (
                        dayPosts.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPostDetail(p)}
                            className={`p-2 rounded-xl border transition shadow-2xs hover:shadow-md cursor-pointer flex flex-col gap-1.5 ${
                              p.status === 'FAILED'
                                ? 'bg-rose-50/80 border-rose-200 hover:border-rose-300'
                                : p.status === 'CHANGES_REQUESTED'
                                ? 'bg-amber-50/80 border-amber-200 hover:border-amber-300'
                                : p.status === 'SCHEDULED'
                                ? 'bg-purple-50/70 border-purple-200 hover:border-purple-300'
                                : p.status === 'PUBLISHED'
                                ? 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-300'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-black/10">
                                <img
                                  src={p.thumbnailUrl || p.mediaUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                                {p.contentType === 'REEL' && (
                                  <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <Play className="w-3 h-3 text-white fill-white" />
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-white px-1 py-0.2 rounded border border-gray-200 shadow-2xs">
                                    <Clock className="w-2.5 h-2.5 text-gray-500" />
                                    {formatPostTime(p.targetDate)}
                                  </span>

                                  <span className="shrink-0">
                                    {p.platform === 'INSTAGRAM' && <Instagram className="w-3 h-3 text-pink-600" />}
                                    {p.platform === 'FACEBOOK' && <Facebook className="w-3 h-3 text-blue-600" />}
                                    {p.platform === 'LINKEDIN' && <Linkedin className="w-3 h-3 text-sky-700" />}
                                  </span>
                                </div>

                                <h5 className="text-[11px] font-bold text-gray-900 truncate mt-1">
                                  {getPostCleanTitle(p)}
                                </h5>
                              </div>
                            </div>

                            {p.caption && (
                              <p className="text-[10px] text-gray-500 line-clamp-1 leading-tight">
                                {p.caption}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[9px]">
                              <span
                                className={`font-bold px-1.5 py-0.2 rounded-full ${
                                  p.status === 'FAILED'
                                    ? 'bg-rose-100 text-rose-800 font-black'
                                    : p.status === 'CHANGES_REQUESTED'
                                    ? 'bg-amber-100 text-amber-800 font-black'
                                    : p.status === 'SCHEDULED'
                                    ? 'bg-purple-100 text-purple-800'
                                    : p.status === 'PUBLISHED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {p.status === 'CHANGES_REQUESTED' ? 'REVISION' : p.status}
                              </span>

                              <span className="text-gray-400 font-medium truncate max-w-[75px]">
                                {p.clientName}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Column Footer */}
                    <div className="p-1.5 border-t border-gray-100 bg-gray-50/50">
                      <button
                        onClick={() => triggerCreatePost(dateStr)}
                        className="w-full py-1 text-xs font-semibold text-gray-600 hover:text-[#0172F4] hover:bg-blue-50/60 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Post</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Hourly Time Slots View */
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="grid grid-cols-8 border-b border-gray-200 bg-white">
                <div className="w-16 sm:w-20 border-r border-gray-200 py-3 text-center text-xs font-semibold text-gray-400">
                  Time
                </div>
                {weekDays.map((d, idx) => {
                  const dayNum = d.getDate();
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const now = new Date();
                  const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && dayNum === now.getDate();

                  return (
                    <div
                      key={idx}
                      className={`py-3 text-center text-xs sm:text-sm font-semibold border-r border-gray-200 last:border-r-0 ${
                        isToday
                          ? 'bg-[#FEF9E7] text-amber-950 font-bold border-b-2 border-amber-400'
                          : 'text-gray-700'
                      }`}
                    >
                      <span>{dayNum} {dayName}</span>
                    </div>
                  );
                })}
              </div>

              <div className="max-h-[640px] overflow-y-auto divide-y divide-gray-100">
                {hours.map(({ hour24, label }) => (
                  <div key={hour24} className="grid grid-cols-8 min-h-[56px]">
                    <div className="w-16 sm:w-20 border-r border-gray-200 text-xs font-semibold text-gray-400 text-right pr-3 pt-2 bg-white select-none">
                      {label}
                    </div>

                    {weekDays.map((d, colIdx) => {
                      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      const key = `${dateStr}_${hour24}`;
                      const slotPosts = postsByDateTime[key] || [];
                      const now = new Date();
                      const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();

                      return (
                        <div
                          key={colIdx}
                          onClick={() => triggerCreatePost(dateStr, hour24)}
                          className={`border-r border-gray-200 last:border-r-0 p-1 relative group transition cursor-pointer hover:bg-blue-50/30 ${
                            isToday ? 'bg-[#FEF9E7]/25' : 'bg-white'
                          }`}
                        >
                          {slotPosts.map((p) => (
                            <div
                              key={p.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPostDetail(p);
                              }}
                              className="p-1 rounded-lg bg-purple-100/90 border border-purple-200 text-[10px] text-purple-900 font-semibold truncate hover:bg-purple-200 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <div className="w-4 h-4 rounded overflow-hidden shrink-0 bg-slate-800">
                                <img
                                  src={p.thumbnailUrl || p.mediaUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              </div>
                              {p.platform === 'INSTAGRAM' && <Instagram className="w-2.5 h-2.5 text-pink-600 shrink-0" />}
                              {p.platform === 'FACEBOOK' && <Facebook className="w-2.5 h-2.5 text-blue-600 shrink-0" />}
                              {p.platform === 'LINKEDIN' && <Linkedin className="w-2.5 h-2.5 text-sky-700 shrink-0" />}
                              <span className="truncate">{getPostCleanTitle(p)}</span>
                            </div>
                          ))}

                          {slotPosts.length === 0 && (
                            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 font-medium pl-1 flex items-center gap-0.5 pt-0.5">
                              <Plus className="w-2.5 h-2.5" /> Schedule
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. CALENDAR: DAY VIEW */}
      {mainViewMode === 'calendar' && calendarTab === 'day' && (
        <div className="space-y-4">
          {/* Day Summary Header Banner */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0172F4] flex flex-col items-center justify-center font-bold shrink-0 border border-blue-100 shadow-2xs">
                <span className="text-[10px] uppercase font-extrabold">{currentDate.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="text-base font-black leading-none">{currentDate.getDate()}</span>
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                    {dayViewPosts.length} Post{dayViewPosts.length !== 1 ? 's' : ''} Scheduled
                  </span>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                    {dayViewPosts.filter((p) => p.status === 'SCHEDULED').length} Scheduled
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {dayViewPosts.filter((p) => p.status === 'PUBLISHED').length} Published
                  </span>
                  {dayViewPosts.filter((p) => p.status === 'CHANGES_REQUESTED' || p.status === 'REJECTED').length > 0 && (
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      {dayViewPosts.filter((p) => p.status === 'CHANGES_REQUESTED' || p.status === 'REJECTED').length} Changes Requested
                    </span>
                  )}
                  {dayViewPosts.filter((p) => p.status === 'FAILED').length > 0 && (
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      {dayViewPosts.filter((p) => p.status === 'FAILED').length} Failed
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Layout switcher */}
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-white shadow-2xs">
                <button
                  onClick={() => setDayLayoutMode('feed')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    dayLayoutMode === 'feed'
                      ? 'bg-blue-50 text-[#0172F4] font-bold shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Timeline Feed</span>
                </button>
                <button
                  onClick={() => setDayLayoutMode('grid')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    dayLayoutMode === 'grid'
                      ? 'bg-blue-50 text-[#0172F4] font-bold shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>24-Hour Slots</span>
                </button>
              </div>

              <button
                onClick={() =>
                  triggerCreatePost(
                    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
                  )
                }
                className="px-3.5 py-1.5 text-xs font-bold bg-[#0172F4] hover:bg-blue-600 text-white rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Post</span>
              </button>
            </div>
          </div>

          {/* Day Feed Mode */}
          {dayLayoutMode === 'feed' ? (
            dayViewPosts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0172F4] flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900">No posts scheduled for this day</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Plan your campaign content and schedule social posts for{' '}
                  {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                </p>
                <button
                  onClick={() =>
                    triggerCreatePost(
                      `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
                    )
                  }
                  className="px-4 py-2 bg-[#0172F4] text-white text-xs font-bold rounded-lg transition hover:bg-blue-600 inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Schedule Post on this Day</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {dayViewPosts.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Media preview */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-gray-200 shadow-2xs">
                        {isVideoMedia(p.mediaUrl, p.contentType) ? (
                          <>
                            <img
                              src={p.thumbnailUrl || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80'}
                              alt={p.title}
                              className="w-full h-full object-cover opacity-85"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                              <Play className="w-5 h-5 text-white fill-white" />
                            </div>
                            <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-black/70 text-white px-1 py-0.2 rounded">
                              REEL
                            </span>
                          </>
                        ) : (
                          <img
                            src={p.mediaUrl}
                            alt={p.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>

                      {/* Content details */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-purple-100">
                            <Clock className="w-3 h-3" />
                            {formatPostTime(p.targetDate)}
                          </span>
                          <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            {p.platform === 'INSTAGRAM' && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                            {p.platform === 'FACEBOOK' && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                            {p.platform === 'LINKEDIN' && <Linkedin className="w-3.5 h-3.5 text-sky-700" />}
                            {p.platform}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.2 rounded">
                            {p.clientName}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {p.accountName}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                          {getPostCleanTitle(p)}
                        </h4>

                        {p.caption && (
                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed whitespace-pre-line">
                            {p.caption}
                          </p>
                        )}

                        {/* Failure notice if FAILED */}
                        {p.status === 'FAILED' && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold">Failed to publish:</strong> {p.lastError || 'Channel authorization expired.'}
                            </div>
                          </div>
                        )}

                        {/* Feedback note if CHANGES_REQUESTED */}
                        {p.status === 'CHANGES_REQUESTED' && (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold">Admin Feedback:</strong> {p.feedbackNote || 'Admin requested modifications.'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons on the right */}
                    <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                          p.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : p.status === 'CHANGES_REQUESTED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : p.status === 'SCHEDULED'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : p.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {p.status}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedPostDetail(p)}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition shadow-2xs cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleEditPost(p)}
                          className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-[#0172F4] border border-blue-200 rounded-lg transition shadow-2xs cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePost(p)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 rounded-lg transition shadow-2xs cursor-pointer"
                          title="Delete Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Hourly time slots view */
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="grid grid-cols-12 border-b border-gray-200 bg-white">
                <div className="col-span-2 sm:col-span-1 border-r border-gray-200 py-3 text-center text-xs font-semibold text-gray-400">
                  Time
                </div>
                <div className="col-span-10 sm:col-span-11 py-3 text-center text-xs sm:text-sm font-bold bg-[#FEF9E7] text-amber-950 border-b border-amber-300">
                  {currentDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
              </div>

              <div className="max-h-[640px] overflow-y-auto divide-y divide-gray-100">
                {hours.map(({ hour24, label }) => {
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                  const key = `${dateStr}_${hour24}`;
                  const slotPosts = postsByDateTime[key] || [];

                  return (
                    <div key={hour24} className="grid grid-cols-12 min-h-[64px]">
                      <div className="col-span-2 sm:col-span-1 border-r border-gray-200 text-xs font-semibold text-gray-400 text-right pr-3 pt-2 bg-white select-none">
                        {label}
                      </div>

                      <div
                        onClick={() => triggerCreatePost(dateStr, hour24)}
                        className="col-span-10 sm:col-span-11 p-2 relative group hover:bg-blue-50/20 transition cursor-pointer"
                      >
                        {slotPosts.length > 0 ? (
                          <div className="space-y-2">
                            {slotPosts.map((p) => (
                              <div
                                key={p.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPostDetail(p);
                                }}
                                className="p-3 rounded-xl border border-purple-200 bg-purple-50/80 hover:bg-purple-100 transition shadow-xs flex items-center justify-between gap-4"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <img
                                    src={p.thumbnailUrl || p.mediaUrl}
                                    alt={p.title}
                                    className="w-12 h-12 rounded-lg object-cover border border-purple-200 shrink-0 shadow-xs"
                                  />
                                  <div className="min-w-0">
                                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                      {getPostCleanTitle(p)}
                                    </h4>
                                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{p.caption}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                                        <Clock className="w-3 h-3" />
                                        {label}
                                      </span>
                                      <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                        {p.platform === 'INSTAGRAM' && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                                        {p.platform === 'FACEBOOK' && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                                        {p.platform === 'LINKEDIN' && <Linkedin className="w-3.5 h-3.5 text-sky-700" />}
                                        {p.platform}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPostDetail(p);
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 rounded-lg transition shadow-xs shrink-0 cursor-pointer"
                                >
                                  View Details
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 font-medium pl-1 flex items-center gap-1 pt-1">
                            <Plus className="w-3 h-3" /> Click to schedule post at {label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. CARDS VIEW (Post Cards Grid matching Post Approval layout, but without Admin approval actions) */}
      {mainViewMode === 'cards' && (
        <div className="space-y-5">
          {/* Top Metric Tabs (Filter shortcuts) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div
              onClick={() => setStatusFilter('ALL')}
              className={`bg-white rounded-xl p-3 border transition cursor-pointer hover:shadow-xs ${
                statusFilter === 'ALL' ? 'border-[#0172F4] ring-2 ring-[#0172F4]/20' : 'border-gray-200'
              }`}
            >
              <p className="text-[11px] font-semibold text-gray-500">All Posts</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{consolidatedPosts.length}</p>
            </div>

            <div
              onClick={() => setStatusFilter('SCHEDULED')}
              className={`bg-white rounded-xl p-3 border transition cursor-pointer hover:shadow-xs ${
                statusFilter === 'SCHEDULED' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-gray-200'
              }`}
            >
              <p className="text-[11px] font-semibold text-purple-700">Scheduled</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{scheduledCount}</p>
            </div>

            <div
              onClick={() => setStatusFilter('PUBLISHED')}
              className={`bg-white rounded-xl p-3 border transition cursor-pointer hover:shadow-xs ${
                statusFilter === 'PUBLISHED' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-gray-200'
              }`}
            >
              <p className="text-[11px] font-semibold text-emerald-700">Published</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{publishedCount}</p>
            </div>

            <div
              onClick={() => setStatusFilter('CHANGES_REQUESTED')}
              className={`bg-white rounded-xl p-3 border transition cursor-pointer hover:shadow-xs ${
                statusFilter === 'CHANGES_REQUESTED' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-200'
              }`}
            >
              <p className="text-[11px] font-semibold text-amber-700">Changes Req.</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{changesRequestedCount}</p>
            </div>

            <div
              onClick={() => setStatusFilter('DRAFT')}
              className={`bg-white rounded-xl p-3 border transition cursor-pointer hover:shadow-xs ${
                statusFilter === 'DRAFT' ? 'border-slate-500 ring-2 ring-slate-500/20' : 'border-gray-200'
              }`}
            >
              <p className="text-[11px] font-semibold text-slate-600">Drafts / Review</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{draftCount}</p>
            </div>

            <div
              onClick={() => setStatusFilter('FAILED')}
              className={`bg-white rounded-xl p-3 border transition cursor-pointer hover:shadow-xs ${
                statusFilter === 'FAILED' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-gray-200'
              }`}
            >
              <p className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                <span>Failed</span>
                {failedCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
              </p>
              <p className="text-xl font-bold text-rose-700 mt-0.5">{failedCount}</p>
            </div>
          </div>

          {/* Filter Bar: Search, Status, Platform */}
          <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <input
                type="text"
                placeholder="Search posts by title, brand, or caption..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Platform Filter */}
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 font-semibold focus:outline-none shadow-xs cursor-pointer"
              >
                <option value="ALL">All Platforms</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="TWITTER">X / Twitter</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="GOOGLE_BUSINESS">Google Business</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 font-semibold focus:outline-none shadow-xs cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft / Review</option>
                <option value="CHANGES_REQUESTED">Changes Requested</option>
                <option value="FAILED">Failed</option>
              </select>

              {/* Reset filter button if any active */}
              {(statusFilter !== 'ALL' || platformFilter !== 'ALL' || searchQuery !== '') && (
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setPlatformFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1 rounded transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200">
              <RefreshCw className="w-8 h-8 text-[#0172F4] animate-spin mb-2" />
              <p className="text-xs text-gray-500 font-medium">Loading social posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-gray-200 shadow-xs flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0172F4] flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">No Posts Match Filter</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                No posts found matching the current search and filters. Click "+ Create Post" to schedule content.
              </p>
              <button
                onClick={() => triggerCreatePost()}
                className="mt-4 px-4 py-2 text-xs font-semibold bg-[#0172F4] hover:bg-[#005cd3] text-white rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Post</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredPosts.map((post) => {
                const dateObj = post.targetDate ? new Date(post.targetDate) : null;
                const dateStr = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                const timeStr = dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const isVideo = isVideoMedia(post.mediaUrl, post.contentType);

                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between group"
                  >
                    <div>
                      {/* Media Header */}
                      <div
                        onClick={() => setSelectedPostDetail(post)}
                        className="h-56 w-full bg-slate-900 relative overflow-hidden cursor-pointer flex items-center justify-center"
                      >
                        {isVideo ? (
                          <div className="w-full h-full relative flex items-center justify-center bg-black">
                            <video
                              src={post.mediaUrl || '/sample_reel.mp4'}
                              poster={post.thumbnailUrl || undefined}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-300"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                            <img
                              src={
                                post.thumbnailUrl ||
                                'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80'
                              }
                              alt=""
                              className="w-full h-full object-cover object-top absolute inset-0 -z-10 group-hover:scale-105 transition duration-300"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/40 transition">
                              <div className="w-10 h-10 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                                <Play className="w-5 h-5 fill-current ml-0.5 text-gray-900" />
                              </div>
                            </div>
                            <span className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs z-20">
                              <Film className="w-3 h-3 text-purple-400" /> Video Reel
                            </span>
                          </div>
                        ) : (
                          <img
                            src={
                              post.thumbnailUrl ||
                              post.mediaUrl ||
                              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80'
                            }
                            alt=""
                            className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-300"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80';
                            }}
                          />
                        )}

                        {/* Brand Pill (Top Left) - Whose post is this */}
                        <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md shadow-xs z-10 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-blue-300" />
                          <span>{post.clientName || 'BrandSetu'}</span>
                        </span>

                        {/* Status Pill (Top Right) */}
                        <span
                          className={`absolute top-2.5 right-2.5 backdrop-blur-xs text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs ${
                            post.status === 'SCHEDULED'
                              ? 'bg-purple-600 text-white'
                              : post.status === 'PUBLISHED'
                              ? 'bg-emerald-600 text-white'
                              : post.status === 'CHANGES_REQUESTED'
                              ? 'bg-amber-500 text-white'
                              : post.status === 'FAILED'
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-gray-700 text-white'
                          }`}
                        >
                          {post.status}
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-semibold">
                            {post.contentType || 'POST'}
                          </span>
                          <div className="flex items-center gap-1">
                            {post.platform === 'INSTAGRAM' && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                            {post.platform === 'FACEBOOK' && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                            {post.platform === 'LINKEDIN' && <Linkedin className="w-3.5 h-3.5 text-sky-700" />}
                            <span className="text-[10px] font-bold text-gray-600 capitalize">
                              {post.platform}
                            </span>
                          </div>
                        </div>

                        {/* Title - What is the post */}
                        <h3
                          onClick={() => setSelectedPostDetail(post)}
                          className="text-sm font-bold text-gray-900 leading-snug line-clamp-1 hover:text-[#0172F4] transition cursor-pointer"
                          title={post.title}
                        >
                          {post.title}
                        </h3>

                        {/* Account Handle */}
                        {post.accountName && (
                          <p className="text-[11px] font-semibold text-slate-500 truncate">
                            {post.accountName}
                          </p>
                        )}

                        {/* Caption snippet */}
                        {post.caption && (
                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                            {post.caption}
                          </p>
                        )}

                        {/* When will it be posted (Schedule badge) */}
                        {post.status === 'FAILED' ? (
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-0.5">
                            <div className="flex items-center gap-1 font-bold text-rose-900 text-[11px]">
                              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>Publishing Failed</span>
                            </div>
                            <p className="text-[10px] text-rose-700 truncate">
                              {post.lastError || 'Social platform token expired'}
                            </p>
                          </div>
                        ) : post.status === 'CHANGES_REQUESTED' ? (
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-0.5">
                            <div className="flex items-center gap-1 font-bold text-amber-800 text-[11px]">
                              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Admin Feedback</span>
                            </div>
                            <p className="text-[10px] text-amber-800 truncate">
                              {post.feedbackNote || 'Admin requested changes'}
                            </p>
                          </div>
                        ) : dateObj ? (
                          <div
                            className={`flex items-center gap-1.5 text-xs font-semibold p-2 rounded-lg border ${
                              post.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-purple-50 text-purple-700 border-purple-100'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">
                              {post.status === 'PUBLISHED' ? 'Published' : 'Scheduled for'} {dateStr} at {timeStr}
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400">
                            Draft post
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions (No approval buttons here, approval is strictly for Admin on Approvals page) */}
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedPostDetail(post)}
                        className="text-xs font-semibold text-gray-600 hover:text-[#0172F4] flex items-center gap-1 cursor-pointer transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditPost(post)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition cursor-pointer"
                          title="Edit Post"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition cursor-pointer"
                          title="Delete Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. LIST VIEW (When List toggle is clicked in top right) */}
      {mainViewMode === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          {/* List Search & Filter Header */}
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <input
                type="text"
                placeholder="Search posts by title or caption..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 font-semibold focus:outline-none shadow-xs cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft / In Review</option>
              <option value="FAILED">Failed (View Reasons)</option>
              <option value="CHANGES_REQUESTED">Changes Requested (Admin Feedback)</option>
            </select>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Content</th>
                <th className="py-3 px-4">Brand & Account</th>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Scheduled Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    No posts found matching the filter. Click "+ Create Post" to schedule content.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0 shadow-xs bg-gray-900 flex items-center justify-center">
                          {isVideoMedia(post.mediaUrl, post.contentType) ? (
                            <>
                              <img
                                src={post.thumbnailUrl || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80'}
                                alt={post.title}
                                className="w-full h-full object-cover opacity-85"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                <Play className="w-3.5 h-3.5 text-white fill-white" />
                              </div>
                            </>
                          ) : (
                            <img
                              src={post.mediaUrl}
                              alt={post.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 line-clamp-1">{post.title}</p>
                          <p className="text-[11px] text-gray-400 line-clamp-1">{post.caption || 'No caption'}</p>

                          {/* Failure reason alert in table */}
                          {post.status === 'FAILED' && (
                            <p className="text-[10px] text-rose-600 font-medium mt-1 truncate flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                              <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                              <span className="font-bold">Failed:</span> {post.lastError || 'Account session expired'}
                            </p>
                          )}

                          {/* Changes requested feedback in table */}
                          {post.status === 'CHANGES_REQUESTED' && (
                            <p className="text-[10px] text-amber-700 font-medium mt-1 truncate flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                              <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="font-bold">Admin Note:</span> {post.feedbackNote || 'Revision requested'}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900">{post.clientName}</p>
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{post.accountName || '@brand'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 font-semibold text-gray-700">
                        {post.platform === 'INSTAGRAM' && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                        {post.platform === 'FACEBOOK' && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                        {post.platform === 'LINKEDIN' && <Linkedin className="w-3.5 h-3.5 text-sky-700" />}
                        {post.platform}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          post.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                            : post.status === 'CHANGES_REQUESTED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : post.status === 'SCHEDULED'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : post.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {post.targetDate
                          ? post.targetDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
                            ' • ' +
                            post.targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Not scheduled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedPostDetail(post)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#0172F4] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleDeletePost(post)}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                          title="Delete Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 7. POST DETAIL MODAL */}
      {selectedPostDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in duration-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    selectedPostDetail.status === 'FAILED'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                      : selectedPostDetail.status === 'CHANGES_REQUESTED'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : selectedPostDetail.status === 'SCHEDULED'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : selectedPostDetail.status === 'PUBLISHED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {selectedPostDetail.status}
                </span>
                <span className="text-xs font-semibold text-gray-500">
                  {selectedPostDetail.platform} Post
                </span>
              </div>

              <button
                onClick={() => {
                  setSelectedPostDetail(null);
                  setRetryFeedback(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Brand & Account Summary Bar */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0172F4] flex items-center justify-center font-bold text-xs">
                    {selectedPostDetail.clientName.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">{selectedPostDetail.clientName}</span>
                    <span className="text-[11px] font-semibold text-slate-500">{selectedPostDetail.accountName || '@account'}</span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-white rounded border border-slate-200 text-slate-700">
                  {selectedPostDetail.platform}
                </span>
              </div>

              {/* FAILED STATUS ALERT BOX */}
              {selectedPostDetail.status === 'FAILED' && (
                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Publishing Failed</span>
                  </div>
                  <p className="text-rose-700 leading-relaxed font-medium">
                    <strong className="font-bold text-rose-900">Failure Reason:</strong>{' '}
                    {selectedPostDetail.lastError || 'Social media account authorization expired. Please re-authenticate your channel in Settings.'}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleRetryPost}
                      disabled={isRetrying}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                      <span>{isRetrying ? 'Retrying...' : 'Retry Publish Now'}</span>
                    </button>
                    <button
                      onClick={() => handleEditPost(selectedPostDetail)}
                      className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg transition"
                    >
                      Edit Post
                    </button>
                  </div>
                  {retryFeedback && (
                    <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-md border border-emerald-200">
                      {retryFeedback}
                    </p>
                  )}
                </div>
              )}

              {/* CHANGES REQUESTED / REJECTED FEEDBACK BOX */}
              {(selectedPostDetail.status === 'CHANGES_REQUESTED' || selectedPostDetail.status === 'REJECTED') && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Admin Review Feedback & Changes Requested</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200/80 text-amber-950 font-medium whitespace-pre-line leading-relaxed">
                    "{selectedPostDetail.feedbackNote || selectedPostDetail.approvalFeedback || 'Please update the caption hashtags and verify brand logo placement.'}"
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-amber-800">
                    <span>
                      Reviewed by: <strong className="font-bold">{selectedPostDetail.reviewedByName || 'Agency Admin'}</strong>
                    </span>
                    {selectedPostDetail.reviewedAt && (
                      <span>
                        {new Date(selectedPostDetail.reviewedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => handleEditPost(selectedPostDetail)}
                      className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 shadow-xs"
                    >
                      <span>Edit & Resubmit for Approval</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Media Preview */}
              {isVideoMedia(selectedPostDetail.mediaUrl, selectedPostDetail.contentType) ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-xs bg-black flex items-center justify-center">
                  <video
                    src={selectedPostDetail.mediaUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full max-h-72 object-contain mx-auto"
                  />
                  <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                    <Film className="w-3 h-3 text-purple-400" /> Video Reel
                  </span>
                </div>
              ) : (
                <img
                  src={selectedPostDetail.mediaUrl}
                  alt={selectedPostDetail.title}
                  className="w-full h-56 object-cover rounded-xl border border-gray-200 shadow-xs"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}

              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedPostDetail.title}</h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed whitespace-pre-line">
                  {selectedPostDetail.caption || 'No caption written.'}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-600">
                  <span className="font-semibold">Scheduled Date:</span>
                  <span className="font-bold text-gray-900">
                    {selectedPostDetail.targetDate?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span className="font-semibold">Target Brand:</span>
                  <span className="font-bold text-gray-900">{selectedPostDetail.clientName}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span className="font-semibold">Account Handle:</span>
                  <span className="font-bold text-gray-900">{selectedPostDetail.accountName || '@social'}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2">
              <button
                onClick={() => handleDeletePost(selectedPostDetail)}
                disabled={isDeleting}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                title="Delete this post permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Post'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedPostDetail(null);
                    setRetryFeedback(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleEditPost(selectedPostDetail)}
                  className="px-4 py-2 text-xs font-semibold bg-[#0172F4] text-white hover:bg-blue-600 rounded-lg transition shadow-xs cursor-pointer"
                >
                  Edit / Duplicate Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. DAY SCHEDULE MODAL (When clicking +X more or day in Month View) */}
      {dayModalDate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in duration-200 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#0172F4]" />
                  Posts for {dayModalDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {dayModalPosts.length} post{dayModalPosts.length !== 1 ? 's' : ''} scheduled on this day
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    triggerCreatePost(`${dayModalDate.getFullYear()}-${String(dayModalDate.getMonth() + 1).padStart(2, '0')}-${String(dayModalDate.getDate()).padStart(2, '0')}`);
                    setDayModalDate(null);
                  }}
                  className="px-3 py-1.5 bg-[#0172F4] text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Post</span>
                </button>

                <button
                  onClick={() => setDayModalDate(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2 overflow-x-auto text-xs">
              {['ALL', 'SCHEDULED', 'PUBLISHED', 'CHANGES_REQUESTED', 'FAILED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setDayModalFilter(status)}
                  className={`px-3 py-1 rounded-lg font-semibold transition shrink-0 cursor-pointer ${
                    dayModalFilter === status
                      ? 'bg-white text-[#0172F4] border border-blue-200 shadow-2xs font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {status === 'ALL' ? 'All Posts' : status.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Posts List */}
            <div className="p-4 overflow-y-auto divide-y divide-gray-100 flex-1 space-y-2">
              {dayModalPosts.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  No posts found matching the filter for this date.
                </div>
              ) : (
                dayModalPosts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPostDetail(p);
                    }}
                    className="py-2.5 px-3 rounded-xl hover:bg-gray-50 transition cursor-pointer flex items-center justify-between gap-3 group border border-transparent hover:border-gray-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-gray-200">
                        <img
                          src={p.thumbnailUrl || p.mediaUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        {p.contentType === 'REEL' && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Play className="w-3.5 h-3.5 text-white fill-white" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatPostTime(p.targetDate)}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-bold text-gray-700">
                            {p.platform === 'INSTAGRAM' && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                            {p.platform === 'FACEBOOK' && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                            {p.platform === 'LINKEDIN' && <Linkedin className="w-3.5 h-3.5 text-sky-700" />}
                            {p.platform}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-[11px] font-semibold text-gray-600 truncate max-w-[120px]">
                            {p.clientName}
                          </span>
                        </div>

                        <h5 className="text-xs sm:text-sm font-bold text-gray-900 truncate mt-0.5">
                          {getPostCleanTitle(p)}
                        </h5>
                        {p.caption && (
                          <p className="text-[11px] text-gray-500 line-clamp-1">
                            {p.caption}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          p.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : p.status === 'CHANGES_REQUESTED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : p.status === 'SCHEDULED'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : p.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {p.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePost(p);
                        }}
                        className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                        title="Delete Post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#0172F4] transition" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">
                Click any post to view details, edit or retry
              </span>
              <button
                onClick={() => setDayModalDate(null)}
                className="px-4 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Fallback Create Post Modal */}
      {localCreateOpen && (
        <CreatePostModal
          isOpen={localCreateOpen}
          onClose={() => setLocalCreateOpen(false)}
          onPostCreated={() => {
            setLocalCreateOpen(false);
            fetchAllPosts();
          }}
          initialTemplate={createPrefill}
        />
      )}
    </div>
  );
};
