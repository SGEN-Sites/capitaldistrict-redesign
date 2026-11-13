// switch-test.mjs: every way of switching store must work, in Chromium and WebKit: the switcher's "Switch to" button,
// a click on a switcher card's body, a click on a store card's photo, the store card's "Make this my store" button.
//   node tools/switch-test.mjs [--dir dist] [--url https://host/base/]
// Prints PASS/FAIL per check (exit 1 on any FAIL).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_CORE || '~/OSOFT/Code/os-workstation/node_modules/playwright-core');
const args = process.argv.slice(2);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const DIR = path.resolve(ROOT, val('--dir', 'dist'));
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(DIR, p); if (!f.startsWith(DIR) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r));
const URL0 = val('--url', '') || `http://localhost:${server.address().port}/`;
let fails = 0;
const check = (eng, name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${eng}: ${name}${detail ? ' | ' + JSON.stringify(detail) : ''}`); };
for (const eng of ['chromium', 'webkit']) {
  const b = await pw[eng].launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('cdc.age', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const state = () => p.evaluate(() => ({ store: document.documentElement.getAttribute('data-store'), modal: !document.querySelector('[data-smodal]').hidden, chip: document.querySelector('.chip [data-store-name]').textContent, bar: document.querySelector('.pickbar [data-store-name]').textContent }));
  // 1. switcher button
  await p.click('.chip[data-open-store]'); await p.waitForTimeout(400);
  const label = await p.locator('[data-smodal] [data-store-card="clifton-park"] .pick').innerText();
  const mineLabel = await p.locator('[data-smodal] [data-store-card="albany"] .pick').innerText();
  check(eng, 'switcher labels say what they do ("Switch to Clifton Park"; the current store says "Your store")', /Switch to Clifton Park/.test(label) && /Your store/.test(mineLabel), { label, mineLabel });
  await p.click('[data-smodal] [data-store-card="clifton-park"] [data-set-store]'); await p.waitForTimeout(700);
  let s = await state();
  check(eng, 'switcher button switches to Clifton Park and closes', s.store === 'clifton-park' && !s.modal && s.chip === 'Clifton Park' && s.bar === 'Clifton Park, NY', s);
  // 2. switcher card body (the address line)
  await p.click('.chip[data-open-store]'); await p.waitForTimeout(400);
  await p.click('[data-smodal] [data-store-card="schenectady"] .mini__addr'); await p.waitForTimeout(700);
  s = await state();
  check(eng, 'clicking a switcher card\'s body switches to Schenectady', s.store === 'schenectady' && !s.modal, s);
  // 3. store card photo on the home page
  const photo = p.locator('.h-stores [data-store-card="albany"] .scard__media');
  await photo.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  await photo.click(); await p.waitForTimeout(500);
  s = await state();
  const mine = await p.evaluate(() => (document.querySelector('.h-stores .scard.is-mine') || {}).dataset?.storeCard || null);
  check(eng, 'clicking a store card\'s photo switches to Albany and marks it', s.store === 'albany' && mine === 'albany', { ...s, mine });
  // 4. the store card button, pressed and released a few pixels apart (a real hand)
  const btn = p.locator('.h-stores [data-store-card="clifton-park"] [data-set-store]');
  await btn.evaluate((el) => el.scrollIntoView({ block: 'center' })); await p.waitForTimeout(500); // as a person would: the target in view, not under the pickup bar
  const bb = await btn.boundingBox();
  await p.evaluate(() => { window.__toasts = 0; new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.classList && n.classList.contains('toast')) window.__toasts++; }))).observe(document.body, { childList: true }); });
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height - 4); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2 + 3, bb.y + bb.height + 4); await p.mouse.up(); await p.waitForTimeout(500);
  s = await state();
  check(eng, '"Make this my store" switches even when the press drifts a few px off the button', s.store === 'clifton-park', s);
  const btnLabel = await btn.innerText();
  check(eng, 'the chosen card\'s button now reads "Your store"', /Your store/.test(btnLabel), btnLabel);
  const toasts = await p.evaluate(() => window.__toasts);
  check(eng, 'one pick per press (exactly one toast for the drifted press)', toasts === 1, toasts);
  // a plain click on another card's button
  await p.click('.h-stores [data-store-card="schenectady"] [data-set-store]'); await p.waitForTimeout(400);
  check(eng, 'a plain click on "Make this my store" switches to Schenectady', (await state()).store === 'schenectady');
  // a press that drifts UP off the button, into the gap between the two buttons
  const bt2 = p.locator('.h-stores [data-store-card="albany"] [data-set-store]'); const b2 = await bt2.boundingBox();
  await p.mouse.move(b2.x + b2.width / 2, b2.y + 4); await p.mouse.down(); await p.mouse.move(b2.x + b2.width / 2 - 2, b2.y - 4); await p.mouse.up(); await p.waitForTimeout(500);
  check(eng, 'a press drifting up off "Make this my store" still switches to Albany', (await state()).store === 'albany');
  // a real drag (40px away) is not a pick
  const bt3 = p.locator('.h-stores [data-store-card="clifton-park"] [data-set-store]'); const b3 = await bt3.boundingBox();
  await p.mouse.move(b3.x + b3.width / 2, b3.y + b3.height / 2); await p.mouse.down(); await p.mouse.move(b3.x + b3.width / 2 + 40, b3.y - 30); await p.mouse.up(); await p.waitForTimeout(500);
  check(eng, 'a long drag off the button does not switch the store', (await state()).store === 'albany');
  // the cards no longer move under the pointer
  const moves = await p.evaluate(async () => { const c = document.querySelector('.h-stores [data-store-card="albany"]'); const a = c.getBoundingClientRect().top; c.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: a + 50, clientY: a + 50 })); await new Promise((r) => setTimeout(r, 300)); return Math.abs(c.getBoundingClientRect().top - a); });
  check(eng, 'store cards do not move under the pointer', moves < 0.5, moves);
  // 5. links on a card keep their own job (the phone link does not switch the store)
  const before = (await state()).store;
  await p.evaluate(() => { const a = document.querySelector('.h-stores [data-store-card="schenectady"] a[href^="tel:"]'); a.addEventListener('click', (e) => e.preventDefault(), { once: true }); a.click(); });
  await p.waitForTimeout(300);
  check(eng, 'a link inside a card (phone) does not switch the store', (await state()).store === before);
  check(eng, 'no script errors', errs.length === 0, errs);
  await b.close();
}
server.close();
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
