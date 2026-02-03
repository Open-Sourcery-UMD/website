'use client';

import { createContext, useContext, useState } from 'react';

interface TeamMatchingData {
  year: number | null;
  technologies: string[];
  topics: string[];
}

const TeamMatchingContext = createContext<{
  data: TeamMatchingData;
  setData: React.Dispatch<React.SetStateAction<TeamMatchingData>>;
} | null>(null);

export const TeamMatchingProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<TeamMatchingData>({
    year: null,
    technologies: [],
    topics: [],
  });

  return (
    <TeamMatchingContext.Provider value={{ data, setData }}>
      {children}
    </TeamMatchingContext.Provider>
  );
};

export const useTeamMatching = () => {
  const ctx = useContext(TeamMatchingContext);
  if (!ctx) throw new Error('useTeamMatching must be used within provider');
  return ctx;
};
