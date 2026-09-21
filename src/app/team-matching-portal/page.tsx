'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageContainer, SectionContainer } from '@components/Container';
import { Project } from '@data';
import { CardMembership, ProjectCard } from '@components/ProjectCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@context/AuthContext';
import { useUserProjects } from '@hooks/useUserProjects';
import {
  getFirestoreProjects,
  getProjectLeads,
  joinProject,
  ProjectLead,
} from '@/lib/projectService';
import VerificationGate from '@components/VerificationGate';

function sortBySpotsRemaining(projects: Project[]): Project[] {
  return [...projects].sort((projA, projB) => {
    const projASpotsRemaining = projA.maxTeamSize - projA.currentTeamSize;
    const projBSpotsRemaining = projB.maxTeamSize - projB.currentTeamSize;
    return projBSpotsRemaining - projASpotsRemaining;
  });
}

export default function TeamMatchingPortalPage() {
  const router = useRouter();
  const { firebaseUser, loading } = useAuth();
  const {
    projects: myProjects,
    pendingProposals,
    loading: loadingMembership,
    incomplete: membershipIncomplete,
    refresh: refreshMembership,
  } = useUserProjects();

  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Map<string, ProjectLead>>(new Map());
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState('');
  const [joiningProjectId, setJoiningProjectId] = useState<string | null>(null);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/log-in');
    }
  }, [loading, firebaseUser, router]);

  const loadProjects = useCallback(async () => {
    try {
      const data = await getFirestoreProjects();
      // Fetched before rendering so cards don't pop in a lead a moment later
      const projectLeads = await getProjectLeads(data);

      setProjects(sortBySpotsRemaining(data));
      setLeads(projectLeads);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects.');
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  if (!loading && !firebaseUser) {
    return null;
  }

  const myProjectIds = new Set(myProjects.map((project) => project.id));

  const membershipFor = (project: Project): CardMembership => {
    if (loadingMembership) return 'checking';
    if (myProjectIds.has(project.id)) return 'this';
    if (myProjects.length > 0) return 'other';
    // A proposal awaiting review is a commitment to lead that project
    if (pendingProposals.length > 0) return 'proposal';
    // Couldn't rule out that they're already committed - don't allow a join
    if (membershipIncomplete) return 'unavailable';
    return 'none';
  };

  const handleJoin = async (project: Project) => {
    if (!firebaseUser?.uid) return;

    setJoiningProjectId(project.id);
    setError('');

    try {
      // The server re-checks every rule before sending the invitation
      await joinProject(project.id);
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

  return (
    <VerificationGate>
      <PageContainer>
        <SectionContainer>
          <h1 className="text-4xl md:text-6xl font-semibold mb-2 text-azure">
            Team Matching Portal
          </h1>
          <p className="mb-6 text-black">
            This portal displays all active projects within Open Sourcery, launched and led by our members.
            Find one matching your skills and interests, and join a team as a Developer to start contributing today!
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {!loadingMembership && myProjects.length === 0 && pendingProposals.length > 0 && (
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

          {!loadingMembership &&
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
                  membership={membershipFor(project)}
                  joinLocked={joiningProjectId !== null}
                  joining={joiningProjectId === project.id}
                />
              ))}
            </div>
          )}
        </SectionContainer>
      </PageContainer>
    </VerificationGate>
  );
}
