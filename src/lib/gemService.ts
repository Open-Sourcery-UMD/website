'use client';

import { db } from '@/firebaseConfig';
import { collection, doc, getDoc } from 'firebase/firestore';
import { User } from '@/types/users';
import { getUserRepositoryActivity, getMergedPRsInOtherRepos } from './githubService';
import {
  getProjectsForUser,
  loadProjectMembership,
  ProjectMembership,
} from './projectService';

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || 'Open-Sourcery-UMD';

interface GemBreakdown {
  totalGems: number;
  actions: string[];
}

/**
 * Computes gem count for a user based on activity
 * Formula:
 * - 50 gems per special event (Hack Session, GBM, General Body Meeting)
 * - 100 gems per other event
 * - 30 gems per issue opened in current project
 * - 30 gems per PR merged in current project
 * - 50 gems per PR merged in other public repos
 */
export async function computeGemCount(
  uid: string,
  startDate: Date,
  // Pass a shared snapshot when computing gems for many users at once
  membership?: ProjectMembership
): Promise<GemBreakdown> {
  try {
    let totalGems = 0;
    const actions: string[] = [];

    const usersRef = collection(db, 'users');
    const userDocRef = doc(usersRef, uid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return { totalGems: 0, actions: [] };
    }

    const userData = userSnap.data() as User;

    // Calculate gems from events attended
    if (userData.eventsAttended && Array.isArray(userData.eventsAttended)) {
      const specialEventNames = ['hack session', 'gbm', 'general body meeting'];

      // A repeated check-in can append the same event twice (arrayUnion only
      // dedupes objects that match exactly), so count each event id once
      const countedEventIds = new Set<string>();

      for (const event of userData.eventsAttended) {
        const eventDateStr = event.start.dateTime || event.start.date;
        if (!eventDateStr) continue;

        if (event.id) {
          if (countedEventIds.has(event.id)) continue;
          countedEventIds.add(event.id);
        }

        const eventDate = new Date(eventDateStr);
        if (eventDate < startDate) continue;

        const eventNameLower = (event.summary || '').toLowerCase();
        const isSpecialEvent = specialEventNames.some((name) =>
          eventNameLower.includes(name)
        );

        const gemsForEvent = isSpecialEvent ? 50 : 100;
        totalGems += gemsForEvent;
        actions.push(
          `Attended '${event.summary}' on ${eventDate.toLocaleDateString()}`
        );
      }
    }

    // Calculate gems from GitHub activity
    if (userData.gitHubUsername) {
      // Every project whose repository the developer has access to - usually
      // one, but they earn gems in each if GitHub puts them on several
      let projectRepos: string[] = [];
      try {
        const snapshot = membership ?? (await loadProjectMembership());
        projectRepos = getProjectsForUser(snapshot, userData.gitHubUsername)
          .map((project) => project.repositoryName)
          .filter(Boolean);
      } catch (error) {
        console.error(`Error resolving projects for ${userData.gitHubUsername}:`, error);
      }

      // Issues and PRs in the developer's own project(s)
      for (const repositoryName of projectRepos) {
        try {
          const activity = await getUserRepositoryActivity(
            userData.gitHubUsername,
            `${GITHUB_ORG}/${repositoryName}`,
            startDate
          );

          if (activity.issues > 0) {
            totalGems += activity.issues * 30;
            actions.push(
              `Opened ${activity.issues} issue${activity.issues !== 1 ? 's' : ''} in '${repositoryName}'`
            );
          }

          // The gems page reads "(your project)" to price this line at 30/PR
          if (activity.mergedPRs > 0) {
            totalGems += activity.mergedPRs * 30;
            actions.push(
              `Merged ${activity.mergedPRs} PR${activity.mergedPRs !== 1 ? 's' : ''} into '${repositoryName}' (your project)`
            );
          }
        } catch (error) {
          console.error(`Error fetching activity for project repository ${repositoryName}:`, error);
        }
      }

      // PRs merged in other public repositories count whether or not the
      // developer is on a project; their own projects are excluded above
      try {
        const otherPRs = await getMergedPRsInOtherRepos(
          userData.gitHubUsername,
          projectRepos.map((repositoryName) => `${GITHUB_ORG}/${repositoryName}`),
          startDate
        );

        for (const pr of otherPRs) {
          totalGems += 50;
          const mergedDate = pr.mergedAt ? new Date(pr.mergedAt).toLocaleDateString() : 'unknown date';
          actions.push(`Merged a PR into '${pr.repo}' on ${mergedDate}`);
        }
      } catch (error) {
        console.error('Error fetching other-repo PRs:', error);
      }
    }

    return {
      totalGems,
      actions: actions.sort().reverse(),
    };
  } catch (error) {
    console.error('Error computing gem count:', error);
    throw error;
  }
}

export function formatGemBreakdown(breakdown: GemBreakdown): string {
  if (breakdown.totalGems === 0) {
    return 'No gems earned yet. Start attending events or contributing to projects!';
  }

  const header = `You have earned **${breakdown.totalGems} gems**!`;

  if (breakdown.actions.length === 0) {
    return header;
  }

  const actionsList = breakdown.actions
    .map((action) => `• ${action}`)
    .join('\n');

  return `${header}\n\n**How you earned them:**\n${actionsList}`;
}
