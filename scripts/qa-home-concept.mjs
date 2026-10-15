// QA for the homepage concept (#home2): layout at five widths, headings, video, logo scroll, count-up, anchors,
// contrast, and a visual comparison of the copied sections against the live homepage. Usage: node scripts/qa-home-concept.mjs <url> <outdir>
import { launch } from './lib.mjs';
const [url, out] = process.argv.slice(2);
const { browser, page } = await launch({ state: false, log: false });
const errors = []; page.on('pageerror', e => errors.push(e.message));
const settle = async () => { await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 70)); } scrollTo(0, 0); }); await page.waitForTimeout(1500); };
for (const w of [1440, 1024, 768, 375, 320]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' }); await settle();
  const r = await page.evaluate(() => {
    const root = document.getElementById('home2');
    const visH1 = [...document.querySelectorAll('h1')].filter(h => h.getClientRects().length).map(h => h.textContent.replace(/\s+/g, ' ').trim());
    const over = [...root.querySelectorAll('*')].filter(e => { if (e.closest('.logo-gallery')) return false; const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1); }).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className)).slice(0, 5);
    const v = root.querySelector('video');
    return { docOverflowX: document.documentElement.scrollWidth - innerWidth, over, h1All: document.querySelectorAll('h1').length, visibleH1: visH1,
      video: v ? { playing: !v.paused, t: +v.currentTime.toFixed(1), src: v.currentSrc.split('/').pop() } : null,
      badAnchors: [...document.querySelectorAll('main a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h)),
      numbers: [...root.querySelectorAll('.bento .n')].map(n => n.textContent), robots: document.querySelector('meta[name=robots]')?.content };
  });
  console.log(w, JSON.stringify(r));
  await page.screenshot({ path: `screenshots/home-concept-${w}.png`, fullPage: true });
}
// logo strip moves?
await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(url, { waitUntil: 'networkidle' });
const pos = () => page.$eval('#home2 .logo-gallery img', i => Math.round(i.getBoundingClientRect().left));
const a = await pos(); await page.waitForTimeout(2000); console.log('logo strip moved px:', a - await pos(), '| logos:', await page.$$eval('#home2 .logo-gallery img', i => i.length));
// side-by-side: copied sections, concept vs live
for (const w of [1440, 375]) {
  await page.setViewportSize({ width: w, height: 900 });
  for (const [name, live] of [['why', 5], ['trending', 3]]) {
    await page.goto('https://www.ecoveritas.com/', { waitUntil: 'networkidle' }); await settle();
    await page.locator('main > section').nth(live).screenshot({ path: `${out}/cmp-${name}-${w}-live.png` });
    await page.goto(url, { waitUntil: 'networkidle' }); await settle();
    await page.locator(`#home2 [data-k="${name}-0"]`).locator('xpath=ancestor::section[1]').screenshot({ path: `${out}/cmp-${name}-${w}-concept.png` });
  }
}
console.log('errors', errors);
await browser.close();
