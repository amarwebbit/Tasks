'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminUserStats, Coupon } from '@/types/database';
import {
  ShieldAlert,
  Users,
  FolderDot,
  CreditCard,
  Tag,
  Plus,
  Sparkles,
  Search,
  ArrowUpRight,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  KeyRound,
  Loader2,
  Layers,
  Lock,
  Unlock,
  RefreshCw,
} from 'lucide-react';



export default function StealthAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminPasskey, setAdminPasskey] = useState('');

  const [activeTab, setActiveTab] = useState<'users' | 'coupons'>('users');
  const [usersList, setUsersList] = useState<AdminUserStats[]>([]);
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'FREE' | 'PRO'>('ALL');

  // Coupon Creation State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(50);
  const [maxUses, setMaxUses] = useState<number>(100);
  const [expiryDate, setExpiryDate] = useState('');
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  // Check session storage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('trinetra_stealth_admin');
    if (saved) {
      setIsAuthenticated(true);
      setAdminPasskey(saved);
      fetchAdminData(saved);
    }
  }, []);

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    const enteredKey = passkeyInput.trim();
    try {
      const usersRes = await fetch('/api/admin/users', {
        headers: { 'x-admin-key': enteredKey },
      });

      if (usersRes.ok) {
        setIsAuthenticated(true);
        setAdminPasskey(enteredKey);
        sessionStorage.setItem('trinetra_stealth_admin', enteredKey);
        fetchAdminData(enteredKey);
      } else {
        setAuthError('Access Denied: Invalid Security Key');
      }
    } catch (err) {
      setAuthError('Authentication failed. Please check network.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockTerminal = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('trinetra_stealth_admin');
    setPasskeyInput('');
  };

  const fetchAdminData = async (key: string) => {
    setIsLoading(true);
    try {
      const [usersRes, couponsRes] = await Promise.all([
        fetch('/api/admin/users', {
          headers: { 'x-admin-key': key },
        }),
        fetch('/api/admin/coupons', {
          headers: { 'x-admin-key': key },
        }),
      ]);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsersList(uData.users || []);
      }

      if (couponsRes.ok) {
        const cData = await couponsRes.json();
        setCouponsList(cData.coupons || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUserPlan = async (userId: string, targetPlan: 'FREE' | 'PRO') => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminPasskey,
        },
        body: JSON.stringify({
          userId,
          plan: targetPlan,
          durationDays: targetPlan === 'PRO' ? 365 : 0,
        }),
      });

      if (res.ok) {
        await fetchAdminData(adminPasskey);
      } else {
        alert('Failed to update user plan');
      }
    } catch (err) {
      console.error('Error updating plan:', err);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsCreatingCoupon(true);

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminPasskey,
        },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: discountValue,
          max_uses: maxUses,
          expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
        }),
      });

      if (res.ok) {
        setIsCouponModalOpen(false);
        setCouponCode('');
        setDiscountValue(50);
        await fetchAdminData(adminPasskey);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create coupon');
      }
    } catch (err) {
      console.error('Error creating coupon:', err);
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Delete this coupon code permanently?')) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminPasskey },
      });
      if (res.ok) {
        await fetchAdminData(adminPasskey);
      }
    } catch (err) {
      console.error('Error deleting coupon:', err);
    }
  };

  // KPI Calculations
  const totalUsers = usersList.length;
  const proUsers = usersList.filter(u => u.plan === 'PRO').length;
  const freeUsers = usersList.filter(u => u.plan !== 'PRO').length;
  const totalProjectsAcrossApp = usersList.reduce((acc, u) => acc + (u.projects_count || 0), 0);

  // Filtered Users List
  const filteredUsers = usersList.filter(u => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan =
      planFilter === 'ALL' ||
      (planFilter === 'PRO' && u.plan === 'PRO') ||
      (planFilter === 'FREE' && u.plan !== 'PRO');
    return matchesSearch && matchesPlan;
  });

  // 1. ISOLATED PASSKEY CHALLENGE SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden select-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-stone-900/90 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-purple-500/20 to-stone-800 border border-purple-500/30 flex items-center justify-center mx-auto shadow-xl shadow-purple-950/40">
              <Lock className="w-8 h-8 text-purple-300" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Stealth Security Terminal</h1>
            <p className="text-xs text-stone-400">
              Enter the master encryption passkey to unlock the isolated system management console.
            </p>
          </div>

          <form onSubmit={handleAuthenticate} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                Master Security Key
              </label>
              <input
                type="password"
                value={passkeyInput}
                onChange={e => setPasskeyInput(e.target.value)}
                placeholder="Enter security key..."
                autoFocus
                className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder-stone-600 focus:outline-hidden focus:border-purple-400 font-mono tracking-widest"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-linear-to-r from-purple-600 via-[#4A154B] to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4 text-amber-300" />
              <span>Unlock Admin Console</span>
            </button>
          </form>

          <div className="pt-2 border-t border-white/5 text-center">
            <Link
              href="/"
              className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
            >
              ← Back to Main App
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATED SUPER ADMIN COMMAND CENTER
  return (
    <div className="min-h-screen bg-[#0E0C12] text-stone-100 flex flex-col select-none">
      {/* Top Stealth Bar */}
      <header className="px-6 py-4 bg-stone-900/80 border-b border-white/10 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-purple-600 to-amber-500 flex items-center justify-center font-black text-white text-xs shadow-md">
            TR
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-white tracking-wide">Trinetra Stealth Terminal</h1>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono px-2 py-0.5 rounded-full font-bold">
                ROOT ISOLATED
              </span>
            </div>
            <p className="text-[10px] text-stone-400">Master Control • Subscriptions • Users • Coupons</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAdminData(adminPasskey)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleLockTerminal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Terminal</span>
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl w-full mx-auto space-y-6 flex-1">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-stone-900/60 border border-white/10 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Total Users</span>
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-white mt-2">{totalUsers}</div>
            <div className="text-[11px] text-stone-400 mt-1">Platform-wide registered accounts</div>
          </div>

          <div className="bg-stone-900/60 border border-white/10 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Pro Subscribers</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-amber-300 mt-2">{proUsers}</div>
            <div className="text-[11px] text-stone-400 mt-1">{freeUsers} on Free Tier</div>
          </div>

          <div className="bg-stone-900/60 border border-white/10 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Total Projects</span>
              <FolderDot className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-black text-white mt-2">{totalProjectsAcrossApp}</div>
            <div className="text-[11px] text-stone-400 mt-1">Created across all organizations</div>
          </div>

          <div className="bg-stone-900/60 border border-white/10 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Coupons Active</span>
              <Tag className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white mt-2">{couponsList.length}</div>
            <div className="text-[11px] text-stone-400 mt-1">Promotional discount codes</div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                : 'text-stone-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management ({usersList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'coupons'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                : 'text-stone-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Coupon Engine ({couponsList.length})</span>
          </button>
        </div>

        {/* TAB 1: USERS DIRECTORY */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/50 p-4 rounded-2xl border border-white/10">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-purple-400"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-stone-400">Plan:</span>
                {(['ALL', 'FREE', 'PRO'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPlanFilter(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      planFilter === p
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-stone-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-stone-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950/80 border-b border-white/10 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Current Plan</th>
                      <th className="py-3.5 px-4">Projects Created</th>
                      <th className="py-3.5 px-4">Project Names</th>
                      <th className="py-3.5 px-4">Team Size</th>
                      <th className="py-3.5 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-stone-300">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-stone-500">
                          No users found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            {u.full_name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-stone-400">
                            {u.email}
                          </td>
                          <td className="py-3.5 px-4">
                            {u.plan === 'PRO' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>PRO</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-stone-400 text-[10px] font-bold">
                                FREE
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            {u.projects_count || 0}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            {u.project_names && u.project_names.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {u.project_names.map((pName, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-stone-300 font-mono truncate max-w-[140px]"
                                    title={pName}
                                  >
                                    {pName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-stone-500 italic text-[11px]">No projects</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-stone-300 font-medium">
                            {u.team_members_count || 0} members
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {u.plan === 'PRO' ? (
                              <button
                                onClick={() => handleUpdateUserPlan(u.id, 'FREE')}
                                className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                Downgrade to Free
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateUserPlan(u.id, 'PRO')}
                                className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-lg text-[11px] font-black shadow-xs transition-colors cursor-pointer"
                              >
                                Upgrade to Pro (1-Yr)
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COUPON ENGINE */}
        {activeTab === 'coupons' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-stone-900/50 p-4 rounded-2xl border border-white/10">
              <div>
                <h3 className="text-sm font-bold text-white">Promo & Discount Codes</h3>
                <p className="text-xs text-stone-400">Generate discount codes for marketing campaigns and custom VIP access.</p>
              </div>
              <button
                onClick={() => setIsCouponModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-linear-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Coupon</span>
              </button>
            </div>

            {/* Coupons Table */}
            <div className="bg-stone-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950/80 border-b border-white/10 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Coupon Code</th>
                    <th className="py-3.5 px-4">Discount</th>
                    <th className="py-3.5 px-4">Usage Limit</th>
                    <th className="py-3.5 px-4">Times Redeemed</th>
                    <th className="py-3.5 px-4">Expiry Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-stone-300">
                  {couponsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-stone-500">
                        No coupons generated yet. Click &quot;Create New Coupon&quot; to add one.
                      </td>
                    </tr>
                  ) : (
                    couponsList.map(c => (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-black text-amber-300 text-sm tracking-wider">
                          {c.code}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT`}
                        </td>
                        <td className="py-3.5 px-4 text-stone-400 font-mono">
                          {c.max_uses} redemptions
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px]">
                            {c.used_count || 0} / {c.max_uses}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-400 font-mono">
                          {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never (Lifetime)'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteCoupon(c.id)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Coupon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-stone-900 border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-stone-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Create New Coupon Code</h3>
              </div>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Coupon Code (e.g. LAUNCH50)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DIWALI100"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono uppercase tracking-wider focus:outline-hidden focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as 'PERCENTAGE' | 'FLAT')}
                    className="w-full px-3 py-2 bg-stone-800 border border-white/10 rounded-xl text-white focus:outline-hidden"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={e => setDiscountValue(Number(e.target.value))}
                    min={1}
                    max={discountType === 'PERCENTAGE' ? 100 : 10000}
                    required
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Max Redemptions
                  </label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={e => setMaxUses(Number(e.target.value))}
                    min={1}
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-white/10 rounded-xl text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-stone-400 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCoupon}
                  className="px-5 py-2 rounded-xl bg-linear-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white text-xs font-bold shadow-lg transition-all"
                >
                  {isCreatingCoupon ? 'Creating...' : 'Save Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
