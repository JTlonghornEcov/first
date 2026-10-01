// Links the "Explore our other regions" cards in Draft 2 (3820) to the region pages, matching the Europe page.
// Each card is checked first: it must belong only to a block inside draft 3820, never to the live page.
import { launch } from './lib.mjs';
const { browser, page } = await launch({ write: /actions\/elements\/save(\b|&|$)/ });
await page.goto('https://www.ecoveritas.com/admin/entries/x/8054?draftId=3820', { waitUntil: 'networkidle' });
const LINKS = { 10312: ['Europe', 'https://www.ecoveritas.com/compliance/europe'], 10313: ['Americas', 'https://www.ecoveritas.com/compliance/americas'], 10314: ['Asia & Australia', 'https://www.ecoveritas.com/compliance/asia-australia'] };
for (const [id, [label, url]] of Object.entries(LINKS)) {
  const info = await page.locator(`[data-id="${id}"]`).first().evaluate(e => ({ owner: e.dataset.ownerId, primary: e.dataset.primaryOwnerId, label: e.dataset.label,
    ownerInDraft: !!document.querySelector(`.field[data-attribute=pageBuilder] [data-id="${e.dataset.ownerId}"]`), draftId: String(Craft.cp.$primaryForm.data('elementEditor').settings.draftId) }));
  if (info.draftId !== '3820' || info.owner !== info.primary || !info.ownerInDraft || info.label !== label) { console.log('skip', id, JSON.stringify(info)); continue; }
  const r = await page.evaluate(async (d) => {
    try { const r = await Craft.sendActionRequest('POST', 'elements/save', { data: d }); return { ok: true, msg: r.data.message || '' }; }
    catch (e) { return { ok: false, err: e.message, data: JSON.stringify(e.response?.data).slice(0, 300) }; }
  }, { elementId: id, siteId: '1', fields: { buttonUrl: { type: 'url', url: { value: url }, label, target: '' } } });
  console.log('link', id, label, '→', url, JSON.stringify(r));
}
await browser.close();
