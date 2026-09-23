import React, { useState } from 'react';
import { useClients } from '../../context/ClientContext';
import {
  Inbox,
  Search,
  Filter,
  CheckCircle2,
  MessageSquare,
  AtSign,
  Mail,
  Send,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Globe,
  Smile,
  Paperclip,
} from 'lucide-react';

export const UnifiedInboxView: React.FC = () => {
  const { selectedClient } = useClients();

  const [channelFilter, setChannelFilter] = useState('ALL');
  const [msgTypeFilter, setMsgTypeFilter] = useState<'ALL' | 'COMMENTS' | 'DMS' | 'MENTIONS'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConvoId, setSelectedConvoId] = useState<string>('c1');
  const [replyText, setReplyText] = useState('');

  // Realistic sample social inbox conversations
  const [conversations, setConversations] = useState([
    {
      id: 'c1',
      platform: 'INSTAGRAM',
      senderName: 'sneha_patel',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      lastMessage: 'Hi! Could you please share the pricing details for your digital marketing package?',
      time: '12m ago',
      unread: true,
      type: 'DMS',
      messages: [
        { sender: 'user', text: 'Hello! I came across your post on Instagram.', time: '14m ago' },
        {
          sender: 'user',
          text: 'Hi! Could you please share the pricing details for your digital marketing package?',
          time: '12m ago',
        },
      ],
    },
    {
      id: 'c2',
      platform: 'FACEBOOK',
      senderName: 'Vikram Joshi',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      lastMessage: 'Great design and very helpful tips! Looking forward to the next session.',
      time: '2h ago',
      unread: false,
      type: 'COMMENTS',
      messages: [
        {
          sender: 'user',
          text: 'Great design and very helpful tips! Looking forward to the next session.',
          time: '2h ago',
        },
      ],
    },
    {
      id: 'c3',
      platform: 'GOOGLE_BUSINESS',
      senderName: 'Dr. Ananya Rao',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      lastMessage: 'What are your operating hours on weekends?',
      time: '5h ago',
      unread: true,
      type: 'COMMENTS',
      messages: [
        { sender: 'user', text: 'What are your operating hours on weekends?', time: '5h ago' },
      ],
    },
  ]);

  const activeConvo = conversations.find((c) => c.id === selectedConvoId) || conversations[0];

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConvo) return;

    const newMsg = { sender: 'agent', text: replyText.trim(), time: 'Just now' };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvo.id
          ? {
              ...c,
              unread: false,
              lastMessage: `You: ${replyText.trim()}`,
              messages: [...c.messages, newMsg],
            }
          : c
      )
    );
    setReplyText('');
  };

  const filteredConvos = conversations.filter((c) => {
    const matchesSearch =
      c.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = msgTypeFilter === 'ALL' || c.type === msgTypeFilter;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'UNREAD' && c.unread);
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Unified Social Inbox</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage all customer messages, comments, and mentions from Facebook, Instagram, and Google in one unified thread.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600">Channel:</span>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium text-gray-700"
          >
            <option value="ALL">All Channels</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="GOOGLE_BUSINESS">Google Business</option>
          </select>
        </div>

        {/* Message type pills */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setMsgTypeFilter('ALL')}
            className={`px-3 py-1 rounded-md font-semibold transition ${
              msgTypeFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setMsgTypeFilter('COMMENTS')}
            className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
              msgTypeFilter === 'COMMENTS' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-3 h-3" /> Comments
          </button>
          <button
            onClick={() => setMsgTypeFilter('DMS')}
            className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
              msgTypeFilter === 'DMS' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Mail className="w-3 h-3" /> Direct Messages
          </button>
          <button
            onClick={() => setMsgTypeFilter('MENTIONS')}
            className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
              msgTypeFilter === 'MENTIONS' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <AtSign className="w-3 h-3" /> Mentions
          </button>
        </div>

        {/* Read / Unread */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter(statusFilter === 'ALL' ? 'UNREAD' : 'ALL')}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
              statusFilter === 'UNREAD'
                ? 'bg-blue-50 text-[#0172F4] border-blue-200'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {statusFilter === 'UNREAD' ? 'Showing Unread' : 'Show All'}
          </button>
        </div>
      </div>

      {/* Main Inbox Workspace: Split View */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
        {/* Left: Conversations List (5 cols) */}
        <div className="md:col-span-5 border-r border-gray-200 flex flex-col">
          {/* Search bar */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredConvos.map((c) => {
              const isSelected = c.id === selectedConvoId;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedConvoId(c.id);
                    setConversations((prev) =>
                      prev.map((item) => (item.id === c.id ? { ...item, unread: false } : item))
                    );
                  }}
                  className={`p-3.5 transition cursor-pointer flex items-start gap-3 ${
                    isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={c.senderAvatar}
                      alt={c.senderName}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs">
                      {c.platform === 'INSTAGRAM' ? (
                        <Instagram className="w-3 h-3 text-pink-600" />
                      ) : c.platform === 'FACEBOOK' ? (
                        <Facebook className="w-3 h-3 text-blue-600" />
                      ) : (
                        <Globe className="w-3 h-3 text-emerald-600" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900 truncate">{c.senderName}</h4>
                      <span className="text-[10px] text-gray-400 shrink-0">{c.time}</span>
                    </div>
                    <p className="text-xs text-gray-600 truncate mt-0.5">{c.lastMessage}</p>
                  </div>

                  {c.unread && (
                    <span className="w-2 h-2 rounded-full bg-[#0172F4] shrink-0 mt-2"></span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Message Details & Reply Composer (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between bg-gray-50/30">
          {activeConvo ? (
            <>
              {/* Header */}
              <div className="px-5 py-3.5 bg-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={activeConvo.senderAvatar}
                    alt={activeConvo.senderName}
                    className="w-9 h-9 rounded-full object-cover border border-gray-200"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{activeConvo.senderName}</h4>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                      <span>Via {activeConvo.platform}</span>
                      <span>•</span>
                      <span>{activeConvo.type}</span>
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              </div>

              {/* Message Bubble Thread */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                {activeConvo.messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.sender === 'agent' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
                        m.sender === 'agent'
                          ? 'bg-[#0172F4] text-white rounded-br-none shadow-xs'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-xs'
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-1">{m.time}</span>
                  </div>
                ))}
              </div>

              {/* Reply Input Box */}
              <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Reply to ${activeConvo.senderName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="px-4 py-2.5 bg-[#0172F4] hover:bg-[#005cd3] disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition flex items-center gap-1.5 shadow-xs shadow-blue-500/20 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Inbox className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-xs font-semibold text-gray-500">Select a conversation to start replying</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
