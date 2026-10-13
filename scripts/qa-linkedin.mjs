// QA for the LinkedIn Challenge preview: layout at 5 widths, calculator maths and keyboard, notes persistence, JS errors.
import { launch } from './lib.mjs';
import fs from 'node:fs';
const base = fs.readFileSync(process.argv[2], 'utf8').trim().split('#')[0];
const { browser, ctx, page } = await launch({ state: false });
const errors = []; page.on('pageerror', e => errors.push(e.message));
for (const w of [1440, 1024, 768, 375, 320]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(`${base}&qa=${w}`, { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const root = document.querySelector('.evx');
    return { overflowX: document.documentElement.scrollWidth - innerWidth,
      offscreen: [...root.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1); }).map(e => e.className).slice(0, 4),
      h1: document.querySelectorAll('h1').length, missingAnchors: [...document.querySelectorAll('main a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h)),
      scriptKept: [...document.querySelectorAll('main script')].length };
  });
  console.log(w, JSON.stringify(r));
  await page.screenshot({ path: `screenshots/lc-${w}.png`, fullPage: true });
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${base}&qa=calc`, { waitUntil: 'networkidle' });
const read = () => page.evaluate(() => ({ pts: document.getElementById('lc-pts').textContent, tk: document.getElementById('lc-tk').textContent, odds: document.getElementById('lc-odds').textContent,
  tickets: document.querySelectorAll('#lc-strip i:not(.lc-ghost)').length, note: document.getElementById('lc-note').textContent.slice(0, 40) }));
for (const v of [0, 1, 20, 50]) { await page.locator('#lc-range').fill(String(v)); console.log('slider', v, JSON.stringify(await read())); }
await page.locator('#lc-range').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
console.log('keyboard 50->', JSON.stringify(await read()));
await page.locator('#lc-range').fill('20'); await page.keyboard.press('ArrowLeft');
console.log('keyboard 20-1 ->', JSON.stringify(await read()));
await page.locator('#lc-notes-box').fill('Test note: idea for next round');
await page.reload({ waitUntil: 'networkidle' });
console.log('notes after reload:', JSON.stringify(await page.locator('#lc-notes-box').inputValue()), '| JS errors:', JSON.stringify(errors));
await page.evaluate(() => localStorage.removeItem('ecov-li-challenge-notes'));
await browser.close();
