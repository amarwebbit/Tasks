'use client';

import React, { useState } from 'react';
import { useTrinetra } from '@/lib/store';
import { Shield, KeyRound, User, Mail, ArrowRight, AlertCircle, Database, CheckCircle2, Info } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { isConfigured, signIn, signUp } = useTrinetra();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          setError('Please provide your full name.');
          setIsLoading(false);
          return;
        }
        const res = await signUp(email.trim(), password, fullName.trim());
        if (!res.success) {
          setError(res.error || 'Failed to create account.');
        } else {
          setCreatedAccount(email.trim());
          setIsSignUp(false); // switch to sign in view
        }
      } else {
        const res = await signIn(email.trim(), password);
        if (!res.success) {
          setError(res.error || 'Invalid email or password.');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#FBF9F5]">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#4A154B] text-white flex items-center justify-center font-bold text-xl mx-auto shadow-sm">
            T
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Trinetra Task Platform
          </h1>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Multi-Project accountability, granular assignment permissions, and multi-sheet audit history.
          </p>
        </div>

        {/* Database Configuration Notice if not set yet */}
        {!isConfigured && (
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Database className="w-4 h-4 text-amber-700" />
              <span>Connect Your Supabase Cloud Project</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              Add your real Supabase Cloud credentials in <code>.env.local</code>:
            </p>
            <pre className="p-2.5 bg-white/80 rounded border border-amber-200 text-[11px] font-mono text-stone-800 overflow-x-auto">
              NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co{'\n'}
              NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
            </pre>
            <p className="text-[11px] text-amber-700">
              Also run <code>supabase/migrations/20260826000000_schema.sql</code> in your Supabase Cloud SQL Editor.
            </p>
          </div>
        )}

        {/* Account Created Notification */}
        {createdAccount && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Account Registered for {createdAccount}!</span>
            </div>
            <p className="leading-relaxed">
              If your Supabase project requires email confirmation, confirm your email or disable &quot;Confirm email&quot; in Supabase. Otherwise, enter your password below to Sign In.
            </p>
          </div>
        )}

        {/* Auth Form Card */}
        <div className="bg-white border border-[#E8E2D5] rounded-2xl p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="text-sm font-bold text-stone-900">
              {isSignUp ? 'Create New Account' : 'Sign In to Workspace'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setCreatedAccount(null);
              }}
              className="text-xs font-semibold text-purple-950 hover:underline cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs space-y-1">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
              {error.toLowerCase().includes('email not confirmed') && (
                <div className="pl-6 text-[11px] text-red-700 space-y-1 pt-1">
                  <p>To enable instant login without waiting for emails:</p>
                  <p>1. Open <strong>Supabase Dashboard</strong> → <strong>Authentication</strong> → <strong>Providers</strong> → <strong>Email</strong></p>
                  <p>2. Toggle <strong>OFF</strong> &quot;Confirm email&quot; and click <strong>Save</strong>.</p>
                  <p>3. Or in <strong>Authentication</strong> → <strong>Users</strong>, click <strong>&quot;...&quot;</strong> next to your email and select <strong>&quot;Confirm user&quot;</strong>.</p>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amar Tripathi"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="amar@trinetra.ai"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-purple-800/20 focus:border-purple-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isConfigured}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#4A154B] hover:bg-[#3B0F3C] text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? 'Authenticating...' : isSignUp ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Developer / Setup Tip Box */}
        <div className="p-3.5 bg-stone-100/80 border border-stone-200 rounded-xl text-[11px] text-stone-600 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-stone-800">
            <Info className="w-3.5 h-3.5 text-purple-900 shrink-0" />
            <span>Supabase Email Confirmation Tip</span>
          </div>
          <p>
            By default, Supabase Cloud requires confirming your email before logging in. If you want instant logins without email confirmation:
          </p>
          <ol className="list-decimal pl-4 space-y-0.5 text-stone-700">
            <li>In Supabase Dashboard $\to$ <strong>Authentication</strong> $\to$ <strong>Providers</strong> $\to$ <strong>Email</strong>.</li>
            <li>Turn <strong>OFF</strong> &quot;Confirm email&quot; and click <strong>Save</strong>.</li>
            <li>You can also click <strong>&quot;...&quot;</strong> $\to$ <strong>&quot;Confirm user&quot;</strong> in the Users list.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
