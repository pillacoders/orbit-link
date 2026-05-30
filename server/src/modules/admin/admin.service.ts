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

  static async getPendingCompletions() {
    return prisma.taskCompletion.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: { id: true, username: true, email: true, walletAddress: true }
        },
        task: {
          select: { id: true, title: true, type: true, rewardPoints: true }
        }
      },
      orderBy: { completedAt: 'asc' }
    });
  }

  static async approveCompletion(completionId: string) {
    const completion = await prisma.taskCompletion.findUnique({
      where: { id: completionId },
      include: { task: true, user: true }
    });
    if (!completion) throw { statusCode: 404, message: 'Task completion not found' };
    if (completion.status === 'VERIFIED') throw { statusCode: 400, message: 'Task already approved' };

    // Update status to VERIFIED
    const updatedCompletion = await prisma.taskCompletion.update({
      where: { id: completionId },
      data: { status: 'VERIFIED' }
    });

    // Parse metadata to extract Twitter username
    let twitterUsername = '';
    if (completion.metadata) {
      try {
        const meta = JSON.parse(completion.metadata);
        twitterUsername = meta.twitterUsername || '';
      } catch (e) {
        console.error('Error parsing task completion metadata', e);
      }
    }

    // Award points
    await prisma.$transaction([
      prisma.user.update({
        where: { id: completion.userId },
        data: { totalPoints: { increment: completion.task.rewardPoints } }
      }),
      prisma.pointsTransaction.create({
        data: {
          userId: completion.userId,
          amount: completion.task.rewardPoints,
          type: 'TASK',
          source: `Task: ${completion.task.title}`,
          metadata: JSON.stringify({ 
            twitterUsername,
            completionId 
          })
        }
      })
    ]);

    // Check and trigger achievements / gamification
    try {
      const { AchievementService } = require('../gamification/achievement.service');
      await AchievementService.checkAchievements(completion.userId, 'task', { taskTitle: completion.task.title });
    } catch (achError) {
      console.error('Error triggering task achievement:', achError);
    }

    return updatedCompletion;
  }

  static async rejectCompletion(completionId: string) {
    const completion = await prisma.taskCompletion.findUnique({
      where: { id: completionId }
    });
    if (!completion) throw { statusCode: 404, message: 'Task completion not found' };
    if (completion.status === 'VERIFIED') throw { statusCode: 400, message: 'Cannot reject an already verified task' };

    return prisma.taskCompletion.update({
      where: { id: completionId },
      data: { status: 'REJECTED' }
    });
  }
}
