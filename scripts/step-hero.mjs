import { open, chooseAsset, waitSaved } from './draft-edit.mjs';
const { browser, page } = await open();
const field = page.locator('.field[data-attribute=heroImage]').first();
await chooseAsset(page, field, 9406, 'dubai-downtown-skyline-united-arab-emirates-or-ua-2026-09-22-17-32-06-utc');
console.log('hero field now:', await field.locator('input[type=hidden]').evaluateAll(i => i.map(x => x.name + '=' + x.value)));
await waitSaved(page);
await page.screenshot({ path: 'screenshots/_draft-hero.png' });
await browser.close();
