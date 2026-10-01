// Prints a private, expiring preview link for the draft open in DRAFT_URL. Never commit its output.
import { launch } from './lib.mjs';
import { DRAFT_URL } from './draft-edit.mjs';
const pageUrl = process.argv[2];
const { browser, page } = await launch({ write: /actions\/preview\/create-token/, log: false });
await page.goto(DRAFT_URL, { waitUntil: 'networkidle' });
const url = await page.evaluate(async (u) => Craft.cp.$primaryForm.data('elementEditor').getTokenizedPreviewUrl(u, 'x-craft-preview', true), pageUrl);
console.log(url);
await browser.close();
