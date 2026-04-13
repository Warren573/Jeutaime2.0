/** Différence en jours entiers entre deux dates (now - past) */
export function differenceInDays(now: Date, past: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((now.getTime() - past.getTime()) / msPerDay);
}

/** Ajoute N jours à une date */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/** Vérifie si deux dates sont le même jour (UTC) */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth()    === b.getUTCMonth() &&
    a.getUTCDate()     === b.getUTCDate()
  );
}

/** Début du jour UTC */
export function startOfDayUTC(date: Date): Date {
  const d = new Date(date.getTime());
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
