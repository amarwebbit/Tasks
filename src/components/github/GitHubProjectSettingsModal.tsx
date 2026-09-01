'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  GitBranch, 
  Copy, 
  Check, 
  ShieldCheck, 
  RefreshCw, 
  Link2, 
  ExternalLink,
  AlertCircle,
  Lock,
  Globe,
  Trash2,
  Sparkles,
  Search,
  CheckCircle2
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
  const [mode, setMode] = useState<'1click' | 'manual'>('1click');
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

      if (data.authenticated && Array.isArray(data.repos)) {
        setIsAuthenticated(true);
        setUserRepos(data.repos);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Failed to fetch user repos', err);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      fetchUserRepos();
    }
  }, [isOpen, fetchSettings, fetchUserRepos]);

  // 1-Click Connect Action
  const handle1ClickConnect = async () => {
    if (!selectedRepo) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/projects/${projectId}/github/auto-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_full_name: selectedRepo.full_name,
          default_branch: selectedRepo.default_branch,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to auto-connect repository');

      setConnected(true);
      setRepoFullName(data.settings.repo_full_name);
      setWebhookSecret(data.settings.webhook_secret);
      
      if (data.webhook_created) {
        setSuccessMsg(`🚀 Connected ${selectedRepo.full_name}! Webhook registered automatically on GitHub.`);
      } else {
        setSuccessMsg(`Connected ${selectedRepo.full_name}! Webhook configured.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error auto-connecting repository';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Manual Connect Action
  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoFullName.trim()) {
      setError('Please enter repository name e.g. username/repo-name');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/projects/${projectId}/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_full_name: repoFullName,
          default_branch: defaultBranch,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save GitHub settings');

      setConnected(true);
      setWebhookSecret(data.settings.webhook_secret);
      setSuccessMsg('GitHub repository settings saved!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving settings';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect GitHub from this project?')) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/projects/${projectId}/github`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect');

      setConnected(false);
      setRepoFullName('');
      setWebhookSecret('');
      setSelectedRepo(null);
      setSuccessMsg('GitHub integration disconnected.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl text-white shadow-md">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">GitHub Integration</h2>
                <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" /> 1-Click Setup
                </span>
              </div>
              <p className="text-xs text-slate-400">Project: {projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2.5 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-emerald-400 text-sm">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Connected Active Card */}
          {connected && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      Connected to <code className="text-emerald-300 bg-slate-900 px-2 py-0.5 rounded font-mono">{repoFullName}</code>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Webhooks active • Commits automatically logged on push
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setSaving(true);
                        setError(null);
                        const res = await fetch(`/api/projects/${projectId}/github/sync-commits`, { method: 'POST' });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to sync commits');
                        setSuccessMsg(`Imported ${data.synced_count || 0} past commit(s) from GitHub!`);
                      } catch (err: any) {
                        setError(err.message || 'Sync failed');
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                    <span>{saving ? 'Syncing...' : 'Sync Past Commits'}</span>
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={saving}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Disconnect
                  </button>
                </div>
              </div>

              {/* Webhook Configuration Summary & Credentials */}
              <div className="pt-3 border-t border-emerald-500/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-emerald-400" /> Active Webhook Endpoint Details:
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                    Content type: application/json
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Payload URL:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={webhookUrl}
                        className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookUrl, 'url')}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] flex items-center gap-1 transition shrink-0"
                      >
                        {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Webhook Secret Key:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={webhookSecret || 'Default Configured Secret'}
                        className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono text-[11px]"
                      />
                      {webhookSecret && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(webhookSecret, 'secret')}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] flex items-center gap-1 transition shrink-0"
                        >
                          {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setMode('1click')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition ${
                mode === '1click'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> 1-Click Dropdown (Recommended)
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition ${
                mode === 'manual'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" /> Manual Webhook Setup
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Loading GitHub integration settings...</span>
            </div>
          ) : mode === '1click' ? (
            <div className="space-y-4">
              {!isAuthenticated ? (
                /* Step 1: Connect GitHub Account */
                <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
                    <GitBranch className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Connect your GitHub Account</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      Authorizing GitHub allows you to select public & private repositories from a dropdown list with automatic webhook setup.
                    </p>
                  </div>

                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-xs text-left max-w-md mx-auto space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-indigo-200">
                      <Lock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>🔒 100% Privacy & Granular Control</span>
                    </div>
                    <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                      GitHub allows you to select <strong>ONLY specific repositories</strong> to link. Our app will never see or touch your other repositories or private account data.
                    </p>
                  </div>

                  <a
                    href={`/api/github/oauth/connect?projectId=${projectId}&projectKey=${projectKey}`}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition"
                  >
                    <Sparkles className="w-4 h-4" /> Authorize GitHub Account (1-Click)
                  </a>
                </div>
              ) : (
                /* Step 2: Search & Select Repository */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Select Repository (Public & Private)
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {userRepos.length} repos found
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search public and private repositories..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-950">
                    {filteredRepos.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-xs">No repositories match your search.</div>
                    ) : (
                      filteredRepos.map((repo) => {
                        const isSelected = selectedRepo?.id === repo.id;

                        return (
                          <div
                            key={repo.id}
                            onClick={() => setSelectedRepo(repo)}
                            className={`p-3 cursor-pointer flex items-center justify-between gap-3 transition ${
                              isSelected
                                ? 'bg-indigo-600/15 text-white border-l-2 border-indigo-500'
                                : 'hover:bg-slate-900 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-indigo-400">
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
                                    <span className="px-1.5 py-0.2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-[10px] flex items-center gap-0.5">
                                      <Lock className="w-2.5 h-2.5" /> Private
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded text-[10px] flex items-center gap-0.5">
                                      <Globe className="w-2.5 h-2.5" /> Public
                                    </span>
                                  )}
                                </div>
                                {repo.description && (
                                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{repo.description}</p>
                                )}
                              </div>
                            </div>

                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                              isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900'
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
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                    >
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Link & Enable Webhooks (1-Click)
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Manual Webhook Setup Tab */
            <form onSubmit={handleManualSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  GitHub Repository (e.g. org/repo)
                </label>
                <input
                  type="text"
                  value={repoFullName}
                  onChange={(e) => setRepoFullName(e.target.value)}
                  placeholder="organization/repository"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              {webhookSecret && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Payload URL:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={webhookUrl}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookUrl, 'url')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs flex items-center gap-1 transition"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Secret Key:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={webhookSecret}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookSecret, 'secret')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs flex items-center gap-1 transition"
                      >
                        {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition"
                >
                  Save Manual Configuration
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
