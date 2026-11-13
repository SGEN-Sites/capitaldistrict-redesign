// card-consistency-test.mjs: store cards in a row must be identical in structure whatever the store's name: same title
// top, same CTA-row top, same button sizes; the footer and switcher mini cards likewise.
//   node tools/card-consistency-test.mjs [--dir dist] [--url https://host/base] [--pages /,/location/,/contact/] [--w 1440,1024]
// Prints PASS/FAIL per page x width (exit 1 on any FAIL).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from './pw.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const DIR = path.resolve(ROOT, val('--dir', 'dist'));
const PAGES = val('--pages', '/,/location/,/visit-us/,/contact/').split(',');
const WIDTHS = val('--w', '1440,1280,1024').split(',').map(Number);
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(DIR, p); if (!f.startsWith(DIR) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r));
const base = (val('--url', '') || `http://localhost:${server.address().port}`).replace(/\/$/, '');
const browser = await chromium.launch();
let fails = 0;
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => { try { localStorage.setItem('cdc.age', '1'); localStorage.setItem('cdc.store', 'albany'); } catch (e) {} });
  for (const pg of PAGES) {
    const p = await ctx.newPage();
    await p.goto(base + pg, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
    await p.waitForTimeout(300);
    const res = await p.evaluate(() => {
      const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
      // group cards that share a row (same top within 2px) under the same parent
      const groups = [];
      for (const [sel, name, cta] of [['.scard', '.scard__name', '.scard__cta'], ['.mini', '.mini__name', '.mini__cta']]) {
        const byParent = new Map();
        document.querySelectorAll(sel).forEach((c) => { if (!c.offsetParent) return; const k = c.parentElement; if (!byParent.has(k)) byParent.set(k, []); byParent.get(k).push(c); });
        for (const [, cards] of byParent) {
          const rows = new Map();
          for (const c of cards) { const t = r(c).y; const key = [...rows.keys()].find((k) => Math.abs(k - t) <= 2) ?? t; if (!rows.has(key)) rows.set(key, []); rows.get(key).push(c); }
          for (const [, row] of rows) {
            if (row.length < 2) continue;
            const m = row.map((c) => ({ name: r(c.querySelector(name)), cta: r(c.querySelector(cta)), card: r(c), btns: [...c.querySelector(cta).querySelectorAll('.btn')].map(r) }));
            groups.push({ kind: sel, n: row.length, m });
          }
        }
      }
      return groups;
    });
    for (const g of res) {
      const same = (f) => g.m.every((x) => Math.abs(f(x) - f(g.m[0])) <= 1);
      const btnSame = g.m.every((x) => x.btns.length === g.m[0].btns.length && x.btns.every((b, i) => Math.abs(b.w - g.m[0].btns[i].w) <= 1 && Math.abs(b.h - g.m[0].btns[i].h) <= 1 && Math.abs((b.y - x.cta.y) - (g.m[0].btns[i].y - g.m[0].cta.y)) <= 1));
      const ok = same((x) => x.name.y) && same((x) => x.cta.y) && same((x) => x.cta.h) && btnSame;
      if (!ok) fails++;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${w} ${pg} ${g.kind} x${g.n} | titleTops ${g.m.map((x) => x.name.y).join('/')} | ctaTops ${g.m.map((x) => x.cta.y).join('/')} | buttons ${g.m.map((x) => x.btns.map((b) => b.w + 'x' + b.h).join('+')).join(' / ')}`);
    }
    await p.close();
  }
  await ctx.close();
}
await browser.close(); server.close();
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
