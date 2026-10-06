// Builds the reformatted layout of each blog post into a new draft. Live posts are never edited.
// Usage: node scripts/build-blog.mjs <id> [<id> ...]   (reads payloads/blog/<id>.json and <id>.plan.json)
import { launch } from './lib.mjs';
import fs from 'node:fs';
const PLACEHOLDER = '10489';
const draftsFile = 'payloads/blog/drafts.json';
const drafts = fs.existsSync(draftsFile) ? JSON.parse(fs.readFileSync(draftsFile)) : {};
const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function excerptOf(post, plan) {
  const src = strip(post.heroIntroduction || '') || strip(plan.blocks[0].content);
  let out = '';
  for (const s of src.split(/(?<=[.?!])\s+/)) { if ((out + ' ' + s).trim().length > 220 && out) break; out = (out + ' ' + s).trim(); }
  return out;
}
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
for (const id of process.argv.slice(2)) {
  const post = JSON.parse(fs.readFileSync(`payloads/blog/${id}.json`));
  const plan = JSON.parse(fs.readFileSync(`payloads/blog/${id}.plan.json`));
  // 1. draft
  if (!drafts[id]) {
    await page.goto(`https://www.ecoveritas.com/admin/entries/x/${id}`, { waitUntil: 'networkidle' });
    await Promise.all([page.waitForURL(/draftId=\d+/, { timeout: 30000 }), page.locator('button.formsubmit[data-action="elements/save-draft"]').click()]);
    drafts[id] = page.url().match(/draftId=(\d+)/)[1];
    fs.writeFileSync(draftsFile, JSON.stringify(drafts, null, 1));
  }
  const draft = drafts[id];
  await page.goto(`https://www.ecoveritas.com/admin/entries/x/${id}?draftId=${draft}`, { waitUntil: 'networkidle' });
  // 2. layout save
  const res = await page.evaluate(async ({ id, draft, plan, excerpt, post, PLACEHOLDER }) => {
    const ed = Craft.cp.$primaryForm.data('elementEditor');
    if (String(ed.settings.draftId) !== draft || String(ed.settings.canonicalId) !== String(id)) return { error: 'wrong draft' };
    const fd = new FormData(Craft.cp.$primaryForm[0]);
    const cur = fd.getAll('fields[pageBuilder][sortOrder][]');
    const get = (u, k) => fd.get(`fields[pageBuilder][entries][uid:${u}][${k}]`);
    if (!cur.includes(plan.replaceUid) || get(plan.replaceUid, 'type') !== 'general_content') return { error: 'source block not found as expected' };
    const uuid = () => crypto.randomUUID();
    const order = [], entries = {};
    for (const u of cur) {
      order.push(u); entries['uid:' + u] = { type: get(u, 'type'), enabled: get(u, 'enabled') === '1' ? '1' : '0' };
      if (u !== plan.replaceUid) continue;
      entries['uid:' + u].enabled = '0';                                     // old text block: disabled, dropped in pass 2
      for (const b of plan.blocks) {
        const n = uuid(); order.push(n);
        if (b.type === 'general_content') entries['uid:' + n] = { type: b.type, enabled: '1', fields: { generalContent: b.content, spacing: 'small', theme: 'default' } };
        if (b.type === 'callToAction') entries['uid:' + n] = { type: b.type, enabled: '1', fields: { richTitle: b.content, theme: 'default' } };
        if (b.type === 'mediaCards') { const c = uuid();
          entries['uid:' + n] = { type: b.type, enabled: '1', fields: { spacing: 'medium', theme: 'default', mediaCardList: { sortOrder: [c], entries: { ['uid:' + c]: { type: 'mediaCardItem', enabled: '1', title: b.heading, fields: { mediaAsset: [PLACEHOLDER], generalContent: b.content, alignment: b.alignment } } } } } }; }
      }
    }
    const fields = { pageBuilder: { sortOrder: order, entries } }, deltas = ['fields[pageBuilder]'];
    if (!post.heroImage.length) { fields.heroImage = [PLACEHOLDER]; deltas.push('fields[heroImage]'); }
    if (!post.featuredImage.length) { fields.featuredImage = [PLACEHOLDER]; deltas.push('fields[featuredImage]'); }
    if (!post.excerpt && excerpt) { fields.excerpt = excerpt; deltas.push('fields[excerpt]'); }
    try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data: { elementId: String(id), draftId: draft, siteId: '1', draftName: 'Blog layout (formatting only)', modifiedDeltaNames: deltas, fields } }); return { ok: true, msg: r.data.message, set: deltas.map(d => d.slice(7, -1)) }; }
    catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 600) }; }
  }, { id, draft, plan, excerpt: excerptOf(post, plan), post, PLACEHOLDER });
  console.log(id, 'draft', draft, JSON.stringify(res));
}
await browser.close();
