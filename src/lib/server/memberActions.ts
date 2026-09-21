/**
 * Server-side actions a signed-in member can take.
 *
 * Every rule that matters is enforced here rather than in the browser: the
 * browser checks the same things for a friendly UI, but anyone can call the
 * API directly, and only the server holds the GitHub token that actually
 * grants or revokes repository access. The acting GitHub account always comes
 * from the caller's own profile - never from the request - so nobody can act
 * on someone else's behalf.
 */
import { DocumentData, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin";
import { HttpError } from "./httpErrors";
import {
  getRepositoryMembership,
  inviteUserToOrganization,
  inviteUserToRepository,
  removeUserFromRepository,
  RepositoryMembership,
} from "@/lib/githubApi";
import { sendEmail } from "@/lib/emailService";
import { leadCannotLeaveMessage } from "@/data";

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";
const ADMIN_EMAIL = "Open Sourcery <umdopensourcery@gmail.com>";

// Long enough to cover a join end to end; short enough that a lock left by a
// crashed request only blocks that user briefly
const JOIN_LOCK_TTL_MS = 60_000;

interface ProjectRecord {
  id: string;
  projectName: string;
  repositoryName: string;
  status?: string;
  pointOfContact?: string;
  maxTeamSize: number;
}

function toProjectRecord(id: string, data: DocumentData): ProjectRecord {
  return {
    id,
    projectName: data.projectName || "",
    repositoryName: data.repositoryName || "",
    status: data.status,
    pointOfContact: data.pointOfContact,
    maxTeamSize: Number(data.maxTeamSize) || 0,
  };
}

function hasMember(members: RepositoryMembership, login: string): boolean {
  const target = login.trim().toLowerCase();
  return [...members.collaborators, ...members.pendingInvitees].some(
    (member) => member.trim().toLowerCase() === target
  );
}

async function getProject(projectId: unknown): Promise<ProjectRecord> {
  if (typeof projectId !== "string" || !projectId) {
    throw new HttpError(400, "projectId is required");
  }

  const snapshot = await adminDb().collection("projects").doc(projectId).get();
  if (!snapshot.exists) {
    throw new HttpError(404, "Project not found");
  }

  return toProjectRecord(snapshot.id, snapshot.data()!);
}

async function getProfile(uid: string): Promise<DocumentData> {
  const snapshot = await adminDb().collection("users").doc(uid).get();
  if (!snapshot.exists) {
    throw new HttpError(404, "Your profile could not be found");
  }
  return snapshot.data()!;
}

function requireGitHubUsername(profile: DocumentData): string {
  const login = (profile.gitHubUsername || "").trim();
  if (!login) {
    throw new HttpError(400, "Add your GitHub username in Settings first");
  }
  return login;
}

/**
 * The user's project proposal that's still awaiting review, if any.
 *
 * Proposing a project is a commitment to lead it once the board creates its
 * repository. Until then the proposer has no repository access - so they'd
 * look free to join another team, and end up on two projects the moment
 * their repository appears.
 */
async function findPendingProposal(
  uid: string,
  exceptProjectId?: string
): Promise<ProjectRecord | null> {
  const snapshot = await adminDb()
    .collection("projects")
    .where("pointOfContact", "==", uid)
    .get();

  const pending = snapshot.docs
    .map((doc) => toProjectRecord(doc.id, doc.data()))
    .find((project) => project.status === "PROPOSED" && project.id !== exceptProjectId);

  return pending ?? null;
}

/**
 * Every project the user is on, read fresh from GitHub. If any repository
 * can't be checked this throws instead of guessing, since "unknown" must
 * never be mistaken for "not a member".
 */
async function getMembershipSnapshot(): Promise<{
  projects: ProjectRecord[];
  membershipOf: (project: ProjectRecord) => RepositoryMembership;
}> {
  const snapshot = await adminDb().collection("projects").get();
  const projects = snapshot.docs
    .map((doc) => toProjectRecord(doc.id, doc.data()))
    .filter((project) => project.repositoryName);

  const results = await Promise.allSettled(
    projects.map((project) =>
      getRepositoryMembership(GITHUB_ORG, project.repositoryName, { fresh: true })
    )
  );

  const membership = new Map<string, RepositoryMembership>();
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `Couldn't read membership of ${projects[index].repositoryName}:`,
        result.reason
      );
      throw new HttpError(
        503,
        "We couldn't verify your current project membership with GitHub. Please try again in a moment."
      );
    }
    membership.set(projects[index].id, result.value);
  });

  return {
    projects,
    membershipOf: (project) =>
      membership.get(project.id) ?? { collaborators: [], pendingInvitees: [] },
  };
}

/**
 * Runs `fn` while holding a per-user lock, so two requests from the same
 * user (e.g. two open tabs) can't both pass the "not on a project yet" check
 * before either invitation lands.
 */
async function withJoinLock<T>(uid: string, fn: () => Promise<T>): Promise<T> {
  const lockRef = adminDb().collection("joinLocks").doc(uid);

  await adminDb().runTransaction(async (transaction) => {
    const lock = await transaction.get(lockRef);
    const acquiredAt: number | undefined = lock.data()?.acquiredAt?.toMillis?.();

    if (acquiredAt && Date.now() - acquiredAt < JOIN_LOCK_TTL_MS) {
      throw new HttpError(409, "You already have a join request in progress.");
    }

    transaction.set(lockRef, { acquiredAt: Timestamp.now() });
  });

  try {
    return await fn();
  } finally {
    await lockRef.delete().catch((error) =>
      console.error(`Failed to release join lock for ${uid}:`, error)
    );
  }
}

/**
 * Stores the member count on the project for display. Best-effort: the
 * membership change already happened, and a stale count isn't worth failing
 * the request over.
 */
async function storeTeamSize(project: ProjectRecord, size: number): Promise<void> {
  try {
    await adminDb().collection("projects").doc(project.id).update({ currentTeamSize: size });
  } catch (error) {
    console.error(`Error storing team size for ${project.projectName}:`, error);
  }
}

/** Re-reads the member count from GitHub and stores it */
async function refreshTeamSize(project: ProjectRecord): Promise<void> {
  try {
    const { collaborators, pendingInvitees } = await getRepositoryMembership(
      GITHUB_ORG,
      project.repositoryName,
      { fresh: true }
    );
    await storeTeamSize(project, collaborators.length + pendingInvitees.length);
  } catch (error) {
    console.error(`Error refreshing team size for ${project.projectName}:`, error);
  }
}

async function notifyLeadOfJoin(
  project: ProjectRecord,
  profile: DocumentData,
  login: string
): Promise<void> {
  try {
    if (!project.pointOfContact) return;

    const lead = await adminDb().collection("users").doc(project.pointOfContact).get();
    const leadEmail = lead.data()?.email;
    if (!leadEmail) {
      console.warn(`No lead email for project ${project.projectName}; skipping join notification`);
      return;
    }

    const developerName =
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") || login;

    await sendEmail(
      [leadEmail],
      `[${project.projectName}] New Developer Joined: ${developerName}`,
      `Hello,\n\n` +
        `A new developer has joined your project '${project.projectName}'!\n\n` +
        `Developer: ${developerName}\n` +
        `Discord Username: ${profile.discordUsername || "N/A"}\n` +
        `GitHub Username: ${login}\n\n` +
        `Best regards,\nOpen Sourcery`
    );
  } catch (error) {
    // A failed notification shouldn't undo or fail the join
    console.error("Error sending lead developer notification email:", error);
  }
}

/**
 * Joins a project by inviting the caller's own GitHub account to its
 * repository - the invitation is what makes them a member.
 */
export async function joinProject(uid: string, projectId: unknown): Promise<void> {
  const [profile, userRecord, project] = await Promise.all([
    getProfile(uid),
    adminAuth().getUser(uid),
    getProject(projectId),
  ]);

  // Read from the account itself rather than the token, whose
  // email_verified claim can lag behind a just-completed verification
  if (!userRecord.emailVerified) {
    throw new HttpError(403, "Verify your email address before joining a project.");
  }

  const login = requireGitHubUsername(profile);

  if (project.status === "ARCHIVED") {
    throw new HttpError(409, "This project is no longer accepting new members.");
  }

  const teamSize = await withJoinLock(uid, async () => {
    // Independent reads, so they run together. Joining your own proposed
    // project (once its repo exists) is fine.
    const [pendingProposal, { projects, membershipOf }] = await Promise.all([
      findPendingProposal(uid, project.id),
      getMembershipSnapshot(),
    ]);
    if (pendingProposal) {
      throw new HttpError(
        409,
        `Your proposal "${pendingProposal.projectName}" is awaiting review. ` +
          `Withdraw it in Settings if you'd rather join an existing project.`
      );
    }

    const currentProjects = projects.filter((candidate) =>
      hasMember(membershipOf(candidate), login)
    );

    if (currentProjects.some((current) => current.id === project.id)) {
      throw new HttpError(409, "You're already on this project.");
    }
    if (currentProjects.length > 0) {
      throw new HttpError(
        409,
        "You're already on a project. Leave it from Settings before joining another."
      );
    }

    // Pending invitations hold a spot just like accepted ones
    const members = membershipOf(project);
    const currentSize = members.collaborators.length + members.pendingInvitees.length;
    if (currentSize >= project.maxTeamSize) {
      throw new HttpError(409, "This project is at its maximum team size.");
    }

    await inviteUserToRepository(login, GITHUB_ORG, project.repositoryName);
    // The membership was read fresh just above and they weren't on it, so
    // the invitation adds exactly one - no need to ask GitHub again
    return currentSize + 1;
  });

  await Promise.all([
    storeTeamSize(project, teamSize),
    notifyLeadOfJoin(project, profile, login),
  ]);
}

/**
 * Leaves a project by revoking the caller's own access to its repository.
 * Losing access *is* leaving, so a GitHub failure propagates to the caller.
 *
 * The lead can't leave: the project would be left without one, so they have
 * to hand leadership to another member first.
 */
export async function leaveProject(uid: string, projectId: unknown): Promise<void> {
  const [profile, project] = await Promise.all([getProfile(uid), getProject(projectId)]);

  if (project.pointOfContact === uid) {
    throw new HttpError(409, leadCannotLeaveMessage(project.projectName));
  }

  const login = requireGitHubUsername(profile);

  await removeUserFromRepository(login, GITHUB_ORG, project.repositoryName);
  await refreshTeamSize(project);
}

/**
 * Withdraws the caller's own proposal while it's still awaiting review,
 * which also frees them to join an existing project
 */
export async function withdrawProposal(uid: string, projectId: unknown): Promise<void> {
  const project = await getProject(projectId);

  if (project.pointOfContact !== uid) {
    throw new HttpError(403, "Only the person who proposed this project can withdraw it.");
  }
  if (project.status !== "PROPOSED") {
    throw new HttpError(409, "Only a proposal that's still awaiting review can be withdrawn.");
  }

  await adminDb().collection("projects").doc(project.id).delete();

  // The board was emailed when it was proposed - tell them to stop setting it up
  try {
    const profile = await getProfile(uid);
    const proposer =
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "The proposer";

    await sendEmail(
      [ADMIN_EMAIL],
      `[WITHDRAWN] Project proposal withdrawn: ${project.projectName}`,
      `Dear Open Sourcery Team,\n\n` +
        `${proposer} (${profile.email || "no email"}) has withdrawn their proposal for ` +
        `'${project.projectName}'. No further action is needed; if you had started ` +
        `setting it up (e.g. creating the ${project.repositoryName} repository), you can stop.\n\n` +
        `- Open Sourcery Website`
    );
  } catch (error) {
    console.error("Error notifying the board of a withdrawn proposal:", error);
  }
}

/**
 * Invites the caller's own GitHub account to the organization
 */
export async function inviteSelfToOrganization(uid: string): Promise<void> {
  const profile = await getProfile(uid);
  await inviteUserToOrganization(requireGitHubUsername(profile), GITHUB_ORG);
}
