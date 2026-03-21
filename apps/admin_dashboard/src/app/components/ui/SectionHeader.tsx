interface SectionHeaderProps {
  icon?: React.ElementType;
  label: string;
  /** Tailwind bg + text classes for the icon container, e.g. "bg-primary/10 text-primary" */
  color?: string;
}

export function SectionHeader({
  icon: Icon,
  label,
  color = 'bg-primary/10 text-primary',
}: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      {Icon && (
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
      )}
      <h4 className="text-sm text-gray-900">{label}</h4>
    </div>
  );
}
