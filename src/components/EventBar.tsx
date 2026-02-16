'use client';

import { useState } from 'react';
import { useEvents } from '@context/EventContext';
import { useAuth } from '@context/AuthContext';
import EventCheckinModal from './EventCheckinModal';

export default function EventBar() {
  const { currentEvent } = useEvents();
  const { firebaseUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [checkedInLocally, setCheckedInLocally] = useState(false);

  if (!currentEvent || !firebaseUser) return null;

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="absolute mt-12 w-full bg-ycs-green/15 border-b border-ycs-green/30 py-2 px-4 text-center cursor-pointer hover:bg-ycs-green/25 transition-colors"
      >
        <span className="text-ycs-green font-medium text-sm">
          '{currentEvent.summary}' is ongoing.{' '}
          <span className="underline">Click here to check in!</span>
        </span>
      </div>

      {showModal && (
        <EventCheckinModal
          event={currentEvent}
          onClose={() => setShowModal(false)}
          onCheckedIn={() => setShowModal(false)}
          checkedInLocally={checkedInLocally}
          setCheckedInLocally={setCheckedInLocally}
        />
      )}
    </>
  );
}
