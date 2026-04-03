import { useState, useCallback } from 'react';

interface SaveButtonProps {
  label?: string;
  savedLabel?: string;
  onSave?: () => void | Promise<void>;
  /** When true, button is disabled (e.g. form invalid). */
  disabled?: boolean;
  savingLabel?: string;
  errorMessage?: string | null;
}

/**
 * Save button with async save lifecycle + "Saved!" confirmation state.
 * Parent component handles persistence and passes any errorMessage to display.
 */
export function SaveButton({
  label = 'Save',
  savedLabel = 'Saved!',
  onSave,
  disabled = false,
  savingLabel = 'Saving...',
  errorMessage = null,
}: SaveButtonProps) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled || saved || saving) return;
    setSaving(true);
    Promise.resolve(onSave?.())
      .then(() => {
        setSaved(true);
        const delayMs = 650;
        setTimeout(() => {
          setSaved(false);
        }, delayMs);
      })
      .catch(() => {
        // Parent surfaces save errors; keep button in default state.
      })
      .finally(() => {
        setSaving(false);
      });
  }, [onSave, disabled, saved, saving]);

  return (
    <>
      <button
      type="button"
      onClick={handleClick}
      disabled={saved || disabled || saving}
      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all ${
        saved || saving ? 'cursor-default' : 'cursor-pointer'
      } ${
        saved
          ? 'bg-status-served text-white hover:brightness-90'
          : saving
            ? 'bg-primary/85 text-white'
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
      ) : saving ? (
        savingLabel
      ) : (
        label
      )}
      </button>
      {errorMessage ? <p className="mt-2 text-xs text-danger text-center">{errorMessage}</p> : null}
    </>
  );
}
