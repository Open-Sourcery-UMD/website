'use client';

import { db } from '@/firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { Project } from '@/data';
import { getOrganizationRepositories, getRepositoryTeamMembers, inviteUserToRepository } from './githubService';
import { updateUserProfile } from './userService';

const PROJECTS_COLLECTION = 'projects';

/**
 * Converts a project name to a valid GitHub repository name
 * Format: lowercase, hyphens instead of spaces
 */
function deriveRepositoryName(projectName: string): string {
  return projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Creates a new project proposal and stores it in Firestore
 */
export async function createProjectProposal(
  uid: string,
  projectData: Partial<Project>
): Promise<string> {
  try {
    // Validate required fields
    if (!projectData.projectName || !projectData.description) {
      throw new Error('Project name and description are required');
    }

    // Derive repository name from project name
    const repositoryName = deriveRepositoryName(projectData.projectName);

    // Create project document
    const projectDoc = {
      ...projectData,
      repositoryName,
      createdBy: uid,
      createdAt: Timestamp.now(),
      currentTeamSize: 1, // Creator is first team member
      status: 'PROPOSED',
    };

    // Add to Firestore
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const docRef = doc(projectsRef);
    await setDoc(docRef, projectDoc);

    return docRef.id;
  } catch (error) {
    console.error('Error creating project proposal:', error);
    throw error;
  }
}

/**
 * Fetches all projects from Firestore and validates they exist as GitHub repos
 * Updates currentTeamSize from GitHub if repo exists
 */
export async function getFirestoreProjects(): Promise<Project[]> {
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const snapshot = await getDocs(projectsRef);

    // Get list of valid GitHub repositories
    let validRepos: string[] = [];
    try {
      validRepos = await getOrganizationRepositories();
    } catch (error) {
      console.error('Error fetching GitHub repos, using all Firestore projects:', error);
      // Continue without GitHub validation if API fails
    }

    const projects: Project[] = [];

    for (const docSnap of snapshot.docs) {
      const projectData = docSnap.data();
      const repositoryName = projectData.repositoryName || '';

      // Skip projects if their repository doesn't exist in GitHub org
      if (validRepos.length > 0 && !validRepos.includes(repositoryName)) {
        console.warn(`Project ${projectData.projectName} has no matching GitHub repo: ${repositoryName}`);
        continue;
      }

      try {
        // Update currentTeamSize from GitHub
        const teamMembers = await getRepositoryTeamMembers(repositoryName);
        const teamSize = teamMembers.length;

        projects.push({
          ...projectData,
          id: docSnap.id,
          createdAt: projectData.createdAt?.toDate?.() || new Date(),
          currentTeamSize: teamSize,
        } as Project);
      } catch (error) {
        console.error(`Error updating team size for ${projectData.projectName}:`, error);
        // Include project with Firestore team size if GitHub update fails
        projects.push({
          ...projectData,
          id: docSnap.id,
          createdAt: projectData.createdAt?.toDate?.() || new Date(),
        } as Project);
      }
    }

    return projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Error fetching Firestore projects:', error);
    throw error;
  }
}

/**
 * Fetches a single project by ID
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const docRef = doc(projectsRef, projectId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const projectData = docSnap.data();
    return {
      ...projectData,
      id: docSnap.id,
      createdAt: projectData.createdAt?.toDate?.() || new Date(),
    } as Project;
  } catch (error) {
    console.error('Error fetching project:', error);
    throw error;
  }
}

/**
 * Gets the project a user is currently assigned to
 */
export async function getUserCurrentProject(uid: string): Promise<Project | null> {
  try {
    // This would require tracking team members in Firestore
    // For now, we'll query the users collection to get their currProject
    // and then fetch that project
    const usersRef = collection(db, 'users');
    const userDocRef = doc(usersRef, uid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();
    if (!userData.currProject) {
      return null;
    }

    // Find the project with matching ID or name
    const projects = await getFirestoreProjects();
    return projects.find((p) => p.projectName === userData.currProject) || null;
  } catch (error) {
    console.error('Error fetching user current project:', error);
    throw error;
  }
}

/**
 * Updates a project's team size from GitHub
 */
export async function updateProjectTeamSize(projectId: string): Promise<number> {
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const docRef = doc(projectsRef, projectId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Project not found');
    }

    const projectData = docSnap.data();
    const repositoryName = projectData.repositoryName;

    // Get team members from GitHub
    const teamMembers = await getRepositoryTeamMembers(repositoryName);
    const teamSize = teamMembers.length;

    // Update Firestore
    await updateDoc(docRef, { currentTeamSize: teamSize });

    return teamSize;
  } catch (error) {
    console.error('Error updating project team size:', error);
    throw error;
  }
}

/**
 * Adds a user to a project (updates currProject, sends GitHub invite)
 */
export async function joinProject(
  uid: string,
  projectId: string,
  githubUsername: string
): Promise<void> {
  try {
    // Get project details
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if project is full
    if (project.currentTeamSize >= project.maxTeamSize) {
      throw new Error('Project is at maximum team size');
    }

    // Check if user already has a current project
    const usersRef = collection(db, 'users');
    const userDocRef = doc(usersRef, uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.currProject) {
        throw new Error('Already assigned to a project');
      }
    }

    // Send GitHub invite to repository
    await inviteUserToRepository(githubUsername, project.repositoryName);

    // Update user's currProject
    await updateUserProfile(uid, { currProject: project.projectName });

    // Update project's currentTeamSize
    await updateProjectTeamSize(projectId);
  } catch (error) {
    console.error('Error joining project:', error);
    throw error;
  }
}

/**
 * Removes a user from their current project by project ID
 */
export async function leaveProject(uid: string, projectId: string): Promise<void> {
  try {
    await updateUserProfile(uid, { currProject: '' });
    await updateProjectTeamSize(projectId);
  } catch (error) {
    console.error('Error leaving project:', error);
    throw error;
  }
}

/**
 * Removes a user from their current project by project name
 */
export async function leaveProjectByName(uid: string, projectName: string): Promise<void> {
  try {
    const projects = await getFirestoreProjects();
    const project = projects.find((p) => p.projectName === projectName);

    await updateUserProfile(uid, { currProject: '' });

    if (project) {
      await updateProjectTeamSize(project.id);
    }
  } catch (error) {
    console.error('Error leaving project:', error);
    throw error;
  }
}
