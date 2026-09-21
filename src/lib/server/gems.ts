/**
 * Gem totals, computed on the server.
 *
 * Profiles are owner-only in Firestore, so anything that needs other people's
 * attendance or GitHub activity - the leaderboard especially - can't be put
 * together in the browser. Keeping the whole formula here also means there's
 * one implementation rather than a browser copy and a server copy.
 *
 * The values themselves live in GEM_VALUES (data.ts), shared with the gems
 * page's explainer. Each action is returned with its own amount so the page
 * never has to work it out by parsing the description.
 */
import { DocumentData } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
import { BOARD_MEMBERS, GEM_VALUES, getSemesterStart } from "@/data";
import {
  getMergedPRsInOtherReposBatch,
  getRepositoryMembership,
  getUserRepositoryActivity,
  OutsidePR,
} from "@/lib/githubApi";

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";
const SPECIAL_EVENT_NAMES = ["hack session", "gbm", "general body meeting"];

const LEADERBOARD_SIZE = 5;
const LEADERBOARD_TTL_MS = 10 * 60_000;
// Users scored at once during a refresh, so a cold rebuild doesn't fire every
// GitHub request in the same instant
const LEADERBOARD_CONCURRENCY = 6;

export interface GemAction {
  label: string;
  /** Gems per unit - per issue or PR for aggregated lines, else the line's total */
  gems: number;
  /** Set on lines that aggregate several issues or PRs */
  unit?: "issue" | "PR";
}

export interface GemBreakdown {
  totalGems: number;
  actions: GemAction[];
}

export interface LeaderboardEntry {
  uid: string;
  firstName: string;
  lastName: string;
  gems: number;
  /** Empty when their profile doesn't have one */
  gitHubUsername: string;
}

/** GitHub login (lowercased) -> the project repositories it belongs to */
type MembershipIndex = Map<string, string[]>;

async function buildMembershipIndex(): Promise<MembershipIndex> {
  const snapshot = await adminDb().collection("projects").get();
  const repos = Array.from(
    new Set(snapshot.docs.map((doc) => doc.data().repositoryName).filter(Boolean))
  ) as string[];

  const index: MembershipIndex = new Map();

  await Promise.all(
    repos.map(async (repo) => {
      try {
        const { collaborators, pendingInvitees } = await getRepositoryMembership(
          GITHUB_ORG,
          repo
        );
        for (const login of [...collaborators, ...pendingInvitees]) {
          const key = login.toLowerCase();
          index.set(key, [...(index.get(key) ?? []), repo]);
        }
      } catch (error) {
        console.error(`Couldn't read membership of ${repo} for gems:`, error);
      }
    })
  );

  return index;
}

/**
 * Whether a repository (owner/name) belongs to the Open Sourcery org, which is
 * what makes a PR count as one into another Open Sourcery project
 */
function isOrgRepository(fullName: string): boolean {
  return fullName.toLowerCase().startsWith(`${GITHUB_ORG.toLowerCase()}/`);
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-US");
}

/**
 * The repositories whose PRs count as "outside" for a login: everything except
 * their own projects, which are scored separately
 */
function ownRepos(index: MembershipIndex, login: string): string[] {
  return (index.get(login.toLowerCase()) ?? []).map((repo) => `${GITHUB_ORG}/${repo}`);
}

/**
 * Looks up merged outside PRs for a set of logins in a few batched requests
 */
function fetchOutsidePRs(
  logins: string[],
  index: MembershipIndex,
  startDate: Date
): Promise<Map<string, OutsidePR[]>> {
  return getMergedPRsInOtherReposBatch(
    logins.map((login) => ({ login, excludeRepos: ownRepos(index, login) })),
    startDate
  );
}

async function computeFromProfile(
  profile: DocumentData,
  index: MembershipIndex,
  startDate: Date,
  // Pre-fetched in bulk; undefined means the lookup failed for this login
  outsidePRs: OutsidePR[] | undefined
): Promise<GemBreakdown> {
  let totalGems = 0;
  const actions: GemAction[] = [];

  // Events attended this semester
  if (Array.isArray(profile.eventsAttended)) {
    // A repeated check-in can append the same event twice (arrayUnion only
    // dedupes objects that match exactly), so count each event id once
    const countedEventIds = new Set<string>();

    for (const event of profile.eventsAttended) {
      const eventDateStr = event?.start?.dateTime || event?.start?.date;
      if (!eventDateStr) continue;

      if (event.id) {
        if (countedEventIds.has(event.id)) continue;
        countedEventIds.add(event.id);
      }

      const eventDate = new Date(eventDateStr);
      if (eventDate < startDate) continue;

      const name = String(event.summary || "").toLowerCase();
      const isSpecial = SPECIAL_EVENT_NAMES.some((special) => name.includes(special));

      const gems = isSpecial ? GEM_VALUES.specialEvent : GEM_VALUES.otherEvent;
      totalGems += gems;
      actions.push({ label: `Attended '${event.summary}' on ${formatDate(eventDate)}`, gems });
    }
  }

  const login: string = (profile.gitHubUsername || "").trim();
  if (login) {
    // Every project repository they have access to - usually one - looked
    // up together. getUserRepositoryActivity never throws: a failure counts 0.
    const projectRepos = index.get(login.toLowerCase()) ?? [];
    const activities = await Promise.all(
      projectRepos.map((repositoryName) =>
        getUserRepositoryActivity(login, `${GITHUB_ORG}/${repositoryName}`, startDate)
      )
    );

    projectRepos.forEach((repositoryName, i) => {
      const activity = activities[i];

      if (activity.issues > 0) {
        totalGems += activity.issues * GEM_VALUES.issueInOwnProject;
        actions.push({
          label: `Opened ${activity.issues} issue${activity.issues !== 1 ? "s" : ""} in '${repositoryName}'`,
          gems: GEM_VALUES.issueInOwnProject,
          unit: "issue",
        });
      }

      if (activity.mergedPRs > 0) {
        totalGems += activity.mergedPRs * GEM_VALUES.prIntoOwnProject;
        actions.push({
          label: `Merged ${activity.mergedPRs} PR${activity.mergedPRs !== 1 ? "s" : ""} into '${repositoryName}' (your project)`,
          gems: GEM_VALUES.prIntoOwnProject,
          unit: "PR",
        });
      }
    });

    // PRs merged elsewhere count whether or not they're on a project; their
    // own projects were excluded from the search since they're counted above
    if (outsidePRs) {
      for (const pr of outsidePRs) {
        // Another Open Sourcery project is worth more than an arbitrary repo;
        // their own projects were excluded from this list already
        const gems = isOrgRepository(pr.repo)
          ? GEM_VALUES.prIntoOtherProject
          : GEM_VALUES.prIntoPublicRepo;
        totalGems += gems;
        const mergedDate = pr.mergedAt ? formatDate(pr.mergedAt) : "unknown date";
        actions.push({ label: `Merged a PR into '${pr.repo}' on ${mergedDate}`, gems });
      }
    } else {
      console.error(`Outside PRs unavailable for ${login}; scored without them`);
    }
  }

  return {
    totalGems,
    actions: actions.sort((a, b) => b.label.localeCompare(a.label)),
  };
}

/**
 * The signed-in user's own gems for the current semester, with the actions
 * that earned them
 */
export async function computeGemBreakdown(uid: string): Promise<GemBreakdown> {
  // The membership index doesn't depend on the profile, so build it meanwhile
  const [snapshot, index] = await Promise.all([
    adminDb().collection("users").doc(uid).get(),
    buildMembershipIndex(),
  ]);
  if (!snapshot.exists) return { totalGems: 0, actions: [] };

  const profile = snapshot.data()!;
  const startDate = getSemesterStart();

  const login = (profile.gitHubUsername || "").trim();
  const outside = login
    ? await fetchOutsidePRs([login], index, startDate)
    : new Map<string, OutsidePR[]>();

  return computeFromProfile(profile, index, startDate, outside.get(login.toLowerCase()));
}

async function computeLeaderboard(): Promise<LeaderboardEntry[]> {
  const [users, index] = await Promise.all([
    // Only what scoring needs - never emails or anything else private
    adminDb()
      .collection("users")
      .select("firstName", "lastName", "gitHubUsername", "eventsAttended")
      .get(),
    buildMembershipIndex(),
  ]);

  const boardMembers = new Set(BOARD_MEMBERS);
  const candidates = users.docs.filter((doc) => {
    const { firstName, lastName } = doc.data();
    return !boardMembers.has(`${firstName} ${lastName}`);
  });

  const startDate = getSemesterStart();

  // Everyone's outside PRs in a few batched requests, rather than a search
  // per member that the rate limit would mostly refuse
  const logins = candidates
    .map((doc) => (doc.data().gitHubUsername || "").trim())
    .filter(Boolean);
  const outside = await fetchOutsidePRs(logins, index, startDate);

  const scored: LeaderboardEntry[] = [];

  for (let i = 0; i < candidates.length; i += LEADERBOARD_CONCURRENCY) {
    const batch = candidates.slice(i, i + LEADERBOARD_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (doc) => {
        const data = doc.data();
        let gems = 0;
        try {
          const login = (data.gitHubUsername || "").trim().toLowerCase();
          gems = (await computeFromProfile(data, index, startDate, outside.get(login))).totalGems;
        } catch (error) {
          console.error(`Error computing gems for ${doc.id}:`, error);
        }
        return {
          uid: doc.id,
          firstName: data.firstName || "Unknown",
          lastName: data.lastName || "User",
          gitHubUsername: (data.gitHubUsername || "").trim(),
          gems,
        };
      })
    );
    scored.push(...results);
  }

  return scored.sort((a, b) => b.gems - a.gems).slice(0, LEADERBOARD_SIZE);
}

let cachedLeaderboard: { at: number; entries: LeaderboardEntry[] } | null = null;
let leaderboardRefresh: Promise<LeaderboardEntry[]> | null = null;

/**
 * The top of the semester's leaderboard.
 *
 * Scoring everyone takes a GitHub round trip per member, so the result is
 * cached. Once it goes stale, visitors keep seeing the previous standings
 * while a single refresh runs, rather than each waiting on a full rebuild.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (cachedLeaderboard && Date.now() - cachedLeaderboard.at < LEADERBOARD_TTL_MS) {
    return cachedLeaderboard.entries;
  }

  if (!leaderboardRefresh) {
    leaderboardRefresh = computeLeaderboard()
      .then((entries) => {
        cachedLeaderboard = { at: Date.now(), entries };
        return entries;
      })
      .finally(() => {
        leaderboardRefresh = null;
      });
  }

  return cachedLeaderboard ? cachedLeaderboard.entries : leaderboardRefresh;
}
