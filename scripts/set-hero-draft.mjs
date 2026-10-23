// Sets only the hero image on an entry, inside an existing draft. No other field is sent.
// Usage: node scripts/set-hero-draft.mjs <entryId> <draftId> <assetId>
import { launch } from './lib.mjs';
const [entry, draft, asset] = process.argv.slice(2);
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${entry}?draftId=${draft}`, { waitUntil: 'networkidle' });
console.log(JSON.stringify(await page.evaluate(async ({ entry, draft, asset }) => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  if (String(ed.settings.draftId) !== draft || String(ed.settings.canonicalId) !== entry) return { error: 'wrong draft' };
  try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data: { elementId: entry, draftId: draft, siteId: '1', draftName: 'Hero image', modifiedDeltaNames: ['fields[heroImage]'], fields: { heroImage: [asset] } } });
    return { ok: r.data.message }; } catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 400) }; }
}, { entry, draft, asset })));
await browser.close();
