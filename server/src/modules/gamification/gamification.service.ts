import { prisma } from '../../config/database';
import { emitToUser } from '../../config/socket';

// ─── Level Thresholds ───────────────────────────────────────────
const LEVEL_THRESHOLDS = [
  0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000,
  15000, 22000, 30000, 42000, 55000, 75000, 100000, 140000, 200000, 300000,
];

const LEVEL_TITLES = [
  'Relay Initiate',      // L1
  'Edge Contributor',    // L2
  'Node Operator',       // L3
  'Relay Runner',        // L4
  'Circuit Architect',   // L5
  'Mesh Builder',        // L6
  'Edge Commander',      // L7
  'Relay Strategist',    // L8
  'Network Sentinel',    // L9
  'Orbit Guardian',      // L10
  'Relay Overlord',      // L11
  'Edge Sovereign',      // L12
  'Infrastructure Titan',// L13
  'Neural Architect',    // L14
  'Quantum Relay',       // L15
  'Orbital Nexus',       // L16
  'Celestial Router',    // L17
  'Infinity Node',       // L18
  'Transcendent Relay',  // L19
  'OrbitLink Legend',     // L20
];

export class GamificationService {
  /**
   * Get or create a user's profile
   */
  static async getProfile(userId: string) {
    let profile = await prisma.userProfile.findUnique({ where: { userId } });

    if (!profile) {
      profile = await prisma.userProfile.create({
        data: { userId, xp: 0, level: 1, title: LEVEL_TITLES[0] },
      });
    }

    const nextLevelXp = LEVEL_THRESHOLDS[profile.level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] * 1.5;
    const prevLevelXp = LEVEL_THRESHOLDS[profile.level - 1] || 0;
    const progressPercent = Math.min(100, Math.round(((profile.xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100));

    // Get user stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        totalPoints: true,
        walletAddress: true,
        avatarUrl: true,
        referralCode: true,
        createdAt: true,
        _count: { select: { referralsMade: true, nodes: true, taskCompletions: true } },
      },
    });

    // Get achievement count
    const achievementCount = await prisma.userAchievement.count({ where: { userId } });

    return {
      ...profile,
      nextLevelXp,
      prevLevelXp,
      progressPercent,
      user,
      achievementCount,
    };
  }

  /**
   * Award XP to a user and handle level-ups
   */
  static async awardXP(userId: string, amount: number, source: string) {
    if (amount <= 0) return;

    let profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: { userId, xp: 0, level: 1, title: LEVEL_TITLES[0] },
      });
    }

    const newXp = profile.xp + amount;
    const newLevel = this.calculateLevel(newXp);
    const leveledUp = newLevel > profile.level;

    await prisma.userProfile.update({
      where: { userId },
      data: {
        xp: newXp,
        level: newLevel,
        title: LEVEL_TITLES[Math.min(newLevel - 1, LEVEL_TITLES.length - 1)],
      },
    });

    // Emit XP update
    emitToUser(userId, 'xp:update', { xp: newXp, level: newLevel, gained: amount, source });

    // Notify level up
    if (leveledUp) {
      const newTitle = LEVEL_TITLES[Math.min(newLevel - 1, LEVEL_TITLES.length - 1)];
      emitToUser(userId, 'level:up', {
        level: newLevel,
        title: newTitle,
        previousLevel: profile.level,
      });
    }

    return { xp: newXp, level: newLevel, leveledUp };
  }

  /**
   * Calculate level from total XP
   */
  static calculateLevel(xp: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
    }
    return 1;
  }

  /**
   * Update trust score for anti-sybil
   */
  static async updateTrustScore(userId: string) {
    const nodes = await prisma.node.findMany({ where: { userId } });
    if (nodes.length === 0) return;

    let score = 50; // Base

    // Uptime consistency bonus
    const totalUptime = nodes.reduce((acc, n) => acc + n.uptimeSeconds, 0);
    if (totalUptime > 86400) score += 10;   // 1 day
    if (totalUptime > 604800) score += 10;  // 1 week
    if (totalUptime > 2592000) score += 10; // 1 month

    // Connection quality average
    const avgQuality = nodes.reduce((acc, n) => acc + n.connectionQuality, 0) / nodes.length;
    if (avgQuality > 70) score += 10;
    if (avgQuality > 90) score += 5;

    // Referral activity bonus
    const referralCount = await prisma.referral.count({ where: { referrerId: userId } });
    if (referralCount > 0) score += 3;
    if (referralCount > 5) score += 2;

    // Cap at 100
    score = Math.min(100, Math.max(0, score));

    await prisma.userProfile.updateMany({
      where: { userId },
      data: { trustScore: score, reputationScore: score * totalUptime / 86400 },
    });

    return score;
  }

  /**
   * Set contribution mode
   */
  static async setContributionMode(userId: string, mode: string) {
    const validModes = ['PASSIVE', 'AI_ASSIST', 'EDGE_ROUTING', 'SMART'];
    if (!validModes.includes(mode)) {
      throw { statusCode: 400, message: `Invalid mode. Must be one of: ${validModes.join(', ')}` };
    }

    await prisma.userProfile.updateMany({
      where: { userId },
      data: { contributionMode: mode },
    });

    return { mode };
  }

  /**
   * Get leaderboard by level/XP
   */
  static async getLevelLeaderboard(limit = 50) {
    return prisma.userProfile.findMany({
      orderBy: [{ level: 'desc' }, { xp: 'desc' }],
      take: limit,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, totalPoints: true } },
      },
    });
  }
}
