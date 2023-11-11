import gitCommitInfo from 'git-commit-info';
import { NextResponse } from 'next/server'

const gitInfo = gitCommitInfo();

export const revalidate = 0;
export async function GET(request: Request) {
  const response = await fetch('https://api.github.com/repos/sanctuarycomputer/dome-fm/git/refs/heads/main', {
    cache: 'no-store'
  });
  
  return NextResponse.json({
    latestDomeSHA: (await response.json()).object.sha,
    currentRepoSHA: gitInfo.hash
  }, { 
    status: 200,
  });
}