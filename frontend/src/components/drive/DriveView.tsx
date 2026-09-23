import React, { useState, useEffect } from 'react';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
import {
  HardDrive,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Folder,
  FileImage,
  Video,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface DriveViewProps {
  onNavigateToInbox?: () => void;
}

export const DriveView: React.FC<DriveViewProps> = ({ onNavigateToInbox }) => {
  const { clients, selectedClientId } = useClients();

  const [status, setStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Simulator state
  const [simClient, setSimClient] = useState(selectedClientId !== 'ALL' ? selectedClientId : (clients[0]?.id || ''));
  const [simFolder, setSimFolder] = useState<'FINAL_POSTS' | 'FINAL_REELS' | 'FINAL_STORIES'>('FINAL_POSTS');
  const [simFilename, setSimFilename] = useState('weekend-chef-delight.jpg');
  const [simMediaUrl, setSimMediaUrl] = useState('https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80');

  useEffect(() => {
    if (selectedClientId !== 'ALL') {
      setSimClient(selectedClientId);
    } else if (clients.length > 0 && !simClient) {
      setSimClient(clients[0].id);
    }
  }, [selectedClientId, clients]);

  const fetchStatus = async () => {
    try {
      const data = await api.getDriveStatus();
      setStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [selectedClientId]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await api.syncDrive(selectedClientId !== 'ALL' ? selectedClientId : undefined);
      await fetchStatus();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSimulateUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const isReel = simFolder === 'FINAL_REELS';
      const isStory = simFolder === 'FINAL_STORIES';

      const res = await api.simulateDriveUpload({
        clientId: simClient,
        folderType: simFolder,
        filename: simFilename,
        mimeType: isReel ? 'video/mp4' : 'image/jpeg',
        mediaUrl: simMediaUrl,
        aspectRatio: isReel || isStory ? '9:16' : '1:1',
        durationSec: isReel ? 25 : undefined,
      });

      setUploadSuccess(`Uploaded "${simFilename}" to Drive! Creative auto-detected and added to Content Inbox as NEW.`);
      await fetchStatus();
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const sampleMediaPresets = [
    {
      label: 'Gourmet Dish (Post)',
      folder: 'FINAL_POSTS' as const,
      filename: 'paneer-tikka-feast.jpg',
      url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=1200&q=80',
    },
    {
      label: 'Kitchen Tour (Reel)',
      folder: 'FINAL_REELS' as const,
      filename: 'behind-the-scenes-reel.mp4',
      url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80',
    },
    {
      label: 'Flash Story Poll (Story)',
      folder: 'FINAL_STORIES' as const,
      filename: 'morning-flash-poll.jpg',
      url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cyan-400" />
            Google Drive Automation & Asset Detection
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Google Drive is the primary creative storage system. Newly uploaded creatives in "03_Final_Content" enter the Content Inbox for review.
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-2 text-xs font-semibold bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-200 px-4 py-2 rounded-xl transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Scanning Drive...' : 'Run Drive Scan Now'}
        </button>
      </div>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Drive Health</span>
            <span className="text-sm font-bold text-white">Connected & Active ✓</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Target Folder</span>
            <span className="text-sm font-bold text-cyan-300">03_Final_Content</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Duplicate Protection</span>
            <span className="text-sm font-bold text-brand-300 font-mono">drive_file_id enabled</span>
          </div>
        </div>
      </div>

      {/* 2-Column: Upload Simulator on Left, Connected Drive Folders on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Drive Upload Simulator */}
        <div className="lg:col-span-6 glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-bold text-white">Designer / Editor Upload Simulator</h3>
            </div>
            <span className="text-[10px] bg-brand-500/20 text-brand-300 border border-brand-500/40 px-2 py-0.5 rounded-full font-semibold">
              Live Testing
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Simulate a creative designer exporting an image or video directly to a client's Google Drive Final Content folder.
          </p>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2">
            {sampleMediaPresets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSimFolder(p.folder);
                  setSimFilename(p.filename);
                  setSimMediaUrl(p.url);
                }}
                className="text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg transition"
              >
                {p.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSimulateUpload} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Client Business</label>
              <select
                value={simClient}
                onChange={(e) => setSimClient(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName} ({c.location.split(',')[0]})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Final Folder</label>
                <select
                  value={simFolder}
                  onChange={(e) => setSimFolder(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="FINAL_POSTS">03_Final_Content / Posts</option>
                  <option value="FINAL_REELS">03_Final_Content / Reels</option>
                  <option value="FINAL_STORIES">03_Final_Content / Stories</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Filename</label>
                <input
                  type="text"
                  required
                  value={simFilename}
                  onChange={(e) => setSimFilename(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-mono text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Creative Media URL</label>
              <input
                type="url"
                required
                value={simMediaUrl}
                onChange={(e) => setSimMediaUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-mono text-[11px]"
              />
            </div>

            {/* Media Preview Box */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center gap-3">
              <img
                src={simMediaUrl}
                alt="Preview"
                className="w-16 h-16 rounded-lg object-cover border border-slate-800 shrink-0"
              />
              <div className="text-[11px] text-slate-400 space-y-0.5">
                <span className="font-semibold text-slate-200 block truncate">{simFilename}</span>
                <span>Type: {simFolder.replace('FINAL_', '')}</span>
                <span className="block text-cyan-400 font-mono text-[10px]">Ready for auto-detection</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-brand-500/20 transition flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              {isUploading ? 'Uploading to Drive...' : 'Simulate Designer Upload to Drive'}
            </button>
          </form>

          {uploadSuccess && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Upload & Detection Successful!</span>
              </div>
              <p className="text-[11px] text-emerald-400/90">{uploadSuccess}</p>
              {onNavigateToInbox && (
                <button
                  type="button"
                  onClick={onNavigateToInbox}
                  className="text-[11px] font-bold underline hover:text-white"
                >
                  Open Content Inbox to Review Creative →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Client Drive Status Explorer */}
        <div className="lg:col-span-6 glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Client Drive Mapping Status</h3>
            </div>
            <span className="text-xs text-slate-400">Real-time sync check</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {status?.clients?.map((cl: any) => (
              <div key={cl.clientId} className="py-3.5 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{cl.businessName}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                      Sync OK
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">Folder ID: {cl.rootFolderId}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                    <span>{cl.totalFiles} Detected Files</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-semibold">{cl.pendingReview} Pending Review</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 block">Last Sync:</span>
                  <span className="text-[11px] text-slate-300 font-mono">
                    {new Date(status.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Workflow Diagram */}
          <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
            <span className="font-bold text-slate-200 block text-[11px] uppercase tracking-wider">
              Drive Auto-Detect Workflow
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
              <span className="px-2 py-0.5 bg-slate-800 rounded">Drive Upload</span>
              <span>→</span>
              <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800/50 rounded">Auto-Detect</span>
              <span>→</span>
              <span className="px-2 py-0.5 bg-slate-800 rounded">Content Inbox</span>
              <span>→</span>
              <span className="px-2 py-0.5 bg-brand-950 text-brand-300 border border-brand-800/50 rounded">SMM Review</span>
              <span>→</span>
              <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800/50 rounded">Admin Gate</span>
              <span>→</span>
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800/50 rounded">Publish</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
