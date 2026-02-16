import { db } from "./lib/firebase-admin";
import { sendEmail } from "../src/lib/emailService";
import { getOrganizationRepositories } from "../src/lib/githubApi";

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";

async function main() {
  // Get all PROPOSED projects
  const proposedSnapshot = await db
    .collection("projects")
    .where("status", "==", "PROPOSED")
    .get();

  if (proposedSnapshot.empty) {
    console.log("No PROPOSED projects found.");
    return;
  }

  // Get org repos from GitHub
  const orgRepos = await getOrganizationRepositories(GITHUB_ORG);

  let updated = 0;

  for (const projectDoc of proposedSnapshot.docs) {
    const project = projectDoc.data();
    const repoName = project.repositoryName;

    // Check if repo now exists in the org
    if (!orgRepos.includes(repoName)) continue;

    // Look up proposer's email via createdBy UID
    const userDoc = await db.collection("users").doc(project.createdBy).get();
    if (!userDoc.exists) {
      console.warn(
        `User ${project.createdBy} not found for project ${project.projectName}`
      );
      continue;
    }

    const userData = userDoc.data()!;

    // Send confirmation email
    console.log(
      `Project "${project.projectName}" now has a repo. Emailing ${userData.email}`
    );
    await sendEmail(
      [userData.email],
      `Your Project "${project.projectName}" is Now Active!`,
      `Hi ${userData.firstName},\n\n` +
        `Great news! Your proposed project "${project.projectName}" now has a GitHub repository ` +
        `in the ${GITHUB_ORG} organization.\n\n` +
        `Your project status has been updated to IN_PROGRESS. ` +
        `You can find your repository at: https://github.com/${GITHUB_ORG}/${repoName}\n\n` +
        `Happy coding!\n- Open Sourcery`
    );

    // Update project status to IN_PROGRESS
    await db.collection("projects").doc(projectDoc.id).update({
      status: "IN_PROGRESS",
    });

    updated++;
  }

  console.log(
    `Project status update script complete. ${updated} project(s) updated to IN_PROGRESS.`
  );
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
