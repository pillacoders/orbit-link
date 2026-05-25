'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Wifi, Clock, Gift, ArrowUpRight, Activity, Users } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import styles from './home.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function DashboardHome() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [nodeStats, setNodeStats] = useState<any>(null);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [rank, setRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [bonusTimer, setBonusTimer] = useState('');

  useEffect(() => {
    loadDashboardData();
    checkBonusStatus();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!bonusClaimed) return;
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      if (diff <= 0) {
        setBonusClaimed(false);
        setBonusTimer('');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setBonusTimer(`${h}h ${m}m ${s}s`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [bonusClaimed]);

  const checkBonusStatus = async () => {
    try {
      const res = await api.getDailyBonusStatus();
      if (res.data?.claimed) {
        setBonusClaimed(true);
      }
    } catch (e) {}
  };

  const loadDashboardData = async () => {
    try {
      const [earningsRes, chartRes, nodeRes, referralRes, rankRes] = await Promise.all([
        api.getEarnings().catch(() => ({ data: { total: 0, today: 0, week: 0, month: 0 } })),
        api.getEarningsChart(7).catch(() => ({ data: [] })),
        api.getNodes().catch(() => ({ data: { totalNodes: 0, onlineNodes: 0, totalUptime: 0, averageQuality: 0 } })),
        api.getReferralStats().catch(() => ({ data: { totalReferrals: 0, totalEarnings: 0 } })),
        api.getMyRank().catch(() => ({ data: { rank: '-', totalPoints: 0 } })),
      ]);
      setEarnings(earningsRes.data);
      setChartData(chartRes.data || []);
      setNodeStats(nodeRes.data);
      setReferralStats(referralRes.data);
      setRank(rankRes.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimBonus = async () => {
    try {
      await api.claimDailyBonus();
      setBonusClaimed(true);
      loadDashboardData();
    } catch (err: any) {
      if (err.message?.includes('already claimed')) setBonusClaimed(true);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const statCards = [
    { icon: <Zap size={18} />, label: 'Total Orbs', value: earnings?.total?.toLocaleString() || '0', change: `+${earnings?.today?.toFixed(1) || '0'} today`, positive: true, color: 'var(--accent)' },
    { icon: <TrendingUp size={18} />, label: 'Weekly Earnings', value: earnings?.week?.toFixed(1) || '0', change: `${earnings?.month?.toFixed(0) || '0'} this month`, positive: true, color: 'var(--violet)' },
    { icon: <Wifi size={18} />, label: 'Active Nodes', value: `${nodeStats?.onlineNodes || 0}/${nodeStats?.totalNodes || 0}`, change: `Quality ${nodeStats?.averageQuality || 0}%`, positive: true, color: 'var(--green)' },
    { icon: <Clock size={18} />, label: 'Total Uptime', value: formatUptime(nodeStats?.totalUptime || 0), change: 'Since joined', positive: true, color: 'var(--yellow)' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="skeleton" style={{ height: 140, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Stats */}
      <motion.div className={styles.statsGrid} initial="hidden" animate="visible">
        {statCards.map((stat, i) => (
          <motion.div key={i} className={styles.statCard} custom={i} variants={fadeUp}>
            <div className={styles.statIcon} style={{ background: `color-mix(in srgb, ${stat.color} 10%, transparent)`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>{stat.label}</span>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={`${styles.statChange} ${stat.positive ? styles.positive : ''}`}>
                <ArrowUpRight size={12} /> {stat.change}
              </span>
            </div>
            <div className={styles.techLine} />
          </motion.div>
        ))}
      </motion.div>

      {/* Chart + Side */}
      <div className={styles.mainGrid}>
        <motion.div className={styles.chartCard} initial="hidden" animate="visible" variants={fadeUp} custom={4}>
          <div className={styles.cardHeader}>
            <h3>Earnings Overview</h3>
            <span className="badge badge-primary">7 Days</span>
          </div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData.length > 0 ? chartData : [
                { date: 'Mon', points: 12 }, { date: 'Tue', points: 19 },
                { date: 'Wed', points: 15 }, { date: 'Thu', points: 25 },
                { date: 'Fri', points: 22 }, { date: 'Sat', points: 30 },
                { date: 'Sun', points: 28 },
              ]}>
                <defs>
                  <linearGradient id="colorPts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f7df7" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#4f7df7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#444444', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#444444', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, color: '#e0e0e0', fontSize: '0.85rem' }}
                  labelStyle={{ color: '#666666' }}
                />
                <Area type="monotone" dataKey="points" stroke="#4f7df7" strokeWidth={1.5} fill="url(#colorPts)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className={styles.sideCards}>
          {/* Daily Bonus */}
          <motion.div className={styles.bonusCard} initial="hidden" animate="visible" variants={fadeUp} custom={5}>
            <div className={styles.cardHeader}>
              <h3>Daily Bonus</h3>
              <Gift size={16} style={{ color: 'var(--yellow)' }} />
            </div>
            <p className={styles.bonusDesc}>Claim your daily bonus to maintain your contribution streak.</p>
            {bonusClaimed && bonusTimer ? (
              <div style={{ width: '100%', padding: '11px', fontSize: '0.85rem', textAlign: 'center', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, color: 'var(--text-dim)' }}>Next bonus in</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)' }}>{bonusTimer}</div>
              </div>
            ) : (
              <button className={bonusClaimed ? 'btn-ghost' : 'btn-solid'} onClick={handleClaimBonus} disabled={bonusClaimed}
                style={{ width: '100%', padding: '11px', fontSize: '0.85rem' }}>
                {bonusClaimed ? 'Claimed Today' : 'Claim Bonus'}
              </button>
            )}
          </motion.div>

          {/* Rank */}
          <motion.div className={styles.rankCard} initial="hidden" animate="visible" variants={fadeUp} custom={6}>
            <div className={styles.cardHeader}>
              <h3>Your Rank</h3>
              <Activity size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <div className={styles.rankDisplay}>
              <span className={styles.rankNum}>#{rank?.rank || '-'}</span>
              <span className={styles.rankLabel}>Global Ranking</span>
            </div>
          </motion.div>

          {/* Referrals */}
          <motion.div className={styles.referralCard} initial="hidden" animate="visible" variants={fadeUp} custom={7}>
            <div className={styles.cardHeader}>
              <h3>Referrals</h3>
              <Users size={16} style={{ color: 'var(--violet)' }} />
            </div>
            <div className={styles.referralStats}>
              <div>
                <span className={styles.referralNum}>{referralStats?.totalReferrals || 0}</span>
                <span className={styles.referralLabel}>Referred</span>
              </div>
              <div>
                <span className={styles.referralNum}>{referralStats?.totalEarnings?.toFixed(0) || 0}</span>
                <span className={styles.referralLabel}>Orbs Earned</span>
              </div>
            </div>
            <div className={styles.referralCode}>
              <span>Your code</span>
              <code>{user?.referralCode}</code>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
