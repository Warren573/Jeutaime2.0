// ─── Choix disponibles ────────────────────────────────────────────────────────

export const DUEL_CHOICES = [
  { key: 'rock',     label: 'Pierre',  icon: 'hand-fist' },
  { key: 'paper',    label: 'Papier',  icon: 'hand-back-right-outline' },
  { key: 'scissors', label: 'Ciseaux', icon: 'content-cut' },
] as const;

export type DuelChoice = typeof DUEL_CHOICES[number];
export type DuelResult = 'win' | 'lose' | 'draw' | 'pending';

// ─── Messages humoristiques pour le journal ───────────────────────────────────

const WIN_MESSAGES = [
  '{player} a plié le duel avec un {choiceLabel} parfaitement placé',
  '{player} frappe fort : {choiceLabel} et victoire immédiate',
  '{opponent} n\'avait rien vu venir… {player} l\'emporte avec {choiceLabel}',
  '{player} tente un coup audacieux — et ça passe',
];

const LOSE_MESSAGES = [
  '{player} y a cru… mais {opponent} renverse le duel au dernier moment',
  '{opponent} lit le jeu comme un pro et prend l\'avantage',
  '{player} se fait surprendre, le duel tourne en faveur de {opponent}',
  '{opponent} ne tremble pas et remporte ce face-à-face',
];

const DRAW_MESSAGES = [
  'Match nul entre {player} et {opponent}… tension maximale',
  '{player} et {opponent} se lisent trop bien : égalité parfaite',
  'Impossible de les départager : {player} et {opponent} restent au coude-à-coude',
  'Duel bloqué : {player} et {opponent} terminent sur un match nul',
];

function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.split(`{${k}}`).join(v),
    template,
  );
}

export function generateJournalMessage({
  result,
  playerName,
  opponentName,
  playerChoice,
}: {
  result: DuelResult;
  playerName: string;
  opponentName: string;
  playerChoice: DuelChoice;
}): string {
  const vars = {
    player:      playerName,
    opponent:    opponentName,
    choiceLabel: playerChoice.label.toLowerCase(),
      };

  let pool = DRAW_MESSAGES;
  if (result === 'win')  pool = WIN_MESSAGES;
  if (result === 'lose') pool = LOSE_MESSAGES;

  const template = pool[Math.floor(Math.random() * pool.length)];
  return fillTemplate(template, vars);
}
