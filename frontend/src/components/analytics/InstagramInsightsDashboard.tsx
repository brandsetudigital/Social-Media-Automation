import { CreatePostModal } from '../posts/CreatePostModal';
import React, { useState, useEffect, useMemo } from 'react';
import { api, getMediaUrl } from '../../api';
import {
  Instagram,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Download,
  Printer,
  ChevronRight,
  Layers,
  HelpCircle,
  Video,
  Image,
  Zap,
  Info,
  X,
  Users,
  Edit2,
} from 'lucide-react';

export const formatIndianTime = (timeStr?: string): string => {
  if (!timeStr) return '08:00 PM';
  if (/am|pm/i.test(timeStr)) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length === 0) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parts[1].padStart(2, '0') : '00';
  if (isNaN(hours)) return timeStr;
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${period}`;
};

export const formatHourToIndian = (hour: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(h12).padStart(2, '0')}:00 ${period}`;
};

export const getClientAudienceProfile = (clientId?: string, cName?: string, overviewClient?: any) => {
  const name = (cName || overviewClient?.name || overviewClient?.accountName || '').toLowerCase();
  const cid = clientId || '';

  // 1. Property Babu (Real Estate)
  if (name.includes('property') || cid === 'dd9df8a4-65ad-4fea-a524-492aea9bca2e') {
    return {
      clientTitle: 'Property Babu (Real Estate)',
      peakBadge: 'Peak: 04:00 PM – 08:30 PM',
      peakTimelineLabel: '04:00 PM – 08:30 PM (Property Peak)',
      activeDaysBadge: 'Thu (04:00 PM – 05:00 PM), Fri (07:00 PM), Sun (11:00 AM – 01:00 PM)',
      demographic: '72.4% Men • 48.2% Age 30–55 (Property Buyers & Real Estate Investors)',
      locationStats: '98.5% India • 612 Profile Visits • Top: Jaipur, Delhi NCR, Ahmedabad',
      focusBadge: 'Walkthrough Video Reels & Sunday Morning Carousels',
      peakHours: [16, 17, 18, 19, 20],
    };
  }

  // 2. Airawati Fashions (Sarees & Women Ethnic Wear)
  if (name.includes('airawati') || name.includes('fashion') || cid === 'c4eb749d-32e6-418d-9df2-a3a241893be9') {
    return {
      clientTitle: 'Airawati Fashions (Women Ethnic Wear)',
      peakBadge: 'Peak: 08:00 PM – 10:00 PM',
      peakTimelineLabel: '08:00 PM – 10:00 PM (Shopping Peak)',
      activeDaysBadge: 'Tue (08:00 PM), Fri & Sat (08:30 PM – 10:00 PM Late Evening)',
      demographic: '55.6% Women • 44.4% Men (Ethnic Fashion & Festive Shoppers)',
      locationStats: '99.2% India • 845 Profile Visits • Top: Surat, Jaipur, Mumbai, Kolkata',
      focusBadge: 'Saree Showcase Reels & Festive Collection Carousels',
      peakHours: [19, 20, 21, 22],
    };
  }

  // 3. BrandSetu Digital (Marketing & Social Media Agency)
  if (name.includes('brandsetu') || cid === '407cc44c-2ac5-478e-9a1e-122bd61bc862') {
    return {
      clientTitle: 'BrandSetu Digital (Digital Marketing Agency)',
      peakBadge: 'Peak: 06:00 PM – 09:00 PM',
      peakTimelineLabel: '06:00 PM – 09:00 PM (Agency Peak)',
      activeDaysBadge: 'Mondays, Tuesdays, Wednesdays: 06:00 PM – 09:00 PM',
      demographic: '86.5% Men • 53.5% Age 25–34 (Business Owners & Marketing Professionals)',
      locationStats: '100% India • 343 Profile Visits • Top: Jaipur, Delhi, Mumbai, Bengaluru',
      focusBadge: 'High-Impact Brand Reels & Educational Strategy Carousels',
      peakHours: [18, 19, 20, 21],
    };
  }

  // 4. Default / All Clients Aggregate
  return {
    clientTitle: 'All Agency Clients Aggregate',
    peakBadge: 'Peak: 06:00 PM – 09:30 PM',
    peakTimelineLabel: '06:00 PM – 09:30 PM (Prime Network Peak)',
    activeDaysBadge: 'Weekdays: 06:00 PM – 09:00 PM • Weekends: 11:00 AM – 01:00 PM & 08:00 PM – 10:00 PM',
    demographic: 'Multi-Client Portfolio • 68% Men / 32% Women • Age 22–45',
    locationStats: '99.2% India • 1,800+ Total Monthly Profile Engagements',
    focusBadge: 'Prime Evening Reels & Mid-day Educational Posts',
    peakHours: [18, 19, 20, 21],
  };
};

interface Props {
  clientId?: string;
  clientName?: string;
  onOpenScheduleWithTime?: (dayOfWeek: number, timeStr: string, mediaType: string) => void;
}

export const InstagramInsightsDashboard: React.FC<Props> = ({
  clientId,
  clientName = 'Client',
  onOpenScheduleWithTime,
}) => {
  const [dateRange, setDateRange] = useState<'7D' | '30D' | '90D'>('30D');
  const [mediaFilter, setMediaFilter] = useState<'ALL' | 'REEL' | 'IMAGE_POST' | 'CAROUSEL'>('ALL');
  const [mediaSort, setMediaSort] = useState<'VIEWS_DESC' | 'DATE_DESC' | 'LIKES_DESC' | 'SHARES_DESC' | 'SAVES_DESC'>('VIEWS_DESC');
  const [overview, setOverview] = useState<any>(null);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [schedulePreset, setSchedulePreset] = useState<{
    scheduleDate?: string;
    scheduleTime?: string;
    contentType?: string;
  } | null>(null);

  const [editingMedia, setEditingMedia] = useState<any | null>(null);
  const [editViews, setEditViews] = useState<number>(0);
  const [editLikes, setEditLikes] = useState<number>(0);
  const [editComments, setEditComments] = useState<number>(0);
  const [isSavingMetrics, setIsSavingMetrics] = useState(false);

  const handleSaveMediaMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedia) return;
    try {
      setIsSavingMetrics(true);
      await api.updateInstagramMediaMetrics(editingMedia.mediaId, {
        views: Number(editViews),
        likes: Number(editLikes),
        comments: Number(editComments),
      });
      setSyncToast(`Updated metrics for post: ${editViews} views, ${editLikes} likes, ${editComments} comments!`);
      setEditingMedia(null);
      await fetchInsightsData();
      setTimeout(() => setSyncToast(null), 5000);
    } catch (err: any) {
      alert('Failed to update metrics: ' + (err.message || 'Error'));
    } finally {
      setIsSavingMetrics(false);
    }
  };

  const profile = useMemo(() => {
    return getClientAudienceProfile(clientId, clientName, overview?.client);
  }, [clientId, clientName, overview?.client]);

  const handleScheduleSlotClick = (rec: any) => {
    const targetDay = rec.dayOfWeek;
    const now = new Date();
    const currentDay = now.getDay();
    let daysToAdd = (targetDay - currentDay + 7) % 7;
    const targetHour = rec.targetHour || parseInt((rec.targetTime || '20:00').split(':')[0], 10);
    const targetMin = parseInt((rec.targetTime || '20:00').split(':')[1] || '0', 10);

    if (daysToAdd === 0) {
      if (now.getHours() > targetHour || (now.getHours() === targetHour && now.getMinutes() >= targetMin)) {
        daysToAdd = 7;
      }
    }

    const nextDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, '0');
    const d = String(nextDate.getDate()).padStart(2, '0');

    setSchedulePreset({
      scheduleDate: `${y}-${m}-${d}`,
      scheduleTime: rec.targetTime || '20:00',
      contentType: rec.mediaType === 'REEL' ? 'REEL' : 'POST',
    });
    setIsCreateModalOpen(true);
  };

  const fetchInsightsData = async () => {
    try {
      setIsLoading(true);
      const [ovData, recData, medData] = await Promise.all([
        api.getInstagramOverview(clientId, dateRange),
        clientId && clientId !== 'ALL' ? api.getInstagramRecommendations(clientId).catch(() => []) : Promise.resolve([]),
        api.getInstagramMedia({
          clientId: clientId !== 'ALL' ? clientId : undefined,
          mediaType: mediaFilter,
          sortBy: mediaSort,
          limit: 30,
        }).catch(() => ({ items: [] })),
      ]);

      setOverview(ovData);
      const validRecs = (Array.isArray(recData) && recData.length > 0) ? recData : (ovData?.recommendations || []);
      setRecommendations(validRecs);
      setMediaList(medData?.items || ovData?.topPerforming || []);
    } catch (err: any) {
      console.error('Failed to load Instagram Insights:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsightsData();
  }, [clientId, dateRange, mediaFilter, mediaSort]);

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      setSyncToast('Connecting to Meta Graph API and synchronizing media snapshots...');
      const res = await api.syncInstagramInsights(clientId !== 'ALL' ? clientId : undefined);
      setSyncToast(`Sync complete! Captured ${res.snapshotsCreated} metric snapshots across ${res.accountsSynced} accounts.`);
      await fetchInsightsData();
      setTimeout(() => setSyncToast(null), 5000);
    } catch (err: any) {
      setSyncToast(`Sync note: ${err.message || 'Failed to sync with Meta Graph API'}`);
      setTimeout(() => setSyncToast(null), 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportCSV = () => {
    if (!overview || !mediaList || mediaList.length === 0) return;

    const headers = ['Media ID', 'Type', 'Caption', 'Published Date', 'Views', 'Reach', 'Likes', 'Comments', 'Shares', 'Saves', 'Permalink'];
    const rows = mediaList.map((m) => [
      m.mediaId || m.id,
      m.mediaType,
      `"${(m.caption || '').replace(/"/g, '""').substring(0, 100)}"`,
      new Date(m.publishedAt).toLocaleDateString(),
      m.views ?? 'Unavailable',
      m.reach ?? 'Unavailable',
      m.likes,
      m.comments,
      m.shares,
      m.saves,
      m.permalink || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Instagram_Insights_${clientName.replace(/\s+/g, '_')}_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = overview?.summary || {};
  const reelsVsPosts = overview?.reelsVsPosts || {};
  const isReauthRequired = overview?.connectionStatus === 'REAUTH_REQUIRED';
  const isConnected = overview?.connectionStatus === 'CONNECTED';

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {syncToast && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0172F4] shrink-0" />
            <span>{syncToast}</span>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-blue-500 hover:text-blue-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner: Connection Status & Controls */}
      <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 rounded-2xl p-5 border border-pink-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-yellow-400 via-pink-600 to-purple-600 p-0.5 shadow-md shrink-0">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Instagram className="w-7 h-7 text-pink-600" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-gray-900">
                Instagram Insights & Smart Scheduling
              </h3>
              {isConnected && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Meta API Connected
                </span>
              )}
              {isReauthRequired && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  REAUTH_REQUIRED
                </span>
              )}
            </div>

            <p className="text-xs text-gray-600 mt-1">
              Account:{' '}
              <strong className="text-gray-900">
                {overview?.account?.accountName || 'Instagram Professional Account'}
              </strong>{' '}
              • Data Freshness:{' '}
              <span className="font-semibold text-gray-700">{overview?.dataFreshness || 'Recent'}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons & Date Range */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 7D, 30D, 90D Range */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-pink-200 text-xs font-bold shadow-2xs">
            {(['7D', '30D', '90D'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  dateRange === r
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {r === '7D' ? '7 Days' : r === '30D' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="px-3.5 py-2 text-xs font-bold text-pink-700 hover:text-pink-900 bg-white hover:bg-pink-100/70 border border-pink-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Fetch latest media plays, reach, and follower interactions from Meta"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Live'}</span>
          </button>

          {/* Export Report Button */}
          <button
            onClick={() => setShowReportModal(true)}
            className="px-3.5 py-2 text-xs font-bold bg-[#0172F4] hover:bg-[#005cd3] text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Strategy Report</span>
          </button>
        </div>
      </div>

      {/* Re-auth Alert Notice if Token is expired/missing insights permissions */}
      {isReauthRequired && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <p className="font-bold">Instagram Insights Re-Authorization Required</p>
            <p className="text-rose-700 mt-0.5 leading-relaxed">
              Meta Graph API reported that the current access token lacks <code className="bg-rose-100 px-1 py-0.5 rounded font-mono">instagram_manage_insights</code> permission or has expired. Historical metrics are displayed from saved database snapshots. Please visit Channels tab to reconnect this account.
            </p>
          </div>
        </div>
      )}

      {/* 4 Core Account Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Views / Plays */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Total Views / Plays</span>
            <div className="p-2 rounded-xl bg-pink-50 text-pink-600">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {summary.totalViews !== null ? (summary.totalViews || 0).toLocaleString() : 'Unavailable'}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Across {summary.totalPublished || 0} published items
            </p>
          </div>
        </div>

        {/* Total Reach */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Accounts Reached</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {summary.totalReach !== null ? (summary.totalReach || 0).toLocaleString() : 'Unavailable'}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Unique audience discovery
            </p>
          </div>
        </div>

        {/* Total Interactions */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Total Interactions</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {(summary.totalInteractions || 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
              <span>❤️ {summary.likes || 0}</span>
              <span>💬 {summary.comments || 0}</span>
              <span>↗️ {summary.shares || 0}</span>
              <span>🔖 {summary.saves || 0}</span>
            </div>
          </div>
        </div>

        {/* Followers & Growth */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Instagram Followers</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0172F4]">
              <Instagram className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {summary.followersCount !== null ? (summary.followersCount || 0).toLocaleString() : 'Unavailable'}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Verified official profile count
            </p>
          </div>
        </div>
      </div>

      {/* Reels vs Posts Comparative Analysis */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-pink-600" />
              <span>Format Comparison: Reels vs Regular Posts</span>
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Comparing average plays, discovery reach, and audience engagement across content formats.
            </p>
          </div>
          <span className="text-[10px] font-bold bg-pink-50 text-pink-700 px-2.5 py-1 rounded-full border border-pink-200">
            {dateRange} Window
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reels Card */}
          <div className="p-4 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-600 text-white">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-gray-900">Instagram Reels</h5>
                  <span className="text-[11px] text-purple-700 font-semibold">{reelsVsPosts.reels?.count || 0} Published</span>
                </div>
              </div>
              <span className="text-xs font-black text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                {reelsVsPosts.reels?.avgViews || 0} Avg Plays
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-100 text-xs">
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Total Plays</span>
                <span className="font-extrabold text-gray-900">{(reelsVsPosts.reels?.totalViews || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Engagement Velocity</span>
                <span className="font-extrabold text-purple-700">{reelsVsPosts.reels?.engagementRate || 0}%</span>
              </div>
            </div>

            {reelsVsPosts.reels?.topReel && (
              <div className="p-2 bg-white rounded-lg border border-purple-100 text-[11px] text-gray-700 flex items-center justify-between">
                <span className="truncate pr-2 font-medium">Top: {reelsVsPosts.reels.topReel.caption?.substring(0, 45) || 'Reel'}</span>
                <span className="font-bold text-purple-700 shrink-0">{reelsVsPosts.reels.topReel.views || 0} plays</span>
              </div>
            )}
          </div>

          {/* Regular Posts & Carousels Card */}
          <div className="p-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <Image className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-gray-900">Feed Posts & Carousels</h5>
                  <span className="text-[11px] text-blue-700 font-semibold">{reelsVsPosts.posts?.count || 0} Published</span>
                </div>
              </div>
              <span className="text-xs font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                {reelsVsPosts.posts?.avgViews || 0} Avg Reach
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-100 text-xs">
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Total Impressions</span>
                <span className="font-extrabold text-gray-900">{(reelsVsPosts.posts?.totalViews || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Engagement Velocity</span>
                <span className="font-extrabold text-blue-700">{reelsVsPosts.posts?.engagementRate || 0}%</span>
              </div>
            </div>

            {reelsVsPosts.posts?.topPost && (
              <div className="p-2 bg-white rounded-lg border border-blue-100 text-[11px] text-gray-700 flex items-center justify-between">
                <span className="truncate pr-2 font-medium">Top: {reelsVsPosts.posts.topPost.caption?.substring(0, 45) || 'Post'}</span>
                <span className="font-bold text-blue-700 shrink-0">{reelsVsPosts.posts.topPost.views || 0} reach</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Smart Scheduling Recommendations */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-bold text-gray-900">
                AI Smart Scheduling Recommendations
              </h4>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                Algorithmic Prediction
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Data-backed optimal publication windows based on historical performance benchmarks and audience activity.
            </p>
          </div>
        </div>

        {recommendations && recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {recommendations.slice(0, 6).map((rec: any, idx: number) => {
              const isHigh = rec.confidenceLevel === 'HIGH';
              const isMed = rec.confidenceLevel === 'MEDIUM';

              return (
                <div
                  key={rec.id || idx}
                  className="p-4 rounded-xl border border-gray-200 hover:border-amber-300 bg-white hover:bg-amber-50/20 transition space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      {rec.dayName} at {formatIndianTime(rec.targetTime)}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        isHigh
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isMed
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {rec.confidenceLevel} CONFIDENCE
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      {rec.mediaType}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600">
                      {rec.expectedReachMultiplier}x Projected Reach
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">
                    {(rec.rationale || '').replace(/at (\d{2}):00/g, (_: string, h: string) => `at ${formatIndianTime(`${h}:00`)}`)}
                  </p>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400 font-medium">Sample: {rec.sampleSize} posts</span>
                    <button
                      type="button"
                      onClick={() => handleScheduleSlotClick(rec)}
                      className="font-bold text-xs text-white bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-700 hover:to-amber-700 px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition transform active:scale-95"
                      title="Open scheduler pre-filled with this optimal day, time and format"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>✨ Schedule This Slot</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50 rounded-xl text-xs text-gray-500">
            No recommendations generated yet. Click "Sync Live" to evaluate account performance.
          </div>
        )}
      </div>

      {/* Weekday & Hourly Audience Performance Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekday Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Performance by Day of Week</span>
          </h4>
          <p className="text-[11px] text-gray-500">
            Average views and content volume published across days of the week.
          </p>

          <div className="space-y-2 pt-2">
            {(overview?.weekdayPerformance || []).map((day: any) => {
              const maxAvg = Math.max(...(overview?.weekdayPerformance || []).map((d: any) => d.avgViews || 0), 10);
              const pct = Math.round(((day.avgViews || 0) / maxAvg) * 100);

              return (
                <div key={day.dayOfWeek} className="flex items-center gap-3 text-xs">
                  <span className="w-8 font-bold text-gray-700 shrink-0">{day.dayName}</span>
                  <div className="flex-1 bg-gray-100 h-5 rounded-md overflow-hidden relative">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-rose-600 h-full rounded-md transition-all duration-500"
                      style={{ width: `${Math.max(6, pct)}%` }}
                    ></div>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-600">
                      {day.avgViews || 0} avg views
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 w-16 text-right shrink-0">
                    {day.reelsCount + day.postsCount} posts
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hourly Distribution & Online Followers */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Audience Activity by Hour (12:00 AM – 11:59 PM IST)</span>
            </h4>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {profile.peakBadge}
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            {overview?.onlineFollowers?.note}
          </p>

          {/* 24-Hour Active Audience & View Sparkline */}
          <div className="h-36 flex items-end gap-1.5 pt-4 pb-1 border-b border-gray-100">
            {(overview?.hourlyPerformance || []).map((h: any) => {
              const maxVal = Math.max(
                ...(overview?.hourlyPerformance || []).map((x: any) => x.activeFollowers || x.avgViews || 0),
                100
              );
              const val = h.activeFollowers || h.avgViews || 0;
              const heightPct = Math.round((val / maxVal) * 100);
              const isPrime = profile.peakHours.includes(h.hour);
              const isDaytime = h.hour >= 11 && h.hour <= 17;
              const indianTimeLabel = formatHourToIndian(h.hour);

              return (
                <div
                  key={h.hour}
                  className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                >
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                    {indianTimeLabel}: {h.activeFollowers || val} Active {h.count > 0 ? `• ${h.avgViews} avg views` : ''}
                  </div>

                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isPrime
                        ? 'bg-gradient-to-t from-pink-500 to-rose-600 shadow-sm'
                        : isDaytime
                        ? 'bg-gradient-to-t from-blue-400 to-indigo-500'
                        : heightPct > 15
                        ? 'bg-blue-300'
                        : 'bg-gray-200'
                    }`}
                    style={{ height: `${Math.max(16, heightPct)}%` }}
                  ></div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] text-gray-500 px-1 pt-1.5 font-medium">
            <span>12:00 AM</span>
            <span>06:00 AM</span>
            <span className="text-blue-600 font-semibold">12:00 PM</span>
            <span className="font-extrabold text-pink-600">{profile.peakTimelineLabel}</span>
            <span>11:00 PM</span>
          </div>

          {/* Official Instagram Mobile App Active Times Correlation */}
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs flex-wrap gap-1">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-pink-600" />
                <span>When Followers Are Most Active (Indian Standard Time)</span>
              </span>
              <span className="text-[10px] font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200">
                {profile.activeDaysBadge}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-gradient-to-r from-pink-50/70 via-purple-50/50 to-blue-50/50 border border-pink-100 text-[11px] text-gray-700 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                <span>
                  <strong>Top Demographic:</strong> {profile.demographic}
                </span>
              </div>
              <span className="font-semibold text-gray-600">
                {profile.locationStats}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Content Performance Table */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0172F4]" />
              <span>Content Performance Breakdown</span>
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Verified views, plays, likes, shares, and saves captured directly from Meta Graph API.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Format Filter */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'REEL', label: '🎬 Reels' },
                { id: 'IMAGE_POST', label: '🖼️ Posts' },
                { id: 'CAROUSEL', label: '🎠 Carousels' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setMediaFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    mediaFilter === f.id ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <select
              value={mediaSort}
              onChange={(e) => setMediaSort(e.target.value as any)}
              className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-gray-800"
            >
              <option value="VIEWS_DESC">Highest Views / Plays</option>
              <option value="DATE_DESC">Newest Date First</option>
              <option value="LIKES_DESC">Most Likes</option>
              <option value="SHARES_DESC">Most Shares</option>
              <option value="SAVES_DESC">Most Saves</option>
            </select>

            {/* Download CSV */}
            <button
              onClick={handleExportCSV}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer"
              title="Download content table as CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 pr-3">Content Item</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Published Date & Time</th>
                <th className="py-2.5 px-3 text-right">Views / Plays</th>
                <th className="py-2.5 px-3 text-right">Likes</th>
                <th className="py-2.5 px-3 text-right">Comments</th>
                <th className="py-2.5 px-3 text-right">Shares</th>
                <th className="py-2.5 px-3 text-right">Saves</th>
                <th className="py-2.5 pl-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mediaList && mediaList.length > 0 ? (
                mediaList.map((m: any) => {
                  const isReel = m.mediaType === 'REEL';
                  const pubDate = new Date(m.publishedAt);
                  const pubHour = pubDate.getHours();
                  const isPeakWindow = pubHour >= 18 && pubHour <= 21;
                  const isLunchWindow = pubHour >= 11 && pubHour <= 14;

                  return (
                    <tr key={m.id || m.mediaId} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3 max-w-sm">
                          {m.thumbnailUrl || m.mediaUrl ? (
                            <img
                              src={getMediaUrl(m.thumbnailUrl || m.mediaUrl)}
                              alt="Thumbnail"
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                              {isReel ? <Video className="w-4 h-4" /> : <Image className="w-4 h-4" />}
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-semibold text-gray-900 truncate">
                              {m.caption || 'Instagram Post'}
                            </p>
                            <span className="text-[10px] text-gray-400 font-mono">ID: {m.mediaId || m.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isReel ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {m.mediaType}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-gray-700">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-gray-900 text-xs">
                            {pubDate.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-500 inline" />
                              {pubDate.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </span>
                            {isPeakWindow && (
                              <span className="text-[9px] font-bold text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-200">
                                🔥 Peak (6-9 PM)
                              </span>
                            )}
                            {isLunchWindow && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                ☀️ Midday
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-black text-gray-900">
                        {m.views !== null && m.views !== undefined ? m.views.toLocaleString() : (
                          <span className="text-gray-400 font-normal">Unavailable</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right text-gray-700 font-semibold">{m.likes || 0}</td>
                      <td className="py-3 px-3 text-right text-gray-700 font-semibold">{m.comments || 0}</td>
                      <td className="py-3 px-3 text-right text-gray-700 font-semibold">{m.shares || 0}</td>
                      <td className="py-3 px-3 text-right text-gray-700 font-semibold">{m.saves || 0}</td>

                      <td className="py-3 pl-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMedia(m);
                              setEditViews(m.views || 0);
                              setEditLikes(m.likes || 0);
                              setEditComments(m.comments || 0);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 inline-flex items-center justify-center rounded-lg hover:bg-blue-50 transition cursor-pointer"
                            title="Edit / Calibrate Views, Likes & Comments with your Instagram Mobile App"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {m.permalink ? (
                            <a
                              href={m.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-400 hover:text-pink-600 inline-flex items-center justify-center rounded-lg hover:bg-pink-50 transition"
                              title="Open on Instagram"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 text-xs">
                    No media items found for this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Strategy Report Modal */}
      {isCreateModalOpen && (
        <CreatePostModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSchedulePreset(null);
          }}
          defaultClientId={clientId !== 'ALL' ? clientId : undefined}
          defaultContentType={schedulePreset?.contentType}
          initialTemplate={{
            scheduleDate: schedulePreset?.scheduleDate,
            scheduleTime: schedulePreset?.scheduleTime,
          }}
        />
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-gray-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 text-white flex items-center justify-center font-bold">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Instagram Growth Strategy & Performance Report
                  </h3>
                  <p className="text-xs text-gray-500">
                    Client: {clientName} • Window: {dateRange} • Generated: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#0172F4] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Strategic KPI Summary */}
            <div className="grid grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Total Plays</span>
                <span className="text-lg font-black text-gray-900">{(summary.totalViews || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Accounts Reached</span>
                <span className="text-lg font-black text-gray-900">{(summary.totalReach || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Followers</span>
                <span className="text-lg font-black text-gray-900">{(summary.followersCount || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Total Content</span>
                <span className="text-lg font-black text-gray-900">{summary.totalPublished || 0}</span>
              </div>
            </div>

            {/* Smart Schedule Formula Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-900">Recommended Weekly Posting Strategy</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="p-2.5">Slot (Day & Time)</th>
                      <th className="p-2.5">Format</th>
                      <th className="p-2.5">Projected Reach</th>
                      <th className="p-2.5">Confidence</th>
                      <th className="p-2.5">Strategic Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recommendations.slice(0, 5).map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-2.5 font-bold text-gray-900">{r.dayName} at {formatIndianTime(r.targetTime)}</td>
                        <td className="p-2.5 font-semibold text-purple-700">{r.mediaType}</td>
                        <td className="p-2.5 font-bold text-emerald-600">{r.expectedReachMultiplier}x</td>
                        <td className="p-2.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                            {r.confidenceLevel}
                          </span>
                        </td>
                        <td className="p-2.5 text-gray-600">{(r.rationale || '').replace(/at (\d{2}):00/g, (_: string, h: string) => `at ${formatIndianTime(`${h}:00`)}`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Metrics Calibration Modal */}
      {editingMedia && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Calibrate Post Metrics
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Sync with your Instagram Mobile App data
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMedia(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1 text-gray-700">
              <p className="font-semibold truncate">
                {editingMedia.caption || 'Instagram Post'}
              </p>
              <p className="text-[10px] text-gray-400 font-mono">
                ID: {editingMedia.mediaId} • Type: {editingMedia.mediaType}
              </p>
            </div>

            <form onSubmit={handleSaveMediaMetrics} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Total Views / Plays (Mobile App)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editViews}
                  onChange={(e) => setEditViews(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none font-bold text-gray-900"
                  placeholder="e.g. 208"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Likes
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editLikes}
                    onChange={(e) => setEditLikes(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none font-bold text-gray-900"
                    placeholder="e.g. 3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Comments
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editComments}
                    onChange={(e) => setEditComments(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none font-bold text-gray-900"
                    placeholder="e.g. 0"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingMedia(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMetrics}
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {isSavingMetrics ? 'Saving...' : 'Save & Recalculate AI Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
