/**
 * Client-side GitHub service.
 * All operations go through /api/github which handles authentication server-side.
 * Joining and leaving projects live in projectService (/api/projects).
 */

import { authorizedFetch, postAuthorized } from './apiClient';

/**
 * Validates if a GitHub username exists
 */
export async function getGitHubUser(username: string): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/github?action=validateUser&username=${encodeURIComponent(username)}`
    );
    if (!response.ok) return false;
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error(`Error checking GitHub user ${username}:`, error);
    return false;
  }
}

/**
 * Invites the signed-in user's own GitHub account (from their profile) to the
 * GitHub organization
 */
export async function inviteUserToOrganization(): Promise<void> {
  await postAuthorized("/api/github", { action: "inviteOrg" });
}

/**
 * Fetches all repository names in the organization
 */
export async function getOrganizationRepositories(): Promise<string[]> {
  try {
    const response = await fetch("/api/github?action=orgRepos");
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("Error fetching organization repositories:", error);
    return [];
  }
}

/**
 * Gets effective repository user count (active users + pending invites)
 */
export async function getEffectiveRepoUserCount(repo: string): Promise<{
  activeUsers: number;
  pendingInvites: number;
  totalEffective: number;
}> {
  try {
    const params = new URLSearchParams({
      action: "repoCapacity",
      repo,
    });

    const response = await fetch(`/api/github?${params}`);
    if (!response.ok) {
      return { activeUsers: 0, pendingInvites: 0, totalEffective: 0 };
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching repo capacity for ${repo}:`, error);
    return { activeUsers: 0, pendingInvites: 0, totalEffective: 0 };
  }
}

/**
 * Who is on a project, according to its repository: direct collaborators plus
 * anyone with a pending invitation. See getRepositoryMembership in githubApi.
 */
export interface RepositoryMembership {
  collaborators: string[];
  pendingInvitees: string[];
}

export interface RepositoryMembershipMap {
  membership: Record<string, RepositoryMembership>;
  /** Repositories whose membership couldn't be determined */
  failed: string[];
}

/**
 * Gets the membership of several repositories at once.
 *
 * Pass `fresh` to bypass the server's short-lived cache when a stale answer
 * would be unsafe (e.g. checking whether someone may join a project).
 */
export async function getRepositoryMembershipMap(
  repos: string[],
  options: { fresh?: boolean } = {}
): Promise<RepositoryMembershipMap> {
  const uniqueRepos = Array.from(new Set(repos.filter(Boolean)));
  if (uniqueRepos.length === 0) return { membership: {}, failed: [] };

  try {
    const params = new URLSearchParams({
      action: "repoMembership",
      repos: uniqueRepos.join(","),
    });
    if (options.fresh) params.set("fresh", "1");

    // Signed in, `fresh` is honored; anonymously the server ignores it
    const response = await authorizedFetch(`/api/github?${params}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching repository membership:", error);
    // Nothing could be verified - report every repository as unknown rather
    // than empty, so callers never mistake an outage for "not a member"
    return { membership: {}, failed: uniqueRepos };
  }
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
    const params = new URLSearchParams({
      action: "activity",
      username,
      repo,
      since: since.toISOString(),
    });
    const response = await fetch(`/api/github?${params}`);
    if (!response.ok) return { issues: 0, mergedPRs: 0 };
    return await response.json();
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
    const params = new URLSearchParams({
      action: "otherPRs",
      username,
      excludeRepos: excludeRepos.filter(Boolean).join(","),
      since: since.toISOString(),
    });
    const response = await fetch(`/api/github?${params}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error(`Error fetching other-repo PRs for ${username}:`, error);
    return [];
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

const EMPTY_OVERVIEW: ProjectOverview = {
  repository: null,
  commits: [],
  pullRequests: [],
  issues: [],
};

/**
 * Gets repository details, recent commits and recent issues/PRs for a project
 */
export async function getProjectOverview(
  repo: string
): Promise<ProjectOverview> {
  try {
    const params = new URLSearchParams({ action: "projectOverview", repo });
    const response = await fetch(`/api/github?${params}`);
    if (!response.ok) return EMPTY_OVERVIEW;
    return await response.json();
  } catch (error) {
    console.error(`Error fetching project overview for ${repo}:`, error);
    return EMPTY_OVERVIEW;
  }
}
