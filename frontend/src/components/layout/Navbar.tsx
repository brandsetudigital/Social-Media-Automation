import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
import { NotificationItem } from '../../types';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  LogOut,
  Users,
  Settings,
  ChevronDown,
  Shield,
  Layers,
  Plus,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface NavbarProps {
  onSyncDrive?: () => void;
  onNavigate?: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { user, role, logout } = useAuth();
  const { clients, selectedClientId, setSelectedClientId } = useClients();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const fetchNotifs = async () => {
    try {
      const data = await api.getNotifications(selectedClientId !== 'ALL' ? selectedClientId : undefined);
      setNotifications(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 25000);
    return () => clearInterval(interval);
  }, [selectedClientId, role]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    try {
      await api.markNotificationRead(n.id);
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
    } catch {
      // ignore
    }

    setShowNotifs(false);
    if (!onNavigate) return;

    if (n.type === 'PENDING_APPROVAL') {
      onNavigate(role === 'ADMIN' ? 'approvals' : 'inbox');
    } else if (n.type === 'DRIVE_NEW_CONTENT') {
      onNavigate('inbox');
    } else {
      onNavigate('dashboard');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-40 px-6 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Brand Identity & Brand Selector */}
      <div className="flex items-center gap-6">
        {/* BrandSetu Digital Logo */}
        <div 
          onClick={() => onNavigate && onNavigate('agency-dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0172F4] flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold text-base">
            <span className="tracking-tight">B</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-lg tracking-tight text-gray-900">BrandSetu</span>
            <span className="text-[#0172F4] font-semibold text-sm tracking-wide">Digital</span>
          </div>
        </div>

        {/* Brand Selector Dropdown & Add Brand Button */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 text-xs font-semibold rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#0172F4]/20 focus:border-[#0172F4] transition cursor-pointer"
            >
              <option value="ALL">🌐 All Brands (BrandSetu)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => onNavigate && onNavigate('clients')}
            className="hidden sm:flex items-center gap-1 text-xs font-semibold text-[#0172F4] hover:bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg transition shadow-xs"
            title="Add or manage brand profiles and clients"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Brand</span>
          </button>
        </div>
      </div>

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center gap-4">
        {/* Quick action: Manage Users for Admin */}
        {role === 'ADMIN' && (
          <button
            onClick={() => onNavigate && onNavigate('users')}
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-[#0172F4] bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 px-3 py-1.5 rounded-lg transition"
          >
            <Users className="w-3.5 h-3.5 text-[#0172F4]" />
            <span>Manage Users</span>
          </button>
        )}

        {/* In-app Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#0172F4] ring-2 ring-white"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-gray-200 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#0172F4]" />
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-blue-50 text-[#0172F4] font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-gray-500 hover:text-[#0172F4] font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 mt-2">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">No new notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`py-2.5 px-2 rounded-lg transition cursor-pointer ${
                        !n.read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {n.type === 'PUBLISHING_FAILURE' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-[#0172F4] shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-gray-900">{n.title}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity Chip & Dropdown (Matching Reference Header: Arjun Meena / Owner) */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-gray-50 transition"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[#0172F4] font-semibold text-xs">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-gray-900 leading-none">{user?.name || 'Arjun Meena'}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-none">
                {role === 'ADMIN' ? 'Owner' : role === 'SMM' ? 'SMM' : 'Client'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-900">{user?.name || 'Arjun Meena'}</p>
                <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-[#0172F4] rounded-md">
                  {role === 'ADMIN' ? 'Owner / Admin' : role}
                </span>
              </div>

              {role === 'ADMIN' && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onNavigate) onNavigate('users');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                >
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>Team & User Management</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  if (onNavigate) onNavigate('agency-dashboard');
                }}
                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
              >
                <Layers className="w-4 h-4 text-gray-400" />
                <span>Agency Dashboard</span>
              </button>

              <div className="my-1 border-t border-gray-100"></div>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
