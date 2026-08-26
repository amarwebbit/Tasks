'use client';

import React, { useState } from 'react';
import { useTrinetra } from '@/lib/store';
import {
  X,
  Lock,
  Sparkles,
  Check,
  Tag,
  ShieldCheck,
  Zap,
  Layers,
  Users,
  FileSpreadsheet,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  highlightedFeature?: 'PROJECTS' | 'MEMBERS' | 'REPORTS' | 'GENERAL';
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  title = 'Upgrade to Trinetra Pro',
  subtitle = 'Unlock unlimited projects, unlimited team members, and enterprise audit exports',
  highlightedFeature = 'GENERAL',
}) => {
  const { currentUser, refreshData } = useTrinetra();

  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalPrice: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const basePrice = selectedPlan === 'MONTHLY' ? 99 : 399;
  const currentPrice = appliedCoupon ? appliedCoupon.finalPrice : basePrice;

  // Load Razorpay SDK
  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError(null);
    setIsValidatingCoupon(true);

    try {
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          couponCode: couponCode.trim().toUpperCase(),
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setCouponError(data.error || 'Invalid or expired coupon code');
        setAppliedCoupon(null);
      } else if (data.discountAmount > 0) {
        setAppliedCoupon({
          code: data.couponCode,
          discountAmount: data.discountAmount,
          finalPrice: data.amount,
        });
      } else {
        setCouponError('Coupon code not applicable');
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError('Failed to validate coupon code');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleCheckout = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Create order
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          couponCode: appliedCoupon?.code || couponCode.trim() || undefined,
          userId: currentUser.id,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // If 100% discount / free coupon
      if (orderData.isFree) {
        const verifyRes = await fetch('/api/razorpay/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            plan: selectedPlan,
            amount: 0,
            couponCode: orderData.couponCode,
            discountApplied: orderData.discountAmount,
            isFree: true,
          }),
        });

        if (verifyRes.ok) {
          setIsSuccess(true);
          await refreshData();
          setTimeout(() => {
            setIsSuccess(false);
            onClose();
          }, 1500);
          return;
        }
      }

      // 2. Load Razorpay Script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        // Fallback simulation mode
        const verifyRes = await fetch('/api/razorpay/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            userId: currentUser.id,
            plan: selectedPlan,
            amount: orderData.amount,
            couponCode: orderData.couponCode,
            discountApplied: orderData.discountAmount,
          }),
        });

        if (verifyRes.ok) {
          setIsSuccess(true);
          await refreshData();
          setTimeout(() => {
            setIsSuccess(false);
            onClose();
          }, 1500);
          return;
        }
      }

      // 3. Open Razorpay Modal
      const options = {
        key: orderData.keyId || 'rzp_test_trinetra_demo',
        amount: orderData.amountInPaise,
        currency: 'INR',
        name: 'Trinetra Tasks',
        description: `Upgrade to Pro (${selectedPlan === 'ANNUAL' ? '1 Year' : '1 Month'})`,
        order_id: orderData.orderId.startsWith('order_') ? orderData.orderId : undefined,
        prefill: {
          name: currentUser.full_name,
          email: currentUser.email,
        },
        theme: {
          color: '#4A154B',
        },
        handler: async function (response: any) {
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id || orderData.orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: currentUser.id,
              plan: selectedPlan,
              amount: orderData.amount,
              couponCode: orderData.couponCode,
              discountApplied: orderData.discountAmount,
            }),
          });

          if (verifyRes.ok) {
            setIsSuccess(true);
            await refreshData();
            setTimeout(() => {
              setIsSuccess(false);
              onClose();
            }, 1500);
          } else {
            const errData = await verifyRes.json();
            setErrorMessage(errData.error || 'Payment verification failed');
          }
          setIsProcessing(false);
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment initiation failed');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl bg-stone-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col">
        {/* Subtle glowing ambient gradient behind modal */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          <div className="p-12 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-extrabold text-white">Welcome to Trinetra Pro!</h3>
            <p className="text-sm text-stone-300">
              Your account has been upgraded successfully. All project and team member limits are now unlocked.
            </p>
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Header Lock Pill */}
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Premium Unlocked</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
              <p className="text-xs text-stone-300 max-w-md mx-auto leading-relaxed">{subtitle}</p>
            </div>

            {/* Freemium Limit Notice Box */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-stone-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Free Plan Limit: 1 Project & 2 Team Members</span>
              </div>
              <p className="text-[11px] text-stone-400">
                You are currently on the Free tier. Upgrade to Pro to unlock unlimited projects, unlimited team collaborators, and complete Excel workbook exports.
              </p>
            </div>

            {/* Plan Selector Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Annual Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan('ANNUAL');
                  setAppliedCoupon(null);
                }}
                className={`relative p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlan === 'ANNUAL'
                    ? 'bg-purple-950/60 border-purple-400/80 shadow-lg shadow-purple-900/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-stone-400'
                }`}
              >
                <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-linear-to-r from-amber-500 to-yellow-400 text-stone-950 text-[10px] font-black tracking-wider uppercase shadow-xs">
                  Save 66%
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Annual Plan</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">₹399</span>
                    <span className="text-[10px] text-stone-400">/ year</span>
                  </div>
                </div>
                <span className="text-[10px] text-purple-300 mt-2 font-medium">₹33 / month • Billed Annually</span>
              </button>

              {/* Monthly Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan('MONTHLY');
                  setAppliedCoupon(null);
                }}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlan === 'MONTHLY'
                    ? 'bg-purple-950/60 border-purple-400/80 shadow-lg shadow-purple-900/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-stone-400'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Monthly Plan</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">₹99</span>
                    <span className="text-[10px] text-stone-400">/ month</span>
                  </div>
                </div>
                <span className="text-[10px] text-stone-400 mt-2 font-medium">Billed Monthly • Cancel Anytime</span>
              </button>
            </div>

            {/* Feature Checklist */}
            <div className="grid grid-cols-2 gap-2 text-xs text-stone-300">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Unlimited Projects</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Unlimited Team Members</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Complete 7-Sheet Excel Audits</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Priority Assignment Engine</span>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter Coupon Code (e.g. WELCOME50)"
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-purple-400 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={isValidatingCoupon || !couponCode.trim()}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isValidatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                </button>
              </div>

              {couponError && <p className="text-[11px] text-rose-400">{couponError}</p>}

              {appliedCoupon && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  <span>Coupon &quot;{appliedCoupon.code}&quot; Applied!</span>
                  <span className="font-bold">-₹{appliedCoupon.discountAmount} Discount</span>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-linear-to-r from-purple-600 via-[#4A154B] to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-bold text-sm shadow-xl shadow-purple-950/50 transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Checkout...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Pay ₹{currentPrice} via Razorpay & Unlock Pro</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Trust Footer */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-stone-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-stone-400" />
                Razorpay Secured (256-bit SSL)
              </span>
              <span>•</span>
              <span>Instant Activation</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
