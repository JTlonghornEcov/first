// Creates a new (non-provisional) draft of an entry via the editor's own "Create a draft" button.
import { launch } from './lib.mjs';
const id = process.argv[2];
const { browser, page } = await launch({ write: /actions\/elements\/save-draft/ });
await page.goto(`https://www.ecoveritas.com/admin/entries/x/${id}`, { waitUntil: 'networkidle' });
await Promise.all([
  page.waitForURL(/draftId=\d+/, { timeout: 30000 }),
  page.locator('button.formsubmit[data-action="elements/save-draft"]').click(),
]);
await page.waitForLoadState('networkidle');
console.log('Draft URL:', page.url());
console.log('Notice:', (await page.locator('#notifications, .notification').allInnerTexts()).join(' | ').slice(0, 200));
await browser.close();
