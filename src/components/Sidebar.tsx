'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTrinetra } from '@/lib/store';
import {
  LayoutDashboard,
  CheckSquare,
  Send,
  FileSpreadsheet,
  Users,
  Bell,
  Plus,
  FolderDot,
  LogOut,
  Sparkles,
  ShieldAlert,
  Lock,
  X,
  HelpCircle,
} from 'lucide-react';
import { CreateProjectModal } from './CreateProjectModal';
import { PaywallModal } from './PaywallModal';
import { useUi } from '@/lib/ui-context';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const {
    organization,
    projects,
    tasks,
    currentUser,
    notifications,
    isPro,
    signOut,
  } = useTrinetra();

  const { isSidebarOpen, closeSidebar, openTutorial } = useUi();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.is_read).length;
  const myTasksCount = currentUser
    ? tasks.filter(t => t.assigned_to === currentUser.id && t.status !== 'APPROVED').length
    : 0;
  const assignedByMeCount = currentUser
    ? tasks.filter(t => t.created_by === currentUser.id && t.status !== 'APPROVED').length
    : 0;

  const navItems = [
    { label: 'Overview', href: '/', icon: LayoutDashboard },
    { label: 'My Tasks', href: '/my-tasks', icon: CheckSquare, badge: myTasksCount },
    { label: 'Assigned by Me', href: '/assigned-by-me', icon: Send, badge: assignedByMeCount },
    { label: 'Reports & Export', href: '/reports', icon: FileSpreadsheet },
    { label: 'Team Directory', href: '/team', icon: Users },
    { label: 'Notifications', href: '/notifications', icon: Bell, badge: unreadNotifications },
  ];

  return (
    <>
      {/* Backdrop overlay for mobile/tablet */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 z-40 lg:hidden transition-opacity duration-300"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-[#FBF9F5] border-r border-[#E8E2D5] flex flex-col h-full z-50 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:z-0 lg:translate-x-0 select-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Organization Brand Header */}
        <div className="p-5 border-b border-[#E8E2D5] bg-white/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#0E0C12] border border-stone-200/50 flex items-center justify-center text-white shadow-xs shrink-0 p-1">
              <img src="/logo.png" alt="Trinetra Logo" className="w-full h-full object-contain" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-sm font-bold tracking-tight text-stone-900 leading-none truncate max-w-[100px]">
                  {organization?.name || (currentUser ? `${currentUser.full_name}'s Workspace` : 'Trinetra Workspace')}
                </h1>
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[9px] tracking-wider uppercase shrink-0">
                  BETA
                </span>
              </div>
              <span className="text-[11px] text-stone-500 font-medium">Task Accountability Engine</span>
            </div>
          </div>
          {/* Close button visible only on mobile/tablet */}
          <button
            onClick={closeSidebar}
            className="p-1 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 lg:hidden cursor-pointer shrink-0"
            title="Close Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real User Profile Box */}
        {currentUser && (
          <div className="p-3 border-b border-[#E8E2D5] bg-[#F4EFE6]/50">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#E8E2D5]">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center text-xs font-semibold shrink-0">
                  {currentUser.full_name ? currentUser.full_name[0] : 'U'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-stone-900 truncate leading-tight">
                    {currentUser.full_name}
                  </p>
                  <p className="text-[10px] text-stone-500 truncate leading-none">
                    {currentUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="p-1 rounded text-stone-400 hover:text-red-700 hover:bg-stone-100 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Workspace
            </div>
            <nav className="space-y-0.5">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#4A154B] text-white shadow-xs'
                        : 'text-stone-700 hover:bg-[#ECE5D8] hover:text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {Boolean(item.badge) && item.badge! > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-purple-100 text-purple-900'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Multi-Project Hierarchy */}
          <div>
            <div data-tour="sidebar-create-project" className="flex items-center justify-between px-3 mb-1.5 p-1 rounded-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Projects ({projects.length})
              </span>
              <button
                onClick={() => (!isPro && projects.length >= 1 ? setIsPaywallOpen(true) : setIsProjectModalOpen(true))}
                className="p-1 rounded-md text-stone-500 hover:text-purple-900 hover:bg-stone-200 transition-colors cursor-pointer"
                title={!isPro && projects.length >= 1 ? "Free Limit: 1 Project (Click to Upgrade)" : "Create New Project"}
              >
                {!isPro && projects.length >= 1 ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="space-y-0.5">
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-stone-400 italic">
                  No projects yet. Click + to create.
                </div>
              ) : (
                projects.map(proj => {
                  const isActive = pathname.startsWith(`/projects/${proj.project_key}`);
                  const projTasks = tasks.filter(t => t.project_id === proj.id && t.status !== 'APPROVED').length;

                  return (
                    <Link
                      key={proj.id}
                      href={`/projects/${proj.project_key}`}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-purple-900/10 text-purple-950 font-semibold border border-purple-200'
                          : 'text-stone-700 hover:bg-[#ECE5D8] hover:text-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="px-1.5 py-0.5 rounded bg-stone-200/80 font-mono text-[10px] font-bold text-stone-700 shrink-0">
                          {proj.project_key}
                        </span>
                        <span className="truncate">{proj.name}</span>
                      </div>
                      {projTasks > 0 && (
                        <span className="text-[10px] font-semibold text-stone-500 shrink-0 ml-1">
                          {projTasks}
                        </span>
                      )}
                    </Link>
                  );
                })
              )}
            </div>
          </div>
          {/* Pro Upgrade Banner for Free Users */}
          {!isPro && (
            <div className="p-3 mx-1 rounded-xl bg-linear-to-br from-purple-950 via-[#3B0F3C] to-purple-900 text-white shadow-sm space-y-2 border border-purple-800/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Free Tier Active</span>
                </div>
                <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded font-mono text-purple-200">
                  1 Proj / 2 Mem
                </span>
              </div>
              <p className="text-[10px] text-purple-200 leading-tight">
                Unlock unlimited projects, unlimited team members & 8-sheet Excel audit exports.
              </p>
              <button
                type="button"
                onClick={() => setIsPaywallOpen(true)}
                className="w-full py-1.5 rounded-lg bg-linear-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-[11px] transition-colors cursor-pointer shadow-xs"
              >
                Upgrade • ₹99/mo or ₹399/yr
              </button>
            </div>
          )}
        </div>

        {/* Footer info & Links */}
        <div className="p-3 border-t border-[#E8E2D5] bg-white/50 text-[11px] text-stone-500 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FolderDot className="w-3.5 h-3.5 text-purple-900" />
              <span className="font-semibold text-stone-700">Trinetra Tasks</span>
            </div>
            <span className="text-[10px] bg-purple-50 text-purple-950 font-semibold px-1.5 py-0.5 rounded border border-purple-200">
              {isPro ? 'Pro Active' : 'Free Tier'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-100">
            <button
              type="button"
              onClick={openTutorial}
              className="hover:text-purple-900 transition-colors font-semibold flex items-center gap-1 cursor-pointer text-purple-950"
              title="View Onboarding Tour"
            >
              <HelpCircle className="w-3 h-3 text-purple-900" />
              <span>Tour</span>
            </button>
            <span>•</span>
            <Link href="/faq" className="hover:text-purple-900 transition-colors font-medium">
              FAQ
            </Link>
            <span>•</span>
            <Link href="/refund-policy" className="hover:text-purple-900 transition-colors font-medium">
              Refund Policy
            </Link>
            <span>•</span>
            <a href="mailto:support@trinetraedu-ai.com" className="hover:text-purple-900 transition-colors font-medium">
              Support
            </a>
          </div>
        </div>
      </aside>

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />

      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        title="Upgrade to Trinetra Pro"
        subtitle="Scale your organization with unlimited projects, unlimited team members, and enterprise Excel workbooks."
        highlightedFeature="GENERAL"
      />
    </>
  );
};
