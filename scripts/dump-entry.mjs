// Read-only dump of an entry's header fields, page-builder blocks and nested items. Usage: node scripts/dump-entry.mjs <id>
import { launch } from './lib.mjs';
import fs from 'node:fs';
const id = process.argv[2];
const { browser, page } = await launch();
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${id}`, { waitUntil: 'networkidle' });
const out = await page.evaluate(() => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  const fd = new FormData(Craft.cp.$primaryForm[0]); const f = {};
  for (const [k, v] of fd.entries()) if (/^(title|slug|typeId|fields\[(hero|pageBuilder|ctaPicker|seo\]\[titleRaw))/.test(k)) f[k] = (f[k] ? f[k] + ' || ' : '') + String(v);
  const nested = [...document.querySelectorAll('.field[data-attribute] [data-id][data-owner-id]')].map(e => ({ id: e.dataset.id, owner: e.dataset.ownerId, field: e.closest('.field[data-attribute]').dataset.attribute, label: e.dataset.label }));
  return { canonicalId: ed.settings.canonicalId, draftId: ed.settings.draftId, fields: f, nested: [...new Map(nested.map(n => [n.id, n])).values()] };
});
fs.writeFileSync(`payloads/dump-${id}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).replace(/uid:([0-9a-f]{8})[0-9a-f-]{28}/g, 'uid:$1'));
await browser.close();
