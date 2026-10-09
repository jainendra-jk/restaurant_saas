import { useEffect, useMemo, useState } from 'react';
import { Download, Copy, QrCode, Check } from 'lucide-react';
import { SliderShell } from './ui/SliderShell';
import { useAuth } from '../context/AuthContext';
import { useMenuConfig } from '../context/MenuConfigContext';
import { supabase } from '../../lib/supabase';
import { getCachedQrByTableId, upsertCachedQrEntries } from '../utils/qrLocalCache';

interface QRCodeSliderProps {
  tableId?: string;
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
  tableId,
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
  const [qrLoading, setQrLoading] = useState(false);
  const [lazyQrBase64, setLazyQrBase64] = useState<string | null>(null);
  const [lazyFetchTried, setLazyFetchTried] = useState(false);

  useEffect(() => {
    if (!tableId || !restaurant?.id || !supabase) return;
    if (storedQrPngBase64?.trim()) return;

    const cached = getCachedQrByTableId(restaurant.id, tableId);
    if (cached) {
      setLazyQrBase64(cached.qrPngBase64);
      setLazyFetchTried(true);
      return;
    }

    let alive = true;
    setQrLoading(true);
    setLazyFetchTried(true);
    // Wrapped in Promise.resolve: the Supabase query builder is a thenable
    // whose .then() is typed PromiseLike<void>, which has no .catch. Chaining
    // .catch directly was a type error and left failure handling unreliable —
    // a rejected fetch could leave the slider spinning forever.
    void Promise.resolve(
      supabase
      .from('tables')
      .select('qr_png_base64')
      .eq('restaurant_id', restaurant.id)
      .eq('id', tableId)
      .maybeSingle()
    )
      .then(({ data }) => {
        if (!alive) return;
        const value = typeof data?.qr_png_base64 === 'string' ? data.qr_png_base64.trim() : '';
        const next = value || null;
        upsertCachedQrEntries(restaurant.id, [
          {
            tableId,
            tableNumber,
            qrPngBase64: next,
            orderUrl: storedOrderUrl ?? null,
          },
        ]);
        setLazyQrBase64(next);
      })
      .catch(() => {
        if (!alive) return;
        upsertCachedQrEntries(restaurant.id, [
          {
            tableId,
            tableNumber,
            qrPngBase64: null,
            orderUrl: storedOrderUrl ?? null,
          },
        ]);
        setLazyQrBase64(null);
      })
      .finally(() => {
        if (!alive) return;
        setQrLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [restaurant?.id, storedOrderUrl, storedQrPngBase64, tableId, tableNumber]);

  const resolvedStoredQr = useMemo(
    () => (storedQrPngBase64?.trim() ? storedQrPngBase64.trim() : lazyQrBase64),
    [storedQrPngBase64, lazyQrBase64]
  );
  const hasStored = Boolean(resolvedStoredQr?.trim());
  const displayUrl = storedOrderUrl?.trim() || orderUrl;
  const displayQrSrc = hasStored
    ? `data:image/png;base64,${resolvedStoredQr!.trim()}`
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
          {qrLoading ? (
            <div className="w-[240px] h-[240px] flex items-center justify-center text-sm text-gray-400">
              Loading QR...
            </div>
          ) : (
            <img
              src={displayQrSrc}
              alt={`QR for Table ${tableNumber}`}
              className="w-[240px] h-[240px]"
            />
          )}
        </div>
        {hasStored && (
          <p className="text-[10px] text-gray-400 mb-2 text-center">Stored QR from database</p>
        )}
        {!hasStored && lazyFetchTried && !qrLoading ? (
          <p className="text-[10px] text-amber-600 mb-2 text-center">
            Stored QR not found. Showing generated fallback preview.
          </p>
        ) : null}

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
