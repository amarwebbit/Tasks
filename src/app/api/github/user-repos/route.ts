import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const ghToken = req.cookies.get('gh_token')?.value || req.headers.get('x-github-token');

    if (!ghToken) {
      return NextResponse.json({ authenticated: false, repos: [] });
    }

    // Fetch user repositories from GitHub REST API
    const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&type=all', {
      headers: {
        Authorization: `token ${ghToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Trinetra-Tasks-App',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ authenticated: false, repos: [] });
      }
      throw new Error(`GitHub API error: ${res.statusText}`);
    }

    const reposData = await res.json();

    const repos = reposData.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      default_branch: repo.default_branch || 'main',
      description: repo.description,
      owner: {
        login: repo.owner?.login,
        avatar_url: repo.owner?.avatar_url,
      },
    }));

    return NextResponse.json({ authenticated: true, repos });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch repositories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
