'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Activity, Globe2, Cpu, Database, Radio, Shield, Zap, ArrowUpRight, ChevronRight } from 'lucide-react';
import styles from './page.module.css';

export default function LandingPage() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [liveStats, setLiveStats] = useState({ onlineNodes: 0, totalRelays: 0, totalDataRouted: 0, countriesActive: 0 });

  useEffect(() => {
    // Fetch live relay stats
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/relay/live`)
      .then(r => r.json())
      .then(d => {
        if (d.data) setLiveStats(d.data);
      })
      .catch(() => {});

    // Counter animation
    const counters = document.querySelectorAll('[data-count]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const target = parseInt(el.dataset.count || '0');
          animateCounter(el, target);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));

    // Scroll reveal
    const reveals = document.querySelectorAll('.reveal-up');
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15 });

    reveals.forEach(r => revealObserver.observe(r));

    return () => {
      observer.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  function animateCounter(el: HTMLElement, target: number) {
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = formatStat(current, el.dataset.suffix || '');
    }, 16);
  }

  function formatStat(val: number, suffix: string) {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M' + suffix;
    if (val >= 1000) return (val / 1000).toFixed(0) + 'K' + suffix;
    return Math.round(val) + suffix;
  }

  return (
    <div className={styles.landing}>
      <div className="dot-grid" />
      <div className="vignette vignette-top" />

      {/* ─── Nav ─── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navBrand}>
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L2 9.5V22.5L16 30L30 22.5V9.5L16 2Z" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M16 2L16 30" stroke="white" strokeWidth="0.6" opacity="0.3"/>
            </svg>
            <span>ORBITLINK</span>
          </Link>
          <div className={styles.navLinks}>
            <a href="#architecture">Architecture</a>
            <a href="#infrastructure">Infrastructure</a>
            <a href="#roadmap">Roadmap</a>
            <Link href="/login" className={styles.navCta}>
              Launch App
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Live Stats Ticker ─── */}
      <div className={styles.liveTicker}>
        <div className={styles.tickerInner}>
          <span className={styles.tickerDot} />
          <span>LIVE NETWORK</span>
          <span className={styles.tickerSep}>|</span>
          <span>{liveStats.onlineNodes.toLocaleString()} nodes online</span>
          <span className={styles.tickerSep}>|</span>
          <span>{liveStats.totalRelays.toLocaleString()} relays processed</span>
          <span className={styles.tickerSep}>|</span>
          <span>{liveStats.totalDataRouted.toFixed(1)} GB routed</span>
          <span className={styles.tickerSep}>|</span>
          <span>{liveStats.countriesActive} regions active</span>
        </div>
      </div>

      {/* ─── Hero ─── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className="eyebrow">DECENTRALIZED AI EDGE RELAY INFRASTRUCTURE</span>
          <h1 className={styles.heroTitle}>
            Power the AI edge.<br />
            <em className="text-gradient">Earn by relaying.</em>
          </h1>
          <p className={styles.heroDesc}>
            OrbitLink is a decentralized relay network powering AI inference routing,
            distributed data indexing, and privacy-preserving edge intelligence.
            Run a node. Contribute bandwidth. Earn ORBS tokens.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/signup" className="btn-solid">
              Run a Node
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
            </Link>
            <a href="#architecture" className="btn-ghost">Explore Architecture</a>
          </div>
        </div>

        {/* Stats Sidebar */}
        <div className={styles.heroStats} ref={statsRef}>
          <div className={styles.statItem}>
            <span className={styles.statNum} data-count="3000000" data-suffix="+">0</span>
            <span className={styles.statLabel}>Edge Nodes</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum} data-count="150" data-suffix="+">0</span>
            <span className={styles.statLabel}>Relay Regions</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum} data-count="99" data-suffix="%">0</span>
            <span className={styles.statLabel}>Network Uptime</span>
          </div>
        </div>
      </section>

      {/* ─── Architecture ─── */}
      <section className={styles.section} id="architecture">
        <div className={styles.sectionInner}>
          <span className="eyebrow reveal-up">AI RELAY ARCHITECTURE</span>
          <h2 className={`${styles.sectionTitle} reveal-up`}>
            Infrastructure for the<br />
            <span style={{ color: 'var(--text-muted)', fontWeight: 200 }}>decentralized AI era</span>
          </h2>

          <div className={styles.archGrid}>
            {[
              { icon: Cpu, title: 'AI Inference Relaying', desc: 'Route inference requests across distributed edge nodes with sub-100ms latency for real-time AI workloads.' },
              { icon: Database, title: 'Distributed Data Indexing', desc: 'Index and cache datasets across the network, enabling decentralized access to AI training and inference data.' },
              { icon: Radio, title: 'Edge Traffic Routing', desc: 'Smart routing protocols distribute traffic optimally across nodes based on proximity, quality, and capacity.' },
              { icon: Shield, title: 'Privacy-Preserving Intelligence', desc: 'Zero-knowledge relay proofs ensure data privacy while maintaining verifiable contribution metrics.' },
              { icon: Globe2, title: 'Global Relay Mesh', desc: 'A self-healing mesh of 3M+ nodes across 150+ countries ensures resilience and near-zero downtime.' },
              { icon: Zap, title: 'Proof of Relay', desc: 'Cryptographic verification of relay contributions ensures fair, trustless reward distribution via ORBS tokens.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className={`${styles.archCard} reveal-up`}>
                  <div className={styles.archIcon}><Icon size={20} /></div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className={styles.section} id="infrastructure">
        <div className={styles.sectionInner}>
          <span className="eyebrow reveal-up">BECOME A NODE OPERATOR</span>
          <h2 className={`${styles.sectionTitle} reveal-up`}>
            Deploy in minutes.<br />
            <span style={{ color: 'var(--text-muted)', fontWeight: 200 }}>Earn continuously.</span>
          </h2>

          <div className={styles.stepsGrid}>
            <div className={`${styles.stepCard} reveal-up`}>
              <span className={styles.stepNum}>01</span>
              <h3>Install the relay node</h3>
              <p>Download the OrbitLink extension. It runs silently, relaying AI traffic through your connection.</p>
            </div>
            <div className={`${styles.stepCard} reveal-up`}>
              <span className={styles.stepNum}>02</span>
              <h3>Connect your identity</h3>
              <p>Sign in with email, Google, or a Web3 wallet. Your node is cryptographically linked to your identity.</p>
            </div>
            <div className={`${styles.stepCard} reveal-up`}>
              <span className={styles.stepNum}>03</span>
              <h3>Relay AI workloads</h3>
              <p>Your node automatically routes inference requests, indexes datasets, and relays edge traffic.</p>
            </div>
            <div className={`${styles.stepCard} reveal-up`}>
              <span className={styles.stepNum}>04</span>
              <h3>Earn ORBS rewards</h3>
              <p>Earn points based on relay quality, uptime, and contribution. Redeem for ORBS tokens on Polygon.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Roadmap ─── */}
      <section className={styles.section} id="roadmap">
        <div className={styles.sectionInner}>
          <span className="eyebrow reveal-up">ROADMAP</span>
          <h2 className={`${styles.sectionTitle} reveal-up`}>
            Building the future of<br />
            <span style={{ color: 'var(--text-muted)', fontWeight: 200 }}>decentralized AI infrastructure</span>
          </h2>

          <div className={styles.roadmapGrid}>
            {[
              { phase: 'EPOCH 1', name: 'Genesis Relay', status: 'active', items: ['Core relay network', 'Extension node deployment', 'ORBS token launch', 'Referral mining system'] },
              { phase: 'EPOCH 2', name: 'Edge Intelligence', status: 'upcoming', items: ['AI inference routing', 'Guild competitions', 'Staking & governance', 'Mobile relay nodes'] },
              { phase: 'EPOCH 3', name: 'Distributed AI', status: 'upcoming', items: ['Dataset marketplace', 'Enterprise relay API', 'Cross-chain expansion', 'Decentralized governance'] },
            ].map((epoch, i) => (
              <div key={i} className={`${styles.roadmapCard} ${epoch.status === 'active' ? styles.roadmapActive : ''} reveal-up`}>
                <div className={styles.roadmapPhase}>
                  <span className={styles.roadmapLabel}>{epoch.phase}</span>
                  {epoch.status === 'active' && <span className={styles.roadmapBadge}>LIVE</span>}
                </div>
                <h3>{epoch.name}</h3>
                <ul>
                  {epoch.items.map((item, j) => (
                    <li key={j}><ChevronRight size={12} />{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <span className="eyebrow">JOIN THE NETWORK</span>
          <h2 className={styles.sectionTitle}>
            The decentralized AI edge<br />needs your bandwidth.
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto 32px', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Every node strengthens the network. Every relay earns rewards.
            Join 3M+ operators powering the next generation of AI infrastructure.
          </p>
          <Link href="/signup" className="btn-solid">
            Start Contributing
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L2 9.5V22.5L16 30L30 22.5V9.5L16 2Z" stroke="white" strokeWidth="1.2" fill="none"/>
            </svg>
            <span>ORBITLINK</span>
          </div>
          <p className={styles.footerText}>Decentralized AI Edge Relay Infrastructure</p>
          <p className={styles.footerCopy}>&copy; {new Date().getFullYear()} OrbitLink. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
