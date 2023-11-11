import gitCommitInfo from 'git-commit-info';
import { NextResponse } from 'next/server'

export const revalidate = 0;
export async function GET(request: Request) {
  const response = await fetch('https://api.github.com/repos/sanctuarycomputer/dome-fm/git/refs/heads/main', {
    cache: 'no-store'
  });

  const domeRepoData = await response.json();
  return NextResponse.json({
    latestDomeSHA: domeRepoData.object.sha,
    currentRepoSHA: (await gitCommitInfo()).hash
  }, { 
    status: 200,
  });
}