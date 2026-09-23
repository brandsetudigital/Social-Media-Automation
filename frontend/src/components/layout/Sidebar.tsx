import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutGrid,
  LayoutDashboard,
  Building2,
  BarChart3,
  FileText,
  Share2,
  Inbox,
  FolderKanban,
  Rss,
  Users,
  CheckSquare,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavTab =
  | 'agency-dashboard'
  | 'dashboard'
  | 'clients'
  | 'analytics'
  | 'posts'
  | 'channels'
  | 'inbox'
  | 'library'
  | 'feeds'
  | 'users'
  | 'approvals';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  pendingApprovalsCount?: number;
  newContentCount?: number;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingApprovalsCount = 0,
  newContentCount = 0,
}) => {
  const { role } = useAuth();

  const navItems = [
    {
      id: 'agency-dashboard',
      label: 'Agency Dashboard',
      icon: LayoutGrid,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'clients',
      label: 'Clients & Brands',
      icon: Building2,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
    },
    {
      id: 'posts',
      label: 'Posts',
      icon: FileText,
      badge: newContentCount > 0 ? newContentCount : undefined,
    },
    {
      id: 'channels',
      label: 'Channels',
      icon: Share2,
    },
    {
      id: 'inbox',
      label: 'Inbox',
      icon: Inbox,
    },
    {
      id: 'library',
      label: 'Library',
      icon: FolderKanban,
    },
    {
      id: 'feeds',
      label: 'Feeds',
      icon: Rss,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-3.5 shrink-0 select-none shadow-[1px_0_3px_rgba(0,0,0,0.03)]">
      <div className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavTab)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-blue-50/90 text-[#0172F4] font-bold border border-blue-200/80 shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4.5 h-4.5 transition-colors ${
                    isActive ? 'text-[#0172F4]' : 'text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className="bg-[#0172F4] text-xs font-bold text-white px-2.5 py-0.5 rounded-full shadow-xs">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Admin Management Section */}
        {role === 'ADMIN' && (
          <div className="pt-3.5 mt-3.5 border-t border-slate-200 space-y-1.5">
            <div className="px-3.5 py-1 text-xs font-black uppercase tracking-wider text-slate-500">
              Agency Controls
            </div>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-blue-50/90 text-[#0172F4] font-bold border border-blue-200/80 shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className={`w-4.5 h-4.5 ${activeTab === 'users' ? 'text-[#0172F4]' : 'text-slate-500'}`} />
                <span>Manage Users & Roles</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'approvals'
                  ? 'bg-blue-50/90 text-[#0172F4] font-bold border border-blue-200/80 shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckSquare className={`w-4.5 h-4.5 ${activeTab === 'approvals' ? 'text-[#0172F4]' : 'text-slate-500'}`} />
                <span>Post Approvals</span>
              </div>
              {pendingApprovalsCount > 0 && (
                <span className="bg-amber-500 text-xs font-bold text-white px-2.5 py-0.5 rounded-full shadow-xs">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Floating Support Link */}
      <div className="pt-3 border-t border-slate-200">
        <button
          onClick={() => window.open('mailto:support@brandsetudigital.com', '_blank')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-[#0172F4] hover:bg-blue-50/60 transition"
        >
          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[#0172F4]">
            <HelpCircle className="w-4 h-4" />
          </div>
          <span>Support & Help</span>
        </button>
      </div>
    </aside>
  );
};
