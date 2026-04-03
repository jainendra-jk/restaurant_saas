/**
 * Format money with at most 2 decimals (max "cents").
 * Example:
 * - 10 -> "10"
 * - 10.2 -> "10.2"
 * - 10.20 -> "10.2"
 * - 10.25 -> "10.25"
 */
export function formatPrice(amount: number): string {
  if (!Number.isFinite(amount)) return "0";

  // Avoid floating point artifacts by rounding to cents first.
  const rounded = Math.round(amount * 100) / 100;
  const normalized = Object.is(rounded, -0) ? 0 : rounded;

  const fixed = normalized.toFixed(2); // always 2 decimals
  // Trim trailing zeros in the fractional part (and the dot if needed).
  const trimmed = fixed.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed;
}

