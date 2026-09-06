'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  LogIn, 
  RefreshCw,
  FolderKanban,
  Check
} from 'lucide-react';
import { useTrinetra } from '@/lib/store';

interface InviteData {
  invitation: {
    id: string;
    email: string;
    role: string;
    can_receive_tasks: boolean;
    can_assign_tasks: boolean;
    status: 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
    expires_at: string;
  };
  project: {
    id: string;
    name: string;
    project_key: string;
    description: string;
  };
  inviter: {
    name: string;
  };
}

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const { currentUser, signIn, signUp, refreshData } = useTrinetra();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auth modal inside invite if logged out
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    const loadInvite = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/invitations/${token}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Invitation link is invalid or has expired.');
        }

        setInviteData(data);
        if (data.invitation?.email) {
          setAuthEmail(data.invitation.email);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load invitation.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  const handleAction = async (action: 'ACCEPT' | 'DECLINE') => {
    if (!token || !inviteData) return;

    if (action === 'ACCEPT' && !currentUser) {
      setError('Please log in or create an account to accept this invitation.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action.toLowerCase()} invitation`);
      }

      if (action === 'ACCEPT') {
        setSuccess(`Invitation accepted! Redirecting to ${inviteData.project.name}...`);
        await refreshData();
        setTimeout(() => {
          if (data.projectKey) {
            router.push(`/projects/${data.projectKey}`);
          } else {
            router.push('/');
          }
        }, 1200);
      } else {
        setSuccess('You have declined this project invitation.');
        setInviteData((prev) => prev ? {
          ...prev,
          invitation: { ...prev.invitation, status: 'DECLINED' }
        } : null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === 'signin') {
        const res = await signIn(authEmail, authPassword);
        if (!res.success) throw new Error(res.error || 'Failed to sign in');
      } else {
        const res = await signUp(authEmail, authPassword, authName || authEmail.split('@')[0]);
        if (!res.success) throw new Error(res.error || 'Failed to create account');
      }
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#4A154B] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-stone-700">Verifying project invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-stone-900">Invitation Not Found</h2>
          <p className="text-xs text-stone-600 leading-relaxed">{error}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition"
            >
              Go to Trinetra Tasks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { invitation, project, inviter } = inviteData!;
  const isAccepted = invitation.status === 'ACCEPTED';
  const isDeclined = invitation.status === 'DECLINED';
  const isExpired = invitation.status === 'EXPIRED';
  const isPending = invitation.status === 'INVITED';

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white border border-[#E8E2D5] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Card Header */}
        <div className="px-8 py-6 bg-linear-to-b from-purple-50/60 to-white border-b border-stone-100 text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 border border-purple-200 text-[#4A154B] flex items-center justify-center mx-auto shadow-2xs">
            <FolderKanban className="w-7 h-7" />
          </div>
          <span className="inline-block px-2.5 py-0.5 bg-purple-100 border border-purple-200 text-[#4A154B] text-[10px] font-bold rounded-full uppercase tracking-wider">
            Project Invitation
          </span>
          <h1 className="text-xl font-extrabold text-stone-900">
            Join &ldquo;{project.name}&rdquo;
          </h1>
          <p className="text-xs text-stone-500">
            Invited by <strong className="text-stone-800">{inviter.name}</strong>
          </p>
        </div>

        {/* Card Body */}
        <div className="p-8 space-y-6">
          
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Project Details Box */}
          <div className="p-4 bg-[#FDFBF7] border border-[#E8E2D5] rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Project Key:</span>
              <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                {project.project_key}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Assigned Role:</span>
              <span className="font-semibold text-purple-950 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {invitation.role}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Task Assignment:</span>
              <span className="text-stone-700 font-medium">
                {invitation.can_receive_tasks ? 'Can receive & complete tasks' : 'View only'}
              </span>
            </div>

            {project.description && (
              <div className="pt-2 border-t border-stone-200/80 text-xs text-stone-600">
                <span className="font-semibold text-stone-800 block mb-0.5">Description:</span>
                <p className="leading-relaxed text-[11px]">{project.description}</p>
              </div>
            )}
          </div>

          {/* Status Specific UI */}
          {isAccepted ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>You have joined this project!</span>
              </div>
              <p className="text-xs text-emerald-800">
                You are an active member of {project.name}.
              </p>
              <Link
                href={`/projects/${project.project_key}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <span>Open Project Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : isDeclined ? (
            <div className="p-4 bg-stone-100 border border-stone-200 rounded-xl text-center space-y-2">
              <span className="text-stone-700 font-semibold text-xs block">
                This invitation was declined.
              </span>
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs text-purple-900 font-bold hover:underline"
              >
                Return to Dashboard
              </Link>
            </div>
          ) : isExpired ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
              <span className="text-amber-900 font-semibold text-xs block flex items-center justify-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-700" /> This invitation has expired.
              </span>
              <p className="text-[11px] text-amber-800">
                Please contact {inviter.name} to send you a new invitation link.
              </p>
            </div>
          ) : currentUser ? (
            /* User is Logged In: Prompt to Accept or Decline */
            <div className="space-y-4">
              <div className="p-3 bg-purple-50/50 border border-purple-200/60 rounded-xl text-xs text-stone-700 flex items-center justify-between">
                <div>
                  <span className="text-stone-500 block text-[11px]">Logged in as:</span>
                  <strong className="text-stone-900 font-semibold">{currentUser.email}</strong>
                </div>
                <ShieldCheck className="w-5 h-5 text-purple-900" />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={() => handleAction('ACCEPT')}
                  disabled={submitting}
                  className="w-full sm:flex-1 py-3 px-4 bg-[#4A154B] hover:bg-[#3B0F3C] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Accept Invitation &amp; Join Project</span>
                </button>
                <button
                  onClick={() => handleAction('DECLINE')}
                  disabled={submitting}
                  className="w-full sm:w-auto py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ) : (
            /* User is NOT Logged In: Provide Inline Auth to Accept */
            <div className="space-y-4 pt-1">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-stone-900">
                  {authMode === 'signup' ? 'Create an account to accept' : 'Sign in to accept'}
                </h3>
                <p className="text-[11px] text-stone-500">
                  Join with <strong className="text-stone-700">{invitation.email}</strong> to access this project.
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-3">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="e.g. Alex Sharma"
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-900/20 focus:border-purple-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-900/20 focus:border-purple-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-900/20 focus:border-purple-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-[#4A154B] hover:bg-[#3B0F3C] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {authLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{authMode === 'signup' ? 'Create Account & Continue' : 'Sign In & Continue'}</span>
                </button>
              </form>

              <div className="text-center pt-1">
                {authMode === 'signup' ? (
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className="text-xs text-[#4A154B] hover:underline font-semibold cursor-pointer"
                  >
                    Already have an account? Sign in
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className="text-xs text-[#4A154B] hover:underline font-semibold cursor-pointer"
                  >
                    Need an account? Sign up
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
