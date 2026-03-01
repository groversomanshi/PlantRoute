/**
 * Seed leaderboard with test data.
 * Run: npx tsx scripts/seed-leaderboard.ts
 * (Or: npx ts-node --esm scripts/seed-leaderboard.ts)
 * Requires at least one user in the database (sign up via the app first).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ take: 5 });
  if (users.length === 0) {
    console.log("No users found. Sign up at /signin first, then run this script.");
    process.exit(1);
  }

  // Sample emissions (kg CO2e) - lower = better rank
  const samples = [12, 45, 89, 120, 200, 25, 67, 15, 180, 35];

  for (const user of users) {
    const count = Math.floor(Math.random() * 4) + 2; // 2-5 trips per user
    for (let i = 0; i < count; i++) {
      const emission = samples[Math.floor(Math.random() * samples.length)];
      await prisma.tripCarbon.create({
        data: {
          userId: user.id,
          emissionKg: emission,
          itineraryId: `seed-${user.id}-${i}-${Date.now()}`,
        },
      });
    }
    console.log(`Added ${count} trips for ${user.name ?? user.email ?? user.id}`);
  }

  console.log("Done! Refresh /leaderboard to see entries.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
