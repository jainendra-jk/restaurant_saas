# Bill / business details config

**File:** `bill-config.json`

This file is the **source of truth for shop-owner-editable bill data**. All content used for PDF receipt generation (business name, address, phone, thank-you message, payment method, etc.) comes from here. The shopkeeper dashboard (to be built) will read and write this file (or an API that backs it) so the owner can change business details and bill settings without touching order or menu logic.

- **PDF generation** depends only on this config; it does not hardcode address, name, or thank-you text.
- **Default content** ships with placeholder values so the bill looks correct out of the box. The dashboard can overwrite or edit this file later.

## Schema

| Field | Type | Description |
|-------|------|-------------|
| `businessName` | string | Shown in the PDF header (bold, centered). |
| `address` | string[] | Address lines, each centered (e.g. `["1234 Main Street", "Suite 567", "City Name, State 54321"]`). |
| `phone` | string | Phone number, centered below address. |
| `thankYouMessage` | string | Footer message (e.g. "Thank You For Supporting Local Business!"). |
| `vendorId` | string | Shown on receipt (e.g. "—" or "VND-001"). |
| `defaultPaymentMethod` | string | e.g. "To Pay at Table". |
| `currency` | string | Currency symbol or code: use the symbol (e.g. "₹", "$", "£") or a code (e.g. "INR", "USD"); codes are mapped to symbols (INR→₹, USD→$, GBP→£, EUR→€). |
| `countryCode` | string | Optional. Two-letter country code (e.g. "IN", "US") used to derive the currency symbol when `currency` is not a symbol. IN→₹, US→$, etc. Default "IN" for India. |
| `taxLabel` | string | Tax line label (e.g. "GST", "Sales Tax"). |

Missing fields fall back to sensible defaults in the app so the bill still generates. When the business is in India (or `currency` is "₹"/"INR"), the receipt uses the Indian rupee symbol (₹); a Unicode-capable font is loaded so it renders correctly.

## Extensibility

The schema can be extended with more fields (e.g. logo URL, tax rate, receipt title) as the dashboard evolves. The PDF code reads only the fields it needs from this config.
