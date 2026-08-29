import { PrismaClient, Gender } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const users = [
  { email: "warren.test@jeutaime.local", pseudo: "WarrenTest", gender: Gender.HOMME, city: "Paris", birthDate: new Date("1985-01-15T00:00:00.000Z") },
  { email: "alice.test@jeutaime.local", pseudo: "AliceTest", gender: Gender.FEMME, city: "Lyon", birthDate: new Date("1990-05-12T00:00:00.000Z") },
  { email: "lea.test@jeutaime.local", pseudo: "LeaTest", gender: Gender.FEMME, city: "Bordeaux", birthDate: new Date("1993-09-21T00:00:00.000Z") },
  { email: "thomas.test@jeutaime.local", pseudo: "ThomasTest", gender: Gender.HOMME, city: "Lille", birthDate: new Date("1988-03-08T00:00:00.000Z") },
] as const;

const PASSWORD = "Test1234!";

async function main() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error('seed-test-core refusé: NODE_ENV doit être "test"');
  }

  // This table is used through raw SQL by accountLifecycle.service.ts and is not
  // represented in schema.prisma, so `prisma db push` cannot create it.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AccountDeactivation" (
      "userId" TEXT PRIMARY KEY,
      "previousShowInDiscovery" BOOLEAN NOT NULL DEFAULT TRUE,
      "deactivatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AccountDeactivation_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const item of users) {
    const existing = await prisma.user.findUnique({ where: { email: item.email } });
    if (existing) continue;

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: item.email, passwordHash, isVerified: true },
      });

      await tx.profile.create({
        data: {
          userId: user.id,
          pseudo: item.pseudo,
          birthDate: item.birthDate,
          gender: item.gender,
          city: item.city,
          interestedIn: [],
          lookingFor: [],
          interests: [],
          bio: "Compte fictif JeuTaime TEST",
        },
      });

      await tx.wallet.create({ data: { userId: user.id, coins: 5000 } });
      await tx.userSettings.create({ data: { userId: user.id } });
    });
  }

  console.log("[TEST-CORE] 4 comptes fictifs prêts");
  console.log(`[TEST-CORE] mot de passe commun: ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
