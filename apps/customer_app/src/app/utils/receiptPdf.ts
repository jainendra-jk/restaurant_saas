import { jsPDF } from "jspdf";
import type { BillConfig } from "./billConfig";
import { getAppCurrencySymbol } from "../components/shared/menu-data";
import { ensureUnicodeFont, getUnicodeFontName } from "./receiptFont";

// Fixed receipt size and content box: equal left/right margins, all content inside
const RECEIPT_WIDTH_MM = 80;
const MARGIN_MM = 6;
const CONTENT_LEFT_MM = MARGIN_MM;
const CONTENT_RIGHT_MM = RECEIPT_WIDTH_MM - MARGIN_MM;
const CONTENT_WIDTH_MM = CONTENT_RIGHT_MM - CONTENT_LEFT_MM;
/** Extra padding from right edge so numbers don't sit flush */
const RIGHT_PADDING_MM = 1;
/** Reserved width for right-aligned price column (item lines and totals) */
const PRICE_COLUMN_WIDTH_MM = 26;
/** Single receipt font (Roboto), registered in receiptFont.ts */
const RECEIPT_FONT = getUnicodeFontName();
const DOT_PATTERN = [1, 2];

/** Set document font for drawing price text (currency symbol). Always use the receipt font (Roboto). */
function setPriceFont(doc: jsPDF, fontSize: number, style: "normal" | "bold" = "normal") {
  doc.setFont(RECEIPT_FONT, style);
  doc.setFontSize(fontSize);
}
/** Min X for right-aligned price column so numbers stay inside frame */
const PRICE_COLUMN_LEFT_MM = CONTENT_RIGHT_MM - PRICE_COLUMN_WIDTH_MM;

export interface OrderSummaryLine {
  displayName: string;
  portion: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderSummary {
  orderNumber: string;
  placedAt: Date;
  lines: OrderSummaryLine[];
  subTotal: number;
  tax: number;
  taxLines?: Array<{ name: string; percent: number; amount: number }>;
  total: number;
  tableNo?: string;
}

/** Format amount: config-driven symbol only, two decimals, no extra characters. */
function formatMoney(amount: number, symbol: string): string {
  return `${symbol}${amount.toFixed(2)}`;
}

function drawDottedLine(doc: jsPDF, y: number) {
  doc.setLineDashPattern(DOT_PATTERN, 0);
  doc.line(CONTENT_LEFT_MM, y, CONTENT_RIGHT_MM, y);
  doc.setLineDashPattern([], 0);
}

/**
 * X position for right-aligned text: right edge at contentRight - padding.
 * Clamped so the text never starts left of the price column (stays inside frame).
 */
function getRightAlignedX(doc: jsPDF, text: string, fontSize: number): number {
  doc.setFontSize(fontSize);
  const w = doc.getTextWidth(text);
  const x = CONTENT_RIGHT_MM - RIGHT_PADDING_MM - w;
  return Math.max(PRICE_COLUMN_LEFT_MM, x);
}

/** Truncate line so it fits in maxWidthMm; returns string that fits (with optional ellipsis). */
function truncateToWidth(doc: jsPDF, text: string, fontSize: number, maxWidthMm: number): string {
  doc.setFontSize(fontSize);
  const fullW = doc.getTextWidth(text);
  if (fullW <= maxWidthMm) return text;
  const ellipsis = "…";
  const ellipsisW = doc.getTextWidth(ellipsis);
  const maxW = maxWidthMm - ellipsisW;
  let s = text;
  while (s.length > 0 && doc.getTextWidth(s) > maxW) s = s.slice(0, -1);
  return s + ellipsis;
}

/** Wrap text into lines that fit within maxWidthMm (word-boundary wrap). Returns array of lines; full text is shown. */
function wrapToLines(doc: jsPDF, text: string, fontSize: number, maxWidthMm: number): string[] {
  doc.setFontSize(fontSize);
  const lines: string[] = [];
  const words = text.split(/\s+/);
  if (words.length === 0) return lines;
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const next = current + " " + words[i];
    if (doc.getTextWidth(next) <= maxWidthMm) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

/**
 * Generates the PDF receipt. Uses billConfig for address, phone, thank-you, currency.
 * When restaurantName is provided (e.g. from branding.restaurantName), it is used for
 * the header; otherwise bill.businessName is used.
 * Currency symbol is config-driven via menu-config; uses the receipt font for ₹ and other symbols.
 */
export async function generateReceiptPdf(
  summary: OrderSummary,
  bill: BillConfig,
  restaurantName?: string,
  currencySymbol?: string
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: [RECEIPT_WIDTH_MM, 297] });
  const symbol = currencySymbol ?? getAppCurrencySymbol();
  ensureUnicodeFont(doc);
  doc.setFont(RECEIPT_FONT, "normal");

  let y = 14;

  const headerName = (restaurantName ?? bill.businessName)?.trim() ?? "";
  const addressLines = bill.address;
  const phone = bill.phone;
  const thankYou = bill.thankYouMessage;
  const vendorId = bill.vendorId;
  const paymentMethod = bill.defaultPaymentMethod;
  const taxLabel = bill.taxLabel;

  // Header: restaurant name bold, centered (from app branding when provided)
  doc.setFont(RECEIPT_FONT, "bold");
  const fontSizeHeader = 14;
  doc.setFontSize(fontSizeHeader);
  if (headerName) {
    const nameText = truncateToWidth(doc, headerName, fontSizeHeader, CONTENT_WIDTH_MM);
    doc.text(nameText, RECEIPT_WIDTH_MM / 2, y, { align: "center" });
    y += 8;
  }

  doc.setFont(RECEIPT_FONT, "normal");
  doc.setFontSize(9);
  for (const line of addressLines) {
    const lineText = truncateToWidth(doc, line, 9, CONTENT_WIDTH_MM);
    doc.text(lineText, RECEIPT_WIDTH_MM / 2, y, { align: "center" });
    y += 5;
  }
  const phoneText = truncateToWidth(doc, phone, 9, CONTENT_WIDTH_MM);
  doc.text(phoneText, RECEIPT_WIDTH_MM / 2, y, { align: "center" });
  y += 8;

  drawDottedLine(doc, y);
  y += 8;

  // Itemized list: left column wraps to multiple lines so full item names are shown; price on last line
  const itemLeftMaxWidthMm = CONTENT_WIDTH_MM - PRICE_COLUMN_WIDTH_MM - 2;
  const fontSizeItems = 9;
  const fontSizePrice = 8;
  const itemLineHeightMm = 5;
  doc.setFont(RECEIPT_FONT, "normal");
  doc.setFontSize(fontSizeItems);
  for (const line of summary.lines) {
    const leftRaw = `${line.quantity} ${line.displayName} (${line.portion})`;
    const leftLines = wrapToLines(doc, leftRaw, fontSizeItems, itemLeftMaxWidthMm);
    const rightText = formatMoney(line.lineTotal, symbol);
    for (let i = 0; i < leftLines.length; i++) {
      doc.text(leftLines[i], CONTENT_LEFT_MM, y);
      if (i === leftLines.length - 1) {
        setPriceFont(doc, fontSizePrice);
        doc.text(rightText, getRightAlignedX(doc, rightText, fontSizePrice), y);
        doc.setFont(RECEIPT_FONT, "normal");
        doc.setFontSize(fontSizeItems);
      }
      y += itemLineHeightMm;
    }
  }

  y += 4;
  drawDottedLine(doc, y);
  y += 6;

  // Summary: Sub Total, Tax, TOTAL (labels and currency from bill config)
  doc.setFont(RECEIPT_FONT, "normal");
  doc.setFontSize(9);
  doc.text("Sub Total", CONTENT_LEFT_MM, y);
  const subTotalStr = formatMoney(summary.subTotal, symbol);
  setPriceFont(doc, fontSizePrice);
  doc.text(subTotalStr, getRightAlignedX(doc, subTotalStr, fontSizePrice), y);
  doc.setFont(RECEIPT_FONT, "normal");
  doc.setFontSize(9);
  y += 6;
  const taxLines = summary.taxLines?.filter((t) => t.amount > 0) ?? [];
  if (taxLines.length > 0) {
    for (const line of taxLines) {
      doc.text(`${line.name} (${line.percent}%)`, CONTENT_LEFT_MM, y);
      const taxStr = formatMoney(line.amount, symbol);
      setPriceFont(doc, fontSizePrice);
      doc.text(taxStr, getRightAlignedX(doc, taxStr, fontSizePrice), y);
      doc.setFont(RECEIPT_FONT, "normal");
      doc.setFontSize(9);
      y += 6;
    }
  } else if (summary.tax > 0) {
    doc.text(taxLabel, CONTENT_LEFT_MM, y);
    const taxStr = formatMoney(summary.tax, symbol);
    setPriceFont(doc, fontSizePrice);
    doc.text(taxStr, getRightAlignedX(doc, taxStr, fontSizePrice), y);
    doc.setFont(RECEIPT_FONT, "normal");
    doc.setFontSize(9);
    y += 6;
  }

  drawDottedLine(doc, y);
  y += 6;

  doc.setFont(RECEIPT_FONT, "bold");
  doc.setFontSize(10);
  doc.text("TOTAL", CONTENT_LEFT_MM, y);
  const totalStr = formatMoney(summary.total, symbol);
  setPriceFont(doc, 10, "bold");
  doc.text(totalStr, getRightAlignedX(doc, totalStr, 10), y);
  doc.setFont(RECEIPT_FONT, "normal");
  doc.setFontSize(9);
  y += 8;

  drawDottedLine(doc, y);
  y += 8;

  // Payment / transaction
  doc.setFont(RECEIPT_FONT, "normal");
  doc.setFontSize(9);
  doc.text("Paid By:", CONTENT_LEFT_MM, y);
  doc.text(paymentMethod, getRightAlignedX(doc, paymentMethod, 9), y);
  y += 6;

  const dateStr = summary.placedAt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  doc.text(dateStr, CONTENT_LEFT_MM, y);
  y += 6;

  doc.text("Transaction ID:", CONTENT_LEFT_MM, y);
  doc.text(summary.orderNumber, getRightAlignedX(doc, summary.orderNumber, 9), y);
  y += 6;

  doc.text("Vendor ID:", CONTENT_LEFT_MM, y);
  doc.text(vendorId, getRightAlignedX(doc, vendorId, 9), y);
  y += 10;

  drawDottedLine(doc, y);
  y += 8;

  // Footer: thank you from bill config (centered, within content width)
  doc.setFontSize(9);
  const thankYouText = truncateToWidth(doc, thankYou, 9, CONTENT_WIDTH_MM);
  doc.text(thankYouText, RECEIPT_WIDTH_MM / 2, y, { align: "center" });

  doc.save(`Receipt-${summary.orderNumber}.pdf`);
}
