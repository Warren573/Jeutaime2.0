export const TEST_MODE_ENABLED = __DEV__;

export type TestScenario =
  | 'fresh-account'
  | 'matched-users'
  | 'questions-ready'
  | 'letters-9'
  | 'refuge-day-6'
  | 'premium-user';

export const TEST_SCENARIOS: Array<{ id: TestScenario; label: string; description: string }> = [
  { id: 'fresh-account', label: 'Compte neuf', description: 'Remettre le compte de test dans un état vierge.' },
  { id: 'matched-users', label: 'Match prêt', description: 'Préparer deux utilisateurs déjà matchés.' },
  { id: 'questions-ready', label: '3 questions', description: 'Préparer un match au stade du jeu des 3 questions.' },
  { id: 'letters-9', label: '9 lettres', description: 'Préparer une conversation juste avant le déblocage photo.' },
  { id: 'refuge-day-6', label: 'Refuge J6', description: 'Préparer une session Refuge au jour 6.' },
  { id: 'premium-user', label: 'Compte Premium', description: 'Basculer le compte de test dans un état Premium.' },
];

export function assertTestMode(): void {
  if (!TEST_MODE_ENABLED) {
    throw new Error('Test mode is disabled outside development builds.');
  }
}
