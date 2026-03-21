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
}: SliderLayoutProps) {
  return (
    <div className="flex gap-4 items-start">
      {/* Grid */}
      <div
        className={`flex-1 min-w-0 grid gap-4 transition-all duration-300 ${
          isOpen ? gridColsOpen : gridColsClosed
        }`}
      >
        {children}
      </div>

      {/* Slider Panel */}
      <div
        className={`shrink-0 overflow-hidden transition-all duration-300 ease-in-out sticky ${stickyTop} ${
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
  );
}