// Sets one field on the single block of a given type in a draft. Usage: node scripts/set-block-field.mjs <entry> <draft> <type> <field> <value>
import { launch } from './lib.mjs';
const [entry, draft, type, field, value] = process.argv.slice(2);
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${entry}?draftId=${draft}`, { waitUntil: 'networkidle' });
const res = await page.evaluate(async ({ entry, draft, type, field, value }) => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  if (String(ed.settings.draftId) !== draft) return { error: 'wrong draft' };
  const fd = new FormData(Craft.cp.$primaryForm[0]);
  const cur = fd.getAll('fields[pageBuilder][sortOrder][]');
  const get = (u, k) => fd.get(`fields[pageBuilder][entries][uid:${u}][${k}]`);
  const hits = cur.filter(u => get(u, 'type') === type);
  if (hits.length !== 1) return { error: 'expected one ' + type, n: hits.length };
  const entries = Object.fromEntries(cur.map(u => ['uid:' + u, { type: get(u, 'type'), enabled: get(u, 'enabled') === '1' ? '1' : '0' }]));
  entries['uid:' + hits[0]].fields = { [field]: value };
  try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data: { elementId: entry, draftId: draft, siteId: '1', modifiedDeltaNames: ['fields[pageBuilder]'], fields: { pageBuilder: { sortOrder: cur, entries } } } }); return { ok: true, msg: r.data.message }; }
  catch (e) { return { error: e.message }; }
}, { entry, draft, type, field, value });
console.log(JSON.stringify(res));
await browser.close();
