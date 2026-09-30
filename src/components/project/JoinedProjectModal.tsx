'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { useBodyScrollLock } from '@hooks/useBodyScrollLock';

interface JoinedProjectModalProps {
  projectName: string;
  repositoryName: string;
  /** Whether Discord picked them up; null when it couldn't be checked */
  addedToChannel: boolean | null;
  inviteUrl: string;
  /** What their profile says, for a username that didn't match the server */
  discordUsername?: string;
  onClose: () => void;
}

/** One numbered step, with its number in a badge beside it */
function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="font-display mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-azure/10 text-sm font-bold text-azure">
        {number}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-graphite">{title}</p>
        <p className="text-sm text-graphite-soft">{children}</p>
      </div>
    </li>
  );
}

export default function JoinedProjectModal({
  projectName,
  repositoryName,
  addedToChannel,
  inviteUrl,
  discordUsername,
  onClose,
}: JoinedProjectModalProps) {
  useBodyScrollLock(true);

  // Every link opens in a new tab: following one in place would unmount the
  // modal, and these are the steps they still have to work through
  const discordLink = (
    <a
      href={inviteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-azure underline"
    >
      join the server
    </a>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        // It's written to fit; the cap is only so a very small screen scrolls
        // rather than losing the bottom of it
        className="surface max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-graphite">You&apos;re on the team! 🎉</h2>
        <p className="mb-5 text-graphite-soft">
          You joined <span className="font-semibold text-graphite">{projectName}</span> as a
          Developer. Here&apos;s what&apos;s next:
        </p>

        <ol className="mb-5 space-y-3.5">
          <Step number={1} title="Accept your GitHub invitation">
            An invite to the{' '}
            <span className="font-medium text-graphite">{repositoryName}</span> repository is on
            its way. Check your email, including spam.
          </Step>

          <Step number={2} title="Get set up on Discord">
            {addedToChannel ? (
              <>
                You have the Developer role, and the{' '}
                <span className="font-medium text-graphite">#{repositoryName}</span> channel is yours to
                use.
              </>
            ) : (
              <>
                {discordUsername ? (
                  <>
                    <span className="font-medium text-graphite">@{discordUsername}</span> isn&apos;t
                    in our server: {discordLink}
                  </>
                ) : (
                  <>If you haven&apos;t already, {discordLink}</>
                )}{' '}
                (or fix your username in{' '}
                <Link
                  href="/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-azure underline"
                >
                  Settings
                </Link>
                ) and you&apos;ll get the Developer role and{' '}
                <span className="font-medium text-graphite">#{repositoryName}</span> channel access within a day.
              </>
            )}
          </Step>

          <Step number={3} title="Wait for your first task">
            Your lead will be in touch. Come to the next Hack Session, and read the{' '}
            <Link
              href="/guides/developer"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-azure underline"
            >
              Developer Guide
            </Link>{' '}
            in the meantime.
          </Step>
        </ol>

        <button
          onClick={onClose}
          className="y2k-button w-full px-4 py-3 font-semibold text-white"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
