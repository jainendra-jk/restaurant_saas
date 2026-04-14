/**
 * Composes a newline-separated bill address from restaurant columns (same logic as customer MenuContext).
 */
export function buildRestaurantBillAddressFromRow(row: {
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
}): string | undefined {
  const line1 =
    typeof row.addressLine1 === 'string' && row.addressLine1.trim() ? row.addressLine1.trim() : '';
  const city = typeof row.city === 'string' && row.city.trim() ? row.city.trim() : '';
  const state = typeof row.state === 'string' && row.state.trim() ? row.state.trim() : '';
  const pincode = typeof row.pincode === 'string' && row.pincode.trim() ? row.pincode.trim() : '';
  const cityState = [city, state].filter(Boolean).join(', ');
  const line2 = [cityState, pincode].filter(Boolean).join(' - ');
  const lines = [line1, line2].filter(Boolean);
  return lines.length ? lines.join('\n') : undefined;
}
