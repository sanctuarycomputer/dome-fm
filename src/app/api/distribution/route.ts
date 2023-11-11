import gitCommitInfo from 'git-commit-info';
import { NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

export async function GET(request: Request) {

  const commits = await new Octokit().rest.repos.listCommits({
    owner: "sanctuarycomputer",
    repo: "dome-fm"
  });
  
  const commitInfo = gitCommitInfo();
  
  return NextResponse.json({
    latestDomeSHA: commits.data[0].sha,
    currentForkSHA: commitInfo.hash
  }, { status: 200 });
}