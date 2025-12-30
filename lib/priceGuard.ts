/** Clamp negative prices to 0 (safety guard for data integrity) */
export function clampNonNegative(value: number | null): number | null {
  if (value == null) return null;
  return value < 0 ? 0 : value;
}
