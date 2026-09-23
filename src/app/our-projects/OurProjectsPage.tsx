'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageContainer, SectionContainer } from '@components/Container';
import { leadCannotLeaveMessage, Project } from '@data';
import { CardMembership, ProjectCard } from '@components/ProjectCard';
import Link from 'next/link';
import { useAuth } from '@context/AuthContext';
import { useUserProjects } from '@hooks/useUserProjects';
import {
  getFirestoreProjects,
  getProjectLeads,
  joinProject,
  leaveProject,
  ProjectLead,
} from '@/lib/projectService';

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || 'Open-Sourcery-UMD';

/**
 * Most open slots first, so the teams looking for people lead. Ties go to the
 * smaller team, then to the project's name.
 */
function sortForDisplay(projects: Project[]): Project[] {
  return [...projects].sort((projA, projB) => {
    const projASpotsRemaining = projA.maxTeamSize - projA.currentTeamSize;
    const projBSpotsRemaining = projB.maxTeamSize - projB.currentTeamSize;

    return (
      projBSpotsRemaining - projASpotsRemaining ||
      projA.maxTeamSize - projB.maxTeamSize ||
      projA.projectName.localeCompare(projB.projectName)
    );
  });
}

/**
 * Every active project. Open to anyone - browsing doesn't need an account -
 * but joining requires signing in with a verified email.
 */
export default function OurProjectsPage({ semester }: { semester: string }) {
  const { firebaseUser, firestoreUser, emailVerified, loading } = useAuth();
  const {
    projects: myProjects,
    pendingProjectIds,
    pendingProposals,
    loading: loadingMembership,
    incomplete: membershipIncomplete,
    refresh: refreshMembership,
  } = useUserProjects();

  const isSignedIn = Boolean(firebaseUser);

  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Map<string, ProjectLead>>(new Map());
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState('');
  const [joiningProjectId, setJoiningProjectId] = useState<string | null>(null);
  const [leavingProjectId, setLeavingProjectId] = useState<string | null>(null);
  // Shown after a join when they couldn't be added to the project's Discord channel
  const [discordNotice, setDiscordNotice] = useState<{ projectName: string; inviteUrl: string } | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      // Both load before rendering so cards don't pop a lead in a moment
      // later, and in parallel since neither needs the other
      const [data, projectLeads] = await Promise.all([
        getFirestoreProjects(),
        getProjectLeads(),
      ]);

      setProjects(sortForDisplay(data));
      setLeads(projectLeads);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects.');
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // Nothing here depends on who's signed in, so start right away
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const myProjectIds = new Set(myProjects.map((project) => project.id));

  // Only invited so far, not yet a collaborator anywhere: that invitation has
  // to be answered before they can join a different team
  const pendingInvite =
    myProjects.length > 0 && myProjects.every((project) => pendingProjectIds.has(project.id))
      ? myProjects[0]
      : null;

  const membershipFor = (project: Project): CardMembership => {
    if (!isSignedIn) return 'signed-out';
    if (loadingMembership) return 'checking';
    if (myProjectIds.has(project.id)) return 'this';
    if (pendingInvite) return 'invited';
    if (myProjects.length > 0) return 'other';
    // A proposal awaiting review is a commitment to lead that project
    if (pendingProposals.length > 0) return 'proposal';
    // The server refuses unverified joins, so say so up front
    if (!emailVerified) return 'unverified';
    // Couldn't rule out that they're already committed - don't allow a join
    if (membershipIncomplete) return 'unavailable';
    return 'none';
  };

  const handleJoin = async (project: Project) => {
    if (!firebaseUser?.uid) return;

    // Joining is a commitment: it's one project at a time, and it sends a
    // GitHub invitation right away
    const confirmed = window.confirm(
      `Join "${project.projectName}" as a Developer? You'll get an invitation to its ` +
        `GitHub repository, and you can only be on one project at a time.`
    );
    if (!confirmed) return;

    setJoiningProjectId(project.id);
    setError('');
    setDiscordNotice(null);

    try {
      // The server re-checks every rule before sending the invitation
      const discord = await joinProject(project.id);
      if (discord?.addedToChannel === false) {
        setDiscordNotice({ projectName: project.projectName, inviteUrl: discord.inviteUrl });
      }
      // Joining changes both membership and team sizes
      await Promise.all([refreshMembership({ fresh: true }), loadProjects()]);
    } catch (err) {
      console.error('Error joining project:', err);
      setError(err instanceof Error ? err.message : 'Failed to join project.');
      // A refused join can mean this page's view of membership was stale
      refreshMembership({ fresh: true });
    } finally {
      setJoiningProjectId(null);
    }
  };

  const handleLeave = async (project: Project) => {
    if (!firebaseUser?.uid) return;

    // Caught here too so a lead isn't asked to confirm something that can't happen
    if (project.pointOfContact === firebaseUser.uid) {
      window.alert(leadCannotLeaveMessage(project.projectName));
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to leave "${project.projectName}"? ` +
        `This removes your access to its GitHub repository.`
    );
    if (!confirmed) return;

    setLeavingProjectId(project.id);
    setError('');

    try {
      await leaveProject(project.id);
      // Leaving frees a spot and lifts the one-project block elsewhere
      await Promise.all([refreshMembership({ fresh: true }), loadProjects()]);
    } catch (err) {
      console.error('Error leaving project:', err);
      setError(err instanceof Error ? err.message : 'Failed to leave project.');
    } finally {
      setLeavingProjectId(null);
    }
  };

  const busy = joiningProjectId !== null || leavingProjectId !== null;

  return (
    <PageContainer>
      <SectionContainer>
        <h1 className="text-4xl md:text-6xl font-semibold mb-4 text-blue-600">
          Our Projects
        </h1>
        <p className="mb-6 text-black">
          Every active Open Sourcery project for {semester}, launched and led by our members.
          Find one matching your skills and interests, and join a team as a Developer to start contributing today.
        </p>

        {!loading && !isSignedIn && (
          <div className="mb-6 p-4 bg-white/70 border border-black/5 rounded-2xl text-graphite-soft">
            <Link href="/log-in" className="font-medium text-azure underline">
              Sign in
            </Link>{' '}
            or{' '}
            <Link href="/sign-up" className="font-medium text-azure underline">
              create an account
            </Link>{' '}
            to join a project.
          </div>
        )}

        {discordNotice && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl">
            You&apos;re on the &apos;{discordNotice.projectName}&apos; team! We couldn&apos;t find{' '}
            <span className="font-semibold">@{firestoreUser?.discordUsername || 'your username'}</span> in
            the Open Sourcery Discord, so you haven&apos;t been added to the project&apos;s channel yet.{' '}
            <a
              href={discordNotice.inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Join the server
            </a>{' '}
            or check your username in{' '}
            <Link href="/settings" className="font-medium underline">
              Settings
            </Link>
            , and you&apos;ll be added within a day.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {isSignedIn && !loadingMembership && pendingInvite && (
          <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
            Your invitation to &apos;{pendingInvite.projectName}&apos; is waiting on GitHub.{' '}
            <a
              href={`https://github.com/${GITHUB_ORG}/${pendingInvite.repositoryName}/invitations`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Accept it
            </a>{' '}
            to start contributing, or decline it if you&apos;d rather join a different project.
            You can&apos;t join another project until you respond.
          </div>
        )}

        {isSignedIn && !loadingMembership && myProjects.length === 0 && pendingProposals.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
            Your proposal &apos;{pendingProposals[0].projectName}&apos; is awaiting review, so you
            can&apos;t join another project while it&apos;s pending. If you&apos;d rather join an
            existing team, you can withdraw it in{' '}
            <Link href="/settings" className="underline font-medium">
              Settings
            </Link>
            .
          </div>
        )}

        {isSignedIn &&
          !loadingMembership &&
          membershipIncomplete &&
          myProjects.length === 0 &&
          pendingProposals.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
            We couldn&apos;t verify your current project membership with GitHub, so joining is
            temporarily unavailable. Please refresh the page in a moment.
          </div>
        )}

        {loadingProjects ? (
          <p className="text-graphite-soft">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="text-graphite-soft">No projects available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                lead={leads.get(project.id)}
                onJoin={handleJoin}
                onLeave={handleLeave}
                membership={membershipFor(project)}
                joinLocked={busy}
                joining={joiningProjectId === project.id}
                leaving={leavingProjectId === project.id}
              />
            ))}
          </div>
        )}
      </SectionContainer>
    </PageContainer>
  );
}
