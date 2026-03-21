# Bill PDF fonts

The customer bill PDF uses Unicode-capable Roboto fonts so that `branding.currency` (e.g. **₹**) renders correctly and the restaurant name and TOTAL line appear in bold. jsPDF’s default Helvetica does not support these characters.

## Generate the fonts (recommended)

From the project root, run:

```bash
node scripts/generate-bill-font.mjs
```
or
```bash
npm run generate-bill-font
```

This downloads `Roboto-Regular.ttf` and `Roboto-Bold.ttf` and writes their base64 into `robotoBase64.ts`. After that, the bill uses Roboto for all text (bold for restaurant name and TOTAL line) and displays the currency symbol from config.

## Manual setup

If the script fails (e.g. network or repo URL change):

1. Download [Roboto](https://fonts.google.com/specimen/Roboto) (TTF: Regular and Bold).
2. Use the [jsPDF font converter](https://raw.githack.com/nicklockwood/jsPDF/master/fontconverter/fontconverter.html) to convert each TTF to base64.
3. Put the base64 strings into `robotoBase64.ts` as `ROBOTO_REGULAR_BASE64` and `ROBOTO_BOLD_BASE64`.

With `ROBOTO_REGULAR_BASE64` empty, the bill falls back to Helvetica; the currency symbol may not render. With only the regular font (no bold), the restaurant name and TOTAL line use normal weight when using Roboto.
