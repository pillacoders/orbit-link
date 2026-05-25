'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Award, Trophy, Timer,
  Settings, LogOut, Bell, Menu, X, Shield, Zap,
  Globe2, BarChart3, Swords, User, BookOpen, Wallet,
  Sun, Moon,
} from 'lucide-react';
import styles from './dashboard.module.css';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/network', label: 'Network', icon: Globe2 },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
  { href: '/dashboard/tasks', label: 'Boost Rewards', icon: Award },
  { href: '/dashboard/referrals', label: 'Referrals', icon: Users },
  { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/dashboard/epochs', label: 'Epochs', icon: Timer },
  { href: '/dashboard/docs', label: 'Docs', icon: BookOpen },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const adminItems = [
  { href: '/dashboard/admin', label: 'Admin Panel', icon: Shield },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Then down in the component body
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--black)' }}>
        <div className="skeleton" style={{ width: 200, height: 24 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Prevents rendering dashboard content while redirecting
  }

  const getPageTitle = () => {
    const item = [...navItems, ...adminItems].find(i => i.href === pathname);
    return item?.label || 'Dashboard';
  };

  const arrowIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M7 17L17 7M17 7H7M17 7V17"/>
    </svg>
  );

  return (
    <div className={styles.dashLayout}>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarLogo}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L2 9.5V22.5L16 30L30 22.5V9.5L16 2Z" stroke="white" strokeWidth="1.5" fill="none"/>
            <path d="M16 2L16 30" stroke="white" strokeWidth="0.8" opacity="0.4"/>
          </svg>
          <span>ORBITLINK</span>
        </div>

        <nav className={styles.sidebarNav}>
          <div className={styles.sidebarSection}>Main</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                onClick={() => setSidebarOpen(false)}>
                <span className={styles.navItemIcon}><Icon size={17} /></span>
                {item.label}
              </Link>
            );
          })}

          {user?.role === 'ADMIN' && (
            <>
              <div className={styles.sidebarSection}>Admin</div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                    onClick={() => setSidebarOpen(false)}>
                    <span className={styles.navItemIcon}><Icon size={17} /></span>
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user?.username}</div>
              <div className={styles.userPoints}>
                {user?.totalPoints?.toLocaleString() || '0'} Orbs
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className={styles.menuToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className={styles.topBarTitle}>{getPageTitle()}</h2>
          </div>
          <div className={styles.topBarActions}>
            <button className="btn-ghost btn-sm" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span style={{ fontSize: '0.8rem' }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <button className="btn-ghost btn-sm" style={{ padding: '8px 16px' }}>
              <Bell size={16} />
            </button>
            <button className="btn-ghost btn-sm" style={{ padding: '8px 16px' }} onClick={() => { logout(); router.push('/'); }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
