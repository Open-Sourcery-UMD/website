'use client';

import { db } from '@/firebaseConfig';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { User } from '@/types/users';
import { getUserRepositoryActivity, getMergedPRsInOtherRepos } from './githubService';

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || 'Open-Sourcery-UMD';

interface GemBreakdown {
  totalGems: number;
  actions: string[];
}

/**
 * Resolves the GitHub repository backing a user's current project.
 *
 * Prefers the repositoryName stored on the project so renamed repos still
 * resolve, falling back to deriving it from the project name.
 */
async function getCurrentProjectRepository(
  projectName: string
): Promise<string | null> {
  if (!projectName) return null;

  const derived = projectName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  try {
    const projectsRef = collection(db, 'projects');
    const snapshot = await getDocs(
      query(projectsRef, where('projectName', '==', projectName))
    );
    const stored = snapshot.docs[0]?.data()?.repositoryName;
    return stored || derived;
  } catch (error) {
    console.error(`Error resolving repository for project ${projectName}:`, error);
    return derived;
  }
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
export async function computeGemCount(uid: string, startDate: Date): Promise<GemBreakdown> {
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
      const repositoryName = await getCurrentProjectRepository(userData.currProject);
      const fullRepo = repositoryName ? `${GITHUB_ORG}/${repositoryName}` : '';

      // Issues and PRs in the developer's own project
      if (fullRepo) {
        try {
          const activity = await getUserRepositoryActivity(
            userData.gitHubUsername,
            fullRepo,
            startDate
          );

          if (activity.issues > 0) {
            totalGems += activity.issues * 30;
            actions.push(
              `Opened ${activity.issues} issue${activity.issues !== 1 ? 's' : ''} in '${repositoryName}'`
            );
          }

          if (activity.mergedPRs > 0) {
            totalGems += activity.mergedPRs * 30;
            actions.push(
              `Merged ${activity.mergedPRs} PR${activity.mergedPRs !== 1 ? 's' : ''} into '${repositoryName}' (your current project)`
            );
          }
        } catch (error) {
          console.error(`Error fetching activity for current project ${userData.currProject}:`, error);
        }
      }

      // PRs merged in other public repositories count whether or not the
      // developer is currently on a project
      try {
        const otherPRs = await getMergedPRsInOtherRepos(
          userData.gitHubUsername,
          fullRepo,
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
