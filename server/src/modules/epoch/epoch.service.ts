import { prisma } from '../../config/database';

export class EpochService {
  static async getActiveEpoch() {
    return prisma.epoch.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        _count: { select: { participations: true } },
      },
    });
  }

  static async getAllEpochs() {
    return prisma.epoch.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: { select: { participations: true } },
      },
    });
  }

  static async getUserEpochStats(userId: string, epochId: string) {
    const participation = await prisma.epochParticipation.findUnique({
      where: { userId_epochId: { userId, epochId } },
    });

    // Calculate rank
    if (participation) {
      const rank = await prisma.epochParticipation.count({
        where: {
          epochId,
          pointsEarned: { gt: participation.pointsEarned },
        },
      });
      return { ...participation, rank: rank + 1 };
    }

    return { pointsEarned: 0, rank: null };
  }

  static async getEpochLeaderboard(epochId: string, limit = 50) {
    return prisma.epochParticipation.findMany({
      where: { epochId },
      orderBy: { pointsEarned: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
  }

  // Admin
  static async createEpoch(data: {
    name: string; description?: string; startDate: Date; endDate: Date;
    totalPointsPool: number; multiplier: number;
  }) {
    return prisma.epoch.create({ data: { ...data, status: 'UPCOMING' } });
  }

  static async startEpoch(id: string) {
    // End any active epoch first
    await prisma.epoch.updateMany({
      where: { status: 'ACTIVE' },
      data: { status: 'ENDED' },
    });
    return prisma.epoch.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  static async endEpoch(id: string) {
    return prisma.epoch.update({ where: { id }, data: { status: 'ENDED' } });
  }
}
