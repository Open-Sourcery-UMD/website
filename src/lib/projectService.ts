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
  getEffectiveRepoUserCount,
  getOrganizationRepositories,
  getRepositoryMembershipMap,
  RepositoryMembership,
} from './githubService';
import { postAuthorized } from './apiClient';

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
 * Fetches all projects from Firestore and validates they exist as GitHub repos
 * Updates currentTeamSize from GitHub if repo exists
 * ARCHIVED projects are excluded - this is the Team Matching Portal's list
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

      // Skip archived projects before hitting the GitHub API for them
      if (projectData.status === 'ARCHIVED') {
        continue;
      }

      // Skip projects if their repository doesn't exist in GitHub org
      if (validRepos.length > 0 && !validRepos.includes(repositoryName)) {
        console.warn(`Project ${projectData.projectName} has no matching GitHub repo: ${repositoryName}`);
        continue;
      }

      try {
        // Update currentTeamSize from GitHub
        const stats = await getEffectiveRepoUserCount(repositoryName);
        projects.push({
          ...projectData,
          id: docSnap.id,
          createdAt: projectData.createdAt?.toDate?.() || new Date(),
          currentTeamSize: stats.totalEffective,
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
 * Fetches every project straight from Firestore.
 *
 * No GitHub validation or team-size refresh, so it's cheap enough to use as
 * the basis for membership lookups.
 */
export async function getAllProjects(): Promise<Project[]> {
  const snapshot = await getDocs(collection(db, PROJECTS_COLLECTION));

  return snapshot.docs.map((docSnap) => {
    const projectData = docSnap.data();
    return {
      ...projectData,
      id: docSnap.id,
      createdAt: projectData.createdAt?.toDate?.() || new Date(),
    } as Project;
  });
}

export type { RepositoryMembership };

/**
 * A snapshot of who is on which project.
 *
 * Membership is never stored on the user: someone is on a project exactly
 * when their GitHub username has direct access to (or a pending invitation
 * for) the project's repository. Everything that asks "which project is this
 * person on?" goes through a snapshot like this one.
 */
export interface ProjectMembership {
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
    .map((docSnap) => {
      const projectData = docSnap.data();
      return {
        ...projectData,
        id: docSnap.id,
        createdAt: projectData.createdAt?.toDate?.() || new Date(),
      } as Project;
    })
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

export interface ProjectTeamMember {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  discordUsername: string;
  gitHubUsername: string;
  isLead: boolean;
  /** Invited to the repository but hasn't accepted yet */
  pending: boolean;
  /** Has repository access but no Open Sourcery account */
  gitHubOnly: boolean;
}

/**
 * Looks up the Open Sourcery accounts behind a set of GitHub logins.
 *
 * gitHubUsername is stored exactly as the user typed it, while GitHub reports
 * canonical casing. Exact matches are tried first since they're cheap; a
 * case-insensitive scan of all users covers whatever is left over.
 */
async function getUsersByGitHubLogin(
  logins: string[]
): Promise<Map<string, { uid: string; data: DocumentData }>> {
  const found = new Map<string, { uid: string; data: DocumentData }>();
  const wanted = new Set(logins.map(normalizeLogin));
  const usersRef = collection(db, 'users');

  const record = (uid: string, data: DocumentData) => {
    const login = normalizeLogin(data.gitHubUsername || '');
    if (wanted.has(login) && !found.has(login)) {
      found.set(login, { uid, data });
    }
  };

  // Firestore allows at most 30 values in an 'in' filter
  for (let i = 0; i < logins.length; i += 30) {
    const snapshot = await getDocs(
      query(usersRef, where('gitHubUsername', 'in', logins.slice(i, i + 30)))
    );
    snapshot.docs.forEach((docSnap) => record(docSnap.id, docSnap.data()));
  }

  if (found.size < wanted.size) {
    const snapshot = await getDocs(usersRef);
    snapshot.docs.forEach((docSnap) => record(docSnap.id, docSnap.data()));
  }

  return found;
}

/**
 * Fetches everyone on a project, lead first, then active members, then
 * anyone whose invitation is still pending.
 *
 * The roster comes entirely from repository access. Pass the project's
 * membership if it's already loaded to skip fetching it again.
 */
export async function getProjectTeamMembers(
  project: Project,
  repositoryMembers?: RepositoryMembership
): Promise<ProjectTeamMember[]> {
  try {
    let members = repositoryMembers;

    if (!members) {
      const { membership, failed } = await getRepositoryMembershipMap([
        project.repositoryName,
      ]);
      if (failed.length > 0) return [];
      members = membership[project.repositoryName] ?? NO_MEMBERS;
    }

    // A leftover invite for someone who's already a collaborator shouldn't
    // list them twice
    const activeLogins = new Set(members.collaborators.map(normalizeLogin));
    const entries = [
      ...members.collaborators.map((login) => ({ login, pending: false })),
      ...members.pendingInvitees
        .filter((login) => !activeLogins.has(normalizeLogin(login)))
        .map((login) => ({ login, pending: true })),
    ];

    if (entries.length === 0) return [];

    const accounts = await getUsersByGitHubLogin(entries.map((entry) => entry.login));

    const team: ProjectTeamMember[] = entries.map(({ login, pending }) => {
      const account = accounts.get(normalizeLogin(login));

      if (!account) {
        return {
          uid: `github:${login}`,
          firstName: login,
          lastName: '',
          email: '',
          discordUsername: '',
          gitHubUsername: login,
          isLead: false,
          pending,
          gitHubOnly: true,
        };
      }

      return {
        uid: account.uid,
        firstName: account.data.firstName || '',
        lastName: account.data.lastName || '',
        email: account.data.email || '',
        discordUsername: account.data.discordUsername || '',
        gitHubUsername: account.data.gitHubUsername || login,
        isLead: Boolean(project.pointOfContact) && account.uid === project.pointOfContact,
        pending,
        gitHubOnly: false,
      };
    });

    return team.sort((a, b) => {
      if (a.isLead !== b.isLead) return a.isLead ? -1 : 1;
      if (a.pending !== b.pending) return a.pending ? 1 : -1;
      return `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`
      );
    });
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
  projectId: string,
  newLeadUid: string
): Promise<void> {
  try {
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Only an active member with an account can take over as lead
    const members = await getProjectTeamMembers(project);
    const newLead = members.find((member) => member.uid === newLeadUid);

    if (!newLead || newLead.gitHubOnly) {
      throw new Error('The new lead must be a member of the project');
    }
    if (newLead.pending) {
      throw new Error('The new lead has to accept their repository invitation first');
    }

    const docRef = doc(collection(db, PROJECTS_COLLECTION), projectId);
    await updateDoc(docRef, { pointOfContact: newLeadUid });
  } catch (error) {
    console.error('Error transferring project leadership:', error);
    throw error;
  }
}
