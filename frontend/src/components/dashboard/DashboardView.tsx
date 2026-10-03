import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
import { ClientBufferHealth, ScheduledPost, ContentItem } from '../../types';
import {
  Users,
  Share2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HardDrive,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  RefreshCw,
  PlayCircle,
  ExternalLink,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { role } = useAuth();
  const { selectedClientId, clients } = useClients();

  const [overview, setOverview] = useState<any>(null);
  const [buffers, setBuffers] = useState<ClientBufferHealth[]>([]);
  const [upcomingPosts, setUpcomingPosts] = useState<ScheduledPost[]>([]);
  const [inboxItems, setInboxItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const cId = selectedClientId !== 'ALL' ? selectedClientId : undefined;
      const [ov, buf, posts, inbox] = await Promise.all([
        api.getAnalyticsOverview(cId),
        api.getBufferHealth(cId),
        api.getCalendarEvents({ clientId: cId }),
        api.getContentInbox({ clientId: cId, status: 'NEW' }),
      ]);

      setOverview(ov);
      const now = new Date();
      const futurePosts = (posts || [])
        .filter((p: any) => p.scheduledAt && new Date(p.scheduledAt).getTime() >= now.getTime() && (p.status || '').toUpperCase() !== 'PUBLISHED')
        .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      setUpcomingPosts(futurePosts.slice(0, 5));
      setInboxItems(inbox.slice(0, 4));
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClientId]);

  if (isLoading && !overview) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    );
  }

  const criticalBuffers = buffers.filter((b) => b.overallStatus === 'CRITICAL');
  const lowBuffers = buffers.filter((b) => b.overallStatus === 'LOW');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-brand-600/10 via-indigo-600/5 to-transparent pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 uppercase tracking-wider">
            <span>BrandSetu Digital Operations</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1 flex items-center gap-2.5">
            {role === 'ADMIN' ? 'Agency Executive Command' : 'SMM Operational Hub'}
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300">
              ⚡ Live Platform
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Centralized multi-client management: Google Drive asset intake, brand-tailored AI content, custom recurring rules, 10-day buffer protection, and multi-platform publishing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('drive')}
            className="flex items-center gap-2 text-xs font-semibold bg-slate-900 hover:bg-slate-850 border border-slate-750 text-slate-200 px-4 py-2 rounded-xl transition shadow-sm"
          >
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            Drive Simulator
          </button>
          <button
            onClick={() => onNavigate('inbox')}
            className="flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 hover:opacity-95 text-white px-4 py-2 rounded-xl shadow-lg shadow-purple-500/25 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Review Content Inbox
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="glass-card glass-card-hover p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Clients</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{overview?.clientsCount ?? clients.length}</p>
          <span className="text-[10px] text-slate-400">Business Entities</span>
        </div>

        <div className="glass-card glass-card-hover p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Accounts</span>
            <Share2 className="w-4 h-4 text-fuchsia-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{overview?.accountsCount ?? 7}</p>
          <span className="text-[10px] text-emerald-400 font-medium">FB • IG • GBP</span>
        </div>

        <div className="glass-card glass-card-hover p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{overview?.pendingApprovalCount ?? 1}</p>
          <span className="text-[10px] text-slate-400">Admin Gate</span>
        </div>

        <div className="glass-card glass-card-hover p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Scheduled</span>
            <Calendar className="w-4 h-4 text-pink-400" />
          </div>
          <p className="text-2xl font-black text-pink-300 mt-2">{upcomingPosts.length}</p>
          <span className="text-[10px] text-slate-400">In Calendar</span>
        </div>

        <div className="glass-card glass-card-hover p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{overview?.publishedCount ?? 1}</p>
          <span className="text-[10px] text-slate-400">Success: {overview?.successRate ?? 100}%</span>
        </div>

        <div className="glass-card glass-card-hover p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Publish Failures</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-2">{overview?.failedCount ?? 0}</p>
          <span className="text-[10px] text-slate-400">Requires SMM review</span>
        </div>
      </div>

      {/* 10-Day Advance Content Buffer Section */}
      <div className="glass-card p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                10-Day Advance Content Buffer Guard
                {(criticalBuffers.length > 0 || lowBuffers.length > 0) && (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {criticalBuffers.length + lowBuffers.length} Buffer Alerts
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Live calculated coverage of approved queue items against active posting schedules.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('queues')}
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 self-start sm:self-auto"
          >
            Manage Content Queues
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Client Buffer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {buffers.map((buf) => {
            const isCritical = buf.overallStatus === 'CRITICAL';
            const isLow = buf.overallStatus === 'LOW';

            return (
              <div
                key={buf.clientId}
                className={`p-4 rounded-xl border transition ${
                  isCritical
                    ? 'bg-rose-950/20 border-rose-800/60'
                    : isLow
                    ? 'bg-amber-950/20 border-amber-800/60'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white truncate">{buf.clientName}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : isLow
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {buf.overallStatus} ({buf.requiredDays}d Goal)
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Posts ({buf.metrics.posts.ready} ready)</span>
                      <span className={buf.metrics.posts.status === 'GOOD' ? 'text-emerald-400' : 'text-amber-400'}>
                        {buf.metrics.posts.daysCovered} Days Covered
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          buf.metrics.posts.status === 'GOOD' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, (buf.metrics.posts.daysCovered / buf.requiredDays) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Stories ({buf.metrics.stories.ready} ready)</span>
                      <span className={buf.metrics.stories.status === 'GOOD' ? 'text-emerald-400' : 'text-amber-400'}>
                        {buf.metrics.stories.daysCovered} Days Covered
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          buf.metrics.stories.status === 'GOOD' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, (buf.metrics.stories.daysCovered / buf.requiredDays) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Reels ({buf.metrics.reels.ready} ready)</span>
                      <span className={buf.metrics.reels.status === 'GOOD' ? 'text-emerald-400' : 'text-rose-400'}>
                        {buf.metrics.reels.daysCovered} Days Covered
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          buf.metrics.reels.status === 'GOOD' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, (buf.metrics.reels.daysCovered / buf.requiredDays) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {buf.warnings.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-amber-300/90 leading-tight">
                    {buf.warnings[0]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom 2-Column Split: Upcoming Publishing & Recent Drive Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Posts */}
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-bold text-white">Upcoming Publishing Queue</h3>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
            >
              Full Calendar <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {upcomingPosts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No scheduled posts yet.</div>
            ) : (
              upcomingPosts.map((post) => (
                <div key={post.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.contentItem?.thumbnailUrl || post.contentItem?.mediaUrl}
                      alt="Creative"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-800 shrink-0"
                    />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">
                        {post.contentItem?.title}
                      </h4>
                      <p className="text-[11px] text-slate-400">{post.client?.businessName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">
                          {post.platform}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      (post as any).status === 'PENDING_APPROVAL'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                        : 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    }`}
                  >
                    {(post as any).status === 'PENDING_APPROVAL' ? '⏳ AWAITING APPROVAL' : post.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Drive Intake */}
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Recent Google Drive Intake</h3>
            </div>
            <button
              onClick={() => onNavigate('inbox')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              Content Inbox <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {inboxItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No new Drive files pending review.</div>
            ) : (
              inboxItems.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.thumbnailUrl || item.mediaUrl}
                      alt="Drive creative"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-800 shrink-0"
                    />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">{item.title}</h4>
                      <p className="text-[11px] text-slate-400">{item.client?.businessName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                          {item.contentType}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Source: Google Drive Final
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('inbox')}
                    className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition"
                  >
                    Review
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
