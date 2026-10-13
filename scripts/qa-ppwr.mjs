// Layout and heading checks for the PPWR design page (draft preview or live). Usage: node scripts/qa-ppwr.mjs <url-file> <name>
import { launch } from './lib.mjs';
import fs from 'node:fs';
const url = fs.readFileSync(process.argv[2], 'utf8').trim(), name = process.argv[3];
const { browser, page } = await launch({ state: false });
const errors = []; page.on('pageerror', e => errors.push(e.message));
for (const w of [1440, 1024, 768, 375, 320]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'qa=' + w, { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const h1s = [...document.querySelectorAll('h1')];
    return { overflowX: document.documentElement.scrollWidth - innerWidth, h1: h1s.length, h1Visible: h1s.every(h => h.getClientRects().length && getComputedStyle(h).visibility !== 'hidden'),
      h1Text: h1s.map(h => h.textContent.trim()).join(' | '), heroImg: !!document.querySelector('section.hero img'),
      missingAnchors: [...document.querySelectorAll('main a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h)) };
  });
  console.log(w, JSON.stringify(r));
  if (w === 1440 || w === 375) await page.screenshot({ path: `screenshots/${name}-${w}.png`, fullPage: w === 375 ? false : false });
}
console.log('JS errors:', JSON.stringify(errors));
await browser.close();
