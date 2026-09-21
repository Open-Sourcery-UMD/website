'use client';

import { CSSProperties, ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { FaGem, FaGithub } from 'react-icons/fa';
import { useAuth } from '@context/AuthContext';
import { getLeaderboard, LeaderboardEntry } from '@/lib/gemService';

/** Gold, silver and bronze: the disc's metal, its halo, and the tile's wash */
const MEDALS = [
  {
    metal: 'radial-gradient(circle at 32% 28%, #fffbe6 0%, #ffe07a 30%, #f2b92c 62%, #b8820f 100%)',
    glow: 'rgba(242, 185, 44, 0.55)',
    wash: 'rgba(255, 224, 122, 0.4)',
    ink: '#6b4600',
  },
  {
    metal: 'radial-gradient(circle at 32% 28%, #ffffff 0%, #e6ecf5 30%, #b3bfcf 62%, #7c899c 100%)',
    glow: 'rgba(124, 137, 156, 0.45)',
    wash: 'rgba(205, 218, 236, 0.5)',
    ink: '#3d4757',
  },
  {
    metal: 'radial-gradient(circle at 32% 28%, #fff0e2 0%, #f5bf8c 30%, #cf8544 62%, #8d4f1f 100%)',
    glow: 'rgba(207, 133, 68, 0.45)',
    wash: 'rgba(245, 191, 140, 0.4)',
    ink: '#5c2f0c',
  },
];

// Glints around first place's medal
const TWINKLES = [
  { top: '-14%', left: '-8%', size: 16, delay: '0s' },
  { top: '-2%', left: '88%', size: 12, delay: '0.8s' },
  { top: '62%', left: '-18%', size: 11, delay: '1.5s' },
  { top: '70%', left: '96%', size: 14, delay: '0.4s' },
];

// Mirrors the server cache in lib/server/gems.ts
const REFRESH_NOTE = 'Refreshes every 10 min';

function GemCount({ gems, large = false }: { gems: number; large?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/85 font-semibold text-azure shadow-[inset_0_1px_0_#fff,0_2px_8px_-4px_rgba(0,113,188,0.4)] ${
        large ? 'px-3.5 py-1.5 text-base' : 'px-3 py-1 text-sm'
      }`}
    >
      <FaGem className="text-[#4fb6ee]" size={large ? 14 : 12} aria-hidden />
      {gems}
      <span className="sr-only">gems</span>
    </span>
  );
}

function MedalRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const medal = MEDALS[rank];
  const first = rank === 0;

  return (
    <li
      className="surface relative flex items-center gap-4 rounded-2xl px-4 py-3"
      style={{ backgroundImage: `linear-gradient(90deg, ${medal.wash}, transparent 70%)` }}
    >
      {/* Every badge gets the same slot, so the names line up down the list */}
      <div className="relative flex w-12 shrink-0 justify-center">
        {first &&
          TWINKLES.map((twinkle, index) => (
            <span
              key={index}
              aria-hidden
              className="star animate-twinkle absolute bg-gradient-to-br from-white to-[#ffcf3a] drop-shadow-[0_0_6px_rgba(255,200,40,0.95)]"
              style={
                {
                  top: twinkle.top,
                  left: twinkle.left,
                  width: twinkle.size,
                  height: twinkle.size,
                  '--delay': twinkle.delay,
                } as CSSProperties
              }
            />
          ))}
        <div
          className={`medal grid place-items-center font-display font-bold ${
            first ? 'h-12 w-12 text-xl' : 'h-10 w-10 text-lg'
          }`}
          style={{ '--metal': medal.metal, '--glow': medal.glow, color: medal.ink } as CSSProperties}
        >
          <span className="relative z-10">{rank + 1}</span>
        </div>
      </div>

      <p className={`min-w-0 flex-1 truncate font-semibold text-graphite ${first ? 'text-lg' : ''}`}>
        {entry.firstName} {entry.lastName}
      </p>

      <GitHubLink username={entry.gitHubUsername} />
      <GemCount gems={entry.gems} large={first} />
    </li>
  );
}

function RankRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-white bg-white/60 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:bg-white/85">
      <span className="flex w-12 shrink-0 justify-center">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-[#eef7ff] to-[#bcdcff] font-display text-sm font-bold text-azure shadow-[inset_0_1px_0_#fff,0_2px_6px_-2px_rgba(0,113,188,0.35)]">
          {rank + 1}
        </span>
      </span>
      <span className="min-w-0 flex-1 truncate text-graphite">
        {entry.firstName} {entry.lastName}
      </span>
      <GitHubLink username={entry.gitHubUsername} />
      <GemCount gems={entry.gems} />
    </li>
  );
}

/** Links to their GitHub profile, when their account has one */
function GitHubLink({ username }: { username: string }) {
  if (!username) return null;

  return (
    <a
      href={`https://github.com/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`@${username} on GitHub`}
      aria-label={`@${username} on GitHub`}
      className="group shrink-0"
    >
      <FaGithub
        size={18}
        className="text-graphite-soft transition-transform duration-200 group-hover:scale-125 group-hover:text-graphite"
      />
    </a>
  );
}

/** The glass card every state sits in, so loading doesn't jump the layout */
function Shell({ semester, children }: { semester: string; children: ReactNode }) {
  return (
    <div className="surface holo-rim relative overflow-hidden rounded-3xl px-4 pt-6 pb-5 sm:px-8 sm:pt-7 sm:pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">Top 5 · {semester}</p>
        <p className="text-xs text-graphite-mute">{REFRESH_NOTE}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * The semester's top members, for signed-in members only. Ranked on the
 * server, which can read everyone's activity - the browser can only read its
 * own profile.
 */
export default function GemLeaderboard({ semester }: { semester: string }) {
  const { firebaseUser, loading: authLoading } = useAuth();
  const uid = firebaseUser?.uid;

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Loaded once someone is signed in, and again if the account changes
  useEffect(() => {
    if (!uid) return;

    setLoading(true);
    setError(false);
    getLeaderboard()
      .then(setEntries)
      .catch((err) => {
        console.error('Error fetching leaderboard:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [uid]);

  if (!authLoading && !uid) {
    return (
      <Shell semester={semester}>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <FaGem aria-hidden size={22} className="text-[#4fb6ee]" />
          <p className="text-graphite-soft">
            <Link href="/log-in" className="font-medium text-azure underline">
              Sign in
            </Link>{' '}
            or{' '}
            <Link href="/sign-up" className="font-medium text-azure underline">
              create an account
            </Link>{' '}
            to see who&apos;s leading this semester.
          </p>
        </div>
      </Shell>
    );
  }

  if (authLoading || loading) {
    return (
      <Shell semester={semester}>
        <div aria-label="Loading leaderboard" className="animate-pulse space-y-2">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-16 rounded-2xl bg-white/60" />
          ))}
        </div>
      </Shell>
    );
  }

  if (error || entries.length === 0) {
    return (
      <Shell semester={semester}>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <FaGem aria-hidden size={22} className="text-[#4fb6ee]" />
          <p className={error ? 'text-red-600' : 'text-graphite-soft'}>
            {error
              ? "Couldn't load the leaderboard. Please try again in a moment."
              : `No gems earned yet in ${semester}. Be the first!`}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell semester={semester}>
      {/* Medals for the top three, plain beads after that */}
      <ol className="space-y-2">
        {entries.map((entry, index) =>
          index < MEDALS.length ? (
            <MedalRow key={entry.uid} entry={entry} rank={index} />
          ) : (
            <RankRow key={entry.uid} entry={entry} rank={index} />
          )
        )}
      </ol>
    </Shell>
  );
}
