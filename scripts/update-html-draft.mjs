// Pass 1 of a safe draft edit: in the given draft, disables the existing custom-HTML general_content block and adds a
// new one with the HTML from <file>; every other block is kept as is. Live blocks are never edited.
// Pass 2: node scripts/drop-disabled.mjs <entryId> <draftId> <liveGcUidPrefix>
// Usage: node scripts/update-html-draft.mjs <entryId> <draftId> <file> <marker-in-old-html>
import { launch } from './lib.mjs';
import fs from 'node:fs';
const [entry, draft, file, marker] = process.argv.slice(2);
const html = fs.readFileSync(file, 'utf8');
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${entry}?draftId=${draft}`, { waitUntil: 'networkidle' });
const res = await page.evaluate(async ({ entry, draft, html, marker }) => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  if (String(ed.settings.draftId) !== draft || String(ed.settings.canonicalId) !== entry) return { error: 'wrong draft' };
  const page = await (await fetch(location.href, { credentials: 'same-origin' })).text();
  const raw = {}; for (const ta of new DOMParser().parseFromString(page, 'text/html').querySelectorAll('textarea[name$="[fields][generalContent]"]')) { const m = ta.name.match(/uid:([0-9a-f-]+)\]/); if (m) raw[m[1]] = ta.value; }
  const fd = new FormData(Craft.cp.$primaryForm[0]);
  const cur = fd.getAll('fields[pageBuilder][sortOrder][]');
  const get = (u, k) => fd.get(`fields[pageBuilder][entries][uid:${u}][${k}]`);
  const old = cur.filter(u => get(u, 'type') === 'general_content' && (raw[u] || '').includes(marker));
  if (old.length !== 1) return { error: 'expected one custom HTML block', cur, found: old };
  const order = [], entries = {};
  for (const u of cur) {
    order.push(u); entries['uid:' + u] = { type: get(u, 'type'), enabled: get(u, 'enabled') === '1' ? '1' : '0' };
    if (u !== old[0]) continue;
    entries['uid:' + u].enabled = '0';
    const n = crypto.randomUUID(); order.push(n);
    entries['uid:' + n] = { type: 'general_content', enabled: '1', fields: { generalContent: html, spacing: get(u, 'fields][spacing') ? atob(get(u, 'fields][spacing').replace('base64:', '')) : 'medium', theme: 'default' } };
  }
  try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data: { elementId: entry, draftId: draft, siteId: '1', draftName: 'Bonus C chart + author box', modifiedDeltaNames: ['fields[pageBuilder]'], fields: { pageBuilder: { sortOrder: order, entries } } } });
    return { ok: r.data.message, oldUid: old[0], blocks: order.map(u => entries['uid:' + u].type + (entries['uid:' + u].enabled === '0' ? '(off)' : '')) }; }
  catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 800) }; }
}, { entry, draft, html, marker });
console.log(JSON.stringify(res));
await browser.close();
