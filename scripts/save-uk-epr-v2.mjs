// Creates (or, with ENTRY_ID set, updates) the disabled UK EPR explainer v2 page from payloads/uk-epr-v2/page.html.
import { launch } from './lib.mjs';
import fs from 'node:fs';
const ALLOW_LIVE = false;   // this is a test page: it must never be enabled by this script
const html = fs.readFileSync('payloads/uk-epr-v2/page.html', 'utf8');   // built by tools/uk-epr-v2/build.mjs (includes the prefill script)
const link = (value, label) => ({ type: 'url', url: { value }, label, target: '' });
const CTA_HTML = '<h2 id="evx-contact">Ready to collaborate?</h2><p><strong>Let Ecoveritas take the strain.</strong> Contact us to discuss your needs.</p>';
// Closing contact block with the enquiry form; every on-page 'contact' link jumps to #evx-contact.
const payload = {
  sectionId: 1, typeId: 1,
  title: 'UK EPR explainer v2 (test page, do not publish)', slug: 'uk-epr-explainer-v2',
  enabled: false, enabledForSite: false,
  fields: {
    heroTitle: 'Extended Producer Responsibility',
    heroIntroduction: "<p>Whether you're new to EPR, a seasoned pro, or somewhere in between, Ecoveritas is here to help. From understanding the basics of what EPR means for your business, to ensuring full compliance with timely submissions—and even supporting the most advanced needs like developing methodologies and collecting complex packaging data—we guide you every step of the way.</p>",
    heroImage: [11747],   // produce going into a plastic bag in a shop (sourced Oct 2026)
    heroButtons: { sortOrder: ['new1', 'new2'], entries: {
      new1: { type: 'heroButtonItem', enabled: true, fields: { heroButtonUrl: link('#informed', 'Am I affected?'), heroButtonStyle: 'default' } },
      new2: { type: 'heroButtonItem', enabled: true, fields: { heroButtonUrl: link('#evx-contact', 'Contact us'), heroButtonStyle: 'transparent' } } } },
    pageBuilder: { sortOrder: ['new1', 'new2'], entries: { new1: { type: 'general_content', enabled: true, fields: { generalContent: html, spacing: 'medium', theme: 'default' } }, new2: { type: 'callToAction', enabled: true, fields: { richTitle: CTA_HTML, theme: 'default' } } } },
    ctaPicker: [],   // replaced by the on-page contact block above
    seo: { titleRaw: { 1: 'UK EPR explainer v2 (test)' }, description: '', advanced: { robots: ['noindex', 'nofollow'], canonical: 'https://www.ecoveritas.com/compliance/uk-extended-producer-responsibility-epr' } },   // test pages: never indexed, even if enabled by mistake
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
