import { db } from "./lib/firebase-admin";
import { sendEmail } from "../src/lib/emailService";
import { launchProjectOnDiscord } from "../src/lib/server/discordSync";
import {
  getOrganizationRepositories,
  getOrganizationRepositoryDescriptions,
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
          `team whenever you're ready; head to Our Projects on the website to see ` +
          `which teams are looking for developers.\n\n` +
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

/**
 * Moves each PROPOSED project whose repository now exists to IN_PROGRESS and
 * emails its proposer. Returns how many were moved.
 */
async function activateProposedProjects(): Promise<number> {
  const [proposedSnapshot, orgRepos] = await Promise.all([
    db.collection("projects").where("status", "==", "PROPOSED").get(),
    getOrganizationRepositories(GITHUB_ORG),
  ]);

  if (proposedSnapshot.empty) {
    console.log("No PROPOSED projects found.");
    return 0;
  }

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

    // Its channel and the #project-updates announcement. Best-effort: the
    // project is live either way, and the daily Discord sync creates the
    // channel later if this fails.
    try {
      await launchProjectOnDiscord(projectDoc.id);
    } catch (error) {
      console.error(`Couldn't announce "${project.projectName}" on Discord:`, error);
    }

    updated++;
  }

  return updated;
}

/**
 * Copies each project's repository description into Firestore, so the site
 * shows what the team currently says about their own work rather than what
 * the proposal said months ago.
 *
 * The proposal's description is never touched: it stays in `description` and
 * shows whenever the repository has nothing of its own. Clearing a repository
 * description on GitHub therefore restores it here on the next run.
 */
async function syncRepositoryDescriptions(): Promise<number> {
  const [projects, descriptions] = await Promise.all([
    db.collection("projects").get(),
    getOrganizationRepositoryDescriptions(GITHUB_ORG),
  ]);

  const changed = projects.docs.flatMap((projectDoc) => {
    const project = projectDoc.data();
    const repoName = (project.repositoryName || "").trim();
    if (!repoName) return [];

    // Absent from the map means the repository says nothing about itself
    const fromGitHub = descriptions.get(repoName.toLowerCase()) ?? null;
    if ((project.repositoryDescription ?? null) === fromGitHub) return [];

    return [{ ref: projectDoc.ref, repositoryDescription: fromGitHub }];
  });

  // One write apiece, together, rather than a round trip per project in turn
  await Promise.all(
    changed.map(({ ref, repositoryDescription }) => ref.update({ repositoryDescription }))
  );

  return changed.length;
}

async function main() {
  // The jobs touch different fields, so they run side by side
  const [archiveNotifications, updated, described] = await Promise.all([
    notifyArchivedProjects(),
    activateProposedProjects(),
    syncRepositoryDescriptions(),
  ]);

  console.log(
    `${archiveNotifications} developer(s) notified about archived projects.`
  );
  console.log(`${described} project description(s) updated from GitHub.`);
  console.log(
    `Project status update script complete. ${updated} project(s) updated to IN_PROGRESS.`
  );
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
