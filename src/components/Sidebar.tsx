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
} from 'lucide-react';
import { CreateProjectModal } from './CreateProjectModal';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const {
    organization,
    projects,
    tasks,
    currentUser,
    notifications,
    signOut,
  } = useTrinetra();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

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
      <aside className="w-64 bg-[#FBF9F5] border-r border-[#E8E2D5] flex flex-col h-screen sticky top-0 shrink-0 select-none">
        {/* Organization Brand Header */}
        <div className="p-5 border-b border-[#E8E2D5] bg-white/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center text-white font-bold text-sm shadow-xs">
              T
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-stone-900 leading-none">
                {organization?.name || 'Trinetra Workspace'}
              </h1>
              <span className="text-[11px] text-stone-500 font-medium">Task Accountability Engine</span>
            </div>
          </div>
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
            <div className="flex items-center justify-between px-3 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Projects ({projects.length})
              </span>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="p-1 rounded-md text-stone-500 hover:text-purple-900 hover:bg-stone-200 transition-colors"
                title="Create New Project"
              >
                <Plus className="w-3.5 h-3.5" />
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
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#E8E2D5] bg-white/40 text-[11px] text-stone-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FolderDot className="w-3.5 h-3.5 text-stone-400" />
            <span>Trinetra Production</span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
            Supabase Cloud
          </span>
        </div>
      </aside>

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
    </>
  );
};
