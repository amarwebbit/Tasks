'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, AlertTriangle, ArrowRight } from 'lucide-react';

export const SecurityGuard: React.FC = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Proactively bypass during local development
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    const triggerLockdown = () => {
      if (hasTriggered.current) return;
      hasTriggered.current = true;
      setIsLocked(true);
    };

    // 1. Prevent Right-Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerLockdown();
    };
    document.addEventListener('contextmenu', handleContextMenu);

    // 2. Prevent Keyboard Inspect Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      const isInspectKey =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toUpperCase() === 'U') ||
        (isMac && e.metaKey && e.altKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (isMac && e.metaKey && e.key.toUpperCase() === 'U');

      if (isInspectKey) {
        e.preventDefault();
        e.stopPropagation();
        triggerLockdown();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 3. Heuristic DevTools Size Check (on window resize)
    const handleResize = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        triggerLockdown();
      }
    };
    window.addEventListener('resize', handleResize);

    // 4. Debugger Latency Detection Loop
    const interval = setInterval(() => {
      const start = performance.now();
      debugger; // When DevTools is closed, this executes instantly. When open, it pauses/halts, causing a time delay.
      const end = performance.now();
      if (end - start > 100) {
        triggerLockdown();
      }
    }, 1000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, []);

  // 5. Handle Tab Termination / Redirection countdown
  useEffect(() => {
    if (!isLocked) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Attempt to close the window
          window.close();
          // Fallback to blank page redirect if browser blocks window.close()
          window.location.replace('about:blank');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked]);

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-[#0B090F] text-stone-100 select-none">
      {/* Decorative Security Grids */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-red-900/10 blur-[120px] pointer-events-none" />

      {/* Main warning card */}
      <div className="max-w-md w-full text-center space-y-6 relative z-10">
        {/* Pulsing Warning Icon Wrapper */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border-2 border-red-500/20 shadow-2xl relative animate-pulse">
          <ShieldAlert className="w-10 h-10 text-red-500" />
          <div className="absolute -inset-0.5 rounded-2xl bg-red-500/30 blur-md -z-10 opacity-70" />
        </div>

        {/* Header warnings */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest mx-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span>Suspicious Activity Detected</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mt-3">
            Access Has Been Blocked
          </h1>
          <p className="text-xs text-stone-400 leading-relaxed max-w-sm mx-auto">
            Developer tools opening or page inspection attempts are restricted to protect workspace integrity, database privacy, and secure user audits.
          </p>
        </div>

        {/* Countdown Info Panel */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md space-y-3">
          <div className="flex items-center justify-center gap-1 text-[40px] font-black font-mono text-red-500 leading-none">
            {countdown}
            <span className="text-xs font-bold text-stone-400 tracking-wider ml-1 uppercase">Seconds</span>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all duration-1000 ease-linear rounded-full" 
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-stone-500 leading-tight">
            Security audit logged. This browser session is terminating and redirecting to a secure blank page.
          </p>
        </div>

        {/* Exit options */}
        <div className="pt-2 text-[11px] text-stone-500">
          Trinetra Tasks Security Guard Engine (v1.0.2)
        </div>
      </div>
    </div>
  );
};
