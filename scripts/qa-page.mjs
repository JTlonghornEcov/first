// Responsive QA: screenshots at several widths and checks for overflow, broken images, heading order and anchors.
// Usage: node scripts/qa-page.mjs <url> <name>
import { launch } from './lib.mjs';
const [url, name] = process.argv.slice(2);
const { browser, page } = await launch({ state: false });
for (const w of [1440, 1024, 768, 375, 320]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const root = document.querySelector('.evx');
    const over = [...root.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.right > innerWidth + 1 || b.left < -1; }).map(e => e.className || e.tagName).slice(0, 5);
    const imgs = [...root.querySelectorAll('img')]; const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.split('/').pop());
    const heads = [...document.querySelectorAll('main h1, main h2, main h3, main h4')].map(h => h.tagName).join('');
    const ids = [...root.querySelectorAll('[href^="#"]')].map(a => a.getAttribute('href')).filter(h => !document.querySelector(h));
    const hero = [...document.querySelectorAll('section.hero a[href^="#"]')].map(a => a.getAttribute('href') + (document.querySelector(a.getAttribute('href')) ? ' ok' : ' MISSING'));
    return { docOverflowX: document.documentElement.scrollWidth - innerWidth, overflowing: over, imgs: imgs.length, broken, h1: document.querySelectorAll('h1').length, headings: heads, missingAnchors: ids, heroAnchors: hero, styleKept: !!root.parentElement.querySelector('style') };
  });
  console.log(w, JSON.stringify(r));
  await page.screenshot({ path: `screenshots/${name}-${w}.png`, fullPage: true });
}
await browser.close();
