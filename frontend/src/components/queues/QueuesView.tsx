import React, { useState, useEffect } from 'react';
import { useClients } from '../../context/ClientContext';
import { api, getPostImageUrl } from '../../api';
import {
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  FileImage,
  Video,
  Play,
  Building2,
} from 'lucide-react';

export const QueuesView: React.FC = () => {
  const { clients, selectedClientId } = useClients();

  const [activeClientId, setActiveClientId] = useState(
    selectedClientId !== 'ALL' ? selectedClientId : (clients[0]?.id || '')
  );
  const [queueData, setQueueData] = useState<any>(null);
  const [activeQueueTab, setActiveQueueTab] = useState<'posts' | 'reels' | 'stories' | 'gbp'>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [isDraining, setIsDraining] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (selectedClientId !== 'ALL') {
      setActiveClientId(selectedClientId);
    } else if (clients.length > 0 && !activeClientId) {
      setActiveClientId(clients[0].id);
    }
  }, [selectedClientId, clients]);

  const fetchQueues = async () => {
    if (!activeClientId) return;
    setIsLoading(true);
    try {
      const data = await api.getClientQueues(activeClientId);
      setQueueData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, [activeClientId]);

  const handleDrainQueue = async () => {
    if (!activeClientId) return;
    setIsDraining(true);
    try {
      const rules = await api.getRules(activeClientId);
      if (rules.length === 0) {
        alert('No active recurring rule found for this client. Please create a rule in the Rule Builder first.');
        return;
      }
      const res = await api.fillQueueFromRule(rules[0].id);
      setActionSuccess(res.message);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchQueues();
    } catch (err: any) {
      alert(`Error draining queue: ${err.message}`);
    } finally {
      setIsDraining(false);
    }
  };

  const currentQueueList = queueData?.queues?.[activeQueueTab] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Client Content Automation Queues
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Separated queues for Posts, Reels, Stories, and Google Business Profile. Only approved content resides here.
          </p>
        </div>

        <button
          onClick={handleDrainQueue}
          disabled={isDraining}
          className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-brand-600 to-cyan-600 hover:opacity-95 text-white px-4 py-2 rounded-xl shadow-lg shadow-brand-500/20 transition self-start sm:self-auto"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          {isDraining ? 'Filling Slots...' : 'Drain Queue into Schedule Slots'}
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* Target Client Bar */}
      <div className="glass-card p-4 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Client:</span>
          <select
            value={activeClientId}
            onChange={(e) => setActiveClientId(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-white rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-brand-500"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName} ({c.location.split(',')[0]})
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Total Ready in Queue: <strong className="text-cyan-400">{queueData?.counts?.total || 0} items</strong>
        </span>
      </div>

      {/* Queue Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'posts', label: 'POST QUEUE', count: queueData?.counts?.posts || 0, color: 'text-brand-300', bg: 'bg-brand-500/10' },
          { id: 'reels', label: 'REEL QUEUE', count: queueData?.counts?.reels || 0, color: 'text-indigo-300', bg: 'bg-indigo-500/10' },
          { id: 'stories', label: 'STORY QUEUE', count: queueData?.counts?.stories || 0, color: 'text-cyan-300', bg: 'bg-cyan-500/10' },
          { id: 'gbp', label: 'GOOGLE BUSINESS QUEUE', count: queueData?.counts?.gbp || 0, color: 'text-emerald-300', bg: 'bg-emerald-500/10' },
        ].map((tab) => {
          const isActive = activeQueueTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveQueueTab(tab.id as any)}
              className={`p-4 rounded-xl border text-left transition flex items-center justify-between ${
                isActive
                  ? 'bg-slate-900 border-brand-500/60 shadow-md'
                  : 'glass-card border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <span className="text-[10px] font-bold text-slate-400 block tracking-wider">{tab.label}</span>
                <span className={`text-2xl font-black mt-1 block ${tab.color}`}>{tab.count}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${tab.bg} ${tab.color} font-bold`}>
                Ready
              </span>
            </button>
          );
        })}
      </div>

      {/* Current Queue Items List */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {activeQueueTab.toUpperCase()} QUEUE ITEMS (FIFO PRIORITY)
          </h3>
          <span className="text-xs text-slate-400">
            Next eligible item will populate the next matching rule slot.
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : currentQueueList.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-1">
            <p className="text-slate-300 font-semibold">Queue is currently empty</p>
            <p>Approve more {activeQueueTab} from Content Inbox to replenish this queue.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentQueueList.map((q: any, idx: number) => {
              const item = q.contentItem;
              return (
                <div
                  key={q.id}
                  className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="w-6 text-center text-xs font-mono font-bold text-slate-500">
                      #{idx + 1}
                    </span>
                    <img
                      src={getPostImageUrl(item?.thumbnailUrl, item?.mediaUrl)}
                      alt={item?.title}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-800 shrink-0"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.src.includes('unsplash')) {
                          target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80';
                        }
                      }}
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white">{item?.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400">
                          {item?.contentType}
                        </span>
                        <span>Queued: {new Date(q.queuedAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                    ELIGIBLE FOR SCHEDULER ✓
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
