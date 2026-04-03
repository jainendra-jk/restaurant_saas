import { jsPDF } from 'jspdf';
import type { Order } from '../data/mock-data';
import { formatISODateForBill } from '../utils/helpers';
import {
  ROBOTO_REGULAR_BASE64,
  ROBOTO_BOLD_BASE64,
  UNICODE_FONT_FILENAME,
  UNICODE_FONT_BOLD_FILENAME,
  UNICODE_FONT_NAME,
} from './fonts/robotoBase64';

const W = 80;
const MARGIN = 4;
const FALLBACK_FONT = 'helvetica';
const FONT_SIZE_TITLE = 12;
const FONT_SIZE_NORMAL = 9;
const FONT_SIZE_SMALL = 8;
const LINE_HEIGHT = 5;
const DASH = [2, 2];
const PRICE_WIDTH = 22;
const UNCONFIGURED_ADDRESS_LABEL = 'Address not configured';

export interface TaxRule {
  name: string;
  percent: number;
}

export interface BillBranding {
  restaurantName: string;
  currency: string;
  /** Multi-line address (newline-separated), each line centered */
  address?: string;
  contact?: string;
  /** FSSAI licence number (e.g. 14-digit). Shown on bill when provided. */
  fssaiNumber?: string;
  /** Optional tax rules from profile. If present and non-empty, bill shows Sub Total + each tax line + TOTAL. */
  taxRules?: TaxRule[];
  /** e.g. "To Pay at Table" */
  paidBy?: string;
  vendorId?: string;
  thankYouMessage?: string;
}

function dashedLine(doc: jsPDF, y: number) {
  doc.setLineDashPattern(DASH, 0);
  doc.line(MARGIN, y, W - MARGIN, y);
  doc.setLineDashPattern([], 0);
}

/** Format amount for display; uses 0 if amount is NaN/undefined so the PDF never shows invalid values. */
function formatAmount(amount: number, currency: string): string {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  return `${currency} ${safe.toFixed(2)}`;
}

function registerUnicodeFont(doc: jsPDF): void {
  if (!ROBOTO_REGULAR_BASE64) return;
  try {
    doc.addFileToVFS(UNICODE_FONT_FILENAME, ROBOTO_REGULAR_BASE64);
    doc.addFont(UNICODE_FONT_FILENAME, UNICODE_FONT_NAME, 'normal');
    if (ROBOTO_BOLD_BASE64) {
      doc.addFileToVFS(UNICODE_FONT_BOLD_FILENAME, ROBOTO_BOLD_BASE64);
      doc.addFont(UNICODE_FONT_BOLD_FILENAME, UNICODE_FONT_NAME, 'bold');
    }
  } catch {
    // ignore
  }
}

export function generateCustomerBillPDF(order: Order, branding: BillBranding): jsPDF {
  const currency = (branding.currency || 'Rs.').trim();
  const doc = new jsPDF({ unit: 'mm', format: [W, 297] });
  registerUnicodeFont(doc);
  const fontName = ROBOTO_REGULAR_BASE64 ? UNICODE_FONT_NAME : FALLBACK_FONT;
  const useBold = fontName === FALLBACK_FONT || !!ROBOTO_BOLD_BASE64;
  let y = 10;

  // 1. Header: restaurant name (large, bold)
  doc.setFont(fontName, useBold ? 'bold' : 'normal');
  doc.setFontSize(FONT_SIZE_TITLE);
  doc.text(branding.restaurantName, W / 2, y, { align: 'center' });
  y += LINE_HEIGHT + 2;

  // Address: multiple lines, centered (neutral fallback if none)
  doc.setFont(fontName, 'normal');
  doc.setFontSize(FONT_SIZE_SMALL);
  const addressLines = branding.address
    ? branding.address.split(/\n/).map((s) => s.trim()).filter(Boolean)
    : [UNCONFIGURED_ADDRESS_LABEL];
  for (const addrLine of addressLines) {
    doc.text(addrLine, W / 2, y, { align: 'center', maxWidth: W - 2 * MARGIN });
    y += LINE_HEIGHT;
  }
  if (branding.contact?.trim()) {
    doc.text(branding.contact.trim(), W / 2, y, { align: 'center' });
    y += LINE_HEIGHT;
  }
  if (branding.fssaiNumber?.trim()) {
    doc.text(`FSSAI No.: ${branding.fssaiNumber.trim()}`, W / 2, y, { align: 'center' });
    y += LINE_HEIGHT;
  }
  y += 2;
  dashedLine(doc, y);
  y += LINE_HEIGHT;

  // 3. Itemized list: left = qty + name (portion), right = price (currency + 2 decimals)
  doc.setFont(fontName, 'normal');
  doc.setFontSize(FONT_SIZE_NORMAL);
  const itemTextWidth = W - 2 * MARGIN - PRICE_WIDTH - 2;
  for (const line of order.lines) {
    const itemLine = `${line.quantity} ${line.displayName}${line.portion ? ` (${line.portion})` : ''}${line.selectedOption ? ` - ${line.selectedOption}` : ''}`;
    const split = doc.splitTextToSize(itemLine, itemTextWidth);
    doc.text(split, MARGIN, y);
    const priceY = y + (split.length - 1) * LINE_HEIGHT;
    doc.text(formatAmount(line.lineTotal, currency), W - MARGIN, priceY, { align: 'right' });
    y += split.length * LINE_HEIGHT;
  }
  y += 2;
  dashedLine(doc, y);
  y += LINE_HEIGHT;

  // 5. Summary: Sub Total, optional profile tax lines, TOTAL
  // Only show tax rows when the rule is actually configured (non-empty name + percent > 0).
  // This prevents displaying 0% "tax" sections when the shopkeeper hasn't filled tax values.
  const taxRules =
    branding.taxRules?.filter(
      (r) => r.name.trim() !== '' && Number.isFinite(r.percent) && r.percent > 0
    ) ?? [];
  const useTaxRules = taxRules.length > 0;

  const subTotalAmount = Number.isFinite(order.subTotal) ? order.subTotal : 0;

  doc.text('Sub Total', MARGIN, y);
  doc.text(formatAmount(subTotalAmount, currency), W - MARGIN, y, { align: 'right' });
  y += LINE_HEIGHT;

  if (useTaxRules) {
    let taxTotal = 0;
    for (const rule of taxRules) {
      const amount = Math.round(subTotalAmount * (rule.percent / 100) * 100) / 100;
      taxTotal += amount;
      const label = rule.name.trim() || 'Tax';
      doc.text(label, MARGIN, y);
      doc.text(formatAmount(amount, currency), W - MARGIN, y, { align: 'right' });
      y += LINE_HEIGHT;
    }
    dashedLine(doc, y);
    y += LINE_HEIGHT;
    doc.setFont(fontName, useBold ? 'bold' : 'normal');
    doc.text('TOTAL', MARGIN, y);
    doc.text(formatAmount(subTotalAmount + taxTotal, currency), W - MARGIN, y, { align: 'right' });
    doc.setFont(fontName, 'normal');
  } else {
    const totalAmount = subTotalAmount;
    dashedLine(doc, y);
    y += LINE_HEIGHT;
    doc.setFont(fontName, useBold ? 'bold' : 'normal');
    doc.text('TOTAL', MARGIN, y);
    doc.text(formatAmount(totalAmount, currency), W - MARGIN, y, { align: 'right' });
    doc.setFont(fontName, 'normal');
  }

  y += LINE_HEIGHT + 2;
  dashedLine(doc, y);
  y += LINE_HEIGHT;

  // 9. Payment / transaction
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('Paid By:', MARGIN, y);
  doc.text(branding.paidBy ?? 'To Pay at Table', W - MARGIN, y, { align: 'right' });
  y += LINE_HEIGHT;
  doc.text(formatISODateForBill(order.placedAt), MARGIN, y);
  y += LINE_HEIGHT;
  doc.text('Transaction ID:', MARGIN, y);
  doc.text(order.orderNumber, W - MARGIN, y, { align: 'right' });
  y += LINE_HEIGHT;
  doc.text('Vendor ID:', MARGIN, y);
  doc.text(branding.vendorId ?? '—', W - MARGIN, y, { align: 'right' });
  y += LINE_HEIGHT + 2;
  dashedLine(doc, y);
  y += LINE_HEIGHT;

  // 11. Footer (centered)
  doc.text(branding.thankYouMessage ?? 'Thank You For Supporting Local Business!', W / 2, y, {
    align: 'center',
    maxWidth: W - 2 * MARGIN,
  });

  return doc;
}

export function downloadCustomerBill(order: Order, branding: BillBranding): void {
  const doc = generateCustomerBillPDF(order, branding);
  doc.save(`bill-${order.orderNumber}.pdf`);
}
