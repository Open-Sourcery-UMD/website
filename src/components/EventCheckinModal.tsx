'use client';

import { CSSProperties, useState } from 'react';
import { useBodyScrollLock } from '@hooks/useBodyScrollLock';
import { CalendarEvent } from '@/types/events';
import { useAuth } from '@context/AuthContext';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface EventCheckinModalProps {
  event: CalendarEvent;
  onClose: () => void;
  /** The bar takes it from here: it shows the confirmation, then bows out */
  onCheckedIn: () => void;
}

export default function EventCheckinModal({
  event,
  onClose,
  onCheckedIn,
}: EventCheckinModalProps) {
  const { firebaseUser } = useAuth();

  // The page behind stays put while this is open
  useBodyScrollLock(true);

  const [status, setStatus] = useState<'loading' | 'error' | 'idle'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCheckin = async () => {
    if (!firebaseUser?.uid || status === 'loading') return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const userRef = doc(db, 'users', firebaseUser.uid);

      await updateDoc(userRef, {
        eventsAttended: arrayUnion(event),
      });

      setStatus('idle');
      onCheckedIn();
    } catch {
      setStatus('error');
      setErrorMessage('Failed to check in. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-black/60"
      onClick={onClose}
    >
      <div
        className="surface border rounded-2xl p-8 max-w-md w-full mx-4 max-h-[85dvh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-graphite mb-2">
          Event Check-In
        </h2>
        <p className="text-graphite-soft mb-6">{event.summary}</p>

        {status === 'error' && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-black/10 bg-white/80 px-4 py-3 text-graphite transition hover:bg-white"
          >
            Cancel
          </button>

          <button
            onClick={handleCheckin}
            disabled={status === 'loading'}
            className="y2k-button flex-1 px-4 py-3 font-semibold text-white disabled:opacity-50"
            style={{ '--btn-deep': '#39A393' } as CSSProperties}
          >
            {status === 'loading' ? 'Checking in...' : 'Check In'}
          </button>
        </div>
      </div>
    </div>
  );
}