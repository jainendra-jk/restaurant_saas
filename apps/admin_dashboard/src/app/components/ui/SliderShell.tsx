import { X } from 'lucide-react';

interface SliderShellProps {
  /** Optional icon element rendered inside a colored circle */
  icon?: React.ReactNode;
  /** Background class for the icon circle, e.g. "bg-primary/10" */
  iconBg?: string;
  title: string;
  subtitle: string;
  onClose: () => void;
  /** Custom close icon (defaults to X). Useful for back navigation. */
  closeIcon?: React.ReactNode;
  children: React.ReactNode;
  /** Optional footer (e.g. SaveButton) rendered below the scrollable body */
  footer?: React.ReactNode;
  /** Optional ref for the scrollable body (e.g. to scroll to top when tab changes) */
  bodyRef?: React.RefObject<HTMLDivElement | null>;
}

export function SliderShell({
  icon,
  iconBg,
  title,
  subtitle,
  onClose,
  closeIcon,
  children,
  footer,
  bodyRef,
}: SliderShellProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          {icon && iconBg && (
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}
            >
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-gray-900">{title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          {closeIcon ?? <X className="w-4 h-4 text-gray-500" />}
        </button>
      </div>

      {/* Scrollable body */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 min-h-0">{children}</div>

      {/* Optional footer */}
      {footer && (
        <div className="p-4 border-t border-gray-100 shrink-0">{footer}</div>
      )}
    </div>
  );
}
