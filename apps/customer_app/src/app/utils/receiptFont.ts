import type { jsPDF } from "jspdf";
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from "./receiptFontData";

const RECEIPT_FONT_NAME = "Roboto";

/**
 * Registers the local Roboto font with jsPDF so that "₹" and other Unicode
 * characters render correctly. All font data comes from local base64 strings;
 * there are no runtime fetches or CDN requests.
 */
export function ensureUnicodeFont(doc: jsPDF): void {
  const anyDoc = doc as unknown as { __receiptFontLoaded?: boolean };
  if (anyDoc.__receiptFontLoaded) return;

  if (ROBOTO_REGULAR_BASE64) {
    doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_BASE64);
    doc.addFont("Roboto-Regular.ttf", RECEIPT_FONT_NAME, "normal");
  }
  if (ROBOTO_BOLD_BASE64) {
    doc.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD_BASE64);
    doc.addFont("Roboto-Bold.ttf", RECEIPT_FONT_NAME, "bold");
  }

  anyDoc.__receiptFontLoaded = true;
}

export function getUnicodeFontName(): string {
  return RECEIPT_FONT_NAME;
}

