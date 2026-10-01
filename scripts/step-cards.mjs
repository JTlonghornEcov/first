// Adds new card blocks (with images) after the original ones in draft 3808 and disables the originals.
// New cards belong to the draft only; the shared live cards are never edited.
import { open } from './draft-edit.mjs';
import fs from 'node:fs';
const cur = JSON.parse(fs.readFileSync('payloads/ame-cards-current.json'));
const v = (id, k) => cur[id][k] ?? '';

const card = (id, image) => ({ type: 'card', title: v(id, '[title]'), image, textContent: v(id, '[fields][textContent]') });
const PLAN = [
  { after: '2bb83f9e-d921-4c1b-be88-953ad97833cd', key: 'new1', type: 'cards', list: 'cardList',
    items: [card(8058, 9395), card(8059, 9399), card(8060, 9394)] },
  { after: '57073d45-7327-477c-a1cf-0e017ef6171b', key: 'new2', type: 'mediaCards', list: 'mediaCardList',
    items: [{ type: 'mediaCardItem', title: v(8071, '[title]'), mediaAsset: 8862, generalContent: v(8071, '[fields][generalContent]'), alignment: v(8071, '[fields][alignment]') }] },
  { after: '518be4f8-b3d4-4300-947e-8aaaeec1d9ff', key: 'new3', type: 'cards', list: 'cardList',
    items: [card(8103, 9389), card(8104, 9420), card(8105, 9428)] },
];
fs.writeFileSync('payloads/ame-cards-plan.json', JSON.stringify(PLAN, null, 1));

const { browser, page } = await open();
const result = await page.evaluate(async (PLAN) => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  const p = new URLSearchParams(ed.serializeForm(true));
  p.delete('action');
  if (p.get('elementId') !== '8054') return { error: 'unexpected element ' + p.get('elementId') };
  if (String(ed.settings.draftId) !== '3808') return { error: 'editor is not on draft 3808: ' + ed.settings.draftId };
  p.set('draftId', '3808'); p.set('draftName', ed.settings.draftName || 'Draft 1');
  const B = 'fields[pageBuilder]';
  const order = p.getAll(`${B}[sortOrder][]`);
  p.delete(`${B}[sortOrder][]`);
  for (const blk of PLAN) {
    const o = `${B}[entries][uid:${blk.after}]`;
    if (p.get(`${o}[type]`) !== blk.type) return { error: 'block type mismatch ' + blk.after };
    p.set(`${o}[enabled]`, '0');                                  // disable the original (draft-owned copy)
    const n = `${B}[entries][${blk.key}]`;
    p.set(`${n}[type]`, blk.type); p.set(`${n}[enabled]`, '1');
    for (const k of ['title', 'fields][introduction', 'fields][spacing', 'fields][theme']) {
      const val = p.get(`${o}[${k}]`); if (val !== null) p.set(`${n}[${k}]`, val);
    }
    blk.items.forEach((it, i) => {
      const c = `${n}[fields][${blk.list}][entries][new${i + 1}]`;
      p.append(`${n}[fields][${blk.list}][sortOrder][]`, `new${i + 1}`);
      p.set(`${c}[type]`, it.type); p.set(`${c}[enabled]`, '1'); p.set(`${c}[title]`, it.title);
      if (it.type === 'card') {
        p.append(`${c}[fields][image][]`, String(it.image));
        p.set(`${c}[fields][textContent]`, it.textContent);
        p.set(`${c}[fields][buttonUrl][type]`, 'url'); p.set(`${c}[fields][buttonUrl][url][value]`, '');
        p.set(`${c}[fields][buttonUrl][label]`, ''); p.set(`${c}[fields][buttonUrl][target]`, '');
      } else {
        p.append(`${c}[fields][mediaAsset][]`, String(it.mediaAsset));
        p.set(`${c}[fields][generalContent]`, it.generalContent);
        p.set(`${c}[fields][alignment]`, it.alignment);
      }
    });
    order.splice(order.indexOf(blk.after) + 1, 0, blk.key);
  }
  for (const u of order) p.append(`${B}[sortOrder][]`, u);
  p.delete('modifiedDeltaNames[]'); p.append('modifiedDeltaNames[]', B);
  try {
    const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data: p.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return { ok: true, msg: r.data.message || r.data.notice || '', draftId: r.data.draftId ?? r.data.element?.draftId, order };
  } catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 800) }; }
}, PLAN);
console.log(JSON.stringify(result, null, 1));
await browser.close();
