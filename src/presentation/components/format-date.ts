// Dates affichées à l'heure de Paris, identiques côté serveur et navigateur : « 23/11/2026 à 10:00 ».

const day = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short" });
const time = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", timeStyle: "short" });

export function formatDateTime(date: Date): string {
  return `${day.format(date)} à ${time.format(date)}`;
}
