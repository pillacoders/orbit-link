'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Globe2, Wifi, Activity, Database, Cpu, Radio, Lock } from 'lucide-react';
import api from '@/lib/api';
import styles from './network.module.css';

interface RelayEvent {
  id: string;
  type: string;
  source: string;
  sourceName: string;
  destination: string;
  destName: string;
  dataSize: number;
  latency: number;
  sourceLat: number;
  sourceLng: number;
  destLat: number;
  destLng: number;
  timestamp: string;
  metadata?: string;
}

interface RegionStat {
  code: string;
  name: string;
  lat: number;
  lng: number;
  relayCount: number;
  dataMB: number;
}

const TYPE_COLORS: Record<string, string> = {
  INFERENCE: '#7c5bf5',
  INDEXING: '#4f7df7',
  ROUTING: '#34d399',
  EDGE_TRAFFIC: '#fbbf24',
  DATASET: '#f87171',
};

const TYPE_ICONS: Record<string, any> = {
  INFERENCE: Cpu,
  INDEXING: Database,
  ROUTING: Radio,
  EDGE_TRAFFIC: Wifi,
  DATASET: Activity,
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function NetworkPage() {
  const [liveStats, setLiveStats] = useState<any>(null);
  const [regions, setRegions] = useState<RegionStat[]>([]);
  const [relayFeed, setRelayFeed] = useState<RelayEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [geoRes, feedRes] = await Promise.all([
        api.getRelayGeo().catch(() => ({ data: { regions: [], stats: [], liveCounters: {} } })),
        api.getRelayFeed(15).catch(() => ({ data: [] })),
      ]);

      const geoData = geoRes.data;
      setLiveStats(geoData.liveCounters);

      const regionStats: RegionStat[] = geoData.stats || [];
      setRegions(regionStats);

      const feedData = feedRes.data || [];
      setRelayFeed(feedData.slice(0, 8));
    } catch (err) {
      console.error('Network data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toLocaleString();
  };

  const counters = useMemo(() => [
    { icon: Globe2, label: 'Active Nodes', value: formatNum(liveStats?.onlineNodes || 0), color: '#34d399' },
    { icon: Activity, label: 'Total Relays', value: formatNum(liveStats?.totalRelays || 0), color: '#4f7df7' },
    { icon: Database, label: 'Data Routed', value: `${(liveStats?.totalDataRouted || 0).toFixed(1)} GB`, color: '#7c5bf5' },
    { icon: Radio, label: 'Relays/min', value: formatNum(liveStats?.relaysPerMinute || 0), color: '#fbbf24' },
  ], [liveStats]);

  if (loading) {
    return (
      <div className={styles.networkPage}>
        <div className="skeleton" style={{ height: '100%', borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div className={styles.networkPage}>
      {/* Live Counters Bar */}
      <motion.div className={styles.countersBar} initial="hidden" animate="visible">
        {counters.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={i} className={styles.counterItem} custom={i} variants={fadeUp}>
              <div className={styles.counterIcon} style={{ color: c.color }}>
                <Icon size={15} />
              </div>
              <div className={styles.counterContent}>
                <span className={styles.counterValue}>{c.value}</span>
                <span className={styles.counterLabel}>{c.label}</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className={styles.mainContent}>
        {/* Globe Placeholder (Coming Soon) */}
        <motion.div className={styles.globeContainer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px', maxWidth: '420px', gap: '20px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', boxShadow: '0 0 24px rgba(79, 125, 247, 0.1)' }}>
              <Globe2 size={36} className="spin" style={{ animationDuration: '20s' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--white)', marginBottom: '8px' }}>3D Network Map</h3>
              <div className="badge badge-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '6px 12px' }}>
                <Lock size={12} /> Coming in Epoch 2
              </div>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Geographical node distribution, connection latency arcs, and real-time data routing maps will be unlocked in the next network upgrade. Stay tuned for Epoch 2!
            </p>
          </div>
          <div className={styles.globeOverlay}>
            <span className={styles.globePulse} style={{ background: 'var(--accent)', boxShadow: '0 0 8px rgba(79, 125, 247, 0.4)' }} />
            <span className={styles.globeLabel}>SYSTEM VISUALIZATION</span>
          </div>
        </motion.div>

        {/* Side Panel */}
        <div className={styles.sidePanel}>
          {/* Relay Activity Feed */}
          <motion.div className={styles.feedCard} initial="hidden" animate="visible" variants={fadeUp} custom={5}>
            <div className={styles.feedHeader}>
              <h3>Relay Activity</h3>
              <span className={styles.liveDot} />
            </div>
            <div className={styles.feedList}>
              {relayFeed.map((event, i) => {
                const meta = event.metadata ? JSON.parse((event as any).metadata) : {};
                const Icon = TYPE_ICONS[event.type] || Activity;
                return (
                  <motion.div key={event.id || i} className={styles.feedItem} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className={styles.feedIcon} style={{ color: TYPE_COLORS[event.type] }}>
                      <Icon size={13} />
                    </div>
                    <div className={styles.feedInfo}>
                      <span className={styles.feedType}>{event.type.replace('_', ' ')}</span>
                      <span className={styles.feedRoute}>
                        {meta.sourceName || event.source} → {meta.destName || event.destination}
                      </span>
                    </div>
                    <div className={styles.feedMeta}>
                      <span>{event.dataSize?.toFixed(1)} MB</span>
                      <span>{event.latency?.toFixed(0)}ms</span>
                    </div>
                  </motion.div>
                );
              })}
              {relayFeed.length === 0 && (
                <div className={styles.feedEmpty}>Waiting for relay events...</div>
              )}
            </div>
          </motion.div>

          {/* Top Regions */}
          <motion.div className={styles.regionsCard} initial="hidden" animate="visible" variants={fadeUp} custom={6}>
            <h3>Top Relay Regions</h3>
            <div className={styles.regionsList}>
              {regions.slice(0, 6).map((region, i) => (
                <div key={region.code} className={styles.regionItem}>
                  <span className={styles.regionRank}>#{i + 1}</span>
                  <span className={styles.regionName}>{region.name}</span>
                  <span className={styles.regionCount}>{formatNum(region.relayCount)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
