'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ShieldAlert, ArrowLeft, CheckCircle2, AlertTriangle, Mail } from 'lucide-react';
import { useUi } from '@/lib/ui-context';

export default function RefundPolicyPage() {
  const { openSupportModal } = useUi();
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FBF9F5]">
      <Header
        title="Cancellation & No-Refund Policy"
        subtitle="Terms and policies governing digital subscription purchases on Trinetra Tasks"
      />

      <div className="p-6 sm:p-8 max-w-4xl w-full mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-950 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Workspace</span>
        </Link>

        {/* Highlight Callout */}
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-800" />
          </div>
          <div className="space-y-1 text-xs text-amber-950">
            <h3 className="text-sm font-bold text-amber-900">Strict No-Refund Policy for Digital Subscriptions</h3>
            <p className="leading-relaxed">
              All subscription purchases for <strong>Trinetra Pro</strong> (₹99 / month or ₹399 / year) are final, non-refundable, and non-transferable once digital access is granted.
            </p>
          </div>
        </div>

        {/* Policy Document Content */}
        <div className="bg-white border border-[#E8E2D5] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 text-stone-800 text-xs sm:text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-2">
              1. Digital Service Nature & Instant Delivery
            </h2>
            <p className="text-stone-600">
              Trinetra Tasks provides digital task accountability and multi-tenant team management software. Upon successful completion of payment via Razorpay or promotional coupon redemption, Pro features are provisioned and activated <strong>instantaneously</strong> for your account. Because full digital access is unlocked immediately, we maintain a strict <strong>No Refund Policy</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-2">
              2. Subscription Plans & Pricing
            </h2>
            <p className="text-stone-600">
              Our current pricing tiers are:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
              <li><strong>Free Plan:</strong> ₹0.00 — 1 Project, up to 2 Team Members, and standard reporting.</li>
              <li><strong>Pro Monthly:</strong> ₹99 / Month — Unlimited Projects, Unlimited Members, and 8-Sheet Excel Workbooks.</li>
              <li><strong>Pro Annual:</strong> ₹399 / Year — Full Pro capabilities for a 365-day period (66% Savings).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-2">
              3. No Refunds Policy
            </h2>
            <p className="text-stone-600">
              Payments are non-refundable under any circumstances, including but not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
              <li>Change of mind or non-usage of the software after upgrading.</li>
              <li>Dissolution or completion of your team project prior to subscription expiration.</li>
              <li>Accidental renewal or early upgrade.</li>
              <li>Account suspension or termination due to violation of platform terms or abusive conduct.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-2">
              4. Subscription Expiry & Downgrades
            </h2>
            <p className="text-stone-600">
              When your active subscription period concludes (30 days for monthly or 365 days for annual), your account will naturally transition back to the Free tier unless renewed. You will never be billed unexpected hidden fees.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-2">
              5. Customer Support & Billing Inquiries
            </h2>
            <p className="text-stone-600">
              If you believe a duplicate payment was charged due to a gateway error, or if you did not receive your activation within 15 minutes, please contact our billing desk with your Razorpay Payment ID:
            </p>
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 flex items-center gap-3">
              <Mail className="w-5 h-5 text-purple-900 shrink-0" />
              <div>
                <span className="font-bold text-stone-900 block text-xs">Trinetra Billing & Support</span>
                <button
                  type="button"
                  onClick={() => openSupportModal('Billing & Refund Inquiry - Trinetra Tasks')}
                  className="text-purple-900 font-mono text-xs hover:underline cursor-pointer text-left font-semibold"
                >
                  support@trinetraedu-ai.com
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-stone-500 pb-8">
          Last Updated: August 2026 • Trinetra Shiksha (task.trinetraedu-ai.com)
        </p>
      </div>
    </div>
  );
}
