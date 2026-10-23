// Turns the my.ecoveritas page (entry 513, /powerful-epr-software) into a general Technology page, inside a draft.
// Pass 1: sets the CMS hero and SEO fields, disables every page-builder block except the client logo strip, and adds
// one general_content block (payloads/technology/body.html + the shared concept styles) before it.
// Pass 2: node scripts/drop-disabled.mjs 513 <draftId> <live uid prefixes>
// Usage: node scripts/save-technology-draft.mjs <draftId>
import fs from 'node:fs';
import { launch } from './lib.mjs';
const DRAFT = process.argv[2];
const html = `<style>\n${fs.readFileSync('payloads/strategy/shared.css', 'utf8')}</style>\n${fs.readFileSync('payloads/technology/body.html', 'utf8')}`;
fs.writeFileSync('payloads/technology/page.html', html);
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/513?draftId=${DRAFT}`, { waitUntil: 'networkidle' });
const res = await page.evaluate(async ({ DRAFT, html }) => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  if (String(ed.settings.draftId) !== DRAFT || String(ed.settings.canonicalId) !== '513') return { error: 'wrong draft' };
  const fd = new FormData(Craft.cp.$primaryForm[0]);
  const cur = fd.getAll('fields[pageBuilder][sortOrder][]');
  const get = (u, k) => fd.get(`fields[pageBuilder][entries][uid:${u}][${k}]`);
  const n = crypto.randomUUID(), order = [n], entries = { ['uid:' + n]: { type: 'general_content', enabled: '1', fields: { generalContent: html, spacing: 'medium', theme: 'default' } } };
  for (const u of cur) { order.push(u); entries['uid:' + u] = { type: get(u, 'type'), enabled: get(u, 'type') === 'logoSlider' ? '1' : '0' }; }
  const b1 = crypto.randomUUID(), b2 = crypto.randomUUID();
  const btn = (value, label, style) => ({ type: 'heroButtonItem', enabled: '1', fields: { heroButtonUrl: { type: 'url', url: { value }, label, target: '' }, heroButtonStyle: style } });
  const data = { elementId: '513', draftId: DRAFT, siteId: '1', draftName: 'Technology page',
    modifiedDeltaNames: ['fields[heroTitle]', 'fields[heroIntroduction]', 'fields[heroImage]', 'fields[heroButtons]', 'fields[pageBuilder]', 'fields[seo]'],
    fields: {
      heroTitle: 'Technology at Ecoveritas',
      heroIntroduction: '<p>We use technology in all sorts of ways to make our service faster, more accurate and easier to work with. With Ecohub our team does the data work for you, from your suppliers to your submission. Ecoview shows what it means for your costs, compliance and sustainability. And my.ecoveritas lets smaller businesses report for themselves.</p>',
      heroImage: ['6156'],
      heroButtons: { sortOrder: [b1, b2], entries: { ['uid:' + b1]: btn('#t-journey-h', 'How it fits together', 'default'), ['uid:' + b2]: btn('https://my.ecoveritas.com', 'Log in to my.ecoveritas', 'transparent') } },
      pageBuilder: { sortOrder: order, entries },
      seo: { titleRaw: { 1: 'Our Technology: Ecohub, Ecoview and my.ecoveritas' }, description: 'How Ecoveritas uses technology across its service: Ecohub, our hands-off EPR data service; Ecoview, packaging analytics that cut costs; and my.ecoveritas, self-serve EPR reporting for SMEs.' },
    } };
  try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data }); return { ok: r.data.message, live: cur.map(u => u.slice(0, 8)), blocks: order.map(u => entries['uid:' + u].type + (entries['uid:' + u].enabled === '0' ? '(off)' : '')) }; }
  catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 800) }; }
}, { DRAFT, html });
console.log(JSON.stringify(res));
await browser.close();
