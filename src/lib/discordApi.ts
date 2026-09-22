/**
 * Server-side Discord API access for the Open Sourcery UMD server.
 *
 * Runs as a bot (DISCORD_BOT_TOKEN) and must only be used from the server or
 * scripts. The bot needs, in the server: Manage Roles and Manage Channels,
 * a role placed above "Lead Developers" and "Developers", and the Server
 * Members privileged intent enabled in the Developer Portal (without it the
 * member list and member search are refused).
 *
 * Imports here are relative on purpose: scripts run it through tsx.
 */

const API = "https://discord.com/api/v10";
const TOKEN = process.env.DISCORD_BOT_TOKEN;

export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "1385618525879668838";
export const DISCORD_INVITE_URL =
  process.env.DISCORD_INVITE_URL || "https://discord.com/invite/BWvbpgskZT";

// Looked up by name, so renaming these in Discord means updating them here
const LEAD_ROLE_NAME = "Lead Developers";
const DEVELOPER_ROLE_NAME = "Developers";
const PROJECTS_CATEGORY_NAME = "projects";
const PROJECT_UPDATES_CHANNEL_NAME = "project-updates";

// Permission bits (https://discord.com/developers/docs/topics/permissions)
const VIEW_CHANNEL = BigInt(1) << BigInt(10);
const SEND_MESSAGES = BigInt(1) << BigInt(11);
const READ_MESSAGE_HISTORY = BigInt(1) << BigInt(16);
const ATTACH_FILES = BigInt(1) << BigInt(15);
const EMBED_LINKS = BigInt(1) << BigInt(14);
const ADD_REACTIONS = BigInt(1) << BigInt(6);

/** What a team member can do in their project's channel */
const TEAM_ALLOW =
  VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY | ATTACH_FILES | EMBED_LINKS | ADD_REACTIONS;

const CHANNEL_TYPE_TEXT = 0;
const CHANNEL_TYPE_CATEGORY = 4;
const CHANNEL_TYPE_ANNOUNCEMENT = 5;
const OVERWRITE_TYPE_ROLE = 0;
const OVERWRITE_TYPE_MEMBER = 1;

export interface DiscordMember {
  user: { id: string; username: string; bot?: boolean };
  roles: string[];
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parent_id?: string | null;
  permission_overwrites?: { id: string; type: number; allow: string; deny: string }[];
}

export class DiscordError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function isDiscordConfigured(): boolean {
  return Boolean(TOKEN);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One API call. Rate limits are waited out and retried rather than treated as
 * failures, since a daily sync touches many members in a row.
 */
async function discord<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<T> {
  if (!TOKEN) throw new DiscordError(0, "DISCORD_BOT_TOKEN is not set");

  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (response.status === 429 && attempt < 5) {
    const body = await response.json().catch(() => ({}));
    await sleep(Math.ceil((Number(body.retry_after) || 1) * 1000));
    return discord<T>(path, init, attempt + 1);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new DiscordError(response.status, `Discord ${init.method || "GET"} ${path}: ${response.status} ${text.slice(0, 200)}`);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/**
 * Discord usernames are unique and lowercase, but profiles hold whatever was
 * typed: "@Name", "name#0" or an old "name#1234" tag all mean "name"
 */
export function normalizeDiscordUsername(value: string | undefined | null): string {
  return (value || "")
    .trim()
    .replace(/^@/, "")
    .replace(/#\d{1,4}$/, "")
    .toLowerCase();
}

/** Every member of the server, a thousand at a time */
export async function listGuildMembers(): Promise<DiscordMember[]> {
  const members: DiscordMember[] = [];
  let after = "0";

  for (;;) {
    const page = await discord<DiscordMember[]>(
      `/guilds/${DISCORD_GUILD_ID}/members?limit=1000&after=${after}`
    );
    members.push(...page);
    if (page.length < 1000) return members;
    after = page[page.length - 1].user.id;
  }
}

/** The member with exactly this username, or null if they're not in the server */
export async function findMemberByUsername(username: string): Promise<DiscordMember | null> {
  const target = normalizeDiscordUsername(username);
  if (!target) return null;

  // Search matches username and nickname prefixes; only an exact username counts
  const matches = await discord<DiscordMember[]>(
    `/guilds/${DISCORD_GUILD_ID}/members/search?query=${encodeURIComponent(target)}&limit=100`
  );
  return matches.find((member) => member.user.username.toLowerCase() === target) ?? null;
}

export interface DiscordSetup {
  leadRoleId: string;
  developerRoleId: string;
  projectsCategoryId: string;
  projectUpdatesChannelId: string | null;
  botUserId: string;
  channels: DiscordChannel[];
}

/**
 * Finds the roles, the projects category and #project-updates by name. Fails
 * loudly if a required one is missing, since everything else depends on them.
 */
export async function getDiscordSetup(): Promise<DiscordSetup> {
  const [roles, channels, bot] = await Promise.all([
    discord<{ id: string; name: string }[]>(`/guilds/${DISCORD_GUILD_ID}/roles`),
    discord<DiscordChannel[]>(`/guilds/${DISCORD_GUILD_ID}/channels`),
    discord<{ id: string }>(`/users/@me`),
  ]);

  const byName = (name: string) =>
    roles.find((role) => role.name.toLowerCase() === name.toLowerCase())?.id;

  const leadRoleId = byName(LEAD_ROLE_NAME);
  const developerRoleId = byName(DEVELOPER_ROLE_NAME);
  const projectsCategoryId = channels.find(
    (channel) =>
      channel.type === CHANNEL_TYPE_CATEGORY &&
      channel.name.toLowerCase() === PROJECTS_CATEGORY_NAME
  )?.id;
  const projectUpdatesChannelId =
    channels.find(
      (channel) =>
        (channel.type === CHANNEL_TYPE_TEXT || channel.type === CHANNEL_TYPE_ANNOUNCEMENT) &&
        channel.name.toLowerCase() === PROJECT_UPDATES_CHANNEL_NAME
    )?.id ?? null;

  const missing = [
    !leadRoleId && `role "${LEAD_ROLE_NAME}"`,
    !developerRoleId && `role "${DEVELOPER_ROLE_NAME}"`,
    !projectsCategoryId && `category "${PROJECTS_CATEGORY_NAME}"`,
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new DiscordError(0, `Discord server is missing ${missing.join(", ")}`);
  }

  return {
    leadRoleId: leadRoleId!,
    developerRoleId: developerRoleId!,
    projectsCategoryId: projectsCategoryId!,
    projectUpdatesChannelId,
    botUserId: bot.id,
    channels,
  };
}

export function addRole(userId: string, roleId: string): Promise<void> {
  return discord(`/guilds/${DISCORD_GUILD_ID}/members/${userId}/roles/${roleId}`, {
    method: "PUT",
  });
}

export function removeRole(userId: string, roleId: string): Promise<void> {
  return discord(`/guilds/${DISCORD_GUILD_ID}/members/${userId}/roles/${roleId}`, {
    method: "DELETE",
  });
}

/** Channel names are lowercase with hyphens, which repository names already are */
export function channelNameFor(repositoryName: string): string {
  return repositoryName
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/** A channel by id, or null if it has been deleted */
export async function getChannel(channelId: string): Promise<DiscordChannel | null> {
  try {
    return await discord<DiscordChannel>(`/channels/${channelId}`);
  } catch (error) {
    if (error instanceof DiscordError && (error.status === 404 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

/**
 * A private channel under the projects category: hidden from @everyone, with
 * the bot kept able to see it. Server admins see every channel regardless.
 *
 * The bot's own overwrite only allows viewing: managing the channel and its
 * members comes from its role's server-wide Manage Channels and Manage Roles.
 * Asking for Manage Permissions here would be refused - Discord only lets a
 * bot grant that with Administrator.
 */
export function createPrivateProjectChannel(name: string, setup: DiscordSetup): Promise<DiscordChannel> {
  return discord<DiscordChannel>(`/guilds/${DISCORD_GUILD_ID}/channels`, {
    method: "POST",
    body: JSON.stringify({
      name,
      type: CHANNEL_TYPE_TEXT,
      parent_id: setup.projectsCategoryId,
      permission_overwrites: [
        // The @everyone role shares the server's id
        { id: DISCORD_GUILD_ID, type: OVERWRITE_TYPE_ROLE, deny: VIEW_CHANNEL.toString(), allow: "0" },
        { id: setup.botUserId, type: OVERWRITE_TYPE_MEMBER, allow: VIEW_CHANNEL.toString(), deny: "0" },
      ],
    }),
  });
}

export function grantChannelAccess(channelId: string, userId: string): Promise<void> {
  return discord(`/channels/${channelId}/permissions/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ type: OVERWRITE_TYPE_MEMBER, allow: TEAM_ALLOW.toString(), deny: "0" }),
  });
}

export async function revokeChannelAccess(channelId: string, userId: string): Promise<void> {
  try {
    await discord(`/channels/${channelId}/permissions/${userId}`, { method: "DELETE" });
  } catch (error) {
    // Already gone is the outcome we wanted
    if (!(error instanceof DiscordError && error.status === 404)) throw error;
  }
}

/** Posts a message, pinging only the users listed */
export function sendMessage(channelId: string, content: string, mentionUserIds: string[] = []): Promise<void> {
  return discord(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, allowed_mentions: { users: mentionUserIds } }),
  });
}
