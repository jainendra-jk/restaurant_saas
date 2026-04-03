/** Params from token and legacy order routes. */
export type OrderFlowRouteParams = {
  slug?: string;
  tableNum?: string;
  restaurantSlug?: string;
  tableNumber?: string;
  qrToken?: string;
};

export function getOrderFlowBasePath(params: OrderFlowRouteParams): string {
  if (params.restaurantSlug && params.qrToken) {
    return `/order/${params.restaurantSlug}/t/${params.qrToken}`;
  }
  if (params.slug && params.tableNum) {
    return `/r/${params.slug}/t/${params.tableNum}`;
  }
  if (params.restaurantSlug && params.tableNumber) {
    return `/order/${params.restaurantSlug}/table/${params.tableNumber}`;
  }
  return "";
}

/** Segment after the order-flow base: `''` for index, or e.g. `menu`, `cart`. */
export function segmentAfterOrderBase(pathname: string, base: string): string | undefined {
  if (!base) return undefined;
  const pathNorm = pathname.replace(/\/$/, "") || "/";
  const baseNorm = base.replace(/\/$/, "") || "/";
  if (pathNorm === baseNorm) return "";
  if (!pathNorm.startsWith(`${baseNorm}/`)) return undefined;
  const rest = pathNorm.slice(baseNorm.length + 1);
  return rest.split("/")[0] ?? "";
}
