// Sets the CMS hero on the EPR Fee Audit page (entry 10865) in a draft: intro line, two buttons and image. Only these
// fields are sent, so the page builder in the draft is untouched.
// Usage: node scripts/save-fee-audit-hero.mjs <draftId>
import { launch } from './lib.mjs';
const DRAFT = process.argv[2];
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/10865?draftId=${DRAFT}`, { waitUntil: 'networkidle' });
const res = await page.evaluate(async DRAFT => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  if (String(ed.settings.draftId) !== DRAFT || String(ed.settings.canonicalId) !== '10865') return { error: 'wrong draft' };
  const b1 = crypto.randomUUID(), b2 = crypto.randomUUID();
  const btn = (value, label, style) => ({ type: 'heroButtonItem', enabled: '1', fields: { heroButtonUrl: { type: 'url', url: { value }, label, target: '' }, heroButtonStyle: style } });
  const data = { elementId: '10865', draftId: DRAFT, siteId: '1',
    modifiedDeltaNames: ['fields[heroIntroduction]', 'fields[heroButtons]', 'fields[heroImage]'],
    fields: {
      heroIntroduction: "<p>An independent audit of your packaging data that finds and removes the EPR fees you shouldn't be paying.</p>",
      heroButtons: { sortOrder: [b1, b2], entries: { ['uid:' + b1]: btn('#ev-book', 'Book an EPR Fee Audit', 'default'), ['uid:' + b2]: btn('#ev-include', 'What it includes', 'transparent') } },
      heroImage: ['8933'],
    } };
  try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data }); return { ok: true, msg: r.data.message }; }
  catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 600) }; }
}, DRAFT);
console.log(JSON.stringify(res));
await browser.close();
