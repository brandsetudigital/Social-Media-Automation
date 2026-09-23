import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClientProvider } from './context/ClientContext';
import { LoginPage } from './components/auth/LoginPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { AgencyDashboardView } from './components/dashboard/AgencyDashboardView';
import { BrandDashboardView } from './components/dashboard/BrandDashboardView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { PostsManagerView } from './components/posts/PostsManagerView';
import { CreatePostModal } from './components/posts/CreatePostModal';
import { ChannelsView } from './components/channels/ChannelsView';
import { UnifiedInboxView } from './components/inbox/UnifiedInboxView';
import { LibraryView } from './components/library/LibraryView';
import { FeedsView } from './components/feeds/FeedsView';
import { UsersManagementView } from './components/users/UsersManagementView';
import { ApprovalsView } from './components/approvals/ApprovalsView';
import { ClientsView } from './components/clients/ClientsView';
import { api } from './api';
import { RefreshCw } from 'lucide-react';

const MainShell: React.FC = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('agency-dashboard');
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [newContentCount, setNewContentCount] = useState(0);

  // Global Create Post modal
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const fetchBadgeCounts = async () => {
    try {
      const [approvals, inbox] = await Promise.all([
        role === 'ADMIN' ? api.getPendingApprovals() : Promise.resolve([]),
        api.getContentInbox({ status: 'NEW' }),
      ]);
      setPendingApprovalsCount(approvals.length);
      setNewContentCount(inbox.length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 20000);
    return () => clearInterval(interval);
  }, [activeTab, role]);

  // Restrict 'users' tab strictly to ADMIN role
  useEffect(() => {
    if (activeTab === 'users' && role !== 'ADMIN') {
      setActiveTab('agency-dashboard');
    }
  }, [activeTab, role]);

  const [postCalendarDate, setPostCalendarDate] = useState<Date>(new Date(2026, 8, 18));
  const [postCalendarTab, setPostCalendarTab] = useState<'month' | 'week' | 'day'>('month');
  const [postViewMode, setPostViewMode] = useState<'calendar' | 'list'>('calendar');
  const [postStatusFilter, setPostStatusFilter] = useState<string>('ALL');
  const [targetPostId, setTargetPostId] = useState<string | null>(null);

  const handleSelectCalendarDate = (date: Date, viewTab?: 'month' | 'week' | 'day') => {
    setPostCalendarDate(date);
    if (viewTab) setPostCalendarTab(viewTab);
    setPostViewMode('calendar');
    setActiveTab('posts');
  };

  const handleNavigateToPosts = (filter?: string, viewMode: 'calendar' | 'list' = 'list', postId?: string) => {
    if (filter) setPostStatusFilter(filter);
    if (postId) setTargetPostId(postId);
    setPostViewMode(viewMode);
    setActiveTab('posts');
  };

  const handleOpenCreatePost = (template?: any) => {
    setSelectedTemplate(template || null);
    setIsCreatePostOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] text-gray-900">
      <Navbar onSyncDrive={fetchBadgeCounts} onNavigate={setActiveTab} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingApprovalsCount={pendingApprovalsCount}
          newContentCount={newContentCount}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {activeTab === 'agency-dashboard' && (
            <AgencyDashboardView
              onNavigate={setActiveTab}
              onNavigateToPosts={handleNavigateToPosts}
              onOpenCreatePost={() => handleOpenCreatePost()}
            />
          )}
          {activeTab === 'dashboard' && (
            <BrandDashboardView
              onNavigate={setActiveTab}
              onNavigateToPosts={handleNavigateToPosts}
              onOpenCreatePost={() => handleOpenCreatePost()}
              onSelectCalendarDate={handleSelectCalendarDate}
            />
          )}
          {activeTab === 'clients' && <ClientsView />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'posts' && (
            <PostsManagerView
              initialDate={postCalendarDate}
              initialCalendarTab={postCalendarTab}
              initialViewMode={postViewMode}
              initialStatusFilter={postStatusFilter}
              targetPostId={targetPostId}
              onNavigateTab={setActiveTab}
              onOpenCreatePost={(template) => handleOpenCreatePost(template)}
            />
          )}
          {activeTab === 'channels' && <ChannelsView />}
          {activeTab === 'inbox' && <UnifiedInboxView />}
          {activeTab === 'library' && (
            <LibraryView onUseTemplate={(tpl) => handleOpenCreatePost(tpl)} />
          )}
          {activeTab === 'feeds' && (
            <FeedsView
              onCuratePost={(art) =>
                handleOpenCreatePost({
                  title: art.title,
                  caption: `${art.summary}\n\nRead more: ${art.link}`,
                  hashtags: '#IndustryNews #Updates #Trends',
                })
              }
            />
          )}
          {activeTab === 'users' && role === 'ADMIN' && <UsersManagementView />}
          {activeTab === 'approvals' && <ApprovalsView />}
        </main>
      </div>

      {/* Global Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => {
          setIsCreatePostOpen(false);
          setSelectedTemplate(null);
        }}
        onPostCreated={fetchBadgeCounts}
        initialTemplate={selectedTemplate}
      />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0172F4] flex items-center justify-center text-white font-bold animate-pulse shadow-md shadow-blue-500/20">
            B
          </div>
          <p className="text-xs font-semibold text-gray-500">Loading BrandSetu Digital...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <ClientProvider>
      <MainShell />
    </ClientProvider>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
