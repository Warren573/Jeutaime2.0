import { prisma } from "../src/config/prisma";

async function cleanTestMessages() {
  console.log("[CLEAN] Starting cleanup of test Glouglou/Miam messages...");

  const glouglou = await prisma.salonMessage.deleteMany({
    where: {
      content: {
        contains: "Glouglou",
      },
    },
  });

  const miam = await prisma.salonMessage.deleteMany({
    where: {
      content: {
        contains: "Miam",
      },
    },
  });

  console.log(`[CLEAN] Deleted ${glouglou.count} Glouglou messages`);
  console.log(`[CLEAN] Deleted ${miam.count} Miam messages`);
  console.log(`[CLEAN] Total deleted: ${glouglou.count + miam.count} messages`);

  await prisma.$disconnect();
  console.log("[CLEAN] Cleanup complete.");
}

cleanTestMessages().catch((err) => {
  console.error("[CLEAN] Error:", err);
  process.exit(1);
});
