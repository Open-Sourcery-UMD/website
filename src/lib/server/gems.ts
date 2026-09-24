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
import {
  CLUB_TIME_ZONE,
  eventGemValue,
  GEM_VALUES,
  getSemesterStart,
  publicRepoPRValue,
  SHIELD_GEM_VALUE,
  SHIELD_GEMS_PER_DAY,
  SHIELD_GEMS_PER_SEMESTER,
} from "@/data";
import {
  getMergedPRsInOtherReposBatch,
  getRepositoryMembership,
  getReviewCountsForRepo,
  getUserRepositoryActivity,
  OutsidePR,
} from "@/lib/githubApi";

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || "Open-Sourcery-UMD";

const LEADERBOARD_SIZE = 5;
const LEADERBOARD_TTL_MS = 10 * 60_000;
// Users scored at once during a refresh, so a cold rebuild doesn't fire every
// GitHub request in the same instant
const LEADERBOARD_CONCURRENCY = 6;

export interface GemAction {
  label: string;
  /** Gems per unit - per issue or PR for aggregated lines, else the line's total */
  gems: number;
  /** Set on lines that aggregate several of the same thing */
  unit?: "issue" | "PR" | "review" | "shield";
  /**
   * When it happened, ISO, on lines that describe one dated action. The
   * aggregate lines cover a whole semester and have none.
   */
  at?: string;
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

/** Repository -> lowercased login -> teammates' pull requests they reviewed */
type ReviewIndex = Map<string, Map<string, number>>;

/**
 * Everything about the club's project repositories that scoring needs, read
 * once and shared by every member of a leaderboard run rather than fetched
 * per person.
 */
interface ProjectIndex {
  membership: MembershipIndex;
  reviews: ReviewIndex;
}

/** Every repository the club has a project for */
async function projectRepoNames(): Promise<string[]> {
  const snapshot = await adminDb().collection("projects").get();
  return Array.from(
    new Set(snapshot.docs.map((doc) => doc.data().repositoryName).filter(Boolean))
  ) as string[];
}

async function buildMembershipIndex(repos: string[]): Promise<MembershipIndex> {
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

async function buildReviewIndex(repos: string[], startDate: Date): Promise<ReviewIndex> {
  const index: ReviewIndex = new Map();

  await Promise.all(
    repos.map(async (repo) => {
      try {
        index.set(repo, await getReviewCountsForRepo(`${GITHUB_ORG}/${repo}`, startDate));
      } catch (error) {
        console.error(`Couldn't read reviews in ${repo} for gems:`, error);
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
  // In the club's time zone, like everything else dated here - otherwise a
  // late-evening merge reads as the next day on a UTC server
  return new Date(value).toLocaleDateString("en-US", { timeZone: CLUB_TIME_ZONE });
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

/**
 * Dated lines first, newest at the top, then the summaries that cover the
 * whole semester, alphabetically.
 *
 * Sorting on the dates themselves rather than on the labels that carry them
 * is what keeps 10/1 above 9/2: as text, "1" comes before "9".
 */
function byRecency(a: GemAction, b: GemAction): number {
  // ISO timestamps compare chronologically as strings
  if (a.at && b.at) return b.at.localeCompare(a.at);
  if (a.at) return -1;
  if (b.at) return 1;
  return a.label.localeCompare(b.label);
}

async function computeFromProfile(
  profile: DocumentData,
  index: ProjectIndex,
  startDate: Date,
  // Pre-fetched in bulk; undefined means the lookup failed for this login
  outsidePRs: OutsidePR[] | undefined
): Promise<GemBreakdown> {
  let totalGems = 0;
  const actions: GemAction[] = [];

  // Shields caught on the home page, kept per semester like everything else
  const shields = shieldGemsThisSemester(profile, startDate);
  if (shields > 0) {
    totalGems += shields;
    actions.push({
      label: `Caught ${shields} Flying Gemshield${shields !== 1 ? "s" : ""}`,
      gems: SHIELD_GEM_VALUE,
      unit: "shield",
    });
  }

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

      const gems = eventGemValue(String(event.summary || ""));
      totalGems += gems;
      actions.push({
        label: `Attended '${event.summary}' on ${formatDate(eventDate)}`,
        gems,
        at: eventDate.toISOString(),
      });
    }
  }

  const login: string = (profile.gitHubUsername || "").trim();
  if (login) {
    // Every project repository they have access to - usually one - looked
    // up together. getUserRepositoryActivity never throws: a failure counts 0.
    const projectRepos = index.membership.get(login.toLowerCase()) ?? [];
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
          label: `Created ${activity.mergedPRs} PR${activity.mergedPRs !== 1 ? "s" : ""} merged into '${repositoryName}' (your project)`,
          gems: GEM_VALUES.prIntoOwnProject,
          unit: "PR",
        });
      }

      const reviewed = index.reviews.get(repositoryName)?.get(login.toLowerCase()) ?? 0;
      if (reviewed > 0) {
        totalGems += reviewed * GEM_VALUES.reviewOnTeammatePR;
        actions.push({
          label: `Reviewed ${reviewed} teammate${reviewed !== 1 ? "s'" : "'s"} PR${reviewed !== 1 ? "s" : ""} in '${repositoryName}'`,
          gems: GEM_VALUES.reviewOnTeammatePR,
          unit: "review",
        });
      }
    });

    // PRs merged elsewhere count whether or not they're on a project; their
    // own projects were excluded from the search since they're counted above
    if (outsidePRs) {
      // Oldest first, so the tiers fill in the order the work happened and a
      // new pull request never changes what an earlier one was worth
      const inOrder = [...outsidePRs].sort(
        (a, b) => new Date(a.mergedAt).getTime() - new Date(b.mergedAt).getTime()
      );
      let outsideSoFar = 0;

      for (const pr of inOrder) {
        // Another Open Sourcery project is worth a flat, higher rate and
        // doesn't use up a tier; their own projects were excluded already
        const gems = isOrgRepository(pr.repo)
          ? GEM_VALUES.prIntoOtherProject
          : publicRepoPRValue(outsideSoFar++);
        totalGems += gems;
        const mergedDate = pr.mergedAt ? formatDate(pr.mergedAt) : "unknown date";
        actions.push({
          label: `Created a PR merged into '${pr.repo}' on ${mergedDate}`,
          gems,
          at: pr.mergedAt || undefined,
        });
      }
    } else {
      console.error(`Outside PRs unavailable for ${login}; scored without them`);
    }
  }

  return {
    totalGems,
    actions: actions.sort(byRecency),
  };
}

/**
 * Gems caught on the home page this semester. The stored count belongs to the
 * semester it was earned in, so it falls away with everything else at the
 * turn of the term.
 */
function shieldGemsThisSemester(profile: DocumentData, startDate: Date): number {
  const shields = profile.shieldGems;
  if (!shields || shields.semester !== startDate.toISOString()) return 0;
  // Awards stop at the cap, but old records from before it was introduced
  // can still hold more
  return Math.min(Number(shields.total) || 0, SHIELD_GEMS_PER_SEMESTER);
}

/**
 * The signed-in user's own gems for the current semester, with the actions
 * that earned them
 */
export async function computeGemBreakdown(uid: string): Promise<GemBreakdown> {
  const startDate = getSemesterStart();

  // Neither the repositories nor their membership depend on the profile, so
  // they're read while the profile is on its way
  const [snapshot, membership] = await Promise.all([
    adminDb().collection("users").doc(uid).get(),
    projectRepoNames().then(buildMembershipIndex),
  ]);
  if (!snapshot.exists) return { totalGems: 0, actions: [] };

  const profile = snapshot.data()!;
  const login = (profile.gitHubUsername || "").trim();

  // Only this person's own projects are scored, so only those are read - the
  // leaderboard is the one that needs every repository
  const [outside, reviews] = await Promise.all([
    login
      ? fetchOutsidePRs([login], membership, startDate)
      : Promise.resolve(new Map<string, OutsidePR[]>()),
    buildReviewIndex(membership.get(login.toLowerCase()) ?? [], startDate),
  ]);

  return computeFromProfile(
    profile,
    { membership, reviews },
    startDate,
    outside.get(login.toLowerCase())
  );
}

async function computeLeaderboard(): Promise<LeaderboardEntry[]> {
  const startDate = getSemesterStart();

  const [users, repos] = await Promise.all([
    // Only what scoring needs - never emails or anything else private
    adminDb()
      .collection("users")
      .select("firstName", "lastName", "gitHubUsername", "eventsAttended", "shieldGems")
      .get(),
    projectRepoNames(),
  ]);

  const [membership, reviews] = await Promise.all([
    buildMembershipIndex(repos),
    buildReviewIndex(repos, startDate),
  ]);
  const index: ProjectIndex = { membership, reviews };

  // Everyone's outside PRs in a few batched requests, rather than a search
  // per member that the rate limit would mostly refuse
  const logins = users.docs
    .map((doc) => (doc.data().gitHubUsername || "").trim())
    .filter(Boolean);
  const outside = await fetchOutsidePRs(logins, index.membership, startDate);

  const scored: LeaderboardEntry[] = [];

  for (let i = 0; i < users.docs.length; i += LEADERBOARD_CONCURRENCY) {
    const batch = users.docs.slice(i, i + LEADERBOARD_CONCURRENCY);
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

export interface ShieldGemResult {
  /** False once the day's five, or the semester's hundred, are gone */
  awarded: boolean;
  /** Gems caught today, after this one */
  earnedToday: number;
  /** The semester's hundred are now all caught, this one included */
  capReached: boolean;
}

/**
 * The day a shield gem counts towards, in the club's own time zone, so the
 * five reset at midnight in Maryland. en-CA formats as YYYY-MM-DD.
 */
function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CLUB_TIME_ZONE }).format(new Date());
}

/**
 * Awards a gem for catching a green shield, up to five a day.
 *
 * The cap is enforced in a transaction, so quick repeat clicks - or a second
 * tab - can't get past it.
 */
export async function awardShieldGem(uid: string): Promise<ShieldGemResult> {
  const ref = adminDb().collection("users").doc(uid);
  const semester = getSemesterStart().toISOString();
  const day = today();

  return adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return { awarded: false, earnedToday: 0, capReached: false };

    const shields = snapshot.data()!.shieldGems;
    const sameSemester = shields?.semester === semester;
    const sameDay = sameSemester && shields?.day === day;

    const earned = sameDay ? Number(shields.today) || 0 : 0;
    const earnedThisSemester = sameSemester ? Number(shields.total) || 0 : 0;
    const capReached = earnedThisSemester >= SHIELD_GEMS_PER_SEMESTER;

    if (capReached || earned >= SHIELD_GEMS_PER_DAY) {
      return { awarded: false, earnedToday: earned, capReached };
    }

    const total = earnedThisSemester + SHIELD_GEM_VALUE;
    transaction.set(
      ref,
      { shieldGems: { semester, day, today: earned + 1, total } },
      { merge: true }
    );

    // Said on the hundredth itself, so the page doesn't have to find out by
    // being refused the next one
    return {
      awarded: true,
      earnedToday: earned + 1,
      capReached: total >= SHIELD_GEMS_PER_SEMESTER,
    };
  });
}

export interface ShieldGemStatus {
  /** Caught today, which sets the odds of the next green shield */
  earnedToday: number;
  /** The semester's hundred are all caught, so there's nothing left to win */
  capReached: boolean;
}

/** Where they stand on shields, for the home page easter egg */
export async function getShieldGemsToday(uid: string): Promise<ShieldGemStatus> {
  const snapshot = await adminDb().collection("users").doc(uid).get();
  const shields = snapshot.data()?.shieldGems;
  const semester = getSemesterStart().toISOString();

  if (!shields || shields.semester !== semester) {
    return { earnedToday: 0, capReached: false };
  }

  return {
    earnedToday: shields.day === today() ? Number(shields.today) || 0 : 0,
    capReached: (Number(shields.total) || 0) >= SHIELD_GEMS_PER_SEMESTER,
  };
}
