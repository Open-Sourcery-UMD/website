'use client';

import { useState, useEffect } from 'react';
import { PageContainer, SectionContainer } from '@components/Container';
import { Project } from '@data';
import { ProjectCard } from '@components/ProjectCard';
import { useRouter } from 'next/navigation';
import { useAuth } from '@context/AuthContext';
import { getFirestoreProjects, joinProject } from '@/lib/projectService';
import VerificationGate from '@components/VerificationGate';

export default function TeamMatchingPortalPage() {
  const router = useRouter();
  const { firebaseUser, firestoreUser, loading } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState('');
  const [joiningProjectId, setJoiningProjectId] = useState<string | null>(null);
  const [joinDisabled, setJoinDisabled] = useState(!!firestoreUser?.currProject);

  // Redirect unauthenticated users to login
  if (!loading && !firebaseUser) {
    router.push('/log-in');
    return null;
  }

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await getFirestoreProjects();
        setProjects(data.sort((projA, projB) => {
          const projASpotsRemaining = projA.maxTeamSize - projA.currentTeamSize;
          const projBSpotsRemaining = projB.maxTeamSize - projB.currentTeamSize;
          return projBSpotsRemaining - projASpotsRemaining;
        }));
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects.');
      } finally {
        setLoadingProjects(false);
      }
    }
    fetchProjects();
  }, []);

  const handleJoin = async (project: Project) => {
    if (!firebaseUser?.uid || !firestoreUser?.gitHubUsername) return;

    setJoiningProjectId(project.id);
    setError('');
    setJoinDisabled(true);

    try {
      await joinProject(firebaseUser.uid, project.id, firestoreUser.discordUsername, firestoreUser.gitHubUsername);
      // Refresh projects list
      const updated = await getFirestoreProjects();
      setProjects(updated);
    } catch (err) {
      console.error('Error joining project:', err);
      setJoinDisabled(false);
      setError(err instanceof Error ? err.message : 'Failed to join project.');
    } finally {
      setJoiningProjectId(null);
    }
  };

  return (
    <VerificationGate>
      <PageContainer>
        <SectionContainer>
          <h1 className="text-4xl md:text-6xl font-semibold mb-2 text-ycs-pink">
            Team Matching Portal
          </h1>
          <p className="mb-6 text-gray-400">
            This portal displays all active projects within Open Sourcery, launched and led by our members.
            Find one matching your skills and interests, and join a team as a Developer to start contributing today!
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {loadingProjects ? (
            <p className="text-neutral-400">Loading projects...</p>
          ) : projects.length === 0 ? (
            <p className="text-neutral-400">No projects available yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onJoin={handleJoin}
                  joinDisabled={!!firestoreUser?.currProject || joinDisabled}
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
