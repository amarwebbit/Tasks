import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const getAdminSupabase = () => {
  const key = serviceRoleKey && serviceRoleKey !== 'your-service-role-key-here' ? serviceRoleKey : supabaseAnonKey;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function GET(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    if (adminKey !== 'TRINETRA_ADMIN_2026') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const supabase = getAdminSupabase();

    // Fetch all profiles
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (pErr) throw pErr;

    // Fetch all projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, project_key, team_leader_id, organization_id');

    // Fetch all project members
    const { data: members } = await supabase
      .from('project_members')
      .select('id, project_id, user_id');

    // Map each profile with their projects and stats
    const usersWithStats = (profiles || []).map(u => {
      const userProjects = (projects || []).filter(p => p.team_leader_id === u.id);
      const projectNames = userProjects.map(p => `${p.name} (${p.project_key})`);
      const userProjectIds = userProjects.map(p => p.id);
      const teamMembersInProjects = (members || []).filter(m => userProjectIds.includes(m.project_id)).length;

      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role || 'USER',
        plan: u.plan || 'FREE',
        plan_expires_at: u.plan_expires_at,
        created_at: u.created_at,
        projects_count: userProjects.length,
        project_names: projectNames,
        team_members_count: teamMembersInProjects,
      };
    });

    return NextResponse.json({ success: true, users: usersWithStats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch admin users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    if (adminKey !== 'TRINETRA_ADMIN_2026') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, plan, durationDays } = body;

    if (!userId || !['FREE', 'PRO'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid user ID or plan' }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    let planExpiresAt: string | null = null;
    if (plan === 'PRO') {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (durationDays || 365));
      planExpiresAt = expiry.toISOString();
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        plan,
        plan_expires_at: planExpiresAt,
      })
      .eq('id', userId);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: `User plan updated to ${plan}`,
      plan,
      plan_expires_at: planExpiresAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update plan' }, { status: 500 });
  }
}
