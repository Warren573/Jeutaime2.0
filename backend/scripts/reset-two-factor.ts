/**
 * Réinitialisation de la double authentification d'UN compte — DERNIER RECOURS.
 *
 * À utiliser seulement lorsque le téléphone ET les codes de secours sont perdus et
 * que le propriétaire ne peut pas faire la réinitialisation depuis l'application
 * (cas d'un OWNER qui se verrouille lui-même). Exécuté par la personne qui détient
 * l'accès à la base de données ; jamais automatiquement.
 *
 * Deux temps, pour éviter toute erreur de cible :
 *   1. Aperçu (aucune modification) :
 *        npx ts-node scripts/reset-two-factor.ts --email adresse@exemple.fr
 *      Affiche le compte trouvé et un code de confirmation propre à ce compte.
 *   2. Exécution :
 *        npx ts-node scripts/reset-two-factor.ts --email adresse@exemple.fr --confirm CODE
 *
 * Effets : double authentification effacée, toutes les sessions fermées, ligne d'audit,
 * alerte de sécurité au compte. Le rôle, le mot de passe et les données ne changent pas.
 * Ensuite : se connecter avec le mot de passe puis reconfigurer immédiatement la double
 * authentification (Réglages → Sécurité et appareils).
 */
import { createHash } from "crypto";
import { prisma } from "../src/config/prisma";
import { resetTwoFactorByOperator } from "../src/modules/auth/security/accountSecurity.core";

export function confirmationCode(userId: string, enabledAt: Date | null): string {
  return createHash("sha256")
    .update(`${userId}|${enabledAt ? enabledAt.toISOString() : "none"}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const confirm = arg("confirm")?.trim().toUpperCase();
  if (!email) {
    console.error("Usage : --email adresse@exemple.fr [--confirm CODE]");
    process.exitCode = 2;
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, twoFactorEnabledAt: true, lastLoginAt: true },
  });
  if (!user) {
    console.error("Aucun compte pour cette adresse. Rien n'a été modifié.");
    process.exitCode = 1;
    return;
  }
  if (!user.twoFactorEnabledAt) {
    console.error("La double authentification n'est pas active sur ce compte. Rien n'a été modifié.");
    process.exitCode = 1;
    return;
  }

  const code = confirmationCode(user.id, user.twoFactorEnabledAt);
  console.log(`Compte : ${user.id} · rôle ${user.role} · 2FA active depuis ${user.twoFactorEnabledAt.toISOString()}`);
  console.log(`Dernière connexion : ${user.lastLoginAt ? user.lastLoginAt.toISOString() : "jamais"}`);

  if (confirm !== code) {
    console.log(`\nAPERÇU — aucune modification. Pour confirmer : --confirm ${code}`);
    if (confirm) {
      console.error("Le code de confirmation fourni ne correspond pas.");
      process.exitCode = 1;
    }
    return;
  }

  const { sessionsRevoked } = await resetTwoFactorByOperator(user.id, "scripts/reset-two-factor.ts");
  console.log(`\nDouble authentification effacée. ${sessionsRevoked} session(s) fermée(s). Reconfigure-la dès la prochaine connexion.`);
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error("Échec :", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
