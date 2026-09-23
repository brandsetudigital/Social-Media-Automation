import React, { useState, useEffect } from 'react';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
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
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { clients, selectedClientId } = useClients();

  const [activePlatform, setActivePlatform] = useState<string>('INSTAGRAM');
  const [dateRange, setDateRange] = useState<'7D' | '30D' | '90D'>('30D');
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const platforms = [
    { id: 'FACEBOOK', name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
    { id: 'INSTAGRAM', name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
    { id: 'YOUTUBE', name: 'YouTube', icon: Youtube, color: 'text-red-600' },
    { id: 'PINTEREST', name: 'Pinterest', icon: Zap, color: 'text-rose-600' },
    { id: 'LINKEDIN', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
    { id: 'TWITTER', name: 'X (Twitter)', icon: Twitter, color: 'text-sky-500' },
  ];

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const ov = await api.getAnalyticsOverview(selectedClientId !== 'ALL' ? selectedClientId : undefined);
      setOverview(ov);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedClientId, activePlatform, dateRange]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Social Media Analytics</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Deep dive into follower growth, engagement benchmarks, and post reach across connected networks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setDateRange('7D')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === '7D' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateRange('30D')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === '30D' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setDateRange('90D')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateRange === '90D' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              90 Days
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Platform Tabs (Matching Reference Analytics Page) */}
      <div className="bg-white rounded-2xl p-2 border border-gray-200 shadow-xs flex flex-wrap gap-1">
        {platforms.map((p) => {
          const Icon = p.icon;
          const isActive = activePlatform === p.id;

          return (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-blue-50 text-[#0172F4] border border-blue-200 shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#0172F4]' : p.color}`} />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total Reach</span>
            <Users className="w-4 h-4 text-[#0172F4]" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {(overview?.totalReach || 24500).toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +18.4% vs last period
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Impressions</span>
            <Eye className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {(overview?.totalImpressions || 42800).toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +22.1% vs last period
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total Engagements</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {(overview?.totalLikes || 4820).toLocaleString()}
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Likes • Comments • Shares</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Average Engagement Rate</span>
            <BarChart3 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {overview?.avgEngagementRate || 4.8}%
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Industry Avg: 2.1%</span>
        </div>
      </div>

      {/* Performance Charts Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Audience Growth & Follower Gain</h3>
          <div className="h-56 flex flex-col justify-between pt-4">
            <div className="flex-1 flex items-end justify-between px-2 pb-2 border-b border-gray-100 text-[11px] text-gray-400">
              <div className="w-8 bg-blue-100 rounded-t h-20"></div>
              <div className="w-8 bg-blue-200 rounded-t h-32"></div>
              <div className="w-8 bg-[#0172F4] rounded-t h-40"></div>
              <div className="w-8 bg-blue-400 rounded-t h-28"></div>
              <div className="w-8 bg-blue-500 rounded-t h-48"></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 px-2">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
              <span>This Week</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Engagement Breakdown by Format</h3>
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-gray-700 mb-1">
                <span>Short Videos & Reels (9:16)</span>
                <span>64%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="w-[64%] h-full bg-[#0172F4] rounded-full"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-gray-700 mb-1">
                <span>Multi-Image Carousels</span>
                <span>24%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="w-[24%] h-full bg-purple-500 rounded-full"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-gray-700 mb-1">
                <span>Single Image & Graphic Posts</span>
                <span>12%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="w-[12%] h-full bg-emerald-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
