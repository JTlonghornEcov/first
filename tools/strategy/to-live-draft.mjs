// Puts a strategic-review concept page into a draft of its LIVE entry, ready for a person to apply.
// Pass 1 (this script): sets the CMS hero (title, intro, image, buttons) and SEO title/description from
// payloads/strategy/<slug>/page.json, disables every existing page-builder block (except types listed in KEEP),
// and adds the concept body (general_content) plus a contact block (callToAction carrying #evx-contact).
// Pass 2: node scripts/drop-disabled.mjs <entryId> <draftId> <live uid prefixes printed by this script>
// The 'under review' note is stripped from the EU map for live use.
// Usage: [KEEP=logoSlider] node tools/strategy/to-live-draft.mjs <slug> <entryId> <draftId>
import fs from 'node:fs';
import { launch } from '../../scripts/lib.mjs';
const [slug, entry, DRAFT] = process.argv.slice(2);
const keep = (process.env.KEEP || '').split(',').filter(Boolean);
const dir = `payloads/strategy/${slug}`;
const P = JSON.parse(fs.readFileSync(`${dir}/page.json`, 'utf8'));
let body = fs.readFileSync(`${dir}/body.html`, 'utf8');
for (const [k, f] of Object.entries(P.includes || {})) body = body.replace(`{{${k}}}`, fs.readFileSync(f, 'utf8'));
body = body.replace(/\n?\s*<p class="evx-note">Draft: country details are being reviewed by our policy team<\/p>/, '');
if (/\{\{[A-Z_]+\}\}/.test(body) || /being reviewed by our policy team/.test(body)) throw new Error('unfilled placeholder or review note left');
const html = `<style>\n${fs.readFileSync('payloads/strategy/shared.css', 'utf8')}\n${P.css || ''}</style>\n${body}\n${fs.readFileSync('payloads/shared/enquiry-prefill.html', 'utf8')}`;
fs.writeFileSync(`${dir}/live.html`, html);
if (!P.seoTitle) throw new Error('page.json needs seoTitle and seoDescription for a live page');

const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${entry}?draftId=${DRAFT}`, { waitUntil: 'networkidle' });
const hasButtons = await page.evaluate(() => !!document.querySelector('[data-attribute="heroButtons"]'));
// Entry types without a hero-buttons field (e.g. 'All compliance' pages) get the hero actions as a button row at the top of the body.
const bodyHtml = hasButtons || !(P.buttons || []).length ? html : html.replace(/(<div class="evc"[^>]*>)/, `$1\n<div class="btns" style="margin-bottom:calc(-1 * clamp(32px,5vw,64px))">${P.buttons.map(([h, l], i) => `<a class="btn${i ? ' ghost' : ''}" href="${h}">${l}${i ? '' : ' <span aria-hidden="true">&#8594;</span>'}</a>`).join('')}</div>`);
if (bodyHtml !== html) fs.writeFileSync(`${dir}/live.html`, bodyHtml);
const res = await page.evaluate(async ({ entry, DRAFT, html, P, keep, hasButtons }) => {
  const ed = Craft.cp.$primaryForm.data('elementEditor');
  if (String(ed.settings.draftId) !== DRAFT || String(ed.settings.canonicalId) !== entry) return { error: 'wrong draft' };
  const fd = new FormData(Craft.cp.$primaryForm[0]);
  const cur = fd.getAll('fields[pageBuilder][sortOrder][]');
  const get = (u, k) => fd.get(`fields[pageBuilder][entries][uid:${u}][${k}]`);
  const g = crypto.randomUUID(), c = crypto.randomUUID();
  const order = [g], entries = { ['uid:' + g]: { type: 'general_content', enabled: '1', fields: { generalContent: html, spacing: 'medium', theme: 'default' } } };
  const kept = [];
  for (const u of cur) { const t = get(u, 'type'); order.push(u); entries['uid:' + u] = { type: t, enabled: keep.includes(t) ? '1' : '0' }; if (keep.includes(t)) kept.push(t); }
  order.push(c); entries['uid:' + c] = { type: 'callToAction', enabled: '1', fields: { richTitle: `<h2 id="evx-contact">${P.ctaTitle}</h2><p>${P.ctaText}</p>`, theme: 'default' } };
  const ids = (P.buttons || []).map(() => crypto.randomUUID());
  const heroButtons = { sortOrder: ids, entries: Object.fromEntries((P.buttons || []).map(([value, label], i) => ['uid:' + ids[i], { type: 'heroButtonItem', enabled: '1', fields: { heroButtonUrl: { type: 'url', url: { value }, label, target: '' }, heroButtonStyle: i ? 'transparent' : 'default' } }])) };
  const data = { elementId: entry, draftId: DRAFT, siteId: '1', draftName: `${P.name}: strategic review redesign`,
    modifiedDeltaNames: ['fields[heroTitle]', 'fields[heroIntroduction]', 'fields[heroImage]', ...(hasButtons ? ['fields[heroButtons]'] : []), 'fields[pageBuilder]', 'fields[ctaPicker]', 'fields[seo]'],
    fields: { heroTitle: P.heroTitle, heroIntroduction: P.heroIntro, heroImage: P.heroImage ? [String(P.heroImage)] : [], ...(hasButtons ? { heroButtons } : {}), pageBuilder: { sortOrder: order, entries }, ctaPicker: [],
      seo: { titleRaw: { 1: P.seoTitle }, description: P.seoDescription } } };
  try { const r = await Craft.sendActionRequest('POST', 'elements/save-draft', { data }); return { ok: r.data.message, heroButtons: hasButtons, live: cur.map(u => u.slice(0, 8)).join(','), kept, blocks: order.length }; }
  catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 800) }; }
}, { entry, DRAFT, html: bodyHtml, P, keep, hasButtons });
console.log(JSON.stringify(res));
await browser.close();
