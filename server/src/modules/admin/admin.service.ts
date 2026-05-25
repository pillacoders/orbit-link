import { prisma } from '../../config/database';

export class AdminService {
  static async getDashboardStats() {
    const [totalUsers, activeUsers, totalNodes, onlineNodes, totalPoints, totalTasks, activeEpoch] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.node.count(),
      prisma.node.count({ where: { status: 'ONLINE' } }),
      prisma.user.aggregate({ _sum: { totalPoints: true } }),
      prisma.task.count({ where: { isActive: true } }),
      prisma.epoch.findFirst({ where: { status: 'ACTIVE' } }),
    ]);

    // Points distributed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayPoints = await prisma.pointsTransaction.aggregate({
      where: { createdAt: { gte: today }, amount: { gt: 0 } },
      _sum: { amount: true },
    });

    // New users today
    const newUsersToday = await prisma.user.count({
      where: { createdAt: { gte: today } },
    });

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
      totalNodes,
      onlineNodes,
      totalPointsDistributed: totalPoints._sum.totalPoints || 0,
      todayPointsDistributed: todayPoints._sum.amount || 0,
      activeTasks: totalTasks,
      activeEpoch: activeEpoch?.name || null,
    };
  }

  static async getAllUsers(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit;
    const where = search ? {
      OR: [
        { username: { contains: search } },
        { email: { contains: search } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, email: true, username: true, role: true, totalPoints: true,
          isActive: true, createdAt: true, walletAddress: true, referralCode: true,
          _count: { select: { nodes: true, referralsMade: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async toggleUserStatus(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw { statusCode: 404, message: 'User not found' };
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });
  }

  static async getAnnouncements() {
    return prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
  }

  static async createAnnouncement(data: { title: string; content: string; type: string }) {
    return prisma.announcement.create({ data });
  }

  static async deleteAnnouncement(id: string) {
    return prisma.announcement.delete({ where: { id } });
  }
}
