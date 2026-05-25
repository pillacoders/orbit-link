import { prisma } from '../../config/database';
import { emitToUser } from '../../config/socket';
import { GamificationService } from './gamification.service';

export class AchievementService {
  /**
   * Check and unlock achievements for a user after an event
   */
  static async checkAchievements(userId: string, eventType: string, eventData?: any) {
    const achievements = await prisma.achievement.findMany();
    const unlocked = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });

    const unlockedIds = new Set(unlocked.map(u => u.achievementId));
    const newUnlocks: string[] = [];

    for (const ach of achievements) {
      if (unlockedIds.has(ach.id)) continue;

      const shouldUnlock = await this.evaluateAchievement(userId, ach.key, eventType, eventData);
      if (shouldUnlock) {
        await prisma.userAchievement.create({
          data: { userId, achievementId: ach.id },
        });

        // Award XP for achievement
        if (ach.xpReward > 0) {
          await GamificationService.awardXP(userId, ach.xpReward, `Achievement: ${ach.title}`);
        }

        newUnlocks.push(ach.id);

        // Emit achievement notification
        emitToUser(userId, 'achievement:unlocked', {
          id: ach.id,
          title: ach.title,
          description: ach.description,
          icon: ach.icon,
          rarity: ach.rarity,
          xpReward: ach.xpReward,
        });
      }
    }

    return newUnlocks;
  }

  /**
   * Evaluate whether a specific achievement should be unlocked
   */
  private static async evaluateAchievement(
    userId: string,
    achievementKey: string,
    eventType: string,
    eventData?: any
  ): Promise<boolean> {
    switch (achievementKey) {
      // ─── Contribution Achievements ─────────────────────
      case 'first_heartbeat': {
        if (eventType !== 'heartbeat') return false;
        const count = await prisma.pointsTransaction.count({ where: { userId, type: 'EARNING' } });
        return count <= 1;
      }
      case 'relay_100': {
        const count = await prisma.pointsTransaction.count({ where: { userId, type: 'EARNING' } });
        return count >= 100;
      }
      case 'relay_1000': {
        const count = await prisma.pointsTransaction.count({ where: { userId, type: 'EARNING' } });
        return count >= 1000;
      }
      case 'relay_10000': {
        const count = await prisma.pointsTransaction.count({ where: { userId, type: 'EARNING' } });
        return count >= 10000;
      }
      case 'uptime_24h': {
        const nodes = await prisma.node.findMany({ where: { userId } });
        const totalUptime = nodes.reduce((acc, n) => acc + n.uptimeSeconds, 0);
        return totalUptime >= 86400;
      }
      case 'uptime_7d': {
        const nodes = await prisma.node.findMany({ where: { userId } });
        const totalUptime = nodes.reduce((acc, n) => acc + n.uptimeSeconds, 0);
        return totalUptime >= 604800;
      }
      case 'uptime_30d': {
        const nodes = await prisma.node.findMany({ where: { userId } });
        const totalUptime = nodes.reduce((acc, n) => acc + n.uptimeSeconds, 0);
        return totalUptime >= 2592000;
      }
      case 'quality_90': {
        const nodes = await prisma.node.findMany({ where: { userId } });
        if (nodes.length === 0) return false;
        const avg = nodes.reduce((acc, n) => acc + n.connectionQuality, 0) / nodes.length;
        return avg >= 90;
      }

      // ─── Social Achievements ───────────────────────────
      case 'first_referral': {
        if (eventType !== 'referral' && eventType !== 'task') return false;
        const count = await prisma.referral.count({ where: { referrerId: userId } });
        return count >= 1;
      }
      case 'referral_5': {
        const count = await prisma.referral.count({ where: { referrerId: userId } });
        return count >= 5;
      }
      case 'referral_25': {
        const count = await prisma.referral.count({ where: { referrerId: userId } });
        return count >= 25;
      }
      case 'referral_100': {
        const count = await prisma.referral.count({ where: { referrerId: userId } });
        return count >= 100;
      }
      case 'wallet_connected': {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { walletAddress: true } });
        return !!user?.walletAddress;
      }

      // ─── Streak Achievements ───────────────────────────
      case 'streak_3': {
        if (eventType !== 'bonus') return false;
        const bonus = await prisma.dailyBonus.findFirst({ where: { userId }, orderBy: { lastClaimed: 'desc' } });
        return (bonus?.streakCount || 0) >= 3;
      }
      case 'streak_7': {
        if (eventType !== 'bonus') return false;
        const bonus = await prisma.dailyBonus.findFirst({ where: { userId }, orderBy: { lastClaimed: 'desc' } });
        return (bonus?.streakCount || 0) >= 7;
      }
      case 'streak_30': {
        if (eventType !== 'bonus') return false;
        const bonus = await prisma.dailyBonus.findFirst({ where: { userId }, orderBy: { lastClaimed: 'desc' } });
        return (bonus?.streakCount || 0) >= 30;
      }

      // ─── Points Achievements ───────────────────────────
      case 'points_1000': {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true } });
        return (user?.totalPoints || 0) >= 1000;
      }
      case 'points_10000': {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true } });
        return (user?.totalPoints || 0) >= 10000;
      }
      case 'points_100000': {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true } });
        return (user?.totalPoints || 0) >= 100000;
      }

      // ─── Hidden ────────────────────────────────────────
      case 'genesis_node': {
        // First 1000 users
        const userCount = await prisma.user.count();
        return userCount <= 1000;
      }
      case 'night_owl': {
        // Activity between 2-5 AM
        const hour = new Date().getHours();
        return eventType === 'heartbeat' && hour >= 2 && hour <= 5;
      }

      default:
        return false;
    }
  }

  /**
   * Get all achievements (hide hidden ones that aren't unlocked)
   */
  static async getAllAchievements(userId?: string) {
    const achievements = await prisma.achievement.findMany({
      orderBy: [{ category: 'asc' }, { xpReward: 'asc' }],
    });

    if (!userId) return achievements;

    const unlocked = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, unlockedAt: true },
    });

    const unlockedMap = new Map(unlocked.map(u => [u.achievementId, u.unlockedAt]));

    return achievements.map(ach => ({
      ...ach,
      unlocked: unlockedMap.has(ach.id),
      unlockedAt: unlockedMap.get(ach.id) || null,
      // Mask hidden achievements that aren't unlocked
      title: ach.isHidden && !unlockedMap.has(ach.id) ? '???' : ach.title,
      description: ach.isHidden && !unlockedMap.has(ach.id) ? 'Hidden achievement. Keep contributing to unlock.' : ach.description,
    }));
  }

  /**
   * Get user's unlocked achievements
   */
  static async getUserAchievements(userId: string) {
    return prisma.userAchievement.findMany({
      where: { userId },
      include: { user: false },
      orderBy: { unlockedAt: 'desc' },
    });
  }
}
