// QA for the UK EPR explainer v2 (#ukx): layout at five widths, checker zones, equation, deadline filter, prefill,
// logo scroll and contrast. Usage: node scripts/qa-uk-epr-v2.mjs <preview-url>
import { launch } from './lib.mjs';
const url = process.argv[2];
const { browser, page } = await launch({ state: false, log: false });
const errors = []; page.on('pageerror', e => errors.push(e.message));
for (const w of [1440, 1024, 768, 375, 320]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
  await page.waitForTimeout(800);
  console.log(w, JSON.stringify(await page.evaluate(() => {
    const root = document.getElementById('ukx');
    const over = [...root.querySelectorAll('*')].filter(e => { if (e.closest('.logo-gallery')) return false; const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1); }).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className)).slice(0, 5);
    const g = [...root.querySelectorAll('.gantt [data-row], .gantt .rl')].map(e => getComputedStyle(e).gridRowStart + ':' + Math.round(e.getBoundingClientRect().top));
    return { ox: document.documentElement.scrollWidth - innerWidth, over, h1: document.querySelectorAll('h1').length, h1t: document.querySelector('h1')?.textContent.trim(),
      badAnchors: [...document.querySelectorAll('main a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h)),
      ganttRows: [...new Set([...root.querySelectorAll('.gantt .rl, .gantt .bar, .gantt .due')].map(e => Math.round(e.getBoundingClientRect().top)))].length,
      robots: document.querySelector('meta[name=robots]')?.content };
  })));
  await page.screenshot({ path: `screenshots/uk-epr-v2-${w}.png`, fullPage: true });
}
await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(url, { waitUntil: 'networkidle' });
const t = {};
const set = async (tv, wv) => { await page.$eval('#u2-t', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, tv); await page.$eval('#u2-w', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, wv);
  return page.$eval('#u2-verdict', v => v.dataset.z + ' | ' + v.querySelector('b').textContent + ' | dot ' + document.querySelector('#u2-dot').getAttribute('transform')); };
for (const [a, b] of [[0.5, 40], [1.5, 20], [1.5, 40], [1.5, 90], [3, 40], [3, 80], [5, 100]]) t[`£${a}m/${b}t`] = await set(a, b);
await page.click('.eq button[data-s="treatment"]'); t.eqHighlight = await page.$$eval('#u2-stages .stage.hl', s => s.map(x => x.dataset.s).join());
await page.click('.cal .filters button[data-f="small"]'); t.filterSmall = await page.$$eval('.cal [data-row].dim', d => [...new Set(d.map(x => x.dataset.row))].join());
await page.click('.cal .filters button[data-f="all"]'); t.filterAll = await page.$$eval('.cal [data-row].dim', d => d.length);
await set(3, 80); await page.click('#u2-verdict .btn'); await page.waitForTimeout(900);
t.prefill = await page.evaluate(() => document.getElementById('evx-contact').closest('section').querySelector('form textarea').value);
await page.goto(url, { waitUntil: 'networkidle' });
const pos = () => page.$eval('#ukx .logo-gallery img', i => Math.round(i.getBoundingClientRect().left)); const p0 = await pos(); await page.waitForTimeout(1500); t.logosMoved = p0 - await pos();
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } });
t.contrast = await page.evaluate(() => {
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const c = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length && (c[3] ?? 1) > 0.9) return c; } return [255, 255, 255]; };
  const out = [];
  for (const el of document.querySelectorAll('#ukx *')) {
    if (el.closest('svg') || el.closest('.logo-gallery') || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || !el.getClientRects().length) continue;
    const cs = getComputedStyle(el); if (+cs.opacity < 1 || el.closest('.dim')) continue;
    const L1 = lum(rgb(cs.color)), L2 = lum(bgOf(el)), r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    if (r < (big ? 3 : 4.5)) out.push(`${r.toFixed(2)} "${el.textContent.trim().slice(0, 30)}"`);
  }
  return out;
});
t.errors = errors;
console.log(JSON.stringify(t, null, 1));
await browser.close();
