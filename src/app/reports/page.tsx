'use client';

import React, { useState } from 'react';
import { useTrinetra } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { FileSpreadsheet, Download, Filter, CheckCircle2, AlertCircle, Lock, Sparkles } from 'lucide-react';
import { PaywallModal } from '@/components/PaywallModal';

export default function ReportsPage() {
  const { projects, users, tasks, isPro } = useTrinetra();

  const [projectId, setProjectId] = useState('ALL');
  const [assigneeId, setAssigneeId] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [completedOnly, setCompletedOnly] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  // Compute filtered dataset for preview
  const filteredTasks = tasks.filter(t => {
    if (projectId !== 'ALL' && t.project_id !== projectId) return false;
    if (assigneeId !== 'ALL' && t.assigned_to !== assigneeId) return false;
    if (status !== 'ALL' && t.status !== status) return false;
    if (priority !== 'ALL' && t.priority !== priority) return false;
    if (overdueOnly && (!t.due_date || new Date(t.due_date) >= new Date() || t.status === 'APPROVED')) return false;
    if (completedOnly && t.status !== 'APPROVED') return false;
    return true;
  });

  const handleDownload = async (type: 'QUICK' | 'COMPLETE') => {
    if (type === 'COMPLETE' && !isPro) {
      setIsPaywallOpen(true);
      return;
    }

    try {
      setIsExporting(true);
      setExportMessage(null);

      const supabase = getSupabaseClient();
      const sessionRes = await supabase?.auth.getSession();
      const token = sessionRes?.data.session?.access_token;

      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type,
          projectId,
          assigneeId,
          status,
          priority,
          overdueOnly,
          completedOnly,
        }),
      });

      if (!res.ok) {
        let errorMsg = 'Failed to generate Excel report';
        try {
          const errData = await res.json();
          if (errData?.error) {
            errorMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const projObj = projects.find(p => p.id === projectId);
      const pKey = projObj ? projObj.project_key : 'TRINETRA';
      a.download = `${pKey}_${type === 'QUICK' ? 'Quick_Report' : 'Complete_Report'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setExportMessage(`Successfully generated and downloaded ${type === 'QUICK' ? 'Quick Report' : 'Complete 7-Sheet Workbook'}.`);
    } catch (err: any) {
      console.error(err);
      alert(`Export generation failed: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Reports & Excel Export"
        subtitle="Server-side XLSX generator with complete multi-sheet audit history"
      />

      <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {exportMessage && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{exportMessage}</span>
            </div>
            <button onClick={() => setExportMessage(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
          </div>
        )}

        {/* Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-[#E8E2D5] rounded-xl p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 uppercase">
                  Lightweight Export
                </span>
                <FileSpreadsheet className="w-5 h-5 text-stone-400" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Quick Summary Report</h3>
              <p className="text-xs text-stone-600 mt-1">
                Single Excel sheet with filtered Task IDs, title, assignee, priority, status, due date, and completion date.
              </p>
            </div>

            <button
              onClick={() => handleDownload('QUICK')}
              disabled={isExporting}
              className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#F4EFE6] hover:bg-[#ECE5D8] text-stone-800 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-purple-900" />
              <span>{isExporting ? 'Generating XLSX...' : 'Download Quick Report (.xlsx)'}</span>
            </button>
          </div>

          <div className={`bg-white border-2 rounded-xl p-6 shadow-2xs flex flex-col justify-between ${!isPro ? 'border-amber-300 bg-amber-50/20 relative overflow-hidden' : 'border-purple-200'}`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 uppercase">
                  Complete Audit Workbook
                </span>
                {!isPro ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-[10px] font-black uppercase">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>Pro Only</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-950 text-[10px] font-bold">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Unlocked</span>
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-stone-900">7-Sheet Comprehensive Audit Workbook</h3>
              <p className="text-xs text-stone-600 mt-1">
                Includes: <strong>1. Summary, 2. Tasks, 3. Activity Timeline, 4. Comments & Clarifications, 5. Team Members & Workload, 6. Attachments, 7. Email Event Logs</strong>.
              </p>
            </div>

            <button
              onClick={() => handleDownload('COMPLETE')}
              disabled={isExporting}
              className={`mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer ${
                !isPro
                  ? 'bg-linear-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-stone-950 font-black'
                  : 'bg-[#4A154B] hover:bg-[#3B0F3C] text-white'
              }`}
            >
              {!isPro ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Unlock 7-Sheet Audit Workbook (Pro)</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>{isExporting ? 'Building 7-Sheet Workbook...' : 'Download Complete Workbook (.xlsx)'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter Configuration Panel */}
        <div className="bg-white border border-[#E8E2D5] rounded-xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-900" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                Report Filter Parameters
              </h3>
            </div>
            <span className="text-xs text-stone-500 font-medium">
              Matches {filteredTasks.length} task records
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Project Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Project</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900"
              >
                <option value="ALL">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>[{p.project_key}] {p.name}</option>
                ))}
              </select>
            </div>

            {/* Assignee Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Assignee</label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900"
              >
                <option value="ALL">All Members</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900"
              >
                <option value="ALL">All Statuses</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="SUBMITTED">Submitted for Review</option>
                <option value="CHANGES_REQUESTED">Changes Requested</option>
                <option value="APPROVED">Completed / Approved</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-stone-700">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={e => setOverdueOnly(e.target.checked)}
                className="rounded border-stone-300 text-purple-900 focus:ring-purple-800"
              />
              <span className="font-medium">Filter Overdue Tasks Only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-stone-700">
              <input
                type="checkbox"
                checked={completedOnly}
                onChange={e => setCompletedOnly(e.target.checked)}
                className="rounded border-stone-300 text-purple-900 focus:ring-purple-800"
              />
              <span className="font-medium">Filter Completed Tasks Only</span>
            </label>
          </div>
        </div>

        {/* Live Filter Preview Table */}
        <div className="bg-white border border-[#E8E2D5] rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 bg-[#F4EFE6]/40 border-b border-[#E8E2D5]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Dataset Preview ({filteredTasks.length} Rows)
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-[#F4EFE6]/60 border-b border-[#E8E2D5] text-stone-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Task ID</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-stone-400">
                    No tasks match the active filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(t => (
                  <tr key={t.id} className="hover:bg-[#FBF9F5]">
                    <td className="py-3 px-4 font-mono font-bold text-stone-600">
                      {t.project?.project_key || 'TRI'}-{t.task_number}
                    </td>
                    <td className="py-3 px-4">{t.project?.name}</td>
                    <td className="py-3 px-4 font-semibold text-stone-900">{t.title}</td>
                    <td className="py-3 px-4">{t.assignee?.full_name || 'Unassigned'}</td>
                    <td className="py-3 px-4"><PriorityBadge priority={t.priority} /></td>
                    <td className="py-3 px-4"><StatusBadge status={t.status} /></td>
                    <td className="py-3 px-4 text-stone-600">{t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        title="Unlock Complete 7-Sheet Excel Audits"
        subtitle="7-Sheet Workbook includes full immutable activity timeline, discussion comments, attachments, and email logs. Upgrade to Pro for unlimited exports."
        highlightedFeature="REPORTS"
      />
    </div>
  );
}
