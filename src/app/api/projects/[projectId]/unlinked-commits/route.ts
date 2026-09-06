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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId') || null;
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    const supabase = getSupabaseClient();

    // 1. Fetch project GitHub settings and project details
    const { data: settings } = await supabase
      .from('project_github_settings')
      .select('*, projects!inner(id, project_key)')
      .eq('project_id', projectId)
      .maybeSingle();

    // Check count of existing commits in database
    const { count: existingCount } = await supabase
      .from('task_commits')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    // 2. If forceRefresh is requested or no commits exist in database, fetch live from GitHub
    if ((forceRefresh || !existingCount || existingCount === 0) && settings?.repo_full_name) {
      try {
        const repoFullName = settings.repo_full_name;
        const projectKey = settings.projects?.project_key || '';
        const ghToken = settings.github_token || req.cookies.get('gh_token')?.value || null;

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
          if (commitsRes.status === 401) {
            console.warn('GitHub token expired during unlinked commits fetch');
          }
        } else {
          const githubCommits = await commitsRes.json();
          if (Array.isArray(githubCommits) && githubCommits.length > 0) {
            // Parallel fetch of project tasks and profiles for fast in-memory matching
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

            // Fetch existing commit task_ids so we don't overwrite manually linked commits
            const { data: existingCommits } = await supabase
              .from('task_commits')
              .select('commit_sha, task_id')
              .eq('project_id', projectId);
            const existingTaskMap = new Map((existingCommits || []).map((ec) => [ec.commit_sha, ec.task_id]));

            const processedCommits: Array<{
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
            }> = [];

            const commitsNeedingDetails: typeof processedCommits = [];

            for (const c of githubCommits) {
              const commitSha = c.sha;
              if (!commitSha) continue;

              const commitMessage = c.commit?.message || '';
              const commitUrl = c.html_url || '';
              const authorEmail = c.commit?.author?.email || '';
              const authorUsername = c.author?.login || c.commit?.author?.name || '';
              const timestamp = c.commit?.author?.date || new Date().toISOString();

              const matchedUserId =
                (authorEmail && emailMap.get(authorEmail.toLowerCase())) ||
                (authorUsername && usernameMap.get(authorUsername.toLowerCase())) ||
                null;

              // Preserve existing manual task link if already present
              let matchedTaskId: string | null = existingTaskMap.get(commitSha) || null;

              // If unlinked, try auto-matching via task key in commit message
              if (!matchedTaskId && projectKey) {
                const taskNums = extractTaskKeyNumbers(commitMessage, projectKey);
                for (const num of taskNums) {
                  if (taskMap.has(num)) {
                    matchedTaskId = taskMap.get(num)!;
                    break;
                  }
                }
              }

              const record = {
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

              if (matchedTaskId || processedCommits.length <= 5) {
                commitsNeedingDetails.push(record);
              }
            }

            // Fetch diff stats in parallel for matched/recent commits
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
              } catch (_) {
                // Ignore detail fetch error
              }
            });

            await Promise.allSettled(detailsPromises);

            // Batch upsert commits
            const upsertPayload = processedCommits.map((c) => {
              const { _files, ...dbRecord } = c;
              return dbRecord;
            });

            const { data: upsertedCommits } = await supabase
              .from('task_commits')
              .upsert(upsertPayload, { onConflict: 'project_id,commit_sha' })
              .select('id, commit_sha');

            const shaToIdMap = new Map<string, string>(
              (upsertedCommits || []).map((uc) => [uc.commit_sha, uc.id])
            );

            // Store file changes
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
          }
        }
      } catch (err) {
        console.warn('Failed live GitHub sync in unlinked-commits:', err);
      }
    }

    // 3. Query all recent commits from database
    const { data: dbCommits, error } = await supabase
      .from('task_commits')
      .select('*')
      .eq('project_id', projectId)
      .order('pushed_at', { ascending: false })
      .limit(40);

    if (error) throw error;

    // 4. Annotate commits with linkage status relative to current task
    const annotatedCommits = (dbCommits || []).map((commit) => ({
      ...commit,
      is_linked_to_current_task: Boolean(taskId && commit.task_id === taskId),
      is_linked_to_other_task: Boolean(taskId && commit.task_id && commit.task_id !== taskId),
      is_unlinked: !commit.task_id,
    }));

    return NextResponse.json({
      commits: annotatedCommits,
      refreshed: forceRefresh,
      total_count: annotatedCommits.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch commits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
