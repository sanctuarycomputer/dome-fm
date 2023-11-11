import gitCommitInfo from 'git-commit-info';
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const response = await fetch('https://api.github.com/repos/sanctuarycomputer/dome-fm/git/refs/heads/main', {
    cache: 'no-store'
  });

  const domeRepoData = await response.json();
  return NextResponse.json({
    latestDomeSHA: domeRepoData.object.sha,
    currentRepoSHA: gitCommitInfo().hash
  }, { 
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=1',
      'CDN-Cache-Control': 'public, s-maxage=1',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=1',
    },
  });
}