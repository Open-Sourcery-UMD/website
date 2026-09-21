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

// Which org repositories are private. The token can read private repos, so
// this is what keeps the site's public API from exposing them.
const VISIBILITY_TTL_MS = 60_000;
const visibilityCache = new Map<
  string,
  { expiresAt: number; value: Promise<Map<string, boolean>> }
>();

async function fetchOrganizationRepositoryVisibility(
  org: string
): Promise<Map<string, boolean>> {
  const visibility = new Map<string, boolean>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await fetch(
      `${GITHUB_API}/orgs/${org}/repos?type=all&per_page=${PER_PAGE}&page=${page}`,
      { headers: authHeaders() }
    );

    // Fail rather than return a partial list: a missing public repo would
    // wrongly look private (or nonexistent) for the rest of the cache window
    if (!response.ok) {
      throw new Error(`Failed to list repositories for ${org}: ${response.status}`);
    }

    const repos = await response.json();
    for (const repo of repos) {
      visibility.set(String(repo.name).toLowerCase(), Boolean(repo.private));
    }

    if (repos.length < PER_PAGE) break;
  }

  return visibility;
}

/**
 * Maps every repository in the org (by lowercased name) to whether it's private
 */
export async function getOrganizationRepositoryVisibility(
  org: string = GITHUB_ORG
): Promise<Map<string, boolean>> {
  const key = org.toLowerCase();
  const cached = visibilityCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = fetchOrganizationRepositoryVisibility(org);
  visibilityCache.set(key, { expiresAt: Date.now() + VISIBILITY_TTL_MS, value });

  // Never serve a failed lookup to the next caller
  value.catch(() => {
    if (visibilityCache.get(key)?.value === value) visibilityCache.delete(key);
  });

  return value;
}

/**
 * Whether a repository may be read through the site's public API: it has to
 * belong to the org and be public
 */
export async function isPublicOrgRepository(
  repo: string,
  org: string = GITHUB_ORG
): Promise<boolean> {
  const visibility = await getOrganizationRepositoryVisibility(org);
  return visibility.get(repo.toLowerCase()) === false;
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
      `https://api.github.com/repos/${owner}/${repo}/collaborators?affiliation=direct&per_page=${PER_PAGE}`,
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

export async function getRepositoryInvitations(org: string, repo: string) {
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
 * Gets effective repository user count (active users + pending invites).
 *
 * Counts exactly the project's members, so the token's own account - a
 * collaborator on repos it created, but not a developer - is left out.
 */
export async function getEffectiveRepoUserCount(
  org: string,
  repo: string
) {
  const { collaborators, pendingInvitees } = await getRepositoryMembership(
    org,
    repo
  );

  return {
    activeUsers: collaborators.length,
    pendingInvites: pendingInvitees.length,
    totalEffective: collaborators.length + pendingInvitees.length,
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
      // Developers get write access; admin is for project leads, granted by
      // the board when the repository is created
      body: JSON.stringify({ permission: "push" }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to invite user to repo: ${response.statusText}`);
  }

  invalidateRepositoryMembership(owner, repo);
  console.log(`Invited ${username} to ${owner}/${repo} with write access`);
}

/** Permission levels the collaborators endpoint accepts */
export type RepositoryPermission =
  | "pull"
  | "triage"
  | "push"
  | "maintain"
  | "admin";

export interface RepositoryCollaborator {
  login: string;
  /** GitHub's role name: admin, maintain, write, triage or read */
  roleName: string;
  isAdmin: boolean;
}

/**
 * Lists a repository's direct collaborators with the permission each holds
 */
export async function getRepositoryCollaboratorRoles(
  owner: string,
  repo: string
): Promise<RepositoryCollaborator[]> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/collaborators` +
      `?affiliation=direct&per_page=${PER_PAGE}`,
    { headers: authHeaders() }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch collaborators for ${owner}/${repo}: ${response.status}`
    );
  }

  const collaborators = await response.json();

  return collaborators.map((collaborator: any) => ({
    login: collaborator.login,
    roleName: collaborator.role_name || "",
    isAdmin: Boolean(collaborator.permissions?.admin),
  }));
}

/**
 * Changes an existing collaborator's permission on a repository
 */
export async function setRepositoryPermission(
  username: string,
  owner: string,
  repo: string,
  permission: RepositoryPermission
): Promise<void> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/collaborators/${username}`,
    {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ permission }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to set ${username}'s permission on ${owner}/${repo}: ${response.status}`
    );
  }
}

/**
 * Changes the permission attached to a pending invitation.
 *
 * The invitations endpoint names levels differently from the collaborators
 * one: "write" here is "push" there.
 */
export async function setRepositoryInvitationPermission(
  owner: string,
  repo: string,
  invitationId: number,
  permissions: "read" | "triage" | "write" | "maintain" | "admin"
): Promise<void> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/invitations/${invitationId}`,
    {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ permissions }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to update invitation ${invitationId} on ${owner}/${repo}: ${response.status}`
    );
  }
}

// The account behind GITHUB_TOKEN is a collaborator on every repo it manages,
// but it isn't a developer on any team, so rosters leave it out
let cachedBotLogin: string | null | undefined;

/**
 * Gets the login of the account the API token belongs to
 */
export async function getAuthenticatedUser(): Promise<string | null> {
  if (cachedBotLogin !== undefined) return cachedBotLogin;

  try {
    const response = await fetch(`${GITHUB_API}/user`, {
      headers: authHeaders(),
    });

    cachedBotLogin = response.ok
      ? ((await response.json()).login as string | undefined) ?? null
      : null;
  } catch (error) {
    console.error("Error fetching authenticated GitHub user:", error);
    cachedBotLogin = null;
  }

  return cachedBotLogin;
}

/**
 * Who is on a project, according to its repository.
 *
 * Direct access is the single source of truth for project membership. A
 * pending invitation counts too: joining a project only sends an invite, and
 * the developer has to be treated as on the team from that moment - otherwise
 * they could join a second project before accepting the first.
 */
export interface RepositoryMembership {
  /** Direct collaborators, excluding the token's own account */
  collaborators: string[];
  /** Invited but not yet accepted (expired invitations are ignored) */
  pendingInvitees: string[];
}

// Membership is read on nearly every page, so recent lookups are shared.
// Entries hold the in-flight promise, which also collapses concurrent requests
// for the same repository into one GitHub call.
const MEMBERSHIP_TTL_MS = 30_000;
const membershipCache = new Map<
  string,
  { expiresAt: number; value: Promise<RepositoryMembership> }
>();

function membershipKey(owner: string, repo: string): string {
  return `${owner}/${repo}`.toLowerCase();
}

/**
 * Drops a cached membership lookup, so the next read sees a change right away
 */
export function invalidateRepositoryMembership(owner: string, repo: string) {
  membershipCache.delete(membershipKey(owner, repo));
}

async function fetchRepositoryMembership(
  owner: string,
  repo: string
): Promise<RepositoryMembership> {
  const [collaboratorsResponse, invitationsResponse, botLogin] =
    await Promise.all([
      fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/collaborators` +
          `?affiliation=direct&per_page=${PER_PAGE}`,
        { headers: authHeaders() }
      ),
      fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/invitations?per_page=${PER_PAGE}`,
        { headers: authHeaders() }
      ),
      getAuthenticatedUser(),
    ]);

  // A proposed project's repository may not exist yet, so nobody is on it
  if (collaboratorsResponse.status === 404) {
    return { collaborators: [], pendingInvitees: [] };
  }

  // Anything else is a real failure: reporting "no members" here could let
  // someone join a second project, so callers get to decide how to handle it
  if (!collaboratorsResponse.ok) {
    throw new Error(
      `Failed to fetch collaborators for ${owner}/${repo}: ${collaboratorsResponse.status}`
    );
  }
  if (!invitationsResponse.ok && invitationsResponse.status !== 404) {
    throw new Error(
      `Failed to fetch invitations for ${owner}/${repo}: ${invitationsResponse.status}`
    );
  }

  const bot = botLogin?.toLowerCase();

  const collaborators: string[] = (await collaboratorsResponse.json())
    .map((collaborator: any) => collaborator.login as string)
    .filter((login: string) => login && login.toLowerCase() !== bot);

  const invitations = invitationsResponse.ok
    ? await invitationsResponse.json()
    : [];

  const pendingInvitees: string[] = invitations
    .filter((invite: any) => !invite.expired && invite.invitee?.login)
    .map((invite: any) => invite.invitee.login as string);

  return { collaborators, pendingInvitees };
}

/**
 * Gets the members of a project's repository.
 *
 * Pass `fresh` to skip the cache when a stale answer would be unsafe, such as
 * checking whether someone is already on a project before they join one.
 */
export async function getRepositoryMembership(
  owner: string,
  repo: string,
  options: { fresh?: boolean } = {}
): Promise<RepositoryMembership> {
  const key = membershipKey(owner, repo);
  const cached = membershipCache.get(key);

  if (!options.fresh && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = fetchRepositoryMembership(owner, repo);
  membershipCache.set(key, { expiresAt: Date.now() + MEMBERSHIP_TTL_MS, value });

  // Never serve a failed lookup to the next caller
  value.catch(() => {
    if (membershipCache.get(key)?.value === value) {
      membershipCache.delete(key);
    }
  });

  return value;
}

/**
 * Gets the membership of several repositories at once.
 *
 * Repositories whose lookup failed are listed in `failed` instead of being
 * reported as empty, so callers can tell "nobody is on it" from "unknown".
 */
export async function getRepositoryMembershipMap(
  owner: string,
  repos: string[],
  options: { fresh?: boolean } = {}
): Promise<{
  membership: Record<string, RepositoryMembership>;
  failed: string[];
}> {
  const uniqueRepos = Array.from(new Set(repos.filter(Boolean)));

  const results = await Promise.allSettled(
    uniqueRepos.map((repo) => getRepositoryMembership(owner, repo, options))
  );

  const membership: Record<string, RepositoryMembership> = {};
  const failed: string[] = [];

  results.forEach((result, index) => {
    const repo = uniqueRepos[index];
    if (result.status === "fulfilled") {
      membership[repo] = result.value;
    } else {
      console.error(`Error fetching membership for ${owner}/${repo}:`, result.reason);
      failed.push(repo);
    }
  });

  return { membership, failed };
}

/**
 * Revokes a user's direct access to a repository.
 *
 * Also cancels any invitation they never accepted, since a pending invite
 * would otherwise let them rejoin after leaving.
 */
export async function removeUserFromRepository(
  username: string,
  owner: string,
  repo: string
): Promise<void> {
  if (!GITHUB_TOKEN) {
    console.warn("GITHUB_TOKEN not configured, skipping repo access removal");
    return;
  }

  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/collaborators/${username}`,
    { method: "DELETE", headers: authHeaders() }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Failed to remove user from repo: ${response.statusText}`
    );
  }

  // Cancel a pending invitation if one is still outstanding
  try {
    const invitations = await getRepositoryInvitations(owner, repo);
    const pending = invitations.find(
      (invite: any) =>
        invite.invitee?.login?.toLowerCase() === username.toLowerCase()
    );

    if (pending) {
      await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/invitations/${pending.id}`,
        { method: "DELETE", headers: authHeaders() }
      );
    }
  } catch (error) {
    console.error(
      `Error cancelling invitation for ${username} on ${owner}/${repo}:`,
      error
    );
  }

  invalidateRepositoryMembership(owner, repo);
  console.log(`Removed ${username}'s access to ${owner}/${repo}`);
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
 * Gets merged PRs by user in public repos other than the specified ones since a date
 */
export async function getMergedPRsInOtherRepos(
  username: string,
  excludeRepos: string[],
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

    // Their own projects' PRs are counted separately; a developer on no
    // project has nothing to exclude
    for (const repo of excludeRepos) {
      if (repo) qualifiers.push(`-repo:${repo}`);
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

export interface RepositorySummary {
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  pushedAt: string | null;
}

export interface CommitSummary {
  sha: string;
  message: string;
  authorName: string;
  authorLogin: string | null;
  date: string;
  url: string;
}

export interface ActivityItem {
  number: number;
  title: string;
  url: string;
  authorLogin: string;
  state: "open" | "closed";
  merged: boolean;
  createdAt: string;
  closedAt: string | null;
}

export interface ProjectOverview {
  repository: RepositorySummary | null;
  commits: CommitSummary[];
  pullRequests: ActivityItem[];
  issues: ActivityItem[];
}

/**
 * Gets repository metadata (stars, description, language, ...)
 */
export async function getRepositorySummary(
  owner: string,
  repo: string
): Promise<RepositorySummary | null> {
  try {
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
      headers: authHeaders(),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      name: data.name,
      fullName: data.full_name,
      url: data.html_url,
      description: data.description ?? null,
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      language: data.language ?? null,
      pushedAt: data.pushed_at ?? null,
    };
  } catch (error) {
    console.error(`Error fetching repository ${owner}/${repo}:`, error);
    return null;
  }
}

/**
 * Gets the most recent commits on a repository's default branch
 */
export async function getRecentCommits(
  owner: string,
  repo: string,
  limit = 5
): Promise<CommitSummary[]> {
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=${limit}`,
      { headers: authHeaders() }
    );

    if (!response.ok) return [];

    const commits = await response.json();
    if (!Array.isArray(commits)) return [];

    return commits.map((commit: any) => ({
      sha: commit.sha,
      // Commit messages can carry a body; the summary line is what's shown
      message: (commit.commit?.message || "").split("\n")[0],
      authorName: commit.commit?.author?.name || commit.author?.login || "Unknown",
      authorLogin: commit.author?.login ?? null,
      date: commit.commit?.author?.date || "",
      url: commit.html_url,
    }));
  } catch (error) {
    console.error(`Error fetching commits for ${owner}/${repo}:`, error);
    return [];
  }
}

/**
 * Gets recently updated issues and pull requests, open and closed.
 *
 * The issues endpoint returns both, distinguished by the pull_request field,
 * so one request covers both lists.
 */
export async function getRecentIssuesAndPullRequests(
  owner: string,
  repo: string,
  limit = 50
): Promise<{ pullRequests: ActivityItem[]; issues: ActivityItem[] }> {
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/issues` +
        `?state=all&sort=updated&direction=desc&per_page=${limit}`,
      { headers: authHeaders() }
    );

    if (!response.ok) return { pullRequests: [], issues: [] };

    const items = await response.json();
    if (!Array.isArray(items)) return { pullRequests: [], issues: [] };

    const pullRequests: ActivityItem[] = [];
    const issues: ActivityItem[] = [];

    for (const item of items) {
      const entry: ActivityItem = {
        number: item.number,
        title: item.title,
        url: item.html_url,
        authorLogin: item.user?.login || "unknown",
        state: item.state === "closed" ? "closed" : "open",
        merged: Boolean(item.pull_request?.merged_at),
        createdAt: item.created_at,
        closedAt: item.closed_at ?? null,
      };

      if (item.pull_request) {
        pullRequests.push(entry);
      } else {
        issues.push(entry);
      }
    }

    return { pullRequests, issues };
  } catch (error) {
    console.error(`Error fetching issues/PRs for ${owner}/${repo}:`, error);
    return { pullRequests: [], issues: [] };
  }
}

/**
 * Gathers everything the project dashboard needs in one round trip
 */
export async function getProjectOverview(
  owner: string,
  repo: string
): Promise<ProjectOverview> {
  const [repository, commits, activity] = await Promise.all([
    getRepositorySummary(owner, repo),
    getRecentCommits(owner, repo),
    getRecentIssuesAndPullRequests(owner, repo),
  ]);

  return {
    repository,
    commits,
    pullRequests: activity.pullRequests,
    issues: activity.issues,
  };
}
