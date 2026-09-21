/**
 * RFC 4122 v4 UUID for a client-generated `orders.id`.
 *
 * The checkout inserts the order with a known id instead of reading one back,
 * which keeps `orders` unreadable to the anon role (see migration
 * 20260905000014). `crypto.randomUUID` is available in every secure context;
 * the `getRandomValues` path covers older mobile browsers served over https,
 * and only the final `Math.random` fallback is non-cryptographic.
 */
export function newOrderId(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10xx

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(bytes[i]!.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}
