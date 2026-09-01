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

function formatAppUrl(urlStr: string): string {
  let cleaned = urlStr.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = cleaned.includes('localhost') ? `http://${cleaned}` : `https://${cleaned}`;
  }
  return cleaned.replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const installationId = searchParams.get('installation_id');
  const stateStr = searchParams.get('state');

  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const appUrl = formatAppUrl(rawAppUrl);
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  let projectId = '';
  let projectKey = '';
  let redirectPath = '';

  try {
    if (stateStr) {
      const parsed = JSON.parse(stateStr);
      projectId = parsed.projectId || '';
      projectKey = parsed.projectKey || '';
      redirectPath = parsed.redirectPath || '';
    }
  } catch (_) { }

  const supabase = getSupabaseClient();

  // If projectKey is missing but projectId is present, fetch the short project_key (e.g. "TRI")
  if (!projectKey && projectId) {
    const { data: proj } = await supabase
      .from('projects')
      .select('project_key')
      .eq('id', projectId)
      .maybeSingle();

    if (proj?.project_key) {
      projectKey = proj.project_key;
    }
  }

  // Determine final target redirect path (e.g. /projects/TRI?github_connected=true)
  const destinationPath = redirectPath || (projectKey ? `/projects/${projectKey}?github_connected=true` : '/');

  // Handle case where GitHub App installation returned installation_id without user code
  if (installationId && !code) {
    const response = NextResponse.redirect(`${appUrl}${destinationPath}`);
    response.cookies.set('gh_installation_id', installationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  }

  if (!code || !clientId || !clientSecret) {
    // If no code and no installation_id, redirect back to destination
    return NextResponse.redirect(`${appUrl}${destinationPath}`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('GitHub token exchange error:', tokenData);
      return NextResponse.redirect(`${appUrl}${destinationPath}`);
    }

    // 2. Fetch user profile from GitHub
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`,
        'User-Agent': 'Trinetra-Tasks-App',
      },
    });

    if (userRes.ok) {
      const githubUser = await userRes.json();
      const githubUsername = githubUser.login;
      const githubEmail = githubUser.email;

      // 3. Update profile with GitHub username
      if (githubUsername || githubEmail) {
        await supabase
          .from('profiles')
          .update({ github_username: githubUsername })
          .or(`email.eq.${githubEmail},github_username.ilike.${githubUsername}`);
      }
    }

    // Create redirect response to the correct /projects/[projectKey] route
    const response = NextResponse.redirect(`${appUrl}${destinationPath}`);

    // Store GitHub token in an HTTP-only secure cookie for repository listing
    response.cookies.set('gh_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('OAuth Callback error:', err);
    return NextResponse.redirect(`${appUrl}${destinationPath}`);
  }
}
