'use client';

import React, { useState } from 'react';
import { useTrinetra } from '@/lib/store';
import { ProjectRole } from '@/types/database';
import { X, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  projectId,
}) => {
  const { projects, inviteMember } = useTrinetra();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectRole>('MEMBER');
  const [canReceiveTasks, setCanReceiveTasks] = useState(true);
  const [canAssignTasks, setCanAssignTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const project = projects.find(p => p.id === projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await inviteMember({
        projectId,
        email: email.trim(),
        role,
        can_receive_tasks: canReceiveTasks,
        can_assign_tasks: canAssignTasks,
      });

      if (!res.success) {
        setError(res.error || 'Failed to send invitation.');
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsSubmitting(false);
        setEmail('');
        onClose();
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error sending invitation');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-900">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-900">Project Onboarding</span>
              <h2 className="text-lg font-semibold text-stone-900">Invite Member to {project?.name}</h2>
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
              <div>Invitation dispatched successfully!</div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Member Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="e.g. rahul@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Project Role
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as ProjectRole)}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
            >
              <option value="MEMBER">Member (Contributor)</option>
              <option value="LEADER">Team Leader (Full Control)</option>
              <option value="VIEWER">Viewer (Read-only)</option>
            </select>
          </div>

          {/* Granular Assignment Permission Toggles */}
          <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">Assignment Permissions</h3>
            
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-stone-900">Can Receive Tasks</span>
                <p className="text-xs text-stone-500">Allows team members to assign work to this user</p>
              </div>
              <input
                type="checkbox"
                checked={canReceiveTasks}
                onChange={e => setCanReceiveTasks(e.target.checked)}
                className="w-4 h-4 text-purple-900 rounded border-stone-300 focus:ring-purple-800"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-stone-200">
              <div>
                <span className="text-sm font-medium text-stone-900">Can Assign Tasks</span>
                <p className="text-xs text-stone-500">Allows this user to delegate tasks to permitted members</p>
              </div>
              <input
                type="checkbox"
                checked={canAssignTasks}
                onChange={e => setCanAssignTasks(e.target.checked)}
                className="w-4 h-4 text-purple-900 rounded border-stone-300 focus:ring-purple-800"
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
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
              {isSubmitting ? 'Sending...' : isSuccess ? 'Invited!' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
