import gitCommitInfo from 'git-commit-info';
import { NextResponse } from 'next/server'

export const revalidate = 0;
export async function GET(request: Request) {
  const response = await fetch('https://api.github.com/repos/sanctuarycomputer/dome-fm/git/refs/heads/main', {
    cache: 'no-store'
  });
  
  return NextResponse.json({
    latestDomeSHA: (await response.json()).object.sha,
    currentRepoSHA: (await gitCommitInfo()).hash
  }, { 
    status: 200,
  });
}