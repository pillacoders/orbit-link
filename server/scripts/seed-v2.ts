import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACHIEVEMENTS = [
  // ─── Contribution ──────────────────────────────────
  { key: 'first_heartbeat', title: 'First Relay', description: 'Complete your first relay contribution', category: 'CONTRIBUTION', xpReward: 50, rarity: 'COMMON', icon: 'zap' },
  { key: 'relay_100', title: 'Relay Centurion', description: 'Complete 100 relay contributions', category: 'CONTRIBUTION', xpReward: 200, rarity: 'UNCOMMON', icon: 'activity' },
  { key: 'relay_1000', title: 'Relay Veteran', description: 'Complete 1,000 relay contributions', category: 'CONTRIBUTION', xpReward: 500, rarity: 'RARE', icon: 'radio' },
  { key: 'relay_10000', title: 'Relay Legend', description: 'Complete 10,000 relay contributions', category: 'CONTRIBUTION', xpReward: 2000, rarity: 'LEGENDARY', icon: 'crown' },
  { key: 'uptime_24h', title: '24-Hour Sentinel', description: 'Accumulate 24 hours of total uptime', category: 'CONTRIBUTION', xpReward: 150, rarity: 'COMMON', icon: 'clock' },
  { key: 'uptime_7d', title: 'Week-Long Guardian', description: 'Accumulate 7 days of total uptime', category: 'CONTRIBUTION', xpReward: 400, rarity: 'UNCOMMON', icon: 'shield' },
  { key: 'uptime_30d', title: 'Monthly Fortress', description: 'Accumulate 30 days of total uptime', category: 'CONTRIBUTION', xpReward: 1000, rarity: 'RARE', icon: 'castle' },
  { key: 'quality_90', title: 'Elite Relay', description: 'Maintain 90%+ average connection quality', category: 'CONTRIBUTION', xpReward: 300, rarity: 'RARE', icon: 'star' },

  // ─── Social ────────────────────────────────────────
  { key: 'first_referral', title: 'Network Seed', description: 'Refer your first contributor', category: 'SOCIAL', xpReward: 100, rarity: 'COMMON', icon: 'users' },
  { key: 'referral_5', title: 'Growing Network', description: 'Refer 5 contributors', category: 'SOCIAL', xpReward: 250, rarity: 'UNCOMMON', icon: 'user-plus' },
  { key: 'referral_25', title: 'Network Builder', description: 'Refer 25 contributors', category: 'SOCIAL', xpReward: 600, rarity: 'RARE', icon: 'network' },
  { key: 'referral_100', title: 'Relay Ambassador', description: 'Refer 100 contributors', category: 'SOCIAL', xpReward: 2000, rarity: 'EPIC', icon: 'megaphone' },
  { key: 'wallet_connected', title: 'Web3 Native', description: 'Connect a Web3 wallet', category: 'SOCIAL', xpReward: 75, rarity: 'COMMON', icon: 'wallet' },

  // ─── Streak ────────────────────────────────────────
  { key: 'streak_3', title: 'Consistent Contributor', description: 'Maintain a 3-day streak', category: 'STREAK', xpReward: 75, rarity: 'COMMON', icon: 'flame' },
  { key: 'streak_7', title: 'Weekly Warrior', description: 'Maintain a 7-day streak', category: 'STREAK', xpReward: 200, rarity: 'UNCOMMON', icon: 'flame' },
  { key: 'streak_30', title: 'Iron Will', description: 'Maintain a 30-day streak', category: 'STREAK', xpReward: 1000, rarity: 'EPIC', icon: 'flame' },

  // ─── Points Milestones ─────────────────────────────
  { key: 'points_1000', title: 'First Thousand', description: 'Earn 1,000 total points', category: 'CONTRIBUTION', xpReward: 100, rarity: 'COMMON', icon: 'coins' },
  { key: 'points_10000', title: 'Ten Thousand Club', description: 'Earn 10,000 total points', category: 'CONTRIBUTION', xpReward: 500, rarity: 'RARE', icon: 'gem' },
  { key: 'points_100000', title: 'Hundred Thousand Elite', description: 'Earn 100,000 total points', category: 'CONTRIBUTION', xpReward: 2500, rarity: 'LEGENDARY', icon: 'trophy' },

  // ─── Hidden ────────────────────────────────────────
  { key: 'genesis_node', title: 'Genesis Node', description: 'Among the first 1,000 operators on OrbitLink', category: 'HIDDEN', xpReward: 500, rarity: 'LEGENDARY', icon: 'sparkles', isHidden: true },
  { key: 'night_owl', title: 'Night Owl', description: 'Relay active between 2-5 AM', category: 'HIDDEN', xpReward: 100, rarity: 'UNCOMMON', icon: 'moon', isHidden: true },
];

const EPOCHS = [
  {
    name: 'Epoch 1',
    seasonName: 'Genesis Relay',
    description: 'The inaugural epoch of the OrbitLink relay network. Early contributors earn boosted rewards and exclusive Genesis badges.',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-06-30'),
    totalPointsPool: 5000000,
    rewardPoolProgress: 0.72,
    status: 'ACTIVE',
    multiplier: 1.5,
    badgeReward: JSON.stringify({ title: 'Genesis Operator', rarity: 'LEGENDARY', icon: 'sparkles' }),
    cosmetics: JSON.stringify({ border: 'genesis-gold', glow: true }),
  },
  {
    name: 'Epoch 2',
    seasonName: 'Edge Intelligence',
    description: 'AI inference routing goes live. Nodes that relay inference traffic earn specialized Edge Intelligence rewards.',
    startDate: new Date('2025-07-01'),
    endDate: new Date('2025-12-31'),
    totalPointsPool: 10000000,
    rewardPoolProgress: 0,
    status: 'UPCOMING',
    multiplier: 1.3,
    badgeReward: JSON.stringify({ title: 'Edge Pioneer', rarity: 'EPIC', icon: 'cpu' }),
    cosmetics: JSON.stringify({ border: 'edge-blue', glow: true }),
  },
  {
    name: 'Epoch 3',
    seasonName: 'Distributed AI',
    description: 'Full decentralized AI workload distribution. Dataset marketplace and enterprise relay APIs launch.',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-30'),
    totalPointsPool: 20000000,
    rewardPoolProgress: 0,
    status: 'UPCOMING',
    multiplier: 1.2,
    badgeReward: JSON.stringify({ title: 'Neural Architect', rarity: 'EPIC', icon: 'brain' }),
    cosmetics: JSON.stringify({ border: 'neural-violet', glow: true }),
  },
];

async function seed() {
  console.log('🌱 Seeding achievements...');

  for (const ach of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: ach.key },
      update: { ...ach },
      create: { ...ach, isHidden: ach.isHidden || false },
    });
  }
  console.log(`  ✓ ${ACHIEVEMENTS.length} achievements seeded`);

  console.log('🌱 Seeding epochs...');
  for (const epoch of EPOCHS) {
    const existing = await prisma.epoch.findFirst({ where: { name: epoch.name } });
    if (!existing) {
      await prisma.epoch.create({ data: epoch });
      console.log(`  ✓ Created epoch: ${epoch.seasonName}`);
    } else {
      console.log(`  ~ Epoch exists: ${epoch.seasonName}`);
    }
  }

  console.log('\n✅ Seed complete');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
