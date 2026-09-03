-- Fix Organizations RLS Policy to allow creators to SELECT their newly created organizations
DROP POLICY IF EXISTS "Orgs select" ON public.organizations;
DROP POLICY IF EXISTS "Organizations select" ON public.organizations;

CREATE POLICY "Orgs select" ON public.organizations FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() AND status = 'ACTIVE'
    )
  );

-- Ensure insert policy allows authenticated users
DROP POLICY IF EXISTS "Orgs insert" ON public.organizations;
DROP POLICY IF EXISTS "Organizations insert" ON public.organizations;

CREATE POLICY "Orgs insert" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
