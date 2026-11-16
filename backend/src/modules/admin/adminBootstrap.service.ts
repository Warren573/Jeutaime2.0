import { prisma } from "../../config/prisma";
import { hashPassword } from "../../core/utils/hash";

const ADMIN_EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD;

export async function ensureBootstrapAdmin(): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
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

  // Bootstrap uniquement à la création. Ne jamais modifier un compte existant :
  // ni rôle, ni mot de passe, ni statut de bannissement ou de vérification.
  // Toute modification ultérieure passe par les parcours authentifiés.
}
