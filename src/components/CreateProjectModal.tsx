'use client';

import React, { useState } from 'react';
import { useTrinetra } from '@/lib/store';
import { AssignmentRule } from '@/types/database';
import { X, FolderPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, createProject } = useTrinetra();

  const [name, setName] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [description, setDescription] = useState('');
  const [teamLeaderId, setTeamLeaderId] = useState(currentUser?.id || '');
  const [assignmentRule, setAssignmentRule] = useState<AssignmentRule>('LEADER_ONLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!projectKey || projectKey.length <= 4) {
      // Auto-suggest project key from name initials
      const words = val.trim().split(/\s+/);
      let key = '';
      if (words.length === 1 && words[0].length >= 3) {
        key = words[0].substring(0, 3).toUpperCase();
      } else if (words.length > 1) {
        key = words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
      }
      if (key) setProjectKey(key);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!name.trim()) {
      setError('Please provide a project name.');
      setIsSubmitting(false);
      return;
    }

    if (!projectKey.trim()) {
      setError('Please provide a short project key (e.g. TRI, VOICE).');
      setIsSubmitting(false);
      return;
    }

    try {
      const leaderId = teamLeaderId || currentUser?.id;
      if (!leaderId) {
        setError('Please select a team leader.');
        setIsSubmitting(false);
        return;
      }

      const res = await createProject({
        name: name.trim(),
        project_key: projectKey.trim().toUpperCase(),
        description: description.trim(),
        team_leader_id: leaderId,
        assignment_rule: assignmentRule,
        start_date: startDate,
        target_date: targetDate || undefined,
      });

      if (!res.success) {
        setError(res.error || 'Failed to create project.');
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsSubmitting(false);
        setName('');
        setProjectKey('');
        setDescription('');
        onClose();
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating project');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-900">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-900">Multi-Project Architecture</span>
              <h2 className="text-lg font-semibold text-stone-900">Create New Project</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>

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
              <div>Project created successfully!</div>
            </div>
          )}

          {/* Project Name & Project Key */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Trinetra Shiksha"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Project Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. TRI"
                value={projectKey}
                onChange={e => setProjectKey(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 uppercase"
              />
              <p className="text-[11px] text-stone-500 mt-1">Tasks: {projectKey || 'KEY'}-001</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Primary purpose, deliverables, and scope of this project..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
            />
          </div>

          {/* Team Leader & Assignment Policy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Team Leader <span className="text-red-500">*</span>
              </label>
              <select
                value={teamLeaderId}
                onChange={e => setTeamLeaderId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
              >
                {users.length === 0 && currentUser && (
                  <option value={currentUser.id}>{currentUser.full_name} ({currentUser.email})</option>
                )}
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Task Assignment Policy
              </label>
              <select
                value={assignmentRule}
                onChange={e => setAssignmentRule(e.target.value as AssignmentRule)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
              >
                <option value="LEADER_ONLY">Team Leader Only (Default)</option>
                <option value="SELECTED_MEMBERS">Team Leader + Selected Members</option>
                <option value="EVERYONE">Everyone in Project</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Target Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
              />
            </div>
          </div>

          {/* Actions */}
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
              disabled={isSubmitting || isSuccess}
              className="px-5 py-2 text-sm font-medium text-white bg-purple-950 hover:bg-purple-900 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : isSuccess ? 'Created!' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
