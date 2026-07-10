export function formatAnimalAge(ageMonths: number): string {
  if (ageMonths < 12) {
    return `${ageMonths} mois`;
  }

  if (ageMonths >= 12 && ageMonths < 24) {
    return "1 an";
  }

  const years = Math.floor(ageMonths / 12);
  return `${years} ans`;
}
