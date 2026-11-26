import type { Prisma } from "@prisma/client";

/**
 * Suppression des notifications rattachées à des relations qui disparaissent (réinitialisation de comptes de test,
 * remise à zéro d'un refuge, suppression de match…).
 *
 * Une notification ne porte aucune clé étrangère vers sa relation : seul `meta` contient son identifiant de routage
 * (`matchId`, `refugeSessionId`, `bottleId`, `duelId`). Sans cette purge, supprimer la relation laisse chez
 * l'AUTRE participant une notification orpheline (« match », « 3 questions réussies »…) qui décrit une rencontre
 * n'ayant plus lieu d'être — et, pour le Refuge, une clé d'idempotence qui empêcherait de prévenir à nouveau.
 *
 * Doit être appelée DANS la même transaction que la suppression quand il y en a une (client `tx`).
 * N'efface que les notifications dont l'identifiant est listé : aucune autre notification n'est touchée.
 */
export interface RelationIds {
  matchIds?: readonly string[];
  refugeSessionIds?: readonly string[];
  bottleIds?: readonly string[];
  duelIds?: readonly string[];
}

export interface PurgeOptions {
  /** Limite la purge à ces types de notification (ex. uniquement les lettres d'un match conservé). */
  types?: readonly string[];
}

const KEYS: readonly (readonly [keyof RelationIds, string])[] = [
  ["matchIds", "matchId"],
  ["refugeSessionIds", "refugeSessionId"],
  ["bottleIds", "bottleId"],
  ["duelIds", "duelId"],
];

export async function purgeRelationNotifications(
  client: Pick<Prisma.TransactionClient, "$executeRaw">,
  ids: RelationIds,
  options: PurgeOptions = {}
): Promise<number> {
  let deleted = 0;
  for (const [field, metaKey] of KEYS) {
    const list = Array.from(new Set(ids[field] ?? [])).filter((v) => typeof v === "string" && v.length > 0);
    if (list.length === 0) continue;
    // Clé de meta : constante interne (jamais saisie utilisateur), identifiants passés en paramètres liés.
    deleted += options.types?.length
      ? await client.$executeRaw`
          DELETE FROM "Notification"
          WHERE "meta"->>${metaKey} = ANY(${list}::text[])
            AND "type"::text = ANY(${[...options.types]}::text[])`
      : await client.$executeRaw`
          DELETE FROM "Notification"
          WHERE "meta"->>${metaKey} = ANY(${list}::text[])`;
  }
  return deleted;
}

/** Types de notifications portant un `matchId` qui décrivent le PARCOURS d'un match (pas les lettres). */
export const MATCH_JOURNEY_TYPES = [
  "MATCH_CREATED",
  "QUESTIONS_PASSED",
  "QUESTIONS_FAILED",
  "QUESTIONS_TURN",
  "BOTTLE_REVEAL_ACCEPTED",
] as const;
export const LETTER_TYPES = ["LETTER_RECEIVED"] as const;
