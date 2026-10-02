import { prisma } from "../../config/prisma";
import { hashPassword } from "../../core/utils/hash";

const ADMIN_EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD;

export async function ensureBootstrapAdmin(): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, role: true, passwordHash: true },
  });

  if (!existing) {
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        role: "ADMIN",
        isVerified: true,
      },
    });
    return;
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await prisma.user.update({
    where: { id: existing.id },
    data: {
      role: "ADMIN",
      passwordHash,
      isVerified: true,
      isBanned: false,
    },
  });
}
