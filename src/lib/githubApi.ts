/**
 * Server-side GitHub API implementations.
 * This module uses GITHUB_TOKEN directly and must only run on the server
 * (API routes, scripts, etc). Client code should use githubService.ts instead,
 * which calls /api/github.
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";
const GITHUB_API = "https://api.github.com";
const PER_PAGE = 100;
const MAX_PAGES = 10;

function authHeaders(): Record<string, string> {
  return {
    Accept: "application/vnd.github.v3+json",
    ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
  };
}

/**
 * Fetches every page of a paginated GitHub list endpoint.
 *
 * GitHub defaults to 30 items per page, so a single unpaginated request
 * silently truncates anything busier than that. `stopWhen` lets a caller bail
 * out once a page has run past the time window it cares about.
 */
async function fetchAllPages(
  baseUrl: string,
  stopWhen?: (page: any[]) => boolean
): Promise<any[]> {
  const all: any[] = [];
  const separator = baseUrl.includes("?") ? "&" : "?";

  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await fetch(
      `${baseUrl}${separator}per_page=${PER_PAGE}&page=${page}`,
      { headers: authHeaders() }
    );

    if (!response.ok) break;

    const items = await response.json();
    if (!Array.isArray(items) || items.length === 0) break;

    all.push(...items);

    if (items.length < PER_PAGE) break;
    if (stopWhen?.(items)) break;
  }

  return all;
}

/**
 * Validates if a GitHub username exists
 */
export async function getGitHubUser(username: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: authHeaders(),
    });
    return response.status === 200;
  } catch (error) {
    console.error(`Error checking GitHub user ${username}:`, error);
    return false;
  }
}

/**
 * Sends membership invite to GitHub organization
 */
export async function inviteUserToOrganization(
  username: string,
  org: string = GITHUB_ORG
): Promise<void> {
  if (!GITHUB_TOKEN) {
    console.warn("GITHUB_TOKEN not configured, skipping org invite");
    return;
  }

  const response = await fetch(
    `https://api.github.com/orgs/${org}/memberships/${username}`,
    {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "member" }),
    }
  );

  if (response.ok) {
    console.log(`Invited ${username} to ${org}`);
  } else if (response.status === 422) {
    console.log(`${username} already invited or is member of ${org}`);
  } else {
    throw new Error(`Failed to invite user: ${response.statusText}`);
  }
}

/**
 * Fetches all repository names in the organization
 */
export async function getOrganizationRepositories(
  org: string = GITHUB_ORG
): Promise<string[]> {
  const allRepos: string[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `https://api.github.com/orgs/${org}/repos?page=${page}&per_page=${perPage}`,
      { headers: authHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch repos: ${response.statusText}`);
    }

    const repos = await response.json();
    if (repos.length === 0) break;

    allRepos.push(...repos.map((repo: any) => repo.name));
    if (repos.length < perPage) break;
    page++;
  }

  return allRepos;
}

/**
 * Gets list of GitHub users who have write access to a repository
 */
export async function getRepositoryTeamMembers(
  owner: string,
  repo: string
): Promise<string[]> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/collaborators?affiliation=direct`,
      { headers: authHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch collaborators: ${response.statusText}`);
    }

    const collaborators = await response.json();

    return collaborators.map((collab: any) => collab.login);
  } catch (error) {
    console.error(
      `Error fetching direct admin members for ${owner}/${repo}:`,
      error
    );
    return [];
  }
}

async function getRepositoryInvitations(org: string, repo: string) {
  const res = await fetch(
    `https://api.github.com/repos/${org}/${repo}/invitations`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch repository invitations");
  }

  return res.json();
}

/**
 * Gets effective repository user count (active users + pending invites)
 */
export async function getEffectiveRepoUserCount(
  org: string,
  repo: string
) {
  const [members, invites] = await Promise.all([
    getRepositoryTeamMembers(org, repo),
    getRepositoryInvitations(org, repo),
  ]);

  const activeInvites = invites.filter((invite: any) => !(invite.expired));

  return {
    activeUsers: members.length,
    pendingInvites: activeInvites.length,
    totalEffective: members.length + activeInvites.length,
  };
}

/**
 * Sends write-access invite to a specific repository
 */
export async function inviteUserToRepository(
  username: string,
  owner: string,
  repo: string
): Promise<void> {
  if (!GITHUB_TOKEN) {
    console.warn("GITHUB_TOKEN not configured, skipping repo invite");
    return;
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/collaborators/${username}`,
    {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ permission: "admin" }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to invite user to repo: ${response.statusText}`);
  }

  console.log(`Invited ${username} to ${owner}/${repo} with write access`);
}

/**
 * Gets user's activity in a repository since a date
 */
export async function getUserRepositoryActivity(
  username: string,
  repo: string,
  since: Date
): Promise<{ issues: number; mergedPRs: number }> {
  try {
    const [owner, repoName] = repo.split("/");
    if (!owner || !repoName) {
      throw new Error("Invalid repo format, expected 'owner/repo'");
    }

    const sinceISO = since.toISOString();
    // GitHub logins are case-insensitive, so compare them lowercased
    const login = username.toLowerCase();

    // The issues endpoint honors `creator`, but its `since` filters on
    // updated_at - an issue opened last semester and commented on this one
    // still comes back, so created_at has to be checked here.
    const issues = await fetchAllPages(
      `${GITHUB_API}/repos/${owner}/${repoName}/issues` +
        `?creator=${encodeURIComponent(username)}&state=all&since=${sinceISO}`
    );

    const openedIssuesCount = issues.filter(
      (issue: any) =>
        !issue.pull_request &&
        issue.user?.login?.toLowerCase() === login &&
        new Date(issue.created_at) >= since
    ).length;

    // The pulls endpoint silently ignores `creator` and `since` - it accepts
    // neither - so every filter has to be applied to the response ourselves.
    // Without the author check, every developer on a project is credited with
    // the whole team's merged PRs.
    const prs = await fetchAllPages(
      `${GITHUB_API}/repos/${owner}/${repoName}/pulls` +
        `?state=closed&sort=updated&direction=desc`,
      // Newest-updated first, and merging always bumps updated_at, so once a
      // page ends before the window nothing after it can have merged inside it
      (page) => new Date(page[page.length - 1].updated_at) < since
    );

    const mergedPRsCount = prs.filter(
      (pr: any) =>
        pr.merged_at &&
        new Date(pr.merged_at) >= since &&
        pr.user?.login?.toLowerCase() === login
    ).length;

    return { issues: openedIssuesCount, mergedPRs: mergedPRsCount };
  } catch (error) {
    console.error(
      `Error fetching activity for ${username} in ${repo}:`,
      error
    );
    return { issues: 0, mergedPRs: 0 };
  }
}

/**
 * Gets merged PRs by user in public repos other than the specified one since a date
 */
export async function getMergedPRsInOtherRepos(
  username: string,
  excludeRepo: string,
  since: Date
): Promise<{ repo: string; mergedAt: string }[]> {
  try {
    const sinceDate = since.toISOString().split("T")[0];
    const qualifiers = [
      `author:${username}`,
      "is:pr",
      "is:merged",
      "is:public",
      `merged:>=${sinceDate}`,
    ];

    // A developer with no current project has no repo to exclude
    if (excludeRepo) {
      qualifiers.push(`-repo:${excludeRepo}`);
    }

    const response = await fetch(
      `${GITHUB_API}/search/issues` +
        `?q=${encodeURIComponent(qualifiers.join(" "))}&per_page=${PER_PAGE}`,
      { headers: authHeaders() }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      repo:
        item.repository_url?.split("/").slice(-2).join("/") || "unknown",
      mergedAt: item.pull_request?.merged_at || item.closed_at || "",
    }));
  } catch (error) {
    console.error(`Error fetching other-repo PRs for ${username}:`, error);
    return [];
  }
}

/**
 * Gets the number of commits by a user in a repo since a given date
 */
export async function getUserCommitsSince(
  org: string,
  repo: string,
  username: string,
  since: Date
): Promise<number> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${org}/${repo}/commits?author=${username}&since=${since.toISOString()}&per_page=1`,
      { headers: authHeaders() }
    );

    if (!response.ok) return 0;

    const commits = await response.json();
    return Array.isArray(commits) ? commits.length : 0;
  } catch (error) {
    console.error(
      `Error fetching commits for ${username} in ${org}/${repo}:`,
      error
    );
    return 0;
  }
}
