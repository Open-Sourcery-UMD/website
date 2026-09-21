import { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "./lib/firebase-admin";
import { sendEmail } from "../src/lib/emailService";
import {
  getRepositoryMembership,
  getUserCommitsSince,
} from "../src/lib/githubApi";

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function main() {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - FOURTEEN_DAYS_MS);
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

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

  // At most one warning per person per run, even if they're on several projects
  const warnedThisRun = new Set<string>();
  let warningsSent = 0;

  for (const projectDoc of projectsSnapshot.docs) {
    const project = projectDoc.data();

    // Don't nag members of archived projects
    if (project.status === "ARCHIVED") continue;

    const repoName = project.repositoryName;
    if (!repoName) continue;

    let members;
    try {
      members = await getRepositoryMembership(GITHUB_ORG, repoName);
    } catch (error) {
      console.error(
        `Skipping "${project.projectName}": couldn't read its members from GitHub`,
        error
      );
      continue;
    }

    for (const login of [...members.collaborators, ...members.pendingInvitees]) {
      const userDoc = usersByLogin.get(login.toLowerCase());
      if (!userDoc || warnedThisRun.has(userDoc.id)) continue;

      const userData = userDoc.data();

      // Check last commit via GitHub API
      const commitCount = await getUserCommitsSince(
        GITHUB_ORG,
        repoName,
        login,
        fourteenDaysAgo
      );

      if (commitCount > 0) continue; // User is active

      // Check lastWarningTime
      const lastWarning = userData.lastWarningTime?.toDate?.()
        || (userData.lastWarningTime instanceof Date ? userData.lastWarningTime : null)
        || new Date(0);

      if (lastWarning > sevenDaysAgo) continue; // Already warned recently

      // Send warning email
      console.log(
        `Sending warning to ${userData.email} for project ${project.projectName}`
      );
      await sendEmail(
        [userData.email],
        `Inactivity Warning - ${project.projectName}`,
        `Hi ${userData.firstName},\n\n` +
          `We noticed you haven't made any commits to ${project.projectName} in the last 14 days. ` +
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
