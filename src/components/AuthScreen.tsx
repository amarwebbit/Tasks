'use client';

import React, { useState } from 'react';
import { useTrinetra } from '@/lib/store';
import { KeyRound, User, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
            <span>Public Beta v0.9.5</span>
          </div>
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

        {/* Account Created Notification */}
        {createdAccount && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Account Registered for {createdAccount}!</span>
            </div>
            <p className="leading-relaxed">
              Your account has been created. Please sign in below.
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
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
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
      </div>
    </div>
  );
};
