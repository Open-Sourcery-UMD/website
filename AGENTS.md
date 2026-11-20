# AGENTS.md

Working notes for this repository, for coding agents (Claude Code, Copilot, Codex, Cursor) and
for anyone hand-coding. It covers the things that aren't obvious from reading a file or two:
where the boundaries are, what's shared, and what breaks production if you get it wrong.

`README.md` is the front door (what the club is, how to install and run). Start here for *how to
change things*.

---

## The one thing to know first

**There is no staging environment and no Firebase emulator.** `src/firebaseConfig.js` hardcodes
the live project (`opensourcery-website-backend`), and `.env.local` holds credentials for the
real GitHub org, the real Discord server, and the real mail account. So:

- `npm run dev` on your laptop reads and writes **production Firestore**.
- A script you run locally can email real students, create real Discord channels, and invite
  real people to real repositories.
- Never create throwaway documents in the `users` or `projects` collections to try something out.
  Read live data freely; write to it only when that write is the task.

When you need to check behaviour against live data, write a one-off script, run it, read the
output, and delete it. Prefer a read-only script. If one must write, scope it to a single
document you own and say so in the output.

---

## Stack and layout

Next.js 16 (App Router) · TypeScript (strict) · Tailwind 3 · Firebase Auth + Firestore ·
deployed on Vercel at <https://opensourcery.umd.edu>.

```
src/
  app/              Routes. page.tsx per route; a PageName.tsx beside it when the page is a
                    client component (e.g. our-projects/page.tsx + OurProjectsPage.tsx).
    api/*/route.ts  The only place server secrets are used. 8 routes, action-dispatched.
  components/       Shared UI. forms/, guides/, project/ group by feature.
  context/          AuthContext (session + profile), EventContext, TeamMatchingContext.
  hooks/            Reusable client behaviour.
  lib/
    *Service.ts     CLIENT-side. Calls /api/* or Firestore-through-rules. Safe in the browser.
    *Api.ts         SERVER-side. Holds GITHUB_TOKEN / DISCORD_BOT_TOKEN. Never import in a
                    client component.
    server/         SERVER-only logic: gems formula, Discord sync, member actions, auth helpers.
  data.ts           Shared constants and the semester/time-zone helpers. Read this early.
  types/            User, CalendarEvent.
  styles/globals.css  Design tokens and the component classes (.surface, .eyebrow, …).
scripts/            Scheduled jobs, run by GitHub Actions with tsx.
firestore.rules     Deployed separately with the Firebase CLI; not by Vercel.
```

Import alias: `@*` → `./src/*`, so **both** `@data` and `@/data` resolve, as do `@components/X`
and `@/components/X`. Both styles are in use. Don't churn one into the other.

---

## Commands

```bash
npm install
npm run dev                  # localhost:3000 — against production data (see above)
npm run typecheck            # tsc --noEmit; the quickest useful check
npm run lint                 # ESLint 9 + eslint-config-next
npm run build                # compiles and type-checks; run it before opening a PR

# A script, with secrets loaded from .env.local:
npx tsx --env-file=.env.local scripts/sync-discord.ts --dry-run
npx tsx --env-file=.env.local scripts/update-project-status.ts
```

`npm run lint` passes clean of errors and should stay that way. It does print ~32 warnings, all
pre-existing and all deliberate — the `any`s in `githubApi.ts` and the React Compiler hook rules,
both explained in `eslint.config.mjs`. **Warnings you introduce are yours**, so read the list and
check your files aren't in it. Next 16 doesn't lint during `next build`, so running lint is on you.

**There is no test suite, and no CI runs on pull requests** — the only two workflows are the
scheduled jobs. `npm run typecheck`, `npm run lint`, `npm run build`, and a `--dry-run` of any
script you touched are the whole safety net. Use all of them.

---

## Architecture rules

### 1. The client/server boundary is real, not stylistic

Secrets live only in `src/app/api/*/route.ts` and what it imports from `src/lib/server/` and
`src/lib/*Api.ts`. Importing any of those from a `'use client'` component pulls `firebase-admin`
or a bot token into the browser bundle. The flow is always:

```
component → lib/xService.ts → fetch /api/x → lib/server/… or lib/xApi.ts → Firestore / GitHub / Discord
```

When a client file needs a *shape* that's declared next to server code, import it as a type —
this is deliberate and already done in `gemService.ts`, `githubService.ts`, `userService.ts`:

```ts
import type { GemAction, LeaderboardEntry } from './server/gems';
```

### 2. API routes follow one shape

One route per domain, dispatching on an `action` field (POST body) or `?action=` (GET). To add an
operation, add a `case` — don't add a route file. Every route:

```ts
export async function POST(request: NextRequest) {
  try {
    const uid = await requireUser(request);      // or requireRecentSignIn / getOptionalUser
    // …
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);                  // only HttpError messages reach the client
  }
}
```

Throw `new HttpError(status, "Message the user should see.")` for anything expected. Anything else
is logged server-side and returned as a generic 500, so never put a GitHub response or a stack
trace in a user-facing message. Permission rules belong in `lib/server/memberActions.ts`, not in
the route.

Clients call through `authorizedFetch` / `postAuthorized` (`lib/apiClient.ts`), which wait for
Firebase to restore the session and attach the ID token. A bare `fetch` to an authed endpoint will
intermittently 401 on page load.

### 3. Firestore is locked down; privileged writes go through the server

Collections: `users` (owner-only read/write), `projects` (public read, narrow owner update),
`joinLocks` (server-only). Everything else is denied by default.

So anything that shows one member another member's data — the leaderboard, a team roster, a lead's
view of their developers — *must* be assembled server-side. That's the reason
`lib/server/gems.ts` exists rather than a browser-side calculation.

If you change what the client writes directly, update `firestore.rules` in the same PR and deploy
it (`firebase deploy --only firestore:rules`) — Vercel does not.

### 4. One source of truth for shared values

`src/data.ts` holds what the UI and the server both need, and the gems page's explainer reads the
same constants the formula does. Don't restate a number in a component:

- `GEM_VALUES`, `PUBLIC_REPO_PR_TIERS`, `publicRepoPRValue()`, `SHIELD_GEM_VALUE`,
  `SHIELD_GEMS_PER_DAY`, `SHIELD_GEMS_PER_SEMESTER` — the whole scoring scheme
- `MAX_TEAM_SIZE` (12) — the ceiling on the proposal form *and* in lead settings
- `CLUB_TIME_ZONE`, `getSemesterStart()`, `getCurrentSemester()`, `getClassStanding()`
- `SITE_URL`, `DISCORD_INVITE_URL`
- `TECHNOLOGIES` / `TOPICS` — the option lists; `lib/technologyTheme.ts` colours them

The gem formula itself lives in exactly one place, `src/lib/server/gems.ts`. If you change how
gems are earned, the gems page explainer (`src/app/gems/GemsPage.tsx`) and the guides under
`src/app/guides/` usually describe it in prose too — grep for the old wording.

### 5. Dates: never do month arithmetic by hand

Semesters start August 15 and January 15 at **midnight Eastern**, and daily caps roll over at
Eastern midnight, wherever the server runs. `data.ts` has the primitives for this
(`clubMidnight` handles the case where a DST change falls between the two offset lookups). Use
`getSemesterStart()` and friends; format with `Intl.DateTimeFormat(…, { timeZone: CLUB_TIME_ZONE })`.
A raw `new Date(y, m, d)` in this codebase is a bug waiting for March.

---

## External integrations

| Service | Entry point | Watch out for |
|---|---|---|
| GitHub | `lib/githubApi.ts` (`GITHUB_TOKEN`) | Rate limits. `fetchAllPages` caps at 10 pages of 100. Lookups are batched (`getMergedPRsInOtherReposBatch`) and cached with short TTLs on purpose. A cold leaderboard scores every member, which is why `/api/gems` sets `maxDuration = 60`. |
| Discord | `lib/discordApi.ts` + `lib/server/discordSync.ts` (`DISCORD_BOT_TOKEN`) | Roles, the `⚙️ Development` category and `#project-updates` are found **by name**. Renaming one in Discord breaks the sync. Channel/category names are matched on letters and digits only (`sameChannelName`), so decorative emoji are tolerated; role names still match exactly. The bot's role must sit above "Lead Developers" and "Developers". |
| Email | `lib/emailService.ts` (Brevo, `EMAIL_API_KEY`) | Real students. Dry-run first; never loop over the `users` collection without checking the recipient count. |
| Google Calendar | `app/api/events/route.ts` (`GOOGLE_CALENDAR_API_KEY`) | Returns the next `UPCOMING_EVENTS` (4), ordered by start; `timeMin` filters on end time so a live event still appears. |

Secrets come from `.env.local` (gitignored by `.env*`) and, for Actions, from repository secrets
(`FIREBASE_SERVICE_ACCOUNT_KEY`, `GH_BOT_TOKEN`, `DISCORD_BOT_TOKEN`, `EMAIL_API_KEY`). Never
commit a key, never print one, never add one to a client-visible `NEXT_PUBLIC_*` variable.

## Scheduled jobs

Two workflows, both running a `scripts/*.ts` with `tsx`:

- **Update Projects** — 9:15am ET, Mon–Fri. Promotes proposals, syncs repo descriptions and team
  sizes, notifies archived teams.
- **Sync Discord** — 9:45am ET, daily. Project channels and server roles.

GitHub cron only speaks UTC, so each has **two** schedules and a shell guard that compares
`TZ=America/New_York date +%z` against the expected offset and exits early on the wrong one. Copy
that pattern if you add a job, or it will drift by an hour twice a year. Both support
`workflow_dispatch`, and `sync-discord.ts` supports `--dry-run`.

---

## Styling

Tailwind, plus component classes in `src/styles/globals.css`. Use the theme tokens, not raw hex:
`graphite` / `graphite-soft` / `graphite-mute` for text, `azure` for the house blue, `pastel-*`
for washes, `ycs-green` for success, `shadow-card` for lift. `font-display` is for numerals and
headings.

Reach for the existing classes before writing new CSS: `.surface` (the glass card), `.eyebrow`
(small caps section label), `.y2k-button`, `.select-field`, `.card-glow`, `.animate-rise`.

**Specificity gotcha:** Tailwind utilities beat anything in `@layer components`. A `px-3` in the
markup overrides `padding-right` in `.select-field`, which is exactly how a select's chevron
ended up under the text once. If a component class sets a property, don't also set it from a
utility — set the padding in the markup (`pl-3 pr-9`) and leave it out of the class.

Modals: a fixed full-screen overlay with `useBodyScrollLock(true)`, click-outside to close and
`stopPropagation` on the panel (see `JoinedProjectModal`). `createPortal` is used only where the
overlay has to escape a transformed ancestor — `NavbarMobileMenu` and `HeroShield`. `EventBar` sits at `z-[70]`, above everything, and hides itself
while its own modal is open — check the z-order if you add an overlay.

---

## Code style

No Prettier, no format-on-commit. Match the file you're editing; the house conventions are:

- **Quotes:** server code (`app/api/`, `lib/server/`, `scripts/`) uses double, components use
  single. Follow the file rather than the directory if they disagree.
- 2-space indent, semicolons, trailing commas in multiline literals.
- Components: `export default function Name()`, props as a named `interface NameProps`, small
  helper components defined above the default export in the same file.
- `'use client'` on the first line of anything with state, effects, or handlers.
- Prefer explicit return types on exported functions; `strict` is on, and `any` appears only where
  TypeScript's inference genuinely breaks down (the GraphQL pagination in `githubApi.ts`).

**Comments are the most distinctive convention here, and the easiest to get wrong.** They explain
*why*, in prose, usually above the thing. They don't restate the code and there's no decorative
banner. JSDoc `@param`/`@returns` tags are not the style here — the only nine in the codebase are
in `userService.ts` and `eventService.ts`, which predate it. Compare:

```ts
// Resolved outside the try so a missing server credential surfaces as a
// 500, not as a misleading "signed out"
const auth = adminAuth();
```

That's the voice: the constraint, the alternative that was rejected, or the bug it prevents. If a
comment would only say what the next line says, leave it out.

## Git

Branch from `main`, keep a PR to one change, open it against `main`. Commit subjects are
lowercase, imperative, no `feat:`/`fix:` prefixes — `update Gem calculations`,
`fix dialog box scrolling`, `add project sorting (total slots, name)`.

Before you open a PR:

1. `npm run typecheck`
2. `npm run lint` — zero errors, and no new warnings in the files you touched
3. `npm run build`
4. `--dry-run` any script you touched, and read the output
4. `firestore.rules` updated if client-side Firestore access changed
5. No secrets, no leftover one-off scripts, no `console.log` debugging
6. If you changed a rule, a value, or a deadline, grep for it in `src/app/guides/` and
   `src/app/gems/GemsPage.tsx` — the user-facing prose describes these in words

## Known rough edges

Not bugs to fix in passing, but don't be surprised:

- No tests and no PR CI.
- ~32 standing lint warnings: 19 `any`s in `githubApi.ts`, and 13 React Compiler hook findings
  (`set-state-in-effect`, `purity`) across the home page, `HeroShield`, the contexts and a few
  pages. Both groups are downgraded to warnings in `eslint.config.mjs` with the reasoning; both
  are worth real fixes eventually, neither is a drive-by.
- `githubApi.ts` is the oldest, least uniform module; a few functions there predate the
  service/API split and the comment style.
- The leaderboard's 10-minute in-memory TTL is per serverless instance, so two tabs can see
  different totals briefly.
- `src/firebaseConfig.js` is the only `.js` file in `src/`.
