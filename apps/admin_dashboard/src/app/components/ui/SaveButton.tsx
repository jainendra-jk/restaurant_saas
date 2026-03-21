import { useState, useCallback } from 'react';

interface SaveButtonProps {
  label?: string;
  savedLabel?: string;
  onSave?: () => void;
  /** When true, button is disabled (e.g. form invalid). */
  disabled?: boolean;
}

/**
 * Save button that shows "Saved" + tick for ~650ms before calling onSave.
 * Use in sliders: onSave can do persist + onClose(); the delay ensures the user
 * sees the confirmation before the slider closes. Disabled while in saved state.
 */
export function SaveButton({
  label = 'Save',
  savedLabel = 'Saved!',
  onSave,
  disabled = false,
}: SaveButtonProps) {
  const [saved, setSaved] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled) return;
    setSaved(true);
    const delayMs = 650;
    setTimeout(() => {
      onSave?.();
    }, delayMs);
  }, [onSave, disabled]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saved || disabled}
      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all ${
        saved ? 'cursor-default' : 'cursor-pointer'
      } ${
        saved
          ? 'bg-status-served text-white hover:brightness-90'
          : 'bg-primary text-white hover:brightness-90'
      }`}
    >
      {saved ? (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          {savedLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}
