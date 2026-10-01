// usage: node scripts/shoot.mjs <url> <name>  → screenshots/<name>-1440.png and -375.png
import { launch } from './lib.mjs';
const [url, name] = process.argv.slice(2);
const { browser, ctx, page } = await launch({ state: false });
for (const w of [1440, 375]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `screenshots/${name}-${w}.png`, fullPage: true });
}
await browser.close();
