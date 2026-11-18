// Builds payloads/eu-textiles-epr/page.html from page.src.html: inlines the outline of each Member State covered
// (world-atlas 50m, mainland polygons only, one projection per country). No JavaScript is added: the article is
// plain HTML and CSS.
import fs from 'node:fs';
import path from 'node:path';
const mapDir = path.resolve('tools/map/node_modules');
const { geoPath, geoMercator, geoCentroid } = await import(path.join(mapDir, 'd3-geo/src/index.js'));
const topojson = await import(path.join(mapDir, 'topojson-client/src/index.js'));
const world = JSON.parse(fs.readFileSync(path.join(mapDir, 'world-atlas/countries-50m.json')));
const countries = topojson.feature(world, world.objects.countries).features;
const IDS = { FR: '250', NL: '528', LV: '428', DE: '276', IT: '380', ES: '724', SE: '752' };
// Keep only the European mainland and nearby islands (drops French Guiana, the Canaries, Caribbean Netherlands, etc.).
const inEurope = poly => { const [lon, lat] = geoCentroid({ type: 'Polygon', coordinates: poly }); return lon > -12 && lon < 35 && lat > 35 && lat < 72; };
let html = fs.readFileSync('payloads/eu-textiles-epr/page.src.html', 'utf8');
for (const [key, id] of Object.entries(IDS)) {
  const f = countries.find(c => c.id === id);
  if (!f) throw new Error('missing ' + key);
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const geo = { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: polys.filter(inEurope) } };
  const proj = geoMercator().fitSize([100, 100], geo);
  const pg = geoPath(proj).digits(1);
  const [[x0, y0], [x1, y1]] = pg.bounds(geo);
  html = html.replaceAll(`{{${key}}}`, pg(geo)).replaceAll(`{{${key}_VB}}`, [x0, y0, x1 - x0, y1 - y0].map(v => +v.toFixed(1)).join(' '));
}
if (/\{\{/.test(html)) throw new Error('unfilled placeholder');
if (/<script|\son[a-z]+\s*=|javascript:/i.test(html)) throw new Error('JavaScript is not allowed in this article');
fs.writeFileSync('payloads/eu-textiles-epr/page.html', html);
console.log('page.html', html.length, 'bytes');
