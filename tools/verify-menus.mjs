// verify-menus.mjs: open every live-menu destination the build links to and record whether it shows products with an
// add-to-cart control. One browser, one page at a time, a pause between visits, no retries, no purchases.
//   node tools/verify-menus.mjs [--stores albany,clifton-park,schenectady] [--targets all,specials,flower,...]
// Writes audit/menu-verification.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, sleep } from './pw.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { stores, categories, menuUrl } = await import(path.join(ROOT, 'src/content/site.mjs'));
const args = process.argv.slice(2);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const STORES = val('--stores', stores.map((s) => s.id).join(',')).split(',');
const TARGETS = val('--targets', ['all', 'specials', ...categories.map((c) => c.id)].join(',')).split(',');
const EXTRA = val('--urls', '').split(',').filter(Boolean);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US', timezoneId: 'America/New_York' });
const page = await ctx.newPage();
const out = { at: new Date().toISOString(), results: [] };
const jobs = [];
for (const s of STORES) for (const t of TARGETS) jobs.push({ store: s, target: t, url: menuUrl(s, t) });
for (const u of EXTRA) jobs.push({ store: '-', target: 'extra', url: u });
let first = true;
for (const j of jobs) {
  if (!first) await sleep(1500); first = false;
  let status = 0;
  try { const r = await page.goto(j.url, { waitUntil: 'domcontentloaded', timeout: 45000 }); status = r ? r.status() : 0; } catch (e) { out.results.push({ ...j, error: e.message.split('\n')[0] }); console.log('ERR', j.url); continue; }
  if ([401, 403, 429, 503].includes(status)) { out.results.push({ ...j, status, stopped: true }); console.log('STOP', status, j.url); break; }
  // the live site's 21+ gate: answer it once if it is shown
  const yes = page.locator('button, a').filter({ hasText: /^\s*yes,?\s*i\s*am\s*$/i }).first();
  if (await yes.count().catch(() => 0)) { await yes.click({ timeout: 3000 }).catch(() => {}); }
  await page.waitForTimeout(4500);
  const info = await page.evaluate(() => {
    const txt = document.body.innerText;
    const addBtns = [...document.querySelectorAll('button, a')].filter((b) => /add to (cart|bag)|^\s*add\s*$/i.test((b.innerText || b.getAttribute('aria-label') || '').trim()));
    const prices = (txt.match(/\$\d+(\.\d{2})?/g) || []).length;
    const h1 = (document.querySelector('h1') || {}).innerText || '';
    const cart = [...document.querySelectorAll('button, a')].some((b) => /cart|bag/i.test((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')));
    const empty = /no products found|no results|0 products/i.test(txt);
    return { title: document.title, h1: h1.trim().slice(0, 80), addButtons: addBtns.length, prices, cart, empty, finalUrl: location.href };
  });
  const ok = status === 200 && info.prices > 0 && (info.addButtons > 0 || info.prices > 2) && !info.empty;
  out.results.push({ ...j, status, ...info, ok });
  console.log(ok ? 'OK  ' : 'FAIL', status, j.store, j.target, '| h1:', info.h1, '| add:', info.addButtons, '| $:', info.prices, '| cart:', info.cart);
}
await browser.close();
fs.writeFileSync(path.join(ROOT, 'audit/menu-verification.json'), JSON.stringify(out, null, 2));
console.log('checked', out.results.length, 'ok', out.results.filter((r) => r.ok).length);
