interface FormFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  /** When true, the field takes flex-1 to share a row with another field */
  half?: boolean;
  /** Optional blur handler (e.g. for formatting time on blur) */
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  half,
  onBlur,
}: FormFieldProps) {
  const inputClass =
    'form-field-input w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';

  return (
    <div className={half ? 'flex-1 min-w-0' : ''}>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}
