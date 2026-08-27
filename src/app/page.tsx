'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTrinetra } from '@/lib/store';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { ArrowUpRight, FolderPlus } from 'lucide-react';

export default function OrganizationDashboard() {
  const { organization, projects, projectMembers, tasks, users, taskActivity, currentUser } = useTrinetra();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Filter visible team users strictly to current user + members sharing at least 1 project
  const sharedMemberUserIds = new Set([
    currentUser?.id,
    ...projectMembers.map(pm => pm.user_id),
    ...projects.map(p => p.team_leader_id),
  ].filter(Boolean));
  const visibleTeamUsers = users.filter(u => sharedMemberUserIds.has(u.id));

  // Metrics
  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'APPROVED').length;
  const inProgressTasks = tasks.filter(t => ['IN_PROGRESS', 'ACKNOWLEDGED'].includes(t.status)).length;
  const blockedTasks = tasks.filter(t => t.status === 'BLOCKED').length;
  const pendingReviewTasks = tasks.filter(t => ['SUBMITTED', 'CHANGES_REQUESTED'].includes(t.status)).length;
  const overdueTasks = tasks.filter(
    t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'APPROVED'
  ).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={`${organization?.name || (currentUser ? `${currentUser.full_name}'s Workspace` : 'Trinetra')} — Command Center`}
        subtitle="Multi-Project accountability, task flow velocity, and team workload summary"
      />

      <div className="p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Projects</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-stone-900">{totalProjects}</span>
              <span className="text-xs text-stone-500">Active</span>
            </div>
          </div>

          <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Tasks</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-stone-900">{totalTasks}</span>
              <span className="text-xs text-stone-500">Tracked</span>
            </div>
          </div>

          <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">In Progress</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-blue-900">{inProgressTasks}</span>
              <span className="text-xs text-stone-500">Working</span>
            </div>
          </div>

          <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">In Review</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-purple-900">{pendingReviewTasks}</span>
              <span className="text-xs text-stone-500">Submissions</span>
            </div>
          </div>

          <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Blocked</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-orange-800">{blockedTasks}</span>
              <span className="text-xs text-stone-500">Needs help</span>
            </div>
          </div>

          <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Completion</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-900">{completionRate}%</span>
              <span className="text-xs text-emerald-700 font-medium">Done</span>
            </div>
          </div>
        </div>

        {/* Project Performance Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">Project Performance</h2>
              <p className="text-xs text-stone-500">Progress and deliverable breakdown per project unit</p>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="p-12 text-center bg-white border border-[#E8E2D5] rounded-xl text-stone-500 text-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-900 flex items-center justify-center mx-auto shadow-2xs">
                <FolderPlus className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-stone-900 text-sm">Welcome to Your Workspace!</p>
                <p className="mt-1 text-stone-500 max-w-sm mx-auto">
                  You do not have any projects assigned yet. Create your own isolated project or wait for an invitation from a team leader.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A154B] hover:bg-[#3B0F3C] text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Create Your First Project</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {projects.map(proj => {
                const projTasks = tasks.filter(t => t.project_id === proj.id);
                const pTotal = projTasks.length;
                const pCompleted = projTasks.filter(t => t.status === 'APPROVED').length;
                const pRate = pTotal > 0 ? Math.round((pCompleted / pTotal) * 100) : 0;
                const pOverdue = projTasks.filter(
                  t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'APPROVED'
                ).length;
                const leader = users.find(u => u.id === proj.team_leader_id);

                return (
                  <div
                    key={proj.id}
                    className="bg-white border border-[#E8E2D5] rounded-xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                          {proj.project_key}
                        </span>
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {pRate}% Complete
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-stone-900 mb-1">
                        {proj.name}
                      </h3>
                      <p className="text-xs text-stone-600 line-clamp-2 mb-4">
                        {proj.description || 'No description provided.'}
                      </p>

                      {/* Progress Bar */}
                      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mb-4">
                        <div
                          className="bg-[#4A154B] h-full transition-all duration-500 rounded-full"
                          style={{ width: `${pRate}%` }}
                        />
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-stone-100 text-center text-xs">
                        <div>
                          <span className="block text-stone-400 text-[10px] uppercase font-semibold">Tasks</span>
                          <span className="font-bold text-stone-900">{pTotal}</span>
                        </div>
                        <div>
                          <span className="block text-stone-400 text-[10px] uppercase font-semibold">Done</span>
                          <span className="font-bold text-emerald-800">{pCompleted}</span>
                        </div>
                        <div>
                          <span className="block text-stone-400 text-[10px] uppercase font-semibold">Overdue</span>
                          <span className={`font-bold ${pOverdue > 0 ? 'text-red-700' : 'text-stone-600'}`}>
                            {pOverdue}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between text-xs text-stone-500">
                      <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                        <span className="text-stone-400">TL:</span>
                        <span className="font-medium text-stone-800 truncate">
                          {leader?.full_name || 'Team Leader'}
                        </span>
                      </div>

                      <Link
                        href={`/projects/${proj.project_key}`}
                        className="inline-flex items-center gap-1 font-semibold text-purple-900 hover:text-purple-950"
                      >
                        <span>Open Project</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Team Workload & Active Responsibilities */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">Team Workload Distribution</h2>
              <p className="text-xs text-stone-500">Active assigned responsibilities and accountability</p>
            </div>
            <Link
              href="/team"
              className="text-xs font-semibold text-purple-900 hover:text-purple-950"
            >
              Configure Permissions →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {visibleTeamUsers.map(u => {
              const userTasks = tasks.filter(t => t.assigned_to === u.id);
              const userActive = userTasks.filter(t => t.status !== 'APPROVED').length;
              const userCompleted = userTasks.filter(t => t.status === 'APPROVED').length;
              const userOverdue = userTasks.filter(
                t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'APPROVED'
              ).length;

              return (
                <div key={u.id} className="p-4 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-xs">
                      {u.full_name ? u.full_name[0] : 'U'}
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-stone-900 truncate">{u.full_name}</h4>
                      <span className="text-[10px] text-stone-500 truncate block">{u.email}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-stone-600 border-t border-stone-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Active Tasks:</span>
                      <span className="font-bold text-stone-900">{userActive}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Completed:</span>
                      <span className="font-semibold text-emerald-800">{userCompleted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Overdue:</span>
                      <span className={`font-semibold ${userOverdue > 0 ? 'text-red-700' : 'text-stone-500'}`}>
                        {userOverdue}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Stream */}
        <div className="bg-white border border-[#E8E2D5] rounded-xl p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">Recent Organization Activity</h2>
              <p className="text-xs text-stone-500">Live immutable stream of assignments and state transitions</p>
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {taskActivity.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 italic">No activity recorded yet.</p>
            ) : (
              taskActivity.slice(0, 6).map(act => {
                const task = tasks.find(t => t.id === act.task_id);
                const pKey = task?.project?.project_key || 'TRI';

                return (
                  <div key={act.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                        {pKey}-{task?.task_number || '00'}
                      </span>
                      <span className="text-stone-900 font-medium whitespace-nowrap">{act.user?.full_name || 'User'}</span>
                      <span className="text-stone-600">
                        {act.action.toLowerCase().replace(/_/g, ' ')}
                        {act.new_value ? ` → ${act.new_value}` : ''}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-400 shrink-0 self-end sm:self-center">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />
    </div>
  );
}
