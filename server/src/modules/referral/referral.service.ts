import { prisma } from '../../config/database';

export class ReferralService {
  static async getReferralStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referee: {
          select: { id: true, username: true, avatarUrl: true, createdAt: true, totalPoints: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalEarnings = referrals.reduce((acc, r) => acc + r.pointsEarned, 0);
    const activeReferrals = referrals.filter(r => r.status === 'ACTIVE').length;

    return {
      referralCode: user?.referralCode,
      referralLink: `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/signup?ref=${user?.referralCode}`,
      totalReferrals: referrals.length,
      activeReferrals,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      referrals: referrals.map(r => ({
        id: r.id,
        user: r.referee,
        pointsEarned: r.pointsEarned,
        status: r.status,
        joinedAt: r.createdAt,
      })),
    };
  }
}
