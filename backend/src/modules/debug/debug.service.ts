import { prisma } from "../../config/prisma";
import { execSync } from "child_process";

function getCommitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch {
    return "unknown";
  }
}

export async function getStagingStatus() {
  const [salons, offerings, magies, pets] = await Promise.all([
    prisma.salon.findMany({ select: { kind: true, name: true } }),
    prisma.offeringCatalog.count(),
    prisma.magieCatalog.count(),
    prisma.petCatalog.count(),
  ]);

  const commitSha = getCommitSha();

  return {
    commit: commitSha,
    salons: {
      count: salons.length,
      records: salons.map((s) => ({ kind: s.kind, name: s.name })),
    },
    offeringCatalog: offerings,
    magieCatalog: magies,
    petCatalog: pets,
    timestamp: new Date().toISOString(),
  };
}
