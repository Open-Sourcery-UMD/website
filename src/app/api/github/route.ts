import { NextRequest, NextResponse } from "next/server";
import {
  getGitHubUser,
  getOrganizationRepositoryVisibility,
  getProjectOverview,
  getRepositoryMembershipMap,
  isPublicOrgRepository,
} from "@/lib/githubApi";
import { getOptionalUser, requireUser } from "@/lib/server/requestAuth";
import { errorResponse, HttpError } from "@/lib/server/httpErrors";
import { inviteSelfToOrganization } from "@/lib/server/memberActions";

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";

/**
 * Reads are public - the gem leaderboard is shown to signed-out visitors -
 * but they run on the site's GitHub token, which can also read the org's
 * private repositories. Repository-scoped reads are therefore limited to
 * public repositories in the org. Private ones answer exactly like
 * nonexistent ones, so their names aren't confirmed either.
 */
async function requirePublicRepo(repo: string): Promise<void> {
  if (!(await isPublicOrgRepository(repo, GITHUB_ORG))) {
    throw new HttpError(404, "Repository not found");
  }
}

function requireParams(params: Record<string, string | null>): Record<string, string> {
  const missing = Object.keys(params).filter((name) => !params[name]);
  if (missing.length > 0) {
    throw new HttpError(400, `${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} required`);
  }
  return params as Record<string, string>;
}

function splitList(value: string | null): string[] {
  return (value || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    switch (searchParams.get("action")) {
      case "validateUser": {
        const { username } = requireParams({ username: searchParams.get("username") });
        const exists = await getGitHubUser(username);
        return NextResponse.json({ exists });
      }

      case "orgRepos": {
        const visibility = await getOrganizationRepositoryVisibility(GITHUB_ORG);
        const publicRepos = Array.from(visibility.entries())
          .filter(([, isPrivate]) => !isPrivate)
          .map(([name]) => name);
        return NextResponse.json(publicRepos);
      }

      case "repoMembership": {
        // Comma-separated repository names; GitHub repo names can't contain commas
        const repos = splitList(searchParams.get("repos"));

        // Skipping the cache costs two GitHub calls per repository, so only
        // signed-in callers may ask for it - otherwise anyone could burn
        // through the token's rate limit
        const [fresh, visibility] = await Promise.all([
          searchParams.get("fresh") === "1" &&
            getOptionalUser(request).then((uid) => uid !== null),
          getOrganizationRepositoryVisibility(GITHUB_ORG),
        ]);
        const publicRepos = repos.filter(
          (name) => visibility.get(name.toLowerCase()) === false
        );

        const result = await getRepositoryMembershipMap(GITHUB_ORG, publicRepos, { fresh });

        // Repos that don't exist yet (a proposed project) - or that are
        // private - have no members as far as this API is concerned
        const failed = new Set(result.failed);
        for (const name of repos) {
          if (!(name in result.membership) && !failed.has(name)) {
            result.membership[name] = { collaborators: [], pendingInvitees: [] };
          }
        }

        return NextResponse.json(result);
      }

      case "projectOverview": {
        const { repo: repoName } = requireParams({ repo: searchParams.get("repo") });
        await requirePublicRepo(repoName);
        const overview = await getProjectOverview(GITHUB_ORG, repoName);
        return NextResponse.json(overview);
      }

      default:
        throw new HttpError(400, "Unknown action");
    }
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * The only write left here is inviting yourself to the org at sign-up.
 * Joining and leaving projects live in /api/projects.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body ?? {};

    switch (action) {
      case "inviteOrg": {
        // The account invited is always the caller's own, from their profile
        const uid = await requireUser(request);
        await inviteSelfToOrganization(uid);
        return NextResponse.json({ success: true });
      }

      default:
        throw new HttpError(400, "Unknown action");
    }
  } catch (error) {
    return errorResponse(error);
  }
}
