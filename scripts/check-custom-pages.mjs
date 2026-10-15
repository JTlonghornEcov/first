// Health check for pages built with custom HTML in a General Content block. These designs are silently destroyed
// if someone opens the entry in the CMS and clicks Save (CKEditor strips <style>, <script>, SVG, classes and ids),
// so this verifies every marker the design depends on. Exit code 1 if anything is wrong.
// Usage: node scripts/check-custom-pages.mjs
import { launch } from './lib.mjs';

const PAGES = [
  { name: 'UK EPR concept', id: 10879, slug: 'uk-epr-concept-test', expectPublic: 404, noindex: true,
    expect: { '.evx': 1, '.evx-section': 7, '#evx-contact': 1, 'a[data-enquiry]': 1, 'main script': 1 } },
  { name: 'EU interactive map', id: 10894, slug: 'eu-map-test', expectPublic: 404, noindex: true,
    expect: { '.evx': 1, '.evx-country': 27, '.evx-pin': 27, '.evx-card': 27, '.evx-country-list a': 27, '#evx-contact': 1, 'a[data-enquiry]': 27, 'main script': 1 } },
  { name: 'LinkedIn Challenge preview', id: 10955, slug: 'linkedin-challenge-preview', expectPublic: 404, noindex: true,
    expect: { '.evx': 1, '.lc-sec': 7, '#lc-range': 1, '#lc-notes-box': 1, '#lc-how': 1, '#lc-calc': 1, 'main script': 1 } },
  { name: 'Services hub', id: 11013, slug: 'services-hub-test', expectPublic: 404, noindex: true,
    expect: { '.evx': 1, '#svc-finder': 1, '#svc-hub .card': 9, '#svc-hub [role=tab]': 5, '#svc-hub [role=tabpanel]': 5, '[data-count]': 6, '#evx-contact': 1, 'a[data-enquiry]': 9, 'main script': 2 } },
  { name: 'US EPR eco-modulation post (LIVE)', id: 11093, slug: 'articles/us-packaging-epr-eco-modulation-three-states-three-very-different-approaches', expectPublic: 200, noindex: false, root: '#usepr',
    expect: { '#usepr': 1, '#usepr .glance a': 3, '#usepr .step': 4, '#us-srim': 1, '#us-orcalc': 1, '#us-ready': 1, '#evx-contact': 1, 'a[data-enquiry]': 2, 'main script': 2 } },
  { name: 'PPWR supplier DoC (draft)', id: 11200, slug: 'compliance/ppwr-supplier-declaration-of-conformity', expectPublic: 404, noindex: true, root: '#pdoc',
    expect: { '#pdoc': 1, '#pd-steps .step': 4, '#pdoc .level': 2, '#pd-checker': 1, '#pdoc details': 6, '#evx-contact': 1, 'a[data-enquiry]': 5, 'main script': 2 } },
];

let failed = 0;
const { browser, page } = await launch({ write: /actions\/preview\/create-token/, log: false });
for (const p of PAGES) {
  const problems = [];
  const pub = await fetch(`https://www.ecoveritas.com/${p.slug}`, { redirect: 'manual' }).then(r => r.status).catch(e => 'error ' + e.message);
  if (pub !== p.expectPublic) problems.push(`public status ${pub}, expected ${p.expectPublic}`);
  await page.goto(`https://www.ecoveritas.com/admin/entries/x/${p.id}`, { waitUntil: 'networkidle' });
  if (/\/login/.test(page.url())) { console.error('Not logged in: run node scripts/login.mjs first'); process.exit(2); }
  const preview = await page.evaluate(async (slug) => Craft.cp.$primaryForm.data('elementEditor').getTokenizedPreviewUrl(`https://www.ecoveritas.com/${slug}`, 'x-craft-preview', true), p.slug);
  await page.goto(preview, { waitUntil: 'networkidle' });
  const found = await page.evaluate(([sels, root]) => {
    const out = {}; for (const s of sels) out[s] = document.querySelectorAll(s).length;
    out.styleKept = !!document.querySelector(root)?.parentElement.querySelector('style');
    out.robots = document.querySelector('meta[name="robots"]')?.content || '';
    out.h1 = document.querySelectorAll('h1').length;
    out.brokenAnchors = [...document.querySelectorAll('main a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h));
    return out;
  }, [Object.keys(p.expect), p.root || '.evx']);
  for (const [sel, n] of Object.entries(p.expect)) if (found[sel] !== n) problems.push(`${sel}: found ${found[sel]}, expected ${n}`);
  if (!found.styleKept) problems.push('page <style> is missing (design stripped?)');
  if (p.noindex && !/noindex/.test(found.robots)) problems.push(`robots meta is "${found.robots}", expected noindex`);
  if (found.h1 !== 1) problems.push(`${found.h1} H1 headings, expected 1`);
  if (found.brokenAnchors.length) problems.push('jump links with no target: ' + found.brokenAnchors.join(', '));
  console.log(`${problems.length ? 'FAIL' : 'OK  '}  ${p.name} (entry ${p.id})${problems.length ? '\n      - ' + problems.join('\n      - ') : ''}`);
  if (problems.length) failed++;
}
await browser.close();
process.exit(failed ? 1 : 0);
