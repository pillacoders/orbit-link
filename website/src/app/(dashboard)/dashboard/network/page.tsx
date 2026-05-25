'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Globe2, Wifi, Activity, Database, Cpu, Radio, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import styles from './network.module.css';

// Dynamic import to avoid SSR issues with Three.js
const GlobeComponent = dynamic(() => import('react-globe.gl'), { ssr: false });

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
  const globeRef = useRef<any>(null);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [regions, setRegions] = useState<RegionStat[]>([]);
  const [relayFeed, setRelayFeed] = useState<RelayEvent[]>([]);
  const [arcs, setArcs] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [globeMaterial, setGlobeMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch country outlines and load Three.js material on client side
  useEffect(() => {
    fetch('https://unpkg.com/three-globe/example/country-polygons.geojson')
      .then(res => res.json())
      .then(data => {
        setCountries(data.features || []);
      })
      .catch(err => {
        console.error('Failed to fetch country polygons:', err);
      });

    import('three').then(THREE => {
      setGlobeMaterial(new THREE.MeshPhongMaterial({
        color: '#07070a',
        transparent: true,
        opacity: 0.95
      }));
    });
  }, []);

  // Load initial data
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Configure globe on mount
  useEffect(() => {
    if (globeRef.current) {
      const globe = globeRef.current;
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.4;
      globe.controls().enableZoom = true;
      globe.pointOfView({ lat: 20, lng: 10, altitude: 2.2 });
    }
  }, [loading]);

  const loadData = async () => {
    try {
      const [geoRes, feedRes] = await Promise.all([
        api.getRelayGeo().catch(() => ({ data: { regions: [], stats: [], liveCounters: {} } })),
        api.getRelayFeed(15).catch(() => ({ data: [] })),
      ]);

      const geoData = geoRes.data;
      setLiveStats(geoData.liveCounters);

      // Build globe points from region stats
      const regionStats: RegionStat[] = geoData.stats || [];
      setRegions(regionStats);

      const globePoints = (geoData.regions || []).map((r: any) => {
        const stat = regionStats.find((s: RegionStat) => s.code === r.code);
        return {
          lat: r.lat,
          lng: r.lng,
          name: r.name,
          code: r.code,
          size: Math.min(0.4, 0.08 + (stat?.relayCount || 0) * 0.002),
          color: stat ? '#34d399' : 'rgba(255,255,255,0.15)',
          relayCount: stat?.relayCount || 0,
        };
      });
      setPoints(globePoints);

      // Build arcs from feed
      const feedData = feedRes.data || [];
      setRelayFeed(feedData.slice(0, 8));

      const newArcs = feedData.slice(0, 12).map((e: any) => {
        const meta = e.metadata ? JSON.parse(e.metadata) : {};
        return {
          startLat: meta.sourceLat || 0,
          startLng: meta.sourceLng || 0,
          endLat: meta.destLat || 0,
          endLng: meta.destLng || 0,
          color: TYPE_COLORS[e.type] || '#4f7df7',
          type: e.type,
        };
      });
      setArcs(newArcs);
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
        {/* Globe */}
        <motion.div className={styles.globeContainer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}>
          <GlobeComponent
            ref={globeRef}
            backgroundColor="rgba(0,0,0,0)"
            showGlobe={true}
            globeMaterial={globeMaterial || undefined}
            showAtmosphere={true}
            atmosphereColor="#4f7df7"
            atmosphereAltitude={0.15}
            // Country outlines
            polygonsData={countries}
            polygonCapColor={() => 'rgba(79, 125, 247, 0.015)'}
            polygonSideColor={() => 'rgba(0, 0, 0, 0)'}
            polygonStrokeColor={() => 'rgba(255, 255, 255, 0.08)'}
            polygonAltitude={0.005}
            polygonLabel={({ properties: d }: any) => `<div style="font-family:Inter,sans-serif;background:rgba(10,10,10,0.9);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;font-size:11px;color:#e0e0e0"><strong>${d.ADMIN}</strong></div>`}
            // Points (nodes)
            pointsData={points}
            pointLat="lat"
            pointLng="lng"
            pointAltitude={0.01}
            pointRadius="size"
            pointColor="color"
            pointLabel={(d: any) => `<div style="font-family:Inter,sans-serif;background:rgba(10,10,10,0.9);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;font-size:12px;color:#e0e0e0"><strong>${d.name}</strong><br/>${d.relayCount} relays</div>`}
            // Arcs (relay traffic)
            arcsData={arcs}
            arcStartLat="startLat"
            arcStartLng="startLng"
            arcEndLat="endLat"
            arcEndLng="endLng"
            arcColor="color"
            arcDashLength={0.4}
            arcDashGap={0.2}
            arcDashAnimateTime={1500}
            arcStroke={0.5}
            arcAltitudeAutoScale={0.3}
            width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 340, 700) : 600}
            height={typeof window !== 'undefined' ? Math.min(window.innerHeight - 200, 550) : 450}
          />
          <div className={styles.globeOverlay}>
            <span className={styles.globePulse} />
            <span className={styles.globeLabel}>LIVE RELAY NETWORK</span>
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
