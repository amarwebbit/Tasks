'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GitCommit, GitBranch, Check, RefreshCw, AlertCircle, FileCheck, Search, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { TaskCommit } from '@/types/database';

interface AnnotatedCommit extends TaskCommit {
  is_linked_to_current_task?: boolean;
  is_linked_to_other_task?: boolean;
  is_unlinked?: boolean;
}

interface LinkPushedCodeModalProps {
  taskId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LinkPushedCodeModal({
  taskId,
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: LinkPushedCodeModalProps) {
  const [commits, setCommits] = useState<AnnotatedCommit[]>([]);
  const [initialLinkedShas, setInitialLinkedShas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedShas, setSelectedShas] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchCommits = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      if (isRefresh) setSuccessMsg(null);

      const url = `/api/projects/${projectId}/unlinked-commits?taskId=${taskId}${isRefresh ? '&refresh=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.commits) {
        const fetchedCommits: AnnotatedCommit[] = data.commits;
        setCommits(fetchedCommits);

        // Pre-select commits that are currently linked to this task
        const linked = fetchedCommits
          .filter((c) => c.task_id === taskId || c.is_linked_to_current_task)
          .map((c) => c.commit_sha);
        
        setInitialLinkedShas(linked);
        setSelectedShas((prev) => {
          // If already selected, preserve user's choices, otherwise set initial linked
          if (prev.length > 0 && !isRefresh) return prev;
          return Array.from(new Set([...linked, ...prev]));
        });

        if (isRefresh) {
          setSuccessMsg(`Fetched latest commits from GitHub (${fetchedCommits.length} commits available).`);
        }
      }

      if (data.warning || data.error) {
        setError(data.warning || data.error);
      }
    } catch (err) {
      console.error('Failed to load commits', err);
      setError('Could not fetch project commits from GitHub.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, taskId]);

  useEffect(() => {
    if (isOpen) {
      fetchCommits(false);
      setSelectedShas([]);
      setSearchQuery('');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, fetchCommits]);

  const toggleSelect = (sha: string) => {
    setSelectedShas((prev) =>
      prev.includes(sha) ? prev.filter((s) => s !== sha) : [...prev, sha]
    );
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Determine newly unlinked SHAs
      const unlinkedShas = initialLinkedShas.filter((sha) => !selectedShas.includes(sha));

      const res = await fetch(`/api/tasks/${taskId}/commits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commit_shas: selectedShas,
          unlinked_shas: unlinkedShas,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save linked code');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error linking commits';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredCommits = commits.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.commit_message && c.commit_message.toLowerCase().includes(q)) ||
      (c.author_github_username && c.author_github_username.toLowerCase().includes(q)) ||
      (c.author_email && c.author_email.toLowerCase().includes(q)) ||
      (c.commit_sha && c.commit_sha.toLowerCase().includes(q)) ||
      (c.branch && c.branch.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-stone-50/70 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 border border-purple-200 rounded-xl text-[#4A154B]">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Link Pushed Code to Task</h3>
              <p className="text-xs text-stone-500">Select recent commits pushed to your repository</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchCommits(true)}
              disabled={loading || refreshing}
              title="Fetch latest commits from GitHub"
              className="px-3 py-1.5 text-xs font-semibold text-[#4A154B] hover:bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#4A154B] ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Fetching...' : 'Live GitHub Sync'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {commits.length > 0 && (
          <div className="px-6 pt-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search commit message, author, branch, or SHA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-xl pl-8 pr-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 transition"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-3.5 max-h-[55vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl text-xs bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center text-stone-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#4A154B]" />
              <span className="text-xs">Scanning repository commits from GitHub...</span>
            </div>
          ) : commits.length === 0 ? (
            <div className="py-10 text-center bg-[#FDFBF7] border border-dashed border-[#E8E2D5] rounded-xl space-y-3 p-4">
              <GitCommit className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-xs font-bold text-stone-800">No commits found in repository</p>
              <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                Click below to fetch the latest commits directly from your connected GitHub repository.
              </p>
              <button
                onClick={() => fetchCommits(true)}
                disabled={refreshing}
                className="px-4 py-2 bg-[#4A154B] hover:bg-[#3B0F3C] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition shadow-2xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Fetch Latest Commits from GitHub</span>
              </button>
            </div>
          ) : filteredCommits.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              No commits match &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredCommits.map((commit) => {
                const isSelected = selectedShas.includes(commit.commit_sha);
                const isLinkedToThisTask = commit.task_id === taskId || commit.is_linked_to_current_task;

                return (
                  <div
                    key={commit.id}
                    onClick={() => toggleSelect(commit.commit_sha)}
                    className={`p-3.5 border rounded-xl cursor-pointer flex items-start justify-between gap-3 transition ${
                      isSelected
                        ? 'bg-purple-50/70 border-purple-300 text-stone-900 shadow-2xs'
                        : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-800'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition ${
                        isSelected ? 'bg-[#4A154B] border-[#4A154B] text-white' : 'border-stone-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold text-stone-900 leading-snug">
                            {commit.commit_message}
                          </p>
                          {isLinkedToThisTask && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-[10px] font-bold shrink-0">
                              ✓ Linked to this task
                            </span>
                          )}
                          {!commit.task_id && (
                            <span className="px-2 py-0.5 bg-stone-100 text-stone-600 border border-stone-200 rounded-full text-[10px] font-semibold shrink-0">
                              Available to link
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 font-medium">
                          <span>
                            by <strong className="text-stone-700">{commit.author_github_username || commit.author_email || 'Author'}</strong>
                          </span>
                          <span>•</span>
                          <span>{new Date(commit.pushed_at).toLocaleString()}</span>
                          {commit.branch && (
                            <>
                              <span>•</span>
                              <span className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 text-stone-700 rounded text-[10px] font-mono flex items-center gap-1 font-semibold">
                                <GitBranch className="w-2.5 h-2.5 text-[#4A154B]" /> {commit.branch}
                              </span>
                            </>
                          )}
                          {(commit.total_additions > 0 || commit.total_deletions > 0) && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px] font-bold">
                                <span className="text-emerald-700">+{commit.total_additions}</span>{' '}
                                <span className="text-rose-700">-{commit.total_deletions}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-mono font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                        {commit.commit_sha.substring(0, 7)}
                      </span>
                      {commit.commit_url && (
                        <a
                          href={commit.commit_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition"
                          title="View on GitHub"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-600">
            {selectedShas.length} commit(s) attached to this task
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer border border-stone-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={submitting}
              className="px-5 py-2 bg-[#4A154B] hover:bg-[#3B0F3C] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs transition disabled:opacity-50 cursor-pointer"
            >
              {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Linked Code</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
