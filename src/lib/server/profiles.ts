/**
 * Server-side reads of other people's profiles.
 *
 * Profiles are owner-only in Firestore, so views that show someone else -
 * a project's lead, a team roster - are served from here instead. The Admin
 * SDK bypasses the rules, which makes these functions the gate: each returns
 * only the fields its view displays, and only to callers entitled to see them.
 */
import { DocumentData } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
import { HttpError } from "./httpErrors";
import { getRepositoryMembership } from "@/lib/githubApi";

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";

// The fields a roster or lead panel shows. Nothing else leaves the server.
const CONTACT_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "gitHubUsername",
  "discordUsername",
];

export interface LeadProfile {
  uid: string;
  name: string;
  email: string;
  gitHubUsername: string;
  discordUsername: string;
}

export interface TeamMember {
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

function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

/**
 * The lead developer of every project, keyed by project id. Public: shown on
 * every project card, signed in or not.
 */
export async function getProjectLeads(): Promise<Record<string, LeadProfile>> {
  const projects = await adminDb().collection("projects").get();

  const leadUids = Array.from(
    new Set(projects.docs.map((doc) => doc.data().pointOfContact).filter(Boolean))
  ) as string[];
  if (leadUids.length === 0) return {};

  const snapshots = await adminDb().getAll(
    ...leadUids.map((uid) => adminDb().collection("users").doc(uid)),
    { fieldMask: CONTACT_FIELDS }
  );

  const leadsByUid = new Map<string, LeadProfile>();
  for (const snapshot of snapshots) {
    if (!snapshot.exists) continue;
    const data = snapshot.data()!;
    const name = [data.firstName, data.lastName].filter(Boolean).join(" ");
    if (!name) continue;

    leadsByUid.set(snapshot.id, {
      uid: snapshot.id,
      name,
      email: data.email || "",
      gitHubUsername: data.gitHubUsername || "",
      discordUsername: data.discordUsername || "",
    });
  }

  const leads: Record<string, LeadProfile> = {};
  for (const project of projects.docs) {
    const lead = leadsByUid.get(project.data().pointOfContact);
    if (lead) leads[project.id] = lead;
  }
  return leads;
}

/**
 * One project's roster: lead first, then active members, then anyone whose
 * invitation is still pending.
 *
 * Membership comes from repository access. Only the project's own members
 * (or its lead) may see the roster, since it includes teammates' contacts.
 */
export async function getProjectTeam(
  callerUid: string,
  projectId: unknown
): Promise<TeamMember[]> {
  if (typeof projectId !== "string" || !projectId) {
    throw new HttpError(400, "projectId is required");
  }

  const projectSnapshot = await adminDb().collection("projects").doc(projectId).get();
  if (!projectSnapshot.exists) {
    throw new HttpError(404, "Project not found");
  }
  const project = projectSnapshot.data()!;

  const [members, users] = await Promise.all([
    getRepositoryMembership(GITHUB_ORG, project.repositoryName),
    adminDb().collection("users").select(...CONTACT_FIELDS).get(),
  ]);

  // gitHubUsername is stored as typed; GitHub reports canonical casing
  const accountsByLogin = new Map<string, { uid: string; data: DocumentData }>();
  let callerLogin = "";
  for (const doc of users.docs) {
    const login = normalizeLogin(doc.data().gitHubUsername || "");
    if (doc.id === callerUid) callerLogin = login;
    if (login && !accountsByLogin.has(login)) {
      accountsByLogin.set(login, { uid: doc.id, data: doc.data() });
    }
  }

  const memberLogins = new Set(
    [...members.collaborators, ...members.pendingInvitees].map(normalizeLogin)
  );
  const isLead = Boolean(project.pointOfContact) && project.pointOfContact === callerUid;
  if (!isLead && !(callerLogin && memberLogins.has(callerLogin))) {
    throw new HttpError(403, "Only this project's members can see its team.");
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

  const team: TeamMember[] = entries.map(({ login, pending }) => {
    const account = accountsByLogin.get(normalizeLogin(login));

    if (!account) {
      return {
        uid: `github:${login}`,
        firstName: login,
        lastName: "",
        email: "",
        discordUsername: "",
        gitHubUsername: login,
        isLead: false,
        pending,
        gitHubOnly: true,
      };
    }

    return {
      uid: account.uid,
      firstName: account.data.firstName || "",
      lastName: account.data.lastName || "",
      email: account.data.email || "",
      discordUsername: account.data.discordUsername || "",
      gitHubUsername: account.data.gitHubUsername || login,
      isLead: Boolean(project.pointOfContact) && account.uid === project.pointOfContact,
      pending,
      gitHubOnly: false,
    };
  });

  return team.sort((a, b) => {
    if (a.isLead !== b.isLead) return a.isLead ? -1 : 1;
    if (a.pending !== b.pending) return a.pending ? 1 : -1;
    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
  });
}
