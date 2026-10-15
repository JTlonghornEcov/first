// QA for the testimonials concept (#tst): layout at five widths, anchors, deep links, sector filter, contrast.
// Usage: node scripts/qa-testimonials.mjs <preview-url>
import { launch } from './lib.mjs';
const url = process.argv[2];
const { browser, page } = await launch({ state: false, log: false });
const errors = []; page.on('pageerror', e => errors.push(e.message));
for (const w of [1440, 1024, 768, 375, 320]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } scrollTo(0, 0); });
  console.log(w, JSON.stringify(await page.evaluate(() => {
    const root = document.getElementById('tst');
    const over = [...root.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1); }).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className)).slice(0, 5);
    return { ox: document.documentElement.scrollWidth - innerWidth, over, h1: document.querySelectorAll('h1').length, cards: root.querySelectorAll('.card').length,
      brokenImgs: [...root.querySelectorAll('img')].filter(i => i.complete && !i.naturalWidth).map(i => i.src.split('/').pop()),
      badAnchors: [...document.querySelectorAll('main a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h)),
      robots: document.querySelector('meta[name=robots]')?.content };
  })));
  await page.screenshot({ path: `screenshots/testimonials-${w}.png`, fullPage: true });
}
await page.setViewportSize({ width: 1440, height: 900 });
const t = {};
await page.goto(url, { waitUntil: 'networkidle' });
for (const f of ['retail', 'food', 'pharma', 'horticulture', 'all']) { await page.click(`.filters button[data-f="${f}"]`); t[f] = await page.$$eval('#ts-wall .card:not([hidden])', c => c.map(x => x.id.slice(2)).join(',')) + ' | ' + await page.$eval('#ts-status', s => s.textContent); }
await page.click('.filters button[data-f="pharma"]');
await page.goto(url.replace('?', '?') + '#t-fenwick', { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
t.deepLink = await page.evaluate(() => { const c = document.getElementById('t-fenwick'); const b = c.getBoundingClientRect(); return `visible=${!c.hidden} top=${Math.round(b.top)} target=${c.matches(':target')}`; });
for (const a of ['#case-studies', '#testimonials']) { await page.goto(url + a, { waitUntil: 'networkidle' }); await page.waitForTimeout(500); t[a] = await page.evaluate(h => Math.round(document.querySelector(h).getBoundingClientRect().top), a); }
const links = await page.$$eval('#tst a[href^="https"]', as => [...new Set(as.map(a => a.href))]);
t.links = []; for (const l of links) t.links.push((await fetch(l)).status + ' ' + l.replace('https://www.ecoveritas.com', ''));
t.contrast = await page.evaluate(() => {
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const c = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length && (c[3] ?? 1) > 0.9) return c; } return [255, 255, 255]; };
  const out = [];
  for (const el of document.querySelectorAll('#tst *')) {
    if (el.closest('svg') || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || !el.getClientRects().length) continue;
    const cs = getComputedStyle(el), L1 = lum(rgb(cs.color)), L2 = lum(bgOf(el)), r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    if (r < (big ? 3 : 4.5)) out.push(`${r.toFixed(2)} "${el.textContent.trim().slice(0, 30)}"`);
  }
  return out;
});
t.errors = errors;
console.log(JSON.stringify(t, null, 1));
await browser.close();
