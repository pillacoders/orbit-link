'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ExternalLink, MessageCircle, Send, Twitter, Star } from 'lucide-react';
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

  useEffect(() => {
    api.getTasks()
      .then(res => setTasks(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleComplete = async (taskId: string) => {
    setCompleting(taskId);
    try {
      await api.completeTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, userStatus: 'VERIFIED' } : t));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to complete task. Please try again.');
    } finally {
      setCompleting(null);
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
          return (
            <motion.div key={task.id} style={{ opacity: isCompleted ? 0.6 : 1 }}
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
                    <div style={{ width: 100, display: 'flex', justifyContent: 'flex-end' }}>
                      <span className="badge badge-success"><Check size={12} style={{ marginRight: 4 }} /> Done</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, width: 160, justifyContent: 'flex-end' }}>
                      {task.url && (
                        <a href={task.url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm" style={{ padding: '8px 12px' }}>
                          <ExternalLink size={14} /> Visit
                        </a>
                      )}
                      <button className="btn-solid btn-sm" style={{ padding: '8px 16px' }} onClick={() => handleComplete(task.id)} disabled={completing === task.id}>
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
    </div>
  );
}
