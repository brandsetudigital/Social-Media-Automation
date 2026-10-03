import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
import { ContentItem, ContentStatus, ContentType } from '../../types';
import {
  Inbox,
  Sparkles,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HardDrive,
  Share2,
  Calendar,
  X,
  Send,
  Save,
  Check,
  RefreshCw,
  Eye,
  FileText,
  UploadCloud,
  Plus,
  Zap,
  Trash2,
} from 'lucide-react';

export const ContentInboxView: React.FC = () => {
  const { role } = useAuth();
  const { selectedClientId, clients } = useClients();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Review Drawer State
  const [reviewingItem, setReviewingItem] = useState<ContentItem | null>(null);
  const [drawerData, setDrawerData] = useState({
    title: '',
    contentType: 'POST' as ContentType,
    platforms: ['INSTAGRAM', 'FACEBOOK'] as string[],
    caption: '',
    hashtags: '',
    cta: '',
  });

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

const getTodayDateStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTimeStr = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

  // Direct / Manual Creative Upload State (for SMM when creative is not from Drive)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    clientId: selectedClientId !== 'ALL' ? selectedClientId : (clients[0]?.id || ''),
    title: '',
    contentType: 'POST' as ContentType,
    mediaUrl: '',
    platforms: ['INSTAGRAM', 'FACEBOOK', 'GOOGLE_BUSINESS'] as string[],
    caption: '',
    hashtags: '',
    publishMode: 'SCHEDULED' as 'IMMEDIATE' | 'SCHEDULED',
    scheduledDate: getTodayDateStr(),
    scheduledTime: getCurrentTimeStr(),
    aiModelUsed: '',
  });
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result as string;
        setFilePreview(base64Url);
        setUploadData((prev) => ({
          ...prev,
          mediaUrl: base64Url,
          title: prev.title || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualCreate = async (submitForApproval: boolean) => {
    if (!uploadData.clientId || !uploadData.title || !uploadData.mediaUrl) {
      alert('Please choose a client, enter a creative title, and provide or upload a creative image/video.');
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledAt = uploadData.publishMode === 'SCHEDULED'
        ? `${uploadData.scheduledDate}T${uploadData.scheduledTime}:00`
        : null;

      await api.createManualContent({
        clientId: uploadData.clientId,
        title: uploadData.title,
        contentType: uploadData.contentType,
        mediaUrl: uploadData.mediaUrl,
        thumbnailUrl: uploadData.mediaUrl,
        platforms: uploadData.platforms,
        caption: uploadData.caption,
        hashtags: uploadData.hashtags,
        publishMode: uploadData.publishMode,
        scheduledAt,
        submitForApproval,
      });

      const schedMsg = uploadData.publishMode === 'SCHEDULED'
        ? `Creative submitted for Admin Approval! (Target: ${new Date(scheduledAt!).toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${uploadData.scheduledTime} across ${uploadData.platforms.join(', ')})`
        : `Creative submitted for Admin Approval! (Will publish immediately upon approval across all accounts)`;

      setActionSuccess(submitForApproval ? schedMsg : 'Creative saved as draft in Content Inbox.');
      setTimeout(() => setActionSuccess(null), 5000);
      setShowUploadModal(false);
      setFilePreview(null);
      setUploadData({
        clientId: selectedClientId !== 'ALL' ? selectedClientId : (clients[0]?.id || ''),
        title: '',
        contentType: 'POST',
        mediaUrl: '',
        platforms: ['INSTAGRAM', 'FACEBOOK', 'GOOGLE_BUSINESS'],
        caption: '',
        hashtags: '',
        publishMode: 'SCHEDULED',
        scheduledDate: getTodayDateStr(),
        scheduledTime: getCurrentTimeStr(),
        aiModelUsed: '',
      });
      await fetchItems();
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateManualAICaption = async () => {
    if (!uploadData.clientId) return;
    setIsGeneratingAI(true);
    try {
      const [captionRes, hashtagRes] = await Promise.all([
        api.generateAICaption({
          clientId: uploadData.clientId,
          contentType: uploadData.contentType,
          platform: (uploadData.platforms[0] as any) || 'INSTAGRAM',
          topic: uploadData.title || 'Special Feature Spotlight',
          mediaUrl: uploadData.mediaUrl || undefined,
        }),
        api.generateAIHashtags(uploadData.clientId, uploadData.title || 'Special Feature Spotlight'),
      ]);

      setUploadData((prev) => ({
        ...prev,
        caption: captionRes.caption,
        hashtags: hashtagRes.hashtags || captionRes.hashtags || prev.hashtags,
        aiModelUsed: captionRes.aiModelUsed,
      }));
    } catch (err: any) {
      alert(`AI error: ${err.message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const data = await api.getContentInbox({
        clientId: selectedClientId !== 'ALL' ? selectedClientId : undefined,
        status: selectedStatus,
        contentType: selectedType,
        search: searchQuery || undefined,
      });
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedClientId, selectedStatus, selectedType, searchQuery]);

  const openReviewDrawer = (item: ContentItem) => {
    setReviewingItem(item);
    const existingVariant = item.variants?.[0];
    const platforms = item.variants?.map((v) => v.platform) || ['INSTAGRAM', 'FACEBOOK'];

    setDrawerData({
      title: item.title,
      contentType: item.contentType,
      platforms: platforms.length > 0 ? platforms : ['INSTAGRAM', 'FACEBOOK'],
      caption: existingVariant?.caption || '',
      hashtags: existingVariant?.hashtags || item.client?.brandProfile?.hashtags || '',
      cta: existingVariant?.cta || item.client?.brandProfile?.preferredCta || '',
    });
  };

  const handleGenerateAICaption = async () => {
    if (!reviewingItem) return;
    setIsGeneratingAI(true);
    try {
      const targetPlatform = drawerData.platforms[0] || 'INSTAGRAM';
      const res = await api.generateAICaption({
        clientId: reviewingItem.clientId,
        contentType: drawerData.contentType,
        platform: targetPlatform,
        topic: drawerData.title,
      });

      setDrawerData((prev) => ({
        ...prev,
        caption: res.caption,
        hashtags: res.hashtags || prev.hashtags,
        cta: res.cta || prev.cta,
      }));
    } catch (err: any) {
      alert(`AI Generation error: ${err.message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGenerateAIHashtags = async () => {
    if (!reviewingItem) return;
    setIsGeneratingAI(true);
    try {
      const res = await api.generateAIHashtags(reviewingItem.clientId, drawerData.title);
      setDrawerData((prev) => ({ ...prev, hashtags: res.hashtags }));
    } catch (err: any) {
      alert(`Hashtags error: ${err.message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveOrSubmit = async (submitForApproval: boolean) => {
    if (!reviewingItem) return;
    setIsSubmitting(true);
    try {
      await api.reviewContent(reviewingItem.id, {
        title: drawerData.title,
        contentType: drawerData.contentType,
        platforms: drawerData.platforms,
        caption: drawerData.caption,
        hashtags: drawerData.hashtags,
        cta: drawerData.cta,
        submitForApproval,
      });

      setActionSuccess(
        submitForApproval
          ? 'Submitted for Admin Approval! Item moved to Approval Queue.'
          : 'Draft saved successfully.'
      );
      setTimeout(() => setActionSuccess(null), 4000);
      setReviewingItem(null);
      await fetchItems();
    } catch (err: any) {
      alert(`Action error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContent = async (id: string, title?: string) => {
    const ok = window.confirm(`Are you sure you want to delete "${title || 'this creative'}"? This cannot be undone.`);
    if (!ok) return;

    try {
      await api.deleteContentItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (reviewingItem?.id === id) setReviewingItem(null);
      setActionSuccess(`"${title || 'Creative'}" was deleted successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchItems();
    } catch (err: any) {
      alert(`Failed to delete creative: ${err?.message || 'Server error'}`);
    }
  };

  const togglePlatform = (p: string) => {
    setDrawerData((prev) => {
      const exists = prev.platforms.includes(p);
      return {
        ...prev,
        platforms: exists ? prev.platforms.filter((x) => x !== p) : [...prev.platforms, p],
      };
    });
  };

  const statusTabs = [
    { id: 'ALL', label: 'All Content' },
    { id: 'DRAFT', label: 'Drafts', count: items.filter((i) => i.status === 'DRAFT').length },
    { id: 'NEW', label: 'New Creatives', count: items.filter((i) => i.status === 'NEW').length },
    { id: 'READY_FOR_APPROVAL', label: 'Pending Approval' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'SCHEDULED', label: 'Scheduled' },
    { id: 'PUBLISHED', label: 'Published' },
    { id: 'FAILED', label: 'Failed' },
  ];

  const getStatusBadge = (status: ContentStatus) => {
    switch (status) {
      case 'DRAFT':
        return <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">DRAFT</span>;
      case 'NEW':
        return <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">NEW CREATIVE</span>;
      case 'READY_FOR_APPROVAL':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">APPROVAL PENDING</span>;
      case 'APPROVED':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">APPROVED ✓</span>;
      case 'SCHEDULED':
        return <span className="bg-brand-500/20 text-brand-300 border border-brand-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">SCHEDULED</span>;
      case 'PUBLISHED':
        return <span className="bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded-full text-[10px] font-bold">PUBLISHED</span>;
      case 'FAILED':
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">FAILED</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-cyan-400" />
            Content Inbox & Creative Review Hub
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Drive uploads enter here as "Creative Available". Review, assign platforms, generate AI captions using Client Brand Knowledge, and submit for Admin approval.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              setUploadData((prev) => ({
                ...prev,
                clientId: selectedClientId !== 'ALL' ? selectedClientId : (clients[0]?.id || ''),
              }));
              setShowUploadModal(true);
            }}
            className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 hover:opacity-95 text-white px-4 py-2 rounded-xl shadow-lg shadow-brand-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            + Upload Creative (Device / Direct)
          </button>

          <button
            onClick={fetchItems}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 px-3.5 py-2 rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            Refresh Inbox
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedStatus === tab.id
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] bg-cyan-400 text-slate-950 px-1.5 py-0.2 rounded-full font-black">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Content Types</option>
            <option value="POST">Posts</option>
            <option value="REEL">Reels</option>
            <option value="STORY">Stories</option>
            <option value="GOOGLE_BUSINESS_POST">Google Business</option>
          </select>

          <input
            type="text"
            placeholder="Search creatives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 w-44"
          />
        </div>
      </div>

      {/* Creative Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl text-slate-500 text-xs">
          No content items found matching the current filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="glass-card rounded-2xl overflow-hidden border border-slate-800 flex flex-col justify-between group hover:border-slate-700 transition"
            >
              {/* Media Preview Thumbnail */}
              <div className="relative aspect-square bg-slate-950 overflow-hidden">
                <img
                  src={item.thumbnailUrl || item.mediaUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold bg-slate-950/80 backdrop-blur-md text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-md">
                    {item.contentType}
                  </span>
                  {item.source === 'DRIVE' && (
                    <span className="text-[9px] bg-slate-900/90 text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <HardDrive className="w-2.5 h-2.5 text-cyan-400" /> Drive
                    </span>
                  )}
                </div>

                <div className="absolute top-2 right-2">
                  {getStatusBadge(item.status)}
                </div>
              </div>

              {/* Body Info */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-brand-400 block truncate">
                    {item.client?.businessName}
                  </span>
                  <h4 className="text-xs font-bold text-white line-clamp-1 mt-0.5">{item.title}</h4>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDeleteContent(item.id, item.title)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/60 transition cursor-pointer"
                      title="Delete Creative"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openReviewDrawer(item)}
                      className="flex items-center gap-1 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      Review & Map
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creative Review & Mapping Drawer / Modal */}
      {reviewingItem && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-3xl w-full rounded-2xl border border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Content Review & Platform Mapping</h3>
                  <p className="text-[11px] text-slate-400">
                    Client: <strong className="text-slate-200">{reviewingItem.client?.businessName}</strong> • Source: Google Drive
                  </p>
                </div>
              </div>
              <button onClick={() => setReviewingItem(null)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body (2-Column Scrollable) */}
            <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 flex-1">
              {/* Left Column: Creative Media Preview */}
              <div className="md:col-span-5 space-y-3">
                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-square flex items-center justify-center">
                  <img
                    src={reviewingItem.mediaUrl}
                    alt={reviewingItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Content Type:</span>
                    <strong className="text-cyan-400">{drawerData.contentType}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Aspect Ratio:</span>
                    <span className="text-slate-300 font-mono">{reviewingItem.aspectRatio || '1:1'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Drive File:</span>
                    <span className="text-slate-300 truncate max-w-[140px] font-mono">
                      {reviewingItem.driveFile?.filename || 'Uploaded Creative'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Platform Assignment & AI Copy */}
              <div className="md:col-span-7 space-y-4 text-xs">
                {/* Title */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Campaign / Creative Title</label>
                  <input
                    type="text"
                    value={drawerData.title}
                    onChange={(e) => setDrawerData({ ...drawerData, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>

                {/* Target Platforms */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Target Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {['INSTAGRAM', 'FACEBOOK', 'GOOGLE_BUSINESS'].map((plat) => {
                      const isSelected = drawerData.platforms.includes(plat);
                      return (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => togglePlatform(plat)}
                          className={`px-3 py-1.5 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition ${
                            isSelected
                              ? 'bg-brand-600/30 border-brand-500 text-brand-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Check className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                          {plat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Caption Field with AI Button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Post Caption</label>
                    <button
                      type="button"
                      onClick={handleGenerateAICaption}
                      disabled={isGeneratingAI}
                      className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isGeneratingAI ? 'AI Writing...' : 'AI Generate with Brand Knowledge'}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={drawerData.caption}
                    onChange={(e) => setDrawerData({ ...drawerData, caption: e.target.value })}
                    placeholder="Write or AI generate caption tailored to this client's brand tone & audience..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white leading-relaxed focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                {/* Hashtags Field with AI Button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Hashtags</label>
                    <button
                      type="button"
                      onClick={handleGenerateAIHashtags}
                      disabled={isGeneratingAI}
                      className="text-[11px] font-bold text-brand-400 hover:text-brand-300"
                    >
                      # AI Hashtags
                    </button>
                  </div>
                  <input
                    type="text"
                    value={drawerData.hashtags}
                    onChange={(e) => setDrawerData({ ...drawerData, hashtags: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-brand-300 font-mono text-[11px]"
                  />
                </div>

                {/* Call to Action */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Preferred Call to Action (CTA)</label>
                  <input
                    type="text"
                    value={drawerData.cta}
                    onChange={(e) => setDrawerData({ ...drawerData, cta: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteContent(reviewingItem.id, reviewingItem.title)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-800/60 text-rose-300 text-xs font-semibold transition cursor-pointer"
                title="Delete this creative"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSaveOrSubmit(false)}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveOrSubmit(true)}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-brand-500/20 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Submitting...' : 'Submit for Admin Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct / Manual Creative Upload Modal (for SMM when not from Drive) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full rounded-2xl border border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Direct Creative Upload (Manual / Device)</h3>
                  <p className="text-[11px] text-slate-400">
                    Upload image or video directly from your computer without waiting for Google Drive sync.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setFilePreview(null);
                }}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Client Selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Client Business *</label>
                <select
                  value={uploadData.clientId}
                  onChange={(e) => setUploadData({ ...uploadData, clientId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-semibold"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} ({c.location.split(',')[0]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Creative Media Picker (File Upload or URL) */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <label className="block text-slate-300 font-semibold">Creative Asset (Image or Video) *</label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Upload from Computer:</label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleLocalFileChange}
                      className="w-full text-[11px] text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Or Paste Creative URL:</label>
                    <input
                      type="url"
                      value={uploadData.mediaUrl.startsWith('data:') ? '' : uploadData.mediaUrl}
                      onChange={(e) => {
                        setUploadData({ ...uploadData, mediaUrl: e.target.value });
                        setFilePreview(e.target.value);
                      }}
                      placeholder="https://example.com/creative.jpg"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Preview Box */}
                {(filePreview || uploadData.mediaUrl) && (
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850 flex items-center gap-3">
                    <img
                      src={filePreview || uploadData.mediaUrl}
                      alt="Upload Preview"
                      className="w-16 h-16 rounded-lg object-cover border border-slate-800 shrink-0"
                    />
                    <div className="text-[11px] text-slate-400">
                      <span className="font-semibold text-emerald-400 block">✓ Creative Attached</span>
                      <span className="text-slate-500 font-mono text-[10px]">Ready for SMM captioning & approval</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Content Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Creative Title *</label>
                  <input
                    type="text"
                    required
                    value={uploadData.title}
                    onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                    placeholder="e.g. Festive Special Offer or Batch Launch"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Content Type</label>
                  <select
                    value={uploadData.contentType}
                    onChange={(e) => setUploadData({ ...uploadData, contentType: e.target.value as ContentType })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                  >
                    <option value="POST">POST (Square / Feed)</option>
                    <option value="REEL">REEL (Vertical 9:16)</option>
                    <option value="STORY">STORY (Vertical 9:16)</option>
                    <option value="GOOGLE_BUSINESS_POST">GOOGLE BUSINESS POST</option>
                  </select>
                </div>
              </div>

              {/* Target Platforms */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Target Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {['INSTAGRAM', 'FACEBOOK', 'GOOGLE_BUSINESS'].map((plat) => {
                    const isSelected = uploadData.platforms.includes(plat);
                    return (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => {
                          setUploadData((prev) => ({
                            ...prev,
                            platforms: prev.platforms.includes(plat)
                              ? prev.platforms.filter((p) => p !== plat)
                              : [...prev.platforms, plat],
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-brand-600/30 border-brand-500 text-brand-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                        {plat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Caption with AI Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <label className="text-slate-300 font-semibold">Post Caption</label>
                    {uploadData.aiModelUsed && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                        ⚡ {uploadData.aiModelUsed}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateManualAICaption}
                    disabled={isGeneratingAI}
                    className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isGeneratingAI ? 'AI Writing via Gemini/ChatGPT...' : '⚡ Generate via AI Studio'}
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={uploadData.caption}
                  onChange={(e) => setUploadData({ ...uploadData, caption: e.target.value })}
                  placeholder="Write or AI generate caption using client's brand tone, audience, and USP..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white leading-relaxed focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Hashtags</label>
                <input
                  type="text"
                  value={uploadData.hashtags}
                  onChange={(e) => setUploadData({ ...uploadData, hashtags: e.target.value })}
                  placeholder="#BrandSetu #BestInTown"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-brand-300 font-mono text-[11px]"
                />
              </div>

              {/* Publishing Schedule Choice */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <label className="block text-slate-200 font-bold text-xs flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-400" />
                  Publishing & Scheduling Timeline
                </label>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setUploadData({ ...uploadData, publishMode: 'IMMEDIATE' })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                      uploadData.publishMode === 'IMMEDIATE'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-100">Publish Immediately</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Dispatches to all accounts once Admin approves</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadData({ ...uploadData, publishMode: 'SCHEDULED' })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                      uploadData.publishMode === 'SCHEDULED'
                        ? 'bg-brand-500/15 border-brand-500/50 text-brand-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-100">Schedule for Date</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Select specific date & time</div>
                    </div>
                  </button>
                </div>

                {uploadData.publishMode === 'SCHEDULED' && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 grid grid-cols-2 gap-3 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] text-slate-300 font-semibold mb-1">Target Publishing Date</label>
                      <input
                        type="date"
                        value={uploadData.scheduledDate}
                        onChange={(e) => setUploadData({ ...uploadData, scheduledDate: e.target.value })}
                        min={getTodayDateStr()}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 font-semibold mb-1">Target Publishing Time (IST)</label>
                      <input
                        type="time"
                        value={uploadData.scheduledTime}
                        onChange={(e) => setUploadData({ ...uploadData, scheduledTime: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Workflow: <strong className="text-amber-400">Direct Intake → Admin Review</strong>
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleManualCreate(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleManualCreate(true)}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-brand-500/20"
                >
                  {isSubmitting ? 'Uploading...' : 'Submit for Admin Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
