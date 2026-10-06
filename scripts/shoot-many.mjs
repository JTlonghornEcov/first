// Desktop full-page screenshots for several URLs. Usage: node scripts/shoot-many.mjs <outdir> <name=url>...
import { launch } from './lib.mjs';
const [dir, ...pairs] = process.argv.slice(2);
const { browser, page } = await launch({ state: false });
await page.setViewportSize({ width: 1440, height: 900 });
for (const p of pairs) { const i = p.indexOf('='); const name = p.slice(0, i), url = p.slice(i + 1);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(500); await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true }); }
await browser.close();
