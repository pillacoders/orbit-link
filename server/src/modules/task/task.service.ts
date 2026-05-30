import { prisma } from '../../config/database';
import { DiscordService } from '../../services/discord.service';

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

  static async completeTask(userId: string, taskId: string, telegramUsername?: string, twitterUsername?: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || !task.isActive) throw { statusCode: 404, message: 'Task not found' };

    const existing = await prisma.taskCompletion.findUnique({
      where: { userId_taskId: { userId, taskId } },
    });
    
    if (existing) {
      if (existing.status === 'VERIFIED') {
        throw { statusCode: 409, message: 'Task already completed' };
      }
      if (existing.status === 'PENDING') {
        throw { statusCode: 400, message: 'Verification is pending. Please wait for admin review.' };
      }
      // If status is REJECTED, we will allow resubmission/updating it
    }

    // Fetch user with relations needed for validation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        nodes: { where: { type: 'EXTENSION' } },
        referralsMade: true,
      }
    });
    if (!user) throw { statusCode: 404, message: 'User not found' };

    // Validation Logic based on task type / title
    if (task.type === 'TWITTER') {
      if (!twitterUsername) {
        throw { statusCode: 400, message: 'Please enter your Twitter username for verification.' };
      }
      
      const normalizedUsername = twitterUsername.toLowerCase().trim().replace(/^@/, '');
      if (!normalizedUsername) {
        throw { statusCode: 400, message: 'Invalid Twitter username provided.' };
      }

      let completion;
      if (existing && existing.status === 'REJECTED') {
        completion = await prisma.taskCompletion.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            metadata: JSON.stringify({ twitterUsername: normalizedUsername }),
            completedAt: new Date()
          }
        });
      } else {
        completion = await prisma.taskCompletion.create({
          data: {
            userId,
            taskId,
            status: 'PENDING',
            metadata: JSON.stringify({ twitterUsername: normalizedUsername })
          }
        });
      }

      return { completion, pointsEarned: 0, status: 'PENDING' };
    } else if (task.type === 'TELEGRAM') {
      if (!telegramUsername) {
        throw { statusCode: 400, message: 'Please enter your Telegram username for verification.' };
      }
      
      const normalizedUsername = telegramUsername.toLowerCase().trim().replace(/^@/, '');
      if (!normalizedUsername) {
        throw { statusCode: 400, message: 'Invalid Telegram username provided.' };
      }

      // Check if we have a recorded join request for this username
      const joinRequest = await prisma.telegramJoinRequest.findUnique({
        where: { telegramUsername: normalizedUsername },
      });

      if (!joinRequest) {
        throw { 
          statusCode: 400, 
          message: `Could not verify a join request for Telegram username @${normalizedUsername}. Please click the link to request to join, wait for admin approval/request pending state, and try verifying again.` 
        };
      }
    } else if (task.title === 'Connect Wallet') {
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

    let completion;
    if (existing && existing.status === 'REJECTED') {
      completion = await prisma.taskCompletion.update({
        where: { id: existing.id },
        data: { status: 'VERIFIED', completedAt: new Date() },
      });
    } else {
      completion = await prisma.taskCompletion.create({
        data: { userId, taskId, status: 'VERIFIED' },
      });
    }

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

  static async verifyDiscordTask(userId: string, code: string) {
    if (!code) throw { statusCode: 400, message: 'Authorization code is required' };

    // Find the task of type DISCORD
    const discordTask = await prisma.task.findFirst({
      where: { type: 'DISCORD', isActive: true },
    });

    if (!discordTask) throw { statusCode: 404, message: 'Discord join task not found or inactive' };

    // Check if user has already completed it
    const existing = await prisma.taskCompletion.findUnique({
      where: { userId_taskId: { userId, taskId: discordTask.id } },
    });
    if (existing) throw { statusCode: 409, message: 'Discord task already completed' };

    // Verify guild membership via DiscordService
    const discordInfo = await DiscordService.verifyGuildMembership(code);

    // Save completion
    const completion = await prisma.taskCompletion.create({
      data: {
        userId,
        taskId: discordTask.id,
        status: 'VERIFIED',
      },
    });

    // Award points
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { totalPoints: { increment: discordTask.rewardPoints } },
      }),
      prisma.pointsTransaction.create({
        data: {
          userId,
          amount: discordTask.rewardPoints,
          type: 'TASK',
          source: `Task: ${discordTask.title}`,
          metadata: JSON.stringify({ discordUsername: discordInfo.discordUsername, discordId: discordInfo.discordId }),
        },
      }),
    ]);

    return { completion, pointsEarned: discordTask.rewardPoints };
  }

  static async deleteTask(id: string) {
    return prisma.task.update({ where: { id }, data: { isActive: false } });
  }
}
