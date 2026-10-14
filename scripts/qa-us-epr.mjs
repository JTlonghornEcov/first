// QA for the US EPR eco-modulation post (HTML body #usepr): layout at five widths, tools, anchors, prefill, contrast.
// Usage: node scripts/qa-us-epr.mjs <preview-url>
import { launch } from './lib.mjs';
const url = process.argv[2];
const { browser, page } = await launch({ state: false, log: false });
const errors = []; page.on('pageerror', e => errors.push(e.message));
for (const w of [1440, 1024, 768, 375, 320]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const root = document.getElementById('usepr');
    const over = [...root.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1); }).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className)).slice(0, 6);
    return { docOverflowX: document.documentElement.scrollWidth - innerWidth, over, h1: document.querySelectorAll('h1').length,
      badAnchors: [...document.querySelectorAll('main a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h)),
      style: !!root.parentElement.querySelector('style'), robots: document.querySelector('meta[name=robots]')?.content };
  });
  console.log(w, JSON.stringify(r));
  await page.screenshot({ path: `screenshots/us-epr-html-${w}.png`, fullPage: true });
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle' });
const t = {};
const val = s => page.$eval(s, e => e.textContent.trim());
for (const v of [100, 50, 0]) { await page.$eval('#us-srim-range', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, v); t['srim' + v] = [await val('#us-srim-n'), await val('#us-srim-v'), await page.$$eval('#us-srim-dots i.paying', d => d.length)].join(' | '); }
await page.focus('#us-srim-range'); await page.keyboard.press('ArrowLeft'); t.srimKey = await val('#us-srim-n');
t.orA = [await val('#us-or-v'), await val('#us-or-sum')].join(' | ');
await page.fill('#us-or-fee', '400000'); t.orAcap = [await val('#us-or-v'), await val('#us-or-sum')].join(' | ');
await page.click('#us-orcalc label:has(input[value=B])'); await page.click('#us-orcalc label:has(input[value="50000"])');
t.orB = [await val('#us-or-v'), await val('#us-or-sum'), 'fee field hidden=' + await page.$eval('[data-for=A]', e => e.hidden)].join(' | ');
await page.$eval('#us-or-n', e => { e.value = 3; e.dispatchEvent(new Event('input', { bubbles: true })); }); t.orB3 = await val('#us-or-v');
await page.click('#us-orcalc label:has(input[value=C])'); t.orC = [await val('#us-or-k'), await val('#us-or-v'), await val('#us-or-sum')].join(' | ');
const boxes = await page.$$('#us-ready input'); await boxes[0].check(); await boxes[2].check(); t.ready = await val('#us-ready-msg');
await page.click('#us-or-talk'); await page.waitForTimeout(900);
t.prefill = await page.evaluate(() => document.getElementById('evx-contact').closest('section').querySelector('form textarea').value);
await page.goto(url, { waitUntil: 'networkidle' }); await page.click('.glance a[href="#us-or"]'); await page.waitForTimeout(700);
t.glanceJump = await page.evaluate(() => Math.round(document.getElementById('us-or').getBoundingClientRect().top));
// contrast
t.contrast = await page.evaluate(() => {
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const c = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length && (c[3] ?? 1) > 0.9) return c; } return [255, 255, 255]; };
  const out = [];
  for (const el of document.querySelectorAll('#usepr *')) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || !el.getClientRects().length) continue;
    const cs = getComputedStyle(el), fg = rgb(cs.color), bg = bgOf(el);
    const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    if (ratio < (big ? 3 : 4.5)) out.push(`${ratio.toFixed(2)} "${el.textContent.trim().slice(0, 30)}"`);
  }
  return out;
});
t.errors = errors;
console.log(JSON.stringify(t, null, 1));
await browser.close();
