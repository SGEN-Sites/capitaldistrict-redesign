// crate-stack-test.mjs: prove the category crate's records slide out from BEHIND the cards: a hovered row-2 record tucks
// behind the row-1 card above it (visible only in the gap), and a hovered row-1 record rises from behind its own card.
//   node tools/crate-stack-test.mjs [--dir dist] [--path /]
// Writes private/shots/crate/*.png and prints PASS/FAIL per check (exit 1 on any FAIL).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from './pw.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const DIR = path.resolve(ROOT, val('--dir', 'dist'));
const PAGE = val('--path', '/');
const OUT = path.join(ROOT, 'private/shots/crate'); fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(DIR, p); if (!f.startsWith(DIR) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route((u) => !String(u).startsWith(base), (r) => r.abort());
await ctx.addInitScript(() => { try { localStorage.setItem('cdc.age', '1'); localStorage.setItem('cdc.store', 'albany'); } catch (e) {} });
const p = await ctx.newPage();
await p.goto(base + PAGE, { waitUntil: 'networkidle' });
const sleeves = p.locator('.crate .sleeve');
await sleeves.nth(0).scrollIntoViewIfNeeded();
await p.evaluate(() => window.scrollBy(0, -180));
await p.waitForTimeout(1500);
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' | ' + JSON.stringify(detail) : '')); };
// which element is on top at (x, y): 'card:<i>' | 'disc:<i>' | other
const topAt = (x, y) => p.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y); if (!el) return 'none';
  const all = [...document.querySelectorAll('.crate .sleeve')];
  const s = el.closest('.sleeve'); const i = all.indexOf(s);
  if (el.closest('.sleeve__disc')) return 'disc:' + i;
  if (el.closest('.sleeve__card')) return 'card:' + i;
  return el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0];
}, [x, y]);
const rect = (sel, i) => p.evaluate(([sel, i]) => { const r = document.querySelectorAll(sel)[i].getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right }; }, [sel, i]);
const cols = await p.evaluate(() => getComputedStyle(document.querySelector('.crate__row')).gridTemplateColumns.split(' ').length);

// row 2: hover the first card of the second row; its record must stay behind the card above it
await sleeves.nth(cols).hover(); await p.waitForTimeout(1100);
const above = await rect('.crate .sleeve__card', 0);
const disc2 = await rect('.crate .sleeve__disc', cols);
const card2 = await rect('.crate .sleeve__card', cols);
const cx = disc2.x + disc2.w / 2;
check('row 2: the record rose (its top is above its own card)', disc2.y < card2.y - 10, { discTop: Math.round(disc2.y), cardTop: Math.round(card2.y) });
const inAbove = await topAt(cx, Math.max(disc2.y + 12, above.b - 24));
check('row 2: inside the row-1 card where the record overlaps, the CARD is on top', inAbove === 'card:0', inAbove);
const gapY = (above.b + card2.y) / 2;
const inGap = disc2.y < gapY ? await topAt(cx, gapY) : 'record does not reach the gap';
check('row 2: in the gap between the rows, the record shows (it tucks behind the card above)', inGap === 'disc:' + cols, inGap);
const inOwn = await topAt(cx, card2.y + 30);
check('row 2: inside its own card, the CARD is on top of its record', inOwn === 'card:' + cols, inOwn);
await p.locator('.crate').screenshot({ path: path.join(OUT, 'row2-hover.png') });

// row 1: hover the first card; its record must rise from behind it
await p.mouse.move(5, 5); await p.waitForTimeout(700);
await sleeves.nth(0).hover(); await p.waitForTimeout(1100);
const disc1 = await rect('.crate .sleeve__disc', 0);
const card1 = await rect('.crate .sleeve__card', 0);
const cx1 = disc1.x + disc1.w / 2;
check('row 1: the record rose above its card', disc1.y < card1.y - 10, { discTop: Math.round(disc1.y), cardTop: Math.round(card1.y) });
const above1 = await topAt(cx1, card1.y - 12);
check('row 1: just above the card, the record shows', above1 === 'disc:0', above1);
const inside1 = await topAt(cx1, card1.y + 24);
check('row 1: inside the card, the CARD is on top of its record (it rises from behind)', inside1 === 'card:0', inside1);
await p.locator('.crate').screenshot({ path: path.join(OUT, 'row1-hover.png') });

await browser.close(); server.close();
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
