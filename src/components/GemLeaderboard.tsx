'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebaseConfig';
import { collection, query, getDocs } from 'firebase/firestore';
import { computeGemCount } from '@/lib/gemService';
import { BOARD_MEMBERS, SEMESTER_START } from '@data';

interface LeaderboardUser {
  uid: string;
  firstName: string;
  lastName: string;
  gems: number;
}

export default function GemLeaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        // Query all verified users
        const usersRef = collection(db, 'users');
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);

        // Compute gem counts for all users in parallel
        const userPromises = querySnapshot.docs.map(async (doc) => {
          const userData = doc.data();
          try {
            const breakdown = await computeGemCount(doc.id, SEMESTER_START);
            return {
              uid: doc.id,
              firstName: userData.firstName || 'Unknown',
              lastName: userData.lastName || 'User',
              gems: breakdown.totalGems,
            };
          } catch (err) {
            console.error(`Error computing gems for user ${doc.id}:`, err);
            return {
              uid: doc.id,
              firstName: userData.firstName || 'Unknown',
              lastName: userData.lastName || 'User',
              gems: 0,
            };
          }
        });

        const users = await Promise.all(userPromises);

        const filteredUsers = users.filter(user => !(BOARD_MEMBERS.includes(`${user.firstName} ${user.lastName}`)));

        // Sort by gems descending
        filteredUsers.sort((a, b) => b.gems - a.gems);

        // Get top 5 with ties included
        const topUsers: LeaderboardUser[] = [];
        if (filteredUsers.length > 0) {
          topUsers.push(filteredUsers[0]);
          for (let i = 1; i < filteredUsers.length && topUsers.length < 5; i++) {
            topUsers.push(filteredUsers[i]);
          }
        }

        console.log(filteredUsers);

        setLeaderboardData(topUsers);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard');
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-800/50 bg-gradient-to-br from-ycs-pink/20 to-transparent border-l-4 border-ycs-pink rounded-2xl p-8">
        <div className="text-zinc-400">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-800/50 bg-gradient-to-br from-red-500/20 to-transparent border-l-4 border-red-500 rounded-2xl p-8">
        <div className="text-red-300">{error}</div>
      </div>
    );
  }

  if (leaderboardData.length === 0) {
    return (
      <div className="bg-zinc-800/50 bg-gradient-to-br from-ycs-pink/20 to-transparent border-l-4 border-ycs-pink rounded-2xl p-8">
        <div className="text-zinc-400">No users with gems yet</div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 bg-gradient-to-br from-ycs-pink/20 to-transparent border-l-4 border-ycs-pink rounded-2xl pt-3 px-8 pb-8">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ycs-pink/30">
              <th className="text-left py-4 px-4 text-ycs-pink font-normal text-lg">Rank</th>
              <th className="text-left py-4 px-4 text-ycs-pink font-normal text-lg">Name</th>
              <th className="text-right py-4 px-4 text-ycs-pink font-normal text-lg">Gem Count</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((user, index) => (
              <tr
                key={user.uid}
                className="border-b border-zinc-700/50 hover:bg-zinc-700/30 transition"
              >
                <td className="py-4 px-4">
                  <span className="text-ycs-pink font-bold text-xl">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `${index + 1}`}
                  </span>
                </td>
                <td className="py-4 px-4 text-white text-base">
                  {user.firstName} {user.lastName}
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-ycs-pink font-bold text-lg">{user.gems}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {leaderboardData.map((user, index) => (
          <div
            key={user.uid}
            className="bg-zinc-700/30 rounded-lg p-4 hover:bg-zinc-700/50 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-ycs-pink font-bold text-lg">
                {index === 0 && '🥇 1st'}
                {index === 1 && '🥈 2nd'}
                {index === 2 && '🥉 3rd'}
                {index > 2 && `${index + 1}${getOrdinalSuffix(index + 1)}`}
              </span>
              <span className="text-ycs-pink font-bold text-xl">{user.gems}</span>
            </div>
            <div className="text-white text-sm">{user.firstName} {user.lastName}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}
