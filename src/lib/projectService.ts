'use client';

import { db } from '@/firebaseConfig';
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { Project } from '@/data';
import {
  getOrganizationRepositories,
  getRepositoryMembershipMap,
  RepositoryMembership,
} from './githubService';
import { authorizedFetch, postAuthorized } from './apiClient';
// Type-only, so none of the server code reaches the browser bundle
import type { LeadProfile, TeamMember } from './server/profiles';

export type ProjectLead = LeadProfile;
export type ProjectTeamMember = TeamMember;

const PROJECTS_COLLECTION = 'projects';

function toProject(id: string, data: DocumentData): Project {
  return {
    ...data,
    id,
    createdAt: data.createdAt?.toDate?.() || new Date(),
  } as Project;
}

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

    // A proposal awaiting review is already a commitment to lead a project
    const [pendingProposal] = await getPendingProposals(uid);
    if (pendingProposal) {
      throw new Error(
        `Your proposal "${pendingProposal.projectName}" is already awaiting review.`
      );
    }

    // Derive repository name from project name
    const repositoryName = deriveRepositoryName(projectData.projectName);

    // Create project document
    const projectDoc = {
      ...projectData,
      repositoryName,
      pointOfContact: uid,
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
 * Every project on the Our Projects page: not archived, and backed by a
 * repository in the GitHub org. Team sizes are live from GitHub, falling back
 * to the stored count for any repository GitHub couldn't answer for.
 */
export async function getFirestoreProjects(): Promise<Project[]> {
  const [snapshot, orgRepos] = await Promise.all([
    getDocs(collection(db, PROJECTS_COLLECTION)),
    // Already returns [] on failure, and then every project is shown
    getOrganizationRepositories(),
  ]);

  // The org list is lowercased; repository names are case-insensitive
  const validRepos = new Set(orgRepos);

  const projects = snapshot.docs
    .map((docSnap) => toProject(docSnap.id, docSnap.data()))
    .filter((project) => {
      if (project.status === 'ARCHIVED') return false;
      if (validRepos.size === 0 || validRepos.has((project.repositoryName || '').toLowerCase())) {
        return true;
      }
      console.warn(`Project ${project.projectName} has no matching GitHub repo: ${project.repositoryName}`);
      return false;
    });

  // Every team size in one request, rather than one round trip per project
  const { membership } = await getRepositoryMembershipMap(
    projects.map((project) => project.repositoryName)
  );

  for (const project of projects) {
    const members = membership[project.repositoryName];
    if (members) {
      project.currentTeamSize = members.collaborators.length + members.pendingInvitees.length;
    }
  }

  return projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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

    return toProject(docSnap.id, docSnap.data());
  } catch (error) {
    console.error('Error fetching project:', error);
    throw error;
  }
}

/**
 * Fetches every project straight from Firestore.
 *
 * No GitHub validation or team-size refresh, so it's cheap enough to use as
 * the basis for membership lookups.
 */
async function getAllProjects(): Promise<Project[]> {
  const snapshot = await getDocs(collection(db, PROJECTS_COLLECTION));
  return snapshot.docs.map((docSnap) => toProject(docSnap.id, docSnap.data()));
}

/**
 * A snapshot of who is on which project.
 *
 * Membership is never stored on the user: someone is on a project exactly
 * when their GitHub username has direct access to (or a pending invitation
 * for) the project's repository. Everything that asks "which project is this
 * person on?" goes through a snapshot like this one.
 */
interface ProjectMembership {
  projects: Project[];
  membership: Record<string, RepositoryMembership>;
  /** Repositories whose membership couldn't be read from GitHub */
  failedRepos: string[];
}

const NO_MEMBERS: RepositoryMembership = { collaborators: [], pendingInvitees: [] };

function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

/**
 * Loads every project together with who has access to its repository.
 *
 * Pass `fresh` when acting on the answer (e.g. before a join), so the check
 * isn't served from the server's short-lived cache.
 */
export async function loadProjectMembership(
  options: { fresh?: boolean } = {}
): Promise<ProjectMembership> {
  const projects = await getAllProjects();

  const { membership, failed } = await getRepositoryMembershipMap(
    projects.map((project) => project.repositoryName).filter(Boolean),
    options
  );

  return { projects, membership, failedRepos: failed };
}

/**
 * Gets the members of one project's repository from a membership snapshot
 */
export function getRepositoryMembers(
  snapshot: ProjectMembership,
  project: Project
): RepositoryMembership {
  return snapshot.membership[project.repositoryName] ?? NO_MEMBERS;
}

/**
 * Gets every project a GitHub user is on.
 *
 * Usually zero or one - the site never lets anyone join a second project -
 * but access granted directly on GitHub can put someone on several, and then
 * they're treated as a member of all of them.
 */
export function getProjectsForUser(
  snapshot: ProjectMembership,
  gitHubUsername: string
): Project[] {
  const login = normalizeLogin(gitHubUsername || '');
  if (!login) return [];

  return snapshot.projects.filter((project) => {
    const { collaborators, pendingInvitees } = getRepositoryMembers(snapshot, project);
    return [...collaborators, ...pendingInvitees].some(
      (member) => normalizeLogin(member) === login
    );
  });
}

/**
 * Fetches the lead developer (point of contact) of each project, keyed by
 * project id.
 *
 * Profiles are owner-only in Firestore, so this comes from the server, which
 * returns just the contact fields. Public, so no session is needed.
 */
export async function getProjectLeads(): Promise<Map<string, ProjectLead>> {
  try {
    const response = await fetch('/api/profiles?action=leads');
    if (!response.ok) return new Map();

    const leads: Record<string, ProjectLead> = await response.json();
    return new Map(Object.entries(leads));
  } catch (error) {
    console.error('Error fetching project leads:', error);
    return new Map();
  }
}

/**
 * The user's project proposals that are still awaiting review - normally at
 * most one.
 *
 * A pending proposal is a commitment to lead that project once the board
 * creates its repository, so it blocks joining another project (enforced by
 * the server) and submitting another proposal.
 */
export async function getPendingProposals(uid: string): Promise<Project[]> {
  if (!uid) return [];

  // Filtering status here avoids needing a composite index
  const snapshot = await getDocs(
    query(collection(db, PROJECTS_COLLECTION), where('pointOfContact', '==', uid))
  );

  return snapshot.docs
    .map((docSnap) => toProject(docSnap.id, docSnap.data()))
    .filter((project) => project.status === 'PROPOSED');
}

/**
 * Joins a project as the signed-in user.
 *
 * The server does all the checking - verified email, not already on a
 * project, no pending proposal, room on the team - and sends the repository
 * invitation that makes the user a member.
 */
export async function joinProject(projectId: string): Promise<void> {
  await postAuthorized('/api/projects', { action: 'join', projectId });
}

/**
 * Leaves a project as the signed-in user by revoking their repository access
 */
export async function leaveProject(projectId: string): Promise<void> {
  await postAuthorized('/api/projects', { action: 'leave', projectId });
}

/**
 * Withdraws the signed-in user's proposal while it's still awaiting review
 */
export async function withdrawProposal(projectId: string): Promise<void> {
  await postAuthorized('/api/projects', { action: 'withdrawProposal', projectId });
}

/**
 * Fetches everyone on a project: lead first, then active members, then anyone
 * whose invitation is still pending.
 *
 * The roster carries teammates' contact details, and profiles are owner-only
 * in Firestore, so the server assembles it - and only for the project's own
 * members.
 */
export async function getProjectTeamMembers(
  project: Project
): Promise<ProjectTeamMember[]> {
  try {
    const params = new URLSearchParams({ action: 'team', projectId: project.id });
    const response = await authorizedFetch(`/api/profiles?${params}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error(`Error fetching team members for ${project.projectName}:`, error);
    return [];
  }
}

/**
 * Updates the lead-editable details of a project
 */
export async function updateProjectDetails(
  projectId: string,
  details: {
    technologiesRequired: string[];
    technologiesUsed: string[];
    yearRange: [number, number];
  }
): Promise<void> {
  try {
    const [minYear, maxYear] = details.yearRange;
    if (minYear > maxYear) {
      throw new Error('Minimum year cannot be greater than maximum year');
    }
    if (details.technologiesUsed.length === 0) {
      throw new Error('Select at least one technology');
    }

    const docRef = doc(collection(db, PROJECTS_COLLECTION), projectId);
    await updateDoc(docRef, details);
  } catch (error) {
    console.error('Error updating project details:', error);
    throw error;
  }
}

/**
 * Hands the lead developer role to another member of the project
 */
export async function transferProjectLeadership(
  project: Project,
  newLeadUid: string
): Promise<void> {
  try {
    // Re-read the roster: someone may have left since the modal opened.
    // Only an active member with an account can take over as lead
    const members = await getProjectTeamMembers(project);
    const newLead = members.find((member) => member.uid === newLeadUid);

    if (!newLead || newLead.gitHubOnly) {
      throw new Error('The new lead must be a member of the project');
    }
    if (newLead.pending) {
      throw new Error('The new lead has to accept their repository invitation first');
    }

    const docRef = doc(collection(db, PROJECTS_COLLECTION), project.id);
    await updateDoc(docRef, { pointOfContact: newLeadUid });
  } catch (error) {
    console.error('Error transferring project leadership:', error);
    throw error;
  }
}
