// Renders the shared draft placeholder image (no network writes).
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1472, height: 1012 } });
await page.setContent(`<html><body style="margin:0;width:1472px;height:1012px;background:#2f4450;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif">
<div style="text-align:center;color:#fff"><div style="width:120px;height:10px;background:#ffcd00;margin:0 auto 48px"></div>
<div style="font-size:96px;font-weight:700;letter-spacing:-1px">Image to come</div>
<div style="font-size:34px;margin-top:28px;color:#c9d3d8">Draft placeholder · see the imagery brief</div></div></body></html>`);
await page.screenshot({ path: process.argv[2] });
await browser.close();
