// Tests a CSS-only (no JavaScript) interactive block on a concept page: clicks each answer combination given and
// reports which result panel is visible. Also confirms the page has no script inside the page body.
// Usage: node tools/strategy/check-css-tool.mjs <slug> '<json: [[["#labelFor1","#labelFor2"], ".expected-result"], ...]>'
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
  const shown = await page.evaluate(() => [...document.querySelectorAll('.evc .res > div')].filter(d => getComputedStyle(d).display !== 'none').map(d => d.className));
  const pass = shown.length === 1 && shown[0] === expected.slice(1);
  ok &&= pass; console.log(pass ? 'PASS' : 'FAIL', clicks.join(' + ') || '(none)', '→', shown.join(','));
}
console.log('scripts in .evc:', await page.evaluate(() => document.querySelectorAll('.evc script').length));
await page.screenshot({ path: `screenshots/strategy-${slug}-tool.png`, fullPage: false });
await browser.close();
process.exit(ok ? 0 : 1);
