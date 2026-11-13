// smoke-preview.mjs: prove the DEPLOYED preview loads and its store system works on a phone.
//   node tools/smoke-preview.mjs [--url https://sgen-sites.github.io/capitaldistrict-redesign/] [--dir dist-preview]
// 1. Every page of the local preview build is requested from the live host at its directory URL: each must answer 200,
//    be the same page (its <title>) and carry noindex. Also the CSS, JS, a font and robots.txt.
// 2. A phone (390x844, touch) on the live host: the 21+ gate shows, "Yes, I Am" leads to the store step, picking
//    Clifton Park closes it and points the pickup bar's Shop now, Call and Directions at Clifton Park; the bar is hidden
//    over the hero and shown past it; no script errors.
// Writes audit/preview-smoke.json. One request at a time; the browser contacts nothing but the preview host.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, sleep } from './pw.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const URL0 = opt('--url', 'https://sgen-sites.github.io/capitaldistrict-redesign/').replace(/\/?$/, '/');
const DIR = path.join(ROOT, opt('--dir', 'dist-preview'));
const host = new URL(URL0).origin;
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' | ' + String(detail).slice(0, 240) : '')); };
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

// 1. every page, at the URL the site links it by
const files = walk(DIR).filter((f) => f.endsWith('index.html'));
let okPages = 0, redirects = 0;
const bad = [];
for (const f of files) {
  const rel = path.relative(DIR, f).split(path.sep).join('/').replace(/index\.html$/, '');
  const local = fs.readFileSync(f, 'utf8');
  if (/http-equiv="refresh"/.test(local)) { redirects++; continue; }
  const want = (/<title>([^<]*)<\/title>/.exec(local) || [])[1];
  try {
    const r = await fetch(URL0 + rel, { redirect: 'follow' });
    const body = await r.text();
    const title = (/<title>([^<]*)<\/title>/.exec(body) || [])[1];
    const good = r.status === 200 && title === want && /<meta name="robots" content="noindex, nofollow">/.test(body);
    if (good) okPages++; else bad.push(`${rel || '/'} ${r.status} ${title === want ? '' : 'title differs'}`);
  } catch (e) { bad.push(`${rel || '/'} ${e.message}`); }
}
const pagesTotal = files.length - redirects;
check(`every page answers 200 with its own title and noindex (${pagesTotal} pages, ${redirects} redirect stubs skipped)`, okPages === pagesTotal, bad.slice(0, 5).join(' ; '));
for (const asset of ['assets/css/site.css', 'assets/js/site.js', 'assets/fonts/anybody-normal.woff2', 'robots.txt']) {
  const r = await fetch(URL0 + asset);
  const body = asset === 'robots.txt' ? await r.text() : '';
  check(`${asset} answers 200`, r.status === 200 && (asset !== 'robots.txt' || /Disallow:\s*\/\s*$/m.test(body)), r.status + (body ? ' ' + body.replace(/\s+/g, ' ') : ''));
}

// 2. the phone path
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, timezoneId: 'America/New_York' });
await ctx.route((u) => !String(u).startsWith(host), (r) => r.abort());
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(URL0, { waitUntil: 'load' }); await sleep(1200);
check('21+ gate shows on first visit', await p.isVisible('#gate'));
await p.click('[data-gate-yes]'); await sleep(400);
check('"Yes, I Am" leads to the store step', await p.isVisible('[data-gate-step="2"]'));
await p.click('#gate [data-set-store="clifton-park"]'); await sleep(500);
check('picking a store closes the gate', !(await p.isVisible('#gate')));
const atTop = await p.evaluate(() => document.querySelector('[data-pickbar]').classList.contains('is-on'));
await p.evaluate(() => scrollTo(0, innerHeight * 1.8)); await sleep(1000);
const bar = await p.evaluate(() => {
  const b = document.querySelector('[data-pickbar]'); const r = b.querySelector('.pickbar__in').getBoundingClientRect();
  return { on: b.classList.contains('is-on'), top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, store: document.documentElement.getAttribute('data-store'),
    name: b.querySelector('[data-store-name]').textContent, shop: b.querySelector('[data-menu]').getAttribute('href'), call: b.querySelector('[data-store-tel]').getAttribute('href'), maps: b.querySelector('[data-store-directions]').getAttribute('href') };
});
check('pickup bar hidden over the hero, shown past it, inside the screen', !atTop && bar.on && bar.bottom <= bar.vh + 1 && bar.top > bar.vh * 0.6, JSON.stringify({ on: bar.on, top: bar.top, bottom: bar.bottom }));
check('pickup bar points Shop now, Call and Directions at Clifton Park', bar.store === 'clifton-park' && /\/stores\/cd-clifton-park-ny$/.test(bar.shop) && bar.call === 'tel:5189010010' && /qzwVeWkQn3QM7ydDA/.test(bar.maps) && /Clifton Park/.test(bar.name), JSON.stringify(bar));
const cat = await p.evaluate(() => { const a = document.querySelector('.sleeve[data-menu="beverages"]'); return a && a.getAttribute('href'); });
check('category sleeves follow the chosen store (Beverages -> Clifton Park drinks shelf)', /\/stores\/cd-clifton-park-ny\/products\/edibles\/drinks$/.test(cat || ''), cat);
check('no script errors on the live preview (phone)', errs.length === 0, errs.slice(0, 2).join(' | '));
await browser.close();

const out = { at: new Date().toISOString(), url: URL0, pass: results.filter((r) => r.ok).length, total: results.length, results };
fs.writeFileSync(path.join(ROOT, 'audit/preview-smoke.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`\n${out.pass}/${out.total} PASS -> audit/preview-smoke.json`);
process.exit(out.pass === out.total ? 0 : 1);
