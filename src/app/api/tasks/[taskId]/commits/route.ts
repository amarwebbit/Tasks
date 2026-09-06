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

    // If any linked commit doesn't have file changes yet, fetch them from GitHub
    if (updatedCommits && updatedCommits.length > 0) {
      try {
        const projectId = updatedCommits[0].project_id;
        const { data: settings } = await supabase
          .from('project_github_settings')
          .select('repo_full_name, github_token')
          .eq('project_id', projectId)
          .maybeSingle();

        if (settings?.repo_full_name) {
          const headers: Record<string, string> = {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Trinetra-Tasks-App',
          };
          const token = settings.github_token || req.cookies.get('gh_token')?.value || process.env.GITHUB_CLIENT_SECRET;
          if (token) headers['Authorization'] = `token ${token}`;

          for (const c of updatedCommits) {
            const { count } = await supabase
              .from('task_commit_file_changes')
              .select('*', { count: 'exact', head: true })
              .eq('commit_id', c.id);

            if (!count || count === 0) {
              const res = await fetch(`https://api.github.com/repos/${settings.repo_full_name}/commits/${c.commit_sha}`, { headers });
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.files) && data.files.length > 0) {
                  const payload = data.files.map((f: any) => ({
                    commit_id: c.id,
                    filename: f.filename,
                    status: f.status || 'modified',
                    additions: f.additions || 0,
                    deletions: f.deletions || 0,
                    patch: f.patch || null,
                  }));
                  await supabase.from('task_commit_file_changes').insert(payload);

                  await supabase.from('task_commits').update({
                    total_additions: data.stats?.additions || 0,
                    total_deletions: data.stats?.deletions || 0,
                    files_count: data.files.length,
                  }).eq('id', c.id);
                }
              }
            }
          }
        }
      } catch (diffErr) {
        console.warn('Failed fetching diff for manually linked commit:', diffErr);
      }
    }

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
