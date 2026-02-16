export const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";

// Simple in-memory cache for GitHub API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: Record<string, CacheEntry<any>> = {};
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function getCacheKey(key: string): string {
  return `github_${key}`;
}

function getFromCache<T>(key: string): T | null {
  const cacheKey = getCacheKey(key);
  const entry = cache[cacheKey];

  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_DURATION) {
    delete cache[cacheKey];
    return null;
  }

  return entry.data as T;
}

function setInCache<T>(key: string, data: T): void {
  const cacheKey = getCacheKey(key);
  cache[cacheKey] = {
    data,
    timestamp: Date.now(),
  };
}

/**
 * Validates if a GitHub username exists
 * @param username GitHub username to validate
 * @returns true if user exists, false otherwise
 */
export async function getGitHubUser(username: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
      },
    });

    return response.status === 200;
  } catch (error) {
    console.error(`Error checking GitHub user ${username}:`, error);
    return false;
  }
}

/**
 * Sends write-access invite to GitHub organization
 * @param username GitHub username to invite
 * @param org GitHub organization name
 */
export async function inviteUserToOrganization(
  username: string,
  org: string = GITHUB_ORG
): Promise<void> {
  if (!GITHUB_TOKEN) {
    console.warn("GITHUB_TOKEN not configured, skipping org invite");
    return;
  }

  try {
    const response = await fetch(
      `https://api.github.com/orgs/${org}/memberships/${username}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "member",
        }),
      }
    );

    if (response.ok) {
      console.log(`Invited ${username} to ${org}`);
    } else if (response.status === 422) {
      console.log(`${username} already invited or is member of ${org}`);
    } else {
      throw new Error(`Failed to invite user: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error inviting ${username} to ${org}:`, error);
    // Silently fail - user might not have the right permissions yet
  }
}

/**
 * Fetches all repository names in the organization
 * @param org GitHub organization name
 * @returns Array of repository names
 */
export async function getOrganizationRepositories(
  org: string = GITHUB_ORG
): Promise<string[]> {
  // Check cache first
  const cached = getFromCache<string[]>(`org_repos_${org}`);
  if (cached) {
    return cached;
  }

  try {
    const allRepos: string[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await fetch(
        `https://api.github.com/orgs/${org}/repos?page=${page}&per_page=${perPage}`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
          },
        }
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

    // Cache the result
    setInCache(`org_repos_${org}`, allRepos);
    return allRepos;
  } catch (error) {
    console.error(`Error fetching organization repositories for ${org}:`, error);
    return [];
  }
}

/**
 * Gets list of GitHub users who have write access to a repository
 * @param owner Repository owner (organization)
 * @param repo Repository name
 * @returns Array of usernames with write+ permissions
 */
export async function getRepositoryTeamMembers(owner: string, repo: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/collaborators?affiliation=all`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
        },
      }
    );

    console.log(response);

    if (!response.ok) {
      throw new Error(`Failed to fetch collaborators: ${response.statusText}`);
    }

    const collaborators = await response.json();
    return collaborators
      .filter((collab: any) => collab.permissions.push || collab.permissions.admin)
      .map((collab: any) => collab.login);
  } catch (error) {
    console.error(`Error fetching team members for ${owner}/${repo}:`, error);
    return [];
  }
}

/**
 * Sends write-access invite to a specific repository
 * @param username GitHub username to invite
 * @param owner Repository owner
 * @param repo Repository name
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

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/collaborators/${username}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permission: "push", // write access
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to invite user to repo: ${response.statusText}`);
    }

    console.log(`Invited ${username} to ${owner}/${repo} with write access`);
  } catch (error) {
    console.error(`Error inviting ${username} to ${owner}/${repo}:`, error);
    throw error;
  }
}

/**
 * Gets user's activity in a repository since a date
 * @param username GitHub username
 * @param repo Repository name (owner/repo format)
 * @param since Date to filter activity from
 * @returns Object with activity counts
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

    // Fetch issues opened by user
    const issuesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/issues?creator=${username}&since=${sinceISO}&state=all`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
        },
      }
    );

    const issues = issuesResponse.ok ? await issuesResponse.json() : [];
    // Filter out pull requests from issues
    const openedIssuesCount = issues.filter((issue: any) => !issue.pull_request).length;

    // Fetch merged PRs by user
    const prsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/pulls?creator=${username}&state=closed&since=${sinceISO}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
        },
      }
    );

    const prs = prsResponse.ok ? await prsResponse.json() : [];
    // Filter for merged PRs
    const mergedPRsCount = prs.filter((pr: any) => pr.merged_at && new Date(pr.merged_at) >= since).length;

    return {
      issues: openedIssuesCount,
      mergedPRs: mergedPRsCount,
    };
  } catch (error) {
    console.error(`Error fetching activity for ${username} in ${repo}:`, error);
    return {
      issues: 0,
      mergedPRs: 0,
    };
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
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      repo: item.repository_url?.split("/").slice(-2).join("/") || "unknown",
      mergedAt: item.pull_request?.merged_at || item.closed_at || "",
    }));
  } catch (error) {
    console.error(`Error fetching other-repo PRs for ${username}:`, error);
    return [];
  }
}

/**
 * Gets the number of commits by a user in a repo since a given date
 * @param org Organization/owner name
 * @param repo Repository name
 * @param username GitHub username
 * @param since Date to check commits from
 * @returns Number of commits (0 if error or none found)
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
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
        },
      }
    );

    if (!response.ok) return 0;

    const commits = await response.json();
    return Array.isArray(commits) ? commits.length : 0;
  } catch (error) {
    console.error(`Error fetching commits for ${username} in ${org}/${repo}:`, error);
    return 0;
  }
}

/**
 * Clears the cache (useful for testing or manual refresh)
 */
export function clearCache(): void {
  Object.keys(cache).forEach((key) => {
    delete cache[key];
  });
}
