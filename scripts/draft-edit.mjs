// Edits an existing draft through the admin UI. Usage: node scripts/draft-edit.mjs <step>
import { launch } from './lib.mjs';
import fs from 'node:fs';
export const DRAFT_ID = process.env.DRAFT_ID || '3820';
export const DRAFT_URL = `https://www.ecoveritas.com/admin/entries/x/8054?draftId=${DRAFT_ID}`;
const WRITE = /actions\/(elements\/(save-draft|save|save-nested-element-for-derivative|render-elements|get-editor-html|edit|update-field-layout|create)|app\/render-elements|assets\/(preview-thumb|thumb)|element-selector-modals|ckeditor)/;

export async function open() {
  const s = await launch({ write: WRITE });
  await s.page.goto(DRAFT_URL, { waitUntil: 'networkidle' });
  if (!s.page.url().includes('draftId=' + DRAFT_ID)) throw new Error('not on draft: ' + s.page.url());
  return s;
}

// Pick an asset in an element-select field via the asset modal.
export async function chooseAsset(page, scope, assetId, search) {
  await scope.locator('button.add, .btn.add').first().click();
  const modal = page.locator('.modal.elementselectormodal:visible').last();
  await modal.waitFor();
  await modal.locator('input.clearable[placeholder=Search], input[type=search]').first().fill(search);
  const el = modal.locator(`[data-id="${assetId}"]`).first();
  await el.waitFor({ timeout: 15000 });
  await el.click();
  await modal.locator('button[type=submit].submit:not(.disabled)').last().click();
  await page.waitForTimeout(1500);
}

export async function waitSaved(page) {
  // non-provisional drafts autosave; wait for the spinner to settle
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle');
}
