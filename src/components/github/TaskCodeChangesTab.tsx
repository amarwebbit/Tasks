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
  FileDiff
} from 'lucide-react';
import { TaskCommit } from '@/types/database';
import { parseDiffPatch } from '@/lib/github';

interface TaskCodeChangesTabProps {
  taskId: string;
  projectId: string;
  onLinkPushedCodeClick?: () => void;
}

export default function TaskCodeChangesTab({
  taskId,
  projectId,
  onLinkPushedCodeClick,
}: TaskCodeChangesTabProps) {
  const [commits, setCommits] = useState<TaskCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCommitId, setExpandedCommitId] = useState<string | null>(null);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);

  const fetchCommits = useCallback(async () => {
    try {
      setLoading(true);
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
  }, [taskId]);

  useEffect(() => {
    fetchCommits();
  }, [fetchCommits]);

  // Aggregate totals
  const totalAdditions = commits.reduce((acc, c) => acc + (c.total_additions || 0), 0);
  const totalDeletions = commits.reduce((acc, c) => acc + (c.total_deletions || 0), 0);
  const totalFiles = commits.reduce((acc, c) => acc + (c.files_count || 0), 0);

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
        <span>Fetching linked code changes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Bar & Summary Stats */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Commits</span>
            <span className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
              <GitCommit className="w-4 h-4 text-indigo-400" /> {commits.length}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Files Changed</span>
            <span className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
              <FileCode className="w-4 h-4 text-indigo-400" /> {totalFiles}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Line Changes</span>
            <div className="flex items-center gap-2 text-sm font-semibold mt-0.5">
              <span className="text-emerald-400 flex items-center gap-0.5">
                <Plus className="w-3.5 h-3.5" /> {totalAdditions}
              </span>
              <span className="text-rose-400 flex items-center gap-0.5">
                <Minus className="w-3.5 h-3.5" /> {totalDeletions}
              </span>
            </div>
          </div>
        </div>

        {onLinkPushedCodeClick && (
          <button
            onClick={onLinkPushedCodeClick}
            className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
          >
            <FileDiff className="w-3.5 h-3.5" /> Link Recent Code Pushes
          </button>
        )}
      </div>

      {commits.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl space-y-3">
          <Code2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-medium text-slate-300">No code commits linked to this task yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            When teammates push code with this task key (e.g. commit message containing task ID) or manually link their pushes, code diff logs will appear here side-by-side.
          </p>
          {onLinkPushedCodeClick && (
            <button
              onClick={onLinkPushedCodeClick}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium inline-flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
            >
              <GitCommit className="w-4 h-4" /> Link Unlinked Pushes
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {commits.map((commit) => {
            const isExpanded = expandedCommitId === commit.id;
            const fileChanges = commit.file_changes || [];

            return (
              <div 
                key={commit.id} 
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg transition"
              >
                {/* Commit Header Card */}
                <div 
                  onClick={() => setExpandedCommitId(isExpanded ? null : commit.id)}
                  className="p-4 bg-slate-850 hover:bg-slate-800/80 cursor-pointer flex flex-wrap items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button className="text-slate-400 p-0.5">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                      {commit.author_github_username ? commit.author_github_username.substring(0, 2).toUpperCase() : 'GH'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate max-w-md">
                          {commit.commit_message}
                        </h4>
                        {commit.branch && (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-[10px] flex items-center gap-1 font-mono shrink-0">
                            <GitBranch className="w-3 h-3 text-indigo-400" /> {commit.branch}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>by <strong>{commit.author_github_username || commit.author_email || 'Teammate'}</strong></span>
                        <span>•</span>
                        <span>{new Date(commit.pushed_at).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-xs font-mono font-medium flex items-center gap-2">
                      <span className="text-emerald-400">+{commit.total_additions}</span>
                      <span className="text-rose-400">-{commit.total_deletions}</span>
                    </div>

                    {commit.commit_url && (
                      <a
                        href={commit.commit_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-mono transition"
                      >
                        {commit.commit_sha.substring(0, 7)} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Expanded File Diffs Section */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-4">
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-indigo-400" /> Changed Files ({fileChanges.length})
                    </h5>

                    {fileChanges.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">File modification statistics recorded ({commit.files_count} files).</p>
                    ) : (
                      <div className="space-y-3">
                        {fileChanges.map((file) => {
                          const fileKey = `${commit.id}-${file.id}`;
                          const isFileExpanded = expandedFileId === fileKey || fileChanges.length === 1;
                          const parsedPatch = file.patch ? parseDiffPatch(file.patch) : [];

                          return (
                            <div key={file.id} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
                              {/* File Header */}
                              <div
                                onClick={() => setExpandedFileId(isFileExpanded ? null : fileKey)}
                                className="px-3.5 py-2.5 bg-slate-850 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition"
                              >
                                <div className="flex items-center gap-2 font-mono text-slate-200">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                    file.status === 'added' ? 'bg-emerald-500/20 text-emerald-400' :
                                    file.status === 'deleted' ? 'bg-rose-500/20 text-rose-400' :
                                    'bg-amber-500/20 text-amber-400'
                                  }`}>
                                    {file.status}
                                  </span>
                                  <span className="font-semibold">{file.filename}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-slate-400 font-mono text-[11px]">
                                    <span className="text-emerald-400">+{file.additions}</span>{' '}
                                    <span className="text-rose-400">-{file.deletions}</span>
                                  </span>
                                  {file.patch && (
                                    <button className="text-slate-400">
                                      {isFileExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Diff Block */}
                              {isFileExpanded && parsedPatch.length > 0 && (
                                <div className="p-3 bg-slate-950 font-mono text-[11px] overflow-x-auto leading-relaxed divide-y divide-slate-900 border-t border-slate-800">
                                  {parsedPatch.map((line, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex items-start gap-3 px-2 py-0.5 ${
                                        line.type === 'add' ? 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500' :
                                        line.type === 'delete' ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500' :
                                        line.type === 'header' ? 'bg-indigo-950/40 text-indigo-400 font-semibold' :
                                        'text-slate-400'
                                      }`}
                                    >
                                      <span className="w-8 text-right select-none opacity-40 shrink-0 text-slate-500">
                                        {line.oldLineNumber || ''}
                                      </span>
                                      <span className="w-8 text-right select-none opacity-40 shrink-0 text-slate-500">
                                        {line.newLineNumber || ''}
                                      </span>
                                      <span className="w-4 select-none shrink-0 text-center font-bold">
                                        {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
                                      </span>
                                      <pre className="whitespace-pre-wrap break-all font-mono">{line.content}</pre>
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
