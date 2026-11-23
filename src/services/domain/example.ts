// Domaine : règles métier pures. Aucune dépendance (ni base, ni date système, ni interface) :
// tout ce dont une règle a besoin lui est passé en argument.

export type Example = { id: string; name: string };

export function sortByName(examples: readonly Example[]): Example[] {
  return [...examples].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
