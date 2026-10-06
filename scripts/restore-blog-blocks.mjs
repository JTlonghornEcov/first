// Re-adds the original "find out more" cards and contact blocks to blog drafts 7110, 6888, 7739 and 4351
// (copied exactly from payloads/blog/restore-source.json). Draft-only; live posts are not touched.
import { launch } from './lib.mjs';
import fs from 'node:fs';
const S = JSON.parse(fs.readFileSync('payloads/blog/restore-source.json'));
const drafts = JSON.parse(fs.readFileSync('payloads/blog/drafts.json'));
const card = id => { const c = S.cards[id]; return { type: 'card', enabled: '1', title: c.title, fields: { image: c.imageIds, textContent: c['fields[textContent]'],
  buttonUrl: { type: c['fields[buttonUrl][type]'], entry: { value: c['fields[buttonUrl][entry][value]'] }, url: { value: c['fields[buttonUrl][url][value]'] }, label: c['fields[buttonUrl][label]'], target: c['fields[buttonUrl][target]'] } } }; };
const ADD = {
  7110: [{ type: 'cards', title: 'Learn More About Packaging EPR', fields: { introduction: S.posts[7110]['7105109f-7f3a-44fb-82da-57c8a16fd238:introduction'], spacing: 'base64:c21hbGw=', theme: 'base64:ZGVmYXVsdA==' }, cards: [7140, 7141, 7142] },
         { type: 'callToAction', fields: { richTitle: S.posts[7110]['9c40c1eb-4ef8-4440-aac3-b36a271108c9:richTitle'], theme: 'base64:ZGVmYXVsdA==' } }],
  6888: [{ type: 'cards', title: 'Find out more', fields: { introduction: '', spacing: 'base64:c21hbGw=', theme: 'base64:ZGVmYXVsdA==' }, cards: [6932, 6933, 6934] },
         { type: 'callToAction', fields: { richTitle: S.posts[6888]['50a00246-e6ba-406c-8092-ca526ca8e111:richTitle'], theme: 'base64:ZGVmYXVsdA==' } }],
  7739: [{ type: 'callToAction', fields: { richTitle: S.posts[7739]['ddb4393b-6f5d-4763-a255-4627ba374134:richTitle'], theme: 'base64:ZGVmYXVsdA==' } }],
  4351: [{ type: 'callToAction', fields: { richTitle: S.posts[4351]['f1e67ef9-7f5d-4dff-8c29-d769bdbd5146:richTitle'], theme: 'base64:ZGVmYXVsdA==' } }],
};
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
for (const id of Object.keys(ADD)) {
  const add = ADD[id].map(b => { const e = { type: b.type, enabled: '1', fields: { ...b.fields } }; if (b.title) e.title = b.title;
    if (b.cards) { const l = { sortOrder: [], entries: {} }; for (const cid of b.cards) { const u = crypto.randomUUID(); l.sortOrder.push(u); l.entries['uid:' + u] = card(cid); } e.fields.cardList = l; }
    return e; });
  await page.goto(`https://www.ecoveritas.com/admin/entries/x/${id}?draftId=${drafts[id]}`, { waitUntil: 'networkidle' });
  const res = await page.evaluate(async ({ id, draft, add }) => {
    const ed = Craft.cp.$primaryForm.data('elementEditor');
    if (String(ed.settings.draftId) !== draft) return { error: 'wrong draft' };
    const fd = new FormData(Craft.cp.$primaryForm[0]);
    const cur = fd.getAll('fields[pageBuilder][sortOrder][]');
    const get = (u, k) => fd.get(`fields[pageBuilder][entries][uid:${u}][${k}]`);
    if (cur.some(u => ['cards', 'callToAction'].includes(get(u, 'type')) && add.some(a => a.type === get(u, 'type')))) return { error: 'block type already present; not adding twice' };
    const order = [...cur], entries = Object.fromEntries(cur.map(u => ['uid:' + u, { type: get(u, 'type'), enabled: '1' }]));
    for (const a of add) { const u = crypto.randomUUID(); order.push(u); entries['uid:' + u] = a; }
    try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data: { elementId: id, draftId: draft, siteId: '1', modifiedDeltaNames: ['fields[pageBuilder]'], fields: { pageBuilder: { sortOrder: order, entries } } } });
      return { ok: true, msg: r.data.message, blocks: order.length }; } catch (e) { return { error: e.message }; }
  }, { id, draft: drafts[id], add });
  console.log(id, JSON.stringify(res));
}
await browser.close();
