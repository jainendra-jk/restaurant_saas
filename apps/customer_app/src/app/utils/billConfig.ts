/**
 * Bill / business details config for PDF receipt generation.
 *
 * Source of truth: src/data/bill-config.json (or the API that replaces it).
 * The shopkeeper dashboard will read and write this data so the shop owner can
 * edit business name, address, phone, thank-you message, vendorId, default payment
 * method, and tax label without touching order or menu logic.
 *
 * Currency is now defined in menu-config.json and exposed via helpers in
 * src/app/components/shared/menu-data.tsx, so this module no longer owns currency.
 */

import billConfigJson from "../../data/bill-config.json";

export interface BillConfig {
  businessName: string;
  address: string[];
  phone: string;
  thankYouMessage: string;
  vendorId: string;
  defaultPaymentMethod: string;
  taxLabel: string;
}

const DEFAULTS: BillConfig = {
  businessName: "Restaurant",
  address: ["1234 Main Street", "Suite 567", "City Name, State 54321"],
  phone: "123-456-7890",
  thankYouMessage: "Thank You For Supporting Local Business!",
  vendorId: "—",
  defaultPaymentMethod: "To Pay at Table",
  taxLabel: "GST",
};

const raw = billConfigJson as Partial<BillConfig>;

/** Resolved bill config; currency defaults to INR (₹) when not defined in JSON. */
export const billConfig: BillConfig = {
  businessName: raw.businessName ?? DEFAULTS.businessName,
  address: Array.isArray(raw.address) && raw.address.length > 0 ? raw.address : DEFAULTS.address,
  phone: raw.phone ?? DEFAULTS.phone,
  thankYouMessage: raw.thankYouMessage ?? DEFAULTS.thankYouMessage,
  vendorId: raw.vendorId ?? DEFAULTS.vendorId,
  defaultPaymentMethod: raw.defaultPaymentMethod ?? DEFAULTS.defaultPaymentMethod,
  taxLabel: raw.taxLabel ?? DEFAULTS.taxLabel,
};
