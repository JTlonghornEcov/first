// Responsive QA for a page-builder page: overflow, images, headings, links; full-page screenshots.
// Usage: node scripts/qa-news.mjs <url> <name>
import { launch } from './lib.mjs';
const [url, name] = process.argv.slice(2);
const { browser, page } = await launch({ state: false, log: false });
const errors = []; page.on('pageerror', e => errors.push(e.message));
for (const w of [1440, 1024, 768, 375, 320]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } scrollTo(0, 0); });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const main = document.querySelector('main');
    const imgs = [...main.querySelectorAll('img')];
    return { overflowX: document.documentElement.scrollWidth - innerWidth, imgs: imgs.length,
      broken: imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.split('/').pop()),
      noAlt: imgs.filter(i => !i.hasAttribute('alt')).length,
      cropped: imgs.filter(i => /us-epr/.test(i.currentSrc)).map(i => { const b = i.getBoundingClientRect(); const ir = i.naturalWidth / i.naturalHeight, br = b.width / b.height; return Math.abs(ir - br) > 0.03 ? `${i.currentSrc.split('/').pop().slice(0, 40)} box ${Math.round(b.width)}x${Math.round(b.height)}` : null; }).filter(Boolean),
      h1: document.querySelectorAll('h1').length, headings: [...main.querySelectorAll('h1,h2,h3,h4')].map(h => h.tagName + ':' + h.textContent.trim().slice(0, 28)).join(' / ') };
  });
  console.log(w, JSON.stringify(w === 1440 ? r : { ...r, headings: undefined }));
  await page.screenshot({ path: `screenshots/${name}-${w}.png`, fullPage: true });
}
console.log('errors', errors);
await browser.close();
