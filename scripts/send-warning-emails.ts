import { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "./lib/firebase-admin";
import { sendEmail } from "../src/lib/emailService";
import {
  getRepositoryMembership,
  getUserCommitsSince,
} from "../src/lib/githubApi";

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";
// Quiet for this long on a project earns a nudge, and at most one nudge
// per person per fortnight
const INACTIVE_DAYS = 30;
const REMINDER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const now = new Date();
  const inactiveSince = new Date(now.getTime() - INACTIVE_DAYS * DAY_MS);
  const lastReminderBefore = new Date(now.getTime() - REMINDER_DAYS * DAY_MS);

  // Membership lives on GitHub - someone is on a project when they have access
  // to its repository (or a pending invitation) - so start from the projects
  // and match their members back to user accounts
  const [projectsSnapshot, usersSnapshot] = await Promise.all([
    db.collection("projects").get(),
    db.collection("users").get(),
  ]);

  // gitHubUsername is stored as typed; GitHub reports canonical casing
  const usersByLogin = new Map<string, QueryDocumentSnapshot>();
  for (const userDoc of usersSnapshot.docs) {
    const login = (userDoc.data().gitHubUsername || "").trim().toLowerCase();
    if (login) usersByLogin.set(login, userDoc);
  }

  // Don't nag members of archived projects
  const activeProjects = projectsSnapshot.docs
    .map((projectDoc) => projectDoc.data())
    .filter((project) => project.status !== "ARCHIVED" && project.repositoryName);

  // Every team's membership at once, rather than one project at a time
  const memberships = await Promise.allSettled(
    activeProjects.map((project) =>
      getRepositoryMembership(GITHUB_ORG, project.repositoryName)
    )
  );

  // At most one warning per person per run, even if they're on several projects
  const warnedThisRun = new Set<string>();
  let warningsSent = 0;

  for (const [index, project] of activeProjects.entries()) {
    const repoName: string = project.repositoryName;
    const result = memberships[index];

    if (result.status === "rejected") {
      console.error(
        `Skipping "${project.projectName}": couldn't read its members from GitHub`,
        result.reason
      );
      continue;
    }
    const members = result.value;

    for (const login of [...members.collaborators, ...members.pendingInvitees]) {
      const userDoc = usersByLogin.get(login.toLowerCase());
      if (!userDoc || warnedThisRun.has(userDoc.id)) continue;

      const userData = userDoc.data();

      // Check last commit via GitHub API
      const commitCount = await getUserCommitsSince(
        GITHUB_ORG,
        repoName,
        login,
        inactiveSince
      );

      if (commitCount > 0) continue; // User is active

      // Check lastWarningTime
      const lastWarning = userData.lastWarningTime?.toDate?.()
        || (userData.lastWarningTime instanceof Date ? userData.lastWarningTime : null)
        || new Date(0);

      if (lastWarning > lastReminderBefore) continue; // Already warned recently

      // Send warning email
      console.log(
        `Sending warning to ${userData.email} for project ${project.projectName}`
      );
      await sendEmail(
        [userData.email],
        `Inactivity Warning - ${project.projectName}`,
        `Hi ${userData.firstName},\n\n` +
          `We noticed you haven't made any commits to ${project.projectName} in the last ${INACTIVE_DAYS} days. ` +
          `Please make a contribution soon or reach out to your team lead if you need help.\n\n` +
          `- Open Sourcery`
      );

      // Update lastWarningTime
      await db.collection("users").doc(userDoc.id).update({
        lastWarningTime: new Date(),
      });

      warnedThisRun.add(userDoc.id);
      warningsSent++;
    }
  }

  console.log(`Warning emails script complete. ${warningsSent} warning(s) sent.`);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
