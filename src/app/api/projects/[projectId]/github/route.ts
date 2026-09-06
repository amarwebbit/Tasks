import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

    const { data: settings, error } = await supabase
      .from('project_github_settings')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw error;

    if (!settings) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      id: settings.id,
      repo_full_name: settings.repo_full_name,
      webhook_secret: settings.webhook_secret,
      has_github_token: !!settings.github_token,
      default_branch: settings.default_branch,
      is_active: settings.is_active,
      created_at: settings.created_at,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await req.json();
    const { repo_full_name, default_branch, github_token } = body;

    if (!repo_full_name) {
      return NextResponse.json({ error: 'Repository name (e.g. org/repo) is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Check existing settings
    const { data: existing } = await supabase
      .from('project_github_settings')
      .select('webhook_secret')
      .eq('project_id', projectId)
      .maybeSingle();

    const webhookSecret = existing?.webhook_secret || crypto.randomBytes(32).toString('hex');
    const cleanRepoName = repo_full_name.trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');

    if (!cleanRepoName.includes('/') || cleanRepoName.split('/').length !== 2) {
      return NextResponse.json({ error: 'Please enter a valid repository format "owner/repo" (e.g. amarwebbit/Tasks)' }, { status: 400 });
    }

    // Verify repository exists and is accessible on GitHub
    const effectiveToken = github_token?.trim() || req.cookies.get('gh_token')?.value || null;
    const testHeaders: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Trinetra-Tasks-App',
    };
    if (effectiveToken) {
      testHeaders['Authorization'] = `token ${effectiveToken}`;
    }

    try {
      const checkRes = await fetch(`https://api.github.com/repos/${cleanRepoName}`, { headers: testHeaders });
      if (!checkRes.ok) {
        if (checkRes.status === 404) {
          return NextResponse.json(
            { error: `Repository "${cleanRepoName}" was not found on GitHub. If this repository is private, please provide a GitHub Personal Access Token.` },
            { status: 400 }
          );
        } else if (checkRes.status === 401) {
          return NextResponse.json(
            { error: 'GitHub returned 401 Unauthorized. Please verify your Personal Access Token.' },
            { status: 400 }
          );
        }
      }
    } catch (checkErr) {
      console.warn('Could not verify GitHub repo connectivity:', checkErr);
    }

    // Auto-create webhook on GitHub if token is available
    let webhookCreated = false;
    if (effectiveToken) {
      try {
        const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
        const appUrl = rawAppUrl.startsWith('http') ? rawAppUrl : `https://${rawAppUrl}`;
        const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/webhooks/github`;

        const hookRes = await fetch(`https://api.github.com/repos/${cleanRepoName}/hooks`, {
          method: 'POST',
          headers: {
            Authorization: `token ${effectiveToken}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Trinetra-Tasks-App',
          },
          body: JSON.stringify({
            name: 'web',
            active: true,
            events: ['push', 'pull_request'],
            config: {
              url: webhookUrl,
              content_type: 'json',
              secret: webhookSecret,
              insecure_ssl: '0',
            },
          }),
        });

        if (hookRes.ok || hookRes.status === 422) {
          webhookCreated = true;
        }
      } catch (hookErr) {
        console.warn('Auto-create webhook notice:', hookErr);
      }
    }

    const { data: updated, error } = await supabase
      .from('project_github_settings')
      .upsert(
        {
          project_id: projectId,
          repo_full_name: cleanRepoName,
          webhook_secret: webhookSecret,
          github_token: effectiveToken,
          default_branch: default_branch || 'main',
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      webhook_created: webhookCreated,
      settings: {
        id: updated.id,
        repo_full_name: updated.repo_full_name,
        webhook_secret: updated.webhook_secret,
        has_github_token: !!updated.github_token,
        default_branch: updated.default_branch,
        is_active: updated.is_active,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('project_github_settings')
      .delete()
      .eq('project_id', projectId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'GitHub integration disconnected' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
