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
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = getSupabaseClient();

    // Fetch task commits
    const { data: commits, error: commitErr } = await supabase
      .from('task_commits')
      .select('*')
      .eq('task_id', taskId)
      .order('pushed_at', { ascending: false });

    if (commitErr) throw commitErr;

    if (!commits || commits.length === 0) {
      return NextResponse.json({ commits: [] });
    }

    const commitIds = commits.map((c) => c.id);

    // Fetch file changes for all linked commits
    const { data: fileChanges, error: fileErr } = await supabase
      .from('task_commit_file_changes')
      .select('*')
      .in('commit_id', commitIds);

    if (fileErr) throw fileErr;

    // Attach file changes to respective commits
    const enrichedCommits = commits.map((c) => ({
      ...c,
      file_changes: (fileChanges || []).filter((fc) => fc.commit_id === c.id),
    }));

    return NextResponse.json({ commits: enrichedCommits });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch task commits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await req.json();
    const { commit_shas, user_id } = body;

    if (!Array.isArray(commit_shas) || commit_shas.length === 0) {
      return NextResponse.json({ error: 'commit_shas array is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Update commits to point to this task_id
    const { data: updatedCommits, error } = await supabase
      .from('task_commits')
      .update({ task_id: taskId })
      .in('commit_sha', commit_shas)
      .select();

    if (error) throw error;

    // Add activity log
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: user_id || null,
      action: 'CODE_PUSHED',
      new_value: `Manually linked ${commit_shas.length} code commit(s)`,
      details: { commit_shas },
    });

    return NextResponse.json({ success: true, updated: updatedCommits });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to link commits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
