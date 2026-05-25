'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, History, Activity, AlertTriangle, 
  Loader2, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import styles from './wallet.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function WalletPage() {
  const { user, refreshProfile, linkWallet: linkWalletContext } = useAuth();
  
  const [balance, setBalance] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Web3 States
  const [hasProvider, setHasProvider] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [browserAddress, setBrowserAddress] = useState<string>('');
  const [web3Loading, setWeb3Loading] = useState(false);
  const [web3Error, setWeb3Error] = useState('');
  
  // Linking States
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [linkingError, setLinkingError] = useState('');

  // 1. Initial wallet load of points and transaction history
  useEffect(() => {
    async function loadWallet() {
      try {
        const [earningsRes, historyRes] = await Promise.all([
          api.getEarnings(),
          api.getPointsHistory()
        ]);
        
        if (earningsRes.success) {
          setBalance(earningsRes.data);
        }
        if (historyRes.success) {
          setHistory(historyRes.data.transactions || []);
        }
      } catch (err) {
        console.error('Wallet load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWallet();
  }, []);

  // 2. Check Web3 Provider & Accounts
  const checkWeb3 = async (requestConnect = false) => {
    if (typeof window === 'undefined') return;
    const provider = (window as any).ethereum;
    if (!provider) {
      setHasProvider(false);
      return;
    }
    setHasProvider(true);
    setWeb3Error('');

    try {
      setWeb3Loading(true);
      const accounts = requestConnect 
        ? await provider.request({ method: 'eth_requestAccounts' })
        : await provider.request({ method: 'eth_accounts' });

      if (accounts && accounts.length > 0) {
        setIsWalletConnected(true);
        setBrowserAddress(accounts[0]);
      } else {
        setIsWalletConnected(false);
        setBrowserAddress('');
      }
    } catch (err: any) {
      console.error('Web3 connection check failed:', err);
      setWeb3Error(err.message || 'Failed to communicate with Web3 wallet');
    } finally {
      setWeb3Loading(false);
    }
  };

  // 3. Set up MetaMask Event Listeners
  useEffect(() => {
    checkWeb3();

    const provider = (window as any).ethereum;
    if (provider && provider.on) {
      const handleAccounts = (accounts: string[]) => {
        if (accounts.length > 0) {
          setIsWalletConnected(true);
          setBrowserAddress(accounts[0]);
        } else {
          setIsWalletConnected(false);
          setBrowserAddress('');
        }
      };

      provider.on('accountsChanged', handleAccounts);

      return () => {
        if (provider.removeListener) {
          provider.removeListener('accountsChanged', handleAccounts);
        }
      };
    }
  }, [browserAddress]);

  // 4. Link wallet inside database
  const handleLinkWallet = async () => {
    setLinkingLoading(true);
    setLinkingError('');
    try {
      const provider = (window as any).ethereum;
      if (!provider) throw new Error('MetaMask not detected. Please install a Web3 wallet.');
      
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      
      const message = `Sign this message to link your wallet to your OrbitLink account: ${address.toLowerCase()}`;
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, address],
      });
      
      await linkWalletContext(address, signature, message);
      await refreshProfile();
      await checkWeb3();
    } catch (err: any) {
      setLinkingError(err.message || 'Wallet connection/linking failed');
    } finally {
      setLinkingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.walletPage}>
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 16, marginTop: 24 }} />
      </div>
    );
  }

  const userAddress = user?.walletAddress || '';
  const isMismatched = isWalletConnected && userAddress && browserAddress.toLowerCase() !== userAddress.toLowerCase();
  const offChainPoints = Math.floor(user?.totalPoints || 0);

  return (
    <div className={styles.walletPage}>
      <div className={styles.grid}>
        
        {/* ─── Orbs Earnings Card (Left Column) ─── */}
        <motion.div className={styles.balanceCard} initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className={styles.balanceHeader}>
            <h2>Total Orbs Earned</h2>
            <div className={styles.networkBadge}>
              <span className={styles.dot} /> Accumulated
            </div>
          </div>
          
          <div className={styles.balanceMain}>
            <div className={styles.balanceAmount}>
              <span className={styles.amount}>{offChainPoints.toLocaleString()}</span>
              <span className={styles.currency}>Orbs</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Orbs are the native utility points of the OrbitLink ecosystem. You earn Orbs by connecting nodes, contributing idle compute power, and completing promotional tasks. 
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Link your Web3 wallet to verify your identity and secure eligibility for future rewards and token events.
            </p>
          </div>
        </motion.div>

        {/* ─── Web3 Wallet Connection Card (Right Column) ─── */}
        <motion.div className={styles.walletCard} initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className={styles.balanceHeader}>
            <h2>Wallet Connection</h2>
            <div className={styles.statusIndicator}>
              {userAddress ? (
                isWalletConnected ? (
                  isMismatched ? (
                    <><span className={`${styles.dot} ${styles.dotRed}`} /> Mismatch</>
                  ) : (
                    <><span className={`${styles.dot} ${styles.dotGreen}`} /> Synced</>
                  )
                ) : (
                  <><span className={`${styles.dot} ${styles.dotOrange}`} /> Disconnected</>
                )
              ) : (
                <><span className={`${styles.dot} ${styles.dotRed}`} /> Unlinked</>
              )}
            </div>
          </div>

          <div className={styles.walletStatus}>
            {/* Wallet Info Form */}
            <div className={styles.addressBlock}>
              <span className={styles.label}>Linked Account Address</span>
              <input 
                className={styles.addressInput} 
                value={userAddress ? `${userAddress.slice(0, 18)}...${userAddress.slice(-14)}` : 'No wallet linked'} 
                readOnly 
              />
            </div>
            
            {/* Warning Boxes */}
            {hasProvider && isMismatched && (
              <div className={`${styles.alertBox} ${styles.alertError}`}>
                <AlertTriangle size={16} className={styles.alertIcon} />
                <div className={styles.alertText}>
                  Browser wallet mismatch! Expected: <strong>{userAddress.slice(0,6)}...{userAddress.slice(-4)}</strong> but got <strong>{browserAddress.slice(0,6)}...{browserAddress.slice(-4)}</strong>. Please switch accounts in MetaMask.
                </div>
              </div>
            )}

            {!hasProvider && (
              <div className={`${styles.alertBox} ${styles.alertWarning}`}>
                <AlertTriangle size={16} className={styles.alertIcon} />
                <div className={styles.alertText}>
                  No Web3 wallet browser extension (like MetaMask) detected. Install MetaMask to see live blockchain balances.
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className={styles.actionButtons}>
            {!userAddress ? (
              <button 
                className={styles.btnPrimary} 
                onClick={handleLinkWallet} 
                disabled={linkingLoading}
                style={{ width: '100%' }}
              >
                {linkingLoading ? 'Connecting...' : 'Link Web3 Wallet'}
              </button>
            ) : !isWalletConnected ? (
              <button 
                className={styles.btnSecondary} 
                onClick={() => checkWeb3(true)} 
                disabled={web3Loading}
                style={{ width: '100%' }}
              >
                {web3Loading ? <Loader2 size={16} className="spin" /> : <Wallet size={16} />} Connect Browser Wallet
              </button>
            ) : (
              <button 
                className={styles.btnSecondary} 
                onClick={() => checkWeb3()}
                disabled={web3Loading}
                style={{ width: '100%' }}
              >
                <RefreshCw size={16} className={web3Loading ? 'spin' : ''} /> Refresh Connection
              </button>
            )}
          </div>
          {linkingError && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 8 }}>{linkingError}</p>}
        </motion.div>

      </div>

      {/* ─── Transaction History ─── */}
      <motion.div className={styles.historySection} initial="hidden" animate="visible" variants={fadeUp} custom={2}>
        <div className={styles.cardHeader}>
          <h3>Transaction History</h3>
          <History size={18} className={styles.headerIcon} />
        </div>
        
        {history.length > 0 ? (
          <div className={styles.txList}>
            {history.slice(0, 10).map((tx: any) => (
              <div key={tx.id} className={styles.txItem}>
                <div className={styles.txLeft}>
                  <div className={styles.txIcon}>
                    <Activity size={16} />
                  </div>
                  <div className={styles.txDetails}>
                    <div className={styles.txTitle}>{tx.source || tx.type}</div>
                    <div className={styles.txDate}>{new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className={`${styles.txAmount} ${styles.txAmountPositive}`}>
                  +{Math.abs(Math.round(tx.amount)).toLocaleString()} Orbs
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            No transactions yet. Start relaying or completing tasks to earn Orbs!
          </div>
        )}
      </motion.div>
    </div>
  );
}
