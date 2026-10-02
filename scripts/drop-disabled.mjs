// Removes disabled draft-only copies of blocks from a draft. Refuses if a disabled block still has the live block's UID.
// Usage: node scripts/drop-disabled.mjs <entryId> <draftId> <liveUidPrefix,...>
import { launch } from './lib.mjs';
const [entry, draft, liveUids] = process.argv.slice(2);
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${entry}?draftId=${draft}`, { waitUntil: 'networkidle' });
const res = await page.evaluate(async ({ entry, draft, live }) => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  if (String(ed.settings.draftId) !== draft) return { error: 'wrong draft' };
  const fd = new FormData(Craft.cp.$primaryForm[0]);
  const cur = fd.getAll('fields[pageBuilder][sortOrder][]');
  const get = (u, k) => fd.get(`fields[pageBuilder][entries][uid:${u}][${k}]`);
  const off = cur.filter(u => get(u, 'enabled') !== '1');
  if (off.length !== 1) return { error: 'expected exactly one disabled block', off };
  if (live.some(p => off[0].startsWith(p))) return { error: 'disabled block still has the live UID; not dropping', uid: off[0] };
  const keepList = cur.filter(u => u !== off[0]);
  const entries = Object.fromEntries(keepList.map(u => ['uid:' + u, { type: get(u, 'type'), enabled: '1' }]));
  try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data: { elementId: entry, draftId: draft, siteId: '1', modifiedDeltaNames: ['fields[pageBuilder]'], fields: { pageBuilder: { sortOrder: keepList, entries } } } });
    return { ok: true, msg: r.data.message, dropped: off[0].slice(0, 8) + ':' + get(off[0], 'type'), left: keepList.map(u => u.slice(0, 8) + ':' + get(u, 'type')) }; }
  catch (e) { return { error: e.message }; }
}, { entry, draft, live: liveUids.split(',') });
console.log(entry, JSON.stringify(res));
await browser.close();
