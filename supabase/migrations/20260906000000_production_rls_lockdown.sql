-- ==============================================================================
-- PRODUCTION ROW LEVEL SECURITY (RLS) LOCKDOWN
-- Enforces multi-tenant data isolation at the PostgreSQL database engine level.
-- ==============================================================================

-- 1. NOTIFICATIONS: Users can ONLY see their own notifications
DROP POLICY IF EXISTS "Notifications select" ON public.notifications;
CREATE POLICY "Notifications select" ON public.notifications 
FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 2. PROJECTS: Users can ONLY see projects they own, lead, or belong to
DROP POLICY IF EXISTS "Projects select" ON public.projects;
CREATE POLICY "Projects select" ON public.projects 
FOR SELECT TO authenticated USING (
  team_leader_id = auth.uid() 
  OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND status = 'ACTIVE')
  OR organization_id IN (SELECT id FROM public.organizations WHERE created_by = auth.uid())
);

-- 3. TASKS: Users can ONLY see tasks belonging to projects they can access
DROP POLICY IF EXISTS "Tasks select" ON public.tasks;
CREATE POLICY "Tasks select" ON public.tasks 
FOR SELECT TO authenticated USING (
  project_id IN (
    SELECT id FROM public.projects WHERE team_leader_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND status = 'ACTIVE'
    UNION
    SELECT id FROM public.projects WHERE organization_id IN (SELECT id FROM public.organizations WHERE created_by = auth.uid())
  )
);

-- 4. ATTACHMENTS & COMMENTS: Scoped to accessible tasks
DROP POLICY IF EXISTS "Attachments select" ON public.task_attachments;
CREATE POLICY "Attachments select" ON public.task_attachments 
FOR SELECT TO authenticated USING (
  task_id IN (SELECT id FROM public.tasks)
);

DROP POLICY IF EXISTS "Comments select" ON public.task_comments;
CREATE POLICY "Comments select" ON public.task_comments 
FOR SELECT TO authenticated USING (
  task_id IN (SELECT id FROM public.tasks)
);

-- 5. PROFILES: Users can ONLY see their own profile and confirmed project teammates
DROP POLICY IF EXISTS "Profiles select" ON public.profiles;
CREATE POLICY "Profiles select" ON public.profiles 
FOR SELECT TO authenticated USING (
  id = auth.uid()
  OR id IN (
    -- Teammates in projects the current user leads or belongs to
    SELECT pm.user_id FROM public.project_members pm
    WHERE pm.project_id IN (
      SELECT id FROM public.projects WHERE team_leader_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  )
  OR id IN (
    -- Team leaders of projects the current user belongs to
    SELECT p.team_leader_id FROM public.projects p
    WHERE p.id IN (
      SELECT id FROM public.projects WHERE team_leader_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  )
);
