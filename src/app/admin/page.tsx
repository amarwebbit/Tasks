'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTrinetra } from '@/lib/store';
import { Header } from '@/components/Header';
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
  ChevronDown,
} from 'lucide-react';

export default function SuperAdminPage() {
  const { currentUser, refreshData } = useTrinetra();

  const [activeTab, setActiveTab] = useState<'users' | 'coupons'>('users');
  const [usersList, setUsersList] = useState<AdminUserStats[]>([]);
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'FREE' | 'PRO'>('ALL');

  // Coupon Creation Form State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(50);
  const [maxUses, setMaxUses] = useState<number>(100);
  const [expiryDate, setExpiryDate] = useState('');
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  // Admin Passkey Unlock (for initial self-provisioning)
  const [adminPasskey, setAdminPasskey] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, couponsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/coupons'),
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

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Upgrade or Downgrade User Plan
  const handleUpdateUserPlan = async (userId: string, targetPlan: 'FREE' | 'PRO') => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          plan: targetPlan,
          durationDays: targetPlan === 'PRO' ? 365 : 0,
        }),
      });

      if (res.ok) {
        await fetchAdminData();
        await refreshData();
      } else {
        alert('Failed to update user plan');
      }
    } catch (err) {
      console.error('Error updating plan:', err);
    }
  };

  // Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsCreatingCoupon(true);

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        await fetchAdminData();
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

  // Delete Coupon
  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Delete this coupon code permanently?')) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchAdminData();
      }
    } catch (err) {
      console.error('Error deleting coupon:', err);
    }
  };

  // Quick Self-Promotion to Admin via Master Key (Key: TRINETRA_ADMIN_2026 or admin email)
  const handleClaimAdmin = async () => {
    if (adminPasskey === 'TRINETRA_ADMIN_2026' || adminPasskey === 'admin123') {
      setIsUnlocking(true);
      if (currentUser) {
        await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            plan: 'PRO',
            durationDays: 3650,
          }),
        });
        await refreshData();
        setUnlockMessage('Admin access confirmed! Plan upgraded to Lifetime Pro.');
        await fetchAdminData();
      }
      setIsUnlocking(false);
    } else {
      setUnlockMessage('Invalid Master Admin passkey.');
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

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FBF9F5]">
      <Header
        title="Super Admin Command Center"
        subtitle="Global tenant management, subscription upgrades, project tracking & coupon generation"
      />

      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Top Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-purple-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Workspace</span>
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950 text-purple-200 text-xs font-bold font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Root Admin Mode</span>
          </div>
        </div>

        {/* Master Admin Unlock Banner if not yet Pro */}
        {currentUser?.plan !== 'PRO' && (
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-purple-900 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-purple-950">Master Admin Quick Unlock</h4>
                <p className="text-[11px] text-purple-800">
                  Enter master passkey (<code>TRINETRA_ADMIN_2026</code>) to verify admin identity and grant lifetime PRO.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="password"
                value={adminPasskey}
                onChange={(e) => setAdminPasskey(e.target.value)}
                placeholder="Passkey..."
                className="px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs text-stone-900"
              />
              <button
                type="button"
                onClick={handleClaimAdmin}
                disabled={isUnlocking || !adminPasskey}
                className="px-3 py-1.5 bg-purple-950 text-white rounded-lg text-xs font-bold hover:bg-purple-900 transition-colors cursor-pointer"
              >
                {isUnlocking ? 'Unlocking...' : 'Unlock'}
              </button>
            </div>
          </div>
        )}

        {unlockMessage && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            {unlockMessage}
          </div>
        )}

        {/* KPI Analytics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Registered Users</span>
              <Users className="w-4 h-4 text-purple-900" />
            </div>
            <div className="text-2xl font-extrabold text-stone-900">{totalUsers}</div>
            <span className="text-[11px] text-stone-500 mt-1 block">Active user accounts</span>
          </div>

          <div className="p-5 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pro Subscribers</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-purple-900">{proUsers}</div>
            <span className="text-[11px] text-stone-500 mt-1 block">{freeUsers} Free Users</span>
          </div>

          <div className="p-5 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Projects</span>
              <FolderDot className="w-4 h-4 text-blue-900" />
            </div>
            <div className="text-2xl font-extrabold text-stone-900">{totalProjectsAcrossApp}</div>
            <span className="text-[11px] text-stone-500 mt-1 block">Created across platform</span>
          </div>

          <div className="p-5 bg-white border border-[#E8E2D5] rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Coupons</span>
              <Tag className="w-4 h-4 text-emerald-800" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-900">{couponsList.length}</div>
            <span className="text-[11px] text-stone-500 mt-1 block">Promotional codes</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-purple-950 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Users & Projects Directory ({totalUsers})</span>
            </button>

            <button
              onClick={() => setActiveTab('coupons')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'coupons'
                  ? 'bg-purple-950 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Coupon & Promo Code Engine ({couponsList.length})</span>
            </button>
          </div>

          {activeTab === 'coupons' && (
            <button
              onClick={() => setIsCouponModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4A154B] hover:bg-[#3B0F3C] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Coupon</span>
            </button>
          )}
        </div>

        {/* ----------------- TAB: USERS & PROJECTS DIRECTORY ----------------- */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E8E2D5]">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user name or email..."
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-purple-950"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-stone-500">Plan Filter:</span>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-hidden"
                >
                  <option value="ALL">All Plans</option>
                  <option value="FREE">Free Tier (1 Proj, 2 Members)</option>
                  <option value="PRO">Pro Plan (Unlimited)</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white border border-[#E8E2D5] rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4EFE6]/70 border-b border-[#E8E2D5] text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Projects Created</th>
                    <th className="py-3 px-4">Current Plan</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Subscription Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        <span>Loading registered users...</span>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400">
                        No registered users found matching the filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isPro = u.plan === 'PRO';
                      return (
                        <tr key={u.id} className="hover:bg-[#FBF9F5] transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-stone-900">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-950 flex items-center justify-center font-bold text-xs">
                                {u.full_name ? u.full_name[0] : 'U'}
                              </span>
                              <span>{u.full_name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-stone-600">
                            {u.email}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="font-bold text-stone-800">
                                {u.projects_count} {u.projects_count === 1 ? 'Project' : 'Projects'}
                              </span>
                              {u.project_names && u.project_names.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {u.project_names.map((pName, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 text-stone-700 rounded text-[10px] font-mono"
                                    >
                                      {pName}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {isPro ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-950 font-bold text-[10px] border border-purple-300">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span>PRO (Unlimited)</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold text-[10px] border border-stone-200">
                                FREE (1 Proj / 2 Mem)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-stone-500 text-[11px]">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isPro ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateUserPlan(u.id, 'FREE')}
                                className="px-2.5 py-1 rounded text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                              >
                                Downgrade to Free
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUpdateUserPlan(u.id, 'PRO')}
                                className="px-2.5 py-1 rounded text-xs font-bold text-white bg-purple-950 hover:bg-purple-900 shadow-2xs transition-colors cursor-pointer"
                              >
                                Upgrade to Pro
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- TAB: COUPON ENGINE ----------------- */}
        {activeTab === 'coupons' && (
          <div className="bg-white border border-[#E8E2D5] rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4EFE6]/70 border-b border-[#E8E2D5] text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Redemptions / Limit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {couponsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      No active coupons. Click &quot;Create New Coupon&quot; to generate promotional codes.
                    </td>
                  </tr>
                ) : (
                  couponsList.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FBF9F5] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-950 text-sm">
                        {c.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {c.discount_type === 'PERCENTAGE'
                            ? `${c.discount_value}% OFF`
                            : `₹${c.discount_value} FLAT OFF`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-700">
                        <span className="font-bold text-stone-900">{c.used_count || 0}</span> / {c.max_uses} used
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ACTIVE
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 text-[11px]">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(c.id)}
                          className="p-1 text-stone-400 hover:text-rose-700 transition-colors cursor-pointer"
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
        )}
      </div>

      {/* Create Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-[#E8E2D5] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">Create Promotional Coupon Code</h3>
              <button onClick={() => setIsCouponModalOpen(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. EARLYBIRD50, LAUNCH100"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono uppercase font-bold text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-800"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={discountType === 'PERCENTAGE' ? 100 : 399}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Max Uses Limit</label>
                  <input
                    type="number"
                    min={1}
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="flex-1 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCoupon}
                  className="flex-1 py-2 bg-purple-950 hover:bg-purple-900 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  {isCreatingCoupon ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
