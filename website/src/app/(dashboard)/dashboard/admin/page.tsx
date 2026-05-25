'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Wifi, Activity, Search, Ban, CheckCircle, Plus, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function AdminPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', type: 'INFO' });
  const [showAnnounce, setShowAnnounce] = useState(false);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [dashRes, usersRes] = await Promise.all([
        api.getAdminDashboard().catch(() => ({ data: {} })),
        api.getAdminUsers(1, search).catch(() => ({ data: [] })),
      ]);
      setDashboard(dashRes.data);
      setUsers(usersRes.data?.users || usersRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleToggleUser = async (userId: string) => {
    try {
      await api.toggleUser(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnnounce = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAnnouncement(announcementForm);
      setAnnouncementForm({ title: '', content: '', type: 'INFO' });
      setShowAnnounce(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 200, marginBottom: 16 }}>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)' }}>Admin privileges required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
      </div>
    );
  }

  const stats = [
    { icon: <Users size={18} />, label: 'Total Users', value: dashboard?.totalUsers || 0, color: 'var(--violet)' },
    { icon: <Wifi size={18} />, label: 'Active Nodes', value: dashboard?.activeNodes || 0, color: 'var(--accent)' },
    { icon: <TrendingUp size={18} />, label: 'Points Dist.', value: Math.round(dashboard?.totalPointsDistributed || 0).toLocaleString(), color: 'var(--green)' },
    { icon: <Activity size={18} />, label: 'Active Today', value: dashboard?.activeToday || 0, color: 'var(--yellow)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {stats.map((stat, i) => (
          <motion.div key={i} initial="hidden" animate="visible" variants={fadeUp} custom={i}
            style={{ background: 'var(--bg)', padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `color-mix(in srgb, ${stat.color} 15%, transparent)`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stat.icon}
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 400, color: 'var(--white)', lineHeight: 1 }}>{stat.value}</span>
              <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6 }}>{stat.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions Bar */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input className="input" placeholder="Search users by username or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 44 }} />
          </div>
          <button type="submit" className="btn-ghost" style={{ padding: '0 24px' }}>Search</button>
        </form>
        <button className="btn-solid" onClick={() => setShowAnnounce(!showAnnounce)}>
          <Plus size={16} /> Announce
        </button>
      </div>

      {/* Announcement Form */}
      {showAnnounce && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, overflow: 'hidden' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: 24, color: 'var(--white)' }}>New Announcement</h3>
          <form onSubmit={handleAnnounce} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input className="input" placeholder="Title" value={announcementForm.title} onChange={e => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))} required />
            <textarea className="input" placeholder="Content..." rows={4} value={announcementForm.content} onChange={e => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))} required style={{ resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <select className="input" value={announcementForm.type} onChange={e => setAnnouncementForm(prev => ({ ...prev, type: e.target.value }))} style={{ width: 'auto' }}>
                <option value="INFO">Info</option>
                <option value="WARNING">Warning</option>
                <option value="UPDATE">Update</option>
                <option value="EVENT">Event</option>
              </select>
              <button type="button" className="btn-ghost" onClick={() => setShowAnnounce(false)}>Cancel</button>
              <button type="submit" className="btn-solid"><Send size={16} /> Send Broadcast</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Users Table */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 0 0' }}>
        <div style={{ padding: '0 24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 500 }}>Users ({users.length})</h3>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: '0 0 16px 16px' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 24 }}>User</th>
                <th>Email</th>
                <th>Points</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ paddingRight: 24 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id}>
                  <td style={{ paddingLeft: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                        {u.username?.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500, color: 'var(--white)' }}>{u.username}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email}</td>
                  <td><span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{Math.round(u.totalPoints || 0).toLocaleString()}</span></td>
                  <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-accent'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-primary'}`} style={{ opacity: u.isActive ? 1 : 0.6 }}>{u.isActive ? 'Active' : 'Banned'}</span></td>
                  <td style={{ paddingRight: 24 }}>
                    <button className={u.isActive ? 'btn-ghost btn-sm' : 'btn-solid btn-sm'} onClick={() => handleToggleUser(u.id)} style={{ padding: '6px 12px' }}>
                      {u.isActive ? <><Ban size={12} style={{ marginRight: 4 }} /> Ban</> : <><CheckCircle size={12} style={{ marginRight: 4 }} /> Unban</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
