import React, { useState } from 'react';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
import {
  Sparkles,
  Copy,
  Check,
  Calendar,
  Layers,
  Building2,
  RefreshCw,
  Send,
  Sliders,
  AlertCircle,
} from 'lucide-react';

export const AIStudioView: React.FC = () => {
  const { clients, selectedClientId } = useClients();

  const [activeClientId, setActiveClientId] = useState(
    selectedClientId !== 'ALL' ? selectedClientId : (clients[0]?.id || '')
  );

  const [mode, setMode] = useState<'variations' | 'monthly_plan'>('variations');
  const [topic, setTopic] = useState('Festive Season Special Menu & Weekend Live Music Sessions');

  // Variations state
  const [variations, setVariations] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Monthly plan state
  const [month, setMonth] = useState('September');
  const [year, setYear] = useState(2026);
  const [postsCount, setPostsCount] = useState(20);
  const [storiesCount, setStoriesCount] = useState(10);
  const [reelsCount, setReelsCount] = useState(8);
  const [monthlyPlan, setMonthlyPlan] = useState<any>(null);

  const currentClient = clients.find((c) => c.id === activeClientId) || clients[0];

  const handleGenerateVariations = async () => {
    if (!activeClientId) return;
    setIsGenerating(true);
    try {
      const data = await api.generateAIVariations(activeClientId, topic);
      setVariations(data);
    } catch (err: any) {
      alert(`AI error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMonthlyPlan = async () => {
    if (!activeClientId) return;
    setIsGenerating(true);
    try {
      const plan = await api.generateAIMonthlyPlan({
        clientId: activeClientId,
        month,
        year,
        postsCount,
        storiesCount,
        reelsCount,
      });
      setMonthlyPlan(plan);
    } catch (err: any) {
      alert(`AI error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-400" />
            Brand-Aware AI Content Studio & Monthly Planner
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generates high-converting, platform-specific copy and full 30-day editorial plans strictly using stored Client Brand Knowledge.
          </p>
        </div>

        {/* Studio Mode Selector */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs self-start sm:self-auto">
          <button
            onClick={() => setMode('variations')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              mode === 'variations' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Multi-Platform Variations
          </button>
          <button
            onClick={() => setMode('monthly_plan')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              mode === 'monthly_plan' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            30-Day Monthly Planner
          </button>
        </div>
      </div>

      {/* Client & Brand Knowledge Context Chip */}
      <div className="glass-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Client Context:</span>
          <select
            value={activeClientId}
            onChange={(e) => setActiveClientId(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-white rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-brand-500 font-semibold"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName} ({c.category})
              </option>
            ))}
          </select>
        </div>

        {currentClient?.brandProfile && (
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
              Tone: {currentClient.brandProfile.brandTone}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-brand-300 font-mono">
              Lang: {currentClient.brandProfile.language}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono truncate max-w-xs">
              USP: {currentClient.brandProfile.usp.slice(0, 45)}...
            </span>
          </div>
        )}
      </div>

      {/* MODE 1: Multi-Platform Variations */}
      {mode === 'variations' ? (
        <div className="space-y-6">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Campaign Focus / Content Topic
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Monsoon Special Chai & Crispy Corn, or New JEE Foundation Batch"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:ring-1 focus:ring-brand-500"
                />
                <button
                  onClick={handleGenerateVariations}
                  disabled={isGenerating}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 hover:opacity-95 text-white text-xs font-bold shrink-0 transition flex items-center gap-2 shadow-lg shadow-brand-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGenerating ? 'AI Generating...' : 'Generate 3 Variations'}
                </button>
              </div>
            </div>
          </div>

          {/* 3 Variation Cards (Instagram, Facebook, Google Business) */}
          {variations && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in">
              {/* Instagram Card */}
              <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400">📷 Instagram Copy</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${variations.instagram.caption}\n\n${variations.instagram.hashtags}`,
                          'ig'
                        )
                      }
                      className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                    >
                      {copiedKey === 'ig' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                    {variations.instagram.caption}
                  </p>
                  <p className="text-[11px] text-brand-300 font-mono">{variations.instagram.hashtags}</p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Tailored for Hook + Hashtags</span>
              </div>

              {/* Facebook Card */}
              <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400">📘 Facebook Copy</span>
                    <button
                      onClick={() => copyToClipboard(variations.facebook.caption, 'fb')}
                      className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                    >
                      {copiedKey === 'fb' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                    {variations.facebook.caption}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Tailored for Community & CTA</span>
              </div>

              {/* Google Business Profile Card */}
              <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">📍 Google Business Local</span>
                    <button
                      onClick={() => copyToClipboard(variations.googleBusiness.caption, 'gbp')}
                      className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                    >
                      {copiedKey === 'gbp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                    {variations.googleBusiness.caption}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Local SEO & Call Action</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MODE 2: 30-Day Monthly Content Planner */
        <div className="space-y-6">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                >
                  <option value="September">September 2026</option>
                  <option value="October">October 2026</option>
                  <option value="November">November 2026</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Posts Count</label>
                <input
                  type="number"
                  value={postsCount}
                  onChange={(e) => setPostsCount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Stories Count</label>
                <input
                  type="number"
                  value={storiesCount}
                  onChange={(e) => setStoriesCount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reels Count</label>
                <input
                  type="number"
                  value={reelsCount}
                  onChange={(e) => setReelsCount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-center font-bold"
                />
              </div>

              <div className="flex items-end col-span-2 sm:col-span-1">
                <button
                  onClick={handleGenerateMonthlyPlan}
                  disabled={isGenerating}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 hover:opacity-95 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-brand-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isGenerating ? 'Planning...' : 'Generate Plan'}
                </button>
              </div>
            </div>
          </div>

          {/* Monthly Plan Cards Grid */}
          {monthlyPlan && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  30-Day Campaign Outline for {monthlyPlan.businessName} ({monthlyPlan.month} {monthlyPlan.year})
                </h3>
                <span className="text-xs text-cyan-400 font-mono">
                  {monthlyPlan.summary.totalScheduledSlots} Content Slots Planned
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[600px] overflow-y-auto p-1">
                {monthlyPlan.plan.map((item: any, idx: number) => (
                  <div key={idx} className="glass-card p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 font-bold">
                        Day {item.day} • {item.date}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          item.contentType === 'REEL'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : item.contentType === 'STORY'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-brand-500/20 text-brand-300'
                        }`}
                      >
                        {item.contentType}
                      </span>
                    </div>

                    <h4 className="font-bold text-white leading-snug">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.suggestedCaption}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span>⏰ {item.suggestedTime}</span>
                      <span className="text-cyan-400 font-medium">{item.platforms.join(' • ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
