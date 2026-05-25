import { prisma } from '../../config/database';
import { emitToNetwork } from '../../config/socket';

// ─── Geographic Data ────────────────────────────────────────────
const REGIONS = [
  { code: 'US', name: 'United States', lat: 39.8, lng: -98.5, weight: 18 },
  { code: 'DE', name: 'Germany', lat: 51.1, lng: 10.4, weight: 8 },
  { code: 'JP', name: 'Japan', lat: 36.2, lng: 138.2, weight: 7 },
  { code: 'GB', name: 'United Kingdom', lat: 55.3, lng: -3.4, weight: 6 },
  { code: 'SG', name: 'Singapore', lat: 1.3, lng: 103.8, weight: 6 },
  { code: 'IN', name: 'India', lat: 20.5, lng: 78.9, weight: 10 },
  { code: 'BR', name: 'Brazil', lat: -14.2, lng: -51.9, weight: 5 },
  { code: 'CA', name: 'Canada', lat: 56.1, lng: -106.3, weight: 4 },
  { code: 'AU', name: 'Australia', lat: -25.2, lng: 133.7, weight: 4 },
  { code: 'KR', name: 'South Korea', lat: 35.9, lng: 127.7, weight: 5 },
  { code: 'FR', name: 'France', lat: 46.2, lng: 2.2, weight: 4 },
  { code: 'NL', name: 'Netherlands', lat: 52.1, lng: 5.2, weight: 3 },
  { code: 'SE', name: 'Sweden', lat: 60.1, lng: 18.6, weight: 2 },
  { code: 'PL', name: 'Poland', lat: 51.9, lng: 19.1, weight: 3 },
  { code: 'AE', name: 'UAE', lat: 23.4, lng: 53.8, weight: 2 },
  { code: 'ID', name: 'Indonesia', lat: -0.7, lng: 113.9, weight: 3 },
  { code: 'NG', name: 'Nigeria', lat: 9.0, lng: 8.6, weight: 2 },
  { code: 'AR', name: 'Argentina', lat: -38.4, lng: -63.6, weight: 2 },
  { code: 'TR', name: 'Turkey', lat: 38.9, lng: 35.2, weight: 2 },
  { code: 'ZA', name: 'South Africa', lat: -30.5, lng: 22.9, weight: 1 },
  { code: 'MX', name: 'Mexico', lat: 23.6, lng: -102.5, weight: 2 },
  { code: 'TH', name: 'Thailand', lat: 15.8, lng: 100.9, weight: 2 },
  { code: 'VN', name: 'Vietnam', lat: 14.0, lng: 108.2, weight: 2 },
  { code: 'PH', name: 'Philippines', lat: 12.8, lng: 121.7, weight: 2 },
  { code: 'RO', name: 'Romania', lat: 45.9, lng: 24.9, weight: 1 },
  { code: 'CL', name: 'Chile', lat: -35.6, lng: -71.5, weight: 1 },
  { code: 'UA', name: 'Ukraine', lat: 48.3, lng: 31.1, weight: 2 },
  { code: 'EG', name: 'Egypt', lat: 26.8, lng: 30.8, weight: 1 },
  { code: 'FI', name: 'Finland', lat: 61.9, lng: 25.7, weight: 1 },
  { code: 'CH', name: 'Switzerland', lat: 46.8, lng: 8.2, weight: 2 },
];

const RELAY_TYPES = ['INFERENCE', 'INDEXING', 'ROUTING', 'EDGE_TRAFFIC', 'DATASET'] as const;
const TYPE_WEIGHTS = { INFERENCE: 30, INDEXING: 20, ROUTING: 25, EDGE_TRAFFIC: 15, DATASET: 10 };
const TYPE_DATA_RANGES = {
  INFERENCE: { min: 0.5, max: 12 },
  INDEXING: { min: 2, max: 50 },
  ROUTING: { min: 0.1, max: 5 },
  EDGE_TRAFFIC: { min: 0.05, max: 2 },
  DATASET: { min: 10, max: 200 },
};
const TYPE_LATENCY_RANGES = {
  INFERENCE: { min: 20, max: 400 },
  INDEXING: { min: 50, max: 800 },
  ROUTING: { min: 5, max: 80 },
  EDGE_TRAFFIC: { min: 2, max: 40 },
  DATASET: { min: 100, max: 2000 },
};

// ─── Helpers ────────────────────────────────────────────────────

function weightedRandom<T extends { weight?: number }>(items: T[], weightKey = 'weight'): T {
  const totalWeight = items.reduce((sum, item) => sum + ((item as any)[weightKey] || 1), 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= (item as any)[weightKey] || 1;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

function randomInRange(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pickRelayType(): typeof RELAY_TYPES[number] {
  const entries = Object.entries(TYPE_WEIGHTS).map(([type, weight]) => ({ type, weight }));
  return weightedRandom(entries).type as typeof RELAY_TYPES[number];
}

// ─── In-memory stats (refreshed periodically from DB) ───────────

let liveStats = {
  totalNodes: 0,
  onlineNodes: 0,
  totalRelays: 0,
  totalDataRouted: 0,
  countriesActive: 0,
  relaysPerMinute: 0,
  regionBreakdown: {} as Record<string, number>,
};

// ─── Relay Simulator ────────────────────────────────────────────

export class RelaySimulator {
  private intervalId: NodeJS.Timeout | null = null;
  private statsIntervalId: NodeJS.Timeout | null = null;
  private recentRelayCount = 0;

  /**
   * Start the relay simulation engine.
   * Generates realistic relay events at random intervals.
   */
  start() {
    console.log('[Relay] Simulation engine starting...');

    // Generate events every 2-6 seconds
    this.scheduleNextEvent();

    // Snapshot stats every 30 seconds
    this.statsIntervalId = setInterval(() => this.snapshotStats(), 30000);

    // Initial stats load
    this.refreshLiveStats();

    console.log('[Relay] Simulation engine running');
  }

  stop() {
    if (this.intervalId) clearTimeout(this.intervalId);
    if (this.statsIntervalId) clearInterval(this.statsIntervalId);
    console.log('[Relay] Simulation engine stopped');
  }

  private scheduleNextEvent() {
    // Variable interval: 1.5-5s with occasional bursts
    const isBurst = Math.random() < 0.15; // 15% chance of burst mode
    const delay = isBurst ? randomInRange(300, 800) : randomInRange(1500, 5000);

    this.intervalId = setTimeout(async () => {
      try {
        await this.generateEvent();
        if (isBurst) {
          // During bursts, fire 2-4 extra events rapidly
          const burstCount = Math.floor(Math.random() * 3) + 2;
          for (let i = 0; i < burstCount; i++) {
            await new Promise(r => setTimeout(r, randomInRange(100, 400)));
            await this.generateEvent();
          }
        }
      } catch (err) {
        console.error('[Relay] Event generation error:', err);
      }
      this.scheduleNextEvent();
    }, delay);
  }

  private async generateEvent() {
    const type = pickRelayType();
    const source = weightedRandom(REGIONS);
    let destination = weightedRandom(REGIONS);
    // Ensure destination differs from source
    while (destination.code === source.code) {
      destination = weightedRandom(REGIONS);
    }

    const dataRange = TYPE_DATA_RANGES[type];
    const latencyRange = TYPE_LATENCY_RANGES[type];

    const event = await prisma.relayEvent.create({
      data: {
        type,
        source: source.code,
        destination: destination.code,
        dataSize: randomInRange(dataRange.min, dataRange.max),
        latency: randomInRange(latencyRange.min, latencyRange.max),
        status: 'COMPLETED',
        metadata: JSON.stringify({
          sourceName: source.name,
          destName: destination.name,
          sourceLat: source.lat,
          sourceLng: source.lng,
          destLat: destination.lat,
          destLng: destination.lng,
        }),
      },
    });

    this.recentRelayCount++;

    // Update live stats in-memory
    liveStats.totalRelays++;
    liveStats.totalDataRouted += event.dataSize / 1024; // Convert MB to GB
    liveStats.regionBreakdown[source.code] = (liveStats.regionBreakdown[source.code] || 0) + 1;

    // Emit to connected clients
    emitToNetwork('relay:event', {
      id: event.id,
      type: event.type,
      source: source.code,
      sourceName: source.name,
      destination: destination.code,
      destName: destination.name,
      dataSize: event.dataSize,
      latency: event.latency,
      sourceLat: source.lat,
      sourceLng: source.lng,
      destLat: destination.lat,
      destLng: destination.lng,
      timestamp: event.createdAt,
    });

    // Emit updated counters
    emitToNetwork('relay:stats', {
      totalRelays: liveStats.totalRelays,
      totalDataRouted: Math.round(liveStats.totalDataRouted * 100) / 100,
      relaysPerMinute: liveStats.relaysPerMinute,
      onlineNodes: liveStats.onlineNodes,
      countriesActive: Object.keys(liveStats.regionBreakdown).length,
    });
  }

  private async snapshotStats() {
    await this.refreshLiveStats();

    // Calculate relays per minute
    liveStats.relaysPerMinute = this.recentRelayCount * 2; // 30s window * 2
    this.recentRelayCount = 0;

    // Persist snapshot
    try {
      await prisma.networkStats.create({
        data: {
          totalNodes: liveStats.totalNodes,
          onlineNodes: liveStats.onlineNodes,
          totalRelays: liveStats.totalRelays,
          totalDataRouted: liveStats.totalDataRouted,
          countriesActive: Object.keys(liveStats.regionBreakdown).length,
          snapshotData: JSON.stringify(liveStats.regionBreakdown),
        },
      });
    } catch (err) {
      console.error('[Relay] Stats snapshot error:', err);
    }
  }

  private async refreshLiveStats() {
    try {
      const [nodeCount, onlineCount, relayCount, dataSum] = await Promise.all([
        prisma.node.count(),
        prisma.node.count({ where: { status: 'ONLINE' } }),
        prisma.relayEvent.count(),
        prisma.relayEvent.aggregate({ _sum: { dataSize: true } }),
      ]);

      liveStats.totalNodes = nodeCount + Math.floor(Math.random() * 200) + 800; // Simulated padding
      liveStats.onlineNodes = onlineCount + Math.floor(Math.random() * 150) + 600;
      liveStats.totalRelays = relayCount;
      liveStats.totalDataRouted = (dataSum._sum.dataSize || 0) / 1024;
    } catch (err) {
      console.error('[Relay] Stats refresh error:', err);
    }
  }
}

// ─── Relay Service (API queries) ────────────────────────────────

export class RelayService {
  static getRegions() {
    return REGIONS;
  }

  static getLiveStats() {
    return {
      ...liveStats,
      countriesActive: Object.keys(liveStats.regionBreakdown).length,
    };
  }

  static async getRelayFeed(limit = 20) {
    return prisma.relayEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async getRelayStats() {
    const [total, byType, recentData] = await Promise.all([
      prisma.relayEvent.count(),
      prisma.relayEvent.groupBy({
        by: ['type'],
        _count: true,
        _sum: { dataSize: true },
      }),
      prisma.relayEvent.aggregate({
        _sum: { dataSize: true },
        _avg: { latency: true },
      }),
    ]);

    return {
      totalRelays: total,
      totalDataRoutedMB: Math.round((recentData._sum.dataSize || 0) * 100) / 100,
      avgLatencyMs: Math.round((recentData._avg.latency || 0) * 100) / 100,
      byType: byType.map(t => ({
        type: t.type,
        count: t._count,
        dataMB: Math.round((t._sum.dataSize || 0) * 100) / 100,
      })),
      liveCounters: liveStats,
    };
  }

  static async getRegionStats() {
    const events = await prisma.relayEvent.groupBy({
      by: ['source'],
      _count: true,
      _sum: { dataSize: true },
    });

    return events.map(e => {
      const region = REGIONS.find(r => r.code === e.source);
      return {
        code: e.source,
        name: region?.name || e.source,
        lat: region?.lat || 0,
        lng: region?.lng || 0,
        relayCount: e._count,
        dataMB: Math.round((e._sum.dataSize || 0) * 100) / 100,
      };
    }).sort((a, b) => b.relayCount - a.relayCount);
  }

  static async getHistoricalStats(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return prisma.networkStats.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
