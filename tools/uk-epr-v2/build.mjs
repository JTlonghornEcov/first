// Builds payloads/uk-epr-v2/page.html: inserts the live UK EPR page's own logo strip (scrolled by the site script) and
// appends the shared enquiry prefill. Usage: node tools/uk-epr-v2/build.mjs
import fs from 'node:fs';
const live = await (await fetch('https://www.ecoveritas.com/compliance/uk-extended-producer-responsibility-epr')).text();
const m = live.match(/<div class="logo-gallery[^"]*">[\s\S]*?<\/div>/);
if (!m || (m[0].match(/<img/g) || []).length < 10) throw new Error('logo strip not found on the live page');
let html = fs.readFileSync('payloads/uk-epr-v2/page.src.html', 'utf8').replace('{{LOGOS}}', m[0]);
if (/\{\{[A-Z]+\}\}/.test(html)) throw new Error('unfilled placeholder');
html += fs.readFileSync('payloads/shared/enquiry-prefill.html', 'utf8');
fs.writeFileSync('payloads/uk-epr-v2/page.html', html);
console.log('page.html', html.length, 'bytes |', (m[0].match(/<img/g) || []).length, 'logos');
