// QA for the interactive map: markup survived the CMS, click/keyboard selection works, no overflow at any width.
import { launch } from './lib.mjs';
import fs from 'node:fs';
const url = fs.readFileSync(process.argv[2], 'utf8').trim(), name = process.argv[3];
const { browser, page } = await launch({ state: false });
const base = url.split('#')[0];
for (const w of [1440, 1024, 768, 375, 320]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(base, { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => ({
    countries: document.querySelectorAll('.evx-country').length, pins: document.querySelectorAll('.evx-pin').length,
    hrefs: [...document.querySelectorAll('.evx-country')].filter(a => (a.getAttribute('href') || '').startsWith('#evx-c-')).length,
    cards: document.querySelectorAll('.evx-card').length, listLinks: document.querySelectorAll('.evx-country-list a').length,
    style: !!document.querySelector('.evx')?.parentElement.querySelector('style'), h1: document.querySelectorAll('h1').length,
    overflowX: document.documentElement.scrollWidth - innerWidth, introVisible: getComputedStyle(document.querySelector('.evx-intro')).display !== 'none' }));
  // select Germany: map pin on wide screens, country list on phones
  if (w >= 768) await page.locator('.evx-country[data-c="de"] .evx-pin').click({ force: true });
  else await page.locator('.evx-country-list a[href="#evx-c-de"]').click();
  await page.waitForTimeout(500);
  const s = await page.evaluate(() => ({
    hash: location.hash, cardShown: getComputedStyle(document.querySelector('#evx-c-de')).display !== 'none',
    otherHidden: getComputedStyle(document.querySelector('#evx-c-fr')).display === 'none',
    introHidden: getComputedStyle(document.querySelector('.evx-intro')).display === 'none',
    deFill: getComputedStyle(document.querySelector('.evx-country[data-c="de"] path')).fill, focused: document.activeElement?.id }));
  console.log(w, JSON.stringify({ ...r, ...s }));
  await page.screenshot({ path: `screenshots/${name}-${w}.png`, fullPage: true });
}
// keyboard: tab into the map and open a country with Enter
await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(base, { waitUntil: 'networkidle' });
await page.locator('.evx-country').first().focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
console.log('keyboard:', await page.evaluate(() => ({ hash: location.hash, shown: !!document.querySelector(location.hash) && getComputedStyle(document.querySelector(location.hash)).display !== 'none', focused: document.activeElement?.id })));
await browser.close();
