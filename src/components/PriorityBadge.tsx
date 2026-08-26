import React from 'react';
import { TaskPriority } from '@/types/database';

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className = '' }) => {
  const getPriorityConfig = (p: TaskPriority) => {
    switch (p) {
      case 'URGENT':
        return {
          label: 'Urgent',
          bg: 'bg-red-50',
          text: 'text-red-900',
          border: 'border-red-200',
        };
      case 'HIGH':
        return {
          label: 'High',
          bg: 'bg-orange-50',
          text: 'text-orange-900',
          border: 'border-orange-200',
        };
      case 'MEDIUM':
        return {
          label: 'Medium',
          bg: 'bg-teal-50',
          text: 'text-teal-900',
          border: 'border-teal-200',
        };
      case 'LOW':
        return {
          label: 'Low',
          bg: 'bg-stone-100',
          text: 'text-stone-700',
          border: 'border-stone-200',
        };
      default:
        return {
          label: p,
          bg: 'bg-stone-50',
          text: 'text-stone-700',
          border: 'border-stone-200',
        };
    }
  };

  const config = getPriorityConfig(priority);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {config.label}
    </span>
  );
};
