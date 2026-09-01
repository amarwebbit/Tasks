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

    // We primarily handle 'push' events
    if (event !== 'push') {
      return NextResponse.json({ message: `Ignored event: ${event}` }, { status: 200 });
    }

    const repoFullName = payload.repository?.full_name; // e.g. "username/repo"
    if (!repoFullName) {
      return NextResponse.json({ error: 'Missing repository info' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 1. Fetch project GitHub settings by repository full name
    const { data: githubSettings, error: settingsErr } = await supabase
      .from('project_github_settings')
      .select('*, projects!inner(id, project_key)')
      .ilike('repo_full_name', repoFullName)
      .eq('is_active', true)
      .maybeSingle();

    if (settingsErr || !githubSettings) {
      return NextResponse.json(
        { error: `No active GitHub integration found for repo ${repoFullName}` },
        { status: 404 }
      );
    }

    // 2. Verify HMAC Signature
    const isValidSignature = verifyGitHubSignature(
      rawBody,
      signature,
      githubSettings.webhook_secret
    );

    if (!isValidSignature) {
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

    for (const commit of commits) {
      const commitSha = commit.id;
      const commitMessage = commit.message || '';
      const commitUrl = commit.url || '';
      const authorEmail = commit.author?.email || commit.committer?.email || '';
      const authorUsername = commit.author?.username || commit.committer?.username || '';
      const timestamp = commit.timestamp || new Date().toISOString();

      // Find user profile by email or GitHub username
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

      // Check if commit message or branch name references a task
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

      const totalAdded = (commit.added?.length || 0) + (commit.modified?.length || 0);
      const totalRemoved = commit.removed?.length || 0;
      const totalFiles = (commit.added?.length || 0) + (commit.modified?.length || 0) + (commit.removed?.length || 0);

      // 3. Upsert into task_commits
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
        console.error('Failed to insert commit:', commitErr);
        continue;
      }

      processedCount++;

      // 4. Store file level changes
      const commitId = insertedCommit.id;
      const fileChanges: Array<{
        commit_id: string;
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        patch?: string;
      }> = [];

      (commit.added || []).forEach((file: string) => {
        fileChanges.push({
          commit_id: commitId,
          filename: file,
          status: 'added',
          additions: 1,
          deletions: 0,
        });
      });

      (commit.modified || []).forEach((file: string) => {
        fileChanges.push({
          commit_id: commitId,
          filename: file,
          status: 'modified',
          additions: 1,
          deletions: 0,
        });
      });

      (commit.removed || []).forEach((file: string) => {
        fileChanges.push({
          commit_id: commitId,
          filename: file,
          status: 'deleted',
          additions: 0,
          deletions: 1,
        });
      });

      if (fileChanges.length > 0) {
        // Delete previous file changes for this commit SHA to avoid duplicates
        await supabase.from('task_commit_file_changes').delete().eq('commit_id', commitId);
        await supabase.from('task_commit_file_changes').insert(fileChanges);
      }

      // 5. If linked to a task, add an activity record
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
    console.error('GitHub Webhook Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
