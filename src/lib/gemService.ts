'use client';

import { authorizedFetch } from './apiClient';

// Type-only: the shapes are declared once, beside the server formula, and
// nothing from that module reaches the browser bundle
import type { GemAction, GemBreakdown, LeaderboardEntry } from './server/gems';

export type { GemAction, LeaderboardEntry };

/**
 * The signed-in user's gems for the current semester, with the actions that
 * earned them. Computed on the server (see lib/server/gems.ts), which holds
 * the one copy of the formula.
 */
export async function computeGemCount(): Promise<GemBreakdown> {
  const response = await authorizedFetch('/api/gems?action=mine');
  if (!response.ok) {
    throw new Error(`Failed to load gems: ${response.status}`);
  }
  return response.json();
}

/**
 * The top of this semester's leaderboard: names, GitHub and totals. For
 * signed-in members only.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await authorizedFetch('/api/gems?action=leaderboard');
  if (!response.ok) {
    throw new Error(`Failed to load leaderboard: ${response.status}`);
  }
  return response.json();
}
