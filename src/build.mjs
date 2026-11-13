// build.mjs: render src/ into a static site. No dependencies.
//   node src/build.mjs                                                      -> dist/ (base "/", production canonicals)
//   node src/build.mjs --preview --out dist-preview --base /capitaldistrict-redesign/   -> noindex Pages preview
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setBase, href, esc } from './lib/html.mjs';
import { page, setPreview, setVersion, setOrigin } from './lib/layout.mjs';
import { ORIGIN } from './content/site.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const val = (n, dflt) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : dflt; };
const OUT = path.resolve(ROOT, val('--out', 'dist'));
const BASE = val('--base', '/');
const PREVIEW = args.includes('--preview');
setBase(BASE); setPreview(PREVIEW);
setOrigin(val('--origin', PREVIEW ? 'https://sgen-sites.github.io' : ''));
const VERSION = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
setVersion(VERSION);

// ---- clean + assets ----
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const copyDir = (from, to) => { if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true }); };
for (const d of ['fonts', 'brand', 'img', 'video']) copyDir(path.join(ROOT, 'src/assets', d), path.join(OUT, 'assets', d));
fs.rmSync(path.join(OUT, 'assets/fonts/fonts.json'), { force: true });
fs.rmSync(path.join(OUT, 'assets/brand/round-logo.svg'), { force: true });

// ---- css: token layer first, lane files after the shared layers, fix.css last ----
const ORDER = ['tokens.css', 'base.css', 'chrome.css', 'components.css', 'motion.css', 'home.css'];
const all = fs.readdirSync(path.join(ROOT, 'src/styles')).filter((f) => f.endsWith('.css'));
const SKIP_CSS = val('--skip-css', '').split(',').filter(Boolean); // lane files left out (e.g. while one is still being written)
const lanes = all.filter((f) => !ORDER.includes(f) && f !== 'fix.css' && !SKIP_CSS.includes(f)).sort();
const CSS = [...ORDER.filter((f) => all.includes(f)), ...lanes, ...(all.includes('fix.css') ? ['fix.css'] : [])];
const css = CSS.map((f) => fs.readFileSync(path.join(ROOT, 'src/styles', f), 'utf8')).join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
fs.mkdirSync(path.join(OUT, 'assets/css'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'assets/css/site.css'), css);
fs.mkdirSync(path.join(OUT, 'assets/js'), { recursive: true });
// ---- js: site.js first, then each feature module in src/scripts (alphabetical), bundled into one file
// --scripts a.js,b.js limits the feature modules (e.g. while one is still being written); site.js is always first
const ONLY_JS = val('--scripts', '').split(',').filter(Boolean);
const JS = ['site.js', ...fs.readdirSync(path.join(ROOT, 'src/scripts')).filter((f) => f.endsWith('.js') && f !== 'site.js' && (!ONLY_JS.length || ONLY_JS.includes(f))).sort()];
fs.writeFileSync(path.join(OUT, 'assets/js/site.js'), JS.map((f) => `/* ${f} */\n` + fs.readFileSync(path.join(ROOT, 'src/scripts', f), 'utf8')).join('\n;\n'));

// ---- pages ----
const mod = async (name) => {
  const f = path.join(ROOT, 'src/pages', name + '.mjs');
  if (!fs.existsSync(f)) { console.warn('skip: src/pages/' + name + '.mjs not written yet'); return null; }
  return import(pathToFileURL(f).href + '?v=' + VERSION);
};
const pages = [];
const add = (p) => { if (Array.isArray(p)) p.forEach(add); else if (p) pages.push(p); };
const ONLY = val('--only', '').split(',').filter(Boolean);
// page modules: the site's own, then any design-lab module (src/pages/lab-*.mjs, noindex pages for the owner's picks)
const LABS = fs.readdirSync(path.join(ROOT, 'src/pages')).filter((f) => /^lab-[\w-]+\.mjs$/.test(f)).map((f) => f.replace(/\.mjs$/, '')).sort();
for (const name of ['home', 'stores', 'shop', 'content', 'company', 'misc', ...LABS]) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  try {
    const m = await mod(name);
    if (!m) continue;
    add(m.pages ? m.pages() : m.home());
  } catch (e) { console.error('FAILED in src/pages/' + name + '.mjs:', e.stack); process.exitCode = 1; }
}

// ---- section seams (owner, 2026-11-13: "if the next section is white use the light-band tear, for deals the neon cut,
// the rest the spray"): between two adjacent bands in <main> on every non-lab page. Into a light band (mint/lime/paper)
// the wheat-paste tear; into or out of a deals section (the /deals/ page, #h-deals, #sh-deals) the neon cut; any other
// seam the overspray. The seam replaces a band's rounded "sheet" top. Skipped: the reviews -> events seam on the home
// page (the boombox cut-out crosses it). Each seam gets its own seed so no two tears or sprays repeat on a page.
const { divider } = await import(pathToFileURL(path.join(ROOT, 'src/lib/dividers.mjs')).href + '?v=' + VERSION);
const SEAM_TONES = ['night-2', 'ink-2', 'night', 'ink', 'slate', 'mint', 'lime', 'paper'];
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const seamCount = { torn: 0, spray: 0, neon: 0 };
function seams(html, p) {
  if (p.lab) return html;
  const o = html.indexOf('<main'); const ms = html.indexOf('>', o) + 1; const me = html.lastIndexOf('</main>');
  if (o < 0 || me < ms) return html;
  const main = html.slice(ms, me);
  const re = /<section\b[^>]*>|<\/section>/g; const tops = []; let depth = 0, cur = null, m;
  while ((m = re.exec(main))) {
    if (m[0][1] !== '/') { if (depth === 0) cur = { s: m.index, te: m.index + m[0].length, tag: m[0] }; depth++; }
    else if (--depth === 0 && cur) { cur.e = m.index + m[0].length; tops.push(cur); cur = null; }
  }
  const info = (tag) => { const cls = (tag.match(/\bclass="([^"]*)"/) || [])[1] || ''; const tone = SEAM_TONES.find((t) => new RegExp(`\\bband--${t}\\b`).test(cls)); return { cls, tone, id: (tag.match(/\bid="([^"]*)"/) || [])[1] || '', band: /\bband\b/.test(cls) && !!tone }; };
  const deals = (x) => p.type === 'deals' || /(^|-)deals$/.test(x.id);
  // a band's cut-out (floatObj passed as `after:`, the last thing in the section) that hangs across a seam: up (top:-…,
  // the default for floats placed by class) or down (bottom:-…). Owner, 2026-11-13: "place the bud or any objects
  // similar over the dividers": such a seam goes inside that band, one layer under its cut-out (.dv-in, dv.css).
  const tailFloat = (sec) => { const f = sec.match(/<div class="float\b[^"]*"\s+style="([^"]*)"[^>]*>(?:(?!<div\b)[\s\S])*?<\/div>\s*<\/section>$/); return f ? (/bottom\s*:\s*-/.test(f[1]) ? 'down' : 'up') : null; };
  const inside = (where, html) => `<div class="dv-in dv-in--${where}" aria-hidden="true">${html}</div>`;
  let out = '', last = 0, n = 0;
  for (let i = 1; i < tops.length; i++) {
    const a = tops[i - 1], b = tops[i];
    if (main.slice(a.e, b.s).trim()) continue;            // not adjacent
    const A = info(a.tag), B = info(b.tag);
    if (!A.band || !B.band) continue;
    const kind = ['mint', 'lime', 'paper'].includes(B.tone) ? 'torn' : deals(A) || deals(B) ? 'neon' : 'spray';
    seamCount[kind]++;
    const seam = divider(kind, { from: A.tone, to: B.tone, seed: (hash(p.path || '/') + ++n * 97) % 100000 });
    const btag = b.tag.replace(/\s+band--sheet\b/, '');
    const up = tailFloat(main.slice(b.s, b.e)) === 'up', down = !up && tailFloat(main.slice(a.s, a.e)) === 'down';
    if (up) out += main.slice(last, b.s) + btag + inside('top', seam);                          // under B's cut-out
    else if (down) out += main.slice(last, a.e - 10) + inside('bottom', seam) + '</section>' + main.slice(a.e, b.s) + btag; // under A's
    else out += main.slice(last, b.s) + seam + btag;
    last = b.te;
  }
  return out ? html.slice(0, ms) + out + main.slice(last) + html.slice(me) : html;
}

const redirect = (p) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(p.title || 'Redirecting')}</title><meta name="robots" content="noindex, nofollow"><link rel="canonical" href="${esc(ORIGIN + p.redirect)}"><meta http-equiv="refresh" content="0; url=${esc(href(p.redirect))}"></head><body><p><a href="${esc(href(p.redirect))}">Continue</a></p></body></html>`;
const seen = new Set();
for (const p of pages) {
  const file = p.file || (p.path === '/' ? 'index.html' : p.path.replace(/^\//, '').replace(/\/?$/, '/') + 'index.html');
  if (seen.has(file)) throw new Error('two pages write ' + file);
  seen.add(file);
  const out = path.join(OUT, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, p.redirect ? redirect(p) : seams(page(p), p));
}

// the live words this build used, so a clone of the published source rebuilds without the raw capture
const { writeCaptureSnapshot } = await import(pathToFileURL(path.join(ROOT, 'src/lib/capture.mjs')).href);
if (writeCaptureSnapshot()) console.log('capture snapshot: src/content/capture.json');
const listed = pages.filter((p) => !p.redirect && !p.file && p.path && !p.lab); // lab pages are never listed
if (PREVIEW) fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
else {
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${listed.map((p) => `<url><loc>${ORIGIN}${p.path}</loc></url>`).join('\n')}\n</urlset>\n`);
}
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`built ${pages.length} pages (${listed.length} listed, ${pages.filter((p) => p.redirect).length} redirects) into ${path.relative(ROOT, OUT)}/ (base ${BASE}${PREVIEW ? ', preview, noindex' : ''}), ${(size(OUT) / 1048576).toFixed(1)} MB, css ${(css.length / 1024).toFixed(0)} KB`);
