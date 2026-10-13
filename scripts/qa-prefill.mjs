// Tests the enquiry prefill on a test page: script survived the CMS, fills on click, respects typed text, updates on switch.
import { launch } from './lib.mjs';
import fs from 'node:fs';
const base = fs.readFileSync(process.argv[2], 'utf8').trim().split('#')[0];
const { browser, page } = await launch({ state: false });
const errors = []; page.on('pageerror', e => errors.push(e.message));
for (const w of [1440, 375]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(base + '&qa=' + w + '#evx-c-be', { waitUntil: 'networkidle' });
  const box = 'section:has(#evx-contact) form textarea';
  const scriptInPage = await page.evaluate(() => [...document.querySelectorAll('main script')].some(s => s.textContent.includes('data-enquiry')));
  await page.locator('#evx-c-be a[data-enquiry]').click(); await page.waitForTimeout(700);
  const afterBe = await page.locator(box).inputValue();
  const focused = await page.evaluate(() => document.activeElement?.tagName + ':' + document.activeElement?.name);
  await page.goto(base + '&qa=' + w + 'b#evx-c-fr', { waitUntil: 'networkidle' });   // fresh load: no carry-over
  await page.locator('#evx-c-fr a[data-enquiry]').click(); await page.waitForTimeout(500);
  await page.evaluate(() => { location.hash = '#evx-c-de'; }); await page.waitForTimeout(300);
  await page.locator('#evx-c-de a[data-enquiry]').click(); await page.waitForTimeout(500);
  const switched = await page.locator(box).inputValue();
  await page.locator(box).fill('My own question about packaging.');
  await page.evaluate(() => { location.hash = '#evx-c-it'; }); await page.waitForTimeout(300);
  await page.locator('#evx-c-it a[data-enquiry]').click(); await page.waitForTimeout(500);
  const kept = await page.locator(box).inputValue();
  console.log(w, JSON.stringify({ scriptInPage, afterBe, focused, switched, kept, errors }));
}
await browser.close();
