-- ==============================================================================
-- TRINETRA TASK MANAGEMENT SYSTEM - SCHEMA MIGRATION
-- Multi-Project Architecture, Granular Permissions, Task Lifecycle, Audit & Reports
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USER PROFILES (Synchronized with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to sync auth.users with public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ORGANIZATION MEMBERS
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'MEMBER')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- 5. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    project_key TEXT NOT NULL, -- e.g. 'TRI', 'VOICE', 'MKT'
    description TEXT,
    team_leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assignment_rule TEXT NOT NULL DEFAULT 'LEADER_ONLY' CHECK (assignment_rule IN ('LEADER_ONLY', 'SELECTED_MEMBERS', 'EVERYONE')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'COMPLETED')),
    start_date DATE,
    target_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, project_key)
);

-- 6. PROJECT MEMBERS & ASSIGNMENT PERMISSIONS
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('LEADER', 'MEMBER', 'VIEWER')),
    can_receive_tasks BOOLEAN NOT NULL DEFAULT true,
    can_assign_tasks BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REMOVED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- 7. INVITATIONS
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('LEADER', 'MEMBER', 'VIEWER')),
    can_receive_tasks BOOLEAN NOT NULL DEFAULT true,
    can_assign_tasks BOOLEAN NOT NULL DEFAULT false,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ
);

-- 8. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    task_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    definition_of_done TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('DRAFT', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'BLOCKED', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED')),
    due_date TIMESTAMPTZ,
    blocked_reason TEXT,
    changes_requested_reason TEXT,
    acknowledged_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    blocked_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_hours NUMERIC(6, 2),
    actual_hours NUMERIC(6, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, task_number)
);

-- Sequence trigger for sequential project task numbers (TRI-001, TRI-002, etc.)
CREATE OR REPLACE FUNCTION public.set_task_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    IF NEW.task_number IS NULL OR NEW.task_number = 0 THEN
        SELECT COALESCE(MAX(task_number), 0) + 1 INTO next_num
        FROM public.tasks
        WHERE project_id = NEW.project_id;
        NEW.task_number := next_num;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_task_number ON public.tasks;
CREATE TRIGGER trigger_set_task_number
    BEFORE INSERT ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_task_number();

-- 9. TASK COMMENTS & CLARIFICATIONS
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'COMMENT' CHECK (type IN ('COMMENT', 'CLARIFICATION', 'BLOCKER_NOTE', 'SUBMISSION_NOTE', 'CHANGE_REQUEST_NOTE', 'APPROVAL_NOTE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. TASK ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. IMMUTABLE TASK ACTIVITY TIMELINE
CREATE TABLE IF NOT EXISTS public.task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. IN-APP NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    type TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. EMAIL EVENT LOGS
CREATE TABLE IF NOT EXISTS public.email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    email_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    provider_message_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE & REPORTING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_project_members_project_user ON public.project_members(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_user ON public.organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON public.task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_email_events_task ON public.email_events(task_id);

-- ==============================================================================
-- HELPER FUNCTIONS FOR SECURITY & PERMISSIONS
-- ==============================================================================

-- Check if user is Organization Owner
CREATE OR REPLACE FUNCTION public.is_org_owner(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND role = 'OWNER'
          AND status = 'ACTIVE'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is member of project
CREATE OR REPLACE FUNCTION public.is_project_member(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_id
          AND user_id = auth.uid()
          AND status = 'ACTIVE'
    ) OR EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.organization_members om ON om.organization_id = p.organization_id
        WHERE p.id = p_id
          AND om.user_id = auth.uid()
          AND om.role = 'OWNER'
          AND om.status = 'ACTIVE'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has can_assign_tasks in project
CREATE OR REPLACE FUNCTION public.can_assign_in_project(p_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    rule TEXT;
    pm RECORD;
    is_owner BOOLEAN;
BEGIN
    -- Check org owner
    SELECT EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.organization_members om ON om.organization_id = p.organization_id
        WHERE p.id = p_id
          AND om.user_id = auth.uid()
          AND om.role = 'OWNER'
          AND om.status = 'ACTIVE'
    ) INTO is_owner;

    IF is_owner THEN
        RETURN TRUE;
    END IF;

    -- Get project assignment rule and member status
    SELECT assignment_rule INTO rule FROM public.projects WHERE id = p_id;
    SELECT role, can_assign_tasks INTO pm FROM public.project_members WHERE project_id = p_id AND user_id = auth.uid() AND status = 'ACTIVE';

    IF pm.role = 'LEADER' THEN
        RETURN TRUE;
    END IF;

    IF rule = 'EVERYONE' THEN
        RETURN TRUE;
    ELSIF rule = 'SELECTED_MEMBERS' AND pm.can_assign_tasks = TRUE THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if assignee can receive tasks in project
CREATE OR REPLACE FUNCTION public.can_receive_in_project(p_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_id
          AND user_id = target_user_id
          AND can_receive_tasks = TRUE
          AND status = 'ACTIVE'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Organizations
CREATE POLICY "Organizations select" ON public.organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizations insert" ON public.organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Organizations update" ON public.organizations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Organizations delete" ON public.organizations FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Organization Members
CREATE POLICY "Org members select" ON public.organization_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Org members insert" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Org members update" ON public.organization_members FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Org members delete" ON public.organization_members FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Projects
CREATE POLICY "Projects select" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Projects insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Projects update" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Projects delete" ON public.projects FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Project Members
CREATE POLICY "Project members select" ON public.project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Project members insert" ON public.project_members FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Project members update" ON public.project_members FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Project members delete" ON public.project_members FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Tasks
CREATE POLICY "Tasks select" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tasks insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Tasks update" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Tasks delete" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Task Comments
CREATE POLICY "Comments select" ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Comments insert" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Task Attachments
CREATE POLICY "Attachments select" ON public.task_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Attachments insert" ON public.task_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Task Activity
CREATE POLICY "Activity select" ON public.task_activity FOR SELECT TO authenticated USING (true);
CREATE POLICY "Activity insert" ON public.task_activity FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Notifications
CREATE POLICY "Notifications select" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Notifications insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Notifications update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Invitations
CREATE POLICY "Invitations select" ON public.invitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Invitations insert" ON public.invitations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Invitations update" ON public.invitations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Email Events
CREATE POLICY "Email events select" ON public.email_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Email events insert" ON public.email_events FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
