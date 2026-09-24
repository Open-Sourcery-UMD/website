'use client';

import Link from 'next/link';
import { CSSProperties, useEffect, useState } from 'react';
import { FaGem } from 'react-icons/fa';
import { useEvents } from '@context/EventContext';
import { useAuth } from '@context/AuthContext';
import { eventGemValue } from '@data';
import EventCheckinModal from './EventCheckinModal';

/** How long the confirmation stays up before it sees itself out */
const CONFIRMATION_MS = 4000;
/** Long enough for the fade to finish, so it isn't cut short */
const FADE_MS = 400;

export default function EventBar() {
  const { currentEvent } = useEvents();
  const { firebaseUser, firestoreUser } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  // The confirmation is a send-off, not a fixture: it fades once it's read
  useEffect(() => {
    if (!justCheckedIn) return;
    const timer = setTimeout(() => setLeaving(true), CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [justCheckedIn]);

  // Every path out of the bar ends the same way, fade included
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setGone(true), FADE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  if (!currentEvent || !firebaseUser || gone) return null;

  // Checked in on an earlier visit or another device: nothing left to ask for
  const alreadyCheckedIn = firestoreUser?.eventsAttended?.some(
    (attended) => attended.id === currentEvent.id
  );
  if (alreadyCheckedIn && !justCheckedIn) return null;

  return (
    <>
      <div
        // Above every overlay on the site: a live event outranks them all.
        // Its own dialog is the exception - the bar has nothing left to say
        // while that's open, and would otherwise hang over the dimmed page.
        className={`fixed inset-x-0 top-24 z-[70] flex justify-center px-4 transition-all duration-300 ${
          leaving || showModal ? 'pointer-events-none -translate-y-2 opacity-0' : 'opacity-100'
        }`}
      >
        <div
          className="surface animate-rise flex max-w-full items-center gap-3 rounded-full py-2 pl-4 pr-2"
          // A green wash over the glass, rather than replacing its fill
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(57, 163, 147, 0.26), rgba(57, 163, 147, 0.08))',
          }}
        >
          {justCheckedIn ? (
            <Link
              href="/gems"
              className="flex items-center gap-2 pr-3 text-sm"
              role="status"
            >
              <FaGem className="shrink-0 text-ycs-green" aria-hidden />
              <span className="font-semibold text-graphite">You&apos;re checked in</span>
              <span className="font-display font-bold text-ycs-green">
                +{eventGemValue(currentEvent.summary)} Gems
              </span>
            </Link>
          ) : (
            <>
              {/* A live event, said the way a broadcast would */}
              <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ycs-green opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ycs-green" />
              </span>

              <span className="min-w-0 truncate text-sm text-graphite-soft">
                <span className="font-semibold text-graphite">{currentEvent.summary}</span>{' '}
                is happening now
              </span>

              <button
                onClick={() => setShowModal(true)}
                className="y2k-button shrink-0 px-4 py-1.5 text-sm font-semibold text-white"
                style={{ '--btn-deep': '#39A393' } as CSSProperties}
              >
                Check in
              </button>

              <button
                onClick={() => setLeaving(true)}
                aria-label="Dismiss"
                className="shrink-0 rounded-full px-2 text-lg leading-none text-graphite-mute transition-colors hover:text-graphite"
              >
                ×
              </button>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <EventCheckinModal
          event={currentEvent}
          onClose={() => setShowModal(false)}
          onCheckedIn={() => {
            setShowModal(false);
            setJustCheckedIn(true);
          }}
        />
      )}
    </>
  );
}
