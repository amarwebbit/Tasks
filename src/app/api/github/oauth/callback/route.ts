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
  const stateStr = searchParams.get('state');

  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const appUrl = formatAppUrl(rawAppUrl);
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  let projectId = '';
  let redirectPath = '';
  try {
    if (stateStr) {
      const parsed = JSON.parse(stateStr);
      projectId = parsed.projectId || '';
      redirectPath = parsed.redirectPath || '';
    }
  } catch (_) {}

  if (!code || !clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/?error=github_oauth_failed`);
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
      return NextResponse.redirect(`${appUrl}/?error=github_token_exchange_failed`);
    }

    // 2. Fetch user profile from GitHub
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`,
        'User-Agent': 'Trinetra-Tasks-App',
      },
    });

    const githubUser = await userRes.json();
    const githubUsername = githubUser.login;
    const githubEmail = githubUser.email;

    // 3. Match with user in Supabase and update profiles
    if (githubUsername || githubEmail) {
      const supabase = getSupabaseClient();
      await supabase
        .from('profiles')
        .update({ github_username: githubUsername })
        .or(`email.eq.${githubEmail},github_username.ilike.${githubUsername}`);
    }

    // Redirect back to project page with access_token in cookie
    const targetUrl = redirectPath || (projectId ? `/projects/${projectId}?github_connected=true` : '/');
    const response = NextResponse.redirect(`${appUrl}${targetUrl}`);
    
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
    return NextResponse.redirect(`${appUrl}/?error=github_callback_error`);
  }
}
