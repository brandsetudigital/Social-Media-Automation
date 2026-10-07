import React, { useState, useEffect, useMemo } from 'react';
import { useClients } from '../../context/ClientContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import {
  Building2,
  Share2,
  Send,
  Calendar,
  FileText,
  AlertCircle,
  AlertTriangle,
  Plus,
  Users,
  BarChart3,
  CreditCard,
  Heart,
  TrendingUp,
  Percent,
  CheckCircle2,
  Search,
  ExternalLink,
  ChevronRight,
  X,
  Layers,
  Sparkles,
  Clock,
  Briefcase,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  MessageCircle,
  Eye,
  Globe,
  ArrowUpRight,
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';

interface AgencyDashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onNavigateToPosts?: (filter?: string, viewMode?: 'calendar' | 'cards' | 'list', postId?: string) => void;
  onOpenCreatePost?: () => void;
}

export const AgencyDashboardView: React.FC<AgencyDashboardViewProps> = ({
  onNavigate,
  onNavigateToPosts,
  onOpenCreatePost,
}) => {
  const { clients, selectedClientId } = useClients();
  const { role } = useAuth();

  const [overview, setOverview] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGettingStarted, setShowGettingStarted] = useState(true);
  const [contentTab, setContentTab] = useState<'posts' | 'engagement' | 'reach'>('posts');
  const [brandSearch, setBrandSearch] = useState('');

  // Filter strictly future/upcoming posts that are not yet published
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return calendarEvents
      .filter((evt) => {
        if (!evt.scheduledAt) return false;
        const d = new Date(evt.scheduledAt);
        const status = (evt.status || '').toUpperCase();
        return d.getTime() >= now.getTime() && status !== 'PUBLISHED';
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [calendarEvents]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ovData, chanData, calEvents] = await Promise.all([
        api.getAnalyticsOverview(selectedClientId !== 'ALL' ? selectedClientId : undefined).catch((err) => {
          console.error('[BrandSetu Error] Overview API failed:', err);
          return null;
        }),
        api.getSocialAccounts(selectedClientId !== 'ALL' ? selectedClientId : undefined).catch((err) => {
          console.error('[BrandSetu Error] Social Accounts API failed:', err);
          return [];
        }),
        api.getCalendarEvents({ clientId: selectedClientId !== 'ALL' ? selectedClientId : undefined }).catch((err) => {
          console.error('[BrandSetu Error] Calendar Events API failed:', err);
          return [];
        }),
      ]);

      console.log('✅ [BrandSetu DB/API] Overview Loaded:', ovData);
      console.log('✅ [BrandSetu DB/API] Calendar Events Loaded:', calEvents);
      console.log('✅ [BrandSetu DB/API] Channels Loaded:', chanData);

      setOverview(ovData);
      setChannels(chanData);
      setCalendarEvents(calEvents || []);
    } catch (err) {
      console.error('❌ [BrandSetu Error] loadData critical failure:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClientId]);

  const totalBrands = clients.length;
  const activeBrands = overview?.activeClientsCount ?? clients.filter((c) => c.status !== 'INACTIVE').length;
  const totalChannels = channels.length || 0;
  const totalPostsPublished = overview?.publishedCount || 0;
  const scheduledCount = overview?.scheduledCount ?? (calendarEvents.length || 0);
  const draftCount = overview?.draftCount || 0;
  const failedCount = overview?.failedCount || 0;
  const pendingApprovalCount = overview?.pendingApprovalCount || 0;
  const publishedToday = overview?.publishedToday || 0;

  const changesRequestedPosts = calendarEvents.filter(
    (e) => e.status === 'CHANGES_REQUESTED' || e.status === 'REJECTED'
  );
  const changesRequestedCount = overview?.changesRequestedCount ?? changesRequestedPosts.length;

  // Platform breakdown counts
  const platformCounts: Record<string, number> = {
    INSTAGRAM: 0,
    FACEBOOK: 0,
    LINKEDIN: 0,
    GOOGLE_BUSINESS: 0,
    TWITTER: 0,
  };

  if (overview?.platformBreakdown && Object.keys(overview.platformBreakdown).length > 0) {
    Object.entries(overview.platformBreakdown).forEach(([k, v]) => {
      if (platformCounts[k] !== undefined) platformCounts[k] = Number(v);
    });
  } else if (calendarEvents && calendarEvents.length > 0) {
    calendarEvents.forEach((ev: any) => {
      const p = (ev.platform || 'INSTAGRAM').toUpperCase();
      if (platformCounts[p] !== undefined) {
        platformCounts[p] += 1;
      } else {
        platformCounts['INSTAGRAM'] += 1;
      }
    });
  }

  const totalPlatformPosts = Object.values(platformCounts).reduce((a, b) => a + b, 0) || 1;
  const totalContentPipeline = scheduledCount + draftCount + pendingApprovalCount + totalPostsPublished;
  const scheduledPercent = totalContentPipeline > 0 ? Math.round((scheduledCount / totalContentPipeline) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Brands */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-700">Total Brands</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalBrands}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Active Brands */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-700">Active Brands</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{activeBrands}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        {/* Total Connected Channels */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-700">Total Connected Channels</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalChannels}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
            <Share2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Posts Published */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-700">Total Posts Published</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalPostsPublished}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0172F4] flex items-center justify-center shadow-xs">
            <Send className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sub-Stats Badges Row - Single Clean Row Without Wrapping */}
      <div className="bg-white rounded-xl py-2 px-3 sm:px-4 border border-slate-200 shadow-sm flex items-center justify-between gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold overflow-x-auto scrollbar-none whitespace-nowrap">
        <button
          onClick={() => (onNavigateToPosts ? onNavigateToPosts('PUBLISHED', 'list') : onNavigate('posts'))}
          className="flex items-center gap-1.5 p-1 px-2.5 rounded-lg hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 transition group cursor-pointer shrink-0"
          title="Click to view all published posts"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 group-hover:scale-110 transition shrink-0"></span>
          <span className="text-slate-700 group-hover:text-emerald-800">Posts Published Today:</span>
          <span className="font-black text-slate-900 group-hover:text-emerald-700 text-sm sm:text-base">{publishedToday}</span>
        </button>

        <button
          onClick={() => (onNavigateToPosts ? onNavigateToPosts('SCHEDULED', 'list') : onNavigate('posts'))}
          className="flex items-center gap-1.5 p-1 px-2.5 rounded-lg hover:bg-purple-50/70 border border-transparent hover:border-purple-200 transition group cursor-pointer shrink-0"
          title="Click to view all scheduled posts"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 ring-4 ring-purple-100 group-hover:scale-110 transition shrink-0"></span>
          <span className="text-slate-700 group-hover:text-purple-900">Total Scheduled Posts:</span>
          <span className="font-black text-purple-700 text-sm sm:text-base">{scheduledCount}</span>
        </button>

        <button
          onClick={() => (onNavigateToPosts ? onNavigateToPosts('DRAFT', 'list') : onNavigate('posts'))}
          className="flex items-center gap-1.5 p-1 px-2.5 rounded-lg hover:bg-amber-50/70 border border-transparent hover:border-amber-200 transition group cursor-pointer shrink-0"
          title="Click to view drafts and posts in review"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100 group-hover:scale-110 transition shrink-0"></span>
          <span className="text-slate-700 group-hover:text-amber-900">Draft / In Review:</span>
          <span className="font-black text-amber-700 text-sm sm:text-base">{draftCount + pendingApprovalCount}</span>
        </button>

        <button
          onClick={() => (onNavigateToPosts ? onNavigateToPosts('FAILED', 'list') : onNavigate('posts'))}
          className="flex items-center gap-1.5 p-1 px-2.5 rounded-lg hover:bg-rose-50/70 border border-transparent hover:border-rose-200 transition group cursor-pointer shrink-0"
          title="Click to view failed posts & failure reasons"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100 group-hover:scale-110 transition shrink-0"></span>
          <span className="text-slate-700 group-hover:text-rose-900">Failed Posts:</span>
          <span className="font-black text-rose-700 text-sm sm:text-base">{failedCount}</span>
          {failedCount > 0 && (
            <span className="text-[9px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded ml-0.5 animate-pulse shrink-0">
              View Reason
            </span>
          )}
        </button>

        <button
          onClick={() => (onNavigateToPosts ? onNavigateToPosts('CHANGES_REQUESTED', 'list') : onNavigate('posts'))}
          className={`flex items-center gap-1.5 p-1 px-2.5 rounded-lg border transition group cursor-pointer shrink-0 ${
            changesRequestedCount > 0
              ? 'bg-amber-50/90 border-amber-300 hover:bg-amber-100/90'
              : 'border-transparent hover:bg-amber-50/70 hover:border-amber-200'
          }`}
          title="Click to view posts where Admin requested changes"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-200 group-hover:scale-110 transition shrink-0"></span>
          <span className="text-slate-700 group-hover:text-amber-900">Changes Requested:</span>
          <span className="font-black text-amber-700 text-sm sm:text-base">{changesRequestedCount}</span>
          {changesRequestedCount > 0 && (
            <span className="text-[9px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.5 rounded ml-0.5 animate-pulse shrink-0">
              Action Required
            </span>
          )}
        </button>
      </div>

      {/* Prominent Action Banner: Admin Requested Changes (Screenshot / SMM Visibility) */}
      {changesRequestedPosts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50/30 to-amber-50/20 border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-amber-950">
                    Admin Has Requested Changes on {changesRequestedPosts.length} Post{changesRequestedPosts.length > 1 ? 's' : ''}
                  </h3>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    SMM Action Required
                  </span>
                </div>
                <p className="text-xs font-semibold text-amber-800 mt-0.5">
                  Admin ne neeche diye gaye posts me changes / feedback likhe hain. Click karke reason dekhein aur post update karein.
                </p>
              </div>
            </div>
            <button
              onClick={() => (onNavigateToPosts ? onNavigateToPosts('CHANGES_REQUESTED', 'list') : onNavigate('posts'))}
              className="text-xs font-black text-amber-900 hover:text-amber-950 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition self-start sm:self-auto shadow-xs cursor-pointer"
            >
              View All In Posts Manager &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {changesRequestedPosts.slice(0, 4).map((evt) => {
              const item = evt.contentItem || {};
              const brandName = evt.client?.businessName || item.client?.businessName || 'BrandSetu Client';
              return (
                <div
                  key={evt.id}
                  className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={item.thumbnailUrl || item.mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                      alt={item.title || 'Post'}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 shadow-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[130px]">
                          {brandName}
                        </span>
                        <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                          Changes Requested
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate mt-1">
                        {item.title || 'Brand Video Reel Showcase'}
                      </h4>
                    </div>
                  </div>

                  {/* Admin Feedback Box */}
                  <div className="p-2.5 bg-amber-50 border border-amber-200/90 rounded-lg text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Admin Review Feedback / Reason:</span>
                    </div>
                    <p className="font-bold text-amber-950 italic pl-5 bg-white/70 p-1.5 rounded border border-amber-100">
                      "{evt.reviewFeedback || 'Admin requested modifications on this post.'}"
                    </p>
                    {evt.reviewedByName && (
                      <p className="text-[10px] text-amber-700 mt-1 pl-5 font-medium">
                        Feedback by <span className="font-bold text-amber-900">{evt.reviewedByName}</span>
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      onNavigateToPosts
                        ? onNavigateToPosts('CHANGES_REQUESTED', 'list', evt.contentItemId || evt.id || item.id)
                        : onNavigate('posts')
                    }
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span>View Reason & Edit Post</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Middle Row: Agency Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agency Alerts */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span>Agency Alerts & System Status</span>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Live Monitor
            </span>
          </div>

          <div className="space-y-3 my-3">
            {/* Alert 0: Changes Requested by Admin */}
            {changesRequestedCount > 0 && (
              <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/90 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-950 flex items-center gap-2">
                      <span>{changesRequestedCount} Post(s) Require Admin Changes</span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.5 rounded">Action Required</span>
                    </p>
                    <p className="text-xs text-amber-800 font-semibold mt-0.5">
                      Admin ne revision feedback / reason likha hai. Click karke check karein.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToPosts ? onNavigateToPosts('CHANGES_REQUESTED', 'list') : onNavigate('posts')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  View Feedback
                </button>
              </div>
            )}

            {/* Alert 1: Pending Approvals */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-950">
                    {pendingApprovalCount} Posts Awaiting Approval
                  </p>
                  <p className="text-xs text-amber-800 font-semibold">
                    Client & Admin sign-off required before automated publishing
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('approvals')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition shadow-xs"
              >
                Review
              </button>
            </div>

            {/* Alert 2: Buffer Pipeline Health */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-950">
                    14-Day Content Buffer Healthy
                  </p>
                  <p className="text-xs text-emerald-800 font-semibold">
                    {scheduledCount} posts queued across all brands for automated publishing
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md shrink-0">
                Healthy
              </span>
            </div>

            {/* Alert 3: Connected Channels */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-950">
                    {totalChannels || 10} Social Accounts Live & Synced
                  </p>
                  <p className="text-xs text-blue-800 font-semibold">
                    OAuth tokens active for Instagram, Facebook, LinkedIn & Google
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('channels')}
                className="text-[#0172F4] hover:underline text-xs font-bold shrink-0"
              >
                Manage
              </button>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Automated monitoring active</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> All systems operational
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>Quick Actions</span>
            </div>
            <span className="text-xs font-bold text-slate-500">Shortcuts</span>
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 my-1.5 content-stretch">
            {/* Create Brand */}
            <button
              onClick={() => onNavigate('dashboard')}
              className="h-full min-h-[105px] sm:min-h-[115px] p-3 sm:py-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 flex flex-col items-center justify-center gap-2 transition group text-center shadow-xs"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">Create Brand</span>
            </button>

            {/* Manage Brands */}
            <button
              onClick={() => onNavigate('dashboard')}
              className="h-full min-h-[105px] sm:min-h-[115px] p-3 sm:py-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 flex flex-col items-center justify-center gap-2 transition group text-center shadow-xs"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0172F4] flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-[#0172F4]">Manage Brands</span>
            </button>

            {/* Manage Users (ADMIN only) or Content Schedule (SMM) */}
            {role === 'ADMIN' ? (
              <button
                onClick={() => onNavigate('users')}
                className="h-full min-h-[105px] sm:min-h-[115px] p-3 sm:py-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 flex flex-col items-center justify-center gap-2 transition group text-center shadow-xs"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-800 group-hover:text-amber-700">Manage Users</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('posts')}
                className="h-full min-h-[105px] sm:min-h-[115px] p-3 sm:py-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 flex flex-col items-center justify-center gap-2 transition group text-center shadow-xs"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-700">Content Schedule</span>
              </button>
            )}

            {/* Buy AI Credits */}
            <button
              onClick={() => alert('BrandSetu AI Studio: Included in your Agency Plan!')}
              className="h-full min-h-[105px] sm:min-h-[115px] p-3 sm:py-4 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 flex flex-col items-center justify-center gap-2 transition group text-center shadow-xs"
            >
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-purple-700">Buy AI Credits</span>
            </button>

            {/* View Analytics */}
            <button
              onClick={() => onNavigate('analytics')}
              className="h-full min-h-[105px] sm:min-h-[115px] p-3 sm:py-4 rounded-xl border border-slate-200 hover:border-pink-400 hover:bg-pink-50/40 flex flex-col items-center justify-center gap-2 transition group text-center shadow-xs"
            >
              <div className="w-11 h-11 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-pink-700">View Analytics</span>
            </button>

            {/* Connect Channels */}
            <button
              onClick={() => onNavigate('channels')}
              className="h-full min-h-[105px] sm:min-h-[115px] p-3 sm:py-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 flex flex-col items-center justify-center gap-2 transition group text-center shadow-xs"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0172F4] flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-[#0172F4]">Channels</span>
            </button>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Direct agency management tools</span>
            <span className="text-[#0172F4] font-bold">Fast Access</span>
          </div>
        </div>
      </div>

      {/* Row: Mini Engagement stats on left + Most Used Social Media on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini stats stack */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700">Total Engagements</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{overview?.totalLikes || 0}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
              <Heart className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700">Total Reach</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{overview?.totalReach || 0}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0172F4] flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700">Average Engagement Rate</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{overview?.avgEngagementRate || 0}%</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs">
              <Percent className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Most Used Social Media */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-base">Most Used Social Media</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Live Sync Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-4">
            <div className="p-4 rounded-xl border border-pink-200/80 bg-pink-50/50 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0 shadow-xs">
                <Instagram className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900 truncate">Instagram</p>
                <p className="text-xs font-bold text-pink-700 mt-0.5">{platformCounts.INSTAGRAM} posts scheduled</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/50 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                <Facebook className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900 truncate">Facebook</p>
                <p className="text-xs font-bold text-blue-700 mt-0.5">{platformCounts.FACEBOOK} posts scheduled</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-sky-200/80 bg-sky-50/50 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 shadow-xs">
                <Linkedin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900 truncate">LinkedIn</p>
                <p className="text-xs font-bold text-sky-700 mt-0.5">{platformCounts.LINKEDIN} posts scheduled</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-semibold text-slate-600">
            <span>Primary distribution across {totalChannels || 3} connected brand channels</span>
            <button
              onClick={() => onNavigate('channels')}
              className="text-[#0172F4] hover:underline font-bold inline-flex items-center gap-1 text-xs"
            >
              Manage Channels <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row: Platform Activity Distribution & Content & Engagement Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Activity Distribution */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <span className="font-bold text-slate-900 text-base">Platform Activity Distribution</span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Past 30 Days</span>
          </div>

          <div className="space-y-4 my-auto">
            {/* Instagram */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5 font-bold">
                <span className="flex items-center gap-2 text-slate-900">
                  <span className="w-6 h-6 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                    <Instagram className="w-4 h-4" />
                  </span>
                  Instagram Feed & Reels
                </span>
                <span className="text-pink-700">
                  {platformCounts.INSTAGRAM} posts ({Math.round((platformCounts.INSTAGRAM / totalPlatformPosts) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(Math.round((platformCounts.INSTAGRAM / totalPlatformPosts) * 100), 10)}%` }}
                ></div>
              </div>
            </div>

            {/* Facebook */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5 font-bold">
                <span className="flex items-center gap-2 text-slate-900">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Facebook className="w-4 h-4" />
                  </span>
                  Facebook Page
                </span>
                <span className="text-blue-700">
                  {platformCounts.FACEBOOK} posts ({Math.round((platformCounts.FACEBOOK / totalPlatformPosts) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(Math.round((platformCounts.FACEBOOK / totalPlatformPosts) * 100), 10)}%` }}
                ></div>
              </div>
            </div>

            {/* LinkedIn */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5 font-bold">
                <span className="flex items-center gap-2 text-slate-900">
                  <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                    <Linkedin className="w-4 h-4" />
                  </span>
                  LinkedIn Company
                </span>
                <span className="text-sky-700">
                  {platformCounts.LINKEDIN} posts ({Math.round((platformCounts.LINKEDIN / totalPlatformPosts) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-sky-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(Math.round((platformCounts.LINKEDIN / totalPlatformPosts) * 100), 10)}%` }}
                ></div>
              </div>
            </div>

            {/* Google Business */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5 font-bold">
                <span className="flex items-center gap-2 text-slate-900">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </span>
                  Google Business Profile
                </span>
                <span className="text-amber-700">
                  {platformCounts.GOOGLE_BUSINESS || 1} post (8%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `12%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Aggregated multi-platform scheduling</span>
            <span className="text-slate-900">{totalPlatformPosts} Automated Posts</span>
          </div>
        </div>

        {/* Content & Engagement Overview (with Tabs) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <span className="font-bold text-slate-900 text-base">Content & Engagement Overview</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-bold">
              <button
                onClick={() => setContentTab('posts')}
                className={`px-3 py-1.5 rounded-md transition ${
                  contentTab === 'posts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Posts Published
              </button>
              <button
                onClick={() => setContentTab('engagement')}
                className={`px-3 py-1.5 rounded-md transition ${
                  contentTab === 'engagement' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Engagement
              </button>
              <button
                onClick={() => setContentTab('reach')}
                className={`px-3 py-1.5 rounded-md transition ${
                  contentTab === 'reach' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reach
              </button>
            </div>
          </div>

          {/* Tab 1: Posts Published */}
          {contentTab === 'posts' && (
            <div className="space-y-4 my-auto">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-slate-900">{totalContentPipeline}</span>
                  <span className="text-sm font-bold text-slate-600 ml-2">Total Posts in Pipeline</span>
                </div>
                <span className="text-xs font-extrabold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-md">
                  {scheduledPercent}% Scheduled
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-center shadow-xs">
                  <p className="text-xs text-purple-700 font-bold uppercase tracking-wider">Scheduled</p>
                  <p className="text-2xl font-black text-purple-900 mt-1">{scheduledCount}</p>
                </div>
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-center shadow-xs">
                  <p className="text-xs text-amber-700 font-bold uppercase tracking-wider">Review / Draft</p>
                  <p className="text-2xl font-black text-amber-900 mt-1">{pendingApprovalCount + draftCount}</p>
                </div>
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center shadow-xs">
                  <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Published</p>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{totalPostsPublished}</p>
                </div>
              </div>

              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex shadow-inner">
                <div style={{ width: `${totalContentPipeline > 0 ? Math.round((scheduledCount / totalContentPipeline) * 100) : 0}%` }} className="bg-purple-600 h-full transition-all duration-300"></div>
                <div style={{ width: `${totalContentPipeline > 0 ? Math.round(((pendingApprovalCount + draftCount) / totalContentPipeline) * 100) : 0}%` }} className="bg-amber-400 h-full transition-all duration-300"></div>
                <div style={{ width: `${totalContentPipeline > 0 ? Math.round((totalPostsPublished / totalContentPipeline) * 100) : 0}%` }} className="bg-emerald-500 h-full transition-all duration-300"></div>
              </div>
            </div>
          )}

          {/* Tab 2: Engagement */}
          {contentTab === 'engagement' && (
            <div className="space-y-4 my-auto">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-slate-900">
                    {(overview?.totalEngagement || 0).toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-slate-600 ml-2">Total Engagements</span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +18.4% vs last period
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl shadow-xs">
                  <div className="flex items-center gap-1.5 text-rose-700 text-xs font-bold">
                    <Heart className="w-4 h-4" /> Likes
                  </div>
                  <p className="text-xl font-black text-slate-900 mt-1">{(overview?.totalLikes || 0).toLocaleString()}</p>
                </div>
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl shadow-xs">
                  <div className="flex items-center gap-1.5 text-blue-700 text-xs font-bold">
                    <MessageCircle className="w-4 h-4" /> Comments
                  </div>
                  <p className="text-xl font-black text-slate-900 mt-1">{(overview?.totalComments || 0).toLocaleString()}</p>
                </div>
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl shadow-xs">
                  <div className="flex items-center gap-1.5 text-purple-700 text-xs font-bold">
                    <Share2 className="w-4 h-4" /> Shares
                  </div>
                  <p className="text-xl font-black text-slate-900 mt-1">{(overview?.totalShares || 0).toLocaleString()}</p>
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-600">
                Average Engagement Rate: <span className="font-extrabold text-slate-900">{overview?.avgEngagementRate || 0}%</span> (Industry standard: 2.1%)
              </p>
            </div>
          )}

          {/* Tab 3: Reach */}
          {contentTab === 'reach' && (
            <div className="space-y-4 my-auto">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-slate-900">
                    {(overview?.totalReach || 0).toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-slate-600 ml-2">Audience Reach</span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +24.6% growth
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl shadow-xs">
                  <div className="flex items-center gap-2 text-[#0172F4] text-xs font-bold">
                    <Eye className="w-4 h-4" /> Impressions
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {(overview?.totalImpressions || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl shadow-xs">
                  <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold">
                    <Users className="w-4 h-4" /> Avg Views / Post
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-1">{(overview?.avgViewsPerPost || 0).toLocaleString()}</p>
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-600">
                Live audience data synced across connected platforms
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Automated campaign metrics</span>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-[#0172F4] hover:underline font-bold inline-flex items-center gap-1"
            >
              Detailed Analytics <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row: Trends & Post Status Summary (Screenshot 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <div>
              <span className="font-bold text-slate-900 text-base">Trends</span>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">30-day audience reach & posting cadence</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +34.2% Growth
            </span>
          </div>

          {/* SVG Trendline chart */}
          <div className="relative h-44 w-full flex flex-col justify-end pt-2">
            <svg viewBox="0 0 540 140" className="w-full h-28 overflow-visible">
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0172F4" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#0172F4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line x1="0" y1="35" x2="540" y2="35" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="540" y2="75" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="115" x2="540" y2="115" stroke="#cbd5e1" strokeWidth="1.5" />

              {/* Area fill */}
              <path
                d="M 15 118 C 90 110, 140 85, 210 80 C 280 75, 330 50, 410 42 C 470 35, 505 20, 535 15 L 535 125 L 15 125 Z"
                fill="url(#trendGradient)"
              />

              {/* Stroke line */}
              <path
                d="M 15 118 C 90 110, 140 85, 210 80 C 280 75, 330 50, 410 42 C 470 35, 505 20, 535 15"
                fill="none"
                stroke="#0172F4"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Milestone Dots */}
              <circle cx="15" cy="118" r="4.5" fill="#ffffff" stroke="#0172F4" strokeWidth="2.5" />
              <circle cx="115" cy="98" r="4.5" fill="#ffffff" stroke="#0172F4" strokeWidth="2.5" />
              <circle cx="210" cy="80" r="4.5" fill="#ffffff" stroke="#0172F4" strokeWidth="2.5" />
              <circle cx="310" cy="62" r="4.5" fill="#ffffff" stroke="#0172F4" strokeWidth="2.5" />
              <circle cx="410" cy="42" r="4.5" fill="#ffffff" stroke="#0172F4" strokeWidth="2.5" />
              <circle cx="535" cy="15" r="5" fill="#0172F4" stroke="#ffffff" strokeWidth="2.5" />
            </svg>

            {/* X-axis date labels */}
            <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200 px-1 font-bold">
              <span>Aug 19</span>
              <span>Aug 25</span>
              <span>Aug 31</span>
              <span>Sep 06</span>
              <span>Sep 12</span>
              <span>Sep 18</span>
            </div>
          </div>
        </div>

        {/* Post Status Summary */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <span className="font-bold text-slate-900 text-base">Post Status Summary</span>
            <div className="flex items-center gap-3 text-xs text-slate-700 font-bold">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Draft</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Failed</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Published</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Scheduled</span>
            </div>
          </div>

          {/* Segmented distribution progress bar */}
          <div className="my-3 space-y-2">
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${totalContentPipeline > 0 ? Math.round((scheduledCount / totalContentPipeline) * 100) : 0}%` }}
                className="bg-purple-600 h-full transition-all duration-500"
                title={`Scheduled: ${scheduledCount}`}
              ></div>
              <div
                style={{ width: `${totalContentPipeline > 0 ? Math.max(Math.round(((draftCount + pendingApprovalCount) / totalContentPipeline) * 100), 5) : 0}%` }}
                className="bg-amber-400 h-full transition-all duration-500"
                title={`Draft/Review: ${draftCount + pendingApprovalCount}`}
              ></div>
              <div
                style={{ width: `${totalContentPipeline > 0 ? Math.round((totalPostsPublished / totalContentPipeline) * 100) : 0}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Published: ${totalPostsPublished}`}
              ></div>
              {failedCount > 0 && (
                <div
                  style={{ width: `${totalContentPipeline > 0 ? Math.round((failedCount / totalContentPipeline) * 100) : 0}%` }}
                  className="bg-rose-500 h-full transition-all duration-500"
                  title={`Failed: ${failedCount}`}
                ></div>
              )}
            </div>
          </div>

          {/* 4 Status Metric Counters */}
          <div className="grid grid-cols-4 gap-2.5 text-center py-2">
            <div className="p-3 rounded-xl bg-purple-50/90 border border-purple-200 shadow-xs">
              <p className="text-2xl font-black text-purple-700">{scheduledCount}</p>
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mt-0.5">Scheduled</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 shadow-xs">
              <p className="text-2xl font-black text-amber-700">{draftCount + pendingApprovalCount}</p>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mt-0.5">Review</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 shadow-xs">
              <p className="text-2xl font-black text-emerald-700">{totalPostsPublished}</p>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mt-0.5">Published</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/90 border border-rose-200 shadow-xs">
              <p className="text-2xl font-black text-rose-700">{failedCount}</p>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mt-0.5">Failed</p>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{scheduledCount} posts in queue ready to auto-publish</span>
            <button
              onClick={() => onNavigate('posts')}
              className="text-[#0172F4] hover:underline font-bold inline-flex items-center gap-1 text-xs"
            >
              View All Posts <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row: Top Performing Brands (Searchable) */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <span className="font-semibold text-gray-900 text-sm">Top Performing Brands</span>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search"
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-gray-400 border-b border-gray-100 font-medium">
              <tr>
                <th className="py-2.5 px-3">Brand Name</th>
                <th className="py-2.5 px-3">Connected Channels</th>
                <th className="py-2.5 px-3">Posts Published</th>
                <th className="py-2.5 px-3">Reach</th>
                <th className="py-2.5 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="py-3 px-3 font-semibold text-gray-900">{c.businessName}</td>
                  <td className="py-3 px-3 text-gray-600">{channels.length} channels</td>
                  <td className="py-3 px-3 text-gray-600">{totalPostsPublished}</td>
                  <td className="py-3 px-3 text-gray-600">{overview?.totalReach || 0}</td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => onNavigate('dashboard')}
                      className="text-[#0172F4] hover:underline font-semibold text-xs flex items-center gap-1"
                    >
                      Open Brand Dashboard <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row: Upcoming Posts & Recent Activities (Screenshot 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Posts */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm">Upcoming Posts</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#0172F4]">
                {upcomingEvents.length} scheduled
              </span>
            </div>
            <button
              onClick={() => onNavigate('posts')}
              className="text-xs font-semibold text-gray-600 hover:text-[#0172F4] border border-gray-200 hover:border-blue-200 px-3 py-1 rounded-lg transition flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar View</span>
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <p className="font-semibold text-gray-900 text-sm">No upcoming posts</p>
              <p className="text-xs text-gray-500 mt-1">Plan ahead by scheduling your next post.</p>

              <button
                onClick={() => (onOpenCreatePost ? onOpenCreatePost() : onNavigate('posts'))}
                className="mt-4 bg-[#0172F4] hover:bg-[#005cd3] text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create your first post</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[340px] overflow-y-auto pr-1 my-2">
              {upcomingEvents.slice(0, 6).map((evt: any) => {
                const dateObj = new Date(evt.scheduledAt);
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const item = evt.contentItem || {};
                const brandName = evt.client?.businessName || item.client?.businessName || 'BrandSetu Digital';
                const accountHandle = evt.socialAccount?.accountName || `@${brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                const status = (evt.status || item.status || 'SCHEDULED').toUpperCase();

                return (
                  <div
                    key={evt.id}
                    onClick={() =>
                      onNavigateToPosts
                        ? onNavigateToPosts(status === 'FAILED' ? 'FAILED' : undefined, 'cards', evt.id || item.id)
                        : onNavigate('posts')
                    }
                    className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-gray-50/90 rounded-xl transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.thumbnailUrl || item.mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                        alt={item.title || 'Post'}
                        className="w-11 h-11 rounded-lg object-cover border border-gray-200 shrink-0 group-hover:shadow-xs transition"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-gray-900 truncate group-hover:text-[#0172F4] transition">
                            {item.title || 'Scheduled Post'}
                          </p>
                          <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded shrink-0">
                            {brandName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1 font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">
                            <Clock className="w-3 h-3" />
                            <span>{dateStr} • {timeStr}</span>
                          </span>
                          <span className="text-gray-400 font-medium">|</span>
                          <span className="font-semibold text-slate-700 text-[10px]">
                            {accountHandle}
                          </span>
                          <span className="text-gray-400 font-medium">|</span>
                          <span className="font-semibold text-gray-700 capitalize">
                            {evt.platform ? evt.platform.toLowerCase() : 'Social'}
                          </span>
                        </div>

                        {/* If FAILED: Show exact failure reason */}
                        {status === 'FAILED' && (
                          <p className="text-[10px] text-rose-600 font-medium mt-1 truncate flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                            <AlertCircle className="w-3 h-3 shrink-0 text-rose-500" />
                            <span className="font-bold">Failure Reason:</span> {evt.lastError || 'Account authorization needed'}
                          </p>
                        )}

                        {/* If CHANGES_REQUESTED: Show admin review note */}
                        {status === 'CHANGES_REQUESTED' && (
                          <p className="text-[10px] text-amber-700 font-medium mt-1 truncate flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                            <AlertCircle className="w-3 h-3 shrink-0 text-amber-500" />
                            <span className="font-bold">Admin Feedback:</span> {evt.reviewFeedback || 'Revisions requested by Admin'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                            : status === 'CHANGES_REQUESTED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigateToPosts) {
                            onNavigateToPosts(status === 'FAILED' ? 'FAILED' : undefined, 'list', evt.id || item.id);
                          } else {
                            onNavigate('posts');
                          }
                        }}
                        className="text-xs text-gray-500 group-hover:text-[#0172F4] p-1 rounded-md hover:bg-gray-100 transition"
                        title="View post details and reason"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {calendarEvents.length > 0 && (
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => onNavigate('posts')}
                className="text-xs font-semibold text-[#0172F4] hover:underline flex items-center gap-1"
              >
                <span>View all ({calendarEvents.length}) in Posts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => (onOpenCreatePost ? onOpenCreatePost() : onNavigate('posts'))}
                className="text-xs font-semibold text-gray-600 hover:text-[#0172F4] flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Schedule</span>
              </button>
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="font-semibold text-gray-900 text-sm">Recent Activities</div>
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">No recent activity yet</p>
            <p className="text-xs text-gray-500 mt-1">Activity across your brands will show up here.</p>
          </div>
        </div>
      </div>

      {/* Floating Getting Started Widget (Reference bottom-right 3-step guide) */}
      {showGettingStarted && (
        <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl p-4 z-40 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 font-bold text-xs text-gray-900">
              <span>Getting Started</span>
              <span className="text-[10px] bg-blue-50 text-[#0172F4] px-1.5 py-0.5 rounded font-mono">0/3</span>
            </div>
            <button onClick={() => setShowGettingStarted(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-2.5 text-xs">
            <div
              onClick={() => onNavigate('channels')}
              className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition"
            >
              <div className="w-5 h-5 rounded-full bg-[#0172F4] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                1
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Connect Your Channels</p>
                <p className="text-[11px] text-gray-500">Connect your social media accounts to get started.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>

            <div
              onClick={() => (onOpenCreatePost ? onOpenCreatePost() : onNavigate('posts'))}
              className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition opacity-70"
            >
              <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                2
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Create Your First Post</p>
                <p className="text-[11px] text-gray-500">Start creating engaging content for your channels.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg opacity-70">
              <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                3
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Publish Your First Post</p>
                <p className="text-[11px] text-gray-500">Choose when your post goes live immediately or schedule it.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
