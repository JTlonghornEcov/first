// Builds the homepage concept (payloads/home-concept/page.html) from page.src.html plus four sections copied from the
// live homepage: hero (video), client logos, news ("Trending topics") and "Why Ecoveritas?".
// Copied markup sits inside the CMS text block's .wysiwyg styles, which would change its headings, so every text
// element's computed style is measured on the live homepage at four widths and pinned with scoped CSS.
// Usage: node tools/home/build-home.mjs
import fs from 'node:fs';
import { launch } from '../../scripts/lib.mjs';

const WIDTHS = [[375, 0], [768, 768], [1024, 1024], [1440, 1280]];   // [measure at, applies from min-width]
const PROPS = ['font-size', 'line-height', 'font-weight', 'color', 'letter-spacing', 'text-transform', 'margin-top', 'margin-bottom', 'list-style-type', 'padding-left'];
const PICK = { hero: 0, logos: 1, trending: 3, why: 5 };   // section index in the live homepage <main>

const { browser, page } = await launch({ state: false, log: false });
const source = await (await fetch('https://www.ecoveritas.com/')).text();
const measured = {};
for (const [w] of WIDTHS) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('https://www.ecoveritas.com/', { waitUntil: 'networkidle' });
  measured[w] = await page.evaluate(({ PICK, PROPS }) => {
    const secs = document.querySelectorAll('main > section'), out = {};
    for (const [name, i] of Object.entries(PICK)) out[name] = [...secs[i].querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,ul,li')].map(el => { const cs = getComputedStyle(el); return Object.fromEntries(PROPS.map(p => [p, cs.getPropertyValue(p)])); });
    return out;
  }, { PICK, PROPS });
}
// Serialise the sections from the raw source (before site JS runs) and tag the same elements in the same order.
const copies = await page.evaluate(({ source, PICK }) => {
  const d = new DOMParser().parseFromString(source, 'text/html'), secs = d.querySelectorAll('main > section'), out = {};
  for (const [name, i] of Object.entries(PICK)) { [...secs[i].querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,ul,li')].forEach((el, k) => el.setAttribute('data-k', `${name}-${k}`)); out[name] = secs[i].outerHTML; }
  return out;
}, { source, PICK });
await browser.close();

let css = '';
for (const name of Object.keys(PICK)) {
  const n = measured[1440][name].length;
  for (const [w] of WIDTHS) if (measured[w][name].length !== n) throw new Error(`${name}: element count differs at ${w}px`);
  for (let k = 0; k < n; k++) {
    let prev = null;
    for (const [w, from] of WIDTHS) {
      const s = measured[w][name][k], decl = PROPS.filter(p => !prev || prev[p] !== s[p]).map(p => `${p}:${s[p]}`).join(';');
      if (decl) css += from ? `@media (min-width:${from}px){#home2 [data-k="${name}-${k}"]{${decl}}}\n` : `#home2 [data-k="${name}-${k}"]{${decl}}\n`;
      prev = s;
    }
  }
}

// Concept changes to the copied sections
let hero = copies.hero
  .replace(/<\/h1>\s*<h1[^>]*>/, ' <br>')                                                   // one H1, not two
  .replace(/<h6([^>]*)>([\s\S]*?)<\/h6>/, '<p$1 class="home2-sub">$2</p>')                  // subtitle is not a heading
  .replace('href="https://www.ecoveritas.com/#us"', 'href="#pathways"')
  .replace(/(<\/div>\s*<a href="#pathways")/, `{{PROBLEMS}}$1`);
const trending = copies.trending.replace(/(<h2[^>]*>)\s*Where to start\.\.\.\s*(<\/h2>)/, '$1Trending topics$2');
if (trending === copies.trending) throw new Error('Trending title not found');

let html = fs.readFileSync('payloads/home-concept/page.src.html', 'utf8');
const problems = html.match(/<!--PROBLEMS-->([\s\S]*?)<!--\/PROBLEMS-->/)[1];
html = html.replace(/<!--PROBLEMS-->[\s\S]*?<!--\/PROBLEMS-->/, '')
  .replace('{{PINS}}', css)
  .replace('{{HERO}}', hero.replace('{{PROBLEMS}}', problems))
  .replace('{{LOGOS}}', copies.logos).replace('{{TRENDING}}', trending).replace('{{WHY}}', copies.why);
if (/\{\{[A-Z]+\}\}/.test(html)) throw new Error('unfilled placeholder');
html += fs.readFileSync('payloads/shared/enquiry-prefill.html', 'utf8');
fs.writeFileSync('payloads/home-concept/page.html', html);
console.log('page.html', html.length, 'bytes |', css.split('\n').length - 1, 'pinned style rules');
