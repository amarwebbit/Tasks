'use client';

import React from 'react';
import Link from 'next/link';
import { useTrinetra } from '@/lib/store';
import { Header } from '@/components/Header';
import { Users, Shield, CheckCircle2, XCircle, ArrowUpRight } from 'lucide-react';

export default function TeamDirectoryPage() {
  const { users, projects, projectMembers, tasks, currentUser } = useTrinetra();

  const sharedMemberUserIds = new Set([
    currentUser?.id,
    ...projectMembers.map(pm => pm.user_id),
    ...projects.map(p => p.team_leader_id),
  ]);
  const visibleUsers = users.filter(u => sharedMemberUserIds.has(u.id));

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Team Directory & Governance"
        subtitle="Multi-project assignment permissions, roles, and accountability matrix"
      />

      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Architecture Notice */}
        <div data-tour="team-header" className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-purple-900 shrink-0 mt-0.5" />
          <div className="text-xs text-purple-950">
            <strong className="block text-sm text-purple-950 mb-0.5">Project-Scoped Permission Architecture</strong>
            Permissions are not rigid or global. A user can be a Team Leader with full assignment authority in Project A, but an ordinary Member with restricted permissions in Project B.
          </div>
        </div>

        {/* Team Members List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {visibleUsers.map(u => {
            const userMemberships = projectMembers.filter(pm => pm.user_id === u.id && pm.status === 'ACTIVE');
            const userTasks = tasks.filter(t => t.assigned_to === u.id);
            const userCompleted = userTasks.filter(t => t.status === 'APPROVED').length;

            return (
              <div
                key={u.id}
                className="bg-white border border-[#E8E2D5] rounded-xl p-5 shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-sm">
                      {u.full_name[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">{u.full_name}</h3>
                      <p className="text-xs text-stone-500 font-mono">{u.email}</p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="font-bold text-stone-900">{userTasks.length}</span>
                    <span className="text-stone-500 block text-[10px]">Tasks ({userCompleted} done)</span>
                  </div>
                </div>

                {/* Project Assignment Matrix for this user */}
                <div className="border-t border-stone-100 pt-3 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Project Permissions & Roles
                  </span>

                  <div className="space-y-1.5">
                    {userMemberships.map(pm => {
                      const proj = projects.find(p => p.id === pm.project_id);
                      if (!proj) return null;

                      return (
                        <div
                          key={pm.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-stone-700 bg-stone-200/70 px-1.5 py-0.2 rounded text-[10px]">
                              {proj.project_key}
                            </span>
                            <span className="font-semibold text-stone-800">{proj.name}</span>
                            <span className="text-[10px] text-stone-500">({pm.role})</span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px]">
                            <div className="flex items-center gap-1">
                              <span className="text-stone-400">Receive:</span>
                              {pm.can_receive_tasks ? (
                                <span className="font-bold text-emerald-800">YES</span>
                              ) : (
                                <span className="font-bold text-stone-400">NO</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-stone-400">Assign:</span>
                              {pm.can_assign_tasks || pm.role === 'LEADER' ? (
                                <span className="font-bold text-purple-900">YES</span>
                              ) : (
                                <span className="font-bold text-stone-400">NO</span>
                              )}
                            </div>

                            <Link
                              href={`/projects/${proj.project_key}`}
                              className="text-stone-400 hover:text-purple-900"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
