import React, { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Building2,
  Filter,
} from 'lucide-react';
import { api } from '../../api';

interface GmbReviewsViewProps {
  selectedClientId?: string;
  clients: any[];
}

export const GmbReviewsView: React.FC<GmbReviewsViewProps> = ({ selectedClientId, clients }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, replied: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [starFilter, setStarFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [customReplyTexts, setCustomReplyTexts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAllClients = selectedClientId === 'ALL' || !selectedClientId;
  const currentClient = !isAllClients ? clients.find((c) => c.id === selectedClientId) : null;

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const data = await api.getGmbReviews({
        clientId: !isAllClients ? selectedClientId : undefined,
        starRating: starFilter !== 'ALL' ? starFilter : undefined,
        replyStatus: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setReviews(data?.reviews || []);
      setStats(data?.stats || { total: 0, pending: 0, replied: 0 });
    } catch (err: any) {
      console.warn('Failed to load GMB reviews:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [selectedClientId, starFilter, statusFilter]);

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      let res;
      if (!isAllClients && selectedClientId) {
        res = await api.syncGmbReviews(selectedClientId);
      } else {
        res = await api.syncAllGmbReviews();
      }
      setFeedback({
        type: 'success',
        message: res.message || 'Reviews synced and AI replies processed!',
      });
      await fetchReviews();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Sync failed.' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  const handleGenerateOrSendReply = async (reviewId: string) => {
    try {
      setReplyingId(reviewId);
      const customText = customReplyTexts[reviewId];
      const res = await api.replyGmbReview(reviewId, customText);
      setFeedback({
        type: 'success',
        message: `✨ AI reply submitted: "${res.replyText.substring(0, 50)}..."`,
      });
      await fetchReviews();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Reply failed.' });
    } finally {
      setReplyingId(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </span>
              <h2 className="text-xl font-bold">Google Reviews & AI Auto-Reply Engine</h2>
            </div>
            <p className="text-emerald-100 text-xs mt-1 max-w-xl">
              Automatic sentiment analysis, 5-Star appreciation, and empathetic 1-Star complaint resolution on Google Maps for{' '}
              <strong className="text-white underline">{currentClient?.businessName || 'All Clients'}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="bg-white text-emerald-800 hover:bg-emerald-50 px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Live Reviews'}</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
          <div>
            <span className="text-[11px] text-emerald-200 block">Total Reviews</span>
            <span className="text-2xl font-black text-white">{stats.total}</span>
          </div>
          <div>
            <span className="text-[11px] text-emerald-200 block">AI Replied</span>
            <span className="text-2xl font-black text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" />
              {stats.replied}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-emerald-200 block">Pending Reply</span>
            <span className="text-2xl font-black text-amber-300 flex items-center gap-1.5">
              <Clock className="w-5 h-5" />
              {stats.pending}
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Rating:</span>
          </div>
          {['ALL', '5', '4', '3', '1'].map((st) => (
            <button
              key={st}
              onClick={() => setStarFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                starFilter === st
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'ALL' ? 'All Ratings' : `${st} ★`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="REPLIED">Replied</option>
            <option value="PENDING">Pending Reply</option>
          </select>
        </div>
      </div>

      {/* Reviews Cards List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
          <span>Loading client Google reviews...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
          <MessageSquare className="w-8 h-8 mx-auto text-gray-400" />
          <h4 className="text-sm font-bold text-gray-900">No Google Reviews Found</h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Reviews will appear here as customers review {currentClient?.businessName || 'your brand'} on Google Maps. Click "Sync Live Reviews" to fetch right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const isReplied = rev.replyStatus === 'REPLIED' && rev.replyText;

            return (
              <div
                key={rev.id}
                className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-emerald-300 transition shadow-2xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm overflow-hidden shrink-0">
                      {rev.reviewerPhotoUrl ? (
                        <img src={rev.reviewerPhotoUrl} alt={rev.reviewerName} className="w-full h-full object-cover" />
                      ) : (
                        rev.reviewerName?.charAt(0) || 'C'
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{rev.reviewerName}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < rev.starRating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          • {new Date(rev.reviewCreatedAt).toLocaleDateString()}
                        </span>
                        {rev.client?.businessName && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold border border-slate-200 ml-1">
                            {rev.client.businessName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      isReplied
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isReplied ? '✓ REPLIED' : '⏳ PENDING REPLY'}
                  </span>
                </div>

                {/* Review Comment Text */}
                <p className="text-xs text-gray-700 leading-relaxed bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                  "{rev.comment || 'No written text, 5-Star rating awarded.'}"
                </p>

                {/* Reply Section */}
                {isReplied ? (
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3.5 space-y-1.5 ml-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        AI Response Published on Google Maps:
                      </span>
                      {rev.repliedAt && (
                        <span className="text-[10px] text-gray-400">
                          {new Date(rev.repliedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed font-medium">{rev.replyText}</p>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        AI Auto-Generated Draft Response:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleGenerateOrSendReply(rev.id)}
                        disabled={replyingId === rev.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer transition disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>{replyingId === rev.id ? 'Sending...' : 'Auto-Reply Now'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

