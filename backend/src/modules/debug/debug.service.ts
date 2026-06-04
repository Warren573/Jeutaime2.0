import { prisma } from "../../config/prisma";
import { execSync } from "child_process";
import { Prisma } from "@prisma/client";

function getCommitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch {
    return "unknown";
  }
}

export async function getStagingStatus() {
  const [salons, offerings, magies, pets, migrations] = await Promise.all([
    prisma.salon.findMany({ select: { kind: true, name: true } }),
    prisma.offeringCatalog.count(),
    prisma.magieCatalog.count(),
    prisma.petCatalog.count(),
    prisma.$queryRaw<Array<{ id: string; checksum: string; finished_at: Date }>>(
      Prisma.sql`SELECT id, checksum, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 10`
    ),
  ]);

  const commitSha = getCommitSha();

  // Check seed execution
  const salonCount = await prisma.salon.count();
  const offeringCount = await prisma.offeringCatalog.count();
  const magieCount = await prisma.magieCatalog.count();
  const petCount = await prisma.petCatalog.count();

  return {
    commit: commitSha,
    database: {
      salons: {
        count: salonCount,
        records: salons.map((s) => ({ kind: s.kind, name: s.name })),
      },
      offeringCatalog: offeringCount,
      magieCatalog: magieCount,
      petCatalog: petCount,
    },
    seedStatus: {
      salonsSeeded: salonCount > 0,
      offeringsSeeded: offeringCount >= 3,
      magiesSeeded: magieCount >= 14,
      petsSeeded: petCount >= 10,
      allSeeded: salonCount > 0 && offeringCount >= 3 && magieCount >= 14 && petCount >= 10,
    },
    migrations: {
      count: migrations.length,
      latest: migrations.slice(0, 3).map((m) => ({
        id: m.id,
        finished_at: m.finished_at,
      })),
    },
    timestamp: new Date().toISOString(),
  };
}

