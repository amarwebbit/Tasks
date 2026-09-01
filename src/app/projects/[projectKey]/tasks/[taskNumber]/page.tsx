'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTrinetra } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  AlertOctagon,
  CornerUpRight,
  RotateCcw,
  CheckCheck,
  MessageSquare,
  Paperclip,
  Upload,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { TaskComment } from '@/types/database';
import TaskCodeChangesTab from '@/components/github/TaskCodeChangesTab';
import LinkPushedCodeModal from '@/components/github/LinkPushedCodeModal';
import { GitBranch, Code2 } from 'lucide-react';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectKey = (params.projectKey as string)?.toUpperCase();
  const taskNumber = parseInt(params.taskNumber as string, 10);

  const {
    organization,
    projects,
    tasks,
    taskActivity,
    comments,
    attachments,
    currentUser,
    acknowledgeTask,
    startTask,
    blockTask,
    unblockTask,
    submitTask,
    requestChanges,
    approveTask,
    deleteTask,
    addComment,
    addAttachment,
  } = useTrinetra();

  // State for modals & inputs
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<TaskComment['type']>('COMMENT');
  const [blockerReason, setBlockerReason] = useState('');
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [submissionNote, setSubmissionNote] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [changesReason, setChangesReason] = useState('');
  const [isChangesModalOpen, setIsChangesModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLinkPushedCodeOpen, setIsLinkPushedCodeOpen] = useState(false);
  const [taskCommitsRefreshKey, setTaskCommitsRefreshKey] = useState(0);

  const project = projects.find(p => p.project_key === projectKey);
  const task = tasks.find(
    t => t.project_id === project?.id && t.task_number === taskNumber
  );

  if (!project || !task) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-bold text-stone-900">Task Not Found</h2>
        <p className="text-sm text-stone-500 mt-1">
          Task {projectKey}-{taskNumber} does not exist.
        </p>
        <Link
          href={`/projects/${projectKey}`}
          className="mt-4 px-4 py-2 bg-purple-950 text-white rounded-lg text-xs font-semibold"
        >
          Return to Project
        </Link>
      </div>
    );
  }

  const isAssignee = currentUser?.id === task.assigned_to;
  const isCreator = currentUser?.id === task.created_by;
  const isTeamLeader = project.team_leader_id === currentUser?.id;
  const isOrgOwner = organization?.created_by === currentUser?.id;
  const isReviewer = isCreator || isTeamLeader || isOrgOwner;

  const taskActivities = taskActivity.filter(a => a.task_id === task.id);
  const taskComments = comments.filter(c => c.task_id === task.id);
  const taskAttachments = attachments.filter(att => att.task_id === task.id);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment(task.id, commentText.trim(), commentType);
    setCommentText('');
    setCommentType('COMMENT');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client is not configured');
      }

      // Clean non-ASCII or problematic characters from filename
      const fileNameClean = file.name.replace(/[^\x00-\x7F]/g, '');
      const filePath = `${task.id}/${Date.now()}_${fileNameClean}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(
          `Failed to upload to Supabase Storage. Please ensure a storage bucket named "task-attachments" exists in your Supabase dashboard and is set to Public.`
        );
      }

      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;
      await addAttachment(task.id, file.name, fileUrl, file.size);
    } catch (err: any) {
      alert(err.message || 'Failed to upload attachment');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={`${projectKey}-${task.task_number}`}
        subtitle={task.title}
        projectId={project.id}
      />

      <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Breadcrumb back & Actions */}
        <div className="flex items-center justify-between">
          <Link
            href={`/projects/${projectKey}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-purple-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {project.name}</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-stone-400 font-mono">
              ID: {task.id}
            </span>
            {isReviewer && (
              <button
                type="button"
                disabled={isDeletingTask}
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to permanently delete task ${projectKey}-${task.task_number} ("${task.title}")?`)) {
                    setIsDeletingTask(true);
                    const res = await deleteTask(task.id);
                    if (res.success) {
                      router.push(`/projects/${projectKey}`);
                    } else {
                      alert(res.error || 'Failed to delete task.');
                      setIsDeletingTask(false);
                    }
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingTask ? 'Deleting...' : 'Delete Task'}</span>
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-600 hover:text-red-900 font-bold">✕</button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LIFECYCLE ACTION WORKFLOW PANEL */}
        {/* ========================================================================= */}
        <div className="bg-white border-2 border-purple-200/80 rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900">Task Lifecycle Control</span>
                {isAssignee && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                    Your Assigned Task
                  </span>
                )}
                {!isAssignee && isReviewer && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                    Reviewer / Leader View
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge status={task.status} />
                <span className="text-xs text-stone-600">
                  {task.status === 'ASSIGNED' && (isAssignee ? 'You have been assigned this task. Please acknowledge.' : `Awaiting acknowledgement from ${task.assignee?.full_name || 'assignee'}.`)}
                  {task.status === 'ACKNOWLEDGED' && (isAssignee ? 'You acknowledged this task. Click "Start Working" when ready.' : `${task.assignee?.full_name || 'Assignee'} acknowledged. Ready to begin work.`)}
                  {task.status === 'IN_PROGRESS' && (isAssignee ? 'Work is actively under development by you.' : `${task.assignee?.full_name || 'Assignee'} is actively working on development.`)}
                  {task.status === 'BLOCKED' && (isAssignee ? 'You reported a blocker. Resolve to resume.' : `Task is blocked: "${task.blocked_reason || 'Requires assistance'}"`)}
                  {task.status === 'SUBMITTED' && (isAssignee ? 'Work submitted. Awaiting Team Leader review & approval.' : `${task.assignee?.full_name || 'Assignee'} submitted deliverables for your review.`)}
                  {task.status === 'CHANGES_REQUESTED' && (isAssignee ? `Revisions requested: "${task.changes_requested_reason || 'Please review comments'}"` : `You requested changes from ${task.assignee?.full_name || 'assignee'}.`)}
                  {task.status === 'APPROVED' && 'Approved and officially closed in history.'}
                </span>
              </div>
            </div>

            {/* Action Buttons Strictly Gated by Role */}
            <div className="flex flex-wrap items-center gap-2">
              {/* 1. ASSIGNEE ACTIONS */}
              {isAssignee && (
                <>
                  {/* ASSIGNED -> ACKNOWLEDGE */}
                  {task.status === 'ASSIGNED' && (
                    <button
                      disabled={isActionLoading}
                      onClick={async () => {
                        setIsActionLoading(true);
                        const res = await acknowledgeTask(task.id);
                        if (!res.success) setActionError(res.error || 'Action failed');
                        setIsActionLoading(false);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Acknowledge Assignment</span>
                    </button>
                  )}

                  {/* ACKNOWLEDGED / CHANGES_REQUESTED -> START WORKING */}
                  {(task.status === 'ACKNOWLEDGED' || task.status === 'CHANGES_REQUESTED') && (
                    <button
                      disabled={isActionLoading}
                      onClick={async () => {
                        setIsActionLoading(true);
                        const res = await startTask(task.id);
                        if (!res.success) setActionError(res.error || 'Action failed');
                        setIsActionLoading(false);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start Working</span>
                    </button>
                  )}

                  {/* IN_PROGRESS -> REPORT BLOCKER or SUBMIT FOR REVIEW */}
                  {task.status === 'IN_PROGRESS' && (
                    <>
                      <button
                        disabled={isActionLoading}
                        onClick={() => setIsBlockModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-100 hover:bg-orange-200 text-orange-900 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <AlertOctagon className="w-4 h-4 text-orange-700" />
                        <span>Report Blocker</span>
                      </button>

                      <button
                        disabled={isActionLoading}
                        onClick={() => setIsSubmitModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#4A154B] hover:bg-[#3B0F3C] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <CornerUpRight className="w-4 h-4" />
                        <span>Submit for Review</span>
                      </button>
                    </>
                  )}

                  {/* BLOCKED -> UNBLOCK / RESUME */}
                  {task.status === 'BLOCKED' && (
                    <button
                      disabled={isActionLoading}
                      onClick={async () => {
                        setIsActionLoading(true);
                        const res = await unblockTask(task.id);
                        if (!res.success) setActionError(res.error || 'Action failed');
                        setIsActionLoading(false);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      <span>Clear Blocker & Resume</span>
                    </button>
                  )}

                  {/* SUBMITTED -> WAITING BADGE */}
                  {task.status === 'SUBMITTED' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-900 text-xs font-medium rounded-lg border border-amber-200">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Awaiting Team Leader Review</span>
                    </div>
                  )}
                </>
              )}

              {/* 2. REVIEWER / LEADER ACTIONS (When not acting as assignee) */}
              {!isAssignee && isReviewer && (
                <>
                  {/* SUBMITTED -> REVIEWER CAN APPROVE OR REQUEST CHANGES */}
                  {task.status === 'SUBMITTED' && (
                    <>
                      <button
                        disabled={isActionLoading}
                        onClick={() => setIsChangesModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-700" />
                        <span>Request Changes</span>
                      </button>

                      <button
                        disabled={isActionLoading}
                        onClick={async () => {
                          setIsActionLoading(true);
                          const res = await approveTask(task.id);
                          if (!res.success) setActionError(res.error || 'Action failed');
                          setIsActionLoading(false);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>✓ Approve & Complete</span>
                      </button>
                    </>
                  )}

                  {/* BLOCKED -> REVIEWER CAN ASSIST / UNBLOCK */}
                  {task.status === 'BLOCKED' && (
                    <button
                      disabled={isActionLoading}
                      onClick={async () => {
                        setIsActionLoading(true);
                        const res = await unblockTask(task.id);
                        if (!res.success) setActionError(res.error || 'Action failed');
                        setIsActionLoading(false);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-4 h-4 text-blue-700" />
                      <span>Unblock on Behalf of Assignee</span>
                    </button>
                  )}
                </>
              )}

              {/* COMPLETED BADGE FOR EVERYONE */}
              {task.status === 'APPROVED' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-lg border border-emerald-300">
                  <CheckCheck className="w-4 h-4 text-emerald-700" />
                  <span>Approved & Closed</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid: Left Details & Conversation, Right Sidebar Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (2 Cols wide) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Card Header */}
            <div className="bg-white border border-[#E8E2D5] rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                  {projectKey}-{task.task_number}
                </span>
                <PriorityBadge priority={task.priority} />
              </div>

              <h2 className="text-xl font-bold text-stone-900 leading-snug">
                {task.title}
              </h2>

              {/* Description */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Description & Context
                </h3>
                <p className="text-xs text-stone-800 leading-relaxed whitespace-pre-line bg-[#FBF9F5] p-3.5 rounded-lg border border-stone-200">
                  {task.description || 'No detailed description provided.'}
                </p>
              </div>

              {/* Definition of Done */}
              {task.definition_of_done && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1.5">
                    Definition of Done (Acceptance Criteria)
                  </h3>
                  <div className="text-xs text-emerald-950 bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-lg whitespace-pre-line leading-relaxed">
                    {task.definition_of_done}
                  </div>
                </div>
              )}

              {/* Blocker Reason if Blocked */}
              {task.status === 'BLOCKED' && task.blocked_reason && (
                <div className="p-3.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-950 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Reported Blocker:</strong>
                    <p className="mt-0.5">{task.blocked_reason}</p>
                  </div>
                </div>
              )}

              {/* Changes Requested Reason */}
              {task.status === 'CHANGES_REQUESTED' && task.changes_requested_reason && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-950 text-xs flex items-start gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Required Changes / Reviewer Feedback:</strong>
                    <p className="mt-0.5">{task.changes_requested_reason}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Code Changes & Diff Logs Section */}
            <div className="bg-white border border-[#E8E2D5] rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-purple-900" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    GitHub Code Changes & Side-by-Side Diffs
                  </h3>
                </div>
              </div>

              <TaskCodeChangesTab
                key={taskCommitsRefreshKey}
                taskId={task.id}
                projectId={project.id}
                onLinkPushedCodeClick={() => setIsLinkPushedCodeOpen(true)}
              />
            </div>

            {/* Attachments Section */}
            <div className="bg-white border border-[#E8E2D5] rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-purple-900" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Task Deliverables & Files ({taskAttachments.length})
                  </h3>
                </div>
                <label
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isUploading
                      ? 'bg-stone-50 text-stone-400 cursor-not-allowed border border-stone-200'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer'
                  }`}
                >
                  <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
                  <span>{isUploading ? 'Uploading...' : 'Attach File'}</span>
                  {!isUploading && (
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  )}
                </label>
              </div>

              {taskAttachments.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No files attached to this task yet.</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {taskAttachments.map(att => (
                    <div key={att.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 text-xs hover:bg-stone-50/50 px-2 rounded-lg transition-colors">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Paperclip className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        {att.file_url ? (
                          <a
                            href={att.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-purple-900 hover:text-purple-950 hover:underline break-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            {att.file_name}
                          </a>
                        ) : (
                          <span className="font-semibold text-stone-900 break-all">{att.file_name}</span>
                        )}
                        <span className="text-[11px] text-stone-400">({Math.round((att.file_size || 0) / 1024)} KB)</span>
                      </div>
                      <span className="text-[11px] text-stone-500 shrink-0 self-end sm:self-center">
                        Uploaded by {att.user?.full_name || 'User'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Conversation & Clarifications */}
            <div className="bg-white border border-[#E8E2D5] rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-900" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Task Discussion & Clarification Thread ({taskComments.length})
                </h3>
              </div>

              {/* Comments stream */}
              <div className="space-y-3">
                {taskComments.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-2">
                    No comments yet. Post a clarification or question below.
                  </p>
                ) : (
                  taskComments.map(c => {
                    const isSubmission = c.type === 'SUBMISSION_NOTE';
                    const isChangeReq = c.type === 'CHANGE_REQUEST_NOTE';
                    const isApproval = c.type === 'APPROVAL_NOTE';

                    return (
                      <div
                        key={c.id}
                        className={`p-3.5 rounded-lg border text-xs ${
                          isSubmission
                            ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                            : isChangeReq
                            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                            : isApproval
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-[#FBF9F5] border-stone-200 text-stone-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 font-bold">
                            <span>{c.user?.full_name || 'Team Member'}</span>
                            {c.type !== 'COMMENT' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-white border border-stone-200 font-semibold uppercase">
                                {c.type.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-400">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="whitespace-pre-line leading-relaxed">{c.content}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="pt-3 border-t border-stone-100 space-y-3">
                <div className="flex items-center gap-2">
                  <select
                    value={commentType}
                    onChange={e => setCommentType(e.target.value as TaskComment['type'])}
                    className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded text-xs text-stone-700"
                  >
                    <option value="COMMENT">General Comment</option>
                    <option value="CLARIFICATION">Ask Clarification</option>
                    <option value="BLOCKER_NOTE">Blocker Note</option>
                  </select>
                </div>

                <textarea
                  rows={2}
                  placeholder={`Comment as ${currentUser?.full_name}...`}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#4A154B] hover:bg-[#3B0F3C] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                  >
                    Post Note
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Metadata & Activity */}
          <div className="space-y-6">
            {/* Metadata Card */}
            <div className="bg-white border border-[#E8E2D5] rounded-xl p-5 shadow-2xs space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                Task Parameters
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Assigner:
                  </span>
                  <span className="font-semibold text-stone-900">
                    {task.creator?.full_name || 'System'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Assignee:
                  </span>
                  <span className="font-semibold text-stone-900">
                    {task.assignee?.full_name || 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Created:
                  </span>
                  <span className="text-stone-800">
                    {new Date(task.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Due Date:
                  </span>
                  <span className="font-semibold text-stone-900">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                {task.acknowledged_at && (
                  <div className="flex items-center justify-between py-1 border-b border-stone-100 text-stone-600">
                    <span>Acknowledged:</span>
                    <span>{new Date(task.acknowledged_at).toLocaleDateString()}</span>
                  </div>
                )}

                {task.completed_at && (
                  <div className="flex items-center justify-between py-1 border-b border-stone-100 text-emerald-800 font-semibold">
                    <span>Approved At:</span>
                    <span>{new Date(task.completed_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Task Activity History Stream */}
            <div className="bg-white border border-[#E8E2D5] rounded-xl p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                Audit Timeline ({taskActivities.length})
              </h3>
              <ActivityTimeline activities={taskActivities} />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: REPORT BLOCKER */}
      {/* ========================================================================= */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">Report Task Blocker</h3>
            <p className="text-xs text-stone-600">
              Explain why this task is blocked and what dependency or assistance is required.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Waiting for API schema specifications from Backend team..."
              value={blockerReason}
              onChange={e => setBlockerReason(e.target.value)}
              className="w-full p-2.5 border border-stone-300 rounded-lg text-xs text-stone-900"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBlockModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-stone-600 bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!blockerReason.trim()) return;
                  await blockTask(task.id, blockerReason.trim());
                  setIsBlockModalOpen(false);
                  setBlockerReason('');
                }}
                className="px-4 py-1.5 text-xs text-white bg-orange-700 hover:bg-orange-800 font-semibold rounded-lg"
              >
                Confirm Blocked
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SUBMIT FOR REVIEW */}
      {/* ========================================================================= */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">Submit Work for Review</h3>
            <p className="text-xs text-stone-600">
              Add any submission notes, pull request links, or verification results for Team Leader review.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Unit tests added, verified calculations on staging..."
              value={submissionNote}
              onChange={e => setSubmissionNote(e.target.value)}
              className="w-full p-2.5 border border-stone-300 rounded-lg text-xs text-stone-900"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-stone-600 bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await submitTask(task.id, submissionNote.trim() || undefined);
                  setIsSubmitModalOpen(false);
                  setSubmissionNote('');
                }}
                className="px-4 py-1.5 text-xs text-white bg-[#4A154B] hover:bg-[#3B0F3C] font-semibold rounded-lg"
              >
                Submit Work
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REQUEST CHANGES */}
      {/* ========================================================================= */}
      {isChangesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">Request Revisions & Changes</h3>
            <p className="text-xs text-stone-600">
              Specify what needs to be improved or corrected before approval.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Please add error handling for edge cases..."
              value={changesReason}
              onChange={e => setChangesReason(e.target.value)}
              className="w-full p-2.5 border border-stone-300 rounded-lg text-xs text-stone-900"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsChangesModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-stone-600 bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!changesReason.trim()) return;
                  await requestChanges(task.id, changesReason.trim());
                  setIsChangesModalOpen(false);
                  setChangesReason('');
                }}
                className="px-4 py-1.5 text-xs text-white bg-rose-800 hover:bg-rose-900 font-semibold rounded-lg"
              >
                Send Revision Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LINK PUSHED CODE */}
      <LinkPushedCodeModal
        taskId={task.id}
        projectId={project.id}
        isOpen={isLinkPushedCodeOpen}
        onClose={() => setIsLinkPushedCodeOpen(false)}
        onSuccess={() => setTaskCommitsRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
