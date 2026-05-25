'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timer, Trophy, Users, Zap, ChevronRight, Sparkles, Shield, Star } from 'lucide-react';
import api from '@/lib/api';
import styles from './epochs.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#34d399',
  UPCOMING: '#4f7df7',
  ENDED: '#6b7280',
};

export default function EpochsPage() {
  const [epochs, setEpochs] = useState<any[]>([]);
  const [activeEpoch, setActiveEpoch] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [epochsRes] = await Promise.all([
        api.getEpochs(),
      ]);
      const allEpochs = epochsRes.data || [];
      setEpochs(allEpochs);

      const active = allEpochs.find((e: any) => e.status === 'ACTIVE');
      if (active) {
        setActiveEpoch(active);
        const [statsRes, lbRes] = await Promise.all([
          api.getEpochStats(active.id).catch(() => ({ data: {} })),
          api.getEpochLeaderboard(active.id).catch(() => ({ data: [] })),
        ]);
        setUserStats(statsRes.data);
        setLeaderboard(lbRes.data || []);
      }
    } catch (err) {
      console.error('Epochs load error:', err);
    } finally {
      setLoading(false);
    }
  }

  function getTimeRemaining(endDate: string) {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${days}d ${hours}h remaining`;
  }

  if (loading) {
    return (
      <div className={styles.epochsPage}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.epochsPage}>
      {/* ─── Active Epoch Hero ─── */}
      {activeEpoch && (
        <motion.div className={styles.activeHero} initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className={styles.heroLeft}>
            <div className={styles.heroBadge}>
              <span className={styles.heroPulse} />
              <span>LIVE EPOCH</span>
            </div>
            <h1>{activeEpoch.seasonName || activeEpoch.name}</h1>
            <p className={styles.heroDesc}>{activeEpoch.description}</p>
            <div className={styles.heroMeta}>
              <div className={styles.metaItem}>
                <Timer size={14} />
                <span>{getTimeRemaining(activeEpoch.endDate)}</span>
              </div>
              <div className={styles.metaItem}>
                <Zap size={14} />
                <span>{activeEpoch.multiplier}x multiplier</span>
              </div>
              <div className={styles.metaItem}>
                <Users size={14} />
                <span>{activeEpoch._count?.participations || 0} participants</span>
              </div>
            </div>
          </div>

          <div className={styles.heroRight}>
            {/* Reward Pool Progress */}
            <div className={styles.poolCard}>
              <span className={styles.poolLabel}>REWARD POOL</span>
              <span className={styles.poolAmount}>
                {(activeEpoch.totalPointsPool || 0).toLocaleString()} Orbs
              </span>
              <div className={styles.poolTrack}>
                <motion.div
                  className={styles.poolFill}
                  initial={{ width: 0 }}
                  animate={{ width: `${(activeEpoch.rewardPoolProgress || 0) * 100}%` }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <span className={styles.poolPercent}>
                {Math.round((activeEpoch.rewardPoolProgress || 0) * 100)}% distributed
              </span>
            </div>

            {/* Your Rank */}
            {userStats && (
              <div className={styles.rankCard}>
                <span className={styles.rankLabel}>YOUR RANK</span>
                <span className={styles.rankNum}>#{userStats.rank || '—'}</span>
                <span className={styles.rankPoints}>
                  {Math.round(userStats.pointsEarned || 0).toLocaleString()} Orbs
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className={styles.mainGrid}>
        {/* ─── Leaderboard ─── */}
        <motion.div className={styles.leaderboard} initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <h2>Epoch Leaderboard</h2>
          <div className={styles.lbList}>
            {leaderboard.length > 0 ? leaderboard.slice(0, 15).map((entry: any, i: number) => (
              <div key={i} className={`${styles.lbItem} ${i < 3 ? styles.lbTop : ''}`}>
                <span className={styles.lbRank}>#{i + 1}</span>
                <span className={styles.lbName}>{entry.user?.username || 'Anonymous'}</span>
                <span className={styles.lbPoints}>{Math.round(entry.pointsEarned).toLocaleString()}</span>
              </div>
            )) : (
              <div className={styles.lbEmpty}>No participants yet. Be the first!</div>
            )}
          </div>
        </motion.div>

        {/* ─── Epoch History ─── */}
        <motion.div className={styles.historySection} initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <h2>All Epochs</h2>
          <div className={styles.epochList}>
            {epochs.map((epoch: any, i: number) => {
              const badge = epoch.badgeReward ? JSON.parse(epoch.badgeReward) : null;
              return (
                <div key={epoch.id} className={`${styles.epochCard} ${epoch.status === 'ACTIVE' ? styles.epochActive : ''}`}>
                  <div className={styles.epochHeader}>
                    <span className={styles.epochStatus} style={{ color: STATUS_COLORS[epoch.status] }}>
                      {epoch.status}
                    </span>
                    <span className={styles.epochMult}>{epoch.multiplier}x</span>
                  </div>
                  <h3>{epoch.seasonName || epoch.name}</h3>
                  <p>{epoch.description}</p>
                  <div className={styles.epochFooter}>
                    <span>{(epoch.totalPointsPool || 0).toLocaleString()} Orbs pool</span>
                    {badge && (
                      <span className={styles.epochBadge}>
                        <Sparkles size={12} /> {badge.title}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
