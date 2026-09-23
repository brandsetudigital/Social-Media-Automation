import React, { useState, useEffect } from 'react';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
import { PublishingLog } from '../../types';
import {
  Terminal,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const PublishingLogsView: React.FC = () => {
  const { selectedClientId } = useClients();

  const [logs, setLogs] = useState<PublishingLog[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPublishingLogs({
        clientId: selectedClientId !== 'ALL' ? selectedClientId : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedClientId, selectedStatus]);

  const handleRetry = async (scheduledPostId: string) => {
    setRetryingId(scheduledPostId);
    try {
      const res = await api.retryScheduledPost(scheduledPostId);
      setActionNotice(res.message || 'Retry executed.');
      setTimeout(() => setActionNotice(null), 4000);
      await fetchLogs();
    } catch (err: any) {
      alert(`Retry error: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-brand-400" />
            Social Platform Publishing & Failure Console
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full audit of every API call dispatch with latency, response payload, human-readable error descriptions, and idempotent 1-click retry.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 px-3.5 py-2 rounded-xl transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          Refresh Logs
        </button>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {actionNotice}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="glass-card p-3 rounded-2xl flex items-center gap-2">
        {['ALL', 'SUCCESS', 'FAILED'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedStatus === st
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {st === 'ALL' ? 'All Executions' : st === 'SUCCESS' ? 'Successful Publishes' : 'Failed Attempts'}
          </button>
        ))}
      </div>

      {/* Logs Table / List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl text-slate-500 text-xs">
          No publishing logs found.
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isSuccess = log.status === 'SUCCESS';

            return (
              <div
                key={log.id}
                className={`p-4 rounded-2xl border transition ${
                  isSuccess
                    ? 'glass-card border-slate-800/80 hover:border-slate-700'
                    : 'bg-rose-950/20 border-rose-900/60 hover:border-rose-800'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSuccess
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                      }`}
                    >
                      {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {log.client?.businessName || 'Client Business'}
                        </span>
                        <span>•</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                          {log.platform}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {log.latencyMs}ms
                        </span>
                      </div>

                      <h4 className="text-xs text-slate-300 mt-0.5 font-medium">
                        Creative: {log.scheduledPost?.contentItem?.title || 'Social Post'}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(log.executedAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {!isSuccess && log.scheduledPostId && (
                      <button
                        onClick={() => handleRetry(log.scheduledPostId)}
                        disabled={retryingId === log.scheduledPostId}
                        className="flex items-center gap-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-xl shadow-sm transition"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${retryingId === log.scheduledPostId ? 'animate-spin' : ''}`} />
                        {retryingId === log.scheduledPostId ? 'Retrying...' : 'Retry Post'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Error / Response Snippet */}
                {!isSuccess && log.errorMessage && (
                  <div className="mt-3 p-3 bg-rose-950/40 rounded-xl border border-rose-900/60 text-xs text-rose-300 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-[11px] text-rose-200">
                        Error Code: {log.errorCode || 'PLATFORM_DISPATCH_FAILURE'}
                      </span>
                      <p className="text-[11px] mt-0.5 leading-relaxed">{log.errorMessage}</p>
                    </div>
                  </div>
                )}

                {isSuccess && log.responseSummary && (
                  <div className="mt-2 text-[10px] text-slate-500 font-mono truncate">
                    API Response: {log.responseSummary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
