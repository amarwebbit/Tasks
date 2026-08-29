-- ==============================================================================
-- TRINETRA RLS RECURSION REPAIR MIGRATION
-- Fixes infinite recursion loops by opening read access on membership lists
-- to authenticated users, while maintaining strict isolation on project data.
-- ==============================================================================

-- 1. DROP RECURSIVE SELECT POLICIES
DROP POLICY IF EXISTS "Org members select" ON public.organization_members;
DROP POLICY IF EXISTS "Project members select" ON public.project_members;

-- 2. CREATE NON-RECURSIVE SECURE SELECT POLICIES
-- Allow authenticated users to view membership lists (actual project/task details remain isolated)
CREATE POLICY "Org members select" ON public.organization_members 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "Project members select" ON public.project_members 
  FOR SELECT TO authenticated 
  USING (true);
