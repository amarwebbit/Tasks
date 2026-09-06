'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  Organization,
  Project,
  ProjectMember,
  Task,
  TaskComment,
  TaskAttachment,
  TaskActivity,
  NotificationItem,
  Invitation,
  TaskPriority,
  AssignmentRule,
  ProjectRole,
} from '@/types/database';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { toFriendlyError } from './friendlyError';

interface TrinetraContextType {
  isConfigured: boolean;
  isLoading: boolean;
  currentUser: UserProfile | null;
  organization: Organization | null;
  projects: Project[];
  projectMembers: ProjectMember[];
  tasks: Task[];
  taskActivity: TaskActivity[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  notifications: NotificationItem[];
  invitations: Invitation[];
  users: UserProfile[];
  isPro: boolean;
  plan: 'FREE' | 'PRO';

  // Auth methods
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;

  // Data Refresh
  refreshData: () => Promise<void>;

  // Permissions & Checks
  canAssignInProject: (userId: string, projectId: string) => boolean;
  canReceiveInProject: (userId: string, projectId: string) => boolean;
  canManageProject: (userId: string, projectId: string) => boolean;
  getProjectMembers: (projectId: string) => ProjectMember[];
  getPermittedAssignees: (projectId: string) => ProjectMember[];

  // Project Management
  createOrganization: (name: string) => Promise<{ success: boolean; organization?: Organization; error?: string }>;
  createProject: (params: {
    name: string;
    project_key: string;
    description: string;
    team_leader_id: string;
    assignment_rule: AssignmentRule;
    start_date?: string;
    target_date?: string;
  }) => Promise<{ success: boolean; project?: Project; error?: string }>;

  updateProjectAssignmentRule: (projectId: string, rule: AssignmentRule) => Promise<void>;
  updateMemberPermissions: (
    memberId: string,
    permissions: { can_assign_tasks?: boolean; can_receive_tasks?: boolean; role?: ProjectRole }
  ) => Promise<void>;
  deleteProject: (projectId: string) => Promise<{ success: boolean; error?: string }>;
  removeProjectMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;

  // Invitations
  inviteMember: (params: {
    projectId: string;
    email: string;
    role: ProjectRole;
    can_receive_tasks: boolean;
    can_assign_tasks: boolean;
  }) => Promise<{ success: boolean; error?: string }>;

  acceptInvitation: (token: string) => Promise<{ success: boolean; projectKey?: string; error?: string }>;
  declineInvitation: (token: string) => Promise<{ success: boolean; error?: string }>;
  cancelInvitation: (invitationId: string) => Promise<{ success: boolean; error?: string }>;

  // Task Engine & Status Lifecycle
  createTask: (params: {
    projectId: string;
    title: string;
    description?: string;
    definition_of_done?: string;
    assigned_to?: string;
    priority: TaskPriority;
    due_date?: string;
  }) => Promise<{ success: boolean; task?: Task; error?: string }>;

  createTasksBulk: (
    projectId: string,
    tasksData: Array<{
      title: string;
      description?: string;
      definition_of_done?: string;
      assigned_to?: string;
      priority: TaskPriority;
      due_date?: string;
    }>
  ) => Promise<{ success: boolean; count?: number; error?: string }>;

  deleteTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;

  acknowledgeTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
  startTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
  blockTask: (taskId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  unblockTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
  submitTask: (taskId: string, note?: string) => Promise<{ success: boolean; error?: string }>;
  requestChanges: (taskId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  approveTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;

  // Task Details
  addComment: (taskId: string, content: string, type?: TaskComment['type']) => Promise<void>;
  addAttachment: (taskId: string, fileName: string, fileUrl: string, fileSize?: number) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

const TrinetraContext = createContext<TrinetraContextType | undefined>(undefined);

// Helper for server-side email dispatching without leaking API keys to client bundle
const dispatchEmailNotification = async (payload: {
  type: string;
  to: string;
  data: Record<string, unknown>;
  taskId?: string;
  projectId?: string;
}) => {
  try {
    const supabase = getSupabaseClient();
    let token = '';
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        token = session.access_token;
      }
    }

    await fetch('/api/notifications/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Failed to trigger email notification:', err);
  }
};

export function TrinetraProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const supabase = getSupabaseClient();

  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskActivity, setTaskActivity] = useState<TaskActivity[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // 1. Fetch All Live Database Records for Current Session
  const refreshData = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      // Get logged in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      // Fetch or sync profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const activeProfile: UserProfile = profile || {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        created_at: user.created_at || new Date().toISOString(),
      };
      setCurrentUser(activeProfile);

      // Fetch All Profiles (for enriching accessible tasks, projects, and activities)
      const { data: allProfiles } = await supabase.from('profiles').select('*');

      // Pending invitations are kept in INVITED state until explicitly accepted by user via link or invite modal

      // 1. Fetch User's Accessible Organizations
      const { data: myOrgMembers } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE');

      const myOrgIds = myOrgMembers ? myOrgMembers.map(o => o.organization_id) : [];

      const { data: orgs } = await supabase
        .from('organizations')
        .select('*');

      const userOrgs = orgs ? orgs.filter(o => o.created_by === user.id || myOrgIds.includes(o.id)) : [];
      const currentOrg = userOrgs.length > 0 ? userOrgs[0] : null;
      setOrganization(currentOrg);

      // 2. Fetch User's Active Project Memberships
      const { data: myProjectMemberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE');

      const myProjectIds = myProjectMemberships ? myProjectMemberships.map(pm => pm.project_id) : [];

      // 3. Fetch Projects and filter strictly to projects the user belongs to
      const { data: allProjs } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      const accessibleProjects = allProjs ? allProjs.filter(p => {
        // User is direct primary leader
        if (p.team_leader_id === user.id) return true;
        // User is active member of this project
        if (myProjectIds.includes(p.id)) return true;
        // User created the organization containing this project
        if (currentOrg && p.organization_id === currentOrg.id && currentOrg.created_by === user.id) return true;
        return false;
      }) : [];

      const enrichedProjects: Project[] = accessibleProjects.map(p => ({
        ...p,
        team_leader: allProfiles?.find(u => u.id === p.team_leader_id),
      }));
      setProjects(enrichedProjects);

      const accessibleProjectIds = accessibleProjects.map(p => p.id);

      // 4. Fetch Project Members ONLY for accessible projects
      let accessibleMemberUserIds: string[] = [];
      if (accessibleProjectIds.length > 0) {
        const { data: pMembers } = await supabase
          .from('project_members')
          .select('*')
          .in('project_id', accessibleProjectIds);

        if (pMembers) {
          accessibleMemberUserIds = pMembers.map(pm => pm.user_id);
          const enrichedMembers: ProjectMember[] = pMembers.map(pm => ({
            ...pm,
            profile: allProfiles?.find(u => u.id === pm.user_id),
          }));
          setProjectMembers(enrichedMembers);
        } else {
          setProjectMembers([]);
        }
      } else {
        setProjectMembers([]);
      }

      // 5. Fetch Tasks ONLY for accessible projects
      let accessibleTaskUserIds: string[] = [];
      if (accessibleProjectIds.length > 0) {
        const { data: taskList } = await supabase
          .from('tasks')
          .select('*')
          .in('project_id', accessibleProjectIds)
          .order('created_at', { ascending: false });

        if (taskList) {
          accessibleTaskUserIds = taskList.flatMap(t => [t.assigned_to, t.created_by].filter(Boolean) as string[]);
          const enrichedTasks: Task[] = taskList.map(t => ({
            ...t,
            creator: allProfiles?.find(u => u.id === t.created_by),
            assignee: allProfiles?.find(u => u.id === t.assigned_to),
            project: accessibleProjects.find(p => p.id === t.project_id),
          }));
          setTasks(enrichedTasks);

          const taskIds = taskList.map(t => t.id);
          if (taskIds.length > 0) {
            // Fetch Activity History
            const { data: actList } = await supabase
              .from('task_activity')
              .select('*')
              .in('task_id', taskIds)
              .order('created_at', { ascending: false });
            if (actList) {
              setTaskActivity(actList.map(a => ({
                ...a,
                user: allProfiles?.find(u => u.id === a.user_id),
              })));
            } else {
              setTaskActivity([]);
            }

            // Fetch Comments
            const { data: commList } = await supabase
              .from('task_comments')
              .select('*')
              .in('task_id', taskIds)
              .order('created_at', { ascending: true });
            if (commList) {
              setComments(commList.map(c => ({
                ...c,
                user: allProfiles?.find(u => u.id === c.user_id),
              })));
            } else {
              setComments([]);
            }

            // Fetch Attachments
            const { data: attList } = await supabase
              .from('task_attachments')
              .select('*')
              .in('task_id', taskIds)
              .order('uploaded_at', { ascending: false });
            if (attList) {
              setAttachments(attList.map(att => ({
                ...att,
                user: allProfiles?.find(u => u.id === att.user_id),
              })));
            } else {
              setAttachments([]);
            }
          } else {
            setTaskActivity([]);
            setComments([]);
            setAttachments([]);
          }
        } else {
          setTasks([]);
          setTaskActivity([]);
          setComments([]);
          setAttachments([]);
        }
      } else {
        setTasks([]);
        setTaskActivity([]);
        setComments([]);
        setAttachments([]);
      }

      // 6. Fetch Notifications for current user
      const { data: notifList } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (notifList) setNotifications(notifList);

      // 7. Fetch Invitations for accessible projects + pending invitations for current user email
      const combinedInvList: any[] = [];
      if (accessibleProjectIds.length > 0) {
        const { data: invList } = await supabase
          .from('invitations')
          .select('*')
          .in('project_id', accessibleProjectIds)
          .order('created_at', { ascending: false });
        if (invList) combinedInvList.push(...invList);
      }

      if (user.email) {
        const { data: myPendingInvs } = await supabase
          .from('invitations')
          .select('*')
          .ilike('email', user.email)
          .eq('status', 'INVITED');
        if (myPendingInvs) {
          for (const mi of myPendingInvs) {
            if (!combinedInvList.some(ci => ci.id === mi.id)) {
              combinedInvList.push(mi);
            }
          }
        }
      }

      setInvitations(combinedInvList.map(inv => ({
        ...inv,
        project: allProjs?.find(p => p.id === inv.project_id) || accessibleProjects.find(p => p.id === inv.project_id),
      })));

      // 8. Filter visible users strictly to current user + members sharing at least 1 accessible project
      const sharedUserIds = new Set<string>([
        user.id,
        ...accessibleProjects.map(p => p.team_leader_id),
        ...accessibleMemberUserIds,
        ...accessibleTaskUserIds,
      ]);

      const visibleUsers = allProfiles ? allProfiles.filter(p => sharedUserIds.has(p.id)) : [activeProfile];
      setUsers(visibleUsers);
    } catch (err) {
      console.error('Error fetching live Supabase data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Auth state listener
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    refreshData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        refreshData();
      } else {
        setCurrentUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, refreshData]);

  // 2. Auth Actions
  const signIn = async (email: string, password: string) => {
    if (!supabase) return { success: false, error: 'Supabase is not configured yet. Please add your credentials in .env.local.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: toFriendlyError(error) };
    await refreshData();
    return { success: true };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!supabase) return { success: false, error: 'Supabase is not configured yet. Please add your credentials in .env.local.' };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) return { success: false, error: toFriendlyError(error) };
    if (data.session) {
      await refreshData();
    }
    return { success: true };
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setCurrentUser(null);
    }
  };

  // 3. Permission checks - Bulletproof Leader & Assignee validation
  const canAssignInProject = (userId: string, projectId: string): boolean => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return false;

    // 1. Primary Team Leader
    if (project.team_leader_id === userId) return true;

    // 2. Organization Owner / Creator
    if (organization?.created_by === userId) return true;

    // 3. Project Member check
    const pm = projectMembers.find(m => m.project_id === projectId && m.user_id === userId && m.status === 'ACTIVE');
    
    // If user has role 'LEADER' (support for multiple team leaders) -> ALWAYS allowed
    if ((pm?.role as string) === 'LEADER') return true;

    // Project policy rules
    if (project.assignment_rule === 'EVERYONE') return true;
    if (project.assignment_rule === 'SELECTED_MEMBERS' && (pm?.can_assign_tasks || (pm?.role as string) === 'LEADER')) return true;

    return false;
  };

  const canReceiveInProject = (userId: string, projectId: string): boolean => {
    const project = projects.find(p => p.id === projectId);
    if (project?.team_leader_id === userId) return true;

    const pm = projectMembers.find(m => m.project_id === projectId && m.user_id === userId && m.status === 'ACTIVE');
    if (!pm) return false;
    if (pm.role === 'LEADER') return true;
    return pm.can_receive_tasks;
  };

  const canManageProject = (userId: string, projectId: string): boolean => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return false;
    if (project.team_leader_id === userId) return true;
    if (organization?.created_by === userId) return true;
    const pm = projectMembers.find(m => m.project_id === projectId && m.user_id === userId);
    return pm?.role === 'LEADER';
  };

  // Comprehensive Project Members getter: Combines project_members table + primary team leader
  const getProjectMembers = (projectId: string): ProjectMember[] => {
    const project = projects.find(p => p.id === projectId);
    const activeMembers = projectMembers.filter(pm => pm.project_id === projectId && pm.status === 'ACTIVE');

    // If primary team leader is missing from projectMembers table, synthesize it
    if (project && project.team_leader_id && !activeMembers.some(m => m.user_id === project.team_leader_id)) {
      const leaderProfile = users.find(u => u.id === project.team_leader_id) || (currentUser?.id === project.team_leader_id ? currentUser : undefined);
      activeMembers.unshift({
        id: `leader-${project.id}-${project.team_leader_id}`,
        project_id: projectId,
        user_id: project.team_leader_id,
        role: 'LEADER',
        can_receive_tasks: true,
        can_assign_tasks: true,
        status: 'ACTIVE',
        joined_at: project.created_at,
        profile: leaderProfile,
      });
    }

    return activeMembers;
  };

  const getPermittedAssignees = (projectId: string): ProjectMember[] => {
    return getProjectMembers(projectId).filter(pm => pm.can_receive_tasks || pm.role === 'LEADER');
  };

  // 4. Create Organization
  const createOrganization = async (name: string) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const orgId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `org_${Date.now()}`;
    
    // Insert with generated ID so that RLS does not fail on select before member record is created
    const { error } = await supabase.from('organizations').insert({
      id: orgId,
      name,
      slug,
      created_by: currentUser.id,
    });

    if (error) {
      console.error('Error creating organization:', error);
      return { success: false, error: toFriendlyError(error) };
    }

    const { error: memberError } = await supabase.from('organization_members').insert({
      organization_id: orgId,
      user_id: currentUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    });

    if (memberError) {
      console.error('Error creating organization member:', memberError);
    }

    const createdOrg = { id: orgId, name, slug, created_by: currentUser.id } as Organization;
    await refreshData();
    return { success: true, organization: createdOrg };
  };

  // 5. Create Project
  const createProject = async ({
    name,
    project_key,
    description,
    team_leader_id,
    assignment_rule,
    start_date,
    target_date,
  }: {
    name: string;
    project_key: string;
    description: string;
    team_leader_id: string;
    assignment_rule: AssignmentRule;
    start_date?: string;
    target_date?: string;
  }) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };

    // Enforce 1-project limit for free tier
    const isProUser = currentUser?.plan === 'PRO';
    if (!isProUser && projects.length >= 1) {
      return {
        success: false,
        error: 'Free Plan Limit: Free tier allows a maximum of 1 project. Please upgrade to Trinetra Pro (₹99/mo or ₹399/yr) to create unlimited projects.',
      };
    }

    let orgId = organization?.id;
    if (!orgId) {
      const orgRes = await createOrganization('Trinetra Workspace');
      if (!orgRes.success || !orgRes.organization) {
        return { success: false, error: toFriendlyError(orgRes.error, 'Could not set up workspace. Please try again.') };
      }
      orgId = orgRes.organization.id;
    }

    const formattedKey = project_key.toUpperCase().trim();
    const { data: newProj, error } = await supabase.from('projects').insert({
      organization_id: orgId,
      name,
      project_key: formattedKey,
      description,
      team_leader_id,
      assignment_rule,
      status: 'ACTIVE',
      start_date: start_date || new Date().toISOString().split('T')[0],
      target_date: target_date || null,
    }).select().single();

    if (error) {
      console.error('Error creating project:', error);
      return { success: false, error: toFriendlyError(error) };
    }

    // Insert Team Leader into project_members
    await supabase.from('project_members').upsert({
      project_id: newProj.id,
      user_id: team_leader_id,
      role: 'LEADER',
      can_receive_tasks: true,
      can_assign_tasks: true,
      status: 'ACTIVE',
    }, { onConflict: 'project_id,user_id' });

    // Also insert Creator into project_members if different from team leader
    if (currentUser.id !== team_leader_id) {
      await supabase.from('project_members').upsert({
        project_id: newProj.id,
        user_id: currentUser.id,
        role: 'LEADER',
        can_receive_tasks: true,
        can_assign_tasks: true,
        status: 'ACTIVE',
      }, { onConflict: 'project_id,user_id' });
    }

    await refreshData();
    return { success: true, project: newProj };
  };

  // 6. Update Project Assignment Rule
  const updateProjectAssignmentRule = async (projectId: string, rule: AssignmentRule) => {
    if (!supabase) return;
    await supabase.from('projects').update({ assignment_rule: rule }).eq('id', projectId);
    await refreshData();
  };

  // 7. Update Member Assignment Permissions
  const updateMemberPermissions = async (
    memberId: string,
    permissions: { can_assign_tasks?: boolean; can_receive_tasks?: boolean; role?: ProjectRole }
  ) => {
    if (!supabase) return;
    await supabase.from('project_members').update(permissions).eq('id', memberId);
    await refreshData();
  };

  // Delete Project (Team Leader or Org Owner only)
  const deleteProject = async (projectId: string) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };
    const project = projects.find(p => p.id === projectId);
    if (!project) return { success: false, error: 'Project not found' };

    const isLeader = project.team_leader_id === currentUser.id;
    const isOwner = organization?.created_by === currentUser.id;
    if (!isLeader && !isOwner) {
      return { success: false, error: 'Permission denied: Only the Team Leader or Organization Owner can delete this project.' };
    }

    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) {
      console.error('Error deleting project:', error);
      return { success: false, error: toFriendlyError(error) };
    }

    await refreshData();
    return { success: true };
  };

  // Remove Project Member (Team Leader or Org Owner only; Cannot remove primary leader)
  const removeProjectMember = async (memberId: string) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };
    const member = projectMembers.find(m => m.id === memberId);
    if (!member) return { success: false, error: 'Member not found' };

    const project = projects.find(p => p.id === member.project_id);
    if (!project) return { success: false, error: 'Project not found' };

    const isLeader = project.team_leader_id === currentUser.id;
    const isOwner = organization?.created_by === currentUser.id;
    if (!isLeader && !isOwner) {
      return { success: false, error: 'Permission denied: Only the Team Leader or Organization Owner can remove project members.' };
    }

    if (member.user_id === project.team_leader_id) {
      return { success: false, error: 'Cannot remove the primary Team Leader from the project.' };
    }

    const { error } = await supabase.from('project_members').delete().eq('id', memberId);
    if (error) {
      console.error('Error removing member:', error);
      return { success: false, error: toFriendlyError(error) };
    }

    await refreshData();
    return { success: true };
  };

  // 8. Invite Member with Direct Adding for existing accounts
  const inviteMember = async ({
    projectId,
    email,
    role,
    can_receive_tasks,
    can_assign_tasks,
  }: {
    projectId: string;
    email: string;
    role: ProjectRole;
    can_receive_tasks: boolean;
    can_assign_tasks: boolean;
  }) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };

    const project = projects.find(p => p.id === projectId);
    if (!project) return { success: false, error: 'Project not found.' };

    // Enforce 2-member limit for free tier
    const isProUser = currentUser?.plan === 'PRO';
    if (!isProUser) {
      const activeMembers = projectMembers.filter(pm => pm.project_id === projectId && pm.status === 'ACTIVE');
      const pendingInvites = invitations.filter(inv => inv.project_id === projectId && inv.status === 'INVITED');
      if (activeMembers.length + pendingInvites.length >= 2) {
        return {
          success: false,
          error: 'Free Plan Limit: Free projects can have a maximum of 2 team members (1 Leader + 1 Member). Upgrade to Trinetra Pro (₹99/mo or ₹399/yr) to add more members.',
        };
      }
    }

    const isLeader = role === 'LEADER';
    const effectiveCanAssign = isLeader ? true : can_assign_tasks;
    const effectiveCanReceive = isLeader ? true : can_receive_tasks;

    const trimmedEmail = email.toLowerCase().trim();

    // Check if user is ALREADY an ACTIVE member of this project
    const existingUser = users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (existingUser) {
      const alreadyMember = projectMembers.some(pm => pm.project_id === projectId && pm.user_id === existingUser.id && pm.status === 'ACTIVE');
      if (alreadyMember) return { success: false, error: `${existingUser.full_name || email} is already an active member of this project.` };
    } else {
      const alreadyMemberByEmail = projectMembers.some(pm => pm.project_id === projectId && pm.profile?.email?.toLowerCase() === trimmedEmail && pm.status === 'ACTIVE');
      if (alreadyMemberByEmail) return { success: false, error: `${email} is already an active member of this project.` };
    }

    // Check if an invitation is ALREADY pending for this email in this project
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('*')
      .eq('project_id', projectId)
      .ilike('email', trimmedEmail)
      .eq('status', 'INVITED')
      .maybeSingle();

    let inv = existingInvite;

    if (!inv) {
      const { data: newInv, error: invError } = await supabase
        .from('invitations')
        .insert({
          organization_id: project.organization_id,
          project_id: projectId,
          email: trimmedEmail,
          role,
          can_receive_tasks: effectiveCanReceive,
          can_assign_tasks: effectiveCanAssign,
          invited_by: currentUser.id,
          status: 'INVITED',
        })
        .select()
        .single();

      if (invError) return { success: false, error: toFriendlyError(invError) };
      inv = newInv;
    } else {
      // Update role & permissions if changed
      const { data: updatedInv } = await supabase
        .from('invitations')
        .update({
          role,
          can_receive_tasks: effectiveCanReceive,
          can_assign_tasks: effectiveCanAssign,
          invited_by: currentUser.id,
        })
        .eq('id', inv.id)
        .select()
        .single();

      if (updatedInv) inv = updatedInv;
    }

    // Server-side email notification with acceptance link
    const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://task.trinetraedu-ai.com';
    const inviteUrl = `${appOrigin}/invitation/${inv.token}`;
    await dispatchEmailNotification({
      type: 'INVITATION',
      to: trimmedEmail,
      projectId,
      data: {
        recipientEmail: trimmedEmail,
        projectName: project.name,
        inviterName: currentUser.full_name,
        role,
        inviteUrl,
      },
    });

    // In-app notification if user already exists
    if (existingUser) {
      await supabase.from('notifications').insert({
        user_id: existingUser.id,
        project_id: projectId,
        title: `Project Invitation: ${project.name}`,
        message: `${currentUser.full_name} invited you to join "${project.name}" as ${role}. Click here to view and accept.`,
        link: `/invitation/${inv.token}`,
        type: 'INVITATION',
      });
    }

    await refreshData();
    return { success: true };
  };

  // 9. Accept Invitation
  const acceptInvitation = async (token: string) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };
    const { data: invite } = await supabase
      .from('invitations')
      .select('*, projects!inner(id, project_key, name)')
      .eq('token', token)
      .eq('status', 'INVITED')
      .maybeSingle();

    if (!invite) return { success: false, error: 'Invalid or expired invitation token.' };

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return { success: false, error: 'This invitation has expired.' };
    }

    await supabase.from('project_members').upsert({
      project_id: invite.project_id,
      user_id: currentUser.id,
      role: invite.role,
      can_receive_tasks: invite.can_receive_tasks,
      can_assign_tasks: invite.can_assign_tasks,
      status: 'ACTIVE',
    }, { onConflict: 'project_id,user_id' });

    await supabase.from('invitations').update({
      status: 'ACCEPTED',
      accepted_at: new Date().toISOString(),
    }).eq('id', invite.id);

    await refreshData();
    return { success: true, projectKey: invite.projects?.project_key };
  };

  // Decline Invitation
  const declineInvitation = async (token: string) => {
    if (!supabase) return { success: false, error: 'Not configured' };
    await supabase.from('invitations').update({
      status: 'DECLINED',
    }).eq('token', token);

    await refreshData();
    return { success: true };
  };

  // Cancel Invitation (Team Leader or Org Owner only)
  const cancelInvitation = async (invitationId: string) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };
    const inv = invitations.find(i => i.id === invitationId);
    if (!inv) return { success: false, error: 'Invitation not found' };

    const project = projects.find(p => p.id === inv.project_id);
    const isLeader = project?.team_leader_id === currentUser.id;
    const isOwner = organization?.created_by === currentUser.id;
    if (!isLeader && !isOwner) {
      return { success: false, error: 'Permission denied: Only the Team Leader or Organization Owner can cancel invitations.' };
    }

    const { error } = await supabase.from('invitations').delete().eq('id', invitationId);
    if (error) {
      console.error('Error cancelling invitation:', error);
      return { success: false, error: toFriendlyError(error) };
    }

    await refreshData();
    return { success: true };
  };

  // 10. Create Task
  const createTask = async ({
    projectId,
    title,
    description,
    definition_of_done,
    assigned_to,
    priority,
    due_date,
  }: {
    projectId: string;
    title: string;
    description?: string;
    definition_of_done?: string;
    assigned_to?: string;
    priority: TaskPriority;
    due_date?: string;
  }) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };

    if (!canAssignInProject(currentUser.id, projectId)) {
      return { success: false, error: 'Forbidden (403): You do not have permission to assign tasks in this project.' };
    }

    if (assigned_to && !canReceiveInProject(assigned_to, projectId)) {
      const assigneeUser = users.find(u => u.id === assigned_to);
      return { success: false, error: `Forbidden (403): ${assigneeUser?.full_name || 'Selected user'} cannot receive tasks in this project.` };
    }

    const project = projects.find(p => p.id === projectId);
    if (!project) return { success: false, error: 'Project not found.' };

    const { data: newTask, error } = await supabase.from('tasks').insert({
      project_id: projectId,
      title,
      description: description || null,
      definition_of_done: definition_of_done || null,
      created_by: currentUser.id,
      assigned_to: assigned_to || null,
      priority,
      status: assigned_to ? 'ASSIGNED' : 'DRAFT',
      due_date: due_date || null,
    }).select().single();

    if (error) return { success: false, error: toFriendlyError(error) };

    await supabase.from('task_activity').insert({
      task_id: newTask.id,
      user_id: currentUser.id,
      action: 'TASK_CREATED',
      details: { title: newTask.title },
    });

    if (assigned_to) {
      const assignee = users.find(u => u.id === assigned_to);
      await supabase.from('task_activity').insert({
        task_id: newTask.id,
        user_id: currentUser.id,
        action: 'TASK_ASSIGNED',
        old_value: 'Unassigned',
        new_value: assignee?.full_name || 'Assignee',
      });

      await supabase.from('notifications').insert({
        user_id: assigned_to,
        project_id: projectId,
        task_id: newTask.id,
        title: `Task Assigned: ${project.project_key}-${newTask.task_number}`,
        message: `${currentUser.full_name} assigned "${title}" to you. Due: ${due_date ? new Date(due_date).toLocaleDateString() : 'N/A'}`,
        link: `/projects/${project.project_key}/tasks/${newTask.task_number}`,
        type: 'TASK_ASSIGNED',
      });

      if (assignee?.email) {
        await dispatchEmailNotification({
          type: 'TASK_ASSIGNED',
          to: assignee.email,
          taskId: newTask.id,
          projectId,
          data: {
            recipientName: assignee.full_name,
            projectName: project.name,
            taskKey: `${project.project_key}-${newTask.task_number}`,
            taskTitle: title,
            assignerName: currentUser.full_name,
            priority,
            dueDate: due_date ? new Date(due_date).toLocaleDateString() : undefined,
            description,
            definitionOfDone: definition_of_done,
            taskUrl: `${window.location.origin}/projects/${project.project_key}/tasks/${newTask.task_number}`,
          },
        });
      }
    }

    await refreshData();
    return { success: true, task: newTask };
  };

  // 10b. Create Tasks in Bulk
  const createTasksBulk = async (
    projectId: string,
    tasksData: Array<{
      title: string;
      description?: string;
      definition_of_done?: string;
      assigned_to?: string;
      priority: TaskPriority;
      due_date?: string;
    }>
  ) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };

    const project = projects.find(p => p.id === projectId);
    if (!project) return { success: false, error: 'Project not found.' };

    // Validate assignments and permissions
    for (const t of tasksData) {
      if (t.assigned_to && t.assigned_to !== currentUser.id && !canAssignInProject(currentUser.id, projectId)) {
        return { success: false, error: 'Forbidden (403): You do not have permission to assign tasks to other users in this project.' };
      }
      if (t.assigned_to && !canReceiveInProject(t.assigned_to, projectId)) {
        const assigneeUser = users.find(u => u.id === t.assigned_to);
        return { success: false, error: `Forbidden (403): ${assigneeUser?.full_name || 'Selected user'} cannot receive tasks in this project.` };
      }
    }

    // Format tasks for batch insertion
    const insertData = tasksData.map(t => ({
      project_id: projectId,
      title: t.title,
      description: t.description || null,
      definition_of_done: t.definition_of_done || null,
      created_by: currentUser.id,
      assigned_to: t.assigned_to || null,
      priority: t.priority,
      status: t.assigned_to ? 'ASSIGNED' : 'DRAFT',
      due_date: t.due_date || null,
    }));

    const { data: newTasks, error } = await supabase
      .from('tasks')
      .insert(insertData)
      .select();

    if (error) return { success: false, error: toFriendlyError(error) };

    // Batch insert activities and notifications
    const activityLogs: any[] = [];
    const notifications: any[] = [];

    for (const newTask of newTasks) {
      activityLogs.push({
        task_id: newTask.id,
        user_id: currentUser.id,
        action: 'TASK_CREATED',
        details: { title: newTask.title },
      });

      if (newTask.assigned_to) {
        const assignee = users.find(u => u.id === newTask.assigned_to);
        activityLogs.push({
          task_id: newTask.id,
          user_id: currentUser.id,
          action: 'TASK_ASSIGNED',
          old_value: 'Unassigned',
          new_value: assignee?.full_name || 'Assignee',
        });

        // Notify assignee if not self-assigned
        if (newTask.assigned_to !== currentUser.id) {
          notifications.push({
            user_id: newTask.assigned_to,
            project_id: projectId,
            task_id: newTask.id,
            title: `Task Assigned: ${project.project_key}-${newTask.task_number}`,
            message: `${currentUser.full_name} assigned "${newTask.title}" to you.`,
            link: `/projects/${project.project_key}/tasks/${newTask.task_number}`,
            type: 'TASK_ASSIGNED',
          });
        }
      }
    }

    if (activityLogs.length > 0) {
      await supabase.from('task_activity').insert(activityLogs);
    }
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    await refreshData();
    return { success: true, count: newTasks.length };
  };

  // Delete Task (Task Creator, Team Leader, or Org Owner only)
  const deleteTask = async (taskId: string) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    const project = projects.find(p => p.id === task.project_id);
    const isCreator = task.created_by === currentUser.id;
    const isLeader = project?.team_leader_id === currentUser.id;
    const isOwner = organization?.created_by === currentUser.id;

    if (!isCreator && !isLeader && !isOwner) {
      return { success: false, error: 'Permission denied: Only the Task Creator, Team Leader, or Organization Owner can delete this task.' };
    }

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      console.error('Error deleting task:', error);
      return { success: false, error: toFriendlyError(error) };
    }

    await refreshData();
    return { success: true };
  };

  // 11. Lifecycle Transitions
  const acknowledgeTask = async (taskId: string) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    const now = new Date().toISOString();
    await supabase.from('tasks').update({ status: 'ACKNOWLEDGED', acknowledged_at: now }).eq('id', taskId);
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: currentUser.id,
      action: 'TASK_ACKNOWLEDGED',
      old_value: task.status,
      new_value: 'ACKNOWLEDGED',
    });

    await refreshData();
    return { success: true };
  };

  const startTask = async (taskId: string) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    const now = new Date().toISOString();
    await supabase.from('tasks').update({ status: 'IN_PROGRESS', started_at: task.started_at || now }).eq('id', taskId);
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: currentUser.id,
      action: 'TASK_STARTED',
      old_value: task.status,
      new_value: 'IN_PROGRESS',
    });

    await refreshData();
    return { success: true };
  };

  const blockTask = async (taskId: string, reason: string) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    const now = new Date().toISOString();
    await supabase.from('tasks').update({ status: 'BLOCKED', blocked_reason: reason, blocked_at: now }).eq('id', taskId);
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: currentUser.id,
      action: 'TASK_BLOCKED',
      old_value: task.status,
      new_value: 'BLOCKED',
      details: { reason },
    });

    if (task.project?.team_leader_id) {
      await supabase.from('notifications').insert({
        user_id: task.project.team_leader_id,
        project_id: task.project_id,
        task_id: taskId,
        title: `Task Blocked: ${task.project.project_key}-${task.task_number}`,
        message: `${currentUser.full_name} reported a blocker: "${reason}"`,
        link: `/projects/${task.project.project_key}/tasks/${task.task_number}`,
        type: 'TASK_BLOCKED',
      });
    }

    await refreshData();
    return { success: true };
  };

  const unblockTask = async (taskId: string) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    await supabase.from('tasks').update({ status: 'IN_PROGRESS', blocked_reason: null }).eq('id', taskId);
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: currentUser.id,
      action: 'TASK_UNBLOCKED',
      old_value: 'BLOCKED',
      new_value: 'IN_PROGRESS',
    });

    await refreshData();
    return { success: true };
  };

  const submitTask = async (taskId: string, note?: string) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    const now = new Date().toISOString();
    await supabase.from('tasks').update({ status: 'SUBMITTED', submitted_at: now }).eq('id', taskId);
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: currentUser.id,
      action: 'TASK_SUBMITTED',
      old_value: task.status,
      new_value: 'SUBMITTED',
      details: { note },
    });

    if (note) {
      await supabase.from('task_comments').insert({
        task_id: taskId,
        user_id: currentUser.id,
        content: note,
        type: 'SUBMISSION_NOTE',
      });
    }

    const reviewerId = task.created_by || task.project?.team_leader_id;
    if (reviewerId && reviewerId !== currentUser.id) {
      await supabase.from('notifications').insert({
        user_id: reviewerId,
        project_id: task.project_id,
        task_id: taskId,
        title: `Task Submitted: ${task.project?.project_key}-${task.task_number}`,
        message: `${currentUser.full_name} submitted work for review.`,
        link: `/projects/${task.project?.project_key}/tasks/${task.task_number}`,
        type: 'TASK_SUBMITTED',
      });

      const reviewer = users.find(u => u.id === reviewerId);
      if (reviewer?.email) {
        await dispatchEmailNotification({
          type: 'TASK_SUBMITTED',
          to: reviewer.email,
          taskId,
          projectId: task.project_id,
          data: {
            reviewerName: reviewer.full_name,
            projectName: task.project?.name || 'Project',
            taskKey: `${task.project?.project_key}-${task.task_number}`,
            taskTitle: task.title,
            submitterName: currentUser.full_name,
            submissionNote: note,
            taskUrl: `${window.location.origin}/projects/${task.project?.project_key}/tasks/${task.task_number}`,
          },
        });
      }
    }

    await refreshData();
    return { success: true };
  };

  const requestChanges = async (taskId: string, reason: string) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    await supabase.from('tasks').update({ status: 'CHANGES_REQUESTED', changes_requested_reason: reason }).eq('id', taskId);
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: currentUser.id,
      action: 'CHANGES_REQUESTED',
      old_value: task.status,
      new_value: 'CHANGES_REQUESTED',
      details: { reason },
    });

    await supabase.from('task_comments').insert({
      task_id: taskId,
      user_id: currentUser.id,
      content: `Changes Requested: ${reason}`,
      type: 'CHANGE_REQUEST_NOTE',
    });

    if (task.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: task.assigned_to,
        project_id: task.project_id,
        task_id: taskId,
        title: `Changes Requested: ${task.project?.project_key}-${task.task_number}`,
        message: `${currentUser.full_name} requested revisions: "${reason}"`,
        link: `/projects/${task.project?.project_key}/tasks/${task.task_number}`,
        type: 'CHANGES_REQUESTED',
      });

      const assignee = users.find(u => u.id === task.assigned_to);
      if (assignee?.email) {
        await dispatchEmailNotification({
          type: 'CHANGES_REQUESTED',
          to: assignee.email,
          taskId,
          projectId: task.project_id,
          data: {
            assigneeName: assignee.full_name,
            projectName: task.project?.name || 'Project',
            taskKey: `${task.project?.project_key}-${task.task_number}`,
            taskTitle: task.title,
            reviewerName: currentUser.full_name,
            reason,
            taskUrl: `${window.location.origin}/projects/${task.project?.project_key}/tasks/${task.task_number}`,
          },
        });
      }
    }

    await refreshData();
    return { success: true };
  };

  const approveTask = async (taskId: string) => {
    if (!supabase || !currentUser) return { success: false, error: 'Not authenticated' };
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    if (task.assigned_to === currentUser.id && task.project?.team_leader_id !== currentUser.id && organization?.created_by !== currentUser.id) {
      return { success: false, error: 'Forbidden (403): You cannot approve your own submitted task.' };
    }

    const now = new Date().toISOString();
    await supabase.from('tasks').update({ status: 'APPROVED', completed_at: now }).eq('id', taskId);
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: currentUser.id,
      action: 'TASK_APPROVED',
      old_value: task.status,
      new_value: 'APPROVED',
    });

    await supabase.from('task_comments').insert({
      task_id: taskId,
      user_id: currentUser.id,
      content: 'Task approved and completed.',
      type: 'APPROVAL_NOTE',
    });

    if (task.assigned_to && task.assigned_to !== currentUser.id) {
      await supabase.from('notifications').insert({
        user_id: task.assigned_to,
        project_id: task.project_id,
        task_id: taskId,
        title: `Task Approved & Completed!`,
        message: `${task.project?.project_key}-${task.task_number} was approved by ${currentUser.full_name}.`,
        link: `/projects/${task.project?.project_key}/tasks/${task.task_number}`,
        type: 'TASK_APPROVED',
      });

      const assignee = users.find(u => u.id === task.assigned_to);
      if (assignee?.email) {
        await dispatchEmailNotification({
          type: 'TASK_APPROVED',
          to: assignee.email,
          taskId,
          projectId: task.project_id,
          data: {
            assigneeName: assignee.full_name,
            projectName: task.project?.name || 'Project',
            taskKey: `${task.project?.project_key}-${task.task_number}`,
            taskTitle: task.title,
            reviewerName: currentUser.full_name,
            completedDate: new Date().toLocaleDateString(),
            taskUrl: `${window.location.origin}/projects/${task.project?.project_key}/tasks/${task.task_number}`,
          },
        });
      }
    }

    await refreshData();
    return { success: true };
  };

  // 12. Add Comment & Attachment
  const addComment = async (taskId: string, content: string, type: TaskComment['type'] = 'COMMENT') => {
    if (!supabase || !currentUser) return;
    await supabase.from('task_comments').insert({
      task_id: taskId,
      user_id: currentUser.id,
      content,
      type,
    });
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: currentUser.id,
      action: 'COMMENT_ADDED',
      details: { type, snippet: content.substring(0, 40) },
    });
    await refreshData();
  };

  const addAttachment = async (taskId: string, fileName: string, fileUrl: string, fileSize?: number) => {
    if (!supabase || !currentUser) return;
    await supabase.from('task_attachments').insert({
      task_id: taskId,
      user_id: currentUser.id,
      file_name: fileName,
      file_url: fileUrl,
      file_size: fileSize || 0,
    });
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: currentUser.id,
      action: 'ATTACHMENT_UPLOADED',
      new_value: fileName,
    });
    await refreshData();
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!supabase) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n)));
  };

  const markAllNotificationsAsRead = async () => {
    if (!supabase || !currentUser) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <TrinetraContext.Provider
      value={{
        isConfigured: configured,
        isLoading,
        currentUser,
        organization,
        projects,
        projectMembers,
        tasks,
        taskActivity,
        comments,
        attachments,
        notifications,
        invitations,
        users,
        isPro: currentUser?.plan === 'PRO',
        plan: currentUser?.plan || 'FREE',

        signIn,
        signUp,
        signOut,
        refreshData,

        canAssignInProject,
        canReceiveInProject,
        canManageProject,
        getProjectMembers,
        getPermittedAssignees,

        createOrganization,
        createProject,
        deleteProject,
        updateProjectAssignmentRule,
        updateMemberPermissions,
        removeProjectMember,
        inviteMember,
        acceptInvitation,
        declineInvitation,
        cancelInvitation,

        createTask,
        createTasksBulk,
        deleteTask,
        acknowledgeTask,
        startTask,
        blockTask,
        unblockTask,
        submitTask,
        requestChanges,
        approveTask,

        addComment,
        addAttachment,
        markNotificationAsRead,
        markAllNotificationsAsRead,
      }}
    >
      {children}
    </TrinetraContext.Provider>
  );
}

export function useTrinetra() {
  const context = useContext(TrinetraContext);
  if (!context) {
    throw new Error('useTrinetra must be used within a TrinetraProvider');
  }
  return context;
}
