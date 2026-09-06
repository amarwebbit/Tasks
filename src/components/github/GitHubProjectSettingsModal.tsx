'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Link2,
  AlertCircle,
  Lock,
  Globe,
  Trash2,
  Search,
  CheckCircle2,
  X,
  ExternalLink
} from 'lucide-react';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  description?: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
}

interface GitHubProjectSettingsModalProps {
  projectId: string;
  projectName: string;
  projectKey?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function GitHubProjectSettingsModal({
  projectId,
  projectName,
  projectKey = '',
  isOpen,
  onClose,
}: GitHubProjectSettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [repoFullName, setRepoFullName] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [webhookSecret, setWebhookSecret] = useState('');

  // 1-Click OAuth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRepos, setUserRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/github`
    : 'https://yourdomain.com/api/webhooks/github';

  // Fetch current project GitHub connection settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/projects/${projectId}/github`);
      const data = await res.json();

      if (data.connected) {
        setConnected(true);
        setRepoFullName(data.repo_full_name);
        setWebhookSecret(data.webhook_secret);
        setDefaultBranch(data.default_branch || 'main');
      } else {
        setConnected(false);
        setRepoFullName('');
        setWebhookSecret('');
      }
    } catch (err) {
      console.error('Failed to load GitHub settings', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch user repositories if OAuth token exists
  const fetchUserRepos = useCallback(async () => {
    try {
      const res = await fetch('/api/github/user-repos');
      const data = await res.json();

      if (res.ok && data.authenticated && Array.isArray(data.repos)) {
        setIsAuthenticated(true);
        setUserRepos(data.repos);
      } else {
        setIsAuthenticated(false);
        setUserRepos([]);
      }
    } catch (err) {
      console.error('Failed to fetch user repos', err);
      setIsAuthenticated(false);
      setUserRepos([]);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      fetchUserRepos();
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, fetchSettings, fetchUserRepos]);

  // Handle 1-Click Connect
  const handle1ClickConnect = async () => {
    if (!selectedRepo) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/projects/${projectId}/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_full_name: selectedRepo.full_name,
          default_branch: selectedRepo.default_branch,
          setup_webhook: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect repository');

      setConnected(true);
      setRepoFullName(selectedRepo.full_name);
      setDefaultBranch(selectedRepo.default_branch || 'main');
      setWebhookSecret(data.settings?.webhook_secret || '');
      setSuccessMsg(`Successfully connected to ${selectedRepo.full_name}! Syncing past commits...`);

      // Auto-sync recent commits from GitHub
      try {
        const syncRes = await fetch(`/api/projects/${projectId}/github/sync-commits`, { method: 'POST' });
        const syncData = await syncRes.json();
        if (syncRes.ok) {
          setSuccessMsg(`Successfully connected to ${selectedRepo.full_name}! Imported ${syncData.synced_count || 0} commit(s).`);
        } else {
          setSuccessMsg(`Successfully connected to ${selectedRepo.full_name}!`);
        }
      } catch (_) {
        setSuccessMsg(`Successfully connected to ${selectedRepo.full_name}!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error connecting repository';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Handle Manual Sync Past Commits
  const handleSyncCommits = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/projects/${projectId}/github/sync-commits`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to sync commits');
      setSuccessMsg(`Imported ${data.synced_count || 0} past commit(s) from GitHub!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setError(msg);
    } finally {
      setSyncing(false);
    }
  };

  // Handle Disconnect
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect GitHub from this project?')) return;

    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/projects/${projectId}/github`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect');

      setConnected(false);
      setRepoFullName('');
      setWebhookSecret('');
      setSelectedRepo(null);
      setSuccessMsg('GitHub integration disconnected.');
      // Refresh repositories list for connecting
      fetchUserRepos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error disconnecting';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, type: 'url' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const filteredRepos = userRepos.filter(r =>
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-4 bg-stone-50/70 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 rounded-xl text-[#4A154B] border border-purple-200">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900">GitHub Repository Connection</h2>
                <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 text-[#4A154B] text-[10px] font-bold rounded-full">
                  1-Click Setup
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium">Project: {projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className={`p-4 rounded-xl text-xs ${error.toLowerCase().includes('credential') || error.toLowerCase().includes('expired') || error.toLowerCase().includes('reconnect')
              ? 'bg-amber-50 border border-amber-200 text-amber-900'
              : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
              <div className="flex items-start gap-2.5">
                <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${error.toLowerCase().includes('credential') || error.toLowerCase().includes('expired') || error.toLowerCase().includes('reconnect')
                  ? 'text-amber-600'
                  : 'text-red-600'
                  }`} />
                <div className="space-y-1.5 flex-1">
                  <div className="font-bold text-xs">
                    {error.toLowerCase().includes('credential') || error.toLowerCase().includes('expired')
                      ? 'GitHub Session or Token Expired'
                      : 'Connection Notice'}
                  </div>
                  <p className="leading-relaxed">
                    {error.toLowerCase().includes('credential') || error.toLowerCase().includes('expired')
                      ? 'Your GitHub connection token or session has expired. Please reconnect your repository to restore live commit syncing and webhook updates.'
                      : error}
                  </p>
                  {(error.toLowerCase().includes('credential') || error.toLowerCase().includes('expired') || error.toLowerCase().includes('reconnect')) && (
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-[11px] transition cursor-pointer shadow-2xs"
                      >
                        Disconnect &amp; Reconnect Repository
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-stone-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#4A154B]" />
              <span className="text-xs">Loading GitHub connection settings...</span>
            </div>
          ) : connected ? (
            /* Connected State: Clean repository card with Webhook verification details */
            <div className="p-4 bg-[#FDFBF7] border border-[#E8E2D5] rounded-xl space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      Connected to <code className="text-[#4A154B] bg-white border border-stone-200 px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold">{repoFullName}</code>
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Default branch: <span className="font-mono text-stone-700 font-semibold">{defaultBranch}</span> • Webhooks active • Commits automatically logged on push
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSyncCommits}
                    disabled={syncing || saving}
                    className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#4A154B] ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? 'Syncing...' : 'Sync Past Commits'}</span>
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={syncing || saving}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Disconnect
                  </button>
                </div>
              </div>

              {/* Webhook Configuration Summary */}
              <div className="pt-3 border-t border-stone-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-700 font-semibold flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#4A154B]" /> Active Webhook Endpoint Details:
                  </span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-mono font-semibold border border-emerald-300">
                    Content type: application/json
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-stone-500 text-[11px] block mb-1 font-medium">Payload URL:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={webhookUrl}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-800 font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookUrl, 'url')}
                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-[11px] flex items-center gap-1 transition shrink-0 cursor-pointer"
                        title="Copy Payload URL"
                      >
                        {copiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-stone-500 text-[11px] block mb-1 font-medium">Webhook Secret Key:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={webhookSecret || 'Default Configured Secret'}
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-800 font-mono text-[11px]"
                      />
                      {webhookSecret && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(webhookSecret, 'secret')}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-[11px] flex items-center gap-1 transition shrink-0 cursor-pointer"
                          title="Copy Webhook Secret"
                        >
                          {copiedSecret ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Disconnected State: Clean 1-Click Connection Flow */
            <div className="space-y-4">
              {!isAuthenticated ? (
                /* Step 1: Connect GitHub Account */
                <div className="p-6 bg-[#FDFBF7] border border-[#E8E2D5] rounded-xl text-center space-y-4 shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-[#4A154B] mx-auto">
                    <GitBranch className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Connect your GitHub Account</h3>
                    <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                      Authorizing GitHub allows you to select repositories from a simple list with automatic webhook registration.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-stone-200 rounded-xl text-stone-600 text-xs text-left max-w-md mx-auto space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-stone-800">
                      <Lock className="w-3.5 h-3.5 text-[#4A154B]" />
                      <span>Privacy & Granular Control</span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      GitHub lets you choose <strong>only specific repositories</strong> to grant access to. We will never touch your other repositories or private personal account data.
                    </p>
                  </div>

                  <a
                    href={`/api/github/oauth/connect?projectId=${projectId}&projectKey=${projectKey}`}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4A154B] hover:bg-[#3B0F3C] text-white font-semibold text-xs rounded-xl shadow-2xs transition cursor-pointer"
                  >
                    <GitBranch className="w-4 h-4" /> Authorize GitHub Account (1-Click)
                  </a>
                </div>
              ) : (
                /* Step 2: Search & Select Repository */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                      Select Repository
                    </label>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] text-stone-500 font-mono">
                        {userRepos.length} repos available
                      </span>
                      <a
                        href={`/api/github/oauth/connect?projectId=${projectId}&projectKey=${projectKey}&prompt=select_account`}
                        className="text-[11px] text-[#4A154B] hover:underline font-semibold"
                        title="Switch GitHub account or grant access to more repositories"
                      >
                        Grant access / Switch account
                      </a>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search repositories by name or description..."
                      className="w-full pl-9 pr-4 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800 transition"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-stone-200 rounded-xl divide-y divide-stone-100 bg-white">
                    {filteredRepos.length === 0 ? (
                      <div className="p-6 text-center text-xs space-y-2">
                        {userRepos.length === 0 ? (
                          <>
                            <p className="text-stone-700 font-medium">No repositories accessible.</p>
                            <p className="text-stone-500 text-[11px]">
                              You may need to grant repository access permissions in your GitHub App settings.
                            </p>
                            <a
                              href={`/api/github/oauth/connect?projectId=${projectId}&projectKey=${projectKey}&prompt=select_account`}
                              className="inline-flex items-center gap-1 text-[#4A154B] hover:underline font-semibold text-xs mt-1"
                            >
                              Configure GitHub Permissions <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        ) : (
                          <span className="text-stone-400">No repositories match your search.</span>
                        )}
                      </div>
                    ) : (
                      filteredRepos.map((repo) => {
                        const isSelected = selectedRepo?.id === repo.id;

                        return (
                          <div
                            key={repo.id}
                            onClick={() => setSelectedRepo(repo)}
                            className={`p-3 cursor-pointer flex items-center justify-between gap-3 transition ${isSelected
                              ? 'bg-purple-50 text-[#4A154B] border-l-2 border-[#4A154B]'
                              : 'hover:bg-stone-50 text-stone-800'
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-[#4A154B]">
                                {repo.owner?.avatar_url ? (
                                  <img src={repo.owner.avatar_url} alt={repo.owner.login} className="w-full h-full object-cover" />
                                ) : (
                                  repo.name[0].toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs truncate">{repo.full_name}</span>
                                  {repo.private ? (
                                    <span className="px-1.5 py-0.2 bg-amber-50 border border-amber-200 text-amber-800 rounded text-[10px] flex items-center gap-0.5">
                                      <Lock className="w-2.5 h-2.5" /> Private
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 bg-stone-100 text-stone-600 rounded text-[10px] flex items-center gap-0.5 border border-stone-200">
                                      <Globe className="w-2.5 h-2.5" /> Public
                                    </span>
                                  )}
                                </div>
                                {repo.description && (
                                  <p className="text-[11px] text-stone-500 truncate mt-0.5">{repo.description}</p>
                                )}
                              </div>
                            </div>

                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${isSelected ? 'bg-[#4A154B] border-[#4A154B] text-white' : 'border-stone-300 bg-white'
                              }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handle1ClickConnect}
                      disabled={!selectedRepo || saving}
                      className="px-5 py-2.5 bg-[#4A154B] hover:bg-[#3B0F3C] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
                      <span>Link & Enable Webhooks</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
