// Clicks the first link with data-enquiry on a page and reports what the enquiry box contains.
// Usage: node scripts/qa-prefill-single.mjs <file containing preview url>
import { launch } from './lib.mjs';
import fs from 'node:fs';
const base = fs.readFileSync(process.argv[2], 'utf8').trim().split('#')[0];
const { browser, page } = await launch({ state: false });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
for (const w of [1440, 375]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(`${base}&qa=${w}`, { waitUntil: 'networkidle' });
  await page.locator('a[data-enquiry]').first().click();
  await page.waitForTimeout(700);
  const value = await page.locator('section:has(#evx-contact) form textarea').inputValue();
  const hash = await page.evaluate(() => location.hash);
  console.log(w, JSON.stringify({ value, hash, errors }));
}
await browser.close();
