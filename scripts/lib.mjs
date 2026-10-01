import { chromium } from 'playwright';
import fs from 'node:fs';

// Publishing and deleting are never allowed from scripts unless James confirms the specific action.
export const NEVER = /(elements|entries)\/(apply-draft|delete|delete-for-site|revert)|assets\/delete/;
export const READ_OK = /actions\/(element-indexes|app\/icon-svg|users\/session-info)/;

// Craft form posts carry the action in the body rather than the URL. A button can append a second
// `action` after the form's default one; PHP keeps the last, so that is the one Craft runs.
function bodyActionsOf(q) {
  let raw = '';
  try { raw = q.postData() || ''; } catch { return []; }
  const multipart = [...raw.matchAll(/name="action"\r?\n\r?\n([^\r\n]+)/g)].map(m => m[1]);
  if (multipart.length) return multipart;
  if (/urlencoded/.test(q.headers()['content-type'] || '')) return new URLSearchParams(raw).getAll('action');
  return [];
}

export async function launch({ write = null, state = true, log = true } = {}) {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  const launchOpts = proxyUrl ? { proxy: { server: proxyUrl } } : {};
  let browser;
  try { browser = await chromium.launch(launchOpts); }
  catch { browser = await chromium.launch({ ...launchOpts, executablePath: '/opt/pw-browsers/chromium' }); }
  const opts = { viewport: { width: 1440, height: 1000 } };
  if (state && fs.existsSync('state.json')) opts.storageState = 'state.json';
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const q = r.request();
    if (['GET', 'HEAD'].includes(q.method())) return r.continue();
    const u = decodeURIComponent(q.url());
    const actions = bodyActionsOf(q);
    const bodyAction = actions.at(-1) || '';
    if (NEVER.test(u) || actions.some(a => NEVER.test(a))) {
      console.log('BLOCKED (never)', q.method(), u.slice(0, 150), bodyAction);
      return r.abort();
    }
    if (READ_OK.test(u)) return r.continue();
    if (write && (write.test(u) || (bodyAction && write.test('actions/' + bodyAction)))) {
      if (log) console.log('WRITE', q.method(), u.slice(0, 120), bodyAction);
      return r.continue();
    }
    console.log('BLOCKED', q.method(), u.slice(0, 150), bodyAction);
    return r.abort();
  });
  return { browser, ctx, page };
}
