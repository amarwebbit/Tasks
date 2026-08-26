'use client';

import React from 'react';
import { TaskActivity } from '@/types/database';
import {
  PlusCircle,
  UserCheck,
  CheckCircle,
  PlayCircle,
  AlertOctagon,
  CornerUpRight,
  RotateCcw,
  CheckCheck,
  MessageSquare,
  Paperclip,
  Clock,
} from 'lucide-react';

interface ActivityTimelineProps {
  activities: TaskActivity[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  const getActionDetails = (act: TaskActivity) => {
    switch (act.action) {
      case 'TASK_CREATED':
        return {
          icon: PlusCircle,
          color: 'text-purple-900 bg-purple-100',
          text: 'created this task',
        };
      case 'TASK_ASSIGNED':
        return {
          icon: UserCheck,
          color: 'text-indigo-900 bg-indigo-100',
          text: `assigned task to ${act.new_value || 'assignee'}`,
        };
      case 'TASK_ACKNOWLEDGED':
        return {
          icon: CheckCircle,
          color: 'text-amber-900 bg-amber-100',
          text: 'acknowledged this assignment',
        };
      case 'TASK_STARTED':
        return {
          icon: PlayCircle,
          color: 'text-blue-900 bg-blue-100',
          text: 'started working on this task',
        };
      case 'TASK_BLOCKED':
        return {
          icon: AlertOctagon,
          color: 'text-orange-900 bg-orange-100',
          text: `marked task as BLOCKED (${(act.details?.reason as string) || 'No reason specified'})`,
        };
      case 'TASK_UNBLOCKED':
        return {
          icon: PlayCircle,
          color: 'text-blue-900 bg-blue-100',
          text: 'cleared blocker and resumed work',
        };
      case 'TASK_SUBMITTED':
        return {
          icon: CornerUpRight,
          color: 'text-purple-900 bg-purple-100',
          text: 'submitted work for review',
        };
      case 'CHANGES_REQUESTED':
        return {
          icon: RotateCcw,
          color: 'text-rose-900 bg-rose-100',
          text: `requested revisions: "${(act.details?.reason as string) || ''}"`,
        };
      case 'TASK_APPROVED':
        return {
          icon: CheckCheck,
          color: 'text-emerald-900 bg-emerald-100',
          text: 'approved and marked task as completed',
        };
      case 'COMMENT_ADDED':
        return {
          icon: MessageSquare,
          color: 'text-stone-700 bg-stone-100',
          text: 'added a comment',
        };
      case 'ATTACHMENT_UPLOADED':
        return {
          icon: Paperclip,
          color: 'text-stone-700 bg-stone-100',
          text: `uploaded attachment "${act.new_value || 'file'}"`,
        };
      default:
        return {
          icon: Clock,
          color: 'text-stone-700 bg-stone-100',
          text: act.action.toLowerCase().replace(/_/g, ' '),
        };
    }
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-stone-400">
        No recorded activity yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8E2D5]">
      {activities.map((act) => {
        const config = getActionDetails(act);
        const Icon = config.icon;
        const formattedDate = new Date(act.created_at).toLocaleString('en-US', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div key={act.id} className="relative flex items-start gap-3 text-xs">
            <div
              className={`absolute -left-6 p-1 rounded-full border-2 border-white shadow-xs ${config.color}`}
            >
              <Icon className="w-3 h-3" />
            </div>

            <div className="flex-1 bg-white p-3 rounded-lg border border-[#E8E2D5] shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 mb-1">
                <span className="font-semibold text-stone-900">
                  {act.user?.full_name || 'System'}
                </span>
                <span className="text-[11px] text-stone-400" suppressHydrationWarning>{formattedDate}</span>
              </div>
              <p className="text-stone-700">{config.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
