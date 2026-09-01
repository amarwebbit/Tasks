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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await req.json();
    const { repo_full_name, default_branch } = body;

    const ghToken = req.cookies.get('gh_token')?.value || req.headers.get('x-github-token');

    if (!repo_full_name) {
      return NextResponse.json({ error: 'repo_full_name is required' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const webhookUrl = `${appUrl}/api/webhooks/github`;
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    let webhookCreated = false;
    let webhookErrorReason = '';

    // If GitHub OAuth access token is available, automatically create the Webhook on GitHub.com
    if (ghToken) {
      try {
        const createHookRes = await fetch(`https://api.github.com/repos/${repo_full_name}/hooks`, {
          method: 'POST',
          headers: {
            Authorization: `token ${ghToken}`,
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

        if (createHookRes.ok || createHookRes.status === 422) {
          webhookCreated = true;
        } else {
          const errBody = await createHookRes.json();
          webhookErrorReason = errBody.message || 'Could not auto-create webhook on GitHub';
        }
      } catch (err: unknown) {
        console.error('Failed auto-creating GitHub webhook:', err);
      }
    }

    // Save project_github_settings in database
    const supabase = getSupabaseClient();
    const { data: settings, error } = await supabase
      .from('project_github_settings')
      .upsert(
        {
          project_id: projectId,
          repo_full_name: repo_full_name.trim(),
          webhook_secret: webhookSecret,
          github_token: ghToken || null,
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
      webhook_error: webhookErrorReason || undefined,
      settings: {
        id: settings.id,
        repo_full_name: settings.repo_full_name,
        webhook_secret: settings.webhook_secret,
        default_branch: settings.default_branch,
        is_active: settings.is_active,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed auto-connecting repository';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
