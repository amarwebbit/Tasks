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
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    const supabase = getSupabaseClient();

    // 1. Check existing unlinked commits in database
    const { data: existingCommits } = await supabase
      .from('task_commits')
      .select('*')
      .eq('project_id', projectId)
      .is('task_id', null)
      .order('pushed_at', { ascending: false })
      .limit(30);

    // 2. If no unlinked commits exist or user requested a refresh, fetch live from GitHub
    if (forceRefresh || !existingCommits || existingCommits.length === 0) {
      const { data: settings } = await supabase
        .from('project_github_settings')
        .select('repo_full_name, github_token')
        .eq('project_id', projectId)
        .maybeSingle();

      if (settings?.repo_full_name) {
        try {
          const headers: Record<string, string> = {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Trinetra-Tasks-App',
          };
          const token = settings.github_token || req.cookies.get('gh_token')?.value || process.env.GITHUB_CLIENT_SECRET;
          if (token) {
            headers['Authorization'] = `token ${token}`;
          }

          const ghRes = await fetch(
            `https://api.github.com/repos/${settings.repo_full_name}/commits?per_page=30`,
            { headers }
          );

          if (ghRes.ok) {
            const ghCommits = await ghRes.json();
            if (Array.isArray(ghCommits)) {
              for (const c of ghCommits) {
                const sha = c.sha;
                if (!sha) continue;

                // Check if already in database
                const { data: existing } = await supabase
                  .from('task_commits')
                  .select('id, task_id')
                  .eq('project_id', projectId)
                  .eq('commit_sha', sha)
                  .maybeSingle();

                // If not in database, insert as unlinked commit
                if (!existing) {
                  await supabase.from('task_commits').insert({
                    project_id: projectId,
                    task_id: null,
                    commit_sha: sha,
                    commit_message: c.commit?.message || 'Update',
                    author_github_username: c.author?.login || c.commit?.author?.name || '',
                    author_email: c.commit?.author?.email || '',
                    commit_url: c.html_url || '',
                    branch: 'main',
                    total_additions: 0,
                    total_deletions: 0,
                    files_count: 0,
                    pushed_at: c.commit?.author?.date || new Date().toISOString(),
                  });
                }
              }
            }
          }
        } catch (fetchErr) {
          console.warn('Failed live GitHub fetch in unlinked-commits:', fetchErr);
        }
      }
    }

    // 3. Re-query all unlinked commits
    const { data: finalCommits, error } = await supabase
      .from('task_commits')
      .select('*')
      .eq('project_id', projectId)
      .is('task_id', null)
      .order('pushed_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    return NextResponse.json({ commits: finalCommits || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch unlinked commits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
