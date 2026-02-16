/**
 * Client-side GitHub service.
 * All operations go through /api/github which handles authentication server-side.
 */

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
 * Sends membership invite to GitHub organization
 */
export async function inviteUserToOrganization(
  username: string
): Promise<void> {
  const response = await fetch("/api/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "inviteOrg", username }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to invite user to organization");
  }
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
 * Gets list of GitHub users who have write access to a repository
 */
export async function getRepositoryTeamMembers(
  repo: string
): Promise<string[]> {
  try {
    const response = await fetch(
      `/api/github?repo=${encodeURIComponent(repo)}`
    );
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error(`Error fetching team members for ${repo}:`, error);
    return [];
  }
}

/**
 * Sends write-access invite to a specific repository
 */
export async function inviteUserToRepository(
  username: string,
  repo: string
): Promise<void> {
  const response = await fetch("/api/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "inviteRepo", username, repo }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to invite user to repository");
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
 * Gets merged PRs by user in public repos other than the specified one since a date
 */
export async function getMergedPRsInOtherRepos(
  username: string,
  excludeRepo: string,
  since: Date
): Promise<{ repo: string; mergedAt: string }[]> {
  try {
    const params = new URLSearchParams({
      action: "otherPRs",
      username,
      excludeRepo,
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
