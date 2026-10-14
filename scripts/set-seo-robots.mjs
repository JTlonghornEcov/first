// Sets only the SEO field (title, description, robots) on an entry; no other field is sent.
// Usage: node scripts/set-seo-robots.mjs <entryId> <post.json> [robots,comma,separated]   (no robots = indexable)
import { launch } from './lib.mjs';
import fs from 'node:fs';
const [id, file, robots = ''] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(file));
const data = { entryId: id, fields: { seo: { titleRaw: { 1: P.seoTitle }, description: P.seoDescription, advanced: { robots: robots ? robots.split(',') : [''], canonical: '' } } } };
const { browser, page } = await launch({ write: /actions\/entries\/save-entry/ });
await page.goto('https://www.ecoveritas.com/admin/entries', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.Craft && Craft.sendActionRequest);
console.log(JSON.stringify(await page.evaluate(async (data) => {
  try { const r = await Craft.sendActionRequest('POST', 'entries/save-entry', { data }); return { msg: r.data.message, status: (JSON.stringify(r.data).match(/data-status=\\"(\w+)/) || [])[1] }; }
  catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 600) }; }
}, data)));
await browser.close();
