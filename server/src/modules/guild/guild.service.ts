import { prisma } from '../../config/database';

export class GuildService {
  static async createGuild(leaderId: string, data: { name: string; tag: string; description?: string; isPublic?: boolean }) {
    // Check if user already in a guild
    const existing = await prisma.guildMember.findFirst({ where: { userId: leaderId } });
    if (existing) {
      throw { statusCode: 400, message: 'You are already a member of a guild. Leave your current guild first.' };
    }

    // Validate tag length
    if (data.tag.length < 2 || data.tag.length > 5) {
      throw { statusCode: 400, message: 'Guild tag must be 2-5 characters.' };
    }

    const guild = await prisma.guild.create({
      data: {
        name: data.name,
        tag: data.tag.toUpperCase(),
        description: data.description || '',
        leaderId,
        isPublic: data.isPublic ?? true,
        members: {
          create: { userId: leaderId, role: 'LEADER' },
        },
      },
      include: { members: true, _count: { select: { members: true } } },
    });

    return guild;
  }

  static async joinGuild(userId: string, guildId: string) {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: { _count: { select: { members: true } } },
    });

    if (!guild) throw { statusCode: 404, message: 'Guild not found.' };
    if (!guild.isPublic) throw { statusCode: 403, message: 'This guild is private. You need an invite.' };
    if (guild._count.members >= guild.maxMembers) {
      throw { statusCode: 400, message: 'Guild is full.' };
    }

    // Check if already in a guild
    const existing = await prisma.guildMember.findFirst({ where: { userId } });
    if (existing) {
      throw { statusCode: 400, message: 'You are already in a guild. Leave your current guild first.' };
    }

    await prisma.guildMember.create({
      data: { guildId, userId, role: 'MEMBER' },
    });

    return { message: 'Joined guild successfully.' };
  }

  static async leaveGuild(userId: string, guildId: string) {
    const membership = await prisma.guildMember.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });

    if (!membership) throw { statusCode: 404, message: 'You are not a member of this guild.' };
    if (membership.role === 'LEADER') {
      throw { statusCode: 400, message: 'Leaders cannot leave. Transfer leadership first or disband the guild.' };
    }

    await prisma.guildMember.delete({
      where: { guildId_userId: { guildId, userId } },
    });

    return { message: 'Left guild successfully.' };
  }

  static async getGuild(guildId: string) {
    return prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatarUrl: true, totalPoints: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { members: true } },
      },
    });
  }

  static async listGuilds(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [guilds, total] = await Promise.all([
      prisma.guild.findMany({
        where: { isPublic: true },
        orderBy: [{ xp: 'desc' }, { level: 'desc' }],
        take: limit,
        skip,
        include: { _count: { select: { members: true } } },
      }),
      prisma.guild.count({ where: { isPublic: true } }),
    ]);

    return { guilds, total, page, pages: Math.ceil(total / limit) };
  }

  static async getLeaderboard(limit = 20) {
    return prisma.guild.findMany({
      orderBy: [{ xp: 'desc' }, { level: 'desc' }],
      take: limit,
      include: { _count: { select: { members: true } } },
    });
  }

  /**
   * Update guild XP based on member contributions.
   * Called periodically or after member earning events.
   */
  static async syncGuildXP(guildId: string) {
    const members = await prisma.guildMember.findMany({
      where: { guildId },
      include: { user: { select: { totalPoints: true } } },
    });

    const totalXP = Math.round(members.reduce((acc, m) => acc + (m.user.totalPoints || 0), 0));
    const level = Math.floor(Math.log2(totalXP / 1000 + 1)) + 1;

    await prisma.guild.update({
      where: { id: guildId },
      data: { xp: totalXP, level: Math.max(1, level) },
    });
  }
}
