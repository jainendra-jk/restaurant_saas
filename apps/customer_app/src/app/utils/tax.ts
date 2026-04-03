import type { TaxRule } from "../context/MenuContext";

export interface ComputedTaxLine {
  name: string;
  percent: number;
  amount: number;
}

export function computeTaxes(subTotal: number, rules: TaxRule[]): ComputedTaxLine[] {
  if (!Array.isArray(rules) || rules.length === 0) return [];
  return rules
    .filter((r) => r.name.trim() !== "" && Number.isFinite(r.percent) && r.percent > 0)
    .map((r) => ({
      name: r.name.trim(),
      percent: r.percent,
      // Round to cents (2 decimals). This avoids whole-number rounding issues
      // like 17.99 * 10% => 1.799 should become 1.80 (not 2.00).
      amount: Math.round((subTotal * (r.percent / 100)) * 100) / 100,
    }));
}

