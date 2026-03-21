/**
 * Portion display labels used in menu (capsule), cart, checkout, and PDF receipt.
 * Single source of truth so "Qtr" / "Half" / "Full" stay consistent everywhere.
 */

import type { PortionSize } from "../components/shared/menu-data";

export const PORTION_LABELS: Record<PortionSize, { label: string; short: string }> = {
  quarter: { label: "Quarter", short: "Qtr" },
  half: { label: "Half", short: "Half" },
  full: { label: "Full", short: "Full" },
};

/** Short form for receipt and order summary (e.g. "Qtr", "Half", "Full"). */
export function getPortionShort(portion: PortionSize): string {
  return PORTION_LABELS[portion].short;
}
