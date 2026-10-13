// WCAG AA contrast check for every text element inside .evx (custom HTML). Usage: node scripts/qa-contrast.mjs <url-file>...
import { launch } from './lib.mjs';
import fs from 'node:fs';
const { browser, page } = await launch({ state: false });
await page.setViewportSize({ width: 1440, height: 900 });
for (const f of process.argv.slice(2)) {
  await page.goto(fs.readFileSync(f, 'utf8').trim().split('#')[0] + '&c=1', { waitUntil: 'networkidle' });
  const fails = await page.evaluate(() => {
    const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => { const c = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
    const blend = (fg, bg) => { const a = fg[3] ?? 1; return [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a)); };
    const bgOf = el => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length && (c[3] ?? 1) > 0) { layers.push(c); if ((c[3] ?? 1) >= 1) break; } }
      let out = [255, 255, 255]; for (const c of layers.reverse()) out = blend(c, out); return out; };
    const out = [];
    for (const el of document.querySelectorAll('.evx *')) {
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!own || !el.getClientRects().length) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
      const bg = bgOf(el); const fg = blend([...rgb(cs.color).slice(0, 3), (rgb(cs.color)[3] ?? 1) * op], bg);
      const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
      const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700, large = size >= 24 || (bold && size >= 18.66);
      const need = large ? 3 : 4.5;
      if (ratio < need) out.push(`${ratio.toFixed(2)} < ${need} | ${size}px${bold ? ' bold' : ''} | ${cs.color} on rgb(${bg.map(Math.round)}) | .${String(el.className).slice(0, 28)} "${el.textContent.trim().slice(0, 34)}"`);
    }
    return [...new Set(out)];
  });
  console.log(`\n${f.split('/').pop()}: ${fails.length} failing text styles`); fails.forEach(x => console.log('  ' + x));
}
await browser.close();
