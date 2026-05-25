'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Users, TrendingUp, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function ReferralsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReferralStats()
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(stats?.referralLink || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} style={{ background: 'var(--bg)', padding: '32px 24px', position: 'relative' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--violet-glow)', color: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><Users size={20} /></div>
          <span style={{ display: 'block', fontSize: '2rem', fontWeight: 200, color: 'var(--white)', letterSpacing: '-0.03em', lineHeight: 1 }}>{stats?.totalReferrals || 0}</span>
          <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>Total Referrals</span>
        </motion.div>
        
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} style={{ background: 'var(--bg)', padding: '32px 24px', position: 'relative' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><Users size={20} /></div>
          <span style={{ display: 'block', fontSize: '2rem', fontWeight: 200, color: 'var(--white)', letterSpacing: '-0.03em', lineHeight: 1 }}>{stats?.activeReferrals || 0}</span>
          <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>Active Referrals</span>
        </motion.div>
        
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} style={{ background: 'var(--bg)', padding: '32px 24px', position: 'relative' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--green-glow)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><TrendingUp size={20} /></div>
          <span style={{ display: 'block', fontSize: '2rem', fontWeight: 200, color: 'var(--white)', letterSpacing: '-0.03em', lineHeight: 1 }}>{stats?.totalEarnings?.toFixed(0) || 0}</span>
          <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>Orbs Earned</span>
        </motion.div>
      </div>

      {/* Referral Link */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: 20 }}>Your Referral Link</h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="input" style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: '0.85rem', cursor: 'text', userSelect: 'all', padding: '16px 20px' }}>
            {stats?.referralLink || 'Loading...'}
          </div>
          <button className="btn-solid" onClick={copyCode} style={{ padding: '15px 32px' }}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 16 }}>
          Share this link to earn 100 Orbs per signup + 10% of their earnings forever.
        </p>
      </motion.div>

      {/* Referral List */}
      {stats?.referrals?.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 0 0' }}>
          <div style={{ padding: '0 24px', marginBottom: 24 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 500 }}>Your Network</h3>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: '0 0 16px 16px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>User</th>
                  <th>Orbs Earned</th>
                  <th>Status</th>
                  <th style={{ paddingRight: 24 }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {stats.referrals.map((ref: any) => (
                  <tr key={ref.id}>
                    <td style={{ paddingLeft: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', fontSize: '0.75rem', fontWeight: 600 }}>
                        {ref.user?.username?.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ color: 'var(--white)' }}>{ref.user?.username}</span>
                    </td>
                    <td><span style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>+{ref.pointsEarned?.toFixed(0)}</span></td>
                    <td><span className={`badge ${ref.status === 'ACTIVE' ? 'badge-success' : 'badge-accent'}`}>{ref.status}</span></td>
                    <td style={{ color: 'var(--text-dim)', paddingRight: 24 }}>{new Date(ref.joinedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
