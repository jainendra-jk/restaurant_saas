import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const baseUrl = process.env.BASE_URL ?? 'http://localhost:5173';
const outDir = argValue('--out') ?? 'ui-baseline';
const settingsOnly = process.argv.includes('--settings-only');

const routes = [
  { name: 'dashboard', url: `${baseUrl}/` },
  { name: 'orders', url: `${baseUrl}/orders` },
  { name: 'tables', url: `${baseUrl}/tables` },
  { name: 'menu', url: `${baseUrl}/menu` },
  { name: 'settings', url: `${baseUrl}/settings` },
  { name: 'login', url: `${baseUrl}/login` },
];

const settingsSections = [
  { id: 'profile', title: 'Restaurant Profile' },
  { id: 'notifications', title: 'Notifications' },
  { id: 'payments', title: 'Payments' },
  { id: 'appearance', title: 'Appearance' },
  { id: 'security', title: 'Security' },
  { id: 'help', title: 'Help & Support' },
  { id: 'tutorials', title: 'Tutorials' },
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function gotoStable(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Stabilize rendering: disable animations/transitions, wait for fonts.
  await page.addStyleTag({
    content: `
      *, *::before, *::after { 
        transition: none !important; 
        animation: none !important; 
        caret-color: transparent !important;
        scroll-behavior: auto !important;
      }
    `,
  });
  await page
    .waitForFunction(() => (document.fonts ? document.fonts.status === 'loaded' : true), null, {
      timeout: 10_000,
    })
    .catch(() => {});
  // Give React a moment to settle.
  await page.waitForTimeout(250);
}

async function screenshot(page, fileName) {
  const filePath = path.join(outDir, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// Stabilize screenshots: reduce nondeterminism (time, randomness).
await context.addInitScript(() => {
  const FIXED_NOW = 1760000000000; // stable epoch ms

  const RealDate = globalThis.Date;
  // eslint-disable-next-line no-global-assign
  Date = class extends RealDate {
    constructor(...args) {
      // @ts-ignore
      if (args.length === 0) return new RealDate(FIXED_NOW);
      // @ts-ignore
      return new RealDate(...args);
    }
    static now() {
      return FIXED_NOW;
    }
  };

  Math.random = () => 0.123456789;
});
const page = await context.newPage();

await ensureDir(outDir);

const saved = [];

try {
  if (!settingsOnly) {
    for (const r of routes) {
      await gotoStable(page, r.url);
      saved.push(await screenshot(page, `${r.name}.png`));
    }
  }

  // Settings: click through each card to open its slider.
  await gotoStable(page, `${baseUrl}/settings`);
  saved.push(await screenshot(page, `settings-grid.png`));

  for (const section of settingsSections) {
    // The accessible button name can include the description, so match by substring.
    // Match cards whose accessible name starts with the section title (avoids matching in-slider "Save ..." buttons).
    const card = page.getByRole('button', { name: new RegExp(`^${escapeRegExp(section.title)}\\b`) }).first();
    await card.click();
    await page.waitForTimeout(250);
    saved.push(await screenshot(page, `settings-${section.id}.png`));

    if (section.id === 'payments') {
      // These tabs are plain <button>s (not aria role="tab").
      const payAtTableTab = page.getByRole('button', { name: /^Pay at the table\b/ });
      const merchantTab = page.getByRole('button', { name: /^Merchant integration\b/ });

      if (await payAtTableTab.count()) {
        await payAtTableTab.click();
        await page.waitForTimeout(200);
        saved.push(await screenshot(page, `settings-payments-pay-at-table.png`));
      }

      if (await merchantTab.count()) {
        await merchantTab.click();
        await page.waitForTimeout(200);
        saved.push(await screenshot(page, `settings-payments-merchant.png`));
      }
    }

    // Close slider by clicking the same card again (per SettingsPage logic).
    await card.click();
    await page.waitForTimeout(150);
  }
} finally {
  await browser.close();
}

process.stdout.write(saved.join('\n'));
