import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, CheckSquare, FileSpreadsheet, HelpCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0E0C12] text-stone-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Glowing background blurs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-lg w-full text-center space-y-6 z-10">
        {/* Brand Logo & 404 Header */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-[#4A154B] text-white font-extrabold text-2xl shadow-xl shadow-purple-950/50 mb-2">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Page Lost in Workflow
          </h1>
          <p className="text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
            The project, task, or page you are trying to access does not exist, has been moved, or you may not have permission to view it.
          </p>
        </div>

        {/* Quick Links Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl space-y-2 text-left">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-2 block">
            Suggested Destinations:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              href="/"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 transition-all group"
            >
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 group-hover:text-purple-200">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Workspace Overview</span>
                <span className="text-[10px] text-stone-400">Back to main dashboard</span>
              </div>
            </Link>

            <Link
              href="/my-tasks"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 transition-all group"
            >
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 group-hover:text-emerald-200">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">My Tasks</span>
                <span className="text-[10px] text-stone-400">View tasks assigned to you</span>
              </div>
            </Link>

            <Link
              href="/reports"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 transition-all group"
            >
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 group-hover:text-amber-200">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Excel Reports</span>
                <span className="text-[10px] text-stone-400">Audit logs and downloads</span>
              </div>
            </Link>

            <Link
              href="/faq"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 transition-all group"
            >
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 group-hover:text-blue-200">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Help & FAQ</span>
                <span className="text-[10px] text-stone-400">Common questions & rules</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Primary Return Button */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 via-[#4A154B] to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Workspace Dashboard</span>
          </Link>
        </div>

        <p className="text-[11px] text-stone-500">
          Trinetra Tasks • Multi-Project Accountability Engine
        </p>
      </div>
    </div>
  );
}
