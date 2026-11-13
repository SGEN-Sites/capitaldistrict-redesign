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
const lanes = all.filter((f) => !ORDER.includes(f) && f !== 'fix.css').sort();
const CSS = [...ORDER.filter((f) => all.includes(f)), ...lanes, ...(all.includes('fix.css') ? ['fix.css'] : [])];
const css = CSS.map((f) => fs.readFileSync(path.join(ROOT, 'src/styles', f), 'utf8')).join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
fs.mkdirSync(path.join(OUT, 'assets/css'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'assets/css/site.css'), css);
fs.mkdirSync(path.join(OUT, 'assets/js'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src/scripts/site.js'), path.join(OUT, 'assets/js/site.js'));

// ---- pages ----
const mod = async (name) => {
  const f = path.join(ROOT, 'src/pages', name + '.mjs');
  if (!fs.existsSync(f)) { console.warn('skip: src/pages/' + name + '.mjs not written yet'); return null; }
  return import(pathToFileURL(f).href + '?v=' + VERSION);
};
const pages = [];
const add = (p) => { if (Array.isArray(p)) p.forEach(add); else if (p) pages.push(p); };
const ONLY = val('--only', '').split(',').filter(Boolean);
for (const name of ['home', 'stores', 'shop', 'content', 'company', 'misc']) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  try {
    const m = await mod(name);
    if (!m) continue;
    add(m.pages ? m.pages() : m.home());
  } catch (e) { console.error('FAILED in src/pages/' + name + '.mjs:', e.stack); process.exitCode = 1; }
}

const redirect = (p) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(p.title || 'Redirecting')}</title><meta name="robots" content="noindex, nofollow"><link rel="canonical" href="${esc(ORIGIN + p.redirect)}"><meta http-equiv="refresh" content="0; url=${esc(href(p.redirect))}"></head><body><p><a href="${esc(href(p.redirect))}">Continue</a></p></body></html>`;
const seen = new Set();
for (const p of pages) {
  const file = p.file || (p.path === '/' ? 'index.html' : p.path.replace(/^\//, '').replace(/\/?$/, '/') + 'index.html');
  if (seen.has(file)) throw new Error('two pages write ' + file);
  seen.add(file);
  const out = path.join(OUT, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, p.redirect ? redirect(p) : page(p));
}

// the live words this build used, so a clone of the published source rebuilds without the raw capture
const { writeCaptureSnapshot } = await import(pathToFileURL(path.join(ROOT, 'src/lib/capture.mjs')).href);
if (writeCaptureSnapshot()) console.log('capture snapshot: src/content/capture.json');
const listed = pages.filter((p) => !p.redirect && !p.file && p.path);
if (PREVIEW) fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
else {
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${listed.map((p) => `<url><loc>${ORIGIN}${p.path}</loc></url>`).join('\n')}\n</urlset>\n`);
}
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`built ${pages.length} pages (${listed.length} listed, ${pages.filter((p) => p.redirect).length} redirects) into ${path.relative(ROOT, OUT)}/ (base ${BASE}${PREVIEW ? ', preview, noindex' : ''}), ${(size(OUT) / 1048576).toFixed(1)} MB, css ${(css.length / 1024).toFixed(0)} KB`);
