import { prisma } from '../../config/database';

export class TaskService {
  static async getAllTasks(userId?: string) {
    const tasks = await prisma.task.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!userId) return tasks;

    // Get user's completions
    const completions = await prisma.taskCompletion.findMany({
      where: { userId },
      select: { taskId: true, status: true },
    });

    const completionMap = new Map(completions.map(c => [c.taskId, c.status]));

    return tasks.map(task => ({
      ...task,
      userStatus: completionMap.get(task.id) || 'NOT_STARTED',
    }));
  }

  static async completeTask(userId: string, taskId: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || !task.isActive) throw { statusCode: 404, message: 'Task not found' };

    const existing = await prisma.taskCompletion.findUnique({
      where: { userId_taskId: { userId, taskId } },
    });
    if (existing) throw { statusCode: 409, message: 'Task already completed' };

    // Fetch user with relations needed for validation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        nodes: { where: { type: 'EXTENSION' } },
        referralsMade: true,
      }
    });
    if (!user) throw { statusCode: 404, message: 'User not found' };

    // Validation Logic based on task title
    if (task.title === 'Connect Wallet') {
      if (!user.walletAddress) {
        throw { statusCode: 400, message: 'You have not connected a wallet yet. Please connect your Web3 wallet in Settings or the Wallet page to complete this task.' };
      }
    } else if (task.title === 'Install Extension') {
      if (user.nodes.length === 0) {
        throw { statusCode: 400, message: 'You have not installed the extension or connected a node yet.' };
      }
    } else if (task.title.startsWith('Invite ')) {
      const match = task.title.match(/Invite (\d+) Friend/);
      if (match) {
        const requiredCount = parseInt(match[1], 10);
        if (user.referralsMade.length < requiredCount) {
          throw { statusCode: 400, message: `You need ${requiredCount} referrals to complete this task. You currently have ${user.referralsMade.length}.` };
        }
      }
    }

    const completion = await prisma.taskCompletion.create({
      data: { userId, taskId, status: 'VERIFIED' },
    });

    // Award points
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { totalPoints: { increment: task.rewardPoints } },
      }),
      prisma.pointsTransaction.create({
        data: {
          userId,
          amount: task.rewardPoints,
          type: 'TASK',
          source: `Task: ${task.title}`,
        },
      }),
    ]);

    return { completion, pointsEarned: task.rewardPoints };
  }

  static async createTask(data: {
    title: string; description: string; type: string; rewardPoints: number; url?: string; icon?: string;
  }) {
    return prisma.task.create({ data });
  }

  static async updateTask(id: string, data: Partial<{
    title: string; description: string; type: string; rewardPoints: number; url: string; icon: string; isActive: boolean;
  }>) {
    return prisma.task.update({ where: { id }, data });
  }

  static async deleteTask(id: string) {
    return prisma.task.update({ where: { id }, data: { isActive: false } });
  }
}
