import { NextRequest, NextResponse } from "next/server";
import {
  getGitHubUser,
  inviteUserToOrganization,
  getOrganizationRepositories,
  getRepositoryTeamMembers,
  inviteUserToRepository,
  getUserRepositoryActivity,
  getMergedPRsInOtherRepos,
  getUserCommitsSince,
  getEffectiveRepoUserCount,
} from "@/lib/githubApi";

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const repo = searchParams.get("repo");

  try {
    // Backward compat: ?repo=X without action returns team members
    if (repo && !action) {
      const members = await getRepositoryTeamMembers(GITHUB_ORG, repo);
      return NextResponse.json(members);
    }

    switch (action) {
      case "validateUser": {
        const username = searchParams.get("username");
        if (!username) {
          return NextResponse.json(
            { error: "username is required" },
            { status: 400 }
          );
        }
        const exists = await getGitHubUser(username);
        return NextResponse.json({ exists });
      }

      case "orgRepos": {
        const repos = await getOrganizationRepositories(GITHUB_ORG);
        return NextResponse.json(repos);
      }

      case "teamMembers": {
        const repoName = searchParams.get("repo");
        if (!repoName) {
          return NextResponse.json(
            { error: "repo is required" },
            { status: 400 }
          );
        }
        const members = await getRepositoryTeamMembers(GITHUB_ORG, repoName);
        return NextResponse.json(members);
      }

      case "repoCapacity": {
        const repoName = searchParams.get("repo");
        if (!repoName) {
          return NextResponse.json(
            { error: "repo is required" },
            { status: 400 }
          );
        }

        const stats = await getEffectiveRepoUserCount(
          GITHUB_ORG,
          repoName
        );

        return NextResponse.json(stats);
      }

      case "activity": {
        const username = searchParams.get("username");
        const repoParam = searchParams.get("repo");
        const since = searchParams.get("since");
        if (!username || !repoParam || !since) {
          return NextResponse.json(
            { error: "username, repo, and since are required" },
            { status: 400 }
          );
        }
        const activity = await getUserRepositoryActivity(
          username,
          repoParam,
          new Date(since)
        );
        return NextResponse.json(activity);
      }

      case "otherPRs": {
        const username = searchParams.get("username");
        const excludeRepo = searchParams.get("excludeRepo");
        const since = searchParams.get("since");
        if (!username || !excludeRepo || !since) {
          return NextResponse.json(
            { error: "username, excludeRepo, and since are required" },
            { status: 400 }
          );
        }
        const prs = await getMergedPRsInOtherRepos(
          username,
          excludeRepo,
          new Date(since)
        );
        return NextResponse.json(prs);
      }

      case "commits": {
        const username = searchParams.get("username");
        const repoName = searchParams.get("repo");
        const since = searchParams.get("since");
        if (!username || !repoName || !since) {
          return NextResponse.json(
            { error: "username, repo, and since are required" },
            { status: 400 }
          );
        }
        const count = await getUserCommitsSince(
          GITHUB_ORG,
          repoName,
          username,
          new Date(since)
        );
        return NextResponse.json({ count });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("GitHub API route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "inviteOrg": {
        const { username } = body;
        if (!username) {
          return NextResponse.json(
            { error: "username is required" },
            { status: 400 }
          );
        }
        await inviteUserToOrganization(username, GITHUB_ORG);
        return NextResponse.json({ success: true });
      }

      case "inviteRepo": {
        const { username, repo } = body;
        if (!username || !repo) {
          return NextResponse.json(
            { error: "username and repo are required" },
            { status: 400 }
          );
        }
        await inviteUserToRepository(username, GITHUB_ORG, repo);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("GitHub API route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
