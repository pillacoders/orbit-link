'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Shield, Zap, Trophy, Star, Flame, Clock,
  Users, Cpu, Award, Lock, Sparkles, ChevronRight,
} from 'lucide-react';
import api from '@/lib/api';
import styles from './profile.module.css';

const RARITY_COLORS: Record<string, string> = {
  COMMON: '#9ca3af',
  UNCOMMON: '#34d399',
  RARE: '#4f7df7',
  EPIC: '#a855f7',
  LEGENDARY: '#f59e0b',
};

const CATEGORY_LABELS: Record<string, string> = {
  UNLOCKED: 'Unlocked',
  CONTRIBUTION: 'Contribution',
  SOCIAL: 'Social',
  STREAK: 'Streaks',
  HIDDEN: 'Hidden',
  EPOCH: 'Seasonal',
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [filter, setFilter] = useState('UNLOCKED');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [profileRes, achRes] = await Promise.all([
        api.getUserProfile(),
        api.getAllAchievements(),
      ]);
      setProfile(profileRes.data);
      setAchievements(achRes.data || []);
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredAchievements = filter === 'ALL'
    ? achievements
    : filter === 'UNLOCKED'
      ? achievements.filter(a => a.unlocked)
      : achievements.filter(a => a.category === filter);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <div className={styles.profilePage}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.profilePage}>
      {/* ─── Profile Header ─── */}
      <motion.div className={styles.profileHeader} initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className={styles.avatarSection}>
          <div className={styles.avatar}>
            <span>{profile?.user?.username?.[0]?.toUpperCase() || 'O'}</span>
          </div>
          <div className={styles.identity}>
            <h1>{profile?.user?.username || 'Operator'}</h1>
            <span className={styles.title}>{profile?.title || 'Relay Initiate'}</span>
          </div>
        </div>

        <div className={styles.levelSection}>
          <div className={styles.levelBadge}>
            <span className={styles.levelNum}>LV {profile?.level || 1}</span>
          </div>
          <div className={styles.xpBar}>
            <div className={styles.xpInfo}>
              <span>{(profile?.xp || 0).toLocaleString()} XP</span>
              <span className={styles.xpTarget}>{(profile?.nextLevelXp || 100).toLocaleString()} XP</span>
            </div>
            <div className={styles.xpTrack}>
              <motion.div
                className={styles.xpFill}
                initial={{ width: 0 }}
                animate={{ width: `${profile?.progressPercent || 0}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Stats Grid ─── */}
      <motion.div className={styles.statsGrid} initial="hidden" animate="visible">
        {[
          { icon: Zap, label: 'Total Orbs', value: Math.round(profile?.user?.totalPoints || 0).toLocaleString(), color: '#4f7df7' },
          { icon: Shield, label: 'Trust Score', value: `${Math.round(profile?.trustScore || 50)}%`, color: '#34d399' },
          { icon: Trophy, label: 'Achievements', value: `${unlockedCount}/${totalCount}`, color: '#f59e0b' },
          { icon: Users, label: 'Referrals', value: (profile?.user?._count?.referralsMade || 0).toString(), color: '#a855f7' },
          { icon: Cpu, label: 'Nodes', value: (profile?.user?._count?.nodes || 0).toString(), color: '#f87171' },
          { icon: Award, label: 'Tasks Done', value: (profile?.user?._count?.taskCompletions || 0).toString(), color: '#fbbf24' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={i} className={styles.statCard} custom={i + 1} variants={fadeUp}>
              <div className={styles.statIcon} style={{ color: stat.color }}>
                <Icon size={16} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ─── Contribution Mode ─── */}
      <motion.div className={styles.modeSection} initial="hidden" animate="visible" variants={fadeUp} custom={7}>
        <h2>Contribution Mode</h2>
        <div className={styles.modeGrid}>
          {[
            { key: 'PASSIVE', label: 'Passive', desc: 'Minimal resource usage', icon: Clock },
            { key: 'AI_ASSIST', label: 'AI Assist', desc: 'Route AI inference traffic', icon: Cpu },
            { key: 'EDGE_ROUTING', label: 'Edge Routing', desc: 'Full edge relay mode', icon: Zap },
            { key: 'SMART', label: 'Smart', desc: 'Auto-optimize contribution', icon: Sparkles },
          ].map(mode => {
            const Icon = mode.icon;
            const isActive = profile?.contributionMode === mode.key;
            return (
              <button
                key={mode.key}
                className={`${styles.modeCard} ${isActive ? styles.modeActive : ''}`}
                onClick={async () => {
                  try {
                    await api.setContributionMode(mode.key);
                    setProfile((p: any) => ({ ...p, contributionMode: mode.key }));
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                <Icon size={18} />
                <span className={styles.modeLabel}>{mode.label}</span>
                <span className={styles.modeDesc}>{mode.desc}</span>
                {isActive && <span className={styles.modeActiveDot} />}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Achievements ─── */}
      <motion.div className={styles.achievementsSection} initial="hidden" animate="visible" variants={fadeUp} custom={8}>
        <div className={styles.achHeader}>
          <h2>Achievements</h2>
          <div className={styles.achFilters}>
            {['UNLOCKED', 'ALL', 'CONTRIBUTION', 'SOCIAL', 'STREAK', 'HIDDEN'].map(cat => (
              <button
                key={cat}
                className={`${styles.achFilter} ${filter === cat ? styles.achFilterActive : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat === 'ALL' ? 'All' : CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        </div>

        {filteredAchievements.length > 0 ? (
          <div className={styles.achGrid}>
            {filteredAchievements.map((ach, i) => (
              <motion.div
                key={ach.id || i}
                className={`${styles.achCard} ${ach.unlocked ? styles.achUnlocked : styles.achLocked}`}
                custom={i}
                variants={fadeUp}
                style={{ '--rarity-color': RARITY_COLORS[ach.rarity] || '#9ca3af' } as any}
              >
                <div className={styles.achIconWrap}>
                  {ach.isHidden && !ach.unlocked ? <Lock size={18} /> : <Star size={18} />}
                </div>
                <div className={styles.achInfo}>
                  <span className={styles.achTitle}>{ach.title}</span>
                  <span className={styles.achDesc}>{ach.description}</span>
                </div>
                <div className={styles.achMeta}>
                  <span className={styles.achRarity} style={{ color: RARITY_COLORS[ach.rarity] }}>
                    {ach.rarity}
                  </span>
                  <span className={styles.achXp}>+{ach.xpReward} XP</span>
                </div>
                {ach.unlocked && <div className={styles.achCheck}>✓</div>}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className={styles.achEmpty}>
            <Trophy size={48} className={styles.achEmptyIcon} />
            <h3>No achievements here yet</h3>
            <p>
              {filter === 'UNLOCKED'
                ? "You haven't unlocked any achievements yet. Start relaying or complete tasks to unlock them!"
                : "No achievements found in this category."}
            </p>
            {filter === 'UNLOCKED' && (
              <button className="btn-solid btn-sm" onClick={() => setFilter('ALL')} style={{ marginTop: 12 }}>
                Browse All Achievements
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
