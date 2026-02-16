/**
 * Server-side GitHub API implementations.
 * This module uses GITHUB_TOKEN directly and must only run on the server
 * (API routes, scripts, etc). Client code should use githubService.ts instead,
 * which calls /api/github.
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";

function authHeaders(): Record<string, string> {
  return {
    Accept: "application/vnd.github.v3+json",
    ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
  };
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

    return collaborators
      .filter((collab: any) => collab.permissions?.admin === true)
      .map((collab: any) => collab.login);

  } catch (error) {
    console.error(
      `Error fetching direct admin members for ${owner}/${repo}:`,
      error
    );
    return [];
  }
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
      body: JSON.stringify({ permission: "push" }),
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

    const issuesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/issues?creator=${username}&since=${sinceISO}&state=all`,
      { headers: authHeaders() }
    );

    const issues = issuesResponse.ok ? await issuesResponse.json() : [];
    const openedIssuesCount = issues.filter(
      (issue: any) => !issue.pull_request
    ).length;

    const prsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/pulls?creator=${username}&state=closed&since=${sinceISO}`,
      { headers: authHeaders() }
    );

    const prs = prsResponse.ok ? await prsResponse.json() : [];
    const mergedPRsCount = prs.filter(
      (pr: any) => pr.merged_at && new Date(pr.merged_at) >= since
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
    const query = `author:${username}+is:pr+is:merged+is:public+-repo:${excludeRepo}+merged:>=${sinceDate}`;

    const response = await fetch(
      `https://api.github.com/search/issues?q=${query}&per_page=100`,
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
