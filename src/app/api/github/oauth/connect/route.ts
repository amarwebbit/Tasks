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

  if (!clientId) {
    return NextResponse.json(
      { error: 'GITHUB_CLIENT_ID is not configured in environment variables.' },
      { status: 500 }
    );
  }

  const callbackUrl = `${appUrl}/api/github/oauth/callback`;

  // Full repo scope for both public and private repositories and webhook access
  const scope = 'repo read:user user:email';
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    callbackUrl
  )}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(githubAuthUrl);
}
