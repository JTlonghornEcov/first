// Single-H1 fix for /services/ppwr-compliance-design (entry 10050), saved into a draft:
// shows the site header (its Title is the one H1), moves the design's hero content into it, removes the design's
// duplicate hero section and the CSS that hid the header, and sets a proper SEO title and description.
// Usage: DRAFT_ID=<id> node scripts/fix-ppwr-h1.mjs
import { launch } from './lib.mjs';
import fs from 'node:fs';
const before = JSON.parse(fs.readFileSync('payloads/ppwr-design-10050-before.json'));
const [gc, cta] = before.blocks;
let html = gc.html[0].value;
const h1 = html.indexOf('<h1'), s = html.lastIndexOf('<section', h1), e = html.indexOf('</section>', h1) + '</section>'.length;
const heroSection = html.slice(s, e);
if (!heroSection.startsWith('<section class="ev-hero') || (html.match(/<h1/g) || []).length !== 1) throw new Error('unexpected hero markup');
html = html.slice(0, s) + html.slice(e);
if (!html.includes('main#main>section.hero{display:none}')) throw new Error('hide-hero rule not found');
html = html.replace('main#main>section.hero{display:none}', '');
fs.writeFileSync('payloads/ppwr-design-10050-after.html', html);

const intro = heroSection.match(/<\/h1>\s*(<p>[\s\S]*?<\/p>)\s*(<ul>[\s\S]*?<\/ul>)/);
if (!intro) throw new Error('hero intro not found');
const heroIntroduction = intro[1] + intro[2].replace(/\s*\n\s*/g, '');
const link = (value, label) => ({ type: 'url', url: { value }, label, target: '' });
const DRAFT = process.env.DRAFT_ID;
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/10050?draftId=${DRAFT}`, { waitUntil: 'networkidle' });
const res = await page.evaluate(async ({ DRAFT, html, heroIntroduction, gcUid, ctaUid }) => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  if (String(ed.settings.draftId) !== DRAFT || String(ed.settings.canonicalId) !== '10050') return { error: 'wrong draft' };
  const fd = new FormData(Craft.cp.$primaryForm[0]);
  const cur = fd.getAll('fields[pageBuilder][sortOrder][]');
  if (cur.join() !== [gcUid, ctaUid].join()) return { error: 'unexpected blocks', cur };
  const b1 = crypto.randomUUID(), b2 = crypto.randomUUID();
  const data = { elementId: '10050', draftId: DRAFT, siteId: '1', draftName: 'Single H1 + SEO title/description',
    modifiedDeltaNames: ['fields[heroIntroduction]', 'fields[heroButtons]', 'fields[heroImage]', 'fields[pageBuilder]', 'fields[seo]'],
    fields: {
      heroIntroduction,
      heroButtons: { sortOrder: [b1, b2], entries: {
        ['uid:' + b1]: { type: 'heroButtonItem', enabled: '1', fields: { heroButtonUrl: { type: 'url', url: { value: '#ev-book' }, label: 'Book a PPWR assessment', target: '' }, heroButtonStyle: 'default' } },
        ['uid:' + b2]: { type: 'heroButtonItem', enabled: '1', fields: { heroButtonUrl: { type: 'url', url: { value: '#ev-how' }, label: 'See how it works', target: '' }, heroButtonStyle: 'transparent' } } } },
      heroImage: ['9913'],
      pageBuilder: { sortOrder: cur, entries: { ['uid:' + gcUid]: { type: 'general_content', enabled: '1', fields: { generalContent: html } }, ['uid:' + ctaUid]: { type: 'callToAction', enabled: '1' } } },
      seo: { titleRaw: { 1: 'PPWR Compliance Service' }, description: 'From finding out which of your packs are in scope to Declarations of Conformity ready for you to sign. One team and one programme, valid in every EU market.' },
    } };
  try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data }); return { ok: true, msg: r.data.message }; }
  catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 600) }; }
}, { DRAFT, html, heroIntroduction, gcUid: gc.uid, ctaUid: before.blocks[1].uid });
console.log(JSON.stringify({ ...res, heroIntroduction: heroIntroduction.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 120) + '…', removedChars: heroSection.length }));
await browser.close();
