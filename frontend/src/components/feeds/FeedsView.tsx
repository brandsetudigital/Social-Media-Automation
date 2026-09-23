import React, { useState } from 'react';
import {
  Rss,
  Plus,
  Search,
  ExternalLink,
  Sparkles,
  Share2,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface FeedsViewProps {
  onCuratePost?: (article: { title: string; link: string; summary: string }) => void;
}

export const FeedsView: React.FC<FeedsViewProps> = ({ onCuratePost }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFeedModal, setShowAddFeedModal] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');

  // Sample aggregated RSS articles
  const [articles, setArticles] = useState([
    {
      id: 'a1',
      source: 'Social Media Examiner',
      title: 'Instagram Algorithm Updates for 2026: What Brands Must Know',
      time: '3 hours ago',
      summary:
        'New signals prioritize original video content, community saves, and active direct messaging over passive views.',
      link: 'https://www.socialmediaexaminer.com',
    },
    {
      id: 'a2',
      source: 'HubSpot Marketing Blog',
      title: 'Top 7 Content Formats That Drive 10x ROI for Small Businesses',
      time: '6 hours ago',
      summary:
        'From micro-tutorials on LinkedIn to local SEO highlights on Google Business profiles, here is the ultimate guide.',
      link: 'https://blog.hubspot.com/marketing',
    },
    {
      id: 'a3',
      source: 'Search Engine Journal',
      title: 'Google Business Profile New Features: Interactive FAQs & Direct Bookings',
      time: '1 day ago',
      summary:
        'Local businesses that update their posts weekly gain 35% higher visibility in Google Maps local pack results.',
      link: 'https://www.searchenginejournal.com',
    },
  ]);

  const filteredArticles = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">RSS Feeds & Content Curation</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Aggregate industry news and blog feeds to curate viral content and trending topics in seconds.
          </p>
        </div>

        <button
          onClick={() => setShowAddFeedModal(true)}
          className="px-4 py-2 text-xs font-semibold bg-[#0172F4] hover:bg-[#005cd3] text-white rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create Feed</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search feed articles & topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Articles Feed */}
      <div className="space-y-4">
        {filteredArticles.map((art) => (
          <div
            key={art.id}
            className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#0172F4] bg-blue-50 px-2.5 py-0.5 rounded-full">
                  {art.source}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {art.time}
                </span>
              </div>

              <h3 className="font-bold text-sm text-gray-900 leading-snug hover:text-[#0172F4] cursor-pointer transition">
                {art.title}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">{art.summary}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={art.link}
                target="_blank"
                rel="noreferrer"
                className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-xs"
                title="Open Source Article"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={() =>
                  onCuratePost &&
                  onCuratePost({
                    title: art.title,
                    link: art.link,
                    summary: art.summary,
                  })
                }
                className="px-3.5 py-2 bg-blue-50 hover:bg-[#0172F4] hover:text-white text-[#0172F4] rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Turn into Post</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Feed Modal */}
      {showAddFeedModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Add New RSS Feed</h3>
            <p className="text-xs text-gray-500 mt-0.5">Enter any website's RSS feed link to auto-pull news.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">RSS Feed URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/feed.xml"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFeedModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (newFeedUrl) {
                      setArticles([
                        {
                          id: `a-${Date.now()}`,
                          source: 'Custom Feed',
                          title: 'Latest Content from New Feed',
                          time: 'Just now',
                          summary: 'Auto-fetched updates from ' + newFeedUrl,
                          link: newFeedUrl,
                        },
                        ...articles,
                      ]);
                      setNewFeedUrl('');
                      setShowAddFeedModal(false);
                    }
                  }}
                  className="px-4 py-1.5 text-xs bg-[#0172F4] text-white rounded-lg font-semibold"
                >
                  Add Feed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
