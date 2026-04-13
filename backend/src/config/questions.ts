/**
 * Catalogue des questions de validation de profil
 * Utilisé par le module profiles pour valider les réponses.
 */
export const QUESTION_CATALOG: ReadonlyArray<{ id: string; text: string }> = [
  { id: "q_01", text: "Quel est ton souvenir d'enfance le plus marquant ?" },
  { id: "q_02", text: "Si tu pouvais vivre dans n'importe quelle époque, laquelle choisirais-tu ?" },
  { id: "q_03", text: "Quelle est la chose la plus folle que tu aies jamais faite ?" },
  { id: "q_04", text: "Qu'est-ce qui te fait rire aux éclats ?" },
  { id: "q_05", text: "Quel est ton livre, film ou série qui t'a le plus marqué·e ?" },
  { id: "q_06", text: "Si tu devais décrire ta personnalité avec un animal, lequel serait-ce et pourquoi ?" },
  { id: "q_07", text: "Quelle est ta définition du bonheur ?" },
  { id: "q_08", text: "Qu'est-ce que tu ferais si tu n'avais pas peur ?" },
  { id: "q_09", text: "Plutôt montagne ou mer ? Et pourquoi ?" },
  { id: "q_10", text: "Quel serait ton superpower idéal ?" },
  { id: "q_11", text: "Quelle est la dernière chose qui t'a ému·e ?" },
  { id: "q_12", text: "Qu'est-ce que les gens ne savent pas encore de toi ?" },
];

export function getQuestion(id: string) {
  return QUESTION_CATALOG.find((q) => q.id === id);
}

export const QUESTION_IDS = QUESTION_CATALOG.map((q) => q.id);
