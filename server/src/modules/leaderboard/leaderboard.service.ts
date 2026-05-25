import { prisma } from '../../config/database';

export class LeaderboardService {
  static async getGlobalLeaderboard(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        orderBy: { totalPoints: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          totalPoints: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    return {
      leaderboard: users.map((user, index) => ({
        rank: skip + index + 1,
        ...user,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getUserRank(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true },
    });

    if (!user) return null;

    const rank = await prisma.user.count({
      where: {
        isActive: true,
        totalPoints: { gt: user.totalPoints },
      },
    });

    return { rank: rank + 1, totalPoints: user.totalPoints };
  }
}
