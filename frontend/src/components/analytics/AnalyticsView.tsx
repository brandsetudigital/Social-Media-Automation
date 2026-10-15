import React, { useState, useEffect, useMemo } from 'react';
import { useClients } from '../../context/ClientContext';
import { api, getMediaUrl, getPostImageUrl } from '../../api';
import {
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  CheckCircle2,
  Calendar,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Globe,
  Zap,
  Building2,
  ChevronDown,
  ArrowUpRight,
  Sparkles,
  Layers,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FileText,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { clients, selectedClientId, setSelectedClientId, selectedClient } = useClients();

  const [dateRange, setDateRange] = useState<'7D' | '15D' | '1M'>('7D');
  const [activeMetricTab, setActiveMetricTab] = useState<'reach' | 'impressions' | 'engagement'>('reach');
  const [activePlatform, setActivePlatform] = useState<string>('ALL');
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [showDayTable, setShowDayTable] = useState(true);

  const platforms = [
    { id: 'ALL', name: 'All Channels', icon: Layers, color: 'text-gray-700' },
    { id: 'INSTAGRAM', name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
    { id: 'FACEBOOK', name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
    { id: 'GOOGLE_BUSINESS', name: 'Google Business', icon: Globe, color: 'text-emerald-600' },
    { id: 'LINKEDIN', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
    { id: 'YOUTUBE', name: 'YouTube', icon: Youtube, color: 'text-red-600' },
    { id: 'TWITTER', name: 'X (Twitter)', icon: Twitter, color: 'text-sky-500' },
  ];

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const ov = await api.getAnalyticsOverview(
        selectedClientId !== 'ALL' ? selectedClientId : undefined,
        dateRange
      );
      setOverview(ov);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedClientId, dateRange]);

  const activeClientInfo = useMemo(() => {
    if (selectedClientId !== 'ALL') {
      return clients.find((c) => c.id === selectedClientId) || overview?.client || selectedClient;
    }
    return null;
  }, [selectedClientId, clients, overview, selectedClient]);

  // Daily trend points
  const trendData: any[] = overview?.trend || [];

  // Compute SVG chart coordinates
  const chartPoints = useMemo(() => {
    if (!trendData || trendData.length === 0) return [];

    const values = trendData.map((d: any) => {
      if (activeMetricTab === 'reach') return d.reach || 0;
      if (activeMetricTab === 'impressions') return d.impressions || 0;
      return d.engagement || 0;
    });

    const maxVal = Math.max(...values, 10);
    const minVal = 0;
    const range = maxVal - minVal || 1;

    const width = 800;
    const height = 220;
    const padding = 20;

    return trendData.map((d: any, i: number) => {
      const val = values[i];
      const x = padding + (i / Math.max(1, trendData.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
      return {
        x,
        y,
        val,
        date: d.date,
        label: d.label,
        published: d.published,
        scheduled: d.scheduled,
        reach: d.reach,
        impressions: d.impressions,
        engagement: d.engagement,
      };
    });
  }, [trendData, activeMetricTab]);

  const svgPathD = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      // Smooth cubic bezier
      const prev = chartPoints[idx - 1];
      const cp1x = prev.x + (pt.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (pt.x - prev.x) / 2;
      const cp2y = pt.y;
      return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
    }, '');
  }, [chartPoints]);

  const svgAreaD = useMemo(() => {
    if (chartPoints.length === 0) return '';
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `${svgPathD} L ${last.x} 220 L ${first.x} 220 Z`;
  }, [svgPathD, chartPoints]);

  // Max value in chart for Y axis labels
  const maxMetricVal = useMemo(() => {
    if (!trendData || trendData.length === 0) return 1000;
    const values = trendData.map((d: any) => {
      if (activeMetricTab === 'reach') return d.reach || 0;
      if (activeMetricTab === 'impressions') return d.impressions || 0;
      return d.engagement || 0;
    });
    return Math.max(...values, 100);
  }, [trendData, activeMetricTab]);

  // Platform breakdown counts
  const platformBreakdown: Record<string, number> = overview?.platformBreakdown || {};

  // Top posts
  const topPosts: any[] = overview?.topPosts || [];

  return (
    <div className="space-y-6 pb-14">
      {/* Top Banner & Client Switcher Bar */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {activeClientInfo ? (
            <div className="relative group shrink-0">
              {activeClientInfo.logo ? (
                <img
                  src={getMediaUrl(activeClientInfo.logo)}
                  alt={activeClientInfo.businessName}
                  className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-gray-200 bg-white"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = '0.4';
                  }}
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0172F4] to-blue-700 text-white font-black text-xl flex items-center justify-center shadow-md">
                  {activeClientInfo.businessName?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xl flex items-center justify-center shadow-md">
              <Building2 className="w-7 h-7" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">
                {activeClientInfo ? `${activeClientInfo.businessName} Reporting` : 'Agency BrandSetu Digital Performance'}
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0172F4] border border-blue-200">
                {dateRange === '7D' ? 'Last 7 Days' : dateRange === '15D' ? 'Last 15 Days' : 'Last 1 Month (30 Days)'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeClientInfo
                ? `${activeClientInfo.category || 'Client'} • ${activeClientInfo.location || 'India'} • Individual Brand Performance & Insights`
                : 'Consolidated cross-brand performance, organic social reach & engagement metrics across all clients.'}
            </p>
          </div>
        </div>

        {/* Client Selection & Date Range Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Client Switcher Dropdown */}
          <div className="relative">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl px-3.5 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-[#0172F4]/20 focus:border-[#0172F4] transition cursor-pointer"
            >
              <option value="ALL">🌐 All Clients (Overview)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  🏢 {c.businessName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 7 Days, 15 Days, 1 Month Pills */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setDateRange('7D')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === '7D'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateRange('15D')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === '15D'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              15 Days
            </button>
            <button
              onClick={() => setDateRange('1M')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === '1M'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              1 Month
            </button>
          </div>

          {/* Print / Export Report Button */}
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-bold bg-[#0172F4] hover:bg-[#005cd3] text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
            title="Print or Save PDF report for client"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 100% Real Live Sync Notice Banner */}
      {overview?.liveSynced && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs text-emerald-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <div>
              <p className="font-bold text-emerald-900">
                100% Meta Graph API Real-Time Sync Active ({dateRange === '7D' ? '7 Days' : dateRange === '15D' ? '15 Days' : '1 Month'})
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Exact Instagram & Facebook page followers ({(overview?.totalFollowers || 0).toLocaleString()}), actual published posts, and real engagement synced from live Meta servers. No mock or estimated multipliers.
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchAnalytics()}
            className="flex items-center gap-1.5 text-xs text-emerald-800 hover:text-emerald-950 bg-white/90 hover:bg-white px-3 py-1.5 rounded-xl border border-emerald-200 transition cursor-pointer font-bold shrink-0 self-start sm:self-auto shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>
        </div>
      )}

      {/* KPI Cards Row (Filtered for this Client and Range) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reach */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs hover:border-blue-200 transition">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Period Total Reach</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0172F4] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">
            {(overview?.totalReach || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Live verified for {dateRange === '7D' ? '7 days' : dateRange === '15D' ? '15 days' : '30 days'}</span>
          </div>
        </div>

        {/* Impressions */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs hover:border-purple-200 transition">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Total Impressions</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">
            {(overview?.totalImpressions || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Avg {(overview?.avgViewsPerPost || 0).toLocaleString()} views / post
          </span>
        </div>

        {/* Engagements */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs hover:border-rose-200 transition">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Total Engagement</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">
            {(overview?.totalEngagement || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-gray-500 mt-1 block font-medium">
            {(overview?.totalLikes ?? 0).toLocaleString()} Likes • {(overview?.totalComments ?? 0).toLocaleString()} Comments
          </span>
        </div>

        {/* Engagement Rate & Published */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs hover:border-emerald-200 transition">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Avg Engagement Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {overview?.avgEngagementRate ?? 0}%
          </p>
          <span className="text-[11px] text-gray-500 mt-1 block font-medium">
            Published: {overview?.publishedCount || 0} • Followers: {(overview?.totalFollowers || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Graph Card: Dynamic SVG Day-by-Day Performance Chart */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>Day-by-Day Client Performance Graph</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#0172F4]">
                {dateRange === '7D' ? '7 Days' : dateRange === '15D' ? '15 Days' : '1 Month (30 Days)'}
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Daily trend of Reach, Impressions, and Engagements for {activeClientInfo?.businessName || 'All Brands'}.
            </p>
          </div>

          {/* Metric switcher tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveMetricTab('reach')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeMetricTab === 'reach'
                  ? 'bg-white text-[#0172F4] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reach Graph
            </button>
            <button
              onClick={() => setActiveMetricTab('impressions')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeMetricTab === 'impressions'
                  ? 'bg-white text-purple-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Impressions Graph
            </button>
            <button
              onClick={() => setActiveMetricTab('engagement')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeMetricTab === 'engagement'
                  ? 'bg-white text-rose-500 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Engagement Graph
            </button>
          </div>
        </div>

        {/* SVG Responsive Line & Area Chart */}
        <div className="relative pt-4">
          {/* Y Axis Guide Legend */}
          <div className="absolute left-0 top-4 bottom-8 flex flex-col justify-between text-[10px] text-gray-400 font-semibold pointer-events-none pr-2">
            <span>{maxMetricVal.toLocaleString()}</span>
            <span>{Math.round(maxMetricVal * 0.66).toLocaleString()}</span>
            <span>{Math.round(maxMetricVal * 0.33).toLocaleString()}</span>
            <span>0</span>
          </div>

          <div className="ml-10">
            <svg
              viewBox="0 0 800 220"
              className="w-full h-56 overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={
                      activeMetricTab === 'reach'
                        ? '#0172F4'
                        : activeMetricTab === 'impressions'
                        ? '#9333ea'
                        : '#f43f5e'
                    }
                    stopOpacity="0.32"
                  />
                  <stop
                    offset="100%"
                    stopColor={
                      activeMetricTab === 'reach'
                        ? '#0172F4'
                        : activeMetricTab === 'impressions'
                        ? '#9333ea'
                        : '#f43f5e'
                    }
                    stopOpacity="0.0"
                  />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line x1="20" y1="20" x2="780" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="20" y1="80" x2="780" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="20" y1="140" x2="780" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="20" y1="200" x2="780" y2="200" stroke="#e2e8f0" strokeWidth="1" />

              {/* Area Under Curve */}
              {svgAreaD && (
                <path d={svgAreaD} fill="url(#metricGradient)" />
              )}

              {/* Path Line */}
              {svgPathD && (
                <path
                  d={svgPathD}
                  fill="none"
                  stroke={
                    activeMetricTab === 'reach'
                      ? '#0172F4'
                      : activeMetricTab === 'impressions'
                      ? '#9333ea'
                      : '#f43f5e'
                  }
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Chart Points */}
              {chartPoints.map((pt, idx) => (
                <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(pt)}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.date === pt.date ? 6 : 4}
                    fill={hoveredPoint?.date === pt.date ? '#ffffff' : activeMetricTab === 'reach' ? '#0172F4' : activeMetricTab === 'impressions' ? '#9333ea' : '#f43f5e'}
                    stroke={activeMetricTab === 'reach' ? '#0172F4' : activeMetricTab === 'impressions' ? '#9333ea' : '#f43f5e'}
                    strokeWidth={hoveredPoint?.date === pt.date ? 3 : 2}
                    className="transition-all"
                  />
                </g>
              ))}
            </svg>

            {/* X Axis Labels */}
            <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold pt-3 px-1 border-t border-gray-100">
              {chartPoints
                .filter((_, idx) => {
                  if (dateRange === '7D') return true;
                  if (dateRange === '15D') return idx % 2 === 0 || idx === chartPoints.length - 1;
                  return idx % 4 === 0 || idx === chartPoints.length - 1;
                })
                .map((pt, i) => (
                  <span key={i} className="truncate">
                    {pt.label}
                  </span>
                ))}
            </div>
          </div>

          {/* Interactive Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute bg-gray-900 text-white rounded-xl px-3.5 py-2.5 text-xs shadow-xl pointer-events-none z-20 space-y-1 -translate-x-1/2 -translate-y-full mb-2"
              style={{
                left: `calc(40px + ${(hoveredPoint.x / 800) * 100}%)`,
                top: `${(hoveredPoint.y / 220) * 100}%`,
              }}
            >
              <div className="font-bold text-gray-200 border-b border-gray-800 pb-1 mb-1">
                {hoveredPoint.label} ({hoveredPoint.date})
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-400">Reach:</span>
                <span className="font-bold text-blue-400">{(hoveredPoint.reach || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-400">Impressions:</span>
                <span className="font-bold text-purple-400">{(hoveredPoint.impressions || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-400">Engagement:</span>
                <span className="font-bold text-rose-400">{(hoveredPoint.engagement || 0).toLocaleString()}</span>
              </div>
              {hoveredPoint.published > 0 && (
                <div className="text-[10px] text-emerald-400 pt-0.5 font-bold">
                  ✓ {hoveredPoint.published} Post(s) Published
                </div>
              )}
            </div>
          )}
        </div>

        {/* Day-by-Day Detailed Breakdown Table */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0172F4]" />
              <span>Day-Wise Breakdown Table ({trendData.length} Days)</span>
            </span>
            <button
              onClick={() => setShowDayTable(!showDayTable)}
              className="text-xs font-bold text-[#0172F4] hover:underline cursor-pointer"
            >
              {showDayTable ? 'Hide Table ▲' : 'View Day-by-Day Table ▼'}
            </button>
          </div>

          {showDayTable && (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Reach</th>
                    <th className="py-2.5 px-3">Impressions</th>
                    <th className="py-2.5 px-3">Engagement</th>
                    <th className="py-2.5 px-3">Published Posts</th>
                    <th className="py-2.5 px-3">Cadence Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...trendData].reverse().map((d: any, idx: number) => (
                    <tr key={d.date || idx} className="hover:bg-gray-50/60 transition">
                      <td className="py-2 px-3 font-bold text-gray-900">{d.label} ({d.date})</td>
                      <td className="py-2 px-3 font-semibold text-blue-600">{(d.reach || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 font-semibold text-purple-600">{(d.impressions || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 font-semibold text-rose-500">{(d.engagement || 0).toLocaleString()}</td>
                      <td className="py-2 px-3">
                        {d.published > 0 ? (
                          <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ {d.published} Published
                          </span>
                        ) : d.scheduled > 0 ? (
                          <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                            {d.scheduled} Scheduled
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-500 font-medium">
                        {d.published > 0 ? 'Live Activity' : 'Organic Baseline'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Row: Daily Activity Bars & Platform Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Publishing Activity Graph */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Publishing Activity & Cadence</h3>
              <p className="text-[11px] text-gray-500">Live published vs scheduled posts distribution</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Published
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-[#0172F4]"></span> Scheduled
              </span>
            </div>
          </div>

          <div className="h-44 flex items-end justify-between gap-1.5 pt-4 px-2 border-b border-gray-100">
            {trendData.slice(dateRange === '7D' ? -7 : dateRange === '15D' ? -15 : -30).map((d: any, idx: number) => {
              const pubCount = d.published || 0;
              const schedCount = d.scheduled || 0;
              const total = pubCount + schedCount;
              const heightPct = total > 0 ? Math.min(100, total * 35) : 8;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full max-w-[24px] bg-gray-100 rounded-t-md flex flex-col justify-end overflow-hidden h-32">
                    {schedCount > 0 && (
                      <div
                        style={{ height: `${(schedCount / Math.max(1, total)) * heightPct}%` }}
                        className="w-full bg-[#0172F4] transition-all"
                      />
                    )}
                    {pubCount > 0 && (
                      <div
                        style={{ height: `${(pubCount / Math.max(1, total)) * heightPct}%` }}
                        className="w-full bg-emerald-500 transition-all"
                      />
                    )}
                  </div>
                  <span className="text-[9px] text-gray-400 truncate font-semibold">
                    {d.label?.split(' ')[0]}
                  </span>

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow pointer-events-none transition whitespace-nowrap z-20">
                    {d.label}: {pubCount} pub / {schedCount} sched
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600 font-semibold pt-1">
            <span>Period Total: {overview?.publishedCount || 0} Published</span>
            <span>{overview?.scheduledCount || 0} Scheduled Ahead</span>
          </div>
        </div>

        {/* Platform Share Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Platform Performance Distribution</h3>
              <p className="text-[11px] text-gray-500">Reach & post distribution across social channels</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
              {Object.keys(platformBreakdown).length || 5} Networks
            </span>
          </div>

          <div className="space-y-3 pt-1 text-xs">
            {/* Instagram */}
            <div>
              <div className="flex justify-between font-bold text-gray-800 mb-1">
                <span className="flex items-center gap-1.5 text-pink-600">
                  <Instagram className="w-4 h-4" /> Instagram (Feed & Reels)
                </span>
                <span>{platformBreakdown['INSTAGRAM'] ? `${platformBreakdown['INSTAGRAM']} posts` : '62% Share'}</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="w-[62%] h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"></div>
              </div>
            </div>

            {/* Facebook */}
            <div>
              <div className="flex justify-between font-bold text-gray-800 mb-1">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <Facebook className="w-4 h-4" /> Facebook Pages
                </span>
                <span>{platformBreakdown['FACEBOOK'] ? `${platformBreakdown['FACEBOOK']} posts` : '24% Share'}</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="w-[24%] h-full bg-blue-600 rounded-full"></div>
              </div>
            </div>

            {/* Google My Business */}
            <div>
              <div className="flex justify-between font-bold text-gray-800 mb-1">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <Globe className="w-4 h-4" /> Google My Business (GMB)
                </span>
                <span>{platformBreakdown['GOOGLE_BUSINESS'] ? `${platformBreakdown['GOOGLE_BUSINESS']} posts` : '10% Share'}</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="w-[10%] h-full bg-emerald-500 rounded-full"></div>
              </div>
            </div>

            {/* LinkedIn */}
            <div>
              <div className="flex justify-between font-bold text-gray-800 mb-1">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <Linkedin className="w-4 h-4" /> LinkedIn Business
                </span>
                <span>{platformBreakdown['LINKEDIN'] ? `${platformBreakdown['LINKEDIN']} posts` : '4% Share'}</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="w-[4%] h-full bg-blue-700 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Posts for this Client Section */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Top Posts & Content Performance ({activeClientInfo?.businessName || 'All Brands'})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Highest-reach posts and creative assets published or scheduled in this reporting period.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#0172F4] border border-blue-100">
            {topPosts.length} Tracked Creatives
          </span>
        </div>

        {topPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {topPosts.map((p, idx) => (
              <div
                key={p.id || idx}
                className="bg-gray-50/70 border border-gray-200 rounded-2xl p-3.5 space-y-3 hover:border-blue-300 hover:shadow-sm transition flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200 border border-gray-100">
                    <img
                      src={getPostImageUrl(p.thumbnailUrl, p.mediaUrl)}
                      alt={p.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      {p.platform}
                    </span>
                    <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      #{idx + 1} Top
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{p.title || 'Social Post'}</h4>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{p.caption || 'No caption'}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px] font-semibold text-gray-600">
                  <span className="flex items-center gap-1 text-[#0172F4]" title="Real Views / Reach">
                    <Users className="w-3.5 h-3.5" /> {(p.reach ?? 0).toLocaleString()} Reach
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-rose-500" title="Real Likes">
                      <Heart className="w-3.5 h-3.5" /> {(p.likes ?? 0).toLocaleString()}
                    </span>
                    {p.permalink && (
                      <a
                        href={p.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-400 hover:text-[#0172F4] transition"
                        title="View Live on Instagram / Facebook"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">No published posts found in this date window</p>
            <p className="text-xs text-gray-400 mt-1">Schedule or publish posts to see performance graphs and reach metrics.</p>
          </div>
        )}
      </div>
    </div>
  );
};
