import { useState } from 'react';
import { Download, QrCode, Store } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { TableCard } from '../components/TableCard';
import { OrderSlider } from '../components/OrderSlider';
import { QRCodeSlider } from '../components/QRCodeSlider';
import { useOrders } from '../context/OrdersContext';
import { useRestaurantProfile } from '../context/RestaurantProfileContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { SliderLayout } from '../components/ui/SliderLayout';
import { AdminTablesSkeleton } from '../components/AppSkeletons';
import { supabase } from '../../lib/supabase';
import { getCachedQrByTableId, upsertCachedQrEntries } from '../utils/qrLocalCache';

type SliderState = { type: 'orders' | 'qr'; tableNumber: number } | null;

export function Tables() {
  const { orders, tables, updateTableStatus, updateTableSeats, initialLoading } = useOrders();
  const { profile, saveProfile } = useRestaurantProfile();
  const { restaurant } = useAuth();
  const [slider, setSlider] = useState<SliderState>(null);
  const [showOpenShopOverlay, setShowOpenShopOverlay] = useState(false);
  const [openingShop, setOpeningShop] = useState(false);
  const [showDownloadAllQrOverlay, setShowDownloadAllQrOverlay] = useState(false);
  const [downloadingAllQrs, setDownloadingAllQrs] = useState(false);
  const persistedShopOpen = profile?.isOpen ?? restaurant?.isOpen ?? true;

  const handleToggle = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const nextStatus = table.status === 'active' ? 'inactive' : 'active';
    if (nextStatus === 'active' && !persistedShopOpen) {
      setShowOpenShopOverlay(true);
      return;
    }

    updateTableStatus(tableId, nextStatus);
  };

  const handleUpdateSeats = (tableId: string, newSeatCount: number) => {
    updateTableSeats(tableId, newSeatCount);
  };

  const handleOpenSlider = (type: 'orders' | 'qr', tableNumber: number) => {
    setSlider((prev) =>
      prev?.type === type && prev.tableNumber === tableNumber
        ? null
        : { type, tableNumber }
    );
  };

  const getActiveOrderCount = (tableNumber: number) =>
    orders.filter((o) => o.tableNo === String(tableNumber)).length;

  const activeTables = tables.filter((t) => t.status === 'active').length;
  const inactiveTables = tables.filter((t) => t.status === 'inactive').length;
  const isSliderOpen = slider !== null;

  const handleOpenShopOnly = async () => {
    if (!profile) {
      toast.error('Restaurant profile is unavailable.');
      return;
    }
    try {
      setOpeningShop(true);
      await saveProfile({ ...profile, isOpen: true });
      setShowOpenShopOverlay(false);
      toast.success('Shop opened. Table statuses restored.', { closeButton: false });
    } catch (error) {
      console.error('Failed to open shop from tables overlay', error);
      toast.error('Unable to open shop right now.');
    } finally {
      setOpeningShop(false);
    }
  };

  const buildOrderUrl = (tableNumber: number): string => {
    const base =
      restaurant?.customerAppOrigin?.trim() ||
      import.meta.env.VITE_CUSTOMER_APP_ORIGIN ||
      'http://localhost:5175';
    const slug = restaurant?.slug?.trim() || 'default';
    return `${base.replace(/\/$/, '')}/order/${slug}/table/${tableNumber}`;
  };

  const buildFallbackQrUrl = (tableNumber: number): string => {
    const orderUrl = buildOrderUrl(tableNumber);
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(orderUrl)}&color=ff6b35`;
  };

  const getStoredQrForTable = async (tableId: string, existing?: string | null): Promise<string | null> => {
    const existingTrimmed = existing?.trim() ?? '';
    if (existingTrimmed) return existingTrimmed;
    if (restaurant?.id) {
      const cached = getCachedQrByTableId(restaurant.id, tableId);
      if (cached) return cached.qrPngBase64;
    }
    if (!supabase || !restaurant?.id) return null;
    const { data } = await supabase
      .from('tables')
      .select('qr_png_base64')
      .eq('restaurant_id', restaurant.id)
      .eq('id', tableId)
      .maybeSingle();
    const value = typeof data?.qr_png_base64 === 'string' ? data.qr_png_base64.trim() : '';
    const next = value || null;
    const tableNumber = tables.find((t) => t.id === tableId)?.number ?? 0;
    upsertCachedQrEntries(restaurant.id, [
      {
        tableId,
        tableNumber,
        qrPngBase64: next,
        orderUrl: tables.find((t) => t.id === tableId)?.orderUrl ?? null,
      },
    ]);
    return next;
  };

  const toQrBlob = async (tableNumber: number, storedQrPngBase64?: string | null): Promise<Blob> => {
    const trimmed = storedQrPngBase64?.trim();
    if (trimmed) {
      const res = await fetch(`data:image/png;base64,${trimmed}`);
      if (!res.ok) throw new Error(`Failed to decode stored QR for table ${tableNumber}`);
      return res.blob();
    }

    const fallbackUrl = buildFallbackQrUrl(tableNumber);
    const res = await fetch(fallbackUrl);
    if (!res.ok) throw new Error(`Failed to fetch fallback QR for table ${tableNumber}`);
    return res.blob();
  };

  const handleDownloadAllQrsZip = async () => {
    if (!tables.length) {
      toast.error('No tables found for QR export.');
      return;
    }
    setDownloadingAllQrs(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('qrs');
      let success = 0;
      let failed = 0;

      for (const table of tables) {
        try {
          const storedQr = await getStoredQrForTable(table.id, table.qrPngBase64);
          const blob = await toQrBlob(table.number, storedQr);
          const bytes = await blob.arrayBuffer();
          folder?.file(`table-${table.number}.png`, bytes);
          success += 1;
        } catch (err) {
          failed += 1;
          console.warn('Failed to include table QR in ZIP', { tableNumber: table.number, err });
        }
      }

      if (success === 0) {
        toast.error('Could not prepare any QR PNGs for download.');
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const fileName = `${restaurant?.slug?.trim() || 'table'}-qrs.zip`;
      saveAs(zipBlob, fileName);

      if (failed > 0) {
        toast.warning(`Downloaded ${success} QR codes, ${failed} failed.`);
      } else {
        toast.success(`Downloaded ${success} QR codes as ZIP.`);
      }
    } catch (err) {
      console.error('Failed to download QR ZIP', err);
      toast.error('Unable to download QR ZIP right now.');
    } finally {
      setDownloadingAllQrs(false);
      setShowDownloadAllQrOverlay(false);
    }
  };

  if (initialLoading) {
    return <AdminTablesSkeleton />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Table Management"
        subtitle={`${activeTables} active · ${inactiveTables} inactive · ${tables.length} total`}
      />

      <SliderLayout
        isOpen={isSliderOpen}
        tabletOverlay
        onOverlayClose={() => setSlider(null)}
        gridColsClosed="grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        gridColsOpen="grid-cols-2"
        sliderWidth={360}
        sliderHeight="calc(100vh - 140px)"
        sliderContent={
          slider?.type === 'orders' ? (
            <OrderSlider
              tableNumber={slider.tableNumber}
              orders={orders}
              onClose={() => setSlider(null)}
            />
          ) : slider?.type === 'qr' ? (
            <QRCodeSlider
              tableId={tables.find((t) => t.number === slider.tableNumber)?.id}
              tableNumber={slider.tableNumber}
              onClose={() => setSlider(null)}
              totalTableCount={Math.max(1, tables.length)}
              storedOrderUrl={tables.find((t) => t.number === slider.tableNumber)?.orderUrl}
              storedQrPngBase64={tables.find((t) => t.number === slider.tableNumber)?.qrPngBase64}
            />
          ) : null
        }
      >
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            activeOrderCount={getActiveOrderCount(table.number)}
            onToggle={handleToggle}
            onViewOrders={(num) => handleOpenSlider('orders', num)}
            onViewQR={(num) => handleOpenSlider('qr', num)}
            onUpdateSeats={handleUpdateSeats}
            isSelected={slider?.tableNumber === table.number}
            selectedType={slider?.tableNumber === table.number ? slider.type : null}
          />
        ))}
      </SliderLayout>

      <button
        type="button"
        onClick={() => setShowDownloadAllQrOverlay(true)}
        className={`group fixed bottom-8 right-10 z-20 flex items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all duration-300 cursor-pointer ${
          downloadingAllQrs ? 'h-12 w-44 px-4' : 'w-12 h-12 hover:w-44'
        }`}
        title="Download all QRs"
        aria-label={downloadingAllQrs ? 'Preparing QR ZIP' : 'Download all QRs'}
      >
        <QrCode className="w-4 h-4 flex-shrink-0" />
        <span
          className={`overflow-hidden whitespace-nowrap text-sm transition-all duration-300 ${
            downloadingAllQrs
              ? 'max-w-40 opacity-100 ml-2'
              : 'max-w-0 opacity-0 ml-0 group-hover:max-w-40 group-hover:opacity-100 group-hover:ml-2'
          }`}
        >
          {downloadingAllQrs ? 'Preparing ZIP...' : 'Download All QRs'}
        </span>
      </button>

      {showOpenShopOverlay ? (
        <ConfirmModal
          icon={<Store className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          title="Shop is closed"
          description="Open shop first to activate tables."
          confirmLabel={openingShop ? 'Opening...' : 'Open Shop'}
          cancelLabel="Cancel"
          confirmClassName="bg-primary text-white hover:brightness-95"
          onConfirm={() => {
            if (openingShop) return;
            void handleOpenShopOnly();
          }}
          onCancel={() => {
            if (openingShop) return;
            setShowOpenShopOverlay(false);
          }}
        />
      ) : null}

      {showDownloadAllQrOverlay ? (
        <ConfirmModal
          icon={<Download className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          title="Download all QR codes?"
          description="This will download QR PNGs for all tables in a single ZIP file."
          confirmLabel={downloadingAllQrs ? 'Preparing ZIP...' : 'Download ZIP'}
          cancelLabel="Cancel"
          confirmClassName="bg-primary text-white hover:brightness-95"
          onConfirm={() => {
            if (downloadingAllQrs) return;
            void handleDownloadAllQrsZip();
          }}
          onCancel={() => {
            if (downloadingAllQrs) return;
            setShowDownloadAllQrOverlay(false);
          }}
        />
      ) : null}
    </div>
  );
}
