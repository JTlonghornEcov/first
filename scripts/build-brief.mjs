// Applies payloads/brief-three-pages.json to drafts of 9312, 9339 and 9367 with minimal saves.
// Nested items shared with the live page are never edited: accordions are rebuilt as new draft-only blocks and the
// old block is disabled in the draft (removed in a second pass by drop-disabled). Usage: node scripts/build-brief.mjs <page1|page2|page3>
import { launch } from './lib.mjs';
import fs from 'node:fs';
const which = process.argv[2];
const PAY = JSON.parse(fs.readFileSync('payloads/brief-three-pages.json'));
const CFG = {
  page1: { entry: '9312', draft: '3833' },
  page2: { entry: '9339', draft: '3834' },
  page3: { entry: '9367', draft: '3835' },
}[which];
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${CFG.entry}?draftId=${CFG.draft}`, { waitUntil: 'networkidle' });
const res = await page.evaluate(async ({ which, P, CFG }) => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  if (String(ed.settings.draftId) !== CFG.draft || String(ed.settings.canonicalId) !== CFG.entry) return { error: 'wrong draft' };
  const fd = new FormData(Craft.cp.$primaryForm[0]);
  const cur = fd.getAll('fields[pageBuilder][sortOrder][]');
  const get = (u, k) => fd.get(`fields[pageBuilder][entries][uid:${u}][${k}]`);
  const id = () => crypto.randomUUID();
  const keep = u => ({ type: get(u, 'type'), enabled: get(u, 'enabled') === '1' ? '1' : '0' });
  const list = (type, items) => { const l = { sortOrder: [], entries: {} };
    for (const it of items) { const u = id(); l.sortOrder.push(u); l.entries['uid:' + u] = { type, enabled: '1', title: it.title, fields: { generalContent: it.content } }; } return l; };
  const order = [], entries = {}, deltas = ['fields[pageBuilder]'], fields = {};
  const push = (u, e) => { order.push(u); entries['uid:' + u] = e; };
  const findType = t => cur.filter(u => get(u, 'type') === t);

  if (which === 'page1') {
    const expect = ['alert', 'columns', 'cards', 'general_content', 'callToAction'];
    if (cur.map(u => get(u, 'type')).join() !== expect.join()) return { error: 'unexpected blocks', got: cur.map(u => get(u, 'type')) };
    const [alert, cols, cards, gc, cta] = cur;
    if (!/Which is Ecoveritas/.test(get(gc, 'fields][generalContent'))) return { error: 'which-is block not found' };
    push(alert, keep(alert));
    push(id(), { type: 'tabs', enabled: '1', title: P.tabsTitle, fields: { introduction: '', tabItems: list('tab', P.tabs), spacing: 'medium', theme: 'alternate' } });
    push(cols, keep(cols));
    push(cards, keep(cards));
    push(gc, { ...keep(gc), fields: { generalContent: P.whichIs, theme: 'default' } });
    push(cta, { ...keep(cta), fields: { richTitle: P.cta, theme: 'alternate' } });
    const hb = id();
    fields.heroIntroduction = P.heroIntroduction;
    fields.heroButtons = { sortOrder: [hb], entries: { ['uid:' + hb]: { type: 'heroButtonItem', enabled: '1', fields: { heroButtonUrl: { type: 'url', url: { value: P.heroButton.url }, label: P.heroButton.label, target: '' }, heroButtonStyle: 'default' } } } };
    deltas.push('fields[heroIntroduction]', 'fields[heroButtons]');
  } else {
    const acc = findType('accordion');
    if (acc.length !== 1) return { error: 'expected one accordion', cur };
    for (const u of cur) {
      if (u !== acc[0]) { push(u, keep(u)); continue; }
      push(u, { ...keep(u), enabled: '0' });                                  // old block: disabled in this draft
      const nf = { introduction: get(u, 'fields][introduction') || '', accordionItems: list('accordionItem', P.items) };
      for (const k of ['spacing', 'theme']) { const v = get(u, `fields][${k}`); if (v) nf[k] = v; }
      push(id(), { type: 'accordion', enabled: '1', title: get(u, 'title'), fields: nf });
      if (which === 'page3') push(id(), { type: 'general_content', enabled: '1', fields: { generalContent: P.sources, spacing: 'small', theme: 'alternate' } });
    }
  }
  fields.pageBuilder = { sortOrder: order, entries };
  const data = { elementId: CFG.entry, draftId: CFG.draft, siteId: '1', draftName: 'Complete page from build brief', modifiedDeltaNames: deltas, fields };
  try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data }); return { ok: true, msg: r.data.message, blocks: order.map(u => entries['uid:' + u].type + (entries['uid:' + u].enabled === '0' ? '(off)' : '')) }; }
  catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 1000) }; }
}, { which, P: PAY[which], CFG });
console.log(which, JSON.stringify(res));
await browser.close();
