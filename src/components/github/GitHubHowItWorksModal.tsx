'use client';

import React, { useState } from 'react';
import { 
  X, 
  GitBranch, 
  GitCommit, 
  Webhook, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  FileCode, 
  HelpCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface GitHubHowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectKey: string;
  taskNumber: number;
  repoFullName?: string;
  webhookSecret?: string;
}

export default function GitHubHowItWorksModal({
  isOpen,
  onClose,
  projectKey,
  taskNumber,
  repoFullName = 'owner/repository',
  webhookSecret = 'your-webhook-secret',
}: GitHubHowItWorksModalProps) {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual' | 'webhook'>('auto');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const taskTag = `${projectKey}-${taskNumber}`;
  const commitExample = `git commit -m "${taskTag}: implement feature changes"`;
  const branchExample = `git checkout -b ${taskTag.toLowerCase()}-feature`;
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const webhookUrl = `${appOrigin}/api/webhooks/github`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 bg-red-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 border border-red-200 rounded-xl text-red-700">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
                  GitHub Guide
                </span>
                <span className="text-xs text-stone-500 font-mono font-medium">
                  Task: {taskTag}
                </span>
              </div>
              <h3 className="text-base font-bold text-stone-900 mt-0.5">
                How GitHub Code Linkage Works
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-stone-200 bg-stone-50 flex gap-2">
          <button
            onClick={() => setActiveTab('auto')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'auto'
                ? 'border-red-600 text-red-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. Automatic Linking (Recommended)</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'manual'
                ? 'border-red-600 text-red-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Manual Commit Picker</span>
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'webhook'
                ? 'border-red-600 text-red-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>3. Webhook Setup</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto text-xs text-stone-600 leading-relaxed">
          
          {/* TAB 1: AUTOMATIC LINKING */}
          {activeTab === 'auto' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Zero-Click Automatic Tracking</strong>
                  Whenever anyone pushes code containing <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-bold">{taskTag}</code> in the commit message or branch name, it is automatically attached to this task!
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-stone-900 text-sm">Option A: Mention Task Key in Commit Message</h4>
                <p>Add the task tag prefix to your git commit message:</p>
                <div className="flex items-center justify-between p-3 bg-stone-900 text-stone-100 rounded-xl font-mono text-xs">
                  <span className="truncate">{commitExample}</span>
                  <button
                    onClick={() => handleCopy(commitExample, 'commit')}
                    className="ml-2 px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[11px] font-sans flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedKey === 'commit' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'commit' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-stone-900 text-sm">Option B: Use Task Key in Branch Name</h4>
                <p>Create a dedicated branch for this task. Any commits pushed on this branch will automatically link:</p>
                <div className="flex items-center justify-between p-3 bg-stone-900 text-stone-100 rounded-xl font-mono text-xs">
                  <span className="truncate">{branchExample}</span>
                  <button
                    onClick={() => handleCopy(branchExample, 'branch')}
                    className="ml-2 px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[11px] font-sans flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedKey === 'branch' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'branch' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                💡 <strong>Tip:</strong> You can also write <code className="font-mono bg-white px-1 rounded font-bold">Fixes #{taskNumber}</code> or <code className="font-mono bg-white px-1 rounded font-bold">#{taskNumber}</code> and the system will link it!
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL COMMIT PICKER */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-3">
                <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Forgot to add the task ID in your commit?</strong>
                  No problem! You can manually browse recent commits from your connected repository and attach them with one click.
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-stone-900 text-sm">How to Manually Attach Commits:</h4>
                <ol className="space-y-2.5 list-decimal list-inside text-stone-700">
                  <li className="leading-relaxed">
                    Click the <strong className="text-stone-900">"Link Pushed Commits"</strong> button right inside the GitHub Code Changes section.
                  </li>
                  <li className="leading-relaxed">
                    A modal will open displaying the recent commits pushed to <code className="font-mono font-semibold bg-stone-100 px-1 py-0.5 rounded text-stone-900">{repoFullName}</code>.
                  </li>
                  <li className="leading-relaxed">
                    If your commit just pushed, click <strong className="text-stone-900">"Refresh from GitHub"</strong> to pull the latest commits immediately.
                  </li>
                  <li className="leading-relaxed">
                    Select the check-boxes for the commits you want to attach and click <strong className="text-indigo-700">"Attach Code to Task"</strong>.
                  </li>
                  <li className="leading-relaxed">
                    The side-by-side file diffs, lines added (+), and lines deleted (-) will immediately load on this task page!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: WEBHOOK SETUP */}
          {activeTab === 'webhook' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 flex items-start gap-3">
                <Webhook className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Instant Real-Time Sync via GitHub Webhooks</strong>
                  Webhooks notify our app the millisecond you run <code className="font-mono bg-white px-1 rounded font-bold">git push</code>.
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-stone-900 text-sm">3-Step Webhook Configuration:</h4>
                
                <div className="space-y-1">
                  <span className="font-bold text-stone-800">1. Open GitHub Settings</span>
                  <p className="text-stone-500">Go to your GitHub repository: <strong>Settings → Webhooks → Add Webhook</strong>.</p>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-stone-800">2. Set Payload URL</span>
                  <div className="flex items-center justify-between p-2.5 bg-stone-100 border border-stone-200 rounded-lg font-mono text-[11px] text-stone-800">
                    <span className="truncate">{webhookUrl}</span>
                    <button
                      onClick={() => handleCopy(webhookUrl, 'url')}
                      className="ml-2 px-2 py-1 bg-white hover:bg-stone-200 text-stone-700 border border-stone-300 rounded text-[11px] font-sans flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey === 'url' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'url' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-stone-800">3. Select Content Type & Secret</span>
                  <ul className="list-disc list-inside space-y-1 text-stone-600 pl-1">
                    <li>Content type: Select <code className="font-mono font-bold text-stone-800">application/json</code></li>
                    <li>Secret: <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-800">{webhookSecret}</code></li>
                    <li>Which events to trigger: Select <strong className="text-stone-800">Just the push event</strong>.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
          <span className="text-[11px] text-stone-500">
            Connected Repo: <strong className="text-stone-800 font-mono">{repoFullName}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition"
          >
            Got it, thanks!
          </button>
        </div>

      </div>
    </div>
  );
}
