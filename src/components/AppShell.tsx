'use client';

import React from 'react';
import { TrinetraProvider, useTrinetra } from '@/lib/store';
import { Sidebar } from './Sidebar';
import { AuthScreen } from './AuthScreen';
import { Loader2, Mail } from 'lucide-react';

import { usePathname } from 'next/navigation';
import { UiProvider, useUi } from '@/lib/ui-context';
import { SecurityGuard } from './SecurityGuard';
import { FeatureTourGuide } from './FeatureTourGuide';
import { SupportFeedbackModal } from './SupportFeedbackModal';

const InnerShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { currentUser, isLoading } = useTrinetra();
  const { openSupportModal } = useUi();

  // Completely isolate /losers stealth admin route from user app layout
  if (pathname?.startsWith('/losers')) {
    return <div className="min-h-screen bg-[#0E0C12] text-stone-100">{children}</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5]">
        <div className="flex items-center gap-2 text-stone-500 text-xs font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-purple-900" />
          <span>Connecting to Trinetra Database...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="flex min-h-screen bg-[#FBF9F5] text-stone-900">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Highlighted Beta Version Alert Banner */}
        <div className="bg-linear-to-r from-[#4A154B] via-purple-900 to-amber-800 text-white px-4 py-2 flex items-center justify-between text-xs shadow-xs border-b border-amber-500/30 shrink-0 select-none">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-400/20 backdrop-blur-md text-amber-300 font-black text-[10px] tracking-wider uppercase border border-amber-400/30 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              BETA VERSION
            </span>
            <p className="truncate text-stone-200 text-[11px] sm:text-xs">
              <strong className="text-white">Notice:</strong> This is an <strong>Early Access Beta Version</strong> (v0.9.5). Features, workflows, and UI are actively evolving.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => openSupportModal('Beta Feedback & Bug Report - Trinetra Tasks')}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-all border border-white/20 cursor-pointer"
            >
              <Mail className="w-3 h-3 text-amber-300" />
              <span>Feedback & Bug Report</span>
            </button>
          </div>
        </div>

        {children}
        <FeatureTourGuide />
        <SupportFeedbackModal />
      </main>
    </div>
  );
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <TrinetraProvider>
      <UiProvider>
        <SecurityGuard />
        <InnerShell>{children}</InnerShell>
      </UiProvider>
    </TrinetraProvider>
  );
};
