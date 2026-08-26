'use client';

import React, { useState } from 'react';
import { useTrinetra } from '@/lib/store';
import { Plus, ShieldCheck } from 'lucide-react';
import { CreateTaskModal } from './CreateTaskModal';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  projectId?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, projectId }) => {
  const { currentUser } = useTrinetra();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  return (
    <>
      <header className="h-16 px-8 bg-white border-b border-[#E8E2D5] flex items-center justify-between sticky top-0 z-30">
        <div>
          <h1 className="text-lg font-bold text-stone-900 leading-tight">
            {title || 'Dashboard'}
          </h1>
          {subtitle && (
            <p className="text-xs text-stone-500">{subtitle}</p>
          )}
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
