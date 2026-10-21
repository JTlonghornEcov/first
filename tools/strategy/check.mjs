// Makes a private preview link for a concept page (disabled entry) and runs QA on it: overflow at five widths,
// a single H1, in-page anchors, hero buttons, text contrast (WCAG AA) and script errors. Screenshots go to
// screenshots/strategy-<slug>-<width>.png. Prints the preview URL last (never commit it).
// Usage: node tools/strategy/check.mjs <slug>
import fs from 'node:fs';
import { launch } from '../../scripts/lib.mjs';
const slug = process.argv[2];
const P = JSON.parse(fs.readFileSync(`payloads/strategy/${slug}/page.json`, 'utf8'));
const { browser, page } = await launch({ write: /actions\/preview\/create-token/, log: false });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${P.entryId}`, { waitUntil: 'networkidle' });
const url = await page.evaluate(async (u) => Craft.cp.$primaryForm.data('elementEditor').getTokenizedPreviewUrl(u, 'x-craft-preview', true), `https://www.ecoveritas.com/concept-${slug}`);
const errors = []; page.on('pageerror', e => errors.push(e.message));
for (const w of [1440, 1024, 768, 375, 320]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  console.log(w, JSON.stringify(await page.evaluate(() => {
    const root = document.querySelector('.evc');
    const over = root ? [...root.querySelectorAll('*')].filter(e => { if (e.closest('.scrollx')) return false; const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1); }).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className)).slice(0, 5) : 'NO ROOT';
    const hero = document.querySelector('main > section.hero');
    return { ox: document.documentElement.scrollWidth - innerWidth, over, h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim().slice(0, 40)),
      heroImg: !!hero?.querySelector('img'),
      badAnchors: [...document.querySelectorAll('main a[href*="#"]')].map(a => a.getAttribute('href')).filter(h => /^#./.test(h) && !document.querySelector(h)),
      robots: document.querySelector('meta[name=robots]')?.content || '(none)' };
  })));
  await page.screenshot({ path: `screenshots/strategy-${slug}-${w}.png`, fullPage: true });
}
await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(url, { waitUntil: 'networkidle' });
const contrast = await page.evaluate(() => {
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const c = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('url')) return null; const c = rgb(cs.backgroundColor); if (c.length && (c[3] ?? 1) > 0.9) return c; } return [255, 255, 255]; };
  const out = [];
  for (const el of document.querySelectorAll('.evc *')) {
    if (el.closest('svg') || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || !el.getClientRects().length) continue;
    const bg = bgOf(el); if (!bg) continue;
    const cs = getComputedStyle(el), L1 = lum(rgb(cs.color)), L2 = lum(bg), r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    if (r < (big ? 3 : 4.5)) out.push(`${r.toFixed(2)} "${el.textContent.trim().slice(0, 30)}"`);
  }
  return out;
});
console.log(JSON.stringify({ contrast, errors }));
await browser.close();
console.log(url);
