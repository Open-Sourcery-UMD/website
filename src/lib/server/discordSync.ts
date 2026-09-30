/**
 * Keeps the Discord server in step with the site: project channels, who can
 * see them, the new-project announcement, and invites for new members.
 *
 * People are matched by the Discord username on their profile, among the
 * server's members - the API has no way to find someone who isn't in it.
 *
 * Each project document remembers its channel (discordChannelId) and the
 * members the site has given access (discordMemberIds). Channel access is
 * only ever added automatically; it's taken away solely when someone leaves
 * the project on the site (or deletes their account), never by the daily sync.
 *
 * Roles work the same way round: granted here the moment someone joins a
 * project or launches one, and only ever taken away by the daily sync, which
 * can see every project at once and so knows when someone's last one is
 * behind them.
 *
 * Imports are relative on purpose: the daily sync script runs this via tsx.
 */
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
import { sendEmail } from "../emailService";
import {
  addRole,
  channelNameFor,
  createPrivateProjectChannel,
  DISCORD_INVITE_URL,
  DiscordMember,
  DiscordSetup,
  findMemberByUsername,
  getChannel,
  getDiscordSetup,
  grantChannelAccess,
  isDiscordConfigured,
  normalizeDiscordUsername,
  revokeChannelAccess,
  sendMessage,
} from "../discordApi";

// Don't email the same person an invite more than once a day
const INVITE_EMAIL_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface ChannelProject {
  id: string;
  projectName: string;
  repositoryName: string;
  discordChannelId?: string;
  discordMemberIds?: string[];
}

/**
 * The project's channel, creating a private one if it has none. Returns the
 * channel and the member ids that currently have their own access to it.
 */
export async function ensureProjectChannel(
  project: ChannelProject,
  setup: DiscordSetup,
  leadDiscordId: string | null
): Promise<{ channelId: string; memberIdsWithAccess: Set<string>; created: boolean }> {
  const memberOverwrites = (overwrites: { id: string; type: number }[] = []) =>
    new Set(overwrites.filter((overwrite) => overwrite.type === 1).map((overwrite) => overwrite.id));

  if (project.discordChannelId) {
    const channel = await getChannel(project.discordChannelId);
    if (channel) {
      return {
        channelId: channel.id,
        memberIdsWithAccess: memberOverwrites(channel.permission_overwrites),
        created: false,
      };
    }
  }

  // A channel someone already made by hand is adopted as it is
  const name = channelNameFor(project.repositoryName);
  const existing = setup.channels.find(
    (channel) =>
      channel.type === 0 && channel.parent_id === setup.projectsCategoryId && channel.name === name
  );

  const channel = existing ?? (await createPrivateProjectChannel(name, setup));
  if (!existing) setup.channels.push(channel);

  const update: Record<string, unknown> = { discordChannelId: channel.id };
  const memberIdsWithAccess = memberOverwrites(channel.permission_overwrites);

  // A brand-new channel starts with its lead in it
  if (!existing && leadDiscordId) {
    await grantChannelAccess(channel.id, leadDiscordId);
    memberIdsWithAccess.add(leadDiscordId);
    update.discordMemberIds = [leadDiscordId];
  }

  await adminDb().collection("projects").doc(project.id).update(update);
  return { channelId: channel.id, memberIdsWithAccess, created: !existing };
}

/**
 * Gives everyone on a project's team (`teamIds`: the lead and developers)
 * access to its channel, creating the channel if needed.
 *
 * Only ever adds. Access is taken away solely when someone leaves the project
 * on the site (removeFromProjectChannel), never by a scheduled sync.
 */
export async function syncProjectChannel(
  project: ChannelProject,
  setup: DiscordSetup,
  teamIds: string[],
  leadDiscordId: string | null
): Promise<{ created: boolean; granted: string[] }> {
  const { channelId, memberIdsWithAccess, created } = await ensureProjectChannel(
    project,
    setup,
    leadDiscordId
  );

  const granted = teamIds.filter((id) => !memberIdsWithAccess.has(id));
  for (const id of granted) await grantChannelAccess(channelId, id);

  if (granted.length > 0) {
    await adminDb()
      .collection("projects")
      .doc(project.id)
      .update({ discordMemberIds: FieldValue.arrayUnion(...granted) });
  }

  return { created, granted };
}

async function readProject(
  projectId: string
): Promise<(ChannelProject & { pointOfContact?: string; description: string }) | null> {
  const snapshot = await adminDb().collection("projects").doc(projectId).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data()!;
  return {
    id: snapshot.id,
    projectName: data.projectName || "",
    repositoryName: data.repositoryName || "",
    // The repository's own description where there is one, as the site shows it
    description: data.repositoryDescription || data.description || "",
    discordChannelId: data.discordChannelId,
    discordMemberIds: data.discordMemberIds,
    pointOfContact: data.pointOfContact,
  };
}

/**
 * How much of a description the alert quotes. Every project's fits well
 * inside this; it's only here so an unusually long one can't push the message
 * past Discord's 2,000-character limit and lose the announcement altogether.
 */
const ALERT_DESCRIPTION_LIMIT = 500;

/**
 * The description as one tidy line in quotes, ready to append, or nothing at
 * all for a project that doesn't have one
 */
function quotedDescription(description: string): string {
  const text = description.replace(/\s+/g, " ").trim();
  if (!text) return "";

  const shortened =
    text.length > ALERT_DESCRIPTION_LIMIT
      ? `${text.slice(0, ALERT_DESCRIPTION_LIMIT - 1).trimEnd()}…`
      : text;

  return ` "${shortened}"`;
}

async function discordIdOfUser(uid: string | undefined): Promise<string | null> {
  if (!uid) return null;
  const profile = await adminDb().collection("users").doc(uid).get();
  const member = await findMemberByUsername(profile.data()?.discordUsername);
  return member?.user.id ?? null;
}

/**
 * Someone joined a project on the site: let them into its channel.
 *
 * Returns true once they're in, false if their Discord username isn't in the
 * server (so there's no one to add), and null if it couldn't be checked.
 */
export async function addToProjectChannel(projectId: string, discordUsername: string): Promise<boolean | null> {
  if (!isDiscordConfigured()) return null;

  const [project, member] = await Promise.all([
    readProject(projectId),
    findMemberByUsername(discordUsername),
  ]);
  if (!project) return null;
  if (!member) return false;

  const setup = await getDiscordSetup();
  const leadDiscordId = project.discordChannelId ? null : await discordIdOfUser(project.pointOfContact);
  const { channelId } = await ensureProjectChannel(project, setup, leadDiscordId);

  await grantChannelAccess(channelId, member.user.id);
  await adminDb()
    .collection("projects")
    .doc(projectId)
    .update({ discordMemberIds: FieldValue.arrayUnion(member.user.id) });
  return true;
}

/** Someone left a project on the site: take them out of its channel */
export async function removeFromProjectChannel(projectId: string, discordUsername: string): Promise<void> {
  if (!isDiscordConfigured()) return;

  const [project, member] = await Promise.all([
    readProject(projectId),
    findMemberByUsername(discordUsername),
  ]);
  if (!project?.discordChannelId || !member) return;

  await revokeChannelAccess(project.discordChannelId, member.user.id);
  await adminDb()
    .collection("projects")
    .doc(projectId)
    .update({ discordMemberIds: FieldValue.arrayRemove(member.user.id) });
}

/**
 * A proposed project just went live: give it a channel with its lead in it
 * and announce it in #project-updates, in the format the board used to post
 * by hand
 */
export async function launchProjectOnDiscord(projectId: string): Promise<void> {
  if (!isDiscordConfigured()) return;

  const project = await readProject(projectId);
  if (!project) return;

  const [setup, leadProfile] = await Promise.all([
    getDiscordSetup(),
    project.pointOfContact
      ? adminDb().collection("users").doc(project.pointOfContact).get()
      : Promise.resolve(null),
  ]);
  const leadUsername: string = leadProfile?.data()?.discordUsername || "";
  const lead = await findMemberByUsername(leadUsername);

  await ensureProjectChannel(project, setup, lead?.user.id ?? null);
  if (lead) await grantRolesTo(lead, true);

  if (!setup.projectUpdatesChannelId) {
    console.warn("No #project-updates channel found; skipping the new project announcement");
    return;
  }

  const who = lead
    ? `<@${lead.user.id}>`
    : leadUsername
      ? `@${normalizeDiscordUsername(leadUsername)}`
      : "A new Lead Developer";

  await sendMessage(
    setup.projectUpdatesChannelId,
    `🚨 NEW PROJECT ALERT 🚨\n${who} has started the '${project.projectName}' project!` +
      quotedDescription(project.description),
    lead ? [lead.user.id] : []
  );
}

/**
 * Gives someone the roles that come with being on a project. A lead gets both:
 * they develop on their own project too, which is how the daily sync counts
 * them as well.
 *
 * Roles already held are left alone, so this costs nothing to call again.
 */
async function grantRolesTo(member: DiscordMember, isLead: boolean): Promise<void> {
  const setup = await getDiscordSetup();
  const held = new Set(member.roles);

  const wanted = isLead
    ? [setup.leadRoleId, setup.developerRoleId]
    : [setup.developerRoleId];

  await Promise.all(
    wanted.filter((roleId) => !held.has(roleId)).map((roleId) => addRole(member.user.id, roleId))
  );
}

/**
 * The project roles for whoever owns a Discord username, looked up among the
 * server's members. Someone who isn't in the server can't be given a role;
 * the daily sync picks them up once they arrive.
 */
export async function grantProjectRoles(
  discordUsername: string | undefined,
  isLead: boolean
): Promise<void> {
  if (!isDiscordConfigured()) return;

  const member = await findMemberByUsername(discordUsername || "");
  if (!member) return;

  await grantRolesTo(member, isLead);
}

export interface DiscordInviteStatus {
  /** null when it couldn't be checked */
  inServer: boolean | null;
  inviteUrl: string;
}

/**
 * Checks whether a new member is in the Discord server and, if they aren't,
 * emails them the invite link (at most once a day)
 */
export async function inviteToServerIfNeeded(uid: string): Promise<DiscordInviteStatus> {
  const unknown = { inServer: null, inviteUrl: DISCORD_INVITE_URL };
  if (!isDiscordConfigured()) return unknown;

  const profileRef = adminDb().collection("users").doc(uid);
  const profile = (await profileRef.get()).data();
  if (!profile) return unknown;

  if (await findMemberByUsername(profile.discordUsername)) {
    return { inServer: true, inviteUrl: DISCORD_INVITE_URL };
  }

  const lastSent = profile.discordInviteSentAt?.toMillis?.() ?? 0;
  if (profile.email && Date.now() - lastSent > INVITE_EMAIL_INTERVAL_MS) {
    await sendEmail(
      [profile.email],
      "Join the Open Sourcery Discord",
      `Hi ${profile.firstName || "there"},\n\n` +
        `Welcome to Open Sourcery! Most of our conversation happens on Discord: project ` +
        `channels, questions, and announcements. Join the server here:\n\n` +
        `${DISCORD_INVITE_URL}\n\n` +
        `Once you're in, you'll be added to your project's channel automatically when you ` +
        `join a project.\n\n- Open Sourcery`
    );
    await profileRef.update({ discordInviteSentAt: FieldValue.serverTimestamp() });
  }

  return { inServer: false, inviteUrl: DISCORD_INVITE_URL };
}
