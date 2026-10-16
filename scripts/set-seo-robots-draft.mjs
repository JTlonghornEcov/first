// Sets the SEO robots value on an entry inside an existing draft, keeping the SEO title, description and canonical as they
// are in that draft. Only the SEO field is sent. Usage: node scripts/set-seo-robots-draft.mjs <entryId> <draftId> <robots,comma>
import { launch } from './lib.mjs';
const [entry, draft, robots] = process.argv.slice(2);
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${entry}?draftId=${draft}`, { waitUntil: 'networkidle' });
console.log(JSON.stringify(await page.evaluate(async ({ entry, draft, robots }) => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  if (String(ed.settings.draftId) !== draft || String(ed.settings.canonicalId) !== entry) return { error: 'wrong draft' };
  const fd = new FormData(Craft.cp.$primaryForm[0]);
  const before = { title: fd.get('fields[seo][titleRaw][1]'), description: fd.get('fields[seo][description]'), robots: fd.getAll('fields[seo][advanced][robots][]'), canonical: fd.get('fields[seo][advanced][canonical]') };
  const seo = { titleRaw: { 1: before.title }, description: before.description, advanced: { robots: robots.split(','), canonical: before.canonical || '' } };
  try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data: { elementId: entry, draftId: draft, siteId: '1', draftName: 'Noindex', modifiedDeltaNames: ['fields[seo]'], fields: { seo } } });
    return { ok: r.data.message, before, robots: seo.advanced.robots }; }
  catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 600) }; }
}, { entry, draft, robots })));
await browser.close();
