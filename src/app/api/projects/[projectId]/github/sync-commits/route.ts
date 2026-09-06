import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractTaskKeyNumbers } from '@/lib/github';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const getSupabaseClient = () => {
  const key = serviceRoleKey && serviceRoleKey !== 'your-service-role-key-here' ? serviceRoleKey : supabaseAnonKey;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = getSupabaseClient();

    // 1. Fetch project GitHub settings and project details
    const { data: settings, error: settingsErr } = await supabase
      .from('project_github_settings')
      .select('*, projects!inner(id, project_key)')
      .eq('project_id', projectId)
      .maybeSingle();

    if (settingsErr || !settings) {
      return NextResponse.json(
        { error: 'No GitHub repository configured for this project' },
        { status: 404 }
      );
    }

    const repoFullName = settings.repo_full_name;
    const projectKey = settings.projects?.project_key || '';
    const ghToken = settings.github_token || req.cookies.get('gh_token')?.value || null;

    // 2. Fetch past commits from GitHub REST API
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Trinetra-Tasks-App',
    };
    if (ghToken) {
      headers['Authorization'] = `token ${ghToken}`;
    }

    const commitsRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/commits?per_page=50`,
      { headers }
    );

    if (!commitsRes.ok) {
      const errData = await commitsRes.json().catch(() => ({}));
      if (commitsRes.status === 401) {
        throw new Error('GitHub token or session has expired. Please reconnect your repository to restore live commit syncing.');
      }
      if (commitsRes.status === 404) {
        throw new Error(`Repository "${repoFullName}" was not found or is private. If it is private, please provide a GitHub Personal Access Token.`);
      }
      throw new Error(errData.message || `Failed fetching commits from GitHub (${commitsRes.statusText})`);
    }

    const githubCommits = await commitsRes.json();
    if (!Array.isArray(githubCommits)) {
      return NextResponse.json({ synced_count: 0 });
    }

    let syncedCount = 0;

    for (const commitObj of githubCommits) {
      const commitSha = commitObj.sha;
      const commitMessage = commitObj.commit?.message || '';
      const commitUrl = commitObj.html_url || '';
      const authorEmail = commitObj.commit?.author?.email || '';
      const authorUsername = commitObj.author?.login || commitObj.commit?.author?.name || '';
      const timestamp = commitObj.commit?.author?.date || new Date().toISOString();

      // Find platform user profile by email or GitHub username
      let matchedUserId: string | null = null;
      if (authorEmail || authorUsername) {
        const { data: matchedProfile } = await supabase
          .from('profiles')
          .select('id')
          .or(`email.eq.${authorEmail},github_username.ilike.${authorUsername}`)
          .maybeSingle();

        if (matchedProfile) {
          matchedUserId = matchedProfile.id;
        }
      }

      // Check if commit message contains a task key number
      const taskNumbers = extractTaskKeyNumbers(commitMessage, projectKey);
      let matchedTaskId: string | null = null;

      if (taskNumbers.length > 0) {
        const { data: matchedTask } = await supabase
          .from('tasks')
          .select('id')
          .eq('project_id', projectId)
          .in('task_number', taskNumbers)
          .maybeSingle();

        if (matchedTask) {
          matchedTaskId = matchedTask.id;
        }
      }

      // Fetch detailed commit files & diff patches
      let detailedFiles: Array<{
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        patch?: string;
      }> = [];

      let totalAdded = 0;
      let totalRemoved = 0;
      let totalFiles = 0;

      try {
        const detailRes = await fetch(
          `https://api.github.com/repos/${repoFullName}/commits/${commitSha}`,
          { headers }
        );

        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData.stats) {
            totalAdded = detailData.stats.additions || 0;
            totalRemoved = detailData.stats.deletions || 0;
          }
          if (Array.isArray(detailData.files)) {
            totalFiles = detailData.files.length;
            detailedFiles = detailData.files.map((f: any) => ({
              filename: f.filename,
              status: f.status || 'modified',
              additions: f.additions || 0,
              deletions: f.deletions || 0,
              patch: f.patch,
            }));
          }
        }
      } catch (detErr) {
        console.warn(`Could not fetch details for commit ${commitSha}:`, detErr);
      }

      // Upsert into task_commits
      const { data: insertedCommit, error: commitErr } = await supabase
        .from('task_commits')
        .upsert(
          {
            project_id: projectId,
            task_id: matchedTaskId,
            user_id: matchedUserId,
            commit_sha: commitSha,
            branch: settings.default_branch || 'main',
            commit_message: commitMessage,
            author_github_username: authorUsername,
            author_email: authorEmail,
            commit_url: commitUrl,
            total_additions: totalAdded,
            total_deletions: totalRemoved,
            files_count: totalFiles,
            pushed_at: timestamp,
          },
          { onConflict: 'project_id,commit_sha' }
        )
        .select()
        .single();

      if (commitErr) continue;

      syncedCount++;
      const commitId = insertedCommit.id;

      // Store file-level changes & patches
      if (detailedFiles.length > 0) {
        const fileChangesPayload = detailedFiles.map((f) => ({
          commit_id: commitId,
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch || null,
        }));

        await supabase.from('task_commit_file_changes').delete().eq('commit_id', commitId);
        await supabase.from('task_commit_file_changes').insert(fileChangesPayload);
      }
    }

    return NextResponse.json({
      success: true,
      synced_count: syncedCount,
      message: `Successfully imported ${syncedCount} past commit(s) from ${repoFullName}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to sync past commits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
