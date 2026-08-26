'use client';

import React from 'react';
import Link from 'next/link';
import { Task, TaskStatus } from '@/types/database';
import { PriorityBadge } from './PriorityBadge';
import { Clock, AlertTriangle, ArrowRight, User } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  projectKey?: string;
}

interface ColumnConfig {
  id: string;
  title: string;
  statuses: TaskStatus[];
  headerBg: string;
  badgeBg: string;
  textColor: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, projectKey }) => {
  const columns: ColumnConfig[] = [
    {
      id: 'assigned',
      title: 'Assigned',
      statuses: ['ASSIGNED', 'ACKNOWLEDGED', 'DRAFT'],
      headerBg: 'bg-indigo-50/70 border-indigo-200',
      badgeBg: 'bg-indigo-100 text-indigo-900',
      textColor: 'text-indigo-950',
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      statuses: ['IN_PROGRESS'],
      headerBg: 'bg-blue-50/70 border-blue-200',
      badgeBg: 'bg-blue-100 text-blue-900',
      textColor: 'text-blue-950',
    },
    {
      id: 'blocked',
      title: 'Blocked',
      statuses: ['BLOCKED'],
      headerBg: 'bg-orange-50/70 border-orange-200',
      badgeBg: 'bg-orange-100 text-orange-900',
      textColor: 'text-orange-950',
    },
    {
      id: 'submitted',
      title: 'Submitted for Review',
      statuses: ['SUBMITTED', 'CHANGES_REQUESTED'],
      headerBg: 'bg-purple-50/70 border-purple-200',
      badgeBg: 'bg-purple-100 text-purple-900',
      textColor: 'text-purple-950',
    },
    {
      id: 'completed',
      title: 'Completed',
      statuses: ['APPROVED'],
      headerBg: 'bg-emerald-50/70 border-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-900',
      textColor: 'text-emerald-950',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start overflow-x-auto pb-6">
      {columns.map(col => {
        const colTasks = tasks.filter(t => col.statuses.includes(t.status));

        return (
          <div
            key={col.id}
            className="bg-[#FBF9F5] border border-[#E8E2D5] rounded-xl flex flex-col min-w-[260px] shadow-2xs"
          >
            {/* Column Header */}
            <div
              className={`px-3.5 py-3 border-b flex items-center justify-between rounded-t-xl ${col.headerBg}`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${col.textColor}`}>
                  {col.title}
                </span>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${col.badgeBg}`}
                >
                  {colTasks.length}
                </span>
              </div>
            </div>

            {/* Column Body / Cards */}
            <div className="p-3 space-y-3 min-h-[350px]">
              {colTasks.length === 0 ? (
                <div className="h-32 border border-dashed border-stone-200 rounded-lg flex items-center justify-center text-xs text-stone-400">
                  No tasks
                </div>
              ) : (
                colTasks.map(task => {
                  const isOverdue =
                    task.due_date &&
                    new Date(task.due_date) < new Date() &&
                    task.status !== 'APPROVED';

                  const pKey = task.project?.project_key || projectKey || 'TRI';

                  return (
                    <Link
                      key={task.id}
                      href={`/projects/${pKey}/tasks/${task.task_number}`}
                      className="block p-3.5 bg-white border border-[#E8E2D5] hover:border-purple-800 rounded-lg shadow-2xs hover:shadow-xs transition-all group"
                    >
                      {/* Top row: ID + Priority */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
                          {pKey}-{task.task_number}
                        </span>
                        <PriorityBadge priority={task.priority} />
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-semibold text-stone-900 group-hover:text-purple-950 transition-colors line-clamp-2 mb-2.5">
                        {task.title}
                      </h4>

                      {/* Blocker alert if blocked */}
                      {task.status === 'BLOCKED' && task.blocked_reason && (
                        <div className="p-2 mb-2 rounded bg-orange-50 border border-orange-200 text-[11px] text-orange-900 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{task.blocked_reason}</span>
                        </div>
                      )}

                      {/* Footer: Assignee + Due Date */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                        <div className="flex items-center gap-1.5 truncate">
                          <div className="w-4 h-4 rounded-full bg-stone-200 flex items-center justify-center text-[9px] font-bold text-stone-700">
                            {task.assignee ? task.assignee.full_name[0] : <User className="w-2.5 h-2.5" />}
                          </div>
                          <span className="truncate max-w-[90px]">
                            {task.assignee ? task.assignee.full_name.split(' ')[0] : 'Unassigned'}
                          </span>
                        </div>

                        {task.due_date && (
                          <div
                            className={`flex items-center gap-1 font-medium ${
                              isOverdue ? 'text-red-700 font-bold' : 'text-stone-500'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(task.due_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
