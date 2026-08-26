'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTrinetra } from '@/lib/store';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import {
  Folder,
  LayoutGrid,
  ListTodo,
  Users,
  History,
  FileSpreadsheet,
  Settings,
  Plus,
  UserPlus,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Trash2,
  UserMinus,
  XCircle,
  Lock,
  Sparkles,
} from 'lucide-react';
import { AssignmentRule, ProjectRole } from '@/types/database';
import { PaywallModal } from '@/components/PaywallModal';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectKey = (params.projectKey as string)?.toUpperCase();

  const {
    organization,
    projects,
    tasks,
    taskActivity,
    invitations,
    getProjectMembers,
    updateMemberPermissions,
    updateProjectAssignmentRule,
    deleteProject,
    removeProjectMember,
    cancelInvitation,
    deleteTask,
    currentUser,
    users,
    isPro,
    canAssignInProject,
  } = useTrinetra();

  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'board' | 'team' | 'activity' | 'reports' | 'settings'>('tasks');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  const project = projects.find(p => p.project_key === projectKey);

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-bold text-stone-900">Project Not Found</h2>
        <p className="text-sm text-stone-500 mt-1">Project key &quot;{projectKey}&quot; does not exist or you do not have access.</p>
        <Link href="/" className="mt-4 px-4 py-2 bg-purple-950 text-white rounded-lg text-xs font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const projectTasks = tasks.filter(t => t.project_id === project.id);
  const members = getProjectMembers(project.id);
  const projectInvitations = invitations.filter(inv => inv.project_id === project.id && inv.status === 'INVITED');
  const projectActivities = taskActivity.filter(a => {
    const task = tasks.find(t => t.id === a.task_id);
    return task?.project_id === project.id;
  });

  const isTeamLeader = project.team_leader_id === currentUser?.id;
  const isOrgOwner = organization?.created_by === currentUser?.id;
  const canManage = isTeamLeader || isOrgOwner;
  const projectLeader = users.find(u => u.id === project.team_leader_id);
  const isThisProjectPro = isPro || projectLeader?.plan === 'PRO';

  // Filtered tasks for the Tasks list tab
  const filteredTasks = projectTasks.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (assigneeFilter !== 'ALL' && t.assigned_to !== assigneeFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    return true;
  });

  // Project Metrics
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(t => t.status === 'APPROVED').length;
  const inProgressTasks = projectTasks.filter(t => ['IN_PROGRESS', 'ACKNOWLEDGED'].includes(t.status)).length;
  const blockedTasks = projectTasks.filter(t => t.status === 'BLOCKED').length;
  const submittedTasks = projectTasks.filter(t => t.status === 'SUBMITTED' || t.status === 'CHANGES_REQUESTED').length;
  const overdueTasks = projectTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'APPROVED').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleDownloadReport = async (type: 'QUICK' | 'COMPLETE') => {
    if (type === 'COMPLETE' && !isPro) {
      setIsPaywallOpen(true);
      return;
    }

    try {
      setIsExporting(true);
      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          projectId: project.id,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate report');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.project_key}_${type === 'QUICK' ? 'Quick_Report' : 'Complete_Report'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Report export failed. Please check console.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={`[${project.project_key}] ${project.name}`}
        subtitle={project.description || 'Project Task Board & History'}
        projectId={project.id}
      />

      {/* Project Navigation Bar */}
      <div className="px-8 border-b border-[#E8E2D5] bg-white sticky top-16 z-20">
        <div className="flex items-center justify-between">
          <nav className="flex space-x-1">
            {[
              { id: 'tasks', label: 'Tasks', icon: ListTodo, count: totalTasks },
              { id: 'board', label: 'Board', icon: LayoutGrid },
              { id: 'overview', label: 'Overview', icon: Folder },
              { id: 'team', label: 'Team & Permissions', icon: Users, count: members.length },
              { id: 'activity', label: 'Activity Log', icon: History },
              { id: 'reports', label: 'Excel Reports', icon: FileSpreadsheet },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#4A154B] text-[#4A154B]'
                      : 'border-transparent text-stone-500 hover:text-stone-900 hover:border-stone-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-600 font-bold">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownloadReport('QUICK')}
              disabled={isExporting}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* ----------------- TAB: TASKS (LIST VIEW) ----------------- */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters:</span>
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800"
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

                {/* Assignee Filter */}
                <select
                  value={assigneeFilter}
                  onChange={e => setAssigneeFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800"
                >
                  <option value="ALL">All Assignees</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name}
                    </option>
                  ))}
                </select>

                {/* Priority Filter */}
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div className="text-xs text-stone-500 font-medium">
                Showing {filteredTasks.length} of {projectTasks.length} tasks
              </div>
            </div>

            {/* Task Table */}
            <div className="bg-white border border-[#E8E2D5] rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4EFE6]/60 border-b border-[#E8E2D5] text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Task ID</th>
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
                      <td colSpan={7} className="py-8 text-center text-stone-400">
                        No tasks match the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map(t => {
                      const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'APPROVED';
                      return (
                        <tr key={t.id} className="hover:bg-[#FBF9F5] transition-colors group">
                          <td className="py-3.5 px-4 font-mono font-bold text-stone-600">
                            {project.project_key}-{t.task_number}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-stone-900 max-w-xs truncate">
                            <Link
                              href={`/projects/${project.project_key}/tasks/${t.task_number}`}
                              className="hover:text-purple-950 font-semibold"
                            >
                              {t.title}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 text-stone-700">
                            {t.assignee ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-950 flex items-center justify-center font-bold text-[10px]">
                                  {t.assignee.full_name[0]}
                                </span>
                                <span>{t.assignee.full_name}</span>
                              </div>
                            ) : (
                              <span className="text-stone-400 italic">Unassigned</span>
                            )}
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
                              href={`/projects/${project.project_key}/tasks/${t.task_number}`}
                              className="px-2.5 py-1 text-purple-950 hover:bg-purple-100 rounded font-semibold transition-colors inline-block"
                            >
                              Open →
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
        )}

        {/* ----------------- TAB: KANBAN BOARD ----------------- */}
        {activeTab === 'board' && (
          <KanbanBoard tasks={projectTasks} projectKey={project.project_key} />
        )}

        {/* ----------------- TAB: OVERVIEW ----------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-stone-400">Total Deliverables</span>
                <p className="text-2xl font-bold text-stone-900 mt-1">{totalTasks}</p>
              </div>
              <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-stone-400">Completed & Verified</span>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{completedTasks}</p>
              </div>
              <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-stone-400">In Progress</span>
                <p className="text-2xl font-bold text-blue-900 mt-1">{inProgressTasks}</p>
              </div>
              <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-stone-400">In Review</span>
                <p className="text-2xl font-bold text-purple-900 mt-1">{submittedTasks}</p>
              </div>
              <div className="p-4 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-stone-400">Completion Rate</span>
                <p className="text-2xl font-bold text-stone-900 mt-1">{completionRate}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E8E2D5] rounded-xl p-5 shadow-2xs">
                <h3 className="text-sm font-bold text-stone-900 mb-3">Project Metadata</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-500">Project Key:</span>
                    <span className="font-mono font-bold text-stone-900">{project.project_key}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-500">Team Leader:</span>
                    <span className="font-semibold text-stone-900">{project.team_leader?.full_name || 'Amar'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-500">Assignment Policy:</span>
                    <span className="font-semibold text-purple-900">{project.assignment_rule}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-500">Start Date:</span>
                    <span className="text-stone-800">{project.start_date || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-stone-500">Target Date:</span>
                    <span className="text-stone-800">{project.target_date || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#E8E2D5] rounded-xl p-5 shadow-2xs">
                <h3 className="text-sm font-bold text-stone-900 mb-3">Team Distribution in {project.project_key}</h3>
                <div className="space-y-3">
                  {members.map(m => {
                    const mTasks = projectTasks.filter(t => t.assigned_to === m.user_id);
                    const mCompleted = mTasks.filter(t => t.status === 'APPROVED').length;
                    return (
                      <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b border-stone-100">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-[10px]">
                            {m.profile?.full_name[0]}
                          </span>
                          <span className="font-semibold text-stone-900">{m.profile?.full_name}</span>
                          <span className="text-[10px] text-stone-400">({m.role})</span>
                        </div>
                        <div className="flex items-center gap-3 text-stone-600">
                          <span>{mTasks.length} tasks</span>
                          <span className="text-emerald-700 font-semibold">({mCompleted} done)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: TEAM & PERMISSIONS ----------------- */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            {/* Assignment Rule Configuration Box - Visible only to Team Leaders & Org Owners */}
            {canManage && (
              <div className="p-5 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900">Project Governance</span>
                  <h3 className="text-sm font-bold text-stone-900 mt-0.5">Who can assign tasks in this project?</h3>
                  <p className="text-xs text-stone-500">
                    Controls whether ordinary members can delegate tasks to other teammates or if only the Team Leader assigns.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {[
                    {
                      rule: 'LEADER_ONLY',
                      title: 'Team Leader Only (Default)',
                      desc: 'Only the project Team Leader can create and assign tasks to members.',
                    },
                    {
                      rule: 'SELECTED_MEMBERS',
                      title: 'Selected Members',
                      desc: 'Team Leader + members with explicit "Can Assign Tasks" permission.',
                    },
                    {
                      rule: 'EVERYONE',
                      title: 'Everyone in Project',
                      desc: 'All project members can create and assign tasks freely.',
                    },
                  ].map(opt => (
                    <label
                      key={opt.rule}
                      onClick={() => updateProjectAssignmentRule(project.id, opt.rule as AssignmentRule)}
                      className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        project.assignment_rule === opt.rule
                          ? 'border-purple-800 bg-purple-50/50 text-purple-950 font-semibold shadow-xs'
                          : 'border-stone-200 bg-stone-50/50 text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="assignmentRule"
                          checked={project.assignment_rule === opt.rule}
                          onChange={() => {}}
                          className="text-purple-900 focus:ring-purple-800"
                        />
                        <span className="font-bold text-stone-900">{opt.title}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 pl-5">{opt.desc}</p>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Member Granular Permissions Table */}
            <div className="bg-white border border-[#E8E2D5] rounded-xl overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-[#E8E2D5] bg-[#F4EFE6]/40 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                      Granular Member Assignment Matrix
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isThisProjectPro 
                        ? 'bg-purple-100 text-purple-900 border border-purple-300 font-extrabold' 
                        : canManage && members.length >= 2 
                        ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                        : 'bg-stone-100 text-stone-600'
                    }`}>
                      {isThisProjectPro 
                        ? 'Pro Project: Unlimited Members' 
                        : canManage 
                        ? `Free Tier: ${members.length} / 2 Members Used` 
                        : `${members.length} Members`}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    {canManage ? 'Toggle individual permissions for receiving or assigning tasks.' : 'Directory of active contributors and their task assignment permissions.'}
                  </p>
                </div>

                {/* Invite Member Trigger Button - ONLY visible to Team Leaders / Managers */}
                {canManage && (
                  <div>
                    {!isThisProjectPro && members.length >= 2 ? (
                      <button
                        type="button"
                        onClick={() => setIsPaywallOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Invite Member (Limit 2/2)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsInviteModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Invite Member</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Free Limit Exceeded Alert Banner - ONLY shown to Team Leaders when project is NOT Pro */}
              {!isThisProjectPro && canManage && members.length > 2 && (
                <div className="p-3.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-950">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      <strong>Free Limit Exceeded:</strong> This project currently has <strong>{members.length} members</strong> (Free tier allows max 2). Please upgrade to Pro or remove extra members.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPaywallOpen(true)}
                    className="shrink-0 flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-xs shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-200" />
                    <span>Upgrade to Pro</span>
                  </button>
                </div>
              )}

              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4EFE6]/60 border-b border-[#E8E2D5] text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Project Role</th>
                    <th className="py-3 px-4 text-center">Can Receive Tasks?</th>
                    <th className="py-3 px-4 text-center">Can Assign Tasks?</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {members.map(m => {
                    const isLeader = m.role === 'LEADER';
                    const isPrimaryLeader = m.user_id === project.team_leader_id;
                    return (
                      <tr key={m.id} className="hover:bg-[#FBF9F5] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-stone-900">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-[11px]">
                              {m.profile?.full_name[0]}
                            </span>
                            <span>{m.profile?.full_name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-stone-600 font-mono text-[11px]">
                          {m.profile?.email}
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={m.role}
                            onChange={e => updateMemberPermissions(m.id, { role: e.target.value as ProjectRole })}
                            disabled={!canManage || isPrimaryLeader}
                            className="px-2 py-1 bg-white border border-stone-300 rounded text-xs text-stone-800 disabled:bg-stone-100"
                          >
                            <option value="LEADER">Team Leader</option>
                            <option value="MEMBER">Member</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                        </td>
                        {/* Can Receive Tasks Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => updateMemberPermissions(m.id, { can_receive_tasks: !m.can_receive_tasks })}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all disabled:opacity-60 ${
                              canManage ? 'cursor-pointer' : 'cursor-default'
                            } ${
                              m.can_receive_tasks
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                                : 'bg-stone-100 text-stone-500 border border-stone-300 hover:bg-stone-200'
                            }`}
                          >
                            {m.can_receive_tasks ? 'YES' : 'NO'}
                          </button>
                        </td>
                        {/* Can Assign Tasks Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            disabled={!canManage || isLeader}
                            onClick={() => updateMemberPermissions(m.id, { can_assign_tasks: !m.can_assign_tasks })}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all disabled:opacity-60 ${
                              canManage && !isLeader ? 'cursor-pointer' : 'cursor-default'
                            } ${
                              m.can_assign_tasks || isLeader
                                ? 'bg-purple-100 text-purple-950 border border-purple-300 hover:bg-purple-200'
                                : 'bg-stone-100 text-stone-500 border border-stone-300 hover:bg-stone-200'
                            }`}
                          >
                            {m.can_assign_tasks || isLeader ? 'YES' : 'NO'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-stone-500 text-[11px]">
                          {new Date(m.joined_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isPrimaryLeader ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                              Primary Leader
                            </span>
                          ) : canManage ? (
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to remove ${m.profile?.full_name || 'this member'} from the project?`)) {
                                  const res = await removeProjectMember(m.id);
                                  if (!res.success) alert(res.error || 'Failed to remove member');
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          ) : (
                            <span className="text-stone-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pending Invitations Table if any */}
            {projectInvitations.length > 0 && (
              <div className="bg-white border border-[#E8E2D5] rounded-xl overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-[#E8E2D5] bg-amber-50/40 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Pending Invitations ({projectInvitations.length})
                    </h3>
                    <p className="text-xs text-amber-800">
                      Invited members who have not yet logged in or accepted their project invite.
                    </p>
                  </div>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4EFE6]/60 border-b border-[#E8E2D5] text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Invited Email</th>
                      <th className="py-3 px-4">Role Assigned</th>
                      <th className="py-3 px-4 text-center">Can Receive?</th>
                      <th className="py-3 px-4 text-center">Can Assign?</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Invited On</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {projectInvitations.map(inv => (
                      <tr key={inv.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-3 px-4 font-semibold text-stone-900 font-mono text-[11px]">
                          {inv.email}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900">
                            {inv.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inv.can_receive_tasks ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-500'}`}>
                            {inv.can_receive_tasks ? 'YES' : 'NO'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inv.can_assign_tasks || inv.role === 'LEADER' ? 'bg-purple-100 text-purple-900' : 'bg-stone-100 text-stone-500'}`}>
                            {inv.can_assign_tasks || inv.role === 'LEADER' ? 'YES' : 'NO'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                            INVITED (Pending)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-500 text-[11px]">
                          {new Date(inv.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canManage && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Cancel invitation for ${inv.email}?`)) {
                                  const res = await cancelInvitation(inv.id);
                                  if (!res.success) alert(res.error || 'Failed to cancel invitation');
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB: ACTIVITY LOG ----------------- */}
        {activeTab === 'activity' && (
          <div className="bg-white border border-[#E8E2D5] rounded-xl p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-stone-900 mb-6">
              Immutable Project Activity History ({projectActivities.length})
            </h3>
            <ActivityTimeline activities={projectActivities} />
          </div>
        )}

        {/* ----------------- TAB: EXCEL REPORTS ----------------- */}
        {activeTab === 'reports' && (
          <div className="bg-white border border-[#E8E2D5] rounded-xl p-6 shadow-2xs space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900">Audit & Accountability</span>
              <h3 className="text-base font-bold text-stone-900">Export Complete Excel Workbook</h3>
              <p className="text-xs text-stone-500 mt-1">
                Generates a multi-sheet .xlsx audit workbook with full task history, comments, attachments, timestamps, and members.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-stone-200 bg-[#FBF9F5] flex flex-col justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 uppercase">
                    Single Sheet
                  </span>
                  <h4 className="text-sm font-bold text-stone-900 mt-2">Quick Summary Report</h4>
                  <p className="text-xs text-stone-600 mt-1">
                    Export lightweight sheet with Task IDs, titles, assignees, priorities, due dates, and completion status.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadReport('QUICK')}
                  disabled={isExporting}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white border border-stone-300 hover:border-stone-400 text-stone-800 text-xs font-semibold shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Quick XLSX</span>
                </button>
              </div>

              <div className={`p-5 rounded-xl border flex flex-col justify-between ${!isPro ? 'border-amber-300 bg-amber-50/40 relative overflow-hidden' : 'border-purple-200 bg-purple-50/40'}`}>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 uppercase">
                      Complete 7-Sheet Workbook
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
                  <h4 className="text-sm font-bold text-stone-900 mt-2">Comprehensive Audit Report</h4>
                  <p className="text-xs text-stone-600 mt-1">
                    Multi-sheet workbook containing: 1. Project Summary, 2. Tasks, 3. Activity History, 4. Comments, 5. Team Members, 6. Attachments, 7. Email Logs.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadReport('COMPLETE')}
                  disabled={isExporting}
                  className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer ${
                    !isPro
                      ? 'bg-linear-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-stone-950'
                      : 'bg-purple-950 hover:bg-purple-900 text-white'
                  }`}
                >
                  {!isPro ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Unlock 7-Sheet Audit Workbook (Pro)</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Complete XLSX Workbook</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: SETTINGS ----------------- */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-[#E8E2D5] rounded-xl p-6 shadow-2xs space-y-6 max-w-2xl">
            <h3 className="text-sm font-bold text-stone-900">Project Configurations</h3>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Project Name</label>
                <input
                  type="text"
                  disabled
                  value={project.name}
                  className="w-full px-3 py-2 bg-stone-100 border border-stone-300 rounded text-stone-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Project Identifier Key</label>
                <input
                  type="text"
                  disabled
                  value={project.project_key}
                  className="w-full px-3 py-2 bg-stone-100 border border-stone-300 rounded font-mono text-stone-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  disabled
                  value={project.description || ''}
                  className="w-full px-3 py-2 bg-stone-100 border border-stone-300 rounded text-stone-600"
                />
              </div>
            </div>

            {/* Danger Zone: Delete Project (Team Leader / Org Owner only) */}
            {canManage && (
              <div className="pt-4 border-t border-stone-200">
                <div className="p-5 rounded-xl border border-rose-200 bg-rose-50/60 space-y-3">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Danger Zone: Delete Project</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    Permanently delete <strong>{project.name}</strong> ({project.project_key}), including all associated tasks, attachments, discussion comments, and audit activity. This action is irreversible.
                  </p>
                  <button
                    type="button"
                    disabled={isDeletingProject}
                    onClick={async () => {
                      const confirmText = window.prompt(`To permanently delete this project, please type its key "${project.project_key}":`);
                      if (confirmText === project.project_key) {
                        setIsDeletingProject(true);
                        const res = await deleteProject(project.id);
                        if (res.success) {
                          router.push('/');
                        } else {
                          alert(res.error || 'Failed to delete project.');
                          setIsDeletingProject(false);
                        }
                      } else if (confirmText !== null) {
                        alert('Project key did not match. Deletion cancelled.');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeletingProject ? 'Deleting Project...' : 'Delete Entire Project'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        projectId={project.id}
      />

      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        title="Upgrade to Trinetra Pro"
        subtitle="Free tier allows 1 project and 2 members. Upgrade to Pro for unlimited team collaboration and complete 7-sheet Excel audit workbooks."
        highlightedFeature="REPORTS"
      />
    </div>
  );
}
