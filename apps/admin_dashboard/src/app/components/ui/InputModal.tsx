import { X } from 'lucide-react';

interface InputModalProps {
  title: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  placeholder?: string;
  confirmLabel?: string;
  /** Disable confirm button */
  confirmDisabled?: boolean;
  /** Optional validation error shown below input */
  error?: string;
}

export function InputModal({
  title,
  label,
  value,
  onChange,
  onConfirm,
  onCancel,
  placeholder,
  confirmLabel = 'Save',
  confirmDisabled = false,
  error,
}: InputModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-gray-900 text-base">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
        <div className="relative">
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !confirmDisabled) onConfirm();
            }}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
        {error && <p className="text-[11px] text-danger mt-1.5">{error}</p>}

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-primary text-white hover:brightness-90 transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
