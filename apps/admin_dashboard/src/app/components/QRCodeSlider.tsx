import { useState } from 'react';
import { Download, Copy, QrCode, Check } from 'lucide-react';
import { SliderShell } from './ui/SliderShell';
import { useAuth } from '../context/AuthContext';
import { useMenuConfig } from '../context/MenuConfigContext';

interface QRCodeSliderProps {
  tableNumber: number;
  onClose: () => void;
  /** Number of tables in the restaurant (for API batch generation). */
  totalTableCount: number;
  /** From DB after onboarding or prior generation */
  storedOrderUrl?: string | null;
  storedQrPngBase64?: string | null;
}

const FALLBACK_ORDER_BASE = 'http://localhost:5175';

function slugifyRestaurantName(name: string): string {
  if (!name || typeof name !== 'string') return 'default';
  let s = name.trim().toLowerCase();
  s = s.replace(/[^a-z0-9\s-]/g, '');
  s = s.replace(/[\s_-]+/g, '-');
  s = s.replace(/^-+|-+$/g, '');
  return s || 'default';
}

export function QRCodeSlider({
  tableNumber,
  onClose,
  storedOrderUrl,
  storedQrPngBase64,
}: QRCodeSliderProps) {
  const { restaurant } = useAuth();
  const { branding } = useMenuConfig();
  const base =
    restaurant?.customerAppOrigin?.trim() ||
    import.meta.env.VITE_CUSTOMER_APP_ORIGIN ||
    FALLBACK_ORDER_BASE;
  const slug = restaurant?.slug ?? slugifyRestaurantName(branding.restaurantName);
  const orderUrl = `${base.replace(/\/$/, '')}/order/${slug}/table/${tableNumber}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(orderUrl)}&color=ff6b35`;
  const [copied, setCopied] = useState(false);

  const hasStored = Boolean(storedQrPngBase64?.trim());
  const displayUrl = storedOrderUrl?.trim() || orderUrl;
  const displayQrSrc = hasStored
    ? `data:image/png;base64,${storedQrPngBase64!.trim()}`
    : qrImageUrl;
  const isDataUrl = displayQrSrc.startsWith('data:');

  const handleDownloadQR = async () => {
    try {
      if (isDataUrl) {
        const res = await fetch(displayQrSrc);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-table-${tableNumber}.png`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const res = await fetch(displayQrSrc);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-table-${tableNumber}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(displayQrSrc, '_blank');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = displayUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <SliderShell
      title={`Table ${tableNumber}`}
      subtitle={`QR for Table ${tableNumber}`}
      onClose={onClose}
    >
      <div className="flex flex-col items-center">
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-6 mb-5">
          <img
            src={displayQrSrc}
            alt={`QR for Table ${tableNumber}`}
            className="w-[240px] h-[240px]"
          />
        </div>
        {hasStored && (
          <p className="text-[10px] text-gray-400 mb-2 text-center">Stored QR from database</p>
        )}

        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-5">
          <QrCode className="w-4 h-4" />
          <span className="text-sm">Table {tableNumber}</span>
        </div>

        <div className="w-full bg-gray-50 rounded-xl p-3 mb-5">
          <p className="text-xs text-gray-400 mb-1">Order URL</p>
          <p className="text-sm text-gray-600 break-all">
            {displayUrl.replace(/^https?:\/\//, '')}
          </p>
        </div>

        <div className="w-full space-y-2.5">
          <button
            type="button"
            onClick={handleDownloadQR}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors cursor-pointer text-sm"
          >
            <Download className="w-4 h-4" />
            Download QR Code
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer text-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Link
              </>
            )}
          </button>
        </div>
      </div>
    </SliderShell>
  );
}
