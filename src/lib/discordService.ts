'use client';

/**
 * Client-side Discord checks, through /api/discord (which holds the bot).
 */

export interface DiscordUsernameCheck {
  /** False when Discord couldn't be asked - callers should accept the name */
  checked: boolean;
  inServer?: boolean;
  /** The exact username in the server, when found */
  username?: string | null;
  inviteUrl?: string;
}

export async function checkDiscordUsername(username: string): Promise<DiscordUsernameCheck> {
  try {
    const params = new URLSearchParams({ action: 'validateUser', username });
    const response = await fetch(`/api/discord?${params}`);
    if (!response.ok) return { checked: false };
    return await response.json();
  } catch (error) {
    console.error('Error checking Discord username:', error);
    return { checked: false };
  }
}

/** What to tell someone whose username isn't in the server */
export const DISCORD_NOT_FOUND_HINT =
  "Use your Discord username (shown under your name in Discord), not your display name.";
