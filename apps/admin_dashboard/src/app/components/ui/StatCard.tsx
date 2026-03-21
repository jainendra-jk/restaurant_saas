interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  /** Tailwind bg + text classes for the icon container */
  color: string;
  /** Optional change badge text, e.g. "+12%" */
  change?: string;
}

export function StatCard({ label, value, icon: Icon, color, change }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        {change && (
          <span className="text-xs text-status-served-text bg-status-served-light px-2 py-0.5 rounded-full">
            {change}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-lg text-gray-900">{value}</p>
    </div>
  );
}
