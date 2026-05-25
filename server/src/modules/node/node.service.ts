import { prisma } from '../../config/database';
import { PointsEngine } from '../points/points.engine';

export class NodeService {
  static async registerNode(userId: string, type: string, userAgent?: string) {
    // Check if node already exists for this user and type
    const existing = await prisma.node.findFirst({
      where: { userId, type },
    });

    if (existing) {
      // Reactivate existing node
      const node = await prisma.node.update({
        where: { id: existing.id },
        data: { status: 'ONLINE', lastHeartbeat: new Date(), userAgent },
      });
      return node;
    }

    const node = await prisma.node.create({
      data: {
        userId,
        type,
        status: 'ONLINE',
        lastHeartbeat: new Date(),
        userAgent,
      },
    });
    return node;
  }

  static async heartbeat(nodeId: string, userId: string, data: {
    connectionQuality: number;
    isActive: boolean;
  }) {
    const node = await prisma.node.findFirst({
      where: { id: nodeId, userId },
    });

    if (!node) throw { statusCode: 404, message: 'Node not found' };

    // Calculate uptime delta
    const now = new Date();
    const lastHeartbeat = node.lastHeartbeat || now;
    const uptimeDelta = Math.min(
      Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000),
      120 // Max 2 minutes between heartbeats
    );

    // Process points
    const pointsEarned = await PointsEngine.processHeartbeat(nodeId, userId, {
      connectionQuality: data.connectionQuality,
      isActive: data.isActive,
      uptimeDelta,
    });

    return { pointsEarned, uptimeDelta };
  }

  static async disconnect(nodeId: string, userId: string) {
    await prisma.node.updateMany({
      where: { id: nodeId, userId },
      data: { status: 'OFFLINE' },
    });
  }

  static async getUserNodes(userId: string) {
    return prisma.node.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getNodeStats(userId: string) {
    const nodes = await prisma.node.findMany({
      where: { userId },
    });

    const totalUptime = nodes.reduce((acc, n) => acc + n.uptimeSeconds, 0);
    const onlineNodes = nodes.filter(n => n.status === 'ONLINE').length;
    const avgQuality = nodes.length > 0
      ? nodes.reduce((acc, n) => acc + n.connectionQuality, 0) / nodes.length
      : 0;

    return {
      totalNodes: nodes.length,
      onlineNodes,
      totalUptime,
      averageQuality: Math.round(avgQuality * 100) / 100,
      nodes,
    };
  }
}
