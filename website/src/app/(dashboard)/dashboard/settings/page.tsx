'use client';

import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function SettingsPage() {
  const { user, linkWallet } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const copyReferral = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnectWallet = async () => {
    setLoading(true);
    setError('');
    try {
      if (!(window as any).ethereum) {
        throw new Error('Please install a Web3 wallet (e.g., MetaMask)');
      }
      
      const provider = (window as any).ethereum;
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      
      const message = `Sign this message to link your wallet to your OrbitLink account: ${address.toLowerCase()}`;
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, address],
      });
      
      await linkWallet(address, signature, message);
    } catch (err: any) {
      setError(err.message || 'Wallet connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 640 }}>
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: 24, color: 'var(--white)' }}>Profile Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label className="eyebrow" style={{ marginBottom: 8 }}>Username</label>
            <input className="input" value={user?.username || ''} readOnly />
          </div>
          <div>
            <label className="eyebrow" style={{ marginBottom: 8 }}>Email</label>
            <input className="input" value={user?.email || ''} readOnly />
          </div>
          <div>
            <label className="eyebrow" style={{ marginBottom: 8 }}>Wallet Address</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={user?.walletAddress || 'Not connected'} readOnly placeholder="Connect wallet" style={{ flex: 1 }} />
              {!user?.walletAddress && (
                <button className="btn-solid btn-sm" onClick={handleConnectWallet} disabled={loading} style={{ padding: '0 16px', flexShrink: 0, height: 48, borderRadius: 12 }}>
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 8 }}>{error}</p>}
          </div>
          <div>
            <label className="eyebrow" style={{ marginBottom: 8 }}>Referral Code</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={user?.referralCode || ''} readOnly style={{ fontFamily: 'var(--mono)', flex: 1 }} />
              <button className="btn-ghost btn-sm" onClick={copyReferral} style={{ padding: '0 16px', flexShrink: 0 }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: 24, color: 'var(--white)' }}>Account Details</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Role</span>
            <span className={`badge ${user?.role === 'ADMIN' ? 'badge-primary' : 'badge-accent'}`}>{user?.role}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Member since</span>
            <span style={{ color: 'var(--white)', fontSize: '0.9rem' }}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Orbs</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--accent)' }}>{user?.totalPoints?.toLocaleString() || '0'}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
