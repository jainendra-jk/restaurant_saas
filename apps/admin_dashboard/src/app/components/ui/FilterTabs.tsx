interface FilterTab<T extends string> {
  label: string;
  value: T;
}

interface FilterTabsProps<T extends string> {
  tabs: FilterTab<T>[];
  activeValue: T;
  onSelect: (value: T) => void;
  /** Function that returns the count for a given tab value */
  getCount: (value: T) => number;
}

export function FilterTabs<T extends string>({
  tabs,
  activeValue,
  onSelect,
  getCount,
}: FilterTabsProps<T>) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = activeValue === tab.value;
        const count = getCount(tab.value);
        return (
          <button
            key={tab.value}
            onClick={() => onSelect(tab.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-colors cursor-pointer ${
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-white/20' : 'bg-gray-100'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
