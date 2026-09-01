-- ==============================================================================
-- TRINETRA TASK MANAGEMENT SYSTEM - GITHUB INTEGRATION & CODE DIFF LOGS
-- ==============================================================================

-- 1. EXTEND PROFILES WITH GITHUB USERNAME
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_username TEXT;

-- 2. EXTEND ACTIVITY ACTION ENUM CHECK
-- Update task_activity action check if needed, or rely on string action 'CODE_PUSHED'
ALTER TABLE public.task_activity DROP CONSTRAINT IF EXISTS task_activity_action_check;

-- 3. PROJECT GITHUB SETTINGS
CREATE TABLE IF NOT EXISTS public.project_github_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID UNIQUE NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    repo_full_name TEXT NOT NULL, -- e.g. "organization/repository" or "username/repository"
    webhook_secret TEXT NOT NULL,
    github_token TEXT, -- Optional Personal Access Token for private repos
    default_branch TEXT NOT NULL DEFAULT 'main',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TASK COMMITS
CREATE TABLE IF NOT EXISTS public.task_commits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    commit_sha VARCHAR(40) NOT NULL,
    branch TEXT,
    commit_message TEXT NOT NULL,
    author_github_username TEXT,
    author_email TEXT,
    commit_url TEXT,
    total_additions INTEGER DEFAULT 0,
    total_deletions INTEGER DEFAULT 0,
    files_count INTEGER DEFAULT 0,
    pushed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, commit_sha)
);

-- Index for fast lookup by task and project
CREATE INDEX IF NOT EXISTS idx_task_commits_task_id ON public.task_commits(task_id);
CREATE INDEX IF NOT EXISTS idx_task_commits_project_id ON public.task_commits(project_id);

-- 5. TASK COMMIT FILE CHANGES (GRANULAR FILE DIFFS)
CREATE TABLE IF NOT EXISTS public.task_commit_file_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commit_id UUID NOT NULL REFERENCES public.task_commits(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'modified', -- 'added', 'modified', 'deleted', 'renamed'
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    patch TEXT, -- Raw unified diff patch
    previous_filename TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commit_file_changes_commit_id ON public.task_commit_file_changes(commit_id);

-- 6. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.project_github_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_commit_file_changes ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR PROJECT GITHUB SETTINGS
CREATE POLICY "Github settings select" ON public.project_github_settings FOR SELECT TO authenticated
    USING (
        project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND status = 'ACTIVE')
        OR project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
        )
    );

CREATE POLICY "Github settings insert" ON public.project_github_settings FOR INSERT TO authenticated
    WITH CHECK (
        project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'LEADER' AND status = 'ACTIVE')
        OR project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
        )
    );

CREATE POLICY "Github settings update" ON public.project_github_settings FOR UPDATE TO authenticated
    USING (
        project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'LEADER' AND status = 'ACTIVE')
        OR project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
        )
    );

CREATE POLICY "Github settings delete" ON public.project_github_settings FOR DELETE TO authenticated
    USING (
        project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'LEADER' AND status = 'ACTIVE')
        OR project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
        )
    );

-- 8. RLS POLICIES FOR TASK COMMITS
CREATE POLICY "Task commits select" ON public.task_commits FOR SELECT TO authenticated
    USING (
        project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND status = 'ACTIVE')
        OR project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
        )
    );

CREATE POLICY "Task commits update" ON public.task_commits FOR UPDATE TO authenticated
    USING (
        project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND status = 'ACTIVE')
        OR project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
        )
    );

-- 9. RLS POLICIES FOR FILE CHANGES
CREATE POLICY "File changes select" ON public.task_commit_file_changes FOR SELECT TO authenticated
    USING (
        commit_id IN (
            SELECT tc.id FROM public.task_commits tc
            WHERE tc.project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND status = 'ACTIVE')
            OR tc.project_id IN (
                SELECT p.id FROM public.projects p
                JOIN public.organization_members om ON om.organization_id = p.organization_id
                WHERE om.user_id = auth.uid() AND om.role = 'OWNER' AND om.status = 'ACTIVE'
            )
        )
    );
