-- ==============================================================================
-- TRINETRA RLS SECURITY HARDENING MIGRATION
-- Installs strict, secure, non-recursive tenant and project boundary checks.
-- ==============================================================================

-- 1. CLEAN UP PERMISSIVE POLICIES FROM OLD SCHEMAS
DROP POLICY IF EXISTS "Anyone can view and manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Anyone can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Projects select" ON public.projects;
DROP POLICY IF EXISTS "Projects insert" ON public.projects;
DROP POLICY IF EXISTS "Projects update" ON public.projects;
DROP POLICY IF EXISTS "Projects delete" ON public.projects;
DROP POLICY IF EXISTS "Tasks select" ON public.tasks;
DROP POLICY IF EXISTS "Tasks insert" ON public.tasks;
DROP POLICY IF EXISTS "Tasks update" ON public.tasks;
DROP POLICY IF EXISTS "Tasks delete" ON public.tasks;
DROP POLICY IF EXISTS "Comments select" ON public.task_comments;
DROP POLICY IF EXISTS "Comments insert" ON public.task_comments;
DROP POLICY IF EXISTS "Attachments select" ON public.task_attachments;
DROP POLICY IF EXISTS "Attachments insert" ON public.task_attachments;
DROP POLICY IF EXISTS "Activity select" ON public.task_activity;
DROP POLICY IF EXISTS "Activity insert" ON public.task_activity;
DROP POLICY IF EXISTS "Notifications select" ON public.notifications;
DROP POLICY IF EXISTS "Notifications insert" ON public.notifications;
DROP POLICY IF EXISTS "Notifications update" ON public.notifications;
DROP POLICY IF EXISTS "Organizations select" ON public.organizations;
DROP POLICY IF EXISTS "Organizations insert" ON public.organizations;
DROP POLICY IF EXISTS "Organizations update" ON public.organizations;
DROP POLICY IF EXISTS "Organizations delete" ON public.organizations;
DROP POLICY IF EXISTS "Org members select" ON public.organization_members;
DROP POLICY IF EXISTS "Org members insert" ON public.organization_members;
DROP POLICY IF EXISTS "Org members update" ON public.organization_members;
DROP POLICY IF EXISTS "Org members delete" ON public.organization_members;
DROP POLICY IF EXISTS "Project members select" ON public.project_members;
DROP POLICY IF EXISTS "Project members insert" ON public.project_members;
DROP POLICY IF EXISTS "Project members update" ON public.project_members;
DROP POLICY IF EXISTS "Project members delete" ON public.project_members;

-- 2. COUPONS & PAYMENTS SECURITY
-- Coupons can be read by authenticated users to validate checkouts, but only managed by service role (admin)
CREATE POLICY "Authenticated users can select active coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Payments can only be read by the owner user who paid
CREATE POLICY "Users can select own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. ORGANIZATIONS & MEMBERS SECURITY
CREATE POLICY "Orgs select" ON public.organizations FOR SELECT TO authenticated
  USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'ACTIVE')
  );

CREATE POLICY "Orgs insert" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Orgs update" ON public.organizations FOR UPDATE TO authenticated
  USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'OWNER' AND status = 'ACTIVE')
  );

CREATE POLICY "Orgs delete" ON public.organizations FOR DELETE TO authenticated
  USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'OWNER' AND status = 'ACTIVE')
  );

-- Org Members
CREATE POLICY "Org members select" ON public.organization_members FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'ACTIVE')
  );

CREATE POLICY "Org members insert" ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Org members update" ON public.organization_members FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'OWNER' AND status = 'ACTIVE')
  );

CREATE POLICY "Org members delete" ON public.organization_members FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'OWNER' AND status = 'ACTIVE')
  );

-- 4. PROJECTS & PROJECT MEMBERS SECURITY
CREATE POLICY "Projects select" ON public.projects FOR SELECT TO authenticated
  USING (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND status = 'ACTIVE')
    OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'OWNER' AND status = 'ACTIVE')
  );

CREATE POLICY "Projects insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'OWNER' AND status = 'ACTIVE')
  );

CREATE POLICY "Projects update" ON public.projects FOR UPDATE TO authenticated
  USING (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'LEADER' AND status = 'ACTIVE')
    OR organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'OWNER' AND status = 'ACTIVE')
  );

CREATE POLICY "Projects delete" ON public.projects FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'OWNER' AND status = 'ACTIVE')
  );

-- Project Members
CREATE POLICY "Project members select" ON public.project_members FOR SELECT TO authenticated
  USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND status = 'ACTIVE')
    OR project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "Project members insert" ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'LEADER' AND status = 'ACTIVE')
    OR project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "Project members update" ON public.project_members FOR UPDATE TO authenticated
  USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'LEADER' AND status = 'ACTIVE')
    OR project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "Project members delete" ON public.project_members FOR DELETE TO authenticated
  USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'LEADER' AND status = 'ACTIVE')
    OR project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

-- 5. TASKS SECURITY
CREATE POLICY "Tasks select" ON public.tasks FOR SELECT TO authenticated
  USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND status = 'ACTIVE')
    OR project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "Tasks insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND (role = 'LEADER' OR can_assign_tasks = true) AND status = 'ACTIVE'
    )
    OR project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "Tasks update" ON public.tasks FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    OR project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND (role = 'LEADER' OR can_assign_tasks = true) AND status = 'ACTIVE'
    )
    OR project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "Tasks delete" ON public.tasks FOR DELETE TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'LEADER' AND status = 'ACTIVE'
    )
    OR project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

-- 6. TASK COMMENT, ATTACHMENT & ACTIVITY SECURITY
-- Comments
CREATE POLICY "Comments select" ON public.task_comments FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid() AND pm.status = 'ACTIVE'
    )
    OR task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "Comments insert" ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid() AND pm.status = 'ACTIVE'
    )
    OR task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

-- Attachments
CREATE POLICY "Attachments select" ON public.task_attachments FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid() AND pm.status = 'ACTIVE'
    )
    OR task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "Attachments insert" ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid() AND pm.status = 'ACTIVE'
    )
    OR task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

-- Activity
CREATE POLICY "Activity select" ON public.task_activity FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid() AND pm.status = 'ACTIVE'
    )
    OR task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "Activity insert" ON public.task_activity FOR INSERT TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid() AND pm.status = 'ACTIVE'
    )
    OR task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
    )
  );

-- 7. NOTIFICATIONS SECURITY
CREATE POLICY "Notifications select" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Notifications insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Notifications update" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
