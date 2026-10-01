// Repairs draft 3808 with a minimal save (no full-form round trip through CKEditor):
//  - replaces the new card blocks keyed new1..new3 with identical blocks that get real UUIDs
//  - restores the original HTML of the quote block and the media card text
import { open } from './draft-edit.mjs';
import fs from 'node:fs';
const plan = JSON.parse(fs.readFileSync('payloads/ame-cards-plan.json'));
const orig = JSON.parse(fs.readFileSync('payloads/ame-original-html.json'));
plan[1].items[0].generalContent = orig.mediaCardContent;
const QUOTE_UID = 'bebb591e';

const { browser, page } = await open();
const res = await page.evaluate(async ({ plan, orig, QUOTE_UID }) => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  if (String(ed.settings.draftId) !== '3808') return { error: 'not on draft 3808' };
  const fd = new FormData(Craft.cp.$primaryForm[0]);
  const cur = fd.getAll('fields[pageBuilder][sortOrder][]');
  const get = (u, k) => fd.get(`fields[pageBuilder][entries][uid:${u}][${k}]`);
  const quoteUid = cur.find(u => u.startsWith(QUOTE_UID));
  if (!quoteUid || get(quoteUid, 'type') !== 'general_content') return { error: 'quote block not found' };

  const sortOrder = [], entries = {};
  for (const u of cur) {
    if (/^new\d$/.test(u)) continue;                                   // drop the badly keyed draft-only blocks
    const key = 'uid:' + u;
    sortOrder.push(key);
    entries[key] = { type: get(u, 'type'), enabled: get(u, 'enabled') === '1' ? '1' : '0' };
    if (u === quoteUid) entries[key].fields = { generalContent: orig.blockquote };
    const blk = plan.find(b => b.after === u);
    if (blk) {                                                           // re-add the image block right after its disabled original
      const nk = 'uid:' + crypto.randomUUID();
      const prev = cur[cur.indexOf(u) + 1];                              // the existing new* block, to copy block-level settings
      const list = { sortOrder: [], entries: {} };
      for (const it of blk.items) {
        const ck = 'uid:' + crypto.randomUUID();
        list.sortOrder.push(ck);
        list.entries[ck] = it.type === 'card'
          ? { type: 'card', enabled: '1', title: it.title, fields: { image: [String(it.image)], textContent: it.textContent, buttonUrl: { type: 'url', url: { value: '' }, label: '', target: '' } } }
          : { type: 'mediaCardItem', enabled: '1', title: it.title, fields: { mediaAsset: [String(it.mediaAsset)], generalContent: it.generalContent, alignment: it.alignment } };
      }
      const fields = { [blk.list]: list };
      for (const k of ['introduction', 'spacing', 'theme']) { const v = get(prev, `fields][${k}`); if (v !== null) fields[k] = v; }
      entries[nk] = { type: blk.type, enabled: '1', fields };
      const t = get(prev, 'title'); if (t !== null) entries[nk].title = t;
      sortOrder.push(nk);
    }
  }
  const data = { elementId: '8054', draftId: '3808', siteId: '1', draftName: ed.settings.draftName || 'Draft 1',
    modifiedDeltaNames: ['fields[pageBuilder]'], fields: { pageBuilder: { sortOrder, entries } } };
  try {
    const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data });
    return { ok: true, msg: r.data.message, sortOrder: sortOrder.map(s => s.slice(4, 12) + ':' + entries[s].type + (entries[s].enabled === '0' ? '(off)' : '')) };
  } catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 800) }; }
}, { plan, orig, QUOTE_UID });
console.log(JSON.stringify(res, null, 1));
await browser.close();
