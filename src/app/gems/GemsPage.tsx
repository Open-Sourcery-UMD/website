'use client';

import { useState, useEffect } from 'react';
import { PageContainer, SectionContainer } from '@components/Container';
import { useAuth } from '@context/AuthContext';
import { computeGemCount, GemAction } from '@/lib/gemService';
import { GEM_VALUES } from '@data';
import GemLeaderboard from '@components/GemLeaderboard';

const ITEMS_PER_PAGE = 10;
export default function GemsPage({ semester }: { semester: string }) {
  const { firebaseUser, emailVerified, loading: authLoading } = useAuth();

  const [totalGems, setTotalGems] = useState(0);
  const [actions, setActions] = useState<GemAction[]>([]);
  const [loadingGems, setLoadingGems] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function fetchGems() {
      if (!firebaseUser?.uid) {
        setLoadingGems(false);
        return;
      }
      try {
        const breakdown = await computeGemCount();
        setTotalGems(breakdown.totalGems);
        setActions(breakdown.actions);
      } catch (error) {
        console.error('Error fetching gems:', error);
      } finally {
        setLoadingGems(false);
      }
    }
    if (!authLoading) fetchGems();
  }, [firebaseUser?.uid, authLoading]);

  const totalPages = Math.ceil(actions.length / ITEMS_PER_PAGE);
  const paginatedActions = actions.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );

  return (
    <PageContainer>
      <SectionContainer>
        <h1 className="text-blue-600 text-5xl md:text-7xl font-bold mb-4">Gems</h1>
        <p className="mb-10 text-black">
          Gems are how Open Sourcery celebrates members who show up and contribute. Earn them by
          attending our events and getting your code merged into open-source projects, then see how
          you stack up on the leaderboard. Counts reset every semester, so everyone starts fresh
          in {semester}.
        </p>
        {/* Gem Count Section */}
        {firebaseUser && emailVerified && (
          <div className="mb-16">
            <p className="text-black text-2xl mb-2">You have:</p>
            {loadingGems ? (
              <p className="text-graphite-mute text-lg">Loading...</p>
            ) : (
              <>
                <p className="font-display text-green-400 text-7xl md:text-9xl font-bold mb-8">
                  {totalGems}
                </p>

                {actions.length > 0 && (
                  <div>
                    <div className="space-y-3 mb-6">
                      {/* Amounts come from the server with each action, so
                          nothing here has to be inferred from the wording */}
                      {paginatedActions.map((action, i) => (
                        <div
                          key={page * ITEMS_PER_PAGE + i}
                          className="flex items-center justify-between bg-white/70 shadow-card rounded-lg px-4 py-3"
                        >
                          <span className="text-graphite-soft text-sm">{action.label}</span>
                          <span className="font-display text-ycs-green font-semibold text-sm ml-10 whitespace-nowrap">
                            +{action.gems}
                            {action.unit ? `/${action.unit}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={page === 0}
                          className="px-4 py-2 bg-white/80 border border-black/10 text-graphite rounded-full disabled:opacity-30 hover:bg-white transition"
                        >
                          Previous
                        </button>
                        <span className="text-graphite-mute text-sm">
                          {page + 1} / {totalPages}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={page >= totalPages - 1}
                          className="px-4 py-2 bg-white/80 border border-black/10 text-graphite rounded-full disabled:opacity-30 hover:bg-white transition"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {firebaseUser && !emailVerified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-16">
            <p className="text-yellow-800 font-medium mb-2">
              ⚠️ Verify your email to see your gems
            </p>
            <p className="text-yellow-700 text-sm">
              Please verify your email address to unlock and view your gem count. You'll be able to track your progress once your email is verified.
            </p>
          </div>
        )}

        {/* Top Performers Leaderboard */}
        <div className="mb-16">
          <h2 className="text-graphite text-3xl md:text-4xl font-bold mb-8">
            Leaderboard
          </h2>
          <GemLeaderboard semester={semester} />
        </div>

        {/* Two Ways to Earn Gems */}
        <h2 className="text-graphite text-3xl md:text-4xl font-bold mb-8">
          Two ways to earn Gems:
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Card - Green - Attend Events */}
          <div className="bg-white/70 shadow-card bg-gradient-to-br from-pastel-mint/60 to-transparent border-l-4 border-[#3fc3a3] rounded-2xl p-8 flex flex-col">
            <h3 className="text-graphite text-2xl font-bold mb-6">Attend events</h3>
            <ul className="text-black space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-3">
                <span className="font-display text-ycs-green font-bold mt-0.5">+{GEM_VALUES.specialEvent}</span>
                <span>Earn {GEM_VALUES.specialEvent} Gems for attending Hack Sessions or GBMs</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-display text-ycs-green font-bold">+{GEM_VALUES.otherEvent}</span>
                <span>Earn {GEM_VALUES.otherEvent} Gems for other events (social events, workshops, etc.)</span>
              </li>
            </ul>
          </div>

          {/* Right Card - Blue - Open Source Contributions */}
          <div className="bg-white/70 shadow-card bg-gradient-to-br from-pastel-sky/60 to-transparent border-l-4 border-azure rounded-2xl p-8 flex flex-col">
            <h3 className="text-graphite text-2xl font-bold mb-6">Make open-source contributions</h3>
            <ul className="text-black space-y-3 flex-grow">
              <li className="flex items-start gap-3">
                <span className="font-display text-ycs-blue font-bold mt-0.5">+{GEM_VALUES.issueInOwnProject}</span>
                <span>Earn {GEM_VALUES.issueInOwnProject} Gems for opening an issue in your Open Sourcery project repo</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-display text-ycs-blue font-bold mt-0.5">+{GEM_VALUES.prIntoPublicRepo}</span>
                <span>Earn {GEM_VALUES.prIntoPublicRepo} Gems for creating a pull request merged into a public repo (outside Open Sourcery)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-display text-ycs-blue font-bold mt-0.5">+{GEM_VALUES.prIntoOwnProject}</span>
                <span>Earn {GEM_VALUES.prIntoOwnProject} Gems for creating a pull request merged into your Open Sourcery project repo</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-display text-ycs-blue font-bold mt-0.5">+{GEM_VALUES.prIntoOtherProject}</span>
                <span>Earn {GEM_VALUES.prIntoOtherProject} Gems for creating a pull request merged into another Open Sourcery project repo</span>
              </li>
            </ul>
          </div>
        </div>
      </SectionContainer>
    </PageContainer>
  );
}
