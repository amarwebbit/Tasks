'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  ArrowLeft,
  Mail,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'PRICING' | 'PERMISSIONS' | 'EXPORTS' | 'SECURITY';
}

const faqs: FAQItem[] = [
  {
    category: 'PRICING',
    question: 'What are the limits on the Free Plan?',
    answer:
      'The Free Plan allows you to create up to 1 Project and collaborate with up to 2 Team Members (1 Team Leader + 1 Member). You also have access to Single-Sheet Quick Excel exports.',
  },
  {
    category: 'PRICING',
    question: 'What do I get when I upgrade to Trinetra Pro?',
    answer:
      'Trinetra Pro (available at ₹99/month or ₹399/year) unlocks Unlimited Projects, Unlimited Team Members per project, and Comprehensive 8-Sheet Excel Audit Workbooks with immutable change history and code traceability.',
  },
  {
    category: 'PRICING',
    question: 'If the Team Leader upgrades to Pro, do all project members get Pro benefits?',
    answer:
      'Yes! When a project is created by or led by a Pro subscriber, the entire project is upgraded. All team members inside that project can collaborate freely without seeing member limits or paywalls.',
  },
  {
    category: 'PRICING',
    question: 'Will I receive an official Tax Invoice and Payment Receipt?',
    answer:
      'Yes! Upon successful completion of your Razorpay payment, an official Tax Invoice (TRI-INV-...) is generated immediately on screen with a Print / PDF button, and a branded receipt is emailed directly to your registered email address.',
  },
  {
    category: 'PERMISSIONS',
    question: 'Who can invite team members to a project?',
    answer:
      'Only designated Project Team Leaders and Workspace Owners have the authority to invite new members and adjust assignment permissions. Ordinary members cannot add other users to keep projects secure.',
  },
  {
    category: 'PERMISSIONS',
    question: 'How do Task Assignment Governance Rules work?',
    answer:
      'Each project supports 3 governance modes: (1) Team Leader Only: Only the leader assigns tasks; (2) Selected Members: The leader grants "Can Assign Tasks" permission to specific seniors; (3) Everyone in Project: All members can create and assign tasks freely.',
  },
  {
    category: 'EXPORTS',
    question: 'What is included in the 8-Sheet Complete Excel Audit Workbook?',
    answer:
      'The Pro Audit Workbook exports: (1) Executive Summary KPIs, (2) Master Tasks Roster, (3) Granular Activity History, (4) Discussion Comments, (5) Team Members & Workload, (6) Attachments, (7) Email Dispatch Audit Logs, and (8) Code Commits & Diffs.',
  },
  {
    category: 'SECURITY',
    question: 'Is our project data isolated from other organizations?',
    answer:
      'Yes. Trinetra Tasks implements strict row-level multitenancy in Supabase. Users can only see tasks and members belonging to projects they have explicitly joined.',
  },
  {
    category: 'SECURITY',
    question: 'What is the Refund Policy for Pro subscriptions?',
    answer:
      'Because digital Pro privileges and unlimited access are provisioned instantly upon payment, all purchases are covered by our strict No-Refund Policy. You can review full terms on our Refund Policy page.',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredFaqs = faqs.filter(f => selectedCategory === 'ALL' || f.category === selectedCategory);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FBF9F5]">
      <Header
        title="Frequently Asked Questions (FAQ)"
        subtitle="Guides, rules, and common questions about Trinetra Tasks"
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

        {/* Hero Card */}
        <div className="p-6 bg-linear-to-r from-[#4A154B] to-purple-900 rounded-2xl text-white shadow-md flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Help & Knowledge Base
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold">How can we help you?</h1>
            <p className="text-xs text-stone-200 max-w-md">
              Find answers regarding subscription tiers, assignment rules, team governance, and Excel audit logs.
            </p>
          </div>
          <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 items-center justify-center text-amber-300 shrink-0">
            <HelpCircle className="w-8 h-8" />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {[
            { id: 'ALL', label: 'All Questions' },
            { id: 'PRICING', label: 'Plans & Billing' },
            { id: 'PERMISSIONS', label: 'Roles & Governance' },
            { id: 'EXPORTS', label: 'Excel Audits' },
            { id: 'SECURITY', label: 'Security & Policy' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-purple-950 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Accordion FAQ Items */}
        <div className="space-y-3">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white border border-[#E8E2D5] rounded-2xl overflow-hidden shadow-2xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-stone-900">
                    {faq.question}
                  </span>
                  <div className="p-1 rounded-full bg-stone-100 text-stone-500 shrink-0">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-stone-600 border-t border-stone-100 leading-relaxed bg-stone-50/30">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still Have Questions Box */}
        <div className="p-5 bg-white border border-[#E8E2D5] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Still have questions?</h3>
            <p className="text-xs text-stone-500">Our support desk is ready to help your team succeed.</p>
          </div>
          <a
            href="mailto:support@trinetraedu-ai.com"
            className="flex items-center gap-2 px-4 py-2 bg-purple-950 hover:bg-purple-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Support</span>
          </a>
        </div>

        <p className="text-center text-[11px] text-stone-400 pb-8">
          Trinetra Tasks • task.trinetraedu-ai.com
        </p>
      </div>
    </div>
  );
}
