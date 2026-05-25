import { prisma } from '../../config/database';
import { emitToUser } from '../../config/socket';
import { GamificationService } from '../gamification/gamification.service';
import { AchievementService } from '../gamification/achievement.service';

// Points calculation weights
const WEIGHTS = {
  UPTIME_PER_MINUTE: 0.5,        // Points per minute of uptime
  CONNECTION_QUALITY_BONUS: 0.3,  // Multiplier for connection quality (0-100)
  ACTIVITY_BONUS: 0.2,           // Bonus for active browsing
  REFERRAL_TIERS: [10, 5, 2],    // % of earnings given to referrers (Tier 1, 2, 3)
  DAILY_BONUS_BASE: 10,          // Base daily bonus
  STREAK_MULTIPLIER: 0.5,        // Additional per streak day
  MAX_STREAK_BONUS: 50,          // Max streak bonus
};

export class PointsEngine {
  /**
   * Calculate and award points for a node heartbeat
   */
  static async processHeartbeat(nodeId: string, userId: string, data: {
    connectionQuality: number;
    isActive: boolean;
    uptimeDelta: number; // seconds since last heartbeat
  }) {
    const { connectionQuality, isActive, uptimeDelta } = data;
    const minutes = uptimeDelta / 60;

    // Base uptime points
    let points = minutes * WEIGHTS.UPTIME_PER_MINUTE;

    // Connection quality multiplier (0-100 normalized to 0-1)
    const qualityMultiplier = 1 + (connectionQuality / 100) * WEIGHTS.CONNECTION_QUALITY_BONUS;
    points *= qualityMultiplier;

    // Activity bonus
    if (isActive) {
      points *= (1 + WEIGHTS.ACTIVITY_BONUS);
    }

    // Check for active epoch multiplier
    const activeEpoch = await prisma.epoch.findFirst({
      where: { status: 'ACTIVE' },
    });
    if (activeEpoch) {
      points *= activeEpoch.multiplier;
    }

    // Round to 2 decimal places
    points = Math.round(points * 100) / 100;

    if (points <= 0) return 0;

    // Award points
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { totalPoints: { increment: points } },
      }),
      prisma.pointsTransaction.create({
        data: {
          userId,
          amount: points,
          type: 'EARNING',
          source: 'Node contribution',
          metadata: JSON.stringify({ nodeId, connectionQuality, isActive, uptimeDelta }),
        },
      }),
      prisma.node.update({
        where: { id: nodeId },
        data: {
          uptimeSeconds: { increment: uptimeDelta },
          lastHeartbeat: new Date(),
          connectionQuality,
          status: 'ONLINE',
        },
      }),
    ]);

    // Award referral bonus to referrer
    await this.processReferralEarning(userId, points);

    // Epoch participation
    if (activeEpoch) {
      await this.updateEpochParticipation(userId, activeEpoch.id, points);
    }

    // Emit realtime update
    emitToUser(userId, 'points:update', { points, total: points });

    // Award XP and check achievements (fire-and-forget)
    GamificationService.awardXP(userId, Math.round(points * 0.5), 'Relay contribution').catch(() => {});
    AchievementService.checkAchievements(userId, 'heartbeat', { points, connectionQuality }).catch(() => {});

    return points;
  }

  static async processReferralEarning(userId: string, earnedPoints: number) {
    let currentUserId = userId;
    let currentTier = 0;

    while (currentTier < WEIGHTS.REFERRAL_TIERS.length) {
      const user = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { referredById: true },
      });

      if (!user?.referredById) break;

      const tierPercentage = WEIGHTS.REFERRAL_TIERS[currentTier];
      const referralBonus = Math.round((earnedPoints * tierPercentage / 100) * 100) / 100;

      if (referralBonus > 0) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.referredById },
            data: { totalPoints: { increment: referralBonus } },
          }),
          prisma.pointsTransaction.create({
            data: {
              userId: user.referredById,
              amount: referralBonus,
              type: 'REFERRAL',
              source: `Tier ${currentTier + 1} referral earning from user ${userId}`,
            },
          }),
        ]);

        // Update referral record only for direct referrals (Tier 1)
        if (currentTier === 0) {
          await prisma.referral.updateMany({
            where: { referrerId: user.referredById, refereeId: userId },
            data: { pointsEarned: { increment: referralBonus } },
          });
        }

        emitToUser(user.referredById, 'points:referral', { bonus: referralBonus, fromUser: userId, tier: currentTier + 1 });
      }

      // Move up the chain
      currentUserId = user.referredById;
      currentTier++;
    }
  }

  /**
   * Claim daily bonus
   */
  static async claimDailyBonus(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already claimed today
    const existing = await prisma.dailyBonus.findFirst({
      where: {
        userId,
        lastClaimed: { gte: today },
      },
    });

    if (existing) {
      throw { statusCode: 409, message: 'Daily bonus already claimed today' };
    }

    // Get last bonus for streak calculation
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastBonus = await prisma.dailyBonus.findFirst({
      where: { userId },
      orderBy: { lastClaimed: 'desc' },
    });

    let streakCount = 1;
    if (lastBonus && lastBonus.lastClaimed >= yesterday) {
      streakCount = lastBonus.streakCount + 1;
    }

    // Calculate bonus points
    const streakBonus = Math.min(streakCount * WEIGHTS.STREAK_MULTIPLIER, WEIGHTS.MAX_STREAK_BONUS);
    const points = WEIGHTS.DAILY_BONUS_BASE + streakBonus;

    await prisma.$transaction([
      prisma.dailyBonus.create({
        data: {
          userId,
          streakCount,
          lastClaimed: new Date(),
          pointsEarned: points,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { totalPoints: { increment: points } },
      }),
      prisma.pointsTransaction.create({
        data: {
          userId,
          amount: points,
          type: 'BONUS',
          source: `Daily bonus (streak: ${streakCount})`,
        },
      }),
    ]);

    emitToUser(userId, 'bonus:claimed', { points, streakCount });

    return { points, streakCount };
  }

  /**
   * Get daily bonus status for a user
   */
  static async getDailyBonusStatus(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.dailyBonus.findFirst({
      where: {
        userId,
        lastClaimed: { gte: today },
      },
    });

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get streak info
    const lastBonus = await prisma.dailyBonus.findFirst({
      where: { userId },
      orderBy: { lastClaimed: 'desc' },
    });

    return {
      claimed: !!existing,
      claimedAt: existing?.lastClaimed || null,
      nextClaimAt: existing ? tomorrow.toISOString() : null,
      streakCount: lastBonus?.streakCount || 0,
      lastPointsEarned: existing?.pointsEarned || lastBonus?.pointsEarned || 0,
    };
  }

  /**
   * Update epoch participation
   */
  private static async updateEpochParticipation(userId: string, epochId: string, points: number) {
    await prisma.epochParticipation.upsert({
      where: { userId_epochId: { userId, epochId } },
      update: { pointsEarned: { increment: points } },
      create: { userId, epochId, pointsEarned: points },
    });
  }
}
