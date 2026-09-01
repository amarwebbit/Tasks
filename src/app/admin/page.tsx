'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useTrinetra } from '@/lib/store';
import { 
  ShieldCheck, 
  GitBranch, 
  GitCommit, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FolderPlus, 
  Users, 
  FileText, 
  ExternalLink,
  Lock
} from 'lucide-react';
import Link from 'next/link';

interface ProjectGitHubInfo {
  id: string;
  project_key: string;
  name: string;
  repo_full_name?: string;
  is_active?: boolean;
  webhook_secret?: string;
  commit_count?: number;
}

export default function AdminDashboardPage() {
  const { projects, users, tasks, isPro, currentUser } = useTrinetra();
  const [gitHubProjects, setGitHubProjects] = useState<ProjectGitHubInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdminData() {
      try {
        setLoading(true);
        const res = await fetch('/api/github/user-repos');
        // Fetch all project settings
        const projectList: ProjectGitHubInfo[] = [];

        for (const p of projects) {
          try {
            const ghRes = await fetch(`/api/projects/${p.id}/github`);
            const ghData = await ghRes.json();
            projectList.push({
              id: p.id,
              project_key: p.project_key,
              name: p.name,
              repo_full_name: ghData.settings?.repo_full_name,
              is_active: ghData.settings?.is_active,
              webhook_secret: ghData.settings?.webhook_secret,
              commit_count: ghData.settings ? 1 : 0,
            });
          } catch (_) {
            projectList.push({ id: p.id, project_key: p.project_key, name: p.name });
          }
        }
        setGitHubProjects(projectList);
      } catch (err) {
        console.error('Failed loading admin github data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (projects.length > 0) {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [projects]);

  const handleSyncAll = async (projectId: string) => {
    try {
      setSyncingId(projectId);
      setMessage(null);
      const res = await fetch(`/api/projects/${projectId}/github/sync-commits`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync commits');
      setMessage(`Successfully imported ${data.synced_count || 0} commit(s) from GitHub!`);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const totalConnected = gitHubProjects.filter(p => p.repo_full_name).length;

  return (
    <div className="flex-1 flex flex-col bg-[#FDFBF7]">
      <Header
        title="Admin & System Integration Oversight"
        subtitle="Manage active webhooks, GitHub repository connections, and system audit logs."
      />

      <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        
        {message && (
          <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs font-semibold flex items-center justify-between shadow-2xs">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4A154B]" /> {message}
            </span>
            <button onClick={() => setMessage(null)} className="text-stone-400 hover:text-stone-700">✕</button>
          </div>
        )}

        {/* Executive Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-[10px] uppercase font-bold tracking-wider">Total Projects</span>
              <FolderPlus className="w-4 h-4 text-[#4A154B]" />
            </div>
            <div className="text-2xl font-extrabold text-stone-900">{projects.length}</div>
            <p className="text-[11px] text-stone-500">Active project workspaces</p>
          </div>

          <div className="p-5 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-[10px] uppercase font-bold tracking-wider">Connected Repos</span>
              <GitBranch className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-stone-900">{totalConnected} / {projects.length}</div>
            <p className="text-[11px] text-emerald-700 font-medium">Webhooks active</p>
          </div>

          <div className="p-5 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-[10px] uppercase font-bold tracking-wider">Total Tasks Logged</span>
              <FileText className="w-4 h-4 text-[#4A154B]" />
            </div>
            <div className="text-2xl font-extrabold text-stone-900">{tasks.length}</div>
            <p className="text-[11px] text-stone-500">Across all projects</p>
          </div>

          <div className="p-5 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-[10px] uppercase font-bold tracking-wider">Team Members</span>
              <Users className="w-4 h-4 text-[#4A154B]" />
            </div>
            <div className="text-2xl font-extrabold text-stone-900">{users.length}</div>
            <p className="text-[11px] text-stone-500">Registered platform users</p>
          </div>
        </div>

        {/* GitHub Integration & Webhook Oversight Table */}
        <div className="bg-white border border-[#E8E2D5] rounded-xl overflow-hidden shadow-2xs space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#4A154B]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                GitHub Repository & Webhook Status Matrix
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-purple-900 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
              System Webhook Endpoint: /api/webhooks/github
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4EFE6]/50 text-stone-700 uppercase font-bold text-[10px] tracking-wider border-b border-[#E8E2D5]">
                <tr>
                  <th className="py-3 px-4">Project Key</th>
                  <th className="py-3 px-4">Project Name</th>
                  <th className="py-3 px-4">Connected Repository</th>
                  <th className="py-3 px-4">Webhook Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {gitHubProjects.map(p => (
                  <tr key={p.id} className="hover:bg-[#FBF9F5] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900">{p.project_key}</td>
                    <td className="py-3.5 px-4 font-medium text-stone-900">{p.name}</td>
                    <td className="py-3.5 px-4">
                      {p.repo_full_name ? (
                        <code className="text-purple-950 font-mono bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                          {p.repo_full_name}
                        </code>
                      ) : (
                        <span className="text-stone-400 italic">Not Connected</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.repo_full_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-500">
                          Disconnected
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.repo_full_name && (
                          <button
                            onClick={() => handleSyncAll(p.id)}
                            disabled={syncingId === p.id}
                            className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-stone-300 transition cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 text-[#4A154B] ${syncingId === p.id ? 'animate-spin' : ''}`} />
                            <span>{syncingId === p.id ? 'Syncing...' : 'Sync History'}</span>
                          </button>
                        )}
                        <Link
                          href={`/projects/${p.project_key}?github_connected=true`}
                          className="px-3 py-1 bg-[#4A154B] hover:bg-[#3B0F3C] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition"
                        >
                          Configure Settings
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
