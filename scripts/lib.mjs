import { chromium } from 'playwright';
import fs from 'node:fs';

export const READ_OK = /actions\/(element-indexes|app\/icon-svg|users\/session-info)/;

export async function launch({ write = null, state = true } = {}) {
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
    if (READ_OK.test(u)) return r.continue();
    if (write && write.test(u)) return r.continue();
    console.log('BLOCKED', q.method(), u.slice(0, 150));
    return r.abort();
  });
  return { browser, ctx, page };
}
