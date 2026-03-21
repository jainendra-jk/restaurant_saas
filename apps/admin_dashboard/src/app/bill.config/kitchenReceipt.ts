/**
 * Kitchen receipt PDF — NO pricing, NO payment method.
 * Only: restaurant name, food items (quantity × name, optional portion), special instructions, date/time, table no, order no.
 */
import { jsPDF } from 'jspdf';
import type { Order } from '../data/mock-data';
import { formatISODateForBill } from '../utils/helpers';

const W = 80;
const MARGIN = 4;
const FONT = 'helvetica';
const FONT_SIZE_TITLE = 12;
const FONT_SIZE_NORMAL = 9;
const FONT_SIZE_SMALL = 8;
const LINE_HEIGHT = 5;
const DASH = [2, 2];
const CHECKBOX_SIZE = 3.5;
const ITEM_TEXT_WIDTH = W - 2 * MARGIN - CHECKBOX_SIZE - 2;

function dashedLine(doc: jsPDF, y: number) {
  doc.setLineDashPattern(DASH, 0);
  doc.line(MARGIN, y, W - MARGIN, y);
  doc.setLineDashPattern([], 0);
}

export function generateKitchenReceiptPDF(order: Order, restaurantName: string): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: [W, 297] });
  let y = 10;

  doc.setFont(FONT, 'bold');
  doc.setFontSize(FONT_SIZE_TITLE);
  doc.text(restaurantName, W / 2, y, { align: 'center' });
  y += LINE_HEIGHT + 2;
  dashedLine(doc, y);
  y += LINE_HEIGHT;

  doc.setFont(FONT, 'normal');
  doc.setFontSize(FONT_SIZE_NORMAL);
  doc.text(`Order No: ${order.orderNumber}`, MARGIN, y);
  y += LINE_HEIGHT;
  doc.text(`Table: ${order.tableNo}`, MARGIN, y);
  y += LINE_HEIGHT;
  doc.text(`Time: ${formatISODateForBill(order.placedAt)}`, MARGIN, y);
  y += LINE_HEIGHT + 2;
  dashedLine(doc, y);
  y += LINE_HEIGHT;

  doc.text('ITEMS', MARGIN, y);
  y += LINE_HEIGHT;
  doc.setFont(FONT, 'bold');
  for (const line of order.lines) {
    const itemLine = `${line.quantity} x ${line.displayName}${line.portion ? ` (${line.portion})` : ''}${line.selectedOption ? ` - ${line.selectedOption}` : ''}`;
    const split = doc.splitTextToSize(itemLine, ITEM_TEXT_WIDTH);
    doc.text(split, MARGIN, y);
    const boxY = y - (CHECKBOX_SIZE * 0.85);
    doc.rect(W - MARGIN - CHECKBOX_SIZE, boxY, CHECKBOX_SIZE, CHECKBOX_SIZE);
    y += split.length * LINE_HEIGHT;
  }
  doc.setFont(FONT, 'normal');
  y += 2;
  dashedLine(doc, y);
  y += LINE_HEIGHT;

  if (order.specialInstructions) {
    doc.setFontSize(FONT_SIZE_SMALL);
    doc.text('Special instructions:', MARGIN, y);
    y += LINE_HEIGHT;
    const split = doc.splitTextToSize(order.specialInstructions, W - 2 * MARGIN);
    doc.text(split, MARGIN, y);
    y += split.length * LINE_HEIGHT + 2;
    dashedLine(doc, y);
    y += LINE_HEIGHT;
    doc.setFontSize(FONT_SIZE_NORMAL);
  }

  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('--- Kitchen ---', W / 2, y, { align: 'center' });

  return doc;
}

export function downloadKitchenReceipt(order: Order, restaurantName: string): void {
  const doc = generateKitchenReceiptPDF(order, restaurantName);
  doc.save(`kitchen-${order.orderNumber}.pdf`);
}
