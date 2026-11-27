/**
 * Bilan final des sept jours et accès au dévoilement — logique PURE.
 *
 * Le serveur calcule tout (assiduité, pièces, points) : le frontend ne fait que présenter. Le dévoilement n'est JAMAIS
 * proposé avant l'expiration des 168 h : le drapeau `reveal.available` du serveur fait foi, et le frontend vérifie en plus
 * l'heure de fin (heure serveur corrigée) pour ne jamais afficher la question en avance.
 */
export interface FinalReportDay {
  dayNumber: number;
  symbol: string;
  status: string;
  matches: number | null;
  assiduous: boolean;
  coins: number;
  points: number;
}

export interface FinalReportData {
  days: FinalReportDay[];
  participationDays: number;
  perfectDays: number;
  correctActions: number;
  perfectCourse: boolean;
  dailyCoins: number;
  finalBonus: number;
  bonusTier: 'perfect' | 'assiduity' | null;
  totalCoins: number;
  penaltyPoints: number;
}

export interface ReportLine {
  key: string;
  label: string;
  value: string;
  /** Mise en avant (total). */
  strong?: boolean;
}

const plural = (n: number, one: string, many: string) => (Math.abs(n) > 1 ? many : one);
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

/** Lignes du bilan, dans l'ordre demandé. « Points de classement » n'apparaît que s'il y a une pénalité. */
export function reportLines(r: FinalReportData): ReportLine[] {
  const lines: ReportLine[] = [
    { key: 'participation', label: 'Journées de participation', value: `${r.participationDays} / 7` },
    { key: 'perfect', label: 'Journées parfaites', value: `${r.perfectDays} / 7` },
    { key: 'actions', label: 'Actions correctement devinées', value: `${r.correctActions} / 14` },
    { key: 'daily', label: 'Pièces des journées', value: `${signed(r.dailyCoins)} ${plural(r.dailyCoins, 'pièce', 'pièces')}` },
    {
      key: 'bonus',
      label: 'Bonus final',
      value: r.finalBonus > 0
        ? `${signed(r.finalBonus)} ${plural(r.finalBonus, 'pièce', 'pièces')} (${r.bonusTier === 'perfect' ? 'parcours parfait 14/14' : '7 jours d’assiduité'})`
        : 'Aucun bonus',
    },
    { key: 'total', label: 'Total gagné', value: `${signed(r.totalCoins)} ${plural(r.totalCoins, 'pièce', 'pièces')}`, strong: true },
  ];
  if (r.penaltyPoints < 0) {
    lines.push({ key: 'penalty', label: 'Points de classement retirés', value: signed(r.penaltyPoints) });
  }
  return lines;
}

/** Texte sous un jour du calendrier : pièces gagnées ce jour-là, ou un tiret. */
export function dayCoinsLabel(d: Pick<FinalReportDay, 'coins'>): string {
  return d.coins > 0 ? `+${d.coins}` : '—';
}

/**
 * Le dévoilement peut-il être proposé ? Oui seulement si le serveur le dit ET que l'heure de fin est dépassée
 * (heure serveur corrigée du décalage de l'appareil). Sans heure de fin connue : non.
 */
export function revealOffered(args: { available: boolean | null | undefined; endsAt: string | null | undefined; serverNowMs: number }): boolean {
  if (!args.available || !args.endsAt) return false;
  const end = Date.parse(args.endsAt);
  return Number.isFinite(end) && args.serverNowMs >= end;
}

/** Écran de fin : concerne les sessions en attente de dévoilement, dévoilées ou terminées par un refus. */
export function isEndScreenStatus(status: string | null | undefined): boolean {
  return status === 'AWAITING_REVEAL_CONSENT' || status === 'REVEALED' || status === 'COMPLETED';
}
