'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Project } from '@data';
import { useAuth } from '@context/AuthContext';
import {
  getPendingProposals,
  getProjectsForUser,
  getRepositoryMembers,
  loadProjectMembership,
  ProjectMembership,
} from '@/lib/projectService';

interface UseUserProjectsResult {
  /** Every project the signed-in user is on - usually zero or one */
  projects: Project[];
  /** Projects where the user's repository invitation hasn't been accepted */
  pendingProjectIds: Set<string>;
  /**
   * The user's proposals still awaiting review. Not a membership, but a
   * commitment: while one is pending they can't join another project.
   */
  pendingProposals: Project[];
  /** The full snapshot, for views that also need other people's membership */
  membership: ProjectMembership | null;
  loading: boolean;
  /**
   * Something couldn't be checked, so `projects` or `pendingProposals` may be
   * missing an entry. Anything that would let the user join a project should
   * treat this as "unknown", not "free to join".
   */
  incomplete: boolean;
  /** Re-reads everything; pass `fresh` right after joining or leaving */
  refresh: (options?: { fresh?: boolean }) => Promise<void>;
}

/**
 * Resolves which projects the signed-in user is on, and any proposal of
 * theirs that's awaiting review.
 *
 * Membership is never stored on the user - it's whichever project
 * repositories their GitHub username has access to (or a pending invitation
 * for) - so it's looked up from GitHub each time.
 */
export function useUserProjects(): UseUserProjectsResult {
  const { firebaseUser, firestoreUser, loading: authLoading } = useAuth();
  const uid = firebaseUser?.uid || '';
  const gitHubUsername = firestoreUser?.gitHubUsername || '';

  const [membership, setMembership] = useState<ProjectMembership | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingProjectIds, setPendingProjectIds] = useState<Set<string>>(new Set());
  const [pendingProposals, setPendingProposals] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [incomplete, setIncomplete] = useState(false);

  // Only the most recent request may update state, so a slow response for an
  // old account or username can't overwrite the answer for the current one
  const latestRequest = useRef(0);

  const refresh = useCallback(
    async (options: { fresh?: boolean } = {}) => {
      const requestId = ++latestRequest.current;
      setLoading(true);

      const [membershipResult, proposalsResult] = await Promise.allSettled([
        gitHubUsername ? loadProjectMembership(options) : Promise.resolve(null),
        getPendingProposals(uid),
      ]);

      if (requestId !== latestRequest.current) return;

      let isIncomplete = false;

      if (membershipResult.status === 'fulfilled' && membershipResult.value) {
        const snapshot = membershipResult.value;
        const userProjects = getProjectsForUser(snapshot, gitHubUsername);
        const login = gitHubUsername.toLowerCase();

        const pending = new Set(
          userProjects
            .filter((project) => {
              const { collaborators, pendingInvitees } = getRepositoryMembers(
                snapshot,
                project
              );
              const isCollaborator = collaborators.some(
                (member) => member.toLowerCase() === login
              );
              const isInvited = pendingInvitees.some(
                (member) => member.toLowerCase() === login
              );
              return isInvited && !isCollaborator;
            })
            .map((project) => project.id)
        );

        setMembership(snapshot);
        setProjects(userProjects);
        setPendingProjectIds(pending);
        isIncomplete ||= snapshot.failedRepos.length > 0;
      } else {
        if (membershipResult.status === 'rejected') {
          console.error('Error loading project membership:', membershipResult.reason);
          isIncomplete = true;
        }
        setMembership(null);
        setProjects([]);
        setPendingProjectIds(new Set());
      }

      if (proposalsResult.status === 'fulfilled') {
        setPendingProposals(proposalsResult.value);
      } else {
        console.error('Error loading pending proposals:', proposalsResult.reason);
        setPendingProposals([]);
        isIncomplete = true;
      }

      setIncomplete(isIncomplete);
      setLoading(false);
    },
    [uid, gitHubUsername]
  );

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  return {
    projects,
    pendingProjectIds,
    pendingProposals,
    membership,
    loading: authLoading || loading,
    incomplete,
    refresh,
  };
}
