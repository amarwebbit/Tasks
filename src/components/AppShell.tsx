'use client';

import React from 'react';
import { TrinetraProvider, useTrinetra } from '@/lib/store';
import { Sidebar } from './Sidebar';
import { AuthScreen } from './AuthScreen';
import { Loader2 } from 'lucide-react';

const InnerShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading } = useTrinetra();

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
        {children}
      </main>
    </div>
  );
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <TrinetraProvider>
      <InnerShell>{children}</InnerShell>
    </TrinetraProvider>
  );
};
