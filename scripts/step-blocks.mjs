import { open, waitSaved } from './draft-edit.mjs';
const { browser, page } = await open();
const PB = uid => `[data-uid="${uid}"], .matrixblock[data-uid="${uid}"]`;

// 2. Touch each card block (spacing → other value → back) so the draft gets its own copy of the block and its cards.
for (const uid of ['78c9c3de-f827-4bd4-ad5f-02475cf00d22', '61832aa6-3313-4ffc-a935-2ccdb016b780', 'b39e8a9d-7312-4ca7-b512-7ae26b4256a5']) {
  const name = `fields[pageBuilder][entries][uid:${uid}][fields][spacing]`;
  const set = (v) => page.evaluate(([n, v]) => {
    const sz = document.querySelector(`select[name="${n}"]`).selectize;
    const orig = sz.getValue();
    const other = v ?? Object.keys(sz.options).find(k => k !== orig);
    sz.setValue(other);
    return [orig, other];
  }, [name, v]);
  const [orig, other] = await set(null); await waitSaved(page);
  await set(orig); await waitSaved(page);
  console.log('block', uid.slice(0, 8), 'spacing', orig, '→', other, '→', orig);
}
await browser.close();

// 3. Reload the draft and report who owns the cards now.
const s2 = await open();
const ids = await s2.page.locator('.field[data-attribute=cardList] [data-id], .field[data-attribute=mediaCardList] [data-id]').evaluateAll(e => [...new Set(e.map(x => x.dataset.id + ' owner=' + x.dataset.ownerId + ' "' + (x.dataset.title || '').slice(0, 30) + '"'))]);
console.log('cards in draft now:\n' + ids.join('\n'));
console.log('spacing values:', await s2.page.locator('select[name$="[fields][spacing]"]').evaluateAll(s => s.map(x => x.value).join(',')));
await s2.browser.close();
