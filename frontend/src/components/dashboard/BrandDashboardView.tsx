import React, { useState, useEffect } from 'react';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
import {
  Inbox,
  Plus,
  Share2,
  BarChart3,
  Calendar,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Heart,
  TrendingUp,
  Percent,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  MessageCircle,
  Eye,
  Instagram,
  Facebook,
  Linkedin,
  Globe,
  Sparkles,
  Send,
  ArrowUpRight,
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';

interface BrandDashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onNavigateToPosts?: (filter?: string, viewMode?: 'calendar' | 'list', postId?: string) => void;
  onOpenCreatePost?: () => void;
  onSelectCalendarDate?: (date: Date, viewTab?: 'month' | 'week' | 'day') => void;
}

export const BrandDashboardView: React.FC<BrandDashboardViewProps> = ({
  onNavigate,
  onNavigateToPosts,
  onOpenCreatePost,
  onSelectCalendarDate,
}) => {
  const { selectedClient, selectedClientId } = useClients();
  const [overview, setOverview] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2026, 8, 18));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Month navigation calculations for Dashboard mini-calendar
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startDayOffset = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
  const prevMonthDaysCount = new Date(calYear, calMonth, 0).getDate();
  const trailingDaysCount = (7 - ((startDayOffset + daysInMonth) % 7)) % 7;

  const handlePrevMonth = () => {
    const nextD = new Date(calendarDate);
    nextD.setMonth(nextD.getMonth() - 1);
    setCalendarDate(nextD);
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    const nextD = new Date(calendarDate);
    nextD.setMonth(nextD.getMonth() + 1);
    setCalendarDate(nextD);
    setSelectedDay(null);
  };

  // Group calendar events by day of month for the active month/year
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [ovData, postData, calEvents] = await Promise.all([
          api.getAnalyticsOverview(selectedClientId !== 'ALL' ? selectedClientId : undefined).catch(() => null),
          api.getContentInbox({ clientId: selectedClientId !== 'ALL' ? selectedClientId : undefined }).catch(() => []),
          api.getCalendarEvents({ clientId: selectedClientId !== 'ALL' ? selectedClientId : undefined }).catch(() => []),
        ]);
        setOverview(ovData);
        setPosts(postData);
        setCalendarEvents(calEvents || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedClientId]);

  // Group calendar events by day of month (active calendar month)
  const eventsByDay = React.useMemo(() => {
    const map: Record<number, any[]> = {};
    calendarEvents.forEach((evt) => {
      if (!evt.scheduledAt) return;
      const d = new Date(evt.scheduledAt);
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const dayNum = d.getDate();
        if (!map[dayNum]) map[dayNum] = [];
        map[dayNum].push(evt);
      }
    });
    return map;
  }, [calendarEvents, calYear, calMonth]);

  // Scheduled / upcoming posts to display in the card
  const upcomingEvents = React.useMemo(() => {
    if (selectedDay !== null) {
      return eventsByDay[selectedDay] || [];
    }
    // Filter events in current active month or sort all events
    const currentMonthEvents = calendarEvents.filter((evt) => {
      if (!evt.scheduledAt) return false;
      const d = new Date(evt.scheduledAt);
      return d.getFullYear() === calYear && d.getMonth() === calMonth;
    });
    if (currentMonthEvents.length > 0) {
      return [...currentMonthEvents].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    }
    // Fallback: all scheduled events sorted chronologically
    return [...calendarEvents].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }, [selectedDay, eventsByDay, calendarEvents, calYear, calMonth]);

  // Derived counts
  const scheduledCount = overview?.scheduledCount ?? (calendarEvents.filter((e) => e.status === 'SCHEDULED').length || calendarEvents.length || 0);
  const publishedCount = overview?.publishedCount || 0;
  const draftCount = overview?.draftCount || 0;
  const totalPostsPipeline = scheduledCount + publishedCount + draftCount;

  const changesRequestedPosts = calendarEvents.filter(
    (e) => e.status === 'CHANGES_REQUESTED' || e.status === 'REJECTED'
  );
  const changesRequestedCount = overview?.changesRequestedCount ?? changesRequestedPosts.length;

  // Platform distribution for this brand
  const platformCounts: Record<string, number> = {
    INSTAGRAM: 0,
    FACEBOOK: 0,
    LINKEDIN: 0,
    GOOGLE_BUSINESS: 0,
  };

  calendarEvents.forEach((ev: any) => {
    const p = (ev.platform || 'INSTAGRAM').toUpperCase();
    if (platformCounts[p] !== undefined) {
      platformCounts[p] += 1;
    } else {
      platformCounts['INSTAGRAM'] += 1;
    }
  });

  const totalPlatformPosts = Object.values(platformCounts).reduce((a, b) => a + b, 0) || 1;

  // Sample active conversations for unified inbox preview
  const sampleConversations = [
    {
      id: 'conv-1',
      name: 'Aarav Patel',
      handle: '@aarav.design',
      platform: 'INSTAGRAM',
      message: 'Interested in the commercial marketing package. What is the onboarding timeframe?',
      time: '12m ago',
      unread: true,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 'conv-2',
      name: 'Pooja Verma',
      handle: 'Pooja V.',
      platform: 'FACEBOOK',
      message: 'Great offer campaign! Can you send across the detailed service brochure?',
      time: '45m ago',
      unread: true,
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 'conv-3',
      name: 'Vikram Joshi',
      handle: 'Google 5★',
      platform: 'GOOGLE_BUSINESS',
      message: 'Superb social media agency! Doubled our lead generation in 3 weeks.',
      time: '3h ago',
      unread: false,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Brand Header / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {selectedClient?.businessName || 'BrandSetu Digital'} Dashboard
          </h2>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Real-time social media performance and publishing control for {selectedClient?.businessName || 'all brands'}.
          </p>
        </div>

        <button
          onClick={() => (onOpenCreatePost ? onOpenCreatePost() : onNavigate('posts'))}
          className="bg-[#0172F4] hover:bg-[#005cd3] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md shadow-blue-500/25"
        >
          <Plus className="w-4 h-4" />
          <span>Create Post</span>
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
                  Admin ne is brand ke posts me changes / feedback likhe hain. Reason check karke edit karein.
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
              const brandName = evt.client?.businessName || item.client?.businessName || selectedClient?.businessName || 'BrandSetu Client';
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

      {/* Row 1: Inbox Widget & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inbox Widget */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">Unified Inbox</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                2 New Messages
              </span>
            </div>
            <button
              onClick={() => onNavigate('inbox')}
              className="text-xs font-bold text-[#0172F4] hover:underline flex items-center gap-1 transition"
            >
              <span>Open Full Inbox</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Conversation Feed */}
          <div className="divide-y divide-slate-100 my-2 space-y-1">
            {sampleConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onNavigate('inbox')}
                className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={conv.avatar}
                      alt={conv.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs">
                      {conv.platform === 'INSTAGRAM' && <Instagram className="w-3 h-3 text-pink-600" />}
                      {conv.platform === 'FACEBOOK' && <Facebook className="w-3 h-3 text-blue-600" />}
                      {conv.platform === 'GOOGLE_BUSINESS' && <Globe className="w-3 h-3 text-amber-600" />}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">{conv.name}</p>
                      {conv.unread && (
                        <span className="w-2 h-2 rounded-full bg-[#0172F4]"></span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600 truncate mt-0.5 max-w-xs sm:max-w-sm">
                      {conv.message}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-slate-500">{conv.time}</span>
                  <button className="text-xs font-bold text-[#0172F4] hover:underline block mt-1">
                    Reply
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>3 channel inboxes listening (IG, FB, Google)</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live sync active
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>Quick Actions</span>
            </div>
            <span className="text-xs font-bold text-slate-500">Fast Operations</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-auto">
            {/* Create Post */}
            <button
              onClick={() => (onOpenCreatePost ? onOpenCreatePost() : onNavigate('posts'))}
              className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 flex flex-col items-center justify-center gap-2.5 transition group text-center shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0172F4] flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-[#0172F4]">Create Post</span>
            </button>

            {/* Connect Channel */}
            <button
              onClick={() => onNavigate('channels')}
              className="p-4 rounded-xl border border-slate-200 hover:border-pink-400 hover:bg-pink-50/40 flex flex-col items-center justify-center gap-2.5 transition group text-center shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-pink-700">Connect Channel</span>
            </button>

            {/* View Analytics */}
            <button
              onClick={() => onNavigate('analytics')}
              className="p-4 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 flex flex-col items-center justify-center gap-2.5 transition group text-center shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-purple-700">View Analytics</span>
            </button>

            {/* Open Calendar */}
            <button
              onClick={() => onNavigate('posts')}
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 flex flex-col items-center justify-center gap-2.5 transition group text-center shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">Open Calendar</span>
            </button>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Client publishing shortcuts</span>
            <span className="text-[#0172F4] font-bold">1-Click Trigger</span>
          </div>
        </div>
      </div>

      {/* Row 2: Upcoming Posts & Content Calendar Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Posts */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">Upcoming Posts</span>
              {selectedDay !== null && (
                <span className="text-xs font-bold bg-blue-50 text-[#0172F4] px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-blue-200">
                  <span>{calendarDate.toLocaleDateString('en-US', { month: 'short' })} {selectedDay}</span>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-slate-500 hover:text-slate-900 font-bold ml-1"
                    title="Clear filter"
                  >
                    ×
                  </button>
                </span>
              )}
              <span className="text-sm font-bold text-slate-500">
                ({upcomingEvents.length})
              </span>
            </div>

            <button
              onClick={() => {
                if (onSelectCalendarDate) {
                  onSelectCalendarDate(new Date(calYear, calMonth, selectedDay || 18), 'month');
                } else {
                  onNavigate('posts');
                }
              }}
              className="text-xs font-semibold text-gray-700 hover:text-[#0172F4] border border-gray-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-xs bg-white"
            >
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span>Calendar View</span>
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-900 text-base">
                {selectedDay ? `No posts scheduled for Sep ${selectedDay}` : 'No scheduled posts'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {selectedDay ? 'Schedule a post on this day to see it here.' : 'Plan ahead by scheduling your first post for this brand.'}
              </p>

              <button
                onClick={() => (onOpenCreatePost ? onOpenCreatePost() : onNavigate('posts'))}
                className="mt-4 bg-[#0172F4] hover:bg-[#005cd3] text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create your first post</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1 my-2">
              {upcomingEvents.map((evt) => {
                const dateObj = new Date(evt.scheduledAt);
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const item = evt.contentItem || {};
                const brandName = evt.client?.businessName || item.client?.businessName || selectedClient?.businessName || 'BrandSetu Digital';
                const accountHandle = evt.socialAccount?.accountName || `@${brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                const status = (evt.status || item.status || 'SCHEDULED').toUpperCase();

                return (
                  <div
                    key={evt.id}
                    onClick={() =>
                      onNavigateToPosts
                        ? onNavigateToPosts(status === 'FAILED' ? 'FAILED' : undefined, 'list', evt.id || item.id)
                        : onNavigate('posts')
                    }
                    className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/90 rounded-xl transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={item.thumbnailUrl || item.mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                        alt={item.title || 'Post'}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs group-hover:scale-105 transition"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate group-hover:text-[#0172F4] transition">
                            {item.title || 'Social Campaign Post'}
                          </p>
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                            {brandName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs font-semibold text-slate-600">
                          <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md text-[11px] font-bold border border-purple-100">
                            <Clock className="w-3 h-3" />
                            <span>{dateStr} • {timeStr}</span>
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="font-semibold text-slate-700 text-[11px]">
                            {accountHandle}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="font-bold text-slate-700 capitalize flex items-center gap-1">
                            {evt.platform === 'INSTAGRAM' && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                            {evt.platform === 'FACEBOOK' && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                            {evt.platform === 'LINKEDIN' && <Linkedin className="w-3.5 h-3.5 text-sky-700" />}
                            {evt.platform ? evt.platform.toLowerCase() : 'social'}
                          </span>
                        </div>

                        {/* If FAILED: Show exact reason why publishing failed */}
                        {status === 'FAILED' && (
                          <p className="text-xs text-rose-600 font-medium mt-1.5 truncate flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                            <span className="font-bold">Failure Reason:</span> {evt.lastError || 'Connected account reauthorization required'}
                          </p>
                        )}

                        {/* If CHANGES_REQUESTED: Show admin review note */}
                        {status === 'CHANGES_REQUESTED' && (
                          <p className="text-xs text-amber-700 font-medium mt-1.5 truncate flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                            <span className="font-bold">Admin Feedback:</span> {evt.reviewFeedback || 'Revision requested by Admin'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {status === 'SCHEDULED' && (
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 shadow-xs">
                          <Clock className="w-3 h-3" /> SCHEDULED
                        </span>
                      )}
                      {status === 'PUBLISHED' && (
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-3 h-3" /> PUBLISHED
                        </span>
                      )}
                      {status === 'FAILED' && (
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shadow-xs animate-pulse">
                          <AlertCircle className="w-3 h-3" /> FAILED
                        </span>
                      )}
                      {(status === 'DRAFT' || status === 'READY_FOR_APPROVAL') && (
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 shadow-xs">
                          PENDING APPROVAL
                        </span>
                      )}
                      {status === 'CHANGES_REQUESTED' && (
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 shadow-xs">
                          CHANGES REQUESTED
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigateToPosts) {
                            onNavigateToPosts(status === 'FAILED' ? 'FAILED' : undefined, 'list', evt.id || item.id);
                          } else {
                            onNavigate('posts');
                          }
                        }}
                        className="text-slate-400 group-hover:text-[#0172F4] p-1.5 rounded-lg hover:bg-slate-100 transition"
                        title="View post details and error reason"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
            <button
              onClick={() => (onNavigateToPosts ? onNavigateToPosts('SCHEDULED', 'list') : onNavigate('posts'))}
              className="text-[#0172F4] hover:underline font-bold flex items-center gap-1"
            >
              <span>View all scheduled posts</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => (onOpenCreatePost ? onOpenCreatePost() : onNavigate('posts'))}
              className="text-slate-700 hover:text-[#0172F4] font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule New</span>
            </button>
          </div>
        </div>

        {/* Content Calendar Widget (Interactive Mini Calendar with Month Navigation) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">Content Calendar</span>
              {selectedDay !== null && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-xs text-[#0172F4] hover:underline font-bold"
                >
                  Show all
                </button>
              )}
            </div>

            {/* Month Navigator Controls (< September 2026 >) */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-0.5 rounded-lg shadow-2xs">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition shadow-2xs cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-xs sm:text-sm font-extrabold text-slate-800 px-2 min-w-[120px] text-center select-none">
                {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>

              <button
                onClick={handleNextMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition shadow-2xs cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1 font-bold text-slate-500 text-xs">
                {d}
              </div>
            ))}

            {/* Offset days from previous month */}
            {Array.from({ length: startDayOffset }).map((_, i) => (
              <div key={`offset-${i}`} className="py-2 text-slate-300 text-xs font-medium select-none">
                {prevMonthDaysCount - startDayOffset + i + 1}
              </div>
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = calYear === 2026 && calMonth === 8 && day === 18;
              const isSelected = selectedDay === day;
              const dayEvents = eventsByDay[day] || [];
              const hasEvents = dayEvents.length > 0;

              const hasScheduled = dayEvents.some((e: any) => (e.status || '').toUpperCase() === 'SCHEDULED');
              const hasPublished = dayEvents.some((e: any) => (e.status || '').toUpperCase() === 'PUBLISHED');
              const hasChangesRequested = dayEvents.some((e: any) => (e.status || '').toUpperCase() === 'CHANGES_REQUESTED' || (e.status || '').toUpperCase() === 'REJECTED');
              const hasFailed = dayEvents.some((e: any) => (e.status || '').toUpperCase() === 'FAILED');
              const hasDraft = dayEvents.some((e: any) => (e.status || '').toUpperCase() === 'DRAFT' || (e.status || '').toUpperCase() === 'READY_FOR_APPROVAL');

              return (
                <div
                  key={day}
                  onClick={() => {
                    setSelectedDay(selectedDay === day ? null : day);
                  }}
                  onDoubleClick={() => {
                    if (onSelectCalendarDate) {
                      onSelectCalendarDate(new Date(calYear, calMonth, day), 'month');
                    }
                    onNavigate('posts');
                  }}
                  title={
                    hasEvents
                      ? `${dayEvents.length} post(s) on ${calendarDate.toLocaleDateString('en-US', { month: 'short' })} ${day}. Click to filter, double-click to open in Posts.`
                      : `${calendarDate.toLocaleDateString('en-US', { month: 'short' })} ${day}, ${calYear}`
                  }
                  className={`py-2 rounded-lg text-sm font-semibold relative transition cursor-pointer hover:bg-blue-50/60 ${
                    isToday
                      ? 'border border-amber-300 bg-amber-50/70 text-amber-950 font-bold shadow-xs'
                      : isSelected
                      ? 'bg-blue-100 text-[#0172F4] font-black ring-2 ring-[#0172F4]'
                      : hasEvents
                      ? 'font-bold text-slate-900 bg-slate-50 hover:bg-blue-50'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {day}

                  {/* Dynamic Status Dots */}
                  {hasEvents && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1">
                      {hasScheduled && <span className="w-1.5 h-1.5 rounded-full bg-purple-600" title="Scheduled"></span>}
                      {hasPublished && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" title="Published"></span>}
                      {hasChangesRequested && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Changes Requested"></span>}
                      {hasFailed && <span className="w-1.5 h-1.5 rounded-full bg-rose-600" title="Failed"></span>}
                      {hasDraft && !hasScheduled && !hasPublished && !hasChangesRequested && !hasFailed && (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" title="Draft"></span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Trailing days for next month */}
            {Array.from({ length: trailingDaysCount }).map((_, i) => (
              <div key={`next-month-${i}`} className="py-2 text-slate-300 text-sm font-medium select-none">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Calendar Legend matching Screenshot 1 */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500"></span> Draft</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#7C3AED]"></span> Scheduled</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span> Partial</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10B981]"></span> Published</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]"></span> Failed</span>
          </div>
        </div>
      </div>

      {/* Row 3: Mini stats stack + Engagement Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Stack */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700">Total Engagements</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{(overview?.totalEngagement || 4210).toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
              <Heart className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700">Total Reach</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{(overview?.totalReach || 18450).toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0172F4] flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700">Average Engagement Rate</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{overview?.avgEngagementRate || 4.8}%</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs">
              <Percent className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Engagement Over Time */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <span className="font-bold text-slate-900 text-base">Engagement Over Time</span>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">Likes, comments & shares trajectory</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +24.8% Engagement Growth
            </span>
          </div>

          <div className="relative h-44 w-full flex flex-col justify-end pt-2 my-auto">
            <svg viewBox="0 0 540 140" className="w-full h-28 overflow-visible">
              <defs>
                <linearGradient id="brandEngGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line x1="0" y1="35" x2="540" y2="35" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="540" y2="75" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="115" x2="540" y2="115" stroke="#cbd5e1" strokeWidth="1.5" />

              <path
                d="M 15 110 C 80 100, 150 70, 230 75 C 310 80, 370 45, 450 35 C 490 30, 515 15, 535 12 L 535 125 L 15 125 Z"
                fill="url(#brandEngGradient)"
              />

              <path
                d="M 15 110 C 80 100, 150 70, 230 75 C 310 80, 370 45, 450 35 C 490 30, 515 15, 535 12"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="3"
                strokeLinecap="round"
              />

              <circle cx="15" cy="110" r="4.5" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2.5" />
              <circle cx="150" cy="70" r="4.5" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2.5" />
              <circle cx="300" cy="77" r="4.5" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2.5" />
              <circle cx="450" cy="35" r="4.5" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2.5" />
              <circle cx="535" cy="12" r="5" fill="#8b5cf6" stroke="#ffffff" strokeWidth="2.5" />
            </svg>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200 px-1 font-bold">
              <span>Aug 19</span>
              <span>Aug 25</span>
              <span>Aug 31</span>
              <span>Sep 06</span>
              <span>Sep 12</span>
              <span>Sep 18</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Aggregated interaction benchmark</span>
            <button onClick={() => onNavigate('analytics')} className="text-[#0172F4] hover:underline font-bold">
              Full Analytics Report →
            </button>
          </div>
        </div>
      </div>

      {/* Row 4: Reach Over Time & Post Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reach Over Time */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <div>
              <span className="font-bold text-slate-900 text-base">Reach Over Time</span>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">Audience impressions across networks</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +31.5% Reach Surge
            </span>
          </div>

          <div className="relative h-44 w-full flex flex-col justify-end pt-2 my-auto">
            <svg viewBox="0 0 540 140" className="w-full h-28 overflow-visible">
              <defs>
                <linearGradient id="brandReachGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0172F4" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#0172F4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line x1="0" y1="35" x2="540" y2="35" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="540" y2="75" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="115" x2="540" y2="115" stroke="#cbd5e1" strokeWidth="1.5" />

              <path
                d="M 15 118 C 90 110, 140 85, 210 80 C 280 75, 330 50, 410 42 C 470 35, 505 20, 535 15 L 535 125 L 15 125 Z"
                fill="url(#brandReachGradient)"
              />

              <path
                d="M 15 118 C 90 110, 140 85, 210 80 C 280 75, 330 50, 410 42 C 470 35, 505 20, 535 15"
                fill="none"
                stroke="#0172F4"
                strokeWidth="3"
                strokeLinecap="round"
              />

              <circle cx="15" cy="118" r="4.5" fill="#ffffff" stroke="#0172F4" strokeWidth="2.5" />
              <circle cx="115" cy="98" r="4.5" fill="#ffffff" stroke="#0172F4" strokeWidth="2.5" />
              <circle cx="210" cy="80" r="4.5" fill="#ffffff" stroke="#0172F4" strokeWidth="2.5" />
              <circle cx="310" cy="62" r="4.5" fill="#ffffff" stroke="#0172F4" strokeWidth="2.5" />
              <circle cx="410" cy="42" r="4.5" fill="#ffffff" stroke="#0172F4" strokeWidth="2.5" />
              <circle cx="535" cy="15" r="5" fill="#0172F4" stroke="#ffffff" strokeWidth="2.5" />
            </svg>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200 px-1 font-bold">
              <span>Aug 19</span>
              <span>Aug 25</span>
              <span>Aug 31</span>
              <span>Sep 06</span>
              <span>Sep 12</span>
              <span>Sep 18</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{(overview?.totalImpressions || 34200).toLocaleString()} Total Impressions</span>
            <span className="text-slate-800 font-bold">Updated live</span>
          </div>
        </div>

        {/* Post Status */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <span className="font-bold text-slate-900 text-base">Post Status Pipeline</span>
            <div className="flex items-center gap-3 text-xs text-slate-700 font-bold">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Scheduled</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Published</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Draft</span>
            </div>
          </div>

          {/* Segmented distribution progress bar */}
          <div className="my-3 space-y-2">
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${Math.round((scheduledCount / totalPostsPipeline) * 100)}%` }}
                className="bg-purple-600 h-full transition-all duration-500"
              ></div>
              <div
                style={{ width: `${Math.round((publishedCount / totalPostsPipeline) * 100)}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
              ></div>
              <div
                style={{ width: `${Math.max(Math.round((draftCount / totalPostsPipeline) * 100), 8)}%` }}
                className="bg-amber-400 h-full transition-all duration-500"
              ></div>
            </div>
          </div>

          {/* 4 Status Metric Counters */}
          <div className="grid grid-cols-3 gap-3 text-center py-2">
            <div className="p-3 rounded-xl bg-purple-50/90 border border-purple-200 shadow-xs">
              <p className="text-2xl font-black text-purple-700">{scheduledCount}</p>
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mt-0.5">Scheduled</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 shadow-xs">
              <p className="text-2xl font-black text-emerald-700">{publishedCount}</p>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mt-0.5">Published</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 shadow-xs">
              <p className="text-2xl font-black text-amber-700">{draftCount}</p>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mt-0.5">Draft / Review</p>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{scheduledCount} posts in queue ready to auto-publish</span>
            <button
              onClick={() => onNavigate('posts')}
              className="text-[#0172F4] hover:underline font-bold inline-flex items-center gap-1 text-xs"
            >
              Manage Posts <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row 5: Most Used Social Media & Posts Published by Platform */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Used Social Media */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-base">Connected Platforms</span>
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
                <p className="text-xs font-bold text-pink-700 mt-0.5">{platformCounts.INSTAGRAM} posts</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/50 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                <Facebook className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900 truncate">Facebook</p>
                <p className="text-xs font-bold text-blue-700 mt-0.5">{platformCounts.FACEBOOK} posts</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-sky-200/80 bg-sky-50/50 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 shadow-xs">
                <Linkedin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900 truncate">LinkedIn</p>
                <p className="text-xs font-bold text-sky-700 mt-0.5">{platformCounts.LINKEDIN} posts</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-semibold text-slate-600">
            <span>Managed through BrandSetu Automation Engine</span>
            <button
              onClick={() => onNavigate('channels')}
              className="text-[#0172F4] hover:underline font-bold inline-flex items-center gap-1 text-xs"
            >
              Channel Settings <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Posts Published by Platform */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <span className="font-bold text-slate-900 text-base">Posts by Platform Distribution</span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">All-Time</span>
          </div>

          <div className="space-y-4 my-auto">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5 font-bold">
                <span className="flex items-center gap-2 text-slate-900">
                  <span className="w-6 h-6 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                    <Instagram className="w-4 h-4" />
                  </span>
                  Instagram
                </span>
                <span className="text-pink-700">
                  {platformCounts.INSTAGRAM} posts ({Math.round((platformCounts.INSTAGRAM / totalPlatformPosts) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"
                  style={{ width: `${Math.round((platformCounts.INSTAGRAM / totalPlatformPosts) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1.5 font-bold">
                <span className="flex items-center gap-2 text-slate-900">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Facebook className="w-4 h-4" />
                  </span>
                  Facebook
                </span>
                <span className="text-blue-700">
                  {platformCounts.FACEBOOK} posts ({Math.round((platformCounts.FACEBOOK / totalPlatformPosts) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${Math.round((platformCounts.FACEBOOK / totalPlatformPosts) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1.5 font-bold">
                <span className="flex items-center gap-2 text-slate-900">
                  <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                    <Linkedin className="w-4 h-4" />
                  </span>
                  LinkedIn
                </span>
                <span className="text-sky-700">
                  {platformCounts.LINKEDIN} posts ({Math.round((platformCounts.LINKEDIN / totalPlatformPosts) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-sky-600 rounded-full"
                  style={{ width: `${Math.round((platformCounts.LINKEDIN / totalPlatformPosts) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Total posts scheduled across networks</span>
            <span className="text-slate-900">{totalPlatformPosts} Posts</span>
          </div>
        </div>
      </div>
    </div>
  );
};
