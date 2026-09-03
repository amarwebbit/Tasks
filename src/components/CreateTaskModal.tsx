'use client';

import React, { useState, useEffect } from 'react';
import { useTrinetra } from '@/lib/store';
import { TaskPriority } from '@/types/database';
import { X, AlertCircle, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import { toFriendlyError } from '@/lib/friendlyError';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
}) => {
  const {
    projects,
    currentUser,
    canAssignInProject,
    getProjectMembers,
    createTask,
  } = useTrinetra();

  const [projectId, setProjectId] = useState<string>(defaultProjectId || projects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [definitionOfDone, setDefinitionOfDone] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultProjectId) {
      setProjectId(defaultProjectId);
    } else if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [defaultProjectId, projects, projectId]);

  if (!isOpen) return null;

  const currentProject = projects.find(p => p.id === projectId);
  const canAssign = projectId && currentUser ? canAssignInProject(currentUser.id, projectId) : false;
  const projectMembers = projectId ? getProjectMembers(projectId) : [];
  const permittedAssignees = projectMembers.filter(m => m.can_receive_tasks);
  const restrictedMembers = projectMembers.filter(m => !m.can_receive_tasks);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!title.trim()) {
      setError('Please enter a task title.');
      setIsSubmitting(false);
      return;
    }

    if (!projectId) {
      setError('Please select a project.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await createTask({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        definition_of_done: definitionOfDone.trim() || undefined,
        assigned_to: assignedTo || undefined,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });

      if (!res.success) {
        setError(toFriendlyError(res.error, 'Failed to create task. Please try again.'));
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsSubmitting(false);
        setTitle('');
        setDescription('');
        setDefinitionOfDone('');
        setAssignedTo('');
        setDueDate('');
        onClose();
      }, 800);
    } catch (err: unknown) {
      setError(toFriendlyError(err, 'An unexpected error occurred while creating the task.'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-900">Task Allocation</span>
            <h2 className="text-lg font-semibold text-stone-900">Create & Assign New Task</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center gap-3 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>Task created and assigned successfully!</div>
            </div>
          )}

          {/* Project Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Project <span className="text-red-500">*</span>
            </label>
            <select
              value={projectId}
              onChange={e => {
                setProjectId(e.target.value);
                setAssignedTo('');
                setError(null);
              }}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.project_key}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Permission warning if user cannot assign in this project */}
          {!canAssign && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Assignment Permission Restricted</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  You are logged in as <strong>{currentUser?.full_name}</strong> and are not authorized to assign tasks in &quot;{currentProject?.name}&quot;. (Project Assignment Rule: {currentProject?.assignment_rule}).
                </p>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Fix adaptive exam calculation algorithm"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={!canAssign}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 disabled:bg-stone-100 disabled:text-stone-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Description & Context
            </label>
            <textarea
              rows={3}
              placeholder="Provide exact instructions, context, or reference links..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!canAssign}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 disabled:bg-stone-100"
            />
          </div>

          {/* Definition of Done */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Definition of Done (Acceptance Criteria)
            </label>
            <textarea
              rows={2}
              placeholder="1. Unit tests pass with 100% coverage&#10;2. Verified on staging environment"
              value={definitionOfDone}
              onChange={e => setDefinitionOfDone(e.target.value)}
              disabled={!canAssign}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 disabled:bg-stone-100"
            />
          </div>

          {/* Assignee & Priority & Due Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Assignee */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Assignee
              </label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                disabled={!canAssign}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 disabled:bg-stone-100"
              >
                <option value="">Unassigned (Draft)</option>
                {permittedAssignees.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || m.user_id} {m.role === 'LEADER' ? '(Leader)' : ''}
                  </option>
                ))}
                {restrictedMembers.map(m => (
                  <option key={m.user_id} value={m.user_id} disabled>
                    🚫 {m.profile?.full_name || m.user_id} (Cannot Receive Tasks)
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                disabled={!canAssign}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 disabled:bg-stone-100"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Deadline
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                disabled={!canAssign}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 disabled:bg-stone-100"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canAssign || isSubmitting || isSuccess}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-purple-950 hover:bg-purple-900 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{assignedTo ? 'Assigning & Creating...' : 'Creating Task...'}</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Created!</span>
                </>
              ) : (
                <span>{assignedTo ? 'Assign & Create Task' : 'Create Task'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
