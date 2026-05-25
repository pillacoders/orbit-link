'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getLeaderboard().then(res => setLeaderboard(res.data?.leaderboard || [])),
      api.getMyRank().then(res => setMyRank(res.data)),
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="skeleton" style={{ height: 500, borderRadius: 16 }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* My Rank */}
      {myRank && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <Trophy size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: 4 }}>Your Position</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Global ranking based on total Orbs</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '2.5rem', fontWeight: 200, color: 'var(--accent)', letterSpacing: '-0.04em', lineHeight: 1 }}>#{myRank.rank}</span>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500, marginTop: 4 }}>{myRank.totalPoints?.toLocaleString()} Orbs</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Leaderboard Table */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 0 0' }}>
        <div style={{ padding: '0 24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 500 }}>Global Leaderboard</h3>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: '0 0 16px 16px' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 80, paddingLeft: 24 }}>Rank</th>
                <th>User</th>
                <th style={{ textAlign: 'right', paddingRight: 24 }}>Orbs</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry: any, i: number) => {
                const isMe = entry.id === user?.id;
                let rankColor = 'var(--text)';
                if (entry.rank === 1) rankColor = '#fbbf24'; // Gold
                if (entry.rank === 2) rankColor = '#9ca3af'; // Silver
                if (entry.rank === 3) rankColor = '#b45309'; // Bronze

                return (
                  <tr key={entry.id} style={isMe ? { background: 'var(--accent-glow)' } : {}}>
                    <td style={{ paddingLeft: 24 }}>
                      <span style={{ color: rankColor, fontWeight: entry.rank <= 3 ? 600 : 400, fontSize: entry.rank <= 3 ? '1.1rem' : '0.9rem', fontFamily: 'var(--mono)' }}>
                        #{entry.rank}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: isMe ? 'var(--accent)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isMe ? 'var(--black)' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                          {entry.username?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: isMe ? 500 : 400, color: isMe ? 'var(--white)' : 'var(--text)' }}>
                          {entry.username} {isMe && <span className="badge badge-primary" style={{ marginLeft: 8 }}>You</span>}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 400, color: 'var(--white)', paddingRight: 24 }}>
                      {entry.totalPoints?.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
