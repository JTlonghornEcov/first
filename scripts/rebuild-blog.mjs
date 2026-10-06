// Replaces the blocks this tooling generated in a blog draft with a fresh plan. Blocks that also exist on the live post
// (same UID as the original export) are kept untouched; it refuses to drop anything else that isn't draft-only.
// Usage: node scripts/rebuild-blog.mjs <id> [<id> ...]
import { launch } from './lib.mjs';
import fs from 'node:fs';
const PLACEHOLDER = '10489';
const drafts = JSON.parse(fs.readFileSync('payloads/blog/drafts.json'));
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
for (const id of process.argv.slice(2)) {
  const post = JSON.parse(fs.readFileSync(`payloads/blog/${id}.json`));
  const plan = JSON.parse(fs.readFileSync(`payloads/blog/${id}.plan.json`));
  const draft = drafts[id];
  const liveUids = post.blocks.map(b => b.uid);
  await page.goto(`https://www.ecoveritas.com/admin/entries/x/${id}?draftId=${draft}`, { waitUntil: 'networkidle' });
  const res = await page.evaluate(async ({ id, draft, plan, liveUids, PLACEHOLDER }) => {
    const ed = Craft.cp.$primaryForm.data('elementEditor');
    if (String(ed.settings.draftId) !== draft || String(ed.settings.canonicalId) !== String(id)) return { error: 'wrong draft' };
    const fd = new FormData(Craft.cp.$primaryForm[0]);
    const cur = fd.getAll('fields[pageBuilder][sortOrder][]');
    const get = (u, k) => fd.get(`fields[pageBuilder][entries][uid:${u}][${k}]`);
    if (cur.includes(plan.replaceUid)) return { error: 'original text block still present; run build-blog first' };
    const kept = cur.filter(u => liveUids.includes(u));
    const firstGen = cur.findIndex(u => !liveUids.includes(u));
    if (firstGen < 0) return { error: 'no generated blocks found' };
    const uuid = () => crypto.randomUUID();
    const order = [], entries = {};
    const keep = u => { order.push(u); entries['uid:' + u] = { type: get(u, 'type'), enabled: get(u, 'enabled') === '1' ? '1' : '0' }; };
    cur.slice(0, firstGen).filter(u => liveUids.includes(u)).forEach(keep);
    for (const b of plan.blocks) {
      const n = uuid(); order.push(n);
      if (b.type === 'general_content') entries['uid:' + n] = { type: b.type, enabled: '1', fields: { generalContent: b.content, spacing: 'small', theme: 'default' } };
      if (b.type === 'callToAction') entries['uid:' + n] = { type: b.type, enabled: '1', fields: { richTitle: b.content, theme: 'default' } };
      if (b.type === 'mediaCards') { const c = uuid();
        entries['uid:' + n] = { type: b.type, enabled: '1', fields: { spacing: 'medium', theme: 'default', mediaCardList: { sortOrder: [c], entries: { ['uid:' + c]: { type: 'mediaCardItem', enabled: '1', title: b.heading, fields: { mediaAsset: [PLACEHOLDER], generalContent: b.content, alignment: b.alignment } } } } } }; }
    }
    cur.slice(firstGen).filter(u => liveUids.includes(u)).forEach(keep);
    const dropped = cur.filter(u => !liveUids.includes(u));
    try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data: { elementId: String(id), draftId: draft, siteId: '1', modifiedDeltaNames: ['fields[pageBuilder]'], fields: { pageBuilder: { sortOrder: order, entries } } } });
      return { ok: true, msg: r.data.message, kept: kept.map(u => get(u, 'type')), replaced: dropped.length, now: plan.blocks.length }; }
    catch (e) { return { error: e.message }; }
  }, { id, draft, plan, liveUids, PLACEHOLDER });
  console.log(id, draft, JSON.stringify(res));
}
await browser.close();
