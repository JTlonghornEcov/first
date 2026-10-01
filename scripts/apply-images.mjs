// One minimal save into a fresh draft of entry 8054 (Africa & Middle East). Only the listed fields are sent,
// so nothing else goes through CKEditor. Matrix data format: sortOrder holds bare UIDs, entries are keyed "uid:<uid>".
import { open, DRAFT_ID } from './draft-edit.mjs';
import fs from 'node:fs';
const plan = JSON.parse(fs.readFileSync('payloads/ame-cards-plan.json'));
const orig = JSON.parse(fs.readFileSync('payloads/ame-original-html.json'));
plan[1].items[0].generalContent = orig.mediaCardContent;
// The live (canonical) block UIDs that a fresh draft starts from.
['78c9c3de-f827-4bd4-ad5f-02475cf00d22', '61832aa6-3313-4ffc-a935-2ccdb016b780', 'b39e8a9d-7312-4ca7-b512-7ae26b4256a5'].forEach((u, i) => { plan[i].after = u; });
const CTA_UID = 'fc9ded6f-06f0-4abf-ab4a-ed90d41dceba';
const CTA_HTML = "<h3>Expanding across Africa or the Middle East?</h3><p>Get ahead of it. Our team already manages compliance in the region's established markets, and we're watching the rest for you.</p>";
const HERO = 9406;

const { browser, page } = await open();
const res = await page.evaluate(async ({ plan, CTA_UID, CTA_HTML, HERO, DRAFT_ID }) => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  if (String(ed.settings.draftId) !== DRAFT_ID) return { error: 'editor not on draft ' + DRAFT_ID };
  const fd = new FormData(Craft.cp.$primaryForm[0]);
  const cur = fd.getAll('fields[pageBuilder][sortOrder][]');
  const get = (u, k) => fd.get(`fields[pageBuilder][entries][uid:${u}][${k}]`);
  if (cur.length !== 10 || !cur.includes(CTA_UID) || get(CTA_UID, 'type') !== 'callToAction') return { error: 'unexpected starting state', cur };
  for (const b of plan) if (get(b.after, 'type') !== b.type) return { error: 'type mismatch ' + b.after };

  const sortOrder = [], entries = {};
  for (const u of cur) {
    sortOrder.push(u);
    entries['uid:' + u] = { type: get(u, 'type'), enabled: get(u, 'enabled') === '1' ? '1' : '0' };
    if (u === CTA_UID) entries['uid:' + u].fields = { richTitle: CTA_HTML };
    const blk = plan.find(b => b.after === u);
    if (!blk) continue;
    entries['uid:' + u].enabled = '0';                                  // disable the original in this draft
    const list = { sortOrder: [], entries: {} };
    for (const it of blk.items) {
      const cu = crypto.randomUUID();
      list.sortOrder.push(cu);
      list.entries['uid:' + cu] = it.type === 'card'
        ? { type: 'card', enabled: '1', title: it.title, fields: { image: [String(it.image)], textContent: it.textContent, buttonUrl: { type: 'url', url: { value: '' }, label: '', target: '' } } }
        : { type: 'mediaCardItem', enabled: '1', title: it.title, fields: { mediaAsset: [String(it.mediaAsset)], generalContent: it.generalContent, alignment: it.alignment } };
    }
    const fields = { [blk.list]: list };
    for (const k of ['introduction', 'spacing', 'theme']) { const v = get(u, `fields][${k}`); if (v !== null) fields[k] = v; }
    const nu = crypto.randomUUID();
    entries['uid:' + nu] = { type: blk.type, enabled: '1', fields };
    const t = get(u, 'title'); if (t !== null) entries['uid:' + nu].title = t;
    sortOrder.push(nu);
  }
  const data = { elementId: '8054', draftId: DRAFT_ID, siteId: '1', draftName: 'Images for empty slots + CTA copy fix',
    modifiedDeltaNames: ['fields[heroImage]', 'fields[pageBuilder]'],
    fields: { heroImage: [String(HERO)], pageBuilder: { sortOrder, entries } } };
  try {
    const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data });
    return { ok: true, msg: r.data.message, blocks: sortOrder.map(u => u.slice(0, 8) + ':' + entries['uid:' + u].type + (entries['uid:' + u].enabled === '0' ? '(off)' : '')) };
  } catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 800) }; }
}, { plan, CTA_UID, CTA_HTML, HERO, DRAFT_ID });
console.log(JSON.stringify(res, null, 1));
await browser.close();
