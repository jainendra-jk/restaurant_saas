import type { OrderStatus } from '../data/mock-data';
import { STATUS_CONFIG } from '../utils/helpers';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${config.bg} ${config.text} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} ${status === 'new' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}
