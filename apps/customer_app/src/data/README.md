# Menu configuration

**File:** `menu-config.json`

Paste your extracted JSON here. The app reads this file and applies **palette** to the theme and builds the menu from **categories** (with nested **items**). Optional **branding** overrides the default restaurant name and messages.

After saving, reload the app (or let the dev server refresh) and the colors, menu, categories, and branding will update.

## Schema

```json
{
  "palette": {
    "primary": "",
    "secondary": "",
    "background": "",
    "accent": ""
  },
  "branding": {
    "restaurantName": "",
    "tagline": "",
    "welcomeMessage": "",
    "preparingMessage": "",
    "orderNumberPrefix": ""
  },
  "categories": [
    {
      "id": "",
      "name": "",
      "items": [
        {
          "id": "",
          "name": "",
          "diet": "veg|nonveg|egg|seafood",
          "description": "",
          "options": ["Choice A", "Choice B"],
          "variants": [
            { "type": "qtr|half|full", "price": 0 }
          ]
        }
      ]
    }
  ]
}
```

- **palette** – Theme colors (hex or CSS color values). Applied to the UI automatically.
- **branding** – Optional. If omitted, default text is used. For PDF receipt content (business name, address, phone, thank-you message), see **bill-config.json** and `src/data/BILL-CONFIG-README.md` — that file is the source of truth for shop-owner-editable bill data.
- **categories** – Each category has `id`, `name`, and `items`. Category tabs use default icons unless extended.
- **items** – `diet` must be one of `veg`, `nonveg`, `egg`, `seafood`. `variants` must include at least one of `qtr`, `half`, `full` with a numeric `price`.
- **options** (optional) – Array of flavor/type choices (e.g. `["Sweet", "Salted", "Mango"]`). When present, the app shows selectable chips and the user must pick one before adding to cart; the choice is stored with the line item (e.g. "Lassi (Mango)"). Items with multiple flavor/type options should use `options` instead of listing them only in `description`.
