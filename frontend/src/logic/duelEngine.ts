// ─── Choix disponibles ────────────────────────────────────────────────────────

export const DUEL_CHOICES = [
  { key: 'rock',     label: 'Pierre',  emoji: '✊' },
  { key: 'paper',    label: 'Papier',  emoji: '✋' },
  { key: 'scissors', label: 'Ciseaux', emoji: '✌️' },
] as const;

export type DuelChoice = typeof DUEL_CHOICES[number];
export type DuelResult = 'win' | 'lose' | 'draw' | 'pending';

// ─── Logique du jeu ───────────────────────────────────────────────────────────

export function getRandomChoice(): DuelChoice {
  return DUEL_CHOICES[Math.floor(Math.random() * DUEL_CHOICES.length)];
}

export function getResult(player: DuelChoice, opponent: DuelChoice): DuelResult {
  if (player.key === opponent.key) return 'draw';
  const wins =
    (player.key === 'rock'     && opponent.key === 'scissors') ||
    (player.key === 'paper'    && opponent.key === 'rock')     ||
    (player.key === 'scissors' && opponent.key === 'paper');
  return wins ? 'win' : 'lose';
}

// ─── Messages humoristiques pour le journal ───────────────────────────────────

const WIN_MESSAGES = [
  '{player} a plié le duel avec un {choiceLabel} parfaitement placé {choiceEmoji}',
  '{player} frappe fort : {choiceLabel} et victoire immédiate {choiceEmoji}',
  '{opponent} n\'avait rien vu venir… {player} l\'emporte avec {choiceLabel} {choiceEmoji}',
  '{player} tente un coup audacieux — et ça passe {choiceEmoji}',
];

const LOSE_MESSAGES = [
  '{player} y a cru… mais {opponent} renverse le duel au dernier moment 😏',
  '{opponent} lit le jeu comme un pro et prend l\'avantage 💥',
  '{player} se fait surprendre, le duel tourne en faveur de {opponent}',
  '{opponent} ne tremble pas et remporte ce face-à-face ⚡',
];

const DRAW_MESSAGES = [
  'Match nul entre {player} et {opponent}… tension maximale 😏',
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
    choiceEmoji: playerChoice.emoji,
  };

  let pool = DRAW_MESSAGES;
  if (result === 'win')  pool = WIN_MESSAGES;
  if (result === 'lose') pool = LOSE_MESSAGES;

  const template = pool[Math.floor(Math.random() * pool.length)];
  return fillTemplate(template, vars);
}
