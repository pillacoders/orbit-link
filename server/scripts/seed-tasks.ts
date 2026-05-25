import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TASKS = [
  {
    title: 'Install Extension',
    description: 'Install the OrbitLink browser extension and connect your account',
    type: 'CUSTOM',
    rewardPoints: 100,
  },
  {
    title: 'Invite 1 Friend',
    description: 'Refer 1 friend using your referral code',
    type: 'CUSTOM',
    rewardPoints: 50,
  },
  {
    title: 'Invite 5 Friends',
    description: 'Refer 5 friends using your referral code',
    type: 'CUSTOM',
    rewardPoints: 400,
  },
  {
    title: 'Invite 10 Friends',
    description: 'Refer 10 friends using your referral code',
    type: 'CUSTOM',
    rewardPoints: 1000,
  },
  {
    title: 'Invite 100 Friends',
    description: 'Refer 100 friends using your referral code',
    type: 'CUSTOM',
    rewardPoints: 15000,
  },
  {
    title: 'Invite 500 Friends',
    description: 'Refer 500 friends using your referral code',
    type: 'CUSTOM',
    rewardPoints: 100000,
  },
];

async function main() {
  console.log('Seeding tasks...');
  for (const task of TASKS) {
    const existing = await prisma.task.findFirst({
      where: { title: task.title },
    });
    if (!existing) {
      await prisma.task.create({ data: task });
      console.log(`Created task: ${task.title}`);
    } else {
      console.log(`Task already exists: ${task.title}`);
    }
  }
  console.log('Tasks seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
