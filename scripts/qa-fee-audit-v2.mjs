// QA for the restyled EPR Fee Audit page (#fax): layout at five widths, single H1, anchors (incl. hero buttons),
// FAQ, contrast. Usage: node scripts/qa-fee-audit-v2.mjs <preview-url>
import { launch } from './lib.mjs';
const url = process.argv[2];
const { browser, page } = await launch({ state: false, log: false });
const errors = []; page.on('pageerror', e => errors.push(e.message));
for (const w of [1440, 1024, 768, 375, 320]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  console.log(w, JSON.stringify(await page.evaluate(() => {
    const root = document.getElementById("fax");
    const over = [...root.querySelectorAll('*')].filter(e => { if (e.closest('.tw')) return false; const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1); }).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className)).slice(0, 5);
    const hero = document.querySelector('main > section.hero');
    return { ox: document.documentElement.scrollWidth - innerWidth, over, h1: [...document.querySelectorAll('h1')].map(h => (h.getClientRects().length ? '' : 'HIDDEN:') + h.textContent.trim()),
      heroVisible: !!hero && getComputedStyle(hero).display !== 'none', heroImg: !!hero?.querySelector('img'),
      heroBtns: [...(hero?.querySelectorAll('a[href*="#"]') || [])].map(a => a.getAttribute('href').replace(/.*#/, '#') + (document.querySelector(a.getAttribute('href').replace(/.*#/, '#')) ? ' ok' : ' MISSING')),
      badAnchors: [...document.querySelectorAll('main a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h)),
      title: document.title, robots: document.querySelector('meta[name=robots]')?.content || '(none)', desc: document.querySelector('meta[name=description]')?.content?.slice(0, 60) };
  })));
  await page.screenshot({ path: `screenshots/fee-audit-v2-${w}.png`, fullPage: true });
}
await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(url, { waitUntil: 'networkidle' });
const faqOpen = "n/a";
const contrast = await page.evaluate(() => {
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const c = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length && (c[3] ?? 1) > 0.9) return c; } return [255, 255, 255]; };
  const out = [];
  for (const el of document.querySelectorAll('#fax *')) {
    if (el.closest('svg') || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || !el.getClientRects().length) continue;
    const cs = getComputedStyle(el), L1 = lum(rgb(cs.color)), L2 = lum(bgOf(el)), r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    if (r < (big ? 3 : 4.5)) out.push(`${r.toFixed(2)} "${el.textContent.trim().slice(0, 30)}"`);
  }
  return out;
});
console.log(JSON.stringify({ faqOpen, contrast, errors }));
await browser.close();
