import React, { useState, useEffect } from 'react';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
import { RecurringRule, RuleStep, ContentType } from '../../types';
import {
  Repeat,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Layers,
  Save,
  Check,
} from 'lucide-react';

export const RuleBuilderView: React.FC = () => {
  const { clients, selectedClientId } = useClients();

  const [activeClientId, setActiveClientId] = useState(
    selectedClientId !== 'ALL' ? selectedClientId : (clients[0]?.id || '')
  );
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  // Form states for rule builder
  const [ruleName, setRuleName] = useState('Weekly Content Cycle (Story → Post → Post → Rest Day → Repeat)');
  const [startDate, setStartDate] = useState('2026-09-10');
  const [repeatInfinite, setRepeatInfinite] = useState(true);

  // Steps in the cycle
  const [steps, setSteps] = useState<RuleStep[]>([
    { stepOrder: 1, stepType: 'CONTENT', contentType: 'STORY', targetTime: '10:00', platforms: ['INSTAGRAM', 'FACEBOOK'] },
    { stepOrder: 2, stepType: 'CONTENT', contentType: 'POST', targetTime: '13:00', platforms: ['INSTAGRAM', 'FACEBOOK', 'GOOGLE_BUSINESS'] },
    { stepOrder: 3, stepType: 'CONTENT', contentType: 'POST', targetTime: '19:30', platforms: ['INSTAGRAM', 'FACEBOOK'] },
    { stepOrder: 4, stepType: 'GAP', gapDays: 1, platforms: [] },
  ]);

  // Projected 30-day timeline slots
  const [projectedSlots, setProjectedSlots] = useState<any[]>([]);
  const [isProjecting, setIsProjecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedClientId !== 'ALL') {
      setActiveClientId(selectedClientId);
    } else if (clients.length > 0 && !activeClientId) {
      setActiveClientId(clients[0].id);
    }
  }, [selectedClientId, clients]);

  const fetchRules = async () => {
    if (!activeClientId) return;
    try {
      const data = await api.getRules(activeClientId);
      setRules(data);
      if (data.length > 0) {
        const first = data[0];
        setSelectedRuleId(first.id);
        setRuleName(first.name);
        setStartDate(first.startDate.split('T')[0]);
        setRepeatInfinite(first.repeatInfinite);
        if (first.steps && first.steps.length > 0) {
          setSteps(
            first.steps.map((s: any) => ({
              ...s,
              platforms: typeof s.platforms === 'string' ? JSON.parse(s.platforms) : s.platforms,
            }))
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [activeClientId]);

  // Trigger projection calculation
  const calculateProjection = () => {
    setIsProjecting(true);
    const slots = [];
    const base = new Date(startDate || '2026-09-10');
    let current = new Date(base.getTime());
    let stepIdx = 0;
    const totalSteps = steps.length;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let dayCount = 0; dayCount < 30; ) {
      const step = steps[stepIdx % totalSteps];
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayOfWeek = dayNames[current.getDay()];

      if (step.stepType === 'GAP') {
        const gap = step.gapDays || 1;
        slots.push({
          date: dateStr,
          dayOfWeek,
          stepOrder: step.stepOrder,
          contentType: 'REST_DAY',
          targetTime: '-',
          platforms: [],
          isGap: true,
          gapDays: gap,
        });
        current.setDate(current.getDate() + gap);
        dayCount += gap;
      } else {
        slots.push({
          date: dateStr,
          dayOfWeek,
          stepOrder: step.stepOrder,
          contentType: step.contentType || 'POST',
          targetTime: step.targetTime || '19:00',
          platforms: Array.isArray(step.platforms) ? step.platforms : ['INSTAGRAM', 'FACEBOOK'],
          isGap: false,
        });
        current.setDate(current.getDate() + 1);
        dayCount += 1;
      }
      stepIdx++;
    }

    setProjectedSlots(slots);
    setIsProjecting(false);
  };

  useEffect(() => {
    calculateProjection();
  }, [steps, startDate]);

  const addContentStep = (type: ContentType) => {
    setSteps((prev) => [
      ...prev,
      {
        stepOrder: prev.length + 1,
        stepType: 'CONTENT',
        contentType: type,
        targetTime: type === 'STORY' ? '10:00' : type === 'REEL' ? '19:00' : '13:00',
        platforms: ['INSTAGRAM', 'FACEBOOK'],
      },
    ]);
  };

  const addGapStep = (days = 1) => {
    setSteps((prev) => [
      ...prev,
      {
        stepOrder: prev.length + 1,
        stepType: 'GAP',
        gapDays: days,
        platforms: [],
      },
    ]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      alert('A rule must have at least one step');
      return;
    }
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, idx) => ({ ...s, stepOrder: idx + 1 })));
  };

  const handleSaveRule = async () => {
    if (!activeClientId) return;
    setIsSaving(true);
    try {
      if (selectedRuleId) {
        await api.updateRule(selectedRuleId, {
          name: ruleName,
          startDate: new Date(startDate),
          repeatInfinite,
          steps,
        });
        setSuccessMessage('Recurring rule updated successfully!');
      } else {
        const newRule = await api.createRule({
          clientId: activeClientId,
          name: ruleName,
          startDate: new Date(startDate),
          repeatInfinite,
          steps,
        });
        setSelectedRuleId(newRule.id);
        setSuccessMessage('New recurring rule created!');
      }
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchRules();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFillQueue = async () => {
    if (!selectedRuleId) {
      alert('Please save the rule first before running auto-allocation.');
      return;
    }
    try {
      const res = await api.fillQueueFromRule(selectedRuleId);
      alert(res.message);
    } catch (err: any) {
      alert(`Queue allocation error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Repeat className="w-5 h-5 text-brand-400" />
            Visual Recurring Content Cycle Builder
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure custom client posting cycles (e.g. Story → 2 days sequence → Rest Day → Repeat) with live 30-day interactive calendar projection.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleFillQueue}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-850 border border-slate-700 text-cyan-300 px-3.5 py-2 rounded-xl transition shadow-sm"
          >
            <Layers className="w-3.5 h-3.5" />
            Auto-Fill Slots from Queue
          </button>

          <button
            onClick={handleSaveRule}
            disabled={isSaving}
            className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-brand-600 to-indigo-600 hover:opacity-95 text-white px-4 py-2 rounded-xl shadow-lg shadow-brand-500/20 transition"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save Cycle Rule'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Target Client Bar */}
      <div className="glass-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Target Client:</span>
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

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">Cycle Start Date:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-white text-xs font-mono"
          />
        </div>
      </div>

      {/* Visual Step-by-Step Sequence Builder */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Cycle Step Sequence (Repeats upon cycle completion)
            </h3>
            <p className="text-xs text-slate-400">
              Each step represents either a content slot or rest day(s).
            </p>
          </div>

          {/* Add Step Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => addContentStep('STORY')}
              className="text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 px-2.5 py-1 rounded-lg transition"
            >
              + Add Story Slot
            </button>
            <button
              onClick={() => addContentStep('POST')}
              className="text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-brand-300 px-2.5 py-1 rounded-lg transition"
            >
              + Add Post Slot
            </button>
            <button
              onClick={() => addContentStep('REEL')}
              className="text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 px-2.5 py-1 rounded-lg transition"
            >
              + Add Reel Slot
            </button>
            <button
              onClick={() => addGapStep(1)}
              className="text-[11px] font-semibold bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 px-2.5 py-1 rounded-lg transition"
            >
              + Add Rest Day (Gap)
            </button>
          </div>
        </div>

        {/* Step Cards Horizontal Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
          {steps.map((step, idx) => {
            const isGap = step.stepType === 'GAP';
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border relative flex flex-col justify-between transition ${
                  isGap
                    ? 'bg-amber-950/20 border-amber-800/50'
                    : 'bg-slate-900/80 border-slate-800 hover:border-brand-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    Step {step.stepOrder}
                  </span>
                  <button
                    onClick={() => removeStep(idx)}
                    className="text-slate-500 hover:text-rose-400 transition"
                    title="Remove step"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isGap ? (
                  <div className="space-y-2 py-2">
                    <span className="text-xs font-bold text-amber-400 block">🛑 REST DAY (GAP)</span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <span>Rest for:</span>
                      <input
                        type="number"
                        min={1}
                        max={7}
                        value={step.gapDays || 1}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSteps((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, gapDays: val } : s))
                          );
                        }}
                        className="w-12 bg-slate-950 border border-amber-800/60 rounded px-1.5 py-0.5 text-center text-amber-300 font-bold"
                      />
                      <span>day(s)</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 py-1">
                    <span className="text-xs font-bold text-cyan-300 block">
                      📷 {step.contentType}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <input
                        type="time"
                        value={step.targetTime || '19:00'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSteps((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, targetTime: val } : s))
                          );
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-white font-mono text-[10px]"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>{isGap ? 'Pause Posting' : 'Slot Active'}</span>
                  {idx < steps.length - 1 ? (
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                  ) : (
                    <span title="Cycle repeats from Step 1">
                      <Repeat className="w-3 h-3 text-brand-400" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live 30-Day Projection Timeline (User's specific requirement verification!) */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Live 30-Day Projected Timeline (Interactive Preview)
            </h3>
            <p className="text-xs text-slate-400">
              Shows the calculated schedule sequence over upcoming dates. Notice how gaps and repeats are mapped continuously.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            {projectedSlots.length} Projected Slots
          </span>
        </div>

        {/* Projection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2.5 max-h-96 overflow-y-auto p-1">
          {projectedSlots.map((slot, index) => {
            const isGap = slot.isGap;
            return (
              <div
                key={index}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition ${
                  isGap
                    ? 'bg-amber-950/25 border-amber-800/40 text-amber-300'
                    : 'bg-slate-900/90 border-slate-800 text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                    <span>{slot.dayOfWeek.slice(0, 3)}</span>
                    <span>{slot.date.slice(5)}</span>
                  </div>

                  <span
                    className={`text-[11px] font-bold block ${
                      isGap
                        ? 'text-amber-400'
                        : slot.contentType === 'STORY'
                        ? 'text-cyan-400'
                        : slot.contentType === 'REEL'
                        ? 'text-indigo-400'
                        : 'text-brand-300'
                    }`}
                  >
                    {isGap ? '🛑 Rest Day' : `✨ ${slot.contentType}`}
                  </span>
                </div>

                {!isGap && (
                  <div className="mt-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{slot.targetTime}</span>
                    <span className="text-brand-400 font-bold">Slot</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
