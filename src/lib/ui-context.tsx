'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface UiContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
  isTutorialOpen: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
  isSupportModalOpen: boolean;
  supportSubject: string;
  openSupportModal: (subject?: string) => void;
  closeSupportModal: () => void;
}

const UiContext = createContext<UiContextType | undefined>(undefined);

export const UiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState('Support & Feedback - Trinetra Tasks');
  const pathname = usePathname();

  // Close sidebar automatically when navigating to a new page on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);
  const openSidebar = () => setIsSidebarOpen(true);

  const openTutorial = () => setIsTutorialOpen(true);
  const closeTutorial = () => setIsTutorialOpen(false);

  const openSupportModal = (subject?: string) => {
    if (subject) setSupportSubject(subject);
    setIsSupportModalOpen(true);
  };
  const closeSupportModal = () => setIsSupportModalOpen(false);

  return (
    <UiContext.Provider
      value={{
        isSidebarOpen,
        toggleSidebar,
        closeSidebar,
        openSidebar,
        isTutorialOpen,
        openTutorial,
        closeTutorial,
        isSupportModalOpen,
        supportSubject,
        openSupportModal,
        closeSupportModal,
      }}
    >
      {children}
    </UiContext.Provider>
  );
};

export const useUi = () => {
  const context = useContext(UiContext);
  if (!context) {
    throw new Error('useUi must be used within a UiProvider');
  }
  return context;
};
