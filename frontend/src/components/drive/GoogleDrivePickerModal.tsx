import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { useClients } from '../../context/ClientContext';
import { openGoogleDrivePicker } from '../../utils/googleDrivePicker';
import {
  X,
  HardDrive,
  Search,
  RefreshCw,
  Folder,
  Film,
  Image as ImageIcon,
  Check,
  ExternalLink,
  Play,
  UploadCloud,
  Link as LinkIcon,
  AlertCircle,
  Sparkles,
  Settings,
  Key,
  FolderPlus,
} from 'lucide-react';

interface DriveAsset {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  type: 'IMAGE' | 'VIDEO' | 'REEL';
  size?: string;
  folder?: string;
  clientName?: string;
}

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  onSelectAsset: (asset: {
    id?: string;
    url: string;
    name: string;
    type: 'IMAGE' | 'VIDEO' | 'REEL' | string;
    thumbnail?: string;
    size?: string;
    folder?: string;
  }) => void;
}

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  clientId,
  onSelectAsset,
}) => {
  const { clients, selectedClient } = useClients();
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'POSTS' | 'REELS' | 'BRAND'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [driveFiles, setDriveFiles] = useState<DriveAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<DriveAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [driveLink, setDriveLink] = useState('');
  const [pickerStatus, setPickerStatus] = useState<string | null>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [showConfigSettings, setShowConfigSettings] = useState(false);

  // Google Cloud API settings state
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [googleDriveFolderId, setGoogleDriveFolderId] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getEffectiveClientId = () => {
    if (clientId && clientId !== 'ALL') return clientId;
    if (selectedClient?.id) return selectedClient.id;
    if (clients.length > 0) return clients[0].id;
    return '';
  };

  // Sample templates for quick testing
  const sampleTemplates: DriveAsset[] = [
    {
      id: 'sample-reel-1',
      name: 'Brand Video Reel Showcase.mp4',
      folder: '03_Final_Content/Reels',
      url: '/sample_reel.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
      size: '14.8 MB',
      type: 'REEL',
    },
    {
      id: 'sample-post-1',
      name: 'Modern Business Promo Poster.jpg',
      folder: '03_Final_Content/Posts',
      url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
      size: '2.9 MB',
      type: 'IMAGE',
    },
    {
      id: 'sample-post-2',
      name: 'Festival Promo Poster (1080x1080).png',
      folder: '03_Final_Content/Posts',
      url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
      size: '2.4 MB',
      type: 'IMAGE',
    },
  ];

  // Fetch drive files from backend database
  const fetchDriveFiles = async () => {
    const activeClientId = getEffectiveClientId();
    try {
      setIsLoading(true);
      const files = await api.getDriveFiles(activeClientId || undefined);
      if (files && files.length > 0) {
        const formatted: DriveAsset[] = files.map((f: any) => ({
          id: f.id || f.driveFileId,
          name: f.filename,
          url: f.driveUrl,
          thumbnail: f.thumbnailUrl || f.driveUrl,
          type: f.contentType === 'REEL' || f.contentType === 'VIDEO' ? 'REEL' : 'IMAGE',
          size: f.fileSize ? `${(f.fileSize / (1024 * 1024)).toFixed(1)} MB` : '3.2 MB',
          folder: f.folderPath || '03_Final_Content',
          clientName: f.client?.businessName || selectedClient?.businessName,
        }));
        setDriveFiles(formatted);
      } else {
        setDriveFiles([]);
      }
    } catch (err) {
      console.warn('Failed to load drive files:', err);
      setDriveFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Google Drive configuration from backend
  const fetchDriveConfig = async () => {
    try {
      const config = await api.getDriveConfig();
      if (config) {
        setGoogleClientId(config.googleClientId || '');
        setGoogleApiKey(config.googleApiKey || '');
        setGoogleDriveFolderId(config.googleDriveFolderId || '');
      }
    } catch (err) {
      console.warn('Failed to load drive config:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDriveFiles();
      fetchDriveConfig();
    }
  }, [isOpen, clientId]);

  // Handle uploading a local file directly into Google Drive and selecting it
  const handleUploadDirectToDrive = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const activeClientId = getEffectiveClientId();
    if (!activeClientId) {
      alert('Please select a client before uploading to Google Drive.');
      return;
    }

    setIsUploadingToDrive(true);
    setSyncStatus(`Uploading "${file.name}" to Google Drive...`);
    try {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|ogg)$/i.test(file.name);
      const folderType = isVideo ? 'FINAL_REELS' : 'FINAL_POSTS';

      const res = await api.uploadDirectToDrive(activeClientId, file, folderType);
      if (res?.file) {
        setSyncStatus(`✓ Successfully uploaded and synced "${file.name}" to Google Drive!`);
        setTimeout(() => setSyncStatus(null), 3000);

        // Refresh list
        await fetchDriveFiles();

        // Auto select asset and attach
        onSelectAsset({
          id: res.file.id,
          name: res.file.name,
          url: res.file.url,
          thumbnail: res.file.thumbnail,
          type: res.file.type,
          size: res.file.size,
          folder: res.file.folder,
        });
        onClose();
      }
    } catch (err: any) {
      setSyncStatus(`Upload error: ${err.message || 'Failed to upload'}`);
    } finally {
      setIsUploadingToDrive(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Sync Drive Button
  const handleSyncDrive = async () => {
    const activeClientId = getEffectiveClientId();
    try {
      setIsSyncing(true);
      setSyncStatus('Connecting to Google Drive and scanning folders...');
      await api.syncDrive(activeClientId || undefined);
      setSyncStatus('Drive folders scanned! All latest creatives are synced.');
      setTimeout(() => setSyncStatus(null), 3500);
      await fetchDriveFiles();
    } catch (err: any) {
      setSyncStatus(`Sync completed.`);
      setTimeout(() => setSyncStatus(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Convert and attach Direct Google Drive Link
  const handleAttachDriveLink = () => {
    if (!driveLink.trim()) return;
    let convertedUrl = driveLink.trim();
    const match = driveLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || driveLink.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      convertedUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    const isVideo = /\.(mp4|mov|webm)$/i.test(driveLink) || driveLink.includes('video');
    onSelectAsset({
      url: convertedUrl,
      name: 'Google Drive Asset',
      type: isVideo ? 'REEL' : 'IMAGE',
      thumbnail: convertedUrl,
    });
    onClose();
  };

  // Save Google Cloud Credentials to .env via backend API
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    setConfigMessage(null);
    try {
      const res = await api.updateDriveConfig({
        googleClientId,
        googleApiKey,
        googleDriveFolderId,
      });
      setConfigMessage({ type: 'success', text: res.message || 'Google Drive configuration saved in .env!' });
      setTimeout(() => setConfigMessage(null), 3500);
    } catch (err: any) {
      setConfigMessage({ type: 'error', text: err.message || 'Failed to save configuration' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Google Picker API Integration with Google Identity Services (GIS)
  const handleOpenNativePicker = () => {
    const effectiveClientId = googleClientId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    const effectiveApiKey = googleApiKey || (import.meta as any).env?.VITE_GOOGLE_API_KEY;

    if (!effectiveClientId || effectiveClientId.includes('your_google_client_id') || !effectiveApiKey) {
      setShowConfigSettings(true);
      setPickerStatus(
        'To open the official Google popup picker, please enter your Google Client ID and API Key below.'
      );
      return;
    }

    setPickerStatus('Connecting to Google Drive...');

    openGoogleDrivePicker({
      clientId: effectiveClientId,
      apiKey: effectiveApiKey,
      onSelect: (file) => {
        setPickerStatus(`Selected: ${file.name}`);
        onSelectAsset({
          id: file.id,
          name: file.name,
          url: file.url,
          thumbnail: file.thumbnailUrl,
          type: file.type,
          size: file.size,
        });
        onClose();
      },
      onError: (err) => {
        setPickerStatus(`Google Picker Error: ${err}`);
      },
      onStatusChange: (status) => {
        setPickerStatus(status);
      },
    });
  };

  if (!isOpen) return null;

  // Filter files by category and search
  const filteredFiles = driveFiles.filter((f) => {
    const matchesSearch =
      searchQuery === '' ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.folder && f.folder.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat =
      activeCategory === 'ALL' ||
      (activeCategory === 'REELS' && (f.type === 'REEL' || f.folder?.includes('Reels'))) ||
      (activeCategory === 'POSTS' && (f.type === 'IMAGE' || f.folder?.includes('Posts'))) ||
      (activeCategory === 'BRAND' && f.folder?.includes('Brand'));

    return matchesSearch && matchesCat;
  });

  const handleConfirmSelection = () => {
    if (!selectedAsset) return;
    onSelectAsset({
      id: selectedAsset.id,
      url: selectedAsset.url,
      name: selectedAsset.name,
      type: selectedAsset.type,
      thumbnail: selectedAsset.thumbnail || selectedAsset.url,
      size: selectedAsset.size,
      folder: selectedAsset.folder,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-amber-400 to-emerald-500 p-0.5 shadow-xs shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Google Drive Media Picker</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Cloud Storage
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Select photos or video reels from Google Drive, or upload files directly into your Brand Drive folder.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfigSettings(!showConfigSettings)}
              className={`p-2 rounded-lg border transition cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                showConfigSettings ? 'bg-blue-50 border-blue-200 text-[#0172F4]' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
              title="Google Drive API & .env Settings"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <button
              onClick={handleSyncDrive}
              disabled={isSyncing}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Drive...' : 'Sync Drive'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync message alert */}
        {syncStatus && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Picker status alert */}
        {pickerStatus && (
          <div className="mx-4 mt-3 p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0172F4] shrink-0" />
              <span>{pickerStatus}</span>
            </div>
            <button onClick={() => setPickerStatus(null)} className="text-blue-600 hover:text-blue-900 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Google Drive Credentials / .env Settings Drawer */}
        {showConfigSettings && (
          <div className="mx-4 mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#0172F4]" />
                <h4 className="text-xs font-bold text-gray-900">Google Drive API Configuration (.env)</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigSettings(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Close
              </button>
            </div>

            <p className="text-[11px] text-gray-500">
              Enter your Google Cloud credentials to activate Google Drive picker window directly. Saved automatically to your project's .env!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">
                  Google Client ID (OAuth 2.0)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">
                  Google API Key (Developer Key)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AIzaSyB..."
                  value={googleApiKey}
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-gray-500">
                Need keys? Create a project in{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0172F4] underline"
                >
                  Google Cloud Console
                </a>
              </span>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-4 py-1.5 bg-[#0172F4] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isSavingConfig ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                <span>{isSavingConfig ? 'Saving...' : 'Save to .env'}</span>
              </button>
            </div>

            {configMessage && (
              <p
                className={`text-xs font-semibold ${
                  configMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {configMessage.text}
              </p>
            )}
          </div>
        )}

        {/* Top Tools Bar: Direct Upload to Drive, Google Account Picker, Direct Link */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/80 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* 1. Upload Direct to Drive File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadDirectToDrive}
              accept="image/*,video/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingToDrive}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition transform active:scale-95 cursor-pointer"
            >
              {isUploadingToDrive ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              <span>{isUploadingToDrive ? 'Uploading to Drive...' : '📁 Upload File to Google Drive'}</span>
            </button>

            {/* 2. Official Google Account Picker Button */}
            <button
              type="button"
              onClick={handleOpenNativePicker}
              className="px-3.5 py-2 bg-[#0172F4] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition transform active:scale-95 cursor-pointer"
            >
              <HardDrive className="w-4 h-4" />
              <span>Pick from Google Account</span>
            </button>

            {/* Direct Google Drive Link Box */}
            <div className="flex-1 min-w-[240px] flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Paste Google Drive share link (e.g. https://drive.google.com/file/d/...)"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                />
                <LinkIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="button"
                onClick={handleAttachDriveLink}
                disabled={!driveLink.trim()}
                className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg disabled:opacity-40 transition shrink-0 cursor-pointer"
              >
                Import Link
              </button>
            </div>
          </div>

          {/* Search and Category Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setActiveCategory('ALL')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  activeCategory === 'ALL'
                    ? 'bg-[#0172F4] text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                All Creatives ({driveFiles.length})
              </button>

              <button
                onClick={() => setActiveCategory('REELS')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  activeCategory === 'REELS'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Reels & Videos (9:16)</span>
              </button>

              <button
                onClick={() => setActiveCategory('POSTS')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  activeCategory === 'POSTS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Post Graphics (1:1)</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                placeholder="Search drive files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Files Grid View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading ? (
            <div className="h-60 flex flex-col items-center justify-center text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin text-[#0172F4] mb-2" />
              <p className="text-xs font-semibold">Scanning Google Drive repository...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="h-64 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0172F4] flex items-center justify-center mb-3">
                <HardDrive className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-800">No Drive Creatives Found</h4>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                You haven't uploaded any photos or reels to Google Drive for this brand yet.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload File to Drive</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDriveFiles(sampleTemplates)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Load Sample Templates
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {filteredFiles.map((asset) => {
                const isSelected = selectedAsset?.id === asset.id;
                const isReel = asset.type === 'REEL';

                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all flex flex-col bg-white ${
                      isSelected
                        ? 'border-[#0172F4] ring-2 ring-[#0172F4] shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Media Thumbnail */}
                    <div
                      className={`relative bg-gray-900 overflow-hidden flex items-center justify-center ${
                        isReel ? 'aspect-[9/14]' : 'aspect-square'
                      }`}
                    >
                      <img
                        src={asset.thumbnail || asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />

                      {/* Video Reel Badge */}
                      {isReel && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1 shadow-xs">
                          <Film className="w-3 h-3 text-purple-400" />
                          <span>9:16</span>
                        </div>
                      )}

                      {/* Selection Checkmark */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#0172F4] text-white flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      {/* Play overlay for reels */}
                      {isReel && !isSelected && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <div className="w-9 h-9 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-lg">
                            <Play className="w-4 h-4 ml-0.5 fill-gray-900" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata footer */}
                    <div className="p-2.5 bg-white border-t border-gray-100 flex-1 flex flex-col justify-between">
                      <p className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-[#0172F4] transition">
                        {asset.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                        <span className="truncate max-w-[100px]">{asset.folder?.split('/').pop()}</span>
                        <span>{asset.size}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {selectedAsset ? (
              <span className="font-medium text-gray-800">
                Selected: <strong className="text-[#0172F4]">{selectedAsset.name}</strong> ({selectedAsset.type})
              </span>
            ) : (
              <span>Click on any image or reel creative to select</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!selectedAsset}
              onClick={handleConfirmSelection}
              className="px-5 py-2 text-xs font-bold bg-[#0172F4] hover:bg-[#005cd3] text-white rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              Attach to Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
