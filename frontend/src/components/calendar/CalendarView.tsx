import React, { useState, useEffect } from 'react';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
import { ScheduledPost } from '../../types';
import {
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  RefreshCw,
  Layers,
  Building2,
  Share2,
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { clients, selectedClientId } = useClients();

  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'list'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [isTickRunning, setIsTickRunning] = useState(false);
  const [tickMessage, setTickMessage] = useState<string | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCalendarEvents({
        clientId: selectedClientId !== 'ALL' ? selectedClientId : undefined,
        platform: selectedPlatform !== 'ALL' ? selectedPlatform : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      });
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedClientId, selectedPlatform, selectedStatus]);

  const handleRunSchedulerTick = async () => {
    setIsTickRunning(true);
    try {
      const res = await api.triggerSchedulerTick();
      setTickMessage(`Scheduler executed: ${res.processed} due post(s) dispatched to platform APIs.`);
      setTimeout(() => setTickMessage(null), 4000);
      await fetchEvents();
    } catch (err: any) {
      alert(`Scheduler error: ${err.message}`);
    } finally {
      setIsTickRunning(false);
    }
  };

  const handleQuickApprove = async (approvalRequestId?: string, contentItemId?: string) => {
    try {
      const targetId = approvalRequestId || contentItemId;
      if (!targetId) return;
      await api.approveContent(targetId);
      setTickMessage('Post approved successfully and scheduled on calendar!');
      setTimeout(() => setTickMessage(null), 4000);
      await fetchEvents();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-400" />
            Agency Multi-Client Content Calendar
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time visual schedule across all clients and platforms. Dispatches automatically according to client timezone.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunSchedulerTick}
            disabled={isTickRunning}
            className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/20 transition"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            {isTickRunning ? 'Publishing...' : 'Dispatch Due Posts Now'}
          </button>
        </div>
      </div>

      {tickMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {tickMessage}
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-semibold">Platform:</span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-white"
            >
              <option value="ALL">All Platforms</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="GOOGLE_BUSINESS">Google Business</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-white font-medium"
            >
              <option value="ALL">All Statuses (Scheduled & Approvals)</option>
              <option value="SCHEDULED">Approved & Scheduled</option>
              <option value="PENDING_APPROVAL">⏳ Awaiting Admin Approval</option>
              <option value="PUBLISHED">Published</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setCalendarView('month')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              calendarView === 'month' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Calendar Grid
          </button>
          <button
            onClick={() => setCalendarView('list')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              calendarView === 'list' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Chronological List
          </button>
        </div>
      </div>

      {/* Calendar Grid View */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl text-slate-500 text-xs">
          No scheduled events found matching this filter.
        </div>
      ) : calendarView === 'list' ? (
        /* Chronological List View */
        <div className="glass-card p-5 rounded-2xl border border-slate-800 divide-y divide-slate-800/60">
          {posts.map((p: any) => {
            const isPending = p.status === 'PENDING_APPROVAL';
            const isPublished = p.status === 'PUBLISHED';
            const isFailed = p.status === 'FAILED';

            return (
              <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={p.contentItem?.thumbnailUrl || p.contentItem?.mediaUrl}
                    alt={p.contentItem?.title}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-800 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{p.contentItem?.title}</h4>
                      {isPending && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-semibold border border-amber-500/30">
                          ⏳ Awaiting Admin Approval
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{p.client?.businessName}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span className="font-bold px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                        {p.platform}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-300">
                        {new Date(p.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                        at {new Date(p.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {isPending && (
                    <button
                      onClick={() => handleQuickApprove(p.approvalRequestId, p.contentItemId)}
                      className="text-[11px] font-bold px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve & Schedule
                    </button>
                  )}
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      isPending
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : isPublished
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isFailed
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    }`}
                  >
                    {isPending ? 'PENDING APPROVAL' : p.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Visual Calendar Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((p: any) => {
            const isPending = p.status === 'PENDING_APPROVAL';
            const isPublished = p.status === 'PUBLISHED';
            const isFailed = p.status === 'FAILED';

            return (
              <div
                key={p.id}
                className={`glass-card rounded-2xl border overflow-hidden flex flex-col justify-between transition ${
                  isPending ? 'border-amber-500/40 bg-slate-900/50' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider truncate">
                      {p.client?.businessName}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        isPending
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isPublished
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : isFailed
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-brand-500/20 text-brand-300'
                      }`}
                    >
                      {isPending ? 'AWAITING APPROVAL' : p.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={p.contentItem?.thumbnailUrl || p.contentItem?.mediaUrl}
                      alt={p.contentItem?.title}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-800 shrink-0"
                    />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white line-clamp-1">{p.contentItem?.title}</h4>
                      <span className="text-[10px] text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800/40 inline-block">
                        {p.platform}
                      </span>
                    </div>
                  </div>

                  {isPending && (
                    <div className="pt-1">
                      <button
                        onClick={() => handleQuickApprove(p.approvalRequestId, p.contentItemId)}
                        className="w-full text-[11px] font-bold py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve Post Now
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-950/60 border-t border-slate-850 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>📅 {new Date(p.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  <span>⏰ {new Date(p.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
