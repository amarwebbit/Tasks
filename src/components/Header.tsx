'use client';

import React, { useState } from 'react';
import { useTrinetra } from '@/lib/store';
import { Plus, ShieldCheck, Menu } from 'lucide-react';
import { CreateTaskModal } from './CreateTaskModal';
import { useUi } from '@/lib/ui-context';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  projectId?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, projectId }) => {
  const { currentUser } = useTrinetra();
  const { toggleSidebar } = useUi();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  return (
    <>
      <header className="h-16 px-4 sm:px-8 bg-white border-b border-[#E8E2D5] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 lg:hidden cursor-pointer shrink-0"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-stone-900 leading-tight truncate">
              {title || 'Dashboard'}
            </h1>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-stone-500 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F4EFE6] border border-[#E8E2D5] text-xs text-stone-700">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-900" />
              <span>Active: <strong>{currentUser.full_name}</strong></span>
            </div>
          )}

          <button
            onClick={() => setIsCreateTaskOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#4A154B] hover:bg-[#3B0F3C] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </header>

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        defaultProjectId={projectId}
      />
    </>
  );
};
