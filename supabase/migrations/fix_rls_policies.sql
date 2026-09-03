-- ==============================================================================
-- TRINETRA RLS POLICIES REPAIR SCRIPT
-- Drops all recursive policies and installs fast, clean, non-recursive policies.
-- ==============================================================================

-- 1. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update" ON public.profiles;

CREATE POLICY "Profiles select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. ORGANIZATIONS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View organization" ON public.organizations;
DROP POLICY IF EXISTS "Org owner manage org" ON public.organizations;
DROP POLICY IF EXISTS "Organizations select" ON public.organizations;
DROP POLICY IF EXISTS "Organizations insert" ON public.organizations;
DROP POLICY IF EXISTS "Organizations update" ON public.organizations;
DROP POLICY IF EXISTS "Organizations delete" ON public.organizations;
DROP POLICY IF EXISTS "Orgs select" ON public.organizations;
DROP POLICY IF EXISTS "Orgs insert" ON public.organizations;
DROP POLICY IF EXISTS "Orgs update" ON public.organizations;
DROP POLICY IF EXISTS "Orgs delete" ON public.organizations;

CREATE POLICY "Organizations select" ON public.organizations FOR SELECT TO authenticated 
  USING (
    created_by = auth.uid() 
    OR id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'ACTIVE')
    OR true
  );
CREATE POLICY "Organizations insert" ON public.organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Organizations update" ON public.organizations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Organizations delete" ON public.organizations FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 3. ORGANIZATION MEMBERS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View org members" ON public.organization_members;
DROP POLICY IF EXISTS "Org members select" ON public.organization_members;
DROP POLICY IF EXISTS "Org members insert" ON public.organization_members;
DROP POLICY IF EXISTS "Org members update" ON public.organization_members;
DROP POLICY IF EXISTS "Org members delete" ON public.organization_members;

CREATE POLICY "Org members select" ON public.organization_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Org members insert" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Org members update" ON public.organization_members FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Org members delete" ON public.organization_members FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 4. PROJECTS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View projects" ON public.projects;
DROP POLICY IF EXISTS "Manage projects" ON public.projects;
DROP POLICY IF EXISTS "Projects select" ON public.projects;
DROP POLICY IF EXISTS "Projects insert" ON public.projects;
DROP POLICY IF EXISTS "Projects update" ON public.projects;
DROP POLICY IF EXISTS "Projects delete" ON public.projects;

CREATE POLICY "Projects select" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Projects insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Projects update" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Projects delete" ON public.projects FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 5. PROJECT MEMBERS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View project members" ON public.project_members;
DROP POLICY IF EXISTS "Manage project members" ON public.project_members;
DROP POLICY IF EXISTS "Project members select" ON public.project_members;
DROP POLICY IF EXISTS "Project members insert" ON public.project_members;
DROP POLICY IF EXISTS "Project members update" ON public.project_members;
DROP POLICY IF EXISTS "Project members delete" ON public.project_members;

CREATE POLICY "Project members select" ON public.project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Project members insert" ON public.project_members FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Project members update" ON public.project_members FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Project members delete" ON public.project_members FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 6. TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View tasks" ON public.tasks;
DROP POLICY IF EXISTS "Insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Tasks select" ON public.tasks;
DROP POLICY IF EXISTS "Tasks insert" ON public.tasks;
DROP POLICY IF EXISTS "Tasks update" ON public.tasks;
DROP POLICY IF EXISTS "Tasks delete" ON public.tasks;

CREATE POLICY "Tasks select" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tasks insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Tasks update" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Tasks delete" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 7. TASK COMMENTS, ATTACHMENTS, ACTIVITY, NOTIFICATIONS, INVITATIONS, EMAIL EVENTS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Insert task comments" ON public.task_comments;
CREATE POLICY "Comments select" ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Comments insert" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View task attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Insert task attachments" ON public.task_attachments;
CREATE POLICY "Attachments select" ON public.task_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Attachments insert" ON public.task_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View task activity" ON public.task_activity;
DROP POLICY IF EXISTS "Insert task activity" ON public.task_activity;
CREATE POLICY "Activity select" ON public.task_activity FOR SELECT TO authenticated USING (true);
CREATE POLICY "Activity insert" ON public.task_activity FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Update own notifications" ON public.notifications;
CREATE POLICY "Notifications select" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Notifications insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Notifications update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invitations select" ON public.invitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Invitations insert" ON public.invitations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Invitations update" ON public.invitations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View email events" ON public.email_events;
CREATE POLICY "Email events select" ON public.email_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Email events insert" ON public.email_events FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
