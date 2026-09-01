import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const getSupabaseClient = () => {
  const key = serviceRoleKey && serviceRoleKey !== 'your-service-role-key-here' ? serviceRoleKey : supabaseAnonKey;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = getSupabaseClient();

    const { data: commits, error } = await supabase
      .from('task_commits')
      .select('*')
      .eq('project_id', projectId)
      .is('task_id', null)
      .order('pushed_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    return NextResponse.json({ commits: commits || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch unlinked commits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
