// Read-only: stores each general_content block's RAW saved HTML (from the server-rendered textarea, before CKEditor
// touches it) into payloads/blog/<id>.json as blocks[].rawGeneralContent. Usage: node scripts/export-raw.mjs <id> ...
import { launch } from './lib.mjs';
import fs from 'node:fs';
const { browser, page } = await launch();
await page.goto('https://www.ecoveritas.com/admin/dashboard', { waitUntil: 'domcontentloaded' });
for (const id of process.argv.slice(2)) {
  const f = `payloads/blog/${id}.json`, post = JSON.parse(fs.readFileSync(f));
  const raw = await page.evaluate(async (id) => {
    const h = await (await fetch(`/admin/entries/x/${id}`, { credentials: 'same-origin' })).text();
    const d = new DOMParser().parseFromString(h, 'text/html'); const out = {};
    for (const ta of d.querySelectorAll('textarea[name$="[fields][generalContent]"]')) { const m = ta.name.match(/uid:([0-9a-f-]+)\]\[fields\]\[generalContent\]$/); if (m) out[m[1]] = ta.value; }
    return out;
  }, id);
  let n = 0; for (const b of post.blocks) if (raw[b.uid] !== undefined) { b.rawGeneralContent = raw[b.uid]; n++; }
  fs.writeFileSync(f, JSON.stringify(post, null, 1));
  const b = post.blocks.find(b => b.rawGeneralContent);
  const cnt = s => (s.match(/<li/g) || []).length;
  console.log(id, 'raw blocks:', n, '| li raw:', cnt(b.rawGeneralContent), 'vs editor:', cnt(b.fields.generalContent), '| <a raw:', (b.rawGeneralContent.match(/<a\b/g) || []).length, 'vs', (b.fields.generalContent.match(/<a\b/g) || []).length, '| same:', b.rawGeneralContent === b.fields.generalContent);
}
await browser.close();
