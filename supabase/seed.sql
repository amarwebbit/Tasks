-- ==============================================================================
-- TRINETRA TASK MANAGEMENT SYSTEM - SEED DATA (OPTIONAL / DEMO)
-- ==============================================================================

-- Instructions: You can run this in your Supabase SQL Editor after running the schema migration
-- Note: Replace with actual auth.users UUIDs if you want them linked to real test accounts.

-- 1. Create Demo Organization
INSERT INTO public.organizations (id, name, slug)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Trinetra Technologies', 'trinetra')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Demo Projects
INSERT INTO public.projects (id, organization_id, name, project_key, description, assignment_rule, status, start_date, target_date)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Trinetra Shiksha', 'TRI', 'GATE and Competitive exam preparation platform with adaptive testing', 'LEADER_ONLY', 'ACTIVE', '2026-09-01', '2026-11-30'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'AI Voice Agent', 'VOICE', 'Autonomous inbound call handling and query resolution engine', 'SELECTED_MEMBERS', 'ACTIVE', '2026-08-15', '2026-10-15'),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Marketing Website', 'MKT', 'Modern high-converting marketing landing pages and blog portal', 'EVERYONE', 'ACTIVE', '2026-08-01', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
