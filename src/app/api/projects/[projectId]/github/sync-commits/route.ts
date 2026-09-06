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
      `https://api.github.com/repos/${repoFullName}/commits?per_page=30`,
      { headers }
    );

    if (!commitsRes.ok) {
      const errData = await commitsRes.json().catch(() => ({}));
      if (commitsRes.status === 401) {
        throw new Error('GitHub token or session has expired. Please reconnect your repository to restore live commit syncing.');
      }
      if (commitsRes.status === 404) {
        throw new Error(`Repository "${repoFullName}" was not found or is private. Please reconnect or authorize repository access.`);
      }
      if (commitsRes.status === 403) {
        throw new Error(errData.message || 'GitHub API rate limit exceeded or access forbidden. Please check your repository permissions.');
      }
      throw new Error(errData.message || `Failed fetching commits from GitHub (${commitsRes.statusText})`);
    }

    const githubCommits = await commitsRes.json();
    if (!Array.isArray(githubCommits) || githubCommits.length === 0) {
      return NextResponse.json({ synced_count: 0, message: 'No commits found in repository.' });
    }

    // 3. Parallel fetch of project tasks and user profiles for fast in-memory matching
    const [tasksRes, profilesRes] = await Promise.all([
      supabase.from('tasks').select('id, task_number').eq('project_id', projectId),
      supabase.from('profiles').select('id, email, github_username'),
    ]);

    const projectTasks = tasksRes.data || [];
    const allProfiles = profilesRes.data || [];

    const taskMap = new Map<number, string>(projectTasks.map((t) => [t.task_number, t.id]));
    const emailMap = new Map<string, string>(
      allProfiles.filter((p) => p.email).map((p) => [p.email.toLowerCase(), p.id])
    );
    const usernameMap = new Map<string, string>(
      allProfiles.filter((p) => p.github_username).map((p) => [p.github_username.toLowerCase(), p.id])
    );

    // 4. Map commits in memory
    interface PreparedCommit {
      project_id: string;
      task_id: string | null;
      user_id: string | null;
      commit_sha: string;
      branch: string;
      commit_message: string;
      author_github_username: string;
      author_email: string;
      commit_url: string;
      total_additions: number;
      total_deletions: number;
      files_count: number;
      pushed_at: string;
      _files?: Array<{
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        patch: string | null;
      }>;
    }

    const processedCommits: PreparedCommit[] = [];
    const commitsNeedingDetails: PreparedCommit[] = [];

    for (const commitObj of githubCommits) {
      const commitSha = commitObj.sha;
      const commitMessage = commitObj.commit?.message || '';
      const commitUrl = commitObj.html_url || '';
      const authorEmail = commitObj.commit?.author?.email || '';
      const authorUsername = commitObj.author?.login || commitObj.commit?.author?.name || '';
      const timestamp = commitObj.commit?.author?.date || new Date().toISOString();

      const matchedUserId =
        (authorEmail && emailMap.get(authorEmail.toLowerCase())) ||
        (authorUsername && usernameMap.get(authorUsername.toLowerCase())) ||
        null;

      const taskNums = extractTaskKeyNumbers(commitMessage, projectKey);
      let matchedTaskId: string | null = null;
      for (const num of taskNums) {
        if (taskMap.has(num)) {
          matchedTaskId = taskMap.get(num)!;
          break;
        }
      }

      const record: PreparedCommit = {
        project_id: projectId,
        task_id: matchedTaskId,
        user_id: matchedUserId,
        commit_sha: commitSha,
        branch: settings.default_branch || 'main',
        commit_message: commitMessage,
        author_github_username: authorUsername,
        author_email: authorEmail,
        commit_url: commitUrl,
        total_additions: 0,
        total_deletions: 0,
        files_count: 0,
        pushed_at: timestamp,
      };

      processedCommits.push(record);

      // Fetch file diffs concurrently only for commits that match tasks or top 5 recent commits
      if (matchedTaskId || processedCommits.length <= 5) {
        commitsNeedingDetails.push(record);
      }
    }

    // 5. Fetch diff stats in parallel for matched commits
    const detailsPromises = commitsNeedingDetails.map(async (record) => {
      try {
        const detailRes = await fetch(
          `https://api.github.com/repos/${repoFullName}/commits/${record.commit_sha}`,
          { headers }
        );
        if (detailRes.ok) {
          const detail = await detailRes.json();
          record.total_additions = detail.stats?.additions || 0;
          record.total_deletions = detail.stats?.deletions || 0;
          record.files_count = Array.isArray(detail.files) ? detail.files.length : 0;
          record._files = Array.isArray(detail.files)
            ? detail.files.map((f: any) => ({
                filename: f.filename,
                status: f.status || 'modified',
                additions: f.additions || 0,
                deletions: f.deletions || 0,
                patch: f.patch || null,
              }))
            : [];
        }
      } catch (err) {
        console.warn(`Could not fetch details for ${record.commit_sha}:`, err);
      }
    });

    await Promise.allSettled(detailsPromises);

    // 6. Batch upsert commits into task_commits
    const upsertPayload = processedCommits.map((c) => {
      const { _files, ...dbRecord } = c;
      return dbRecord;
    });

    const { data: upsertedCommits, error: upsertErr } = await supabase
      .from('task_commits')
      .upsert(upsertPayload, { onConflict: 'project_id,commit_sha' })
      .select('id, commit_sha');

    if (upsertErr) {
      console.error('Failed to upsert commits:', upsertErr);
      throw new Error(`Database error saving commits: ${upsertErr.message}`);
    }

    const shaToIdMap = new Map<string, string>(
      (upsertedCommits || []).map((uc) => [uc.commit_sha, uc.id])
    );

    // 7. Store file-level changes & patches
    const allFileChanges: Array<{
      commit_id: string;
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      patch: string | null;
    }> = [];
    const commitIdsWithFiles: string[] = [];

    for (const c of commitsNeedingDetails) {
      const commitId = shaToIdMap.get(c.commit_sha);
      if (commitId && c._files && c._files.length > 0) {
        commitIdsWithFiles.push(commitId);
        for (const f of c._files) {
          allFileChanges.push({
            commit_id: commitId,
            ...f,
          });
        }
      }
    }

    if (commitIdsWithFiles.length > 0) {
      await supabase.from('task_commit_file_changes').delete().in('commit_id', commitIdsWithFiles);
      if (allFileChanges.length > 0) {
        await supabase.from('task_commit_file_changes').insert(allFileChanges);
      }
    }

    const syncedCount = upsertedCommits?.length || 0;

    return NextResponse.json({
      success: true,
      synced_count: syncedCount,
      message: `Successfully synced ${syncedCount} past commit(s) from ${repoFullName}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to sync past commits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
