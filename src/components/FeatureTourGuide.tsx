'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTrinetra } from '@/lib/store';
import { useUi } from '@/lib/ui-context';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  LayoutDashboard,
  FolderPlus,
  GitBranch,
  Users,
  CheckSquare,
  ListTodo,
  Send,
  Bell,
  FileSpreadsheet,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

interface TourStep {
  id: string;
  selector: string;
  path: string;
  badge: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  whatIsThis: string;
  howToUse: string;
  preferredPosition: 'bottom' | 'top' | 'right' | 'left';
  requiresSidebar?: boolean;
}

export const FeatureTourGuide: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, projects } = useTrinetra();
  const { isTutorialOpen, openTutorial, closeTutorial, openSidebar, closeSidebar } = useUi();

  const firstProjectKey = projects[0]?.project_key;

  const TOUR_STEPS: TourStep[] = [
    {
      id: 'command-center',
      selector: '[data-tour="command-center-metrics"]',
      path: '/',
      badge: 'Step 1 of 8 • Home Screen',
      title: 'Home Overview',
      icon: LayoutDashboard,
      accentColor: 'text-purple-900 bg-purple-100',
      whatIsThis:
        'This is your main home screen. It shows you a simple summary of everything happening right now—how many projects you have, how many tasks your team is working on, and how much work is finished.',
      howToUse:
        'Look at these cards whenever you log in. They help you see how fast work is getting done and quickly spot if any work is stuck or running late.',
      preferredPosition: 'bottom',
    },
    {
      id: 'create-project',
      selector: '[data-tour="sidebar-create-project"]',
      path: '/',
      badge: 'Step 2 of 8 • Projects',
      title: 'Projects & Task Numbers',
      icon: FolderPlus,
      accentColor: 'text-amber-900 bg-amber-100',
      whatIsThis:
        'Projects help you keep different types of work separated (like Marketing, Mobile App, or Website). Every project gets a short code (like TRI or APP), and every task automatically gets a simple number like TRI-1, TRI-2 so nothing gets mixed up or lost.',
      howToUse:
        'Click the "+" button right here to start a new project, choose who is in charge as the Team Leader, and decide who is allowed to give tasks to teammates.',
      preferredPosition: 'right',
      requiresSidebar: true,
    },
    {
      id: 'team-directory',
      selector: '[data-tour="team-header"]',
      path: '/team',
      badge: 'Step 3 of 8 • Team',
      title: 'Team Members & Roles',
      icon: Users,
      accentColor: 'text-indigo-900 bg-indigo-100',
      whatIsThis:
        'This is where you see all your teammates and what they can do. You can easily let someone lead and assign tasks in one project, while keeping them as a normal member in another project.',
      howToUse:
        'Go here to invite new people to your team by entering their email, and see how many tasks each person has so work is shared fairly.',
      preferredPosition: 'bottom',
    },
    {
      id: 'my-tasks',
      selector: '[data-tour="my-tasks-header"]',
      path: '/my-tasks',
      badge: 'Step 4 of 8 • Your Work',
      title: 'My Tasks (Your To-Do List)',
      icon: CheckSquare,
      accentColor: 'text-emerald-900 bg-emerald-100',
      whatIsThis:
        'This is your personal to-do list. Every single task given to you from any project shows up right here in one easy-to-read place.',
      howToUse:
        'Use the filter at the top to see tasks by status. Click any task to read the instructions, let your leader know you started working, or ask for help if you are stuck.',
      preferredPosition: 'bottom',
    },
    {
      id: 'task-workflow',
      selector: '[data-tour="my-tasks-header"]',
      path: '/my-tasks',
      badge: 'Step 5 of 8 • Task Steps',
      title: 'How Tasks Move from Start to Finish',
      icon: ListTodo,
      accentColor: 'text-teal-900 bg-teal-100',
      whatIsThis:
        'Every task moves through 6 simple steps so work never gets lost: 1. Draft (writing the task), 2. Assigned (given to someone), 3. In Progress (working on it), 4. Blocked (stuck and need help), 5. Submitted (sent to be checked), and 6. Approved (checked and finished!).',
      howToUse:
        'When you finish your work, click "Submit" and add a short note or file to show what you did. A task is only complete when your leader checks it and clicks "Approve".',
      preferredPosition: 'bottom',
    },
    {
      id: 'assigned-by-me',
      selector: '[data-tour="assigned-by-me-header"]',
      path: '/assigned-by-me',
      badge: 'Step 6 of 8 • Reviewing Work',
      title: 'Assigned By Me (Checking Work)',
      icon: Send,
      accentColor: 'text-blue-900 bg-blue-100',
      whatIsThis:
        'If you give tasks to other teammates, this is where you keep an eye on them. You can easily see who is working on what without having to message them for updates.',
      howToUse:
        'When a teammate finishes work, it will appear here for you to check. Read their note and proof. If it looks great, click "Approve". If they need to fix something, click "Request Revisions" and tell them what to change.',
      preferredPosition: 'bottom',
    },
    {
      id: 'notifications',
      selector: '[data-tour="notifications-header"]',
      path: '/notifications',
      badge: 'Step 7 of 8 • Alerts',
      title: 'Notifications & Email Updates',
      icon: Bell,
      accentColor: 'text-amber-900 bg-amber-100',
      whatIsThis:
        'You never have to wonder what is happening. Whenever someone gives you a task, asks you for help, or approves your work, you will see an alert here and get an email in your inbox.',
      howToUse:
        'Click any alert to open that task right away, read comments from teammates, or click "Mark All as Read" to clean up your list.',
      preferredPosition: 'bottom',
    },
    {
      id: 'reports-workbook',
      selector: '[data-tour="reports-workbook-card"]',
      path: '/reports',
      badge: 'Step 8 of 8 • Excel Reports',
      title: 'Download Full Excel Reports (8 Sheets)',
      icon: FileSpreadsheet,
      accentColor: 'text-purple-900 bg-purple-100',
      whatIsThis:
        'Need to show your work to your boss, client, or team? Trinetra can turn your entire project into a clean, ready-to-open Excel spreadsheet with 8 neatly organized sheets.',
      howToUse:
        'Select your project and click "Download Complete Workbook". You get 8 clear sheets: Overview Summary, Task List, Work History, Comments, Team Workload, Uploaded Files, Email History, and Code Commits.',
      preferredPosition: 'top',
    },
  ];

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [cardMeasuredHeight, setCardMeasuredHeight] = useState<number>(440);
  const cardRef = useRef<HTMLDivElement>(null);

  const storageKey = currentUser?.id ? `trinetra_feature_tour_completed_${currentUser.id}` : null;

  // Window resize listener
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;

  // Auto-trigger for first-time visitor only
  useEffect(() => {
    if (!storageKey) return;
    try {
      const hasCompleted = localStorage.getItem(storageKey);
      if (!hasCompleted) {
        const timer = setTimeout(() => {
          openTutorial();
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage in private browsing
    }
  }, [storageKey, openTutorial]);

  const step = TOUR_STEPS[currentStepIndex];

  // Open or close mobile sidebar based on step requirement
  useEffect(() => {
    if (!isTutorialOpen || !step) return;

    if (step.requiresSidebar && windowWidth < 1024) {
      openSidebar();
    } else if (!step.requiresSidebar && windowWidth < 1024) {
      closeSidebar();
    }
  }, [isTutorialOpen, step, windowWidth, openSidebar, closeSidebar]);

  // Update target element coordinates & card height
  const updateTargetRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
    if (cardRef.current) {
      const h = cardRef.current.offsetHeight;
      if (h > 0) setCardMeasuredHeight(h);
    }
  }, [step]);

  // Navigate to step's route if different and locate element
  useEffect(() => {
    if (!isTutorialOpen || !step) return;

    if (pathname !== step.path) {
      setIsNavigating(true);
      router.push(step.path);
      return;
    }

    setIsNavigating(false);

    // Poll until element mounts
    let attempts = 0;
    const maxAttempts = 25;
    const interval = setInterval(() => {
      attempts++;
      const el = document.querySelector(step.selector);
      if (el) {
        clearInterval(interval);

        if (typeof window !== 'undefined' && window.innerWidth < 640) {
          const rect = el.getBoundingClientRect();
          // On mobile, if element is in lower half of screen, scroll toward end; otherwise scroll toward start
          if (rect.top > window.innerHeight * 0.45) {
            el.scrollIntoView({ behavior: 'smooth', block: 'end' });
          } else {
            const scrollTarget = window.scrollY + rect.top - 70;
            window.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
          }
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
        setTimeout(updateTargetRect, 250);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        setTargetRect(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isTutorialOpen, currentStepIndex, pathname, step, router, updateTargetRect]);

  // Update position on window resize or scroll
  useEffect(() => {
    if (!isTutorialOpen) return;
    const handleScrollOrResize = () => updateTargetRect();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isTutorialOpen, updateTargetRect]);

  const endTour = useCallback(
    (navigateHome = false) => {
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, 'true');
        } catch {
          // Ignore
        }
      }
      closeSidebar();
      closeTutorial();
      setCurrentStepIndex(0);
      if (navigateHome && pathname !== '/') {
        router.push('/');
      }
    },
    [storageKey, closeTutorial, closeSidebar, pathname, router]
  );

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      endTour(true);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isTutorialOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        endTour(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTutorialOpen, currentStepIndex, endTour]);

  if (!isTutorialOpen || !step) return null;

  const Icon = step.icon;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Responsive Positioning:
  // On Mobile: Dock securely at the bottom (or top if element is near the bottom)
  // On Desktop/Tablet: Float card next to the highlighted element
  let cardStyles: React.CSSProperties = {};
  const cardWidth = Math.min(420, windowWidth - 24);
  const margin = 12;

  if (isMobile) {
    // Phone layout: Clean auto-flipping sheet
    // If the element is in the lower half of the screen, place card at top.
    // If element is in upper half, place card at bottom.
    const elementCenterY = targetRect ? targetRect.top + targetRect.height / 2 : window.innerHeight / 2;
    const placeCardAtTop = targetRect && elementCenterY > window.innerHeight * 0.45;

    if (placeCardAtTop) {
      cardStyles = {
        position: 'fixed',
        top: '8px',
        left: '8px',
        right: '8px',
        maxWidth: 'calc(100vw - 16px)',
        margin: '0 auto',
        zIndex: 75,
      };
    } else {
      cardStyles = {
        position: 'fixed',
        bottom: '8px',
        left: '8px',
        right: '8px',
        maxWidth: 'calc(100vw - 16px)',
        margin: '0 auto',
        zIndex: 75,
      };
    }
  } else if (targetRect) {
    // Tablet & Desktop layout: Floating anchored tooltip
    const cardHeight = cardMeasuredHeight || 420;
    let cardTop = 100;
    let cardLeft = 100;

    if (step.preferredPosition === 'bottom') {
      cardTop = targetRect.bottom + margin;
      cardLeft = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    } else if (step.preferredPosition === 'top') {
      cardTop = targetRect.top - cardHeight - margin;
      cardLeft = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    } else if (step.preferredPosition === 'right') {
      // Center vertically beside the target element
      cardTop = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      cardLeft = targetRect.right + margin;
    } else if (step.preferredPosition === 'left') {
      // Center vertically beside the target element
      cardTop = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      cardLeft = targetRect.left - cardWidth - margin;
    }

    // Viewport clamping for desktop/laptop:
    // If card extends beyond bottom of screen, shift it UP so it fits completely!
    if (typeof window !== 'undefined') {
      if (cardTop + cardHeight > window.innerHeight - 16) {
        cardTop = Math.max(16, window.innerHeight - cardHeight - 16);
      }
      if (cardTop < 16) {
        cardTop = 16;
      }
      cardLeft = Math.max(margin, Math.min(window.innerWidth - cardWidth - margin, cardLeft));
    }

    cardStyles = {
      position: 'fixed',
      top: `${cardTop}px`,
      left: `${cardLeft}px`,
      width: `${cardWidth}px`,
      transition: 'top 0.25s ease, left 0.25s ease',
    };
  } else if (typeof window !== 'undefined') {
    // Centered fallback if element is still rendering
    const fallbackHeight = cardMeasuredHeight || 420;
    cardStyles = {
      position: 'fixed',
      top: `${Math.max(16, window.innerHeight / 2 - fallbackHeight / 2)}px`,
      left: `${window.innerWidth / 2 - cardWidth / 2}px`,
      width: `${cardWidth}px`,
    };
  }

  const progressPercent = Math.round(((currentStepIndex + 1) / TOUR_STEPS.length) * 100);

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none transition-opacity duration-300">
      {/* Target Element Spotlight Ring & Dark Mask */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: '10px',
            boxShadow: '0 0 0 9999px rgba(15, 12, 18, 0.74)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="ring-3 ring-purple-500 shadow-2xl pointer-events-none animate-pulse"
        />
      )}

      {/* Fallback backdrop when switching pages */}
      {!targetRect && (
        <div className="fixed inset-0 bg-[#0E0C12]/80 backdrop-blur-2xs transition-opacity duration-300 pointer-events-auto" />
      )}

      {/* Responsive Feature Card */}
      <div
        ref={cardRef}
        style={cardStyles}
        className="pointer-events-auto bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Progress Bar */}
        <div className="w-full bg-purple-950/20 h-1">
          <div
            className="bg-linear-to-r from-amber-400 to-purple-400 h-1 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Card Header */}
        <div className="p-2.5 sm:p-4 bg-linear-to-r from-purple-950 via-[#4A154B] to-purple-900 text-white flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-amber-300 font-bold text-[9px] sm:text-[10px] tracking-wider uppercase border border-white/10">
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300" />
              <span>{step.badge}</span>
            </span>
          </div>

          <button
            onClick={() => endTour(true)}
            className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer touch-manipulation"
            title="End Tour (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Body with Responsive Scroll */}
        <div className="p-2.5 sm:p-5 space-y-2 sm:space-y-3 bg-white max-h-[35vh] sm:max-h-[min(340px,calc(100vh-210px))] overflow-y-auto overscroll-contain">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`p-1.5 sm:p-2.5 rounded-xl ${step.accentColor} shrink-0 shadow-xs`}>
              <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-base font-bold text-stone-900 tracking-tight leading-snug truncate">
                {step.title}
              </h3>
              <span className="text-[8px] sm:text-[10px] font-semibold text-purple-950 uppercase tracking-wider block">
                Quick Guide ({currentStepIndex + 1} of {TOUR_STEPS.length})
              </span>
            </div>
          </div>

          {/* "What is this?" Section */}
          <div className="p-2 sm:p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E2D5] space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-stone-900">
              <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-900 shrink-0" />
              <span>What is this?</span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-700 leading-relaxed pl-4 sm:pl-5 font-normal">
              {step.whatIsThis}
            </p>
          </div>

          {/* "How to use it" Section */}
          <div className="p-2 sm:p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-purple-950">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-900 shrink-0" />
              <span>How to use it:</span>
            </div>
            <p className="text-[11px] sm:text-xs text-purple-950 leading-relaxed pl-4 sm:pl-5 font-medium">
              {step.howToUse}
            </p>
          </div>
        </div>

        {/* Card Footer Navigation */}
        <div className="px-2.5 sm:px-5 py-2 sm:py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
          {/* Step Dots */}
          <div className="flex items-center gap-1 shrink-0">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex ? 'w-3.5 sm:w-4 bg-purple-900' : 'w-1 sm:w-1.5 bg-stone-300 hover:bg-stone-400'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons with Mobile-Friendly Touch Padding */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                disabled={isNavigating}
                className="flex items-center gap-1 px-2.5 py-2 sm:py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 active:bg-stone-200 text-stone-700 text-xs font-bold transition-all cursor-pointer shadow-2xs touch-manipulation"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isNavigating}
              className={`flex items-center gap-1 px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs touch-manipulation ${
                isLastStep
                  ? 'bg-linear-to-r from-purple-950 via-[#4A154B] to-purple-800 hover:from-purple-900 text-white'
                  : 'bg-[#4A154B] hover:bg-[#3B0F3C] active:bg-purple-900 text-white'
              }`}
            >
              <span>{isLastStep ? 'Start Working' : 'Next'}</span>
              {isLastStep ? <ArrowRight className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
