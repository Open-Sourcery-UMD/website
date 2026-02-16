import { db } from "./lib/firebase-admin";
import { sendEmail } from "../src/lib/emailService";
import { getUserCommitsSince } from "../src/lib/githubApi";

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function main() {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - FOURTEEN_DAYS_MS);
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

  // Get all users with a currProject
  const usersSnapshot = await db.collection("users").get();

  let warningsSent = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();

    if (!userData.currProject) continue;

    // Find the project to get repositoryName
    const projectsSnapshot = await db
      .collection("projects")
      .where("projectName", "==", userData.currProject)
      .limit(1)
      .get();

    if (projectsSnapshot.empty) continue;

    const project = projectsSnapshot.docs[0].data();
    const repoName = project.repositoryName;
    if (!repoName) continue;

    // Check last commit via GitHub API
    const commitCount = await getUserCommitsSince(
      GITHUB_ORG,
      repoName,
      userData.gitHubUsername,
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
      `Sending warning to ${userData.email} for project ${userData.currProject}`
    );
    await sendEmail(
      [userData.email],
      `Inactivity Warning - ${userData.currProject}`,
      `Hi ${userData.firstName},\n\n` +
        `We noticed you haven't made any commits to ${userData.currProject} in the last 14 days. ` +
        `Please make a contribution soon or reach out to your team lead if you need help.\n\n` +
        `- Open Sourcery`
    );

    // Update lastWarningTime
    await db.collection("users").doc(userDoc.id).update({
      lastWarningTime: new Date(),
    });

    warningsSent++;
  }

  console.log(`Warning emails script complete. ${warningsSent} warning(s) sent.`);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
