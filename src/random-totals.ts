export const mainTotal = 10;
export const selectableTotals = Array.from({ length: 19 }, (_, index) => index + 2);
export const defaultFavoriteTotals = [5, 20] as const;
export const defaultRandomTotals = [5, 15, 20] as const;

export function parseTotalSelection(value: unknown, count: number, excluded?: number): number[] | undefined {
  if (!Array.isArray(value) || value.length !== count || new Set(value).size !== count) return;
  if (!value.every(total => selectableTotals.includes(total) && total !== excluded)) return;
  return value;
}

export function drawTotal(candidates: readonly number[], random = Math.random) {
  return candidates[Math.floor(random() * candidates.length)];
}
