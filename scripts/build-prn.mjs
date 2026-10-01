// Builds the PRN audit page design (payloads/prn-v1.json) into a draft of entry 9486 with one minimal save.
// Matrix/Super Table data: sortOrder holds bare UIDs, entries are keyed "uid:<uid>".
import { launch } from './lib.mjs';
import fs from 'node:fs';
const ENTRY = '9486', DRAFT = process.env.DRAFT_ID || '3831';
const CTA_UID = 'd083a798-1d9c-49a5-8cc2-1e50dff0dc44';
const P = JSON.parse(fs.readFileSync(process.env.PAYLOAD || 'payloads/prn-v1.json'));
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${ENTRY}?draftId=${DRAFT}`, { waitUntil: 'networkidle' });
const res = await page.evaluate(async ({ P, ENTRY, DRAFT, CTA_UID }) => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  if (String(ed.settings.draftId) !== DRAFT || String(ed.settings.canonicalId) !== ENTRY) return { error: 'wrong draft' };
  const id = () => crypto.randomUUID();
  const link = (value, label) => ({ type: 'url', url: { value }, label, target: '' });
  const blocks = [];
  blocks.push([id(), { type: 'alert', enabled: '1', fields: { alertType: 'yellow', alertText: P.alert, alertClose: '', spacing: 'small', theme: 'default' } }]);
  blocks.push([id(), { type: 'columns', enabled: '1', fields: { generalContent: P.columnsLeft, generalContent2: P.columnsRight, spacing: 'large', theme: 'default' } }]);
  const cards = { sortOrder: [], entries: {} };
  for (const c of P.howCards) { const u = id(); cards.sortOrder.push(u);
    cards.entries['uid:' + u] = { type: 'card', enabled: '1', title: c.title, fields: { image: [String(c.image)], textContent: c.text, buttonUrl: link('', '') } }; }
  blocks.push([id(), { type: 'cards', enabled: '1', title: P.howTitle, fields: { introduction: '', cardList: cards, spacing: 'large', theme: 'alternate' } }]);
  blocks.push([CTA_UID, { type: 'callToAction', enabled: '1', fields: { richTitle: P.ctaHtml } }]);
  blocks.push([id(), { type: 'general_content', enabled: '1', fields: { generalContent: P.footnote, spacing: 'small', theme: 'default' } }]);
  const hb = id();
  const data = { elementId: ENTRY, draftId: DRAFT, siteId: '1', draftName: 'Redesign from one-pager',
    modifiedDeltaNames: ['fields[heroTitle]', 'fields[heroIntroduction]', 'fields[heroImage]', 'fields[heroButtons]', 'fields[pageBuilder]'],
    fields: {
      heroTitle: P.heroTitle, heroIntroduction: P.heroIntroduction, heroImage: [String(P.heroImage)],
      heroButtons: { sortOrder: [hb], entries: { ['uid:' + hb]: { type: 'heroButtonItem', enabled: '1', fields: { heroButtonUrl: link(P.heroButton.anchor, P.heroButton.label), heroButtonStyle: 'default' } } } },
      pageBuilder: { sortOrder: blocks.map(b => b[0]), entries: Object.fromEntries(blocks.map(([u, e]) => ['uid:' + u, e])) } } };
  try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data }); return { ok: true, msg: r.data.message, errors: r.data.errors || r.data.element?.errors }; }
  catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 1200) }; }
}, { P, ENTRY, DRAFT, CTA_UID });
console.log(JSON.stringify(res, null, 1));
await browser.close();
