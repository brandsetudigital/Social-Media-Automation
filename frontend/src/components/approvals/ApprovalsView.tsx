import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Shield,
  Clock,
  Sparkles,
  RefreshCw,
  X,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Calendar,
  Send,
  ExternalLink,
  ChevronRight,
  Eye,
  Layers,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Globe,
  Play,
  Film,
  Trash2,
} from 'lucide-react';
import { CreatePostModal } from '../posts/CreatePostModal';

const isVideoMedia = (url?: string | null, type?: string | null): boolean => {
  if (type === 'REEL' || type === 'VIDEO' || type === 'STORY') return true;
  if (!url) return false;
  if (url === '/sample_reel.mp4') return true;
  if (url.startsWith('data:video/')) return true;
  const clean = url.toLowerCase().split('?')[0];
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mkv') ||
    clean.endsWith('.ogg') ||
    (clean.includes('/uploads/') && clean.includes('video'))
  );
};

interface ApprovalsViewProps {}

export const ApprovalsView: React.FC<ApprovalsViewProps> = () => {
  const { role } = useAuth();
  const { clients, selectedClientId, setSelectedClientId } = useClients();

  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'DRAFT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('ALL');
  const [filterClient, setFilterClient] = useState(selectedClientId);

  // Changes Request Modal
  const [changesModalItem, setChangesModalItem] = useState<any | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Post Details / Preview Modal
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  // Create Post Modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const activeCid = filterClient !== 'ALL' ? filterClient : undefined;
      const [inboxItems, pendingItems] = await Promise.all([
        api.getContentInbox({ clientId: activeCid }).catch(() => []),
        api.getPendingApprovals(activeCid).catch(() => []),
      ]);

      console.log('✅ [Admin Hub] Content items loaded:', inboxItems.length);
      console.log('✅ [Admin Hub] Pending approvals loaded:', pendingItems.length);

      setAllPosts(inboxItems);
      setPendingApprovals(pendingItems);
    } catch (err) {
      console.error('❌ [Admin Hub] Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterClient]);

  // Actions
  const handleApprove = async (item: any, mode: 'IMMEDIATE' | 'SCHEDULED' = 'IMMEDIATE') => {
    try {
      const res = await api.approveContent(item.id, 'Approved directly by Admin', mode);
      if (mode === 'IMMEDIATE') {
        if (res.status === 'FAILED' || res.error || (res.message && res.message.toLowerCase().includes('failed'))) {
          setActionSuccess(`⚠️ Approved, but Live Publishing Failed: ${res.message || res.error || 'Check account permissions'}`);
        } else {
          setActionSuccess(`🎉 Live Published! "${item.title || 'Post'}" published live across channels.`);
        }
      } else {
        setActionSuccess(`Approved "${item.title || 'Post'}"! Content is scheduled in the calendar.`);
      }
      setTimeout(() => setActionSuccess(null), 6000);
      await fetchData();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handlePublishNow = async (item: any) => {
    try {
      const res = await api.publishNow(item.id);
      if (res.success) {
        setActionSuccess(`🎉 Published live successfully to connected channels!`);
      } else {
        setActionSuccess(`⚠️ Publishing attempt failed: ${res.message || 'Check platform permissions'}`);
      }
      setTimeout(() => setActionSuccess(null), 6000);
      await fetchData();
    } catch (err: any) {
      alert(`Publishing failed: ${err.message}`);
    }
  };

  const handleSubmitChanges = async () => {
    if (!changesModalItem || !feedbackComment.trim()) {
      alert('Please provide feedback comments explaining what to change.');
      return;
    }

    try {
      await api.requestChanges(changesModalItem.id, feedbackComment);
      setActionSuccess(`Requested changes on "${changesModalItem.title || 'Post'}". SMM notified.`);
      setTimeout(() => setActionSuccess(null), 4000);
      setChangesModalItem(null);
      setFeedbackComment('');
      await fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleReject = async (item: any) => {
    const reason = prompt(`Please enter rejection reason for "${item.title || 'Post'}":`);
    if (reason === null) return;

    try {
      await api.rejectContent(item.id, reason || 'Rejected by Admin');
      setActionSuccess(`Rejected "${item.title || 'Post'}".`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeletePost = async (post: any) => {
    const postTitle = post.title || 'this content';
    const ok = window.confirm(`Are you sure you want to delete "${postTitle}"? This will permanently remove it from the system.`);
    if (!ok) return;

    try {
      await api.deleteContentItem(post.id);
      setActionSuccess(`"${postTitle}" was deleted successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      if (previewItem?.id === post.id) setPreviewItem(null);
      await fetchData();
    } catch (err: any) {
      alert(`Failed to delete: ${err?.message || 'Server error'}`);
    }
  };

  // Filter calculation
  const pendingCount = allPosts.filter(
    (p) => p.status === 'READY_FOR_APPROVAL' || p.status === 'PENDING' || p.approvalRequests?.some((r: any) => r.status === 'PENDING')
  ).length;

  const scheduledCount = allPosts.filter((p) => p.status === 'SCHEDULED').length;
  const publishedCount = allPosts.filter((p) => p.status === 'PUBLISHED').length;
  const failedCount = allPosts.filter((p) => p.status === 'FAILED').length;
  const draftCount = allPosts.filter((p) => p.status === 'DRAFT').length;

  const filteredPosts = allPosts.filter((post) => {
    // Tab filter
    if (activeTab === 'PENDING') {
      const isPending =
        post.status === 'READY_FOR_APPROVAL' ||
        post.status === 'PENDING' ||
        post.approvalRequests?.some((r: any) => r.status === 'PENDING');
      if (!isPending) return false;
    } else if (activeTab === 'SCHEDULED' && post.status !== 'SCHEDULED') {
      return false;
    } else if (activeTab === 'PUBLISHED' && post.status !== 'PUBLISHED') {
      return false;
    } else if (activeTab === 'FAILED' && post.status !== 'FAILED') {
      return false;
    } else if (activeTab === 'DRAFT' && post.status !== 'DRAFT') {
      return false;
    }

    // Platform filter
    if (filterPlatform !== 'ALL') {
      const hasPlat =
        post.variants?.some((v: any) => v.platform === filterPlatform) ||
        post.scheduledPosts?.some((sp: any) => sp.platform === filterPlatform);
      if (!hasPlat) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title?.toLowerCase().includes(q);
      const matchClient = post.client?.businessName?.toLowerCase().includes(q);
      const matchVariant = post.variants?.some((v: any) => v.caption?.toLowerCase().includes(q) || v.hashtags?.toLowerCase().includes(q));
      if (!matchTitle && !matchClient && !matchVariant) return false;
    }

    return true;
  });

  const platformIcon = (p: string) => {
    switch (p) {
      case 'INSTAGRAM':
        return <Instagram className="w-3.5 h-3.5 text-pink-600" />;
      case 'FACEBOOK':
        return <Facebook className="w-3.5 h-3.5 text-blue-600" />;
      case 'LINKEDIN':
        return <Linkedin className="w-3.5 h-3.5 text-blue-700" />;
      case 'TWITTER':
        return <Twitter className="w-3.5 h-3.5 text-sky-500" />;
      case 'YOUTUBE':
        return <Youtube className="w-3.5 h-3.5 text-red-600" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Admin Content Approval & Operations Hub</h2>
            <span className="text-[10px] font-bold bg-blue-50 text-[#0172F4] px-2 py-0.5 rounded-full border border-blue-200">
              Admin Master Gate
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time management for all client posts: Review pending creative requests, approve schedules, and track live publications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="px-3.5 py-2 text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-xs font-semibold bg-[#0172F4] hover:bg-[#005cd3] text-white rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create & Schedule Post</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {/* Overview Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setActiveTab('ALL')}
          className={`bg-white rounded-xl p-4 border transition cursor-pointer hover:shadow-sm ${
            activeTab === 'ALL' ? 'border-[#0172F4] ring-2 ring-[#0172F4]/20' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">All Content</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{allPosts.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0172F4] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Across all connected brands</p>
        </div>

        <div
          onClick={() => setActiveTab('PENDING')}
          className={`bg-white rounded-xl p-4 border transition cursor-pointer hover:shadow-sm ${
            activeTab === 'PENDING' ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-800 font-bold flex items-center gap-1">
                <span>Pending Approval</span>
                {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{pendingCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-2">Requires your review</p>
        </div>

        <div
          onClick={() => setActiveTab('SCHEDULED')}
          className={`bg-white rounded-xl p-4 border transition cursor-pointer hover:shadow-sm ${
            activeTab === 'SCHEDULED' ? 'border-purple-400 ring-2 ring-purple-400/20' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-700 font-semibold">Scheduled Posts</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{scheduledCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Ready in calendar queue</p>
        </div>

        <div
          onClick={() => setActiveTab('PUBLISHED')}
          className={`bg-white rounded-xl p-4 border transition cursor-pointer hover:shadow-sm ${
            activeTab === 'PUBLISHED' ? 'border-emerald-400 ring-2 ring-emerald-400/20' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700 font-semibold">Published Posts</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{publishedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Live on social channels</p>
        </div>

        <div
          onClick={() => setActiveTab('FAILED')}
          className={`bg-white rounded-xl p-4 border transition cursor-pointer hover:shadow-sm ${
            activeTab === 'FAILED' ? 'border-rose-500 ring-2 ring-rose-400/20' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-rose-700 font-semibold flex items-center gap-1">
                <span>Failed Posts</span>
                {failedCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
              </p>
              <p className="text-2xl font-bold text-rose-700 mt-0.5">{failedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-rose-500 font-medium mt-2">
            {failedCount > 0 ? 'Click to inspect & retry' : 'No failed posts'}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
          {[
            { id: 'ALL', label: 'All Posts', count: allPosts.length },
            { id: 'PENDING', label: 'Pending Approval', count: pendingCount, highlight: pendingCount > 0 },
            { id: 'SCHEDULED', label: 'Scheduled', count: scheduledCount },
            { id: 'PUBLISHED', label: 'Published', count: publishedCount },
            { id: 'FAILED', label: 'Failed', count: failedCount, highlight: failedCount > 0 },
            { id: 'DRAFT', label: 'Drafts', count: draftCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  tab.highlight
                    ? 'bg-amber-100 text-amber-800 font-bold'
                    : 'bg-gray-200/70 text-gray-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4] w-40 sm:w-52"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Brand Filter */}
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 font-medium focus:outline-none"
          >
            <option value="ALL">All Brands</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName}
              </option>
            ))}
          </select>

          {/* Platform Filter */}
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 font-medium focus:outline-none"
          >
            <option value="ALL">All Platforms</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="TWITTER">X / Twitter</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="GOOGLE_BUSINESS">Google Business</option>
          </select>
        </div>
      </div>

      {/* Content List Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200">
          <RefreshCw className="w-8 h-8 text-[#0172F4] animate-spin mb-2" />
          <p className="text-xs text-gray-500 font-medium">Loading posts across brands...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-200 shadow-xs flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0172F4] flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-900">No Posts Match Filter</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            {activeTab === 'PENDING'
              ? 'No posts currently waiting for Admin approval. All caught up!'
              : 'There are no posts for the selected filters. Click "+ Create & Schedule Post" to create new content.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 text-xs font-semibold bg-[#0172F4] hover:bg-[#005cd3] text-white rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Post</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => {
            const isPending =
              post.status === 'READY_FOR_APPROVAL' ||
              post.status === 'PENDING' ||
              post.approvalRequests?.some((r: any) => r.status === 'PENDING');

            const schedDate = post.scheduledPosts?.[0]?.scheduledAt
              ? new Date(post.scheduledPosts[0].scheduledAt)
              : null;

            const targetPlatforms = post.variants?.map((v: any) => v.platform) || ['INSTAGRAM', 'FACEBOOK'];

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Media Header */}
                  <div
                    onClick={() => setPreviewItem(post)}
                    className="h-56 w-full bg-slate-900 relative overflow-hidden group cursor-pointer flex items-center justify-center"
                  >
                    {isVideoMedia(post.mediaUrl, post.contentType) ? (
                      <div className="w-full h-full relative flex items-center justify-center bg-black">
                        <video
                          src={post.mediaUrl || '/sample_reel.mp4'}
                          poster={post.thumbnailUrl || undefined}
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-300"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        {/* Fallback image poster if video fails to load or is buffering */}
                        <img
                          src={
                            post.thumbnailUrl ||
                            'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80'
                          }
                          alt=""
                          className="w-full h-full object-cover object-top absolute inset-0 -z-10 group-hover:scale-105 transition duration-300"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80';
                          }}
                        />
                        {/* Play button overlay & reel indicator */}
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/40 transition">
                          <div className="w-10 h-10 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                            <Play className="w-5 h-5 fill-current ml-0.5 text-gray-900" />
                          </div>
                        </div>
                        <span className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs z-20">
                          <Film className="w-3 h-3 text-purple-400" /> Video Reel
                        </span>
                      </div>
                    ) : (
                      <img
                        src={
                          post.thumbnailUrl ||
                          post.mediaUrl ||
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80'
                        }
                        alt=""
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                    )}

                    {/* Subtle top gradient shadow for badge contrast */}
                    <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/50 via-black/10 to-transparent pointer-events-none z-10" />

                    {/* Brand Pill */}
                    <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs z-20">
                      {post.client?.businessName || 'BrandSetu Digital'}
                    </span>

                    {/* Status Pill */}
                    <span
                      className={`absolute top-2 right-2 backdrop-blur-xs text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs z-20 ${
                        isPending
                          ? 'bg-amber-500 text-white animate-pulse'
                          : post.status === 'SCHEDULED'
                          ? 'bg-purple-600 text-white'
                          : post.status === 'PUBLISHED'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-700 text-white'
                      }`}
                    >
                      {isPending ? 'PENDING APPROVAL' : post.status}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-semibold">
                        {post.contentType}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {targetPlatforms.map((p: string, idx: number) => (
                          <span key={idx} title={p}>
                            {platformIcon(p)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-1">
                      {post.title}
                    </h3>

                    {post.variants?.[0]?.caption && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {post.variants[0].caption}
                      </p>
                    )}

                    {post.status === 'FAILED' ? (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-rose-900">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Publishing Failed</span>
                        </div>
                        <p className="text-[11px] text-rose-700 leading-normal">
                          {post.scheduledPosts?.[0]?.lastError || post.lastError || 'Publishing attempt timed out. Click Retry Publish to post live.'}
                        </p>
                      </div>
                    ) : schedDate ? (
                      <div className="flex items-center gap-1.5 text-xs text-purple-700 font-semibold bg-purple-50 p-2 rounded-lg border border-purple-100">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Scheduled for {schedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at{' '}
                          {schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400">
                        Created on {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 border-t border-gray-100 bg-gray-50/60 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setPreviewItem(post)}
                      className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-500" />
                      <span>Preview Post</span>
                    </button>
                    <button
                      onClick={() => handleDeletePost(post)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                      title="Delete Post"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isPending ? (
                    <div className="grid grid-cols-3 gap-1.5 w-full">
                      <button
                        onClick={() => setChangesModalItem(post)}
                        className="py-2 px-1 text-xs font-semibold border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl transition flex items-center justify-center gap-1 min-w-0"
                        title="Request creative revisions"
                      >
                        <MessageSquare className="w-3 h-3 text-amber-700 shrink-0" />
                        <span className="truncate">Changes</span>
                      </button>

                      <button
                        onClick={() => handleApprove(post, 'SCHEDULED')}
                        className="py-2 px-1 text-xs font-semibold border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0172F4] rounded-xl transition flex items-center justify-center gap-1 min-w-0"
                        title="Approve and queue in Calendar"
                      >
                        <Calendar className="w-3 h-3 text-[#0172F4] shrink-0" />
                        <span className="truncate">Schedule</span>
                      </button>

                      <button
                        onClick={() => handleApprove(post, 'IMMEDIATE')}
                        className="py-2 px-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center justify-center gap-1 shadow-sm shadow-emerald-600/20 min-w-0"
                        title="Approve and publish live immediately to social channels"
                      >
                        <Send className="w-3 h-3 shrink-0" />
                        <span className="truncate">Publish</span>
                      </button>
                    </div>
                  ) : post.status === 'FAILED' ? (
                    <button
                      onClick={() => handlePublishNow(post)}
                      className="w-full py-2 px-3 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                      title="Retry publishing this creative now"
                    >
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                      <span>Retry Publish Now</span>
                    </button>
                  ) : post.status === 'SCHEDULED' ? (
                    <button
                      onClick={() => handlePublishNow(post)}
                      className="w-full py-2 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                      title="Publish this scheduled post live immediately"
                    >
                      <Send className="w-3.5 h-3.5 shrink-0" />
                      <span>Publish Live Now</span>
                    </button>
                  ) : post.status === 'DRAFT' ? (
                    <button
                      onClick={() => handleApprove(post, 'IMMEDIATE')}
                      className="w-full py-2 px-3 text-xs font-semibold bg-blue-50 text-[#0172F4] hover:bg-blue-100 border border-blue-200 rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Approve & Publish</span>
                    </button>
                  ) : (
                    <div className="w-full py-1.5 px-3 text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Live Published</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Request Changes */}
      {changesModalItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-gray-900 text-base">Request Creative Changes</h3>
              </div>
              <button
                onClick={() => setChangesModalItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-gray-600">
                Post: <strong className="text-gray-900">{changesModalItem.title}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Explain clearly what the SMM needs to fix (e.g. caption adjustments, alternative image, hashtag update).
              </p>
            </div>

            <textarea
              rows={4}
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="e.g. Please update the discount figure to 25% and add #LimitedTimeOffer in the caption."
              className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setChangesModalItem(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitChanges}
                className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition shadow-xs"
              >
                Send Feedback to SMM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Full Post Preview */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0172F4] bg-blue-50 px-2 py-0.5 rounded-md">
                  {previewItem.client?.businessName || 'BrandSetu Digital'}
                </span>
                <span className="text-xs font-bold text-gray-500">•</span>
                <span className="text-xs font-mono font-semibold text-gray-600">{previewItem.contentType}</span>
              </div>
              <button onClick={() => setPreviewItem(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-gray-200 bg-black max-h-96 flex items-center justify-center relative">
              {isVideoMedia(previewItem.mediaUrl, previewItem.contentType) ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-black">
                  <video
                    src={previewItem.mediaUrl || '/sample_reel.mp4'}
                    poster={previewItem.thumbnailUrl || undefined}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-96 w-full object-contain bg-black"
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              ) : (
                <img
                  src={
                    previewItem.thumbnailUrl ||
                    previewItem.mediaUrl ||
                    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
                  }
                  alt=""
                  className="max-h-96 w-auto object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
                  }}
                />
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-gray-900">{previewItem.title}</h3>
              {previewItem.variants?.[0]?.caption && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {previewItem.variants[0].caption}
                </div>
              )}
              {previewItem.variants?.[0]?.hashtags && (
                <p className="text-xs text-[#0172F4] font-medium">{previewItem.variants[0].hashtags}</p>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              <button
                onClick={() => handleDeletePost(previewItem)}
                className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Delete this post permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Post</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setPreviewItem(null);
                    handleApprove(previewItem);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Approve Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={fetchData}
      />
    </div>
  );
};
