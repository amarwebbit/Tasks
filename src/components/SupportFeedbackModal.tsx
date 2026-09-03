'use client';

import React, { useState, useEffect } from 'react';
import { useUi } from '@/lib/ui-context';
import { useTrinetra } from '@/lib/store';
import {
  X,
  Mail,
  Send,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const SupportFeedbackModal: React.FC = () => {
  const { isSupportModalOpen, closeSupportModal, supportSubject } = useUi();
  const { currentUser } = useTrinetra();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(supportSubject);
  const [message, setMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supportEmail = 'support@trinetraedu-ai.com';

  useEffect(() => {
    if (isSupportModalOpen) {
      setName(currentUser?.full_name || '');
      setEmail(currentUser?.email || '');
      setSubject(supportSubject || 'Support & Feedback - Trinetra Tasks');
      setMessage('');
      setSubmitStatus('idle');
      setErrorMessage(null);
      setIsCopied(false);
    }
  }, [isSupportModalOpen, currentUser, supportSubject]);

  if (!isSupportModalOpen) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleOpenGmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(supportEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenOutlook = () => {
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(supportEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(outlookUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenDefaultMail = () => {
    const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoUrl;
  };

  const handleSubmitInApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'User',
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitStatus('success');
      } else {
        setSubmitStatus('error');
        setErrorMessage(data.error || 'Failed to dispatch email. Please use the Gmail or Mail App button below.');
      }
    } catch (err: any) {
      setSubmitStatus('error');
      setErrorMessage('Network error. Please use the direct Gmail or Outlook buttons below.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-purple-950 via-[#4A154B] to-purple-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-amber-300">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Support & Feedback Hub</h3>
              <p className="text-xs text-stone-300 mt-0.5">
                Send feedback, report a bug, or contact our support desk.
              </p>
            </div>
          </div>
          <button
            onClick={closeSupportModal}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Quick Direct Email Redirect Bar */}
          <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E2D5] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Direct Email Address
              </span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-900 hover:text-purple-950 cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Address</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-xs font-semibold text-stone-900 select-all bg-white px-3 py-1.5 rounded-lg border border-stone-200">
              {supportEmail}
            </div>

            {/* Instant Redirect Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenGmail}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span>Open in Gmail</span>
              </button>

              <button
                type="button"
                onClick={handleOpenOutlook}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span>Open Outlook</span>
              </button>

              <button
                type="button"
                onClick={handleOpenDefaultMail}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>Default App</span>
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-stone-200" />
            <span className="shrink mx-3 text-[11px] font-semibold text-stone-400 uppercase">
              Or Send Instantly From App
            </span>
            <div className="grow border-t border-stone-200" />
          </div>

          {/* Success Message */}
          {submitStatus === 'success' ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold">Feedback Sent Successfully!</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Thank you for helping us improve Trinetra Tasks. Our team has received your message at <strong>{supportEmail}</strong> and will follow up if needed.
              </p>
              <button
                onClick={closeSupportModal}
                className="mt-2 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            /* In-App Direct Submission Form */
            <form onSubmit={handleSubmitInApp} className="space-y-3">
              {submitStatus === 'error' && errorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Amar Tripathi"
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-purple-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Your Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-purple-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Bug with Kanban board drag"
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-purple-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Message / Bug Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us what happened, what you need help with, or any suggestions you have..."
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-purple-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeSupportModal}
                  className="px-3.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim() || !email.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#4A154B] hover:bg-[#3B0F3C] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending to Support...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
