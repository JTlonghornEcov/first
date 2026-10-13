// Functional QA for the services hub: finder (needs + search), journey tabs (keyboard), count-up, enquiry prefill,
// service links, and console errors. Usage: node scripts/qa-services-hub.mjs <preview-url>
import { launch } from './lib.mjs';
const url = process.argv[2];
const { browser, page } = await launch({ state: false });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle' });
const shown = () => page.$$eval('#svc-hub .card', cs => cs.filter(c => !c.hidden).map(c => c.id || c.querySelector('h3').textContent.trim()));
const statusText = () => page.$eval('#svc-hub .status', s => s.textContent);
const out = {};
out.all = (await shown()).length;
for (const n of ['unsure', 'data', 'calc', 'report', 'cost', 'eu', 'pack', 'waste']) {
  await page.click(`#svc-hub .need[data-need="${n}"]`); out['need:' + n] = (await shown()).join(' | ');
  await page.click(`#svc-hub .need[data-need="${n}"]`);   // toggle off
}
out.afterToggleOff = (await shown()).length;
for (const term of ['packaging', 'ppwr', 'scotland', 'zzzz']) { await page.fill('#svc-q', term); out['q:' + term] = (await shown()).join(' | ') + ' || ' + await statusText(); }
out.emptyVisible = await page.$eval('#svc-hub .empty', e => !e.hidden);
await page.click('#svc-hub [data-reset]'); out.afterReset = (await shown()).length;
// Tabs
await page.click('#svc-t1'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
out.tabArrow = await page.evaluate(() => [document.activeElement.id, [...document.querySelectorAll('#svc-hub [role=tabpanel]')].filter(p => !p.hidden).map(p => p.id)].join(' '));
await page.keyboard.press('End'); out.tabEnd = await page.evaluate(() => document.activeElement.id + ' next disabled=' + document.querySelector('[data-step="1"]').disabled);
await page.keyboard.press('Home'); out.tabHome = await page.evaluate(() => document.activeElement.id + ' prev disabled=' + document.querySelector('[data-step="-1"]').disabled);
await page.click('[data-step="1"]'); out.nextBtn = await page.evaluate(() => [...document.querySelectorAll('#svc-hub [role=tabpanel]')].filter(p => !p.hidden).map(p => p.id).join());
// Count-up
await page.evaluate(() => document.querySelector('#svc-hub [data-count]').scrollIntoView()); await page.waitForTimeout(2000);
out.stats = await page.$$eval('#svc-hub [data-count]', e => e.map(x => x.textContent.trim()).join(' '));
// Links
const links = await page.$$eval('#svc-hub a[href^="/services/"], #svc-hub a[href^="https://www.ecoveritas.com/services/"]', as => [...new Set(as.map(a => a.href))]);
out.serviceLinks = [];
for (const l of links) out.serviceLinks.push((await fetch(l.split('?')[0], { redirect: 'manual' })).status + ' ' + l.replace(/.*\.com/, ''));
// Prefill
const talk = await page.$$('#svc-hub a[data-enquiry]'); out.talkLinks = talk.length;
await talk[2].click(); await page.waitForTimeout(900);
out.prefill = await page.evaluate(() => { const t = document.getElementById('evx-contact').closest('section').querySelector('form textarea'); return [t.value, document.activeElement === t, location.hash].join(' | '); });
out.errors = errors;
console.log(JSON.stringify(out, null, 1));
await browser.close();
