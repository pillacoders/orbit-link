'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, User, Wallet, Gift } from 'lucide-react';
import Link from 'next/link';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { ensureAmoyNetwork, promptAddOrbsToken } from '@/lib/web3';
import styles from '../auth.module.css';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, googleLogin, walletLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(email, username, password, referralCode || undefined);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then(res => res.json());
        
        await googleLogin(userInfo.sub, userInfo.email, userInfo.name);
        router.push('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Google Signup failed');
        setLoading(false);
      }
    },
    onError: () => setError('Google Signup was canceled or failed'),
  });

  const handleWalletLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (typeof (window as any).ethereum === 'undefined') {
        throw new Error('Please install a Web3 wallet (e.g., MetaMask)');
      }
      
      const provider = (window as any).ethereum;
      
      // Ensure Polygon Amoy Network & prompt to add ORBS token
      await ensureAmoyNetwork(provider);
      await promptAddOrbsToken(provider);

      // Request accounts
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      
      // Sign authentication message
      const message = `Sign this message to login to OrbitLink.\nTimestamp: ${Date.now()}`;
      const signature = await provider.request({ 
        method: 'personal_sign', 
        params: [message, address] 
      });
      
      await walletLogin(address, signature, message);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Wallet Signup failed');
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className="dot-grid" />
      <div className="vignette vignette-top" />

      <motion.div className={styles.authCard}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>

        <div className={styles.authLogo}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L2 9.5V22.5L16 30L30 22.5V9.5L16 2Z" stroke="white" strokeWidth="1.5" fill="none"/>
          </svg>
          <span>ORBITLINK</span>
        </div>

        <h1 className={styles.authTitle}>Create account</h1>
        <p className={styles.authSubtitle}>Join OrbitLink and start earning rewards</p>

        {error && <div className={styles.authError}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div>
            <label>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input id="signup-email" className="input" type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required style={{ paddingLeft: 40 }} />
            </div>
          </div>

          <div>
            <label>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input id="signup-username" className="input" type="text" placeholder="satoshi"
                value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={20} style={{ paddingLeft: 40 }} />
            </div>
          </div>

          <div>
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input id="signup-password" className="input" type="password" placeholder="Min 8 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={{ paddingLeft: 40 }} />
            </div>
          </div>

          <div>
            <label>Referral Code (optional)</label>
            <div style={{ position: 'relative' }}>
              <Gift size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input id="signup-referral" className="input" type="text" placeholder="ORBIT001"
                value={referralCode} onChange={(e) => setReferralCode(e.target.value)} style={{ paddingLeft: 40 }} />
            </div>
          </div>

          <button type="submit" className={`btn-solid ${styles.submitBtn}`} disabled={loading} id="signup-submit">
            {loading ? 'Creating...' : 'Create Account'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
          </button>
        </form>

        <div className={styles.authDivider}>or continue with</div>

        <div className={styles.authSocials}>
          <button type="button" onClick={() => handleGoogleLogin()} disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
          <button type="button" onClick={handleWalletLogin} disabled={loading}>
            <Wallet size={16} />
            Wallet
          </button>
        </div>

        <p className={styles.authFooter}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        <SignupContent />
      </Suspense>
    </GoogleOAuthProvider>
  );
}
