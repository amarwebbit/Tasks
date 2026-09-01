'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GitCommit, GitBranch, Check, RefreshCw, AlertCircle, FileCheck } from 'lucide-react';
import { TaskCommit } from '@/types/database';

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
  const [commits, setCommits] = useState<TaskCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedShas, setSelectedShas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchUnlinkedCommits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/unlinked-commits`);
      const data = await res.json();
      if (data.commits) {
        setCommits(data.commits);
      }
    } catch (err) {
      console.error('Failed to load unlinked commits', err);
      setError('Could not fetch unlinked project commits.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      fetchUnlinkedCommits();
      setSelectedShas([]);
    }
  }, [isOpen, fetchUnlinkedCommits]);

  const toggleSelect = (sha: string) => {
    setSelectedShas((prev) =>
      prev.includes(sha) ? prev.filter((s) => s !== sha) : [...prev, sha]
    );
  };

  const handleLink = async () => {
    if (selectedShas.length === 0) return;

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/tasks/${taskId}/commits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commit_shas: selectedShas,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to link commits');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-indigo-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Link Pushed Code to Task</h3>
              <p className="text-xs text-slate-400">Select recent commits pushed to this repository</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span className="text-xs">Scanning recent repository pushes...</span>
            </div>
          ) : commits.length === 0 ? (
            <div className="py-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl space-y-2">
              <GitCommit className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-medium text-slate-300">No unlinked pushes found</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Push code to GitHub or verify that Webhooks are configured in Project Settings.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {commits.map((commit) => {
                const isSelected = selectedShas.includes(commit.commit_sha);

                return (
                  <div
                    key={commit.id}
                    onClick={() => toggleSelect(commit.commit_sha)}
                    className={`p-3.5 border rounded-xl cursor-pointer flex items-center justify-between gap-3 transition ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-white'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-850 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition ${
                        isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold truncate">{commit.commit_message}</p>
                          {commit.branch && (
                            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono flex items-center gap-1">
                              <GitBranch className="w-2.5 h-2.5 text-indigo-400" /> {commit.branch}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {commit.author_github_username || commit.author_email} • {new Date(commit.pushed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      {commit.commit_sha.substring(0, 7)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {selectedShas.length} commit(s) selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={selectedShas.length === 0 || submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Attach Code to Task
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
