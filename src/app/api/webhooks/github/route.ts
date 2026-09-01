import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyGitHubSignature, extractTaskKeyNumbers } from '@/lib/github';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const getSupabaseClient = () => {
  const key = serviceRoleKey && serviceRoleKey !== 'your-service-role-key-here' ? serviceRoleKey : supabaseAnonKey;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');
    const event = req.headers.get('x-github-event');

    if (!rawBody) {
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);

    // 1. Handle GitHub 'ping' event (sent when creating or editing a webhook)
    if (event === 'ping') {
      return NextResponse.json({ message: 'pong', success: true }, { status: 200 });
    }

    // We primarily process 'push' events
    if (event !== 'push') {
      return NextResponse.json({ message: `Ignored event: ${event}` }, { status: 200 });
    }

    const rawRepoName = payload.repository?.full_name; // e.g. "amarwebbit/Tasks"
    if (!rawRepoName) {
      return NextResponse.json({ error: 'Missing repository info' }, { status: 400 });
    }

    const repoFullName = rawRepoName.trim();
    const supabase = getSupabaseClient();

    // 2. Fetch project GitHub settings by repository full name (case-insensitive)
    const { data: githubSettings, error: settingsErr } = await supabase
      .from('project_github_settings')
      .select('*, projects!inner(id, project_key)')
      .ilike('repo_full_name', repoFullName)
      .eq('is_active', true)
      .maybeSingle();

    if (settingsErr || !githubSettings) {
      console.warn(`Webhook received for unregistered repo: ${repoFullName}`);
      return NextResponse.json(
        { error: `No active project configured for repository ${repoFullName}` },
        { status: 404 }
      );
    }

    // 3. Verify HMAC Signature (Check project secret or global GITHUB_WEBHOOK_SECRET)
    const projectSecret = githubSettings.webhook_secret;
    const globalSecret = process.env.GITHUB_WEBHOOK_SECRET || '';

    const isValidProjectSig = projectSecret ? verifyGitHubSignature(rawBody, signature, projectSecret) : false;
    const isValidGlobalSig = globalSecret ? verifyGitHubSignature(rawBody, signature, globalSecret) : false;

    if (signature && !isValidProjectSig && !isValidGlobalSig) {
      console.error(`Invalid HMAC signature for repo ${repoFullName}`);
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
    }

    const projectId = githubSettings.project_id;
    const projectKey = githubSettings.projects?.project_key || '';
    const branch = payload.ref ? payload.ref.replace('refs/heads/', '') : 'main';

    const commits = payload.commits || [];
    if (commits.length === 0 && payload.head_commit) {
      commits.push(payload.head_commit);
    }

    let processedCount = 0;
    const authToken = githubSettings.github_token || process.env.GITHUB_CLIENT_SECRET;

    for (const commit of commits) {
      const commitSha = commit.id;
      const commitMessage = commit.message || '';
      const commitUrl = commit.url || '';
      const authorEmail = commit.author?.email || commit.committer?.email || '';
      const authorUsername = commit.author?.username || commit.committer?.username || '';
      const timestamp = commit.timestamp || new Date().toISOString();

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

      // Extract task numbers from commit message or branch name (e.g. TRI-001 or TRI-1)
      const taskNumbers = extractTaskKeyNumbers(`${commitMessage} ${branch}`, projectKey);
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

      // Try fetching rich file diff patches from GitHub REST API if accessible
      let detailedFiles: Array<{
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        patch?: string;
      }> = [];

      let totalAdded = (commit.added?.length || 0) + (commit.modified?.length || 0);
      let totalRemoved = commit.removed?.length || 0;
      let totalFiles = (commit.added?.length || 0) + (commit.modified?.length || 0) + (commit.removed?.length || 0);

      try {
        const headers: Record<string, string> = {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Trinetra-Tasks-App',
        };
        if (authToken) {
          headers['Authorization'] = `token ${authToken}`;
        }

        const commitApiRes = await fetch(
          `https://api.github.com/repos/${repoFullName}/commits/${commitSha}`,
          { headers }
        );

        if (commitApiRes.ok) {
          const commitApiData = await commitApiRes.json();
          if (commitApiData.stats) {
            totalAdded = commitApiData.stats.additions || totalAdded;
            totalRemoved = commitApiData.stats.deletions || totalRemoved;
          }
          if (Array.isArray(commitApiData.files)) {
            totalFiles = commitApiData.files.length;
            detailedFiles = commitApiData.files.map((f: any) => ({
              filename: f.filename,
              status: f.status || 'modified',
              additions: f.additions || 0,
              deletions: f.deletions || 0,
              patch: f.patch,
            }));
          }
        }
      } catch (apiErr) {
        console.warn('Could not fetch rich diff from GitHub API:', apiErr);
      }

      // Fallback file changes if GitHub API is unavailable
      if (detailedFiles.length === 0) {
        (commit.added || []).forEach((file: string) => {
          detailedFiles.push({ filename: file, status: 'added', additions: 1, deletions: 0 });
        });
        (commit.modified || []).forEach((file: string) => {
          detailedFiles.push({ filename: file, status: 'modified', additions: 1, deletions: 0 });
        });
        (commit.removed || []).forEach((file: string) => {
          detailedFiles.push({ filename: file, status: 'deleted', additions: 0, deletions: 1 });
        });
      }

      // 4. Upsert task_commits
      const { data: insertedCommit, error: commitErr } = await supabase
        .from('task_commits')
        .upsert(
          {
            project_id: projectId,
            task_id: matchedTaskId,
            user_id: matchedUserId,
            commit_sha: commitSha,
            branch: branch,
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

      if (commitErr) {
        console.error('Failed to insert commit record:', commitErr);
        continue;
      }

      processedCount++;
      const commitId = insertedCommit.id;

      // 5. Store file-level changes & patches
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

      // 6. Log timeline activity event if attached to a task
      if (matchedTaskId) {
        await supabase.from('task_activity').insert({
          task_id: matchedTaskId,
          user_id: matchedUserId,
          action: 'CODE_PUSHED',
          new_value: `Pushed commit ${commitSha.substring(0, 7)} to branch ${branch}`,
          details: {
            commit_sha: commitSha,
            commit_message: commitMessage,
            branch: branch,
            author: authorUsername || authorEmail,
            url: commitUrl,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${processedCount} commit(s) for ${repoFullName}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('GitHub Webhook Processing Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
