import { db } from "./lib/firebase-admin";
import { sendEmail } from "../src/lib/emailService";
import {
  getOrganizationRepositories,
  getRepositoryMembership,
} from "../src/lib/githubApi";

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";

/**
 * Emails every developer currently on a project that has been archived, letting
 * them know they can leave it and join another one. Projects are flagged with
 * archiveNotificationSent so the daily run doesn't email the same team twice.
 */
async function notifyArchivedProjects(): Promise<number> {
  const archivedSnapshot = await db
    .collection("projects")
    .where("status", "==", "ARCHIVED")
    .get();

  const pendingProjects = archivedSnapshot.docs.filter(
    (projectDoc) => !projectDoc.data().archiveNotificationSent
  );
  if (pendingProjects.length === 0) return 0;

  // Developers on a project are whoever has access to its repository, matched
  // back to accounts by GitHub username (stored as typed, so compare lowercased)
  const usersSnapshot = await db.collection("users").get();

  let notified = 0;

  for (const projectDoc of pendingProjects) {
    const project = projectDoc.data();

    let members;
    try {
      members = await getRepositoryMembership(GITHUB_ORG, project.repositoryName);
    } catch (error) {
      // Leave it unflagged so the next run tries this team again
      console.error(
        `Couldn't read members of archived project "${project.projectName}"; will retry next run`,
        error
      );
      continue;
    }

    const memberLogins = new Set(
      [...members.collaborators, ...members.pendingInvitees].map((login) =>
        login.toLowerCase()
      )
    );

    const memberDocs = usersSnapshot.docs.filter((userDoc) =>
      memberLogins.has((userDoc.data().gitHubUsername || "").trim().toLowerCase())
    );

    for (const memberDoc of memberDocs) {
      const memberData = memberDoc.data();
      if (!memberData.email) continue;

      console.log(
        `Project "${project.projectName}" was archived. Emailing ${memberData.email}`
      );
      await sendEmail(
        [memberData.email],
        `Project "${project.projectName}" Has Been Archived`,
        `Hi ${memberData.firstName},\n\n` +
          `The project "${project.projectName}" has been archived and is no longer ` +
          `an active Open Sourcery project. Thank you for the work you put into it!\n\n` +
          `You're welcome to leave the project from your settings page and join a new ` +
          `team whenever you're ready; head to the Team Matching Portal to see what ` +
          `else is looking for developers.\n\n` +
          `- Open Sourcery`
      );

      notified++;
    }

    await db.collection("projects").doc(projectDoc.id).update({
      archiveNotificationSent: true,
    });
  }

  return notified;
}

async function main() {
  const archiveNotifications = await notifyArchivedProjects();
  console.log(
    `${archiveNotifications} developer(s) notified about archived projects.`
  );

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

    // Look up proposer's email via pointOfContact UID
    const userDoc = await db.collection("users").doc(project.pointOfContact).get();
    if (!userDoc.exists) {
      console.warn(
        `User ${project.pointOfContact} not found for project ${project.projectName}`
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
