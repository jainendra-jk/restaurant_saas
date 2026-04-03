import { useEffect, useState } from 'react';

const PANEL_ANIMATION_MS = 300;
const BACKDROP_ANIMATION_MS = 300;
const PANEL_EASING_CLASS = 'ease-[cubic-bezier(0.4,0,0.2,1)]';
const HIDDEN_TRANSLATE_CLASS = 'translate-x-full';

interface SliderLayoutProps {
  /** The grid of cards/items */
  children: React.ReactNode;
  /** The slider content to render in the right panel */
  sliderContent: React.ReactNode | null;
  /** Whether the slider is currently open */
  isOpen: boolean;
  /** Grid classes when slider is closed. Default: 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' */
  gridColsClosed?: string;
  /** Grid classes when slider is open. Default: 'grid-cols-2' */
  gridColsOpen?: string;
  /** Width of the slider panel. Default: 380 */
  sliderWidth?: number;
  /** Height style for slider container. Default: 'calc(100vh - 140px)' */
  sliderHeight?: string;
  /** Sticky top offset class. Default: 'top-4' */
  stickyTop?: string;
  /** Render sliders as overlay on tablet (`md` to `<lg`) while keeping desktop side panel. */
  tabletOverlay?: boolean;
  /** Called when tablet overlay backdrop is clicked. */
  onOverlayClose?: () => void;
}

export function SliderLayout({
  children,
  sliderContent,
  isOpen,
  gridColsClosed = 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  gridColsOpen = 'grid-cols-2',
  sliderWidth = 380,
  sliderHeight = 'calc(100vh - 140px)',
  stickyTop = 'top-4',
  tabletOverlay = false,
  onOverlayClose,
}: SliderLayoutProps) {
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayHeight, setOverlayHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!tabletOverlay) return;
    if (isOpen) {
      setOverlayMounted(true);
      const frame = window.requestAnimationFrame(() => {
        setOverlayVisible(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }
    setOverlayVisible(false);
    const timeout = window.setTimeout(() => setOverlayMounted(false), PANEL_ANIMATION_MS);
    return () => window.clearTimeout(timeout);
  }, [isOpen, tabletOverlay]);

  useEffect(() => {
    if (!tabletOverlay || !overlayMounted) return;

    const updateViewportHeight = () => {
      const vv = window.visualViewport;
      const next = vv?.height ?? window.innerHeight;
      setOverlayHeight(Math.max(0, Math.round(next)));
    };

    updateViewportHeight();

    const vv = window.visualViewport;
    window.addEventListener('resize', updateViewportHeight);
    vv?.addEventListener('resize', updateViewportHeight);
    vv?.addEventListener('scroll', updateViewportHeight);

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      vv?.removeEventListener('resize', updateViewportHeight);
      vv?.removeEventListener('scroll', updateViewportHeight);
    };
  }, [tabletOverlay, overlayMounted]);

  return (
    <div className="relative">
      <div className="flex gap-4 items-start">
      {/* Grid */}
      <div
        className={`flex-1 min-w-0 grid gap-4 transition-all duration-300 ${
          isOpen && !tabletOverlay ? gridColsOpen : gridColsClosed
        }`}
      >
        {children}
      </div>

      {/* Slider Panel */}
      <div
        className={`hidden lg:block shrink-0 overflow-hidden transition-all duration-300 ease-in-out sticky ${stickyTop} ${
          isOpen ? 'opacity-100' : 'w-0 opacity-0'
        }`}
        style={{
          width: isOpen ? `${sliderWidth}px` : 0,
          height: sliderHeight,
        }}
      >
        <div style={{ width: `${sliderWidth}px` }} className="h-full">
          {sliderContent}
        </div>
      </div>
      </div>

      {overlayMounted ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close slider"
            onClick={onOverlayClose}
            className={`absolute inset-0 bg-black/35 transition-opacity ease-out ${
              overlayVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              transitionDuration: `${BACKDROP_ANIMATION_MS}ms`,
              transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
            }}
          />
          <div
            className={`absolute inset-y-0 right-0 w-full max-w-md p-3 sm:p-4 transform-gpu transition-transform will-change-transform ${PANEL_EASING_CLASS} ${
              overlayVisible ? 'translate-x-0' : HIDDEN_TRANSLATE_CLASS
            }`}
            style={{
              ...(overlayHeight != null ? { height: `${overlayHeight}px` } : {}),
              transitionDuration: `${PANEL_ANIMATION_MS}ms`,
            }}
          >
            <div className="h-full min-h-0">{sliderContent}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}