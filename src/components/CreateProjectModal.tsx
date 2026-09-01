import React, { useState } from 'react';
import { useTrinetra } from '@/lib/store';
import { AssignmentRule } from '@/types/database';
import { X, FolderPlus, AlertCircle, CheckCircle2, Lock, Sparkles, GitBranch, Link2 } from 'lucide-react';
import { PaywallModal } from './PaywallModal';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, projects, isPro, createProject } = useTrinetra();

  const [name, setName] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [description, setDescription] = useState('');
  const [teamLeaderId, setTeamLeaderId] = useState(currentUser?.id || '');
  const [assignmentRule, setAssignmentRule] = useState<AssignmentRule>('LEADER_ONLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState('');
  const [enableGithub, setEnableGithub] = useState(false);
  const [githubRepo, setGithubRepo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  const isLimitReached = !isPro && projects.length >= 1;

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

    if (isLimitReached) {
      setIsPaywallOpen(true);
      setError('Free tier is strictly limited to 1 project. Please upgrade to Pro to create unlimited projects.');
      return;
    }

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

      // If user enabled GitHub integration and entered a repository name, link it now
      if (enableGithub && githubRepo.trim() && res.project?.id) {
        try {
          await fetch(`/api/projects/${res.project.id}/github`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              repo_full_name: githubRepo.trim(),
            }),
          });
        } catch (ghErr) {
          console.error('Failed auto-linking GitHub repo on project creation:', ghErr);
        }
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsSubmitting(false);
        setName('');
        setProjectKey('');
        setDescription('');
        setEnableGithub(false);
        setGithubRepo('');
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
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-900">Multi-Project Architecture</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isLimitReached ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-100 text-stone-600'}`}>
                  {isPro ? 'Pro: Unlimited' : `Free: ${projects.length}/1 Project`}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-stone-900">Create New Project</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Free Tier Project Limit Reached Banner */}
          {isLimitReached && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Lock className="w-4 h-4 text-amber-700" />
                <span>Free Plan Limit Reached (1 / 1 Projects Created)</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                You are on the Free tier which allows 1 project. Upgrade to <strong>Trinetra Pro</strong> (₹99/mo or ₹399/yr) to create unlimited projects and invite unlimited teammates.
              </p>
              <button
                type="button"
                onClick={() => setIsPaywallOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-linear-to-r from-purple-950 to-purple-800 hover:from-purple-900 hover:to-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Upgrade to Pro — ₹99/mo or ₹399/yr</span>
              </button>
            </div>
          )}

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

          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={isLimitReached}
              placeholder="e.g. Shiksha Foundation Mobile App"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 disabled:bg-stone-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Project Key */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Project Key (Prefix for Task IDs) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={isLimitReached}
              placeholder="e.g. SHI, EDU, PROJ"
              value={projectKey}
              onChange={e => setProjectKey(e.target.value.toUpperCase())}
              maxLength={10}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm font-mono uppercase text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 disabled:bg-stone-100 disabled:cursor-not-allowed"
            />
            <p className="text-[11px] text-stone-400 mt-1">Tasks will be labeled: {projectKey || 'KEY'}-101, {projectKey || 'KEY'}-102</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Description / Objectives
            </label>
            <textarea
              rows={3}
              disabled={isLimitReached}
              placeholder="Describe the deliverables, stakeholders, and scope of this project..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 disabled:bg-stone-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Team Leader Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Project Team Leader <span className="text-red-500">*</span>
            </label>
            <select
              disabled={isLimitReached}
              value={teamLeaderId}
              onChange={e => setTeamLeaderId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 disabled:bg-stone-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Team Leader</option>
              {currentUser && (
                <option value={currentUser.id}>
                  {currentUser.full_name} ({currentUser.email}) [You]
                </option>
              )}
              {users
                .filter(u => u.id !== currentUser?.id)
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-stone-400 mt-1">The Team Leader has full administrative oversight over tasks in this project.</p>
          </div>

          {/* Assignment Governance Rule */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
              Task Assignment Permission Model
            </label>
            <div className="space-y-2">
              {[
                {
                  rule: 'LEADER_ONLY',
                  title: 'Team Leader Only (Recommended)',
                  desc: 'Only the designated project Team Leader can assign tasks to members.',
                },
                {
                  rule: 'SELECTED_MEMBERS',
                  title: 'Selected Members',
                  desc: 'Team Leader + specific members granted "Can Assign Tasks" permission.',
                },
                {
                  rule: 'EVERYONE',
                  title: 'Everyone in Project',
                  desc: 'All project members can create and assign tasks to each other.',
                },
              ].map(opt => (
                <label
                  key={opt.rule}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isLimitReached
                      ? 'opacity-60 cursor-not-allowed bg-stone-50 border-stone-200'
                      : assignmentRule === opt.rule
                      ? 'border-purple-900 bg-purple-50/50 text-purple-950 font-medium'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="assignmentRule"
                    disabled={isLimitReached}
                    value={opt.rule}
                    checked={assignmentRule === opt.rule}
                    onChange={e => setAssignmentRule(e.target.value as AssignmentRule)}
                    className="mt-0.5 text-purple-900 focus:ring-purple-800"
                  />
                  <div>
                    <span className="font-semibold text-stone-900 block">{opt.title}</span>
                    <span className="text-[11px] text-stone-500">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                disabled={isLimitReached}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 disabled:bg-stone-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Target Date
              </label>
              <input
                type="date"
                disabled={isLimitReached}
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 disabled:bg-stone-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* GitHub Integration (Optional) */}
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isLimitReached}
                  checked={enableGithub}
                  onChange={(e) => setEnableGithub(e.target.checked)}
                  className="rounded text-purple-900 focus:ring-purple-800"
                />
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-purple-900" />
                  Link GitHub Repository (Optional)
                </span>
              </label>
              <span className="text-[10px] text-purple-900 font-semibold bg-purple-100 px-2 py-0.5 rounded-full">
                Auto-Commit Tracking
              </span>
            </div>

            {enableGithub && (
              <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Link2 className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    disabled={isLimitReached}
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    placeholder="e.g. username/repository-name or org/repo"
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-purple-800"
                  />
                </div>
                <p className="text-[11px] text-stone-500">
                  Teammate code pushes to this repository will be logged side-by-side with task details.
                </p>
              </div>
            )}
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
            {isLimitReached ? (
              <button
                type="button"
                onClick={() => setIsPaywallOpen(true)}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Upgrade to Create More Projects</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="px-5 py-2 text-sm font-medium text-white bg-purple-950 hover:bg-purple-900 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Creating...' : isSuccess ? 'Created!' : 'Create Project'}
              </button>
            )}
          </div>
        </form>
      </div>

      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        title="Unlock Unlimited Projects"
        subtitle="Free tier allows 1 project. Upgrade to Pro to create unlimited projects and scale your workspace without limits."
        highlightedFeature="PROJECTS"
      />
    </div>
  );
};
