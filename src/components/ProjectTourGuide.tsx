'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTrinetra } from '@/lib/store';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  GitBranch,
  LayoutGrid,
  Plus,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

interface TourStep {
  id: string;
  selector: string;
  badge: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  whatIsThis: string;
  howToUse: string;
  preferredPosition: 'bottom' | 'top' | 'right' | 'left';
}

const PROJECT_TOUR_STEPS: TourStep[] = [
  {
    id: 'project-views',
    selector: '[data-tour="project-nav-tabs"]',
    badge: 'Step 1 of 5 • Project Views',
    title: 'Project Views & Task Board',
    icon: LayoutGrid,
    accentColor: 'text-purple-900 bg-purple-100',
    whatIsThis:
      'This top navigation bar lets you see your project in different ways. You can switch between a simple Task List, a visual drag-and-drop Kanban Board, the Team workload overview, and the full Activity Log.',
    howToUse:
      'Click "Board" to see tasks arranged neatly in columns by status (Assigned, In Progress, Submitted, Approved), or click "Activity Log" to see every single action taken across this project.',
    preferredPosition: 'bottom',
  },
  {
    id: 'github-setup',
    selector: '[data-tour="project-github-setup"]',
    badge: 'Step 2 of 5 • GitHub Setup',
    title: 'Connect GitHub to Track Code',
    icon: GitBranch,
    accentColor: 'text-indigo-900 bg-indigo-100',
    whatIsThis:
      'If your team writes code, you can connect your GitHub repository directly to this project. Once connected, whenever a developer mentions the task number (like TRI-101) in their commit message, Trinetra automatically links their code changes and diffs right inside that task!',
    howToUse:
      'Click this "GitHub Setup" button to link your repository with 1-click or a personal access token. Inside any task, developers can also click "Copy Git Key" to quickly tag their commits without any manual reporting.',
    preferredPosition: 'bottom',
  },
  {
    id: 'new-task',
    selector: '[data-tour="project-new-task-btn"]',
    badge: 'Step 3 of 5 • New Tasks',
    title: 'Create Tasks with Auto-Numbering',
    icon: Plus,
    accentColor: 'text-emerald-900 bg-emerald-100',
    whatIsThis:
      'Every project gives its tasks a unique code (like TRI-1, TRI-2, TRI-3). This makes sure tasks are easy to search, discuss, and track across your team without confusion.',
    howToUse:
      'Click "New Task" to give your task a title, choose an assignee, set the priority (Urgent, High, Normal), and set a deadline. The assignee will be notified immediately.',
    preferredPosition: 'bottom',
  },
  {
    id: 'bulk-upload',
    selector: '[data-tour="project-bulk-upload-btn"]',
    badge: 'Step 4 of 5 • Fast Setup',
    title: "Upload Week's Tasks from Excel",
    icon: Upload,
    accentColor: 'text-blue-900 bg-blue-100',
    whatIsThis:
      "Already have a list of tasks in an Excel sheet or CSV? You don't have to type them one by one. You can upload dozens of tasks in just one second.",
    howToUse:
      'Click "Upload Week\'s Tasks" to download our sample template, paste your tasks, and upload it. All tasks will be created and assigned automatically.',
    preferredPosition: 'bottom',
  },
  {
    id: 'export-report',
    selector: '[data-tour="project-export-btn"]',
    badge: 'Step 5 of 5 • Reports',
    title: 'Download Complete Audit Workbook',
    icon: FileSpreadsheet,
    accentColor: 'text-amber-900 bg-amber-100',
    whatIsThis:
      'Need to share progress with leadership or clients? Trinetra generates an audit-grade Excel file with 8 organized sheets covering everything about this project.',
    howToUse:
      'Click "Export Excel" to get your instant report, or open the "Excel Reports" tab to unlock the complete 8-sheet workbook including project summary, tasks, notes, workload, and Sheet 8 (Code Commits & Diffs).',
    preferredPosition: 'bottom',
  },
];

interface ProjectTourGuideProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const ProjectTourGuide: React.FC<ProjectTourGuideProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}) => {
  const { currentUser } = useTrinetra();

  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [cardMeasuredHeight, setCardMeasuredHeight] = useState<number>(440);
  const cardRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isTourActive = isControlled ? controlledIsOpen : isOpenInternal;

  const storageKey = currentUser?.id
    ? `trinetra_project_tour_completed_${currentUser.id}`
    : null;

  // Window resize listener
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;

  // Auto-trigger on first visit to project
  useEffect(() => {
    if (!storageKey || isControlled) return;
    try {
      const hasCompleted = localStorage.getItem(storageKey);
      if (!hasCompleted) {
        const timer = setTimeout(() => {
          setIsOpenInternal(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch (_) {}
  }, [storageKey, isControlled]);

  const step = PROJECT_TOUR_STEPS[currentStepIndex];

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

  // Locate element whenever step changes
  useEffect(() => {
    if (!isTourActive || !step) return;

    let attempts = 0;
    const maxAttempts = 25;
    const interval = setInterval(() => {
      attempts++;
      const el = document.querySelector(step.selector);
      if (el) {
        updateTargetRect();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [isTourActive, step, updateTargetRect]);

  // Handle scroll & resize to update spotlight
  useEffect(() => {
    if (!isTourActive) return;

    const handleUpdate = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isTourActive, updateTargetRect]);

  const endTour = useCallback(
    (markAsCompleted: boolean = true) => {
      if (markAsCompleted && storageKey) {
        try {
          localStorage.setItem(storageKey, 'true');
        } catch (_) {}
      }
      if (isControlled && controlledOnClose) {
        controlledOnClose();
      } else {
        setIsOpenInternal(false);
      }
    },
    [storageKey, isControlled, controlledOnClose]
  );

  const handleNext = () => {
    if (currentStepIndex < PROJECT_TOUR_STEPS.length - 1) {
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
    if (!isTourActive) return;

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
  }, [isTourActive, currentStepIndex, endTour]);

  if (!isTourActive || !step) return null;

  const Icon = step.icon;
  const isLastStep = currentStepIndex === PROJECT_TOUR_STEPS.length - 1;

  // Responsive Positioning
  let cardStyles: React.CSSProperties = {};
  const cardWidth = Math.min(420, windowWidth - 24);
  const margin = 12;

  if (isMobile) {
    const isElementAtBottom =
      targetRect &&
      targetRect.bottom >
        (typeof window !== 'undefined' ? window.innerHeight * 0.55 : 400);

    if (isElementAtBottom) {
      cardStyles = {
        position: 'fixed',
        top: '12px',
        left: '12px',
        right: '12px',
        maxWidth: 'calc(100vw - 24px)',
        margin: '0 auto',
      };
    } else {
      cardStyles = {
        position: 'fixed',
        bottom: '12px',
        left: '12px',
        right: '12px',
        maxWidth: 'calc(100vw - 24px)',
        margin: '0 auto',
      };
    }
  } else if (targetRect) {
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
      cardTop = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      cardLeft = targetRect.right + margin;
    } else if (step.preferredPosition === 'left') {
      cardTop = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      cardLeft = targetRect.left - cardWidth - margin;
    }

    // Dynamic upward viewport clamping so card is 100% visible on laptops
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
    const fallbackHeight = cardMeasuredHeight || 420;
    cardStyles = {
      position: 'fixed',
      top: `${Math.max(16, window.innerHeight / 2 - fallbackHeight / 2)}px`,
      left: `${window.innerWidth / 2 - cardWidth / 2}px`,
      width: `${cardWidth}px`,
    };
  }

  const progressPercent = Math.round(
    ((currentStepIndex + 1) / PROJECT_TOUR_STEPS.length) * 100
  );

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none transition-opacity duration-300">
      {/* Target Element Spotlight Ring & Dark Mask */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(15, 10, 20, 0.65)',
            border: '2.5px solid #F59E0B',
            pointerEvents: 'none',
            zIndex: 71,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="animate-pulse"
        />
      )}

      {/* Floating Spotlight Tour Card */}
      <div
        ref={cardRef}
        style={cardStyles}
        className="pointer-events-auto z-[75] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col transition-all duration-300 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Progress Accent Bar */}
        <div className="w-full bg-stone-100 h-1">
          <div
            className="bg-linear-to-r from-amber-500 to-purple-700 h-1 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Card Header */}
        <div className="p-3.5 sm:p-4 bg-linear-to-r from-purple-950 via-[#4A154B] to-purple-900 text-white flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 font-bold text-[10px] tracking-wider uppercase border border-white/10">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{step.badge}</span>
            </span>
          </div>

          <button
            onClick={() => endTour(true)}
            className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer touch-manipulation"
            title="End Tour (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Body with Responsive Scroll */}
        <div className="p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 bg-white max-h-[min(340px,calc(100vh-210px))] overflow-y-auto overscroll-contain">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className={`p-2 sm:p-2.5 rounded-xl ${step.accentColor} shrink-0 shadow-xs`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight leading-snug truncate">
                {step.title}
              </h3>
              <span className="text-[9px] sm:text-[10px] font-semibold text-purple-950 uppercase tracking-wider block">
                Project Guide ({currentStepIndex + 1} of {PROJECT_TOUR_STEPS.length})
              </span>
            </div>
          </div>

          {/* "What is this?" Section */}
          <div className="p-2.5 sm:p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E2D5] space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
              <HelpCircle className="w-3.5 h-3.5 text-purple-900 shrink-0" />
              <span>What is this?</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              {step.whatIsThis}
            </p>
          </div>

          {/* "How to use it" Section */}
          <div className="p-2.5 sm:p-3.5 rounded-xl bg-purple-50/50 border border-purple-200/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-900 shrink-0" />
              <span>How to use it:</span>
            </div>
            <p className="text-xs text-purple-950/80 leading-relaxed font-medium">
              {step.howToUse}
            </p>
          </div>
        </div>

        {/* Card Footer: Navigation Controls */}
        <div className="p-3 sm:p-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
          {/* Step Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {PROJECT_TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-5 bg-[#4A154B]'
                    : 'w-1.5 bg-stone-300 hover:bg-stone-400'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg shadow-2xs transition-colors cursor-pointer touch-manipulation"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#4A154B] hover:bg-[#3B0F3C] rounded-lg shadow-xs transition-all cursor-pointer touch-manipulation active:scale-95"
            >
              <span>{isLastStep ? 'Got it, Thanks!' : 'Next'}</span>
              {isLastStep ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
