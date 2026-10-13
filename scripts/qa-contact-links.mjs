// Checks that every contact link on a page jumps to the on-page contact block (#evx-contact) and that it lands on the form.
import { launch } from './lib.mjs';
import fs from 'node:fs';
const url = fs.readFileSync(process.argv[2], 'utf8').trim(), clickSel = process.argv[3];
const { browser, page } = await launch({ state: false });
for (const w of [1440, 375]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  const info = await page.evaluate(() => {
    const t = document.getElementById('evx-contact');
    const contactish = [...document.querySelectorAll('main a')].filter(a => /contact|get in touch|talk to us|whitepaper/i.test(a.textContent));
    return { target: !!t, targetInCta: !!t?.closest('section')?.querySelector('form'),
      contactLinks: contactish.length, pointingToAnchor: contactish.filter(a => a.getAttribute('href') === '#evx-contact').length,
      elsewhere: contactish.filter(a => a.getAttribute('href') !== '#evx-contact').map(a => a.textContent.trim().slice(0, 30) + ' -> ' + a.getAttribute('href')).slice(0, 5),
      ctaPickerBand: [...document.querySelectorAll('main section')].some(s => /Let Ecoveritas take the strain/.test(s.textContent) && !s.querySelector('form')) };
  });
  if (clickSel.startsWith('#evx-c-')) { await page.goto(url.split('#')[0] + clickSel, { waitUntil: 'networkidle' }); await page.locator(`${clickSel} a[href="#evx-contact"]`).click(); }
  else await page.locator(clickSel).first().click();
  await page.waitForTimeout(800);
  const land = await page.evaluate(() => { const f = document.getElementById('evx-contact').closest('section').querySelector('form'); const r = f.getBoundingClientRect(); return { hash: location.hash, formTop: Math.round(r.top), formVisible: r.top < innerHeight && r.bottom > 0 }; });
  console.log(w, JSON.stringify({ ...info, ...land }));
}
await browser.close();
