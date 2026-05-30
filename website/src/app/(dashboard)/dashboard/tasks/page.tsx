'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ExternalLink, MessageCircle, Send, Twitter, Star, CheckCircle, AlertCircle, Info, X, Clock } from 'lucide-react';
import api from '@/lib/api';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const taskIconMap: Record<string, React.ReactNode> = {
  DISCORD: <MessageCircle size={20} />,
  TELEGRAM: <Send size={20} />,
  TWITTER: <Twitter size={20} />,
  CUSTOM: <Star size={20} />,
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  // Telegram verification modal states
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [telegramTaskId, setTelegramTaskId] = useState<string | null>(null);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [telegramError, setTelegramError] = useState('');

  // Twitter verification modal states
  const [twitterModalOpen, setTwitterModalOpen] = useState(false);
  const [twitterTaskId, setTwitterTaskId] = useState<string | null>(null);
  const [twitterUsername, setTwitterUsername] = useState('');
  const [twitterError, setTwitterError] = useState('');

  // Discord verification states
  const [verifyingDiscord, setVerifyingDiscord] = useState(false);

  // Toast notifications states
  const [toasts, setToasts] = useState<any[]>([]);

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    api.getTasks()
      .then(res => setTasks(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Check for Discord redirect code on mount
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        // Clear code from URL to keep it clean
        window.history.replaceState({}, document.title, window.location.pathname);
        handleVerifyDiscord(code);
      }
    }
  }, []);

  const handleComplete = async (taskId: string, type: string) => {
    if (type === 'TELEGRAM') {
      setTelegramTaskId(taskId);
      setTelegramModalOpen(true);
      setTelegramUsername('');
      setTelegramError('');
      return;
    }

    if (type === 'TWITTER') {
      setTwitterTaskId(taskId);
      setTwitterModalOpen(true);
      setTwitterUsername('');
      setTwitterError('');
      return;
    }

    if (type === 'DISCORD') {
      const clientId = '1508438708976746676';
      const redirectUri = encodeURIComponent('http://localhost:3000/dashboard/tasks');
      const scope = encodeURIComponent('identify email guilds guilds.join');
      window.location.href = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
      return;
    }

    setCompleting(taskId);
    try {
      await api.completeTask(taskId);
      const task = tasks.find(t => t.id === taskId);
      const reward = task ? task.rewardPoints : 0;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, userStatus: 'VERIFIED' } : t));
      showToast('Task Completed', `Successfully completed task! +${reward} Orbs earned.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Verification Failed', err.message || 'Failed to complete task. Please try again.', 'error');
    } finally {
      setCompleting(null);
    }
  };

  const handleVerifyTwitter = async () => {
    if (!twitterTaskId) return;
    if (!twitterUsername.trim()) {
      setTwitterError('Please enter a valid Twitter username.');
      return;
    }

    setCompleting(twitterTaskId);
    setTwitterError('');
    try {
      await api.completeTask(twitterTaskId, { twitterUsername });
      setTasks(prev => prev.map(t => t.id === twitterTaskId ? { ...t, userStatus: 'PENDING' } : t));
      setTwitterModalOpen(false);
      setTwitterTaskId(null);
      showToast('Approval Pending', 'Twitter username submitted for verification.', 'info');
    } catch (err: any) {
      console.error(err);
      setTwitterError(err.message || 'Failed to submit Twitter username.');
    } finally {
      setCompleting(null);
    }
  };

  const handleVerifyTelegram = async () => {
    if (!telegramTaskId) return;
    if (!telegramUsername.trim()) {
      setTelegramError('Please enter a valid Telegram username.');
      return;
    }

    setCompleting(telegramTaskId);
    setTelegramError('');
    try {
      await api.completeTask(telegramTaskId, { telegramUsername });
      const task = tasks.find(t => t.id === telegramTaskId);
      const reward = task ? task.rewardPoints : 0;
      setTasks(prev => prev.map(t => t.id === telegramTaskId ? { ...t, userStatus: 'VERIFIED' } : t));
      setTelegramModalOpen(false);
      setTelegramTaskId(null);
      showToast('Task Completed', `Telegram verification successful! +${reward} Orbs earned.`, 'success');
    } catch (err: any) {
      console.error(err);
      setTelegramError(err.message || 'Failed to verify membership. Please make sure you clicked request to join.');
    } finally {
      setCompleting(null);
    }
  };

  const handleVerifyDiscord = async (code: string) => {
    setVerifyingDiscord(true);
    try {
      await api.verifyDiscordTask(code);
      const task = tasks.find(t => t.type === 'DISCORD');
      const reward = task ? task.rewardPoints : 0;
      setTasks(prev => prev.map(t => t.type === 'DISCORD' ? { ...t, userStatus: 'VERIFIED' } : t));
      showToast('Task Completed', `Discord membership verified! +${reward} Orbs earned.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Verification Failed', err.message || 'Failed to verify Discord membership. Please join the server first.', 'error');
    } finally {
      setVerifyingDiscord(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
      </div>
    );
  }

  const completed = tasks.filter(t => t.userStatus === 'VERIFIED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Progress */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--white)' }}>Progress</h3>
          <span className="badge badge-primary">{completed}/{tasks.length} Complete</span>
        </div>
        <div style={{ height: 6, background: 'var(--surface)', borderRadius: 100, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--violet))', borderRadius: 100 }}
            initial={{ width: 0 }}
            animate={{ width: `${tasks.length > 0 ? (completed / tasks.length) * 100 : 0}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tasks.map((task, i) => {
          const isCompleted = task.userStatus === 'VERIFIED';
          const isPending = task.userStatus === 'PENDING';
          const isRejected = task.userStatus === 'REJECTED';
          const opacityVal = isCompleted ? 0.6 : isPending ? 0.85 : 1;
          
          return (
            <motion.div key={task.id} style={{ opacity: opacityVal }}
              initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}>
              <div style={{ background: isCompleted ? 'var(--bg)' : 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', gap: 20, transition: 'all 0.3s var(--ease)' }}>
                
                <div style={{ fontSize: '1.2rem', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', borderRadius: 12, color: 'var(--text)' }}>
                  {taskIconMap[task.type] || taskIconMap.CUSTOM}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: 4, fontWeight: 500, fontSize: '1.05rem', color: isCompleted ? 'var(--text-muted)' : 'var(--white)' }}>{task.title}</h4>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{task.description}</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--mono)', color: isCompleted ? 'var(--text-muted)' : 'var(--accent)', fontWeight: 400, fontSize: '1.2rem' }}>+{task.rewardPoints}</span>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Orbs</span>
                  </div>
                  
                  {isCompleted ? (
                    <div style={{ width: 160, display: 'flex', justifyContent: 'flex-end' }}>
                      <span className="badge badge-success"><Check size={12} style={{ marginRight: 4 }} /> Done</span>
                    </div>
                  ) : isPending ? (
                    <div style={{ width: 180, display: 'flex', justifyContent: 'flex-end' }}>
                      <span className="badge" style={{ 
                        background: 'rgba(245, 158, 11, 0.15)', 
                        color: '#f59e0b', 
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <Clock size={12} className="spin-slow" /> Approval Pending
                      </span>
                    </div>
                  ) : isRejected ? (
                    <div style={{ display: 'flex', gap: 8, width: 180, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <span className="badge" style={{ 
                        background: 'rgba(239, 68, 68, 0.15)', 
                        color: '#ef4444', 
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <X size={12} /> Rejected
                      </span>
                      <button className="btn-solid btn-sm" style={{ padding: '8px 12px' }} onClick={() => handleComplete(task.id, task.type)} disabled={completing === task.id}>
                        {completing === task.id ? '...' : 'Retry'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, width: 160, justifyContent: 'flex-end' }}>
                      {task.url && (
                        <a href={task.url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm" style={{ padding: '8px 12px' }}>
                          <ExternalLink size={14} /> Visit
                        </a>
                      )}
                      <button className="btn-solid btn-sm" style={{ padding: '8px 16px' }} onClick={() => handleComplete(task.id, task.type)} disabled={completing === task.id}>
                        {completing === task.id ? '...' : 'Verify'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Telegram Verification Modal */}
      {telegramModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 24,
        }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 24,
              padding: 32,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 24
            }}
          >
            <div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--white)', marginBottom: 8 }}>
                Verify Telegram Request
              </h4>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Please enter your Telegram username below. Our verification system will check if you have clicked request to join our private Telegram channel.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="eyebrow">Telegram Username</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 16, color: 'var(--text-dim)', fontSize: '1rem', userSelect: 'none' }}>@</span>
                <input
                  className="input"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  placeholder="username"
                  style={{ paddingLeft: 32, flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyTelegram();
                  }}
                />
              </div>
              {telegramError && (
                <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 4 }}>
                  {telegramError}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                className="btn-ghost"
                onClick={() => {
                  setTelegramModalOpen(false);
                  setTelegramTaskId(null);
                }}
                disabled={completing !== null}
              >
                Cancel
              </button>
              <button
                className="btn-solid"
                onClick={handleVerifyTelegram}
                disabled={completing !== null}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {completing === telegramTaskId ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Twitter Verification Modal */}
      {twitterModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 24,
        }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 24,
              padding: 32,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 24
            }}
          >
            <div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--white)', marginBottom: 8 }}>
                Verify Twitter/X Follow
              </h4>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Please enter your Twitter/X username below. Our team will manually verify that you followed @OrbitLinkNode on Twitter/X.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="eyebrow">Twitter/X Username</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 16, color: 'var(--text-dim)', fontSize: '1rem', userSelect: 'none' }}>@</span>
                <input
                  className="input"
                  value={twitterUsername}
                  onChange={(e) => setTwitterUsername(e.target.value)}
                  placeholder="username"
                  style={{ paddingLeft: 32, flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyTwitter();
                  }}
                />
              </div>
              {twitterError && (
                <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 4 }}>
                  {twitterError}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                className="btn-ghost"
                onClick={() => {
                  setTwitterModalOpen(false);
                  setTwitterTaskId(null);
                }}
                disabled={completing !== null}
              >
                Cancel
              </button>
              <button
                className="btn-solid"
                onClick={handleVerifyTwitter}
                disabled={completing !== null}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {completing === twitterTaskId ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Discord Verification Loading Overlay */}
      {verifyingDiscord && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          gap: 16
        }}>
          <div className="spinner" style={{
            width: 48,
            height: 48,
            border: '4px solid var(--border)',
            borderTop: '4px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <h4 style={{ color: 'var(--white)', fontWeight: 500 }}>Verifying Discord...</h4>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Exchanging security tokens and checking server status...</p>
        </div>
      )}

      {/* Toast Notifications Container */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 3000,
        maxWidth: 380,
        width: '100%',
      }}>
        <AnimatePresence>
          {toasts.map(toast => {
            const isSuccess = toast.type === 'success';
            const isError = toast.type === 'error';
            const accentColor = isSuccess ? '#00e676' : isError ? '#ff1744' : 'var(--accent)';
            
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{
                  background: 'rgba(20, 16, 35, 0.85)',
                  backdropFilter: 'blur(16px)',
                  border: `1px solid ${isSuccess ? 'rgba(0, 230, 118, 0.2)' : isError ? 'rgba(255, 23, 68, 0.2)' : 'var(--border)'}`,
                  borderRadius: 16,
                  padding: 16,
                  display: 'flex',
                  gap: 12,
                  boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 16px ${isSuccess ? 'rgba(0, 230, 118, 0.05)' : isError ? 'rgba(255, 23, 68, 0.05)' : 'rgba(0,0,0,0)'}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Left accent bar */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: accentColor,
                }} />

                {/* Icon */}
                <div style={{ color: accentColor, flexShrink: 0, marginTop: 2 }}>
                  {isSuccess ? <CheckCircle size={20} /> : isError ? <AlertCircle size={20} /> : <Info size={20} />}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--white)', marginBottom: 2 }}>
                    {toast.title}
                  </h5>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                    {toast.message}
                  </p>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 6,
                    transition: 'background 0.2s',
                    alignSelf: 'flex-start',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}} />
    </div>
  );
}
