import { NextRequest, NextResponse } from 'next/server';

function formatAppUrl(urlStr: string): string {
  let cleaned = urlStr.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = cleaned.includes('localhost') ? `http://${cleaned}` : `https://${cleaned}`;
  }
  return cleaned.replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId') || '';
  const projectKey = searchParams.get('projectKey') || '';
  const redirectPath = searchParams.get('redirectPath') || '';

  const clientId = process.env.GITHUB_CLIENT_ID;
  const appName = process.env.GITHUB_APP_NAME;
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const appUrl = formatAppUrl(rawAppUrl);

  const state = JSON.stringify({ projectId, projectKey, redirectPath });

  // If a GitHub App slug is configured, redirect to GitHub App installation flow for granular repo isolation
  if (appName) {
    const installUrl = `https://github.com/apps/${appName}/installations/new?state=${encodeURIComponent(state)}`;
    return NextResponse.redirect(installUrl);
  }

  if (!clientId) {
    return NextResponse.json(
      { error: 'GITHUB_CLIENT_ID or GITHUB_APP_NAME is not configured in environment variables.' },
      { status: 500 }
    );
  }

  const callbackUrl = `${appUrl}/api/github/oauth/callback`;

  // Lightweight, non-intimidating scopes for standard OAuth
  const scope = 'public_repo read:user user:email';
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    callbackUrl
  )}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(githubAuthUrl);
}
