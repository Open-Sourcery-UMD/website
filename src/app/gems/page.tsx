'use client';

import { useState, useEffect } from 'react';
import { PageContainer, SectionContainer } from '@components/Container';
import { useAuth } from '@context/AuthContext';
import { useEvents } from '@context/EventContext';
import { computeGemCount } from '@/lib/gemService';

const ITEMS_PER_PAGE = 10;
const SPECIAL_EVENT_NAMES = ['hack session', 'gbm', 'general body meeting'];

function getGemAmount(action: string): number {
  const lower = action.toLowerCase();
  if (lower.startsWith('attended')) {
    const isSpecial = SPECIAL_EVENT_NAMES.some((name) => lower.includes(name));
    return isSpecial ? 50 : 100;
  }
  if (lower.includes('opened') && lower.includes('issue')) return 30;
  if (lower.includes('merged') && lower.includes('pr')) {
    if (lower.includes('pr into')) return 50;
    return 30;
  }
  return 0;
}

// Start of current semester (Spring 2026)
const SEMESTER_START = new Date('2026-01-26');

export default function GemsPage() {
  const { firebaseUser, loading: authLoading } = useAuth();

  const [totalGems, setTotalGems] = useState(0);
  const [actions, setActions] = useState<string[]>([]);
  const [loadingGems, setLoadingGems] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function fetchGems() {
      if (!firebaseUser?.uid) {
        setLoadingGems(false);
        return;
      }
      try {
        const breakdown = await computeGemCount(firebaseUser.uid, SEMESTER_START);
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
        <h1 className="text-white text-5xl md:text-7xl font-bold mb-4">Gems</h1>
        {/* Gem Count Section */}
        {firebaseUser && (
          <div className="mb-16">
            <p className="text-zinc-400 text-2xl mb-2">You have:</p>
            {loadingGems ? (
              <p className="text-zinc-500 text-lg">Loading...</p>
            ) : (
              <>
                <p className="text-green-300 text-7xl md:text-9xl font-bold mb-8">
                  {totalGems}
                </p>

                {actions.length > 0 && (
                  <div>
                    <div className="space-y-3 mb-6">
                      {paginatedActions.map((action, i) => {
                        const gems = getGemAmount(action);
                        return (
                          <div
                            key={page * ITEMS_PER_PAGE + i}
                            className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-4 py-3"
                          >
                            <span className="text-zinc-300 text-sm">{action}</span>
                            <span className="text-ycs-green font-semibold text-sm ml-4 whitespace-nowrap">
                              +{gems}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={page === 0}
                          className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-30 hover:bg-zinc-700 transition"
                        >
                          Previous
                        </button>
                        <span className="text-zinc-400 text-sm">
                          {page + 1} / {totalPages}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={page >= totalPages - 1}
                          className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-30 hover:bg-zinc-700 transition"
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

        {/* Two Ways to Earn Gems */}
        <h2 className="text-white text-3xl md:text-4xl font-bold mb-8">
          Two ways to earn Gems:
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Card - Green - Attend Events */}
          <div className="bg-zinc-800/50 bg-gradient-to-br from-ycs-green/20 to-transparent border-l-4 border-ycs-green rounded-2xl p-8 flex flex-col">
            <h3 className="text-white text-2xl font-bold mb-6">Attend events</h3>
            <ul className="text-zinc-300 space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-3">
                <span className="text-ycs-green font-bold mt-0.5">+50</span>
                <span>Earn 50 Gems for attending Hack Sessions or GBMs</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-ycs-green font-bold">+100</span>
                <span>Earn 100 Gems for other events (social events, workshops, etc.)</span>
              </li>
            </ul>
          </div>

          {/* Right Card - Blue - Open Source Contributions */}
          <div className="bg-zinc-800/50 bg-gradient-to-br from-ycs-blue/20 to-transparent border-l-4 border-ycs-blue rounded-2xl p-8 flex flex-col">
            <h3 className="text-white text-2xl font-bold mb-6">Make open-source contributions</h3>
            <ul className="text-zinc-300 space-y-3 flex-grow">
              <li className="flex items-start gap-3">
                <span className="text-ycs-blue font-bold mt-0.5">+30</span>
                <span>Earn 30 Gems for opening an issue in your project</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-ycs-blue font-bold mt-0.5">+30</span>
                <span>Earn 30 Gems for getting a PR merged into your project</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-ycs-blue font-bold mt-0.5">+50</span>
                <span>Earn 50 Gems for getting a PR merged into a public repository</span>
              </li>
            </ul>
          </div>
        </div>
      </SectionContainer>
    </PageContainer>
  );
}
