import type { DietType } from "./menu-data";

function getDietColors(diet: DietType): { border: string; fill: string } {
  switch (diet) {
    case "veg":
      return { border: "border-green-600", fill: "bg-green-600" };
    case "egg":
      return { border: "border-amber-500", fill: "bg-amber-500" };
    case "nonveg":
    case "seafood":
    default:
      return { border: "border-red-500", fill: "bg-red-500" };
  }
}

export function DietIndicator({ diet }: { diet: DietType }) {
  const { border, fill } = getDietColors(diet);
  return (
    <div
      className={`w-5 h-5 min-w-5 min-h-5 shrink-0 rounded-[4px] border-[1.5px] flex items-center justify-center ${border}`}
      aria-hidden="true"
    >
      <div className={`w-2.5 h-2.5 rounded-full ${fill}`} />
    </div>
  );
}
