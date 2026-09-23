import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Grid,
  List,
  Sparkles,
  Share2,
  Copy,
  Check,
  Tag,
  ArrowRight,
} from 'lucide-react';

interface LibraryViewProps {
  onUseTemplate?: (template: { title: string; caption: string; hashtags: string; mediaUrl: string }) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onUseTemplate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Ready sample templates tailored for social media agency clients
  const samples = [
    {
      id: 's1',
      title: 'Festival Greeting & Special Celebration',
      category: 'Festivals',
      mediaUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80',
      caption: 'Wishing everyone joy, prosperity, and success! Celebrate with your loved ones and make every moment count.',
      hashtags: '#FestiveVibes #Celebration #Joy #SpecialOccasion #Blessings',
    },
    {
      id: 's2',
      title: 'Customer Testimonial & Social Proof',
      category: 'Brand Trust',
      mediaUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
      caption: '“Working with this team helped our business grow 3x in just 90 days!” Real results, real satisfaction.',
      hashtags: '#CustomerSuccess #ClientReview #SocialProof #AgencyGrowth',
    },
    {
      id: 's3',
      title: 'Weekend Flash Offer & Discount',
      category: 'Promotional',
      mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80',
      caption: 'Special 20% discount this weekend only! Don’t miss out on our limited-time exclusive offer.',
      hashtags: '#WeekendSale #FlashDeal #LimitedOffer #ShopNow #Savings',
    },
    {
      id: 's4',
      title: 'Monday Motivation & Leadership Wisdom',
      category: 'Engagement',
      mediaUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
      caption: 'Start your week with high energy and crystal-clear vision. Success belongs to those who take action.',
      hashtags: '#MondayMotivation #GrowthMindset #SuccessMindset #Inspire',
    },
  ];

  const filteredSamples = samples.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.caption.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCopyCaption = (s: any) => {
    navigator.clipboard.writeText(`${s.caption}\n\n${s.hashtags}`);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Media Library & Post Templates</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Pre-designed templates, high-converting copy, and creative assets ready for 1-click publishing.
          </p>
        </div>

        <button
          onClick={() => alert('Add sample dialog')}
          className="px-4 py-2 text-xs font-semibold bg-[#0172F4] hover:bg-[#005cd3] text-white rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create Sample</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search templates & keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-500">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 font-medium text-gray-800 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="Festivals">Festivals</option>
            <option value="Promotional">Promotional</option>
            <option value="Brand Trust">Brand Trust</option>
            <option value="Engagement">Engagement</option>
          </select>

          {/* Grid / List switch */}
          <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50 ml-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white text-[#0172F4] shadow-xs' : 'text-gray-400'}`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white text-[#0172F4] shadow-xs' : 'text-gray-400'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Templates Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredSamples.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between group"
            >
              <div className="h-44 bg-gray-100 relative overflow-hidden">
                <img
                  src={s.mediaUrl}
                  alt={s.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs text-[10px] font-bold text-[#0172F4] px-2 py-0.5 rounded-md">
                  {s.category}
                </span>
              </div>

              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 leading-snug line-clamp-1">{s.title}</h4>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{s.caption}</p>
                  <p className="text-[10px] text-[#0172F4] font-medium mt-1 truncate">{s.hashtags}</p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => handleCopyCaption(s)}
                    className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium"
                  >
                    {copiedId === s.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedId === s.id ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={() => onUseTemplate && onUseTemplate(s)}
                    className="bg-blue-50 hover:bg-[#0172F4] hover:text-white text-[#0172F4] font-semibold text-xs px-3 py-1 rounded-lg transition flex items-center gap-1"
                  >
                    <span>Use</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Template</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Caption</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSamples.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img src={s.mediaUrl} alt={s.title} className="w-10 h-10 rounded-lg object-cover" />
                      <span className="font-semibold text-gray-900">{s.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{s.category}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{s.caption}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onUseTemplate && onUseTemplate(s)}
                      className="text-xs font-semibold text-[#0172F4] hover:underline"
                    >
                      Use Template
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
