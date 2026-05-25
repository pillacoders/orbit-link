import { prisma } from '../../config/database';

export class PointsService {
  static async getUserPoints(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true },
    });
    return user?.totalPoints || 0;
  }

  static async getPointsHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      prisma.pointsTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pointsTransaction.count({ where: { userId } }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getEarningsOverview(userId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [todayEarnings, weekEarnings, monthEarnings, totalPoints] = await Promise.all([
      prisma.pointsTransaction.aggregate({
        where: { userId, createdAt: { gte: today }, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      prisma.pointsTransaction.aggregate({
        where: { userId, createdAt: { gte: weekAgo }, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      prisma.pointsTransaction.aggregate({
        where: { userId, createdAt: { gte: monthAgo }, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true } }),
    ]);

    return {
      total: totalPoints?.totalPoints || 0,
      today: todayEarnings._sum.amount || 0,
      week: weekEarnings._sum.amount || 0,
      month: monthEarnings._sum.amount || 0,
    };
  }

  static async getEarningsChart(userId: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await prisma.pointsTransaction.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        amount: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' },
      select: { amount: true, createdAt: true, type: true },
    });

    // Group by day
    const dailyData: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      dailyData[key] = 0;
    }

    for (const tx of transactions) {
      const key = tx.createdAt.toISOString().split('T')[0];
      if (dailyData[key] !== undefined) {
        dailyData[key] += tx.amount;
      }
    }

    return Object.entries(dailyData)
      .map(([date, points]) => ({ date, points: Math.round(points * 100) / 100 }))
      .reverse();
  }

  static async redeemPoints(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true, walletAddress: true },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    if (!user.walletAddress) {
      throw { statusCode: 400, message: 'Wallet address not connected. Please connect your wallet in settings.' };
    }

    // Minimum redemption threshold (e.g. 1000 points)
    const pointsToRedeem = Math.floor(user.totalPoints);
    if (pointsToRedeem < 1000) {
      throw { statusCode: 400, message: 'Minimum redemption amount is 1,000 points.' };
    }

    // 1. Deduct points from user total in database
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { totalPoints: { decrement: pointsToRedeem } },
      }),
      prisma.pointsTransaction.create({
        data: {
          userId,
          amount: -pointsToRedeem,
          type: 'REDEMPTION',
          source: `Redeemed ${pointsToRedeem} points for ORBS tokens`,
        },
      }),
    ]);

    // 2. Trigger on-chain mint transaction via RewardDistributor contract
    let txHash = '0x_simulated_tx_hash_' + Math.random().toString(36).substring(2, 15);

    try {
      const providerUrl = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';
      const privateKey = process.env.OWNER_PRIVATE_KEY;
      const distributorAddress = '0x5D881b95DEfF8dC5d5F674A1a6313A68dad5C314';

      if (privateKey && privateKey !== '0x...' && privateKey.length === 66) {
        const { ethers } = require('ethers');
        const provider = new ethers.JsonRpcProvider(providerUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const distributorAbi = [
          "function redeemPoints(address user, uint256 points) external"
        ];
        const contract = new ethers.Contract(distributorAddress, distributorAbi, wallet);
        
        console.log(`Sending redeemPoints on-chain for user ${user.walletAddress} with ${pointsToRedeem} points...`);
        const tx = await contract.redeemPoints(user.walletAddress, pointsToRedeem);
        console.log(`Tx sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Tx confirmed in block ${receipt.blockNumber}`);
        txHash = tx.hash;
      } else {
        console.log(`No valid private key found for on-chain transaction. Simulating transaction...`);
      }
    } catch (ethersError: any) {
      console.error('On-chain redemption error, rolling back database change...', ethersError);
      
      // Rollback database points
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { totalPoints: { increment: pointsToRedeem } },
        }),
        prisma.pointsTransaction.create({
          data: {
            userId,
            amount: pointsToRedeem,
            type: 'BONUS',
            source: 'Redemption failed - points refunded',
          },
        }),
      ]);
      
      throw { statusCode: 500, message: `On-chain transaction failed: ${ethersError.message || ethersError}` };
    }

    return {
      success: true,
      pointsRedeemed: pointsToRedeem,
      txHash,
    };
  }
}
