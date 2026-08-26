import React from 'react';
import { TaskStatus } from '@/types/database';

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getBadgeConfig = (st: TaskStatus) => {
    switch (st) {
      case 'DRAFT':
        return {
          label: 'Draft',
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          border: 'border-slate-300',
          dot: 'bg-slate-400',
        };
      case 'ASSIGNED':
        return {
          label: 'Assigned',
          bg: 'bg-indigo-50',
          text: 'text-indigo-800',
          border: 'border-indigo-200',
          dot: 'bg-indigo-600',
        };
      case 'ACKNOWLEDGED':
        return {
          label: 'Acknowledged',
          bg: 'bg-amber-50',
          text: 'text-amber-900',
          border: 'border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'IN_PROGRESS':
        return {
          label: 'In Progress',
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          border: 'border-blue-200',
          dot: 'bg-blue-600',
        };
      case 'BLOCKED':
        return {
          label: 'Blocked',
          bg: 'bg-orange-50',
          text: 'text-orange-900',
          border: 'border-orange-200',
          dot: 'bg-orange-600',
        };
      case 'SUBMITTED':
        return {
          label: 'Submitted for Review',
          bg: 'bg-purple-50',
          text: 'text-purple-800',
          border: 'border-purple-200',
          dot: 'bg-purple-600',
        };
      case 'CHANGES_REQUESTED':
        return {
          label: 'Changes Requested',
          bg: 'bg-rose-50',
          text: 'text-rose-900',
          border: 'border-rose-200',
          dot: 'bg-rose-600',
        };
      case 'APPROVED':
        return {
          label: 'Completed & Approved',
          bg: 'bg-emerald-50',
          text: 'text-emerald-900',
          border: 'border-emerald-200',
          dot: 'bg-emerald-600',
        };
      default:
        return {
          label: st,
          bg: 'bg-stone-100',
          text: 'text-stone-700',
          border: 'border-stone-200',
          dot: 'bg-stone-500',
        };
    }
  };

  const config = getBadgeConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
