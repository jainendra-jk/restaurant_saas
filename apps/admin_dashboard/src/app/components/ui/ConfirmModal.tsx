import { X } from 'lucide-react';

interface ConfirmModalProps {
  /** Icon element rendered inside the colored circle */
  icon: React.ReactNode;
  /** Background class for the icon circle */
  iconBg?: string;
  title: string;
  /** Rich description — can be a ReactNode */
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Tailwind classes for the confirm button */
  confirmClassName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  icon,
  iconBg = 'bg-danger-light',
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmClassName = 'bg-danger text-white hover:brightness-90',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}
            >
              {icon}
            </div>
            <h3 className="text-gray-900 text-base">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="mb-6 text-sm text-gray-500">{description}</div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-sm ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
