'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext'; // import your AuthContext hook

interface TeamMatchingData {
  year: string | null;
  technologies: string[];
  topics: string[];
}

const TeamMatchingContext = createContext<{
  data: TeamMatchingData;
  setData: React.Dispatch<React.SetStateAction<TeamMatchingData>>;
} | null>(null);

export const TeamMatchingProvider = ({ children }: { children: ReactNode }) => {
  const { firestoreUser } = useAuth(); // get Firestore user from AuthContext
  const [data, setData] = useState<TeamMatchingData>({
    year: null,
    technologies: [],
    topics: [],
  });

  // Mirror the signed-in user's preferences, and clear them on sign-out -
  // otherwise the previous account's interests stayed highlighted on pages
  // reached without a full reload
  useEffect(() => {
    if (firestoreUser) {
      setData({
        year: firestoreUser.graduationYear || null,
        technologies: firestoreUser.technologiesExperiencedWith || [],
        topics: firestoreUser.preferredTopics || [],
      });
    } else {
      setData({ year: null, technologies: [], topics: [] });
    }
  }, [firestoreUser]);

  return (
    <TeamMatchingContext.Provider value={{ data, setData }}>
      {children}
    </TeamMatchingContext.Provider>
  );
};

export const useTeamMatching = () => {
  const ctx = useContext(TeamMatchingContext);
  if (!ctx) throw new Error('useTeamMatching must be used within a TeamMatchingProvider');
  return ctx;
};
