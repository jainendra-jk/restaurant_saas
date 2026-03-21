import React from "react";

interface ArchFrameProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** Kept for future reuse; currently only ArchHeader and BotanicalDecor are used. */
export function ArchFrame({ children, className = "", style }: ArchFrameProps) {
  return (
    <div className={`relative ${className}`} style={style}>
      <svg
        viewBox="0 0 300 40"
        className="w-full h-auto"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 40 L0 20 Q0 0 20 0 L280 0 Q300 0 300 20 L300 40"
          fill="var(--card)"
          stroke="var(--primary)"
          strokeWidth="0.5"
          strokeOpacity="0.3"
        />
      </svg>
      <div
        className="bg-card border-x border-b border-primary/10 rounded-b-lg px-4 pb-5 -mt-[1px]"
      >
        {children}
      </div>
    </div>
  );
}

export function ArchHeader({ children, className = "", style }: ArchFrameProps) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <div className="absolute inset-0">
        <svg
          viewBox="0 0 390 200"
          className="w-full h-full"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 200 L0 60 Q195 -20 390 60 L390 200 Z"
            fill="var(--primary)"
            fillOpacity="0.08"
          />
        </svg>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function BotanicalDecor({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`opacity-[0.08] ${className}`}
      fill="none"
      stroke="var(--secondary)"
      strokeWidth="0.8"
    >
      <path d="M60 110 C60 110 60 60 60 30 Q60 10 40 20 Q20 30 60 60" />
      <path d="M60 110 C60 110 60 60 60 30 Q60 10 80 20 Q100 30 60 60" />
      <path d="M60 70 Q40 50 30 60 Q20 70 60 70" />
      <path d="M60 70 Q80 50 90 60 Q100 70 60 70" />
      <path d="M60 90 Q45 75 35 82 Q28 90 60 90" />
      <path d="M60 90 Q75 75 85 82 Q92 90 60 90" />
    </svg>
  );
}