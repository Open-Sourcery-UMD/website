'use client';

import { useState, useEffect } from 'react';
import { CalendarEvent } from '@/types/events';
import { useAuth } from '@context/AuthContext';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface EventCheckinModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onCheckedIn: () => void;
  checkedInLocally: boolean;
  setCheckedInLocally: (b: boolean) => void;
}

export default function EventCheckinModal({
  event,
  onClose,
  onCheckedIn,
  checkedInLocally,
  setCheckedInLocally,
}: EventCheckinModalProps) {
  const { firebaseUser, firestoreUser } = useAuth();

  const [status, setStatus] = useState<'loading' | 'error' | 'idle'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const alreadyCheckedIn = firestoreUser?.eventsAttended?.some(
    (e) => e.id === event.id
  );

  // Sync backend state into local UI state
  useEffect(() => {
    if (alreadyCheckedIn) {
      setCheckedInLocally(true);
    }
  }, [alreadyCheckedIn]);

  const handleCheckin = async () => {
    if (!firebaseUser?.uid) return;

    if (checkedInLocally) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const userRef = doc(db, 'users', firebaseUser.uid);

      await updateDoc(userRef, {
        eventsAttended: arrayUnion(event),
      });

      setCheckedInLocally(true);
      setStatus('idle');

      onCheckedIn();
    } catch {
      setStatus('error');
      setErrorMessage('Failed to check in. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-2">
          Event Check-In
        </h2>
        <p className="text-neutral-400 mb-6">{event.summary}</p>

        {checkedInLocally ? (
          <div className="text-center">
            <div className="text-green-400 text-lg font-semibold mb-4">
              You&apos;re checked in!
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-neutral-700 text-white rounded-lg hover:opacity-90 transition"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {status === 'error' && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-400 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-neutral-700 text-white rounded-lg hover:opacity-90 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleCheckin}
                disabled={status === 'loading'}
                className="flex-1 px-4 py-3 bg-ycs-green text-black font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition"
              >
                {status === 'loading'
                  ? 'Verifying...'
                  : 'Check In'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}