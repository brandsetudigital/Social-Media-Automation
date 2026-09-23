import React, { useState, useEffect } from 'react';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
import { AuditLogItem } from '../../types';
import {
  History,
  Shield,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  Search,
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { selectedClientId } = useClients();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs(selectedClientId !== 'ALL' ? selectedClientId : undefined);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedClientId]);

  const filteredLogs = logs.filter((l) => {
    if (!searchFilter) return true;
    const match =
      l.action.toLowerCase().includes(searchFilter.toLowerCase()) ||
      l.actorName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (l.client?.businessName || '').toLowerCase().includes(searchFilter.toLowerCase());
    return match;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Immutable Agency Audit Trail
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically chronological log of all approvals, schedule overrides, brand profile edits, and automated publishing activities.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 px-3.5 py-2 rounded-xl transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
          Refresh Audit Trail
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-card p-3 rounded-2xl flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-500 ml-2" />
        <input
          type="text"
          placeholder="Filter audit logs by action, actor, or client name..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl text-slate-500 text-xs">
          No audit records found.
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800 divide-y divide-slate-800/60 overflow-hidden">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/40 transition">
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    log.actorRole === 'ADMIN'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                      : log.actorRole === 'SMM'
                      ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {log.actorRole === 'ADMIN' ? <Shield className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{log.actorName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {log.actorRole}
                    </span>
                    <span className="text-[10px] font-bold text-cyan-400 font-mono">
                      {log.action}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1">
                    Client: <strong className="text-slate-300">{log.client?.businessName || 'System'}</strong> • Target: {log.entityType}
                  </p>

                  {log.detailsJson && (
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 max-w-xl truncate">
                      {log.detailsJson}
                    </p>
                  )}
                </div>
              </div>

              <span className="text-[10px] text-slate-500 font-mono self-start md:self-auto shrink-0">
                {new Date(log.createdAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
