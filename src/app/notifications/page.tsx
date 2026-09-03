'use client';

import React from 'react';
import Link from 'next/link';
import { useTrinetra } from '@/lib/store';
import { Header } from '@/components/Header';
import { Bell, CheckCheck, ArrowRight } from 'lucide-react';

export default function NotificationsPage() {
  const {
    notifications,
    currentUser,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useTrinetra();

  const userNotifications = currentUser
    ? notifications.filter(n => n.user_id === currentUser.id || n.user_id === 'ALL')
    : [];

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Notifications & Alerts"
        subtitle={`Real-time updates and activity notifications for ${currentUser?.full_name || 'User'}`}
      />

      <div className="p-8 max-w-4xl w-full mx-auto space-y-6">
        <div data-tour="notifications-header" className="flex items-center justify-between p-2 rounded-lg">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-900" />
            <h2 className="text-sm font-bold text-stone-900">
              Notification Inbox ({userNotifications.length})
            </h2>
          </div>

          {userNotifications.some(n => !n.is_read) && (
            <button
              onClick={() => markAllNotificationsAsRead()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>

        <div className="bg-white border border-[#E8E2D5] rounded-xl overflow-hidden shadow-2xs divide-y divide-stone-100">
          {userNotifications.length === 0 ? (
            <div className="py-16 text-center text-xs text-stone-400 space-y-1">
              <Bell className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="font-semibold text-stone-600">No Notifications Yet</p>
              <p>You will receive in-app alerts when tasks are assigned, acknowledged, or submitted.</p>
            </div>
          ) : (
            userNotifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => markNotificationAsRead(notif.id)}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  notif.is_read ? 'bg-white' : 'bg-purple-50/40'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-purple-900 shrink-0" />
                    )}
                    <h4 className="text-xs font-bold text-stone-900">{notif.title}</h4>
                    <span className="text-[10px] text-stone-400">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 pl-4">{notif.message}</p>
                </div>

                {notif.link && (
                  <Link
                    href={notif.link}
                    className="flex items-center gap-1 text-xs font-semibold text-purple-900 hover:text-purple-950 px-2.5 py-1 rounded bg-white border border-stone-200 shadow-2xs shrink-0"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
