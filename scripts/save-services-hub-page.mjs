// Creates (or, with ENTRY_ID set, updates) the disabled services hub test page from payloads/services-hub/page.html.
import { launch } from './lib.mjs';
import fs from 'node:fs';
const ALLOW_LIVE = false;   // this is a test page: it must never be enabled by this script
const html = fs.readFileSync('payloads/services-hub/page.html', 'utf8') + fs.readFileSync('payloads/shared/enquiry-prefill.html', 'utf8');
const link = (value, label) => ({ type: 'url', url: { value }, label, target: '' });
const CTA_HTML = '<h2 id="evx-contact">Not sure where to start?</h2><p><strong>Tell us about your business</strong> and we will recommend the right level of support.</p>';
// Closing contact block with the enquiry form; every 'Talk to us' link jumps to #evx-contact and pre-fills the enquiry.
const payload = {
  sectionId: 1, typeId: 1,
  title: 'Services hub (test page, do not publish)', slug: 'services-hub-test',
  enabled: false, enabledForSite: false,
  fields: {
    heroTitle: 'Our services',
    heroIntroduction: "<p>Ecoveritas offer tailored service levels to meet the unique needs of different types of businesses. So, whether you're looking for fundamental support, fully managed services, or a bespoke comprehensive solution, we have the right option for you.</p>",
    heroImage: [8933],
    heroButtons: { sortOrder: ['new1', 'new2'], entries: {
      new1: { type: 'heroButtonItem', enabled: true, fields: { heroButtonUrl: link('#svc-finder', 'Find your service'), heroButtonStyle: 'default' } },
      new2: { type: 'heroButtonItem', enabled: true, fields: { heroButtonUrl: link('#evx-contact', 'Talk to us'), heroButtonStyle: 'transparent' } } } },
    pageBuilder: { sortOrder: ['new1', 'new2'], entries: { new1: { type: 'general_content', enabled: true, fields: { generalContent: html, spacing: 'medium', theme: 'default' } }, new2: { type: 'callToAction', enabled: true, fields: { richTitle: CTA_HTML, theme: 'default' } } } },
    ctaPicker: [],   // replaced by the on-page contact block above
    seo: { titleRaw: { 1: 'Services hub (test)' }, description: '', advanced: { robots: ['noindex', 'nofollow'] } },   // test page: never indexed, even if enabled by mistake
  },
};
if (process.env.ENTRY_ID) payload.entryId = process.env.ENTRY_ID;
if (!ALLOW_LIVE && (payload.enabled !== false || payload.enabledForSite !== false)) throw new Error('must be disabled');
const { browser, page } = await launch({ write: /actions\/entries\/save-entry/ });
await page.goto('https://www.ecoveritas.com/admin/entries', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.Craft && Craft.sendActionRequest);
const res = await page.evaluate(async (data) => {
  try { const r = await Craft.sendActionRequest('POST', 'entries/save-entry', { data }); const d = r.data;
    return { id: d.id ?? d.entry?.id, cpEditUrl: d.cpEditUrl ?? d.entry?.cpEditUrl, status: (JSON.stringify(d).match(/data-status=\\"(\w+)/) || [])[1], msg: d.message }; }
  catch (e) { return { error: e.message, data: JSON.stringify(e.response?.data).slice(0, 800) }; }
}, payload);
console.log(JSON.stringify(res));
await browser.close();
