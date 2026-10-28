// Tests a CSS-only (no JavaScript) interactive block on a concept page: clicks each answer combination given and
// reports which result panel is visible. Also confirms the page has no script inside the page body.
// Panels are found with RES (default '.evc .res > div'), e.g. RES='.evc .demo .view' for a tabbed view.
// Usage: node tools/strategy/check-css-tool.mjs <slug> '<json: [[["#input1","#input2"], ".result" or ".result1,.result2"], ...]>'
import fs from 'node:fs';
import { launch } from '../../scripts/lib.mjs';
const [slug, spec] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(`payloads/strategy/${slug}/page.json`, 'utf8'));
const cases = JSON.parse(spec);
const { browser, page } = await launch({ write: /actions\/preview\/create-token/, log: false });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${P.entryId}`, { waitUntil: 'networkidle' });
const url = await page.evaluate(async (u) => Craft.cp.$primaryForm.data('elementEditor').getTokenizedPreviewUrl(u, 'x-craft-preview', true), `https://www.ecoveritas.com/concept-${slug}`);
await page.setViewportSize({ width: 375, height: 900 });
let ok = true;
for (const [clicks, expected] of cases) {
  await page.goto(url, { waitUntil: 'networkidle' });
  for (const c of clicks) await page.click(`label:has(${c})`);
  const shown = await page.evaluate((sel) => [...document.querySelectorAll(sel)].filter(d => getComputedStyle(d).display !== 'none').map(d => d.className.split(' ').pop()), process.env.RES || '.evc .res > div');
  const want = expected.split(",").map(s => s.trim().slice(1)).sort().join(",");
  const pass = [...shown].sort().join(",") === want;
  ok &&= pass; console.log(pass ? 'PASS' : 'FAIL', clicks.join(' + ') || '(none)', '→', shown.join(','));
}
console.log('scripts in .evc:', await page.evaluate(() => document.querySelectorAll('.evc script').length));
await page.screenshot({ path: `screenshots/strategy-${slug}-tool.png`, fullPage: false });
await browser.close();
process.exit(ok ? 0 : 1);
