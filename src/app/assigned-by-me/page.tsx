'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTrinetra } from '@/lib/store';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Send, Filter } from 'lucide-react';

export default function AssignedByMePage() {
  const { currentUser, tasks } = useTrinetra();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const delegatedTasks = currentUser ? tasks.filter(t => t.created_by === currentUser.id) : [];

  const filteredTasks = delegatedTasks.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Assigned by Me"
        subtitle={`All tasks created and delegated by ${currentUser?.full_name || 'User'}`}
      />

      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-stone-500">Filter by status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800"
            >
              <option value="ALL">All Statuses ({delegatedTasks.length})</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="SUBMITTED">Submitted for Review</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
              <option value="APPROVED">Completed / Approved</option>
            </select>
          </div>

          <span className="text-xs text-stone-500">
            Showing {filteredTasks.length} delegated tasks
          </span>
        </div>

        <div className="bg-white border border-[#E8E2D5] rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4EFE6]/60 border-b border-[#E8E2D5] text-stone-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Task ID</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    No tasks delegated by you under this filter.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(t => {
                  const pKey = t.project?.project_key || 'TRI';
                  const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'APPROVED';
                  return (
                    <tr key={t.id} className="hover:bg-[#FBF9F5] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-600">
                        {pKey}-{t.task_number}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-stone-600">
                        {t.project?.name || 'Project'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-stone-900">
                        <Link
                          href={`/projects/${pKey}/tasks/${t.task_number}`}
                          className="hover:text-purple-950"
                        >
                          {t.title}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-stone-700">
                        {t.assignee?.full_name || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        {t.due_date ? (
                          <span className={`font-medium ${isOverdue ? 'text-red-700 font-bold' : 'text-stone-600'}`}>
                            {new Date(t.due_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-stone-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/projects/${pKey}/tasks/${t.task_number}`}
                          className="px-2.5 py-1 text-purple-950 hover:bg-purple-100 rounded font-semibold transition-colors inline-block"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
