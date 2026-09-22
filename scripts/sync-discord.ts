import { adminDb } from "../src/lib/server/firebaseAdmin";
import {
  getOrganizationRepositories,
  getRepositoryMembership,
  RepositoryMembership,
} from "../src/lib/githubApi";
import {
  addRole,
  channelNameFor,
  DiscordMember,
  getDiscordSetup,
  listGuildMembers,
  normalizeDiscordUsername,
  removeRole,
} from "../src/lib/discordApi";
import { syncProjectChannel } from "../src/lib/server/discordSync";

/**
 * Daily Discord sync.
 *
 * For every project shown on Our Projects (not archived, with a repository in
 * the org):
 *   - makes sure it has a private channel under "projects", and that the
 *     lead and developers have access. It never removes anyone from a
 *     channel: that only happens when someone leaves the project on the site.
 * Then mirrors roles across the whole server:
 *   - "Lead Developers" for every project lead, "Developers" for leads and
 *     developers, removed from anyone who is neither.
 *
 * Membership comes from GitHub (collaborators plus pending invitations) and is
 * matched to Discord through the Discord username on each profile.
 *
 * A project whose membership can't be read is skipped for the day, and if
 * any can't be read, role removals are skipped too: acting on partial data
 * would strip roles from people who still lead or develop elsewhere.
 *
 *   npx tsx --env-file=.env.local scripts/sync-discord.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/sync-discord.ts
 */

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";
const DRY_RUN = process.argv.includes("--dry-run");

/** Discord's permission errors, in terms of what to change in the server */
function explain(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('"code": 50001')) {
    return "the bot can't see this channel. Give its role View Channel in the channel's permissions.";
  }
  if (message.includes('"code": 50013')) {
    return "the bot is missing a permission here (View Channel, Manage Channels or Manage Permissions). " + message;
  }
  return message;
}

async function main() {
  console.log(DRY_RUN ? "Mode: DRY RUN (no changes)\n" : "Mode: APPLY\n");

  const db = adminDb();
  const [projectsSnapshot, usersSnapshot, orgRepos, setup, guildMembers] = await Promise.all([
    db.collection("projects").get(),
    db.collection("users").select("gitHubUsername", "discordUsername").get(),
    getOrganizationRepositories(GITHUB_ORG),
    getDiscordSetup(),
    listGuildMembers(),
  ]);

  // Discord username -> member, for everyone in the server
  const membersByUsername = new Map<string, DiscordMember>();
  for (const member of guildMembers) {
    if (!member.user.bot) membersByUsername.set(member.user.username.toLowerCase(), member);
  }

  // Site account -> Discord id, and GitHub login -> site account
  const discordIdByUid = new Map<string, string>();
  const uidByLogin = new Map<string, string>();
  const unmatched: string[] = [];
  for (const doc of usersSnapshot.docs) {
    const { gitHubUsername, discordUsername } = doc.data();
    const login = (gitHubUsername || "").trim().toLowerCase();
    if (login) uidByLogin.set(login, doc.id);

    const username = normalizeDiscordUsername(discordUsername);
    const member = username ? membersByUsername.get(username) : undefined;
    if (member) discordIdByUid.set(doc.id, member.user.id);
    else if (username) unmatched.push(username);
  }

  // The projects Our Projects shows
  const validRepos = new Set(orgRepos.map((repo) => repo.toLowerCase()));
  const listed = projectsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Record<string, any>)
    .filter(
      (project) =>
        project.status !== "ARCHIVED" &&
        project.repositoryName &&
        validRepos.has(String(project.repositoryName).toLowerCase())
    );

  const memberships = await Promise.allSettled(
    listed.map((project) =>
      getRepositoryMembership(GITHUB_ORG, project.repositoryName, { fresh: true })
    )
  );
  const complete = memberships.every((result) => result.status === "fulfilled");

  const leadIds = new Set<string>();
  const developerIds = new Set<string>();

  for (const [index, project] of listed.entries()) {
    const result = memberships[index];
    if (result.status === "rejected") {
      console.error(`Couldn't read members of ${project.repositoryName}; skipping its channel`, result.reason);
      continue;
    }
    const members: RepositoryMembership = result.value;

    const leadDiscordId = discordIdByUid.get(project.pointOfContact) ?? null;
    const team = new Set<string>();
    if (leadDiscordId) {
      team.add(leadDiscordId);
      leadIds.add(leadDiscordId);
    }
    for (const login of [...members.collaborators, ...members.pendingInvitees]) {
      const uid = uidByLogin.get(login.toLowerCase());
      const discordId = uid ? discordIdByUid.get(uid) : undefined;
      if (discordId) team.add(discordId);
    }
    for (const id of team) developerIds.add(id);

    if (DRY_RUN) {
      const managed = new Set<string>(project.discordMemberIds ?? []);
      const toAdd = [...team].filter((id) => !managed.has(id)).length;
      // Same rule as the real run: a saved channel, else one already under
      // the projects category with the repository's name, else a new one
      const name = channelNameFor(project.repositoryName);
      const existing = setup.channels.find(
        (channel) =>
          channel.id === project.discordChannelId ||
          (channel.type === 0 && channel.parent_id === setup.projectsCategoryId && channel.name === name)
      );
      console.log(
        `#${name}: ${existing ? `would use existing #${existing.name}` : "would create a new private channel"}, ` +
          `up to ${toAdd} to add`
      );
      continue;
    }

    try {
      const outcome = await syncProjectChannel(
        {
          id: project.id,
          projectName: project.projectName,
          repositoryName: project.repositoryName,
          discordChannelId: project.discordChannelId,
          discordMemberIds: project.discordMemberIds,
        },
        setup,
        [...team],
        leadDiscordId
      );
      console.log(
        `#${project.repositoryName}: ${outcome.created ? "created, " : ""}${outcome.granted.length} added`
      );
    } catch (error) {
      console.error(`Channel sync failed for ${project.repositoryName}: ${explain(error)}`);
    }
  }

  // Roles mirror membership across the whole server
  let added = 0;
  let removed = 0;
  for (const member of guildMembers) {
    if (member.user.bot) continue;
    const id = member.user.id;
    const has = new Set(member.roles);

    const changes: [boolean, string, string][] = [
      [leadIds.has(id), setup.leadRoleId, "Lead Developers"],
      [developerIds.has(id), setup.developerRoleId, "Developers"],
    ];

    for (const [shouldHave, roleId, roleName] of changes) {
      if (shouldHave && !has.has(roleId)) {
        console.log(`+ ${roleName}: ${member.user.username}`);
        if (!DRY_RUN) await addRole(id, roleId);
        added++;
      } else if (!shouldHave && has.has(roleId)) {
        if (!complete) continue;
        console.log(`- ${roleName}: ${member.user.username}`);
        if (!DRY_RUN) await removeRole(id, roleId);
        removed++;
      }
    }
  }

  console.log(
    `\nRoles: ${added} added, ${removed} removed${complete ? "" : " (removals skipped: incomplete membership data)"}.`
  );
  if (unmatched.length > 0) {
    // A count only: workflow logs may be public, and these are students' handles
    console.log(`${unmatched.length} profile Discord username(s) not found in the server.`);
  }
}

main().catch((error) => {
  console.error("Discord sync failed:", error);
  process.exit(1);
});
