interface EmptyStateProps {
  title: string;
  subtitle?: string;
  /** Optional icon rendered above the title */
  icon?: React.ReactNode;
}

export function EmptyState({ title, subtitle, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 text-gray-400">
      {icon && <div className="mb-3 opacity-30">{icon}</div>}
      <p className="text-lg">{title}</p>
      {subtitle && <p className="text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
