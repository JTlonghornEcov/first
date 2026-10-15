// QA for the PPWR supplier DoC page (#pdoc): layout at five widths, toggle, step player, checker, prefill, contrast.
// Usage: node scripts/qa-ppwr-supplier.mjs <preview-url> [screenshot-name]
import { launch } from './lib.mjs';
const [url, name = 'ppwr-supplier'] = process.argv.slice(2);
const { browser, page } = await launch({ state: false, log: false });
const errors = []; page.on('pageerror', e => errors.push(e.message));
for (const w of [1440, 1024, 768, 375, 320]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    const root = document.getElementById('pdoc');
    const over = [...root.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1); }).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className)).slice(0, 6);
    return { ox: document.documentElement.scrollWidth - innerWidth, over, h1: document.querySelectorAll('h1').length, h1text: document.querySelector('h1')?.textContent.trim().slice(0, 60),
      badAnchors: [...document.querySelectorAll('main a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h)),
      robots: document.querySelector('meta[name=robots]')?.content };
  });
  console.log(w, JSON.stringify(r));
  await page.screenshot({ path: `screenshots/${name}-${w}.png`, fullPage: true });
}
await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(url, { waitUntil: 'networkidle' });
const t = {};
const vis = () => page.$$eval('#pdoc .view', vs => vs.filter(v => !v.hidden).map(v => v.dataset.view).join());
t.viewStart = await vis(); await page.click('.switch button[data-v=after]'); t.viewAfter = await vis();
const on = () => page.$$eval('#pd-steps .step', s => s.findIndex(x => x.classList.contains('on')) + 1);
t.stepStart = await on(); await page.click('#pd-next'); t.stepNext = await on(); await page.click('#pd-steps .step:nth-child(4)'); t.stepClick = await on();
await page.click('#pd-play'); await page.waitForTimeout(400); t.playing = await page.$eval('#pd-play', b => b.getAttribute('aria-pressed') + ' ' + b.textContent.trim()); t.afterPlay = await on();
await page.click('#pd-play'); t.paused = await page.$eval('#pd-play', b => b.textContent.trim());
const v = () => page.$eval('#pd-v-text b', b => b.textContent);
t.verdict0 = await v(); const boxes = await page.$$('#pd-checker input'); await boxes[1].check(); t.verdict1 = await v(); await boxes[1].uncheck(); t.verdictBack = await v();
await boxes[0].check(); await page.click('#pd-v-btn'); await page.waitForTimeout(900);
t.prefill = await page.evaluate(() => document.getElementById('evx-contact').closest('section').querySelector('form textarea').value);
await page.goto(url, { waitUntil: 'networkidle' }); await page.click('.actions .btn'); await page.waitForTimeout(900);
t.heroPrefill = await page.evaluate(() => document.getElementById('evx-contact').closest('section').querySelector('form textarea').value.slice(0, 60));
t.contrast = await page.evaluate(() => {
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const c = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length && (c[3] ?? 1) > 0.9) return c; } return [255, 255, 255]; };
  const out = [];
  for (const el of document.querySelectorAll('#pdoc *')) {
    if (el.closest('svg') || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || !el.getClientRects().length) continue;
    const cs = getComputedStyle(el), L1 = lum(rgb(cs.color)), L2 = lum(bgOf(el)), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    if (ratio < (big ? 3 : 4.5)) out.push(`${ratio.toFixed(2)} "${el.textContent.trim().slice(0, 30)}"`);
  }
  return out;
});
t.errors = errors;
console.log(JSON.stringify(t, null, 1));
await browser.close();
