'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  GitCommit, 
  GitBranch, 
  FileCode, 
  Plus, 
  Minus, 
  ExternalLink, 
  ChevronDown, 
  ChevronRight, 
  RefreshCw,
  Code2,
  CheckCircle2,
  FileDiff,
  Sparkles
} from 'lucide-react';
import { TaskCommit } from '@/types/database';
import { parseDiffPatch } from '@/lib/github';
import { DiffSkeleton } from '@/components/SkeletonLoader';

interface TaskCodeChangesTabProps {
  taskId: string;
  projectId: string;
  onLinkPushedCodeClick?: () => void;
  onOpenGitHubSettings?: () => void;
}

export default function TaskCodeChangesTab({
  taskId,
  projectId,
  onLinkPushedCodeClick,
  onOpenGitHubSettings,
}: TaskCodeChangesTabProps) {
  const [commits, setCommits] = useState<TaskCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGitHubConnected, setIsGitHubConnected] = useState<boolean | null>(null);
  const [expandedCommitId, setExpandedCommitId] = useState<string | null>(null);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);

  const fetchCommits = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Check if GitHub is connected for this project
      const settingsRes = await fetch(`/api/projects/${projectId}/github`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setIsGitHubConnected(!!settingsData.connected);
      } else {
        setIsGitHubConnected(false);
      }

      // 2. Fetch task commits
      const res = await fetch(`/api/tasks/${taskId}/commits`);
      const data = await res.json();
      if (data.commits) {
        setCommits(data.commits);
        if (data.commits.length > 0) {
          setExpandedCommitId(data.commits[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load task commits:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId]);

  useEffect(() => {
    fetchCommits();
  }, [fetchCommits]);

  // Aggregate totals
  const totalAdditions = commits.reduce((acc, c) => acc + (c.total_additions || 0), 0);
  const totalDeletions = commits.reduce((acc, c) => acc + (c.total_deletions || 0), 0);
  const totalFiles = commits.reduce((acc, c) => acc + (c.files_count || 0), 0);

  if (loading) {
    return <DiffSkeleton />;
  }

  return (
    <div className="space-y-6">
      
      {/* Header Bar & Summary Stats */}
      <div className="p-4 bg-[#FDFBF7] border border-[#E8E2D5] rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">Commits</span>
            <span className="text-base font-bold text-stone-900 flex items-center gap-1.5 mt-0.5">
              <GitCommit className="w-4 h-4 text-[#4A154B]" /> {commits.length}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">Files Changed</span>
            <span className="text-base font-bold text-stone-900 flex items-center gap-1.5 mt-0.5">
              <FileCode className="w-4 h-4 text-[#4A154B]" /> {totalFiles}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">Line Changes</span>
            <div className="flex items-center gap-2 text-sm font-semibold mt-0.5">
              <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                <Plus className="w-3.5 h-3.5" /> {totalAdditions}
              </span>
              <span className="text-rose-700 font-bold flex items-center gap-0.5">
                <Minus className="w-3.5 h-3.5" /> {totalDeletions}
              </span>
            </div>
          </div>
        </div>

        {onLinkPushedCodeClick && (
          <button
            onClick={onLinkPushedCodeClick}
            className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
          >
            <FileDiff className="w-3.5 h-3.5 text-[#4A154B]" /> Link Recent Code Pushes
          </button>
        )}
      </div>

      {isGitHubConnected === false ? (
        <div className="p-8 text-center bg-[#FDFBF7] border border-[#E8E2D5] rounded-xl space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-[#4A154B] mx-auto">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-900">GitHub Repository Not Connected</h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
              Connect GitHub to this project to automatically capture commits, line-by-line code diffs, and teammate pushes for this task.
            </p>
          </div>
          {onOpenGitHubSettings && (
            <button
              onClick={onOpenGitHubSettings}
              className="px-5 py-2.5 bg-[#4A154B] hover:bg-[#3B0F3C] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Setup GitHub to See Commits
            </button>
          )}
        </div>
      ) : commits.length === 0 ? (
        <div className="p-8 text-center bg-[#FDFBF7] border border-dashed border-[#E8E2D5] rounded-xl space-y-3 shadow-2xs">
          <Code2 className="w-10 h-10 text-stone-400 mx-auto" />
          <h4 className="text-sm font-semibold text-stone-800">No code commits linked to this task yet</h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            When teammates push code with this task key (e.g. commit message containing task ID) or manually link their pushes, code diff logs will appear here side-by-side.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  const res = await fetch(`/api/projects/${projectId}/github/sync-commits`, { method: 'POST' });
                  await fetchCommits();
                } catch (err) {
                  console.error('Failed syncing commits:', err);
                  setLoading(false);
                }
              }}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold inline-flex items-center gap-2 border border-stone-300 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#4A154B]" /> Sync Commits from GitHub
            </button>

            {onLinkPushedCodeClick && (
              <button
                onClick={onLinkPushedCodeClick}
                className="px-4 py-2 bg-[#4A154B] hover:bg-[#3B0F3C] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <GitCommit className="w-4 h-4" /> Link Unlinked Pushes
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {commits.map((commit) => {
            const isExpanded = expandedCommitId === commit.id;
            const fileChanges = commit.file_changes || [];

            return (
              <div 
                key={commit.id} 
                className="bg-white border border-[#E8E2D5] rounded-xl overflow-hidden shadow-2xs transition"
              >
                {/* Commit Header Card */}
                <div 
                  onClick={() => setExpandedCommitId(isExpanded ? null : commit.id)}
                  className="p-4 bg-[#FDFBF7] hover:bg-[#F9F5EC] cursor-pointer flex flex-wrap items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button className="text-stone-500 p-0.5">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-purple-900" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-950 font-bold text-xs shrink-0">
                      {commit.author_github_username ? commit.author_github_username.substring(0, 2).toUpperCase() : 'GH'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-stone-900 truncate max-w-md">
                          {commit.commit_message}
                        </h4>
                        {commit.branch && (
                          <span className="px-2 py-0.5 bg-stone-100 text-stone-700 border border-stone-200 rounded-full text-[10px] flex items-center gap-1 font-mono shrink-0 font-semibold">
                            <GitBranch className="w-3 h-3 text-[#4A154B]" /> {commit.branch}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2">
                        <span>by <strong className="text-stone-800">{commit.author_github_username || commit.author_email || 'Teammate'}</strong></span>
                        <span>•</span>
                        <span>{new Date(commit.pushed_at).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-xs font-mono font-bold flex items-center gap-2">
                      <span className="text-emerald-700">+{commit.total_additions}</span>
                      <span className="text-rose-700">-{commit.total_deletions}</span>
                    </div>

                    {commit.commit_url && (
                      <a
                        href={commit.commit_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-lg text-xs flex items-center gap-1 font-mono transition"
                      >
                        {commit.commit_sha.substring(0, 7)} <ExternalLink className="w-3 h-3 text-stone-500" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Expanded File Diffs Section */}
                {isExpanded && (
                  <div className="p-4 border-t border-[#E8E2D5] bg-[#FBF9F5] space-y-4">
                    <h5 className="text-[11px] font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-[#4A154B]" /> Changed Files ({fileChanges.length})
                    </h5>

                    {fileChanges.length === 0 ? (
                      <p className="text-xs text-stone-500 italic">File modification statistics recorded ({commit.files_count} files).</p>
                    ) : (
                      <div className="space-y-3">
                        {fileChanges.map((file) => {
                          const fileKey = `${commit.id}-${file.id}`;
                          const isFileExpanded = expandedFileId === fileKey || fileChanges.length === 1;
                          const parsedPatch = file.patch ? parseDiffPatch(file.patch) : [];

                          return (
                            <div key={file.id} className="border border-[#E8E2D5] rounded-xl overflow-hidden bg-white shadow-2xs">
                              {/* File Header */}
                              <div
                                onClick={() => setExpandedFileId(isFileExpanded ? null : fileKey)}
                                className="px-3.5 py-2.5 bg-[#FDFBF7] hover:bg-[#F5F0E6] cursor-pointer flex items-center justify-between text-xs transition border-b border-stone-100"
                              >
                                <div className="flex items-center gap-2 font-mono text-stone-800">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-extrabold ${
                                    file.status === 'added' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                    file.status === 'deleted' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                                    'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}>
                                    {file.status}
                                  </span>
                                  <span className="font-bold">{file.filename}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-[11px] font-bold">
                                    <span className="text-emerald-700">+{file.additions}</span>{' '}
                                    <span className="text-rose-700">-{file.deletions}</span>
                                  </span>
                                  {file.patch && (
                                    <button className="text-stone-500">
                                      {isFileExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Diff Block */}
                              {isFileExpanded && parsedPatch.length > 0 && (
                                <div className="p-3 bg-stone-900 text-stone-100 font-mono text-[11px] overflow-x-auto leading-relaxed divide-y divide-stone-800 border-t border-stone-200">
                                  {parsedPatch.map((line, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex items-start gap-3 px-2 py-0.5 ${
                                        line.type === 'add' ? 'bg-emerald-950/70 text-emerald-300 border-l-2 border-emerald-500 font-semibold' :
                                        line.type === 'delete' ? 'bg-rose-950/70 text-rose-300 border-l-2 border-rose-500 font-semibold' :
                                        line.type === 'header' ? 'bg-stone-800 text-purple-300 font-bold' :
                                        'text-stone-300'
                                      }`}
                                    >
                                      <span className="w-6 shrink-0 text-[10px] text-stone-500 text-right select-none">{idx + 1}</span>
                                      <span className="whitespace-pre-wrap break-all">{line.content}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
