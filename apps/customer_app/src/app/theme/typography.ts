/**
 * Centralized typography for the app. Use these style objects instead of
 * repeating fontFamily/fontSize/fontWeight so the app stays consistent.
 */

const FONT_SERIF = "'Playfair Display', serif";
const FONT_BODY = "'Inter', sans-serif";

export const fontSerif = { fontFamily: FONT_SERIF };
export const fontBody = { fontFamily: FONT_BODY };

/** Serif titles (Playfair Display) */
export const titleSm = { fontFamily: FONT_SERIF, fontSize: "1.1rem" };
export const titleMd = { fontFamily: FONT_SERIF, fontSize: "1.2rem" };
export const titleLg = { fontFamily: FONT_SERIF, fontSize: "1.25rem" };
export const titleXl = { fontFamily: FONT_SERIF, fontSize: "1.4rem" };
export const title2xl = { fontFamily: FONT_SERIF, fontSize: "1.5rem" };
export const titleSmBold = { fontFamily: FONT_SERIF, fontSize: "1rem", fontWeight: 600 };
export const titleSmBoldLarge = { fontFamily: FONT_SERIF, fontSize: "1.1rem", fontWeight: 600 };

/** Body text (Inter) – various sizes and weights */
export const bodyXs = { fontFamily: FONT_BODY, fontSize: "0.55rem" };
export const bodyXsSemi = { fontFamily: FONT_BODY, fontSize: "0.55rem", fontWeight: 600 };
export const bodySm = { fontFamily: FONT_BODY, fontSize: "0.6rem" };
export const bodySmSemi = { fontFamily: FONT_BODY, fontSize: "0.6rem", fontWeight: 600 };
export const bodyLabel = { fontFamily: FONT_BODY, fontSize: "0.65rem", fontWeight: 600 };
export const bodyMd = { fontFamily: FONT_BODY, fontSize: "0.7rem" };
export const bodyMd2 = { fontFamily: FONT_BODY, fontSize: "0.75rem" };
export const bodyBase = { fontFamily: FONT_BODY, fontSize: "0.8rem" };
export const bodyBaseSemi = { fontFamily: FONT_BODY, fontSize: "0.8rem", fontWeight: 600 };
export const bodyBaseMid = { fontFamily: FONT_BODY, fontSize: "0.8rem", fontWeight: 500 };
export const bodyLg = { fontFamily: FONT_BODY, fontSize: "0.85rem" };
export const bodyLgSemi = { fontFamily: FONT_BODY, fontSize: "0.85rem", fontWeight: 600 };
export const bodyLgMid = { fontFamily: FONT_BODY, fontSize: "0.85rem", fontWeight: 500 };
export const bodyXl = { fontFamily: FONT_BODY, fontSize: "0.9rem" };
export const bodyXlSemi = { fontFamily: FONT_BODY, fontSize: "0.9rem", fontWeight: 600 };
export const bodyXlMid = { fontFamily: FONT_BODY, fontSize: "0.9rem", fontWeight: 500 };
export const body2xl = { fontFamily: FONT_BODY, fontSize: "0.95rem" };
export const body2xlMid = { fontFamily: FONT_BODY, fontSize: "0.95rem", fontWeight: 500 };

/** Optional: helper for one-off styles (e.g. with letterSpacing) */
export function bodyStyle(
  fontSize: string,
  opts?: { fontWeight?: number; letterSpacing?: string; lineHeight?: number }
): { fontFamily: string; fontSize: string; fontWeight?: number; letterSpacing?: string; lineHeight?: number } {
  return { fontFamily: FONT_BODY, fontSize, ...opts };
}
