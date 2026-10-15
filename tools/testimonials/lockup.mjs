// Renders a case-study logo lock-up in the style of the Heidelberg one: white background, client logo left,
// Ecoveritas logo right, 16:9. Usage: node tools/testimonials/lockup.mjs <client-logo.(png|svg|jpg)> <out.png>
import fs from 'node:fs';
import { launch } from '../../scripts/lib.mjs';
const [logoPath, out] = process.argv.slice(2);
const ext = logoPath.split('.').pop().toLowerCase();
const mime = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }[ext];
const client = `data:${mime};base64,${fs.readFileSync(logoPath).toString('base64')}`;
const ecov = await (await fetch('https://www.ecoveritas.com/dist/images/logo.svg')).text();
const { browser, page } = await launch({ state: false, log: false, scale: 2 });
await page.setViewportSize({ width: 736, height: 414 });
await page.setContent(`<html><body style="margin:0;width:736px;height:414px;background:#fff;display:grid;grid-template-columns:1fr 1fr;align-items:center">
  <div style="display:grid;place-items:center;height:100%;padding-left:40px"><img src="${client}" style="width:280px;height:140px;object-fit:contain"></div>
  <div style="display:grid;place-items:center;height:100%;padding-right:40px"><div style="width:190px">${ecov.replace('<svg ', '<svg width="190" ')}</div></div>
</body></html>`, { waitUntil: 'load' });
await page.screenshot({ path: out });
await browser.close();
console.log('lock-up written to', out);
