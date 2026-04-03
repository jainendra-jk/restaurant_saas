import { jsPDF } from 'jspdf';
import type { QrTableEntry } from '@restaurant-saas/api-client';
import type { OnboardingFormData } from './persistOnboarding';

function stripBase64Payload(raw: string): string {
  const t = raw.trim();
  const idx = t.indexOf('base64,');
  return idx >= 0 ? t.slice(idx + 7) : t;
}

function safeFileSlug(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'restaurant';
}

/**
 * One-time welcome pack: in-memory credentials + table QR images.
 * Call immediately after signup + optional QR generation succeeds.
 */
export function downloadOnboardingWelcomePdf(options: {
  formData: OnboardingFormData;
  qrTables: QrTableEntry[];
  restaurantSlug?: string;
  customerAppOrigin?: string | null;
}): void {
  const { formData, qrTables, restaurantSlug, customerAppOrigin } = options;
  const tableCount = Math.min(50, Math.max(1, parseInt(formData.tables, 10) || 5));

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Restaurant setup pack', margin, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(
    'Keep this file private — it contains your dashboard login details.',
    margin,
    y
  );
  doc.setTextColor(0, 0, 0);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Restaurant & account', margin, y);
  y += 8;

  const rows: { label: string; value: string }[] = [
    { label: 'Restaurant name', value: formData.restaurantName },
    { label: 'Owner name', value: formData.ownerName },
    { label: 'Login email', value: formData.email },
    { label: 'Dashboard password', value: formData.password },
    { label: 'Number of tables', value: String(tableCount) },
  ];
  if (customerAppOrigin) {
    rows.push({ label: 'Customer app (origin)', value: customerAppOrigin });
  }
  if (restaurantSlug) {
    rows.push({ label: 'Restaurant slug', value: restaurantSlug });
  }

  doc.setFontSize(10);
  const labelX = margin;
  const valueX = margin + 52;
  const valueMaxW = pageW - valueX - margin;

  for (const { label, value } of rows) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, labelX, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value || '—', valueMaxW);
    doc.text(lines, valueX, y);
    y += Math.max(6, 5 * lines.length) + 2;
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
  }

  y += 6;
  if (y > 240) {
    doc.addPage();
    y = margin;
  }

  if (!qrTables.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Table QR codes', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const msg = doc.splitTextToSize(
      'No QR images were included. If email confirmation is required, confirm your email first. ' +
        'Then open the admin dashboard → Tables, ensure the API is running (VITE_API_BASE_URL), and generate or refresh QRs there.',
      pageW - 2 * margin
    );
    doc.text(msg, margin, y);
  } else {
    const qrSize = 40;
    const colGap = 12;
    const rowGap = 48;
    const startX = margin;
    const PER_PAGE = 6;
    let topBlock = margin;

    for (let i = 0; i < qrTables.length; i++) {
      if (i % PER_PAGE === 0) {
        doc.addPage();
        let headerY = margin;
        if (i === 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('Table QR codes', margin, headerY);
          headerY += 8;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(
            `Each code opens the digital menu for that table (${qrTables.length} total).`,
            margin,
            headerY
          );
          headerY += 10;
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text('Table QR codes (continued)', margin, headerY);
          headerY += 10;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
        }
        topBlock = headerY;
      }

      const entry = qrTables[i];
      const slot = i % PER_PAGE;
      const col = slot % 2;
      const row = Math.floor(slot / 2);
      const x = startX + col * (qrSize + colGap + 48);
      const baseY = topBlock + row * rowGap;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Table ${entry.table_number}`, x, baseY - 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      try {
        const payload = stripBase64Payload(entry.png_base64);
        doc.addImage(payload, 'PNG', x, baseY, qrSize, qrSize);
      } catch {
        doc.setTextColor(200, 0, 0);
        doc.text('(QR image failed to embed)', x, baseY + qrSize / 2);
        doc.setTextColor(0, 0, 0);
      }

      const urlLines = doc.splitTextToSize(entry.url, qrSize + 42);
      doc.text(urlLines, x, baseY + qrSize + 4);
    }
  }

  doc.save(`${safeFileSlug(formData.restaurantName)}-setup-pack.pdf`);
}
