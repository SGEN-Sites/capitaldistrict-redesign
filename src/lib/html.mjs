// html.mjs: tiny helpers shared by every template. No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { menuUrl, DEFAULT_STORE, ORIGIN } from '../content/site.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let BASE = '/';
export const setBase = (b) => { BASE = b.endsWith('/') ? b : b + '/'; };
export const base = () => BASE;

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const attrs = (o) => Object.entries(o).filter(([, v]) => v !== false && v != null).map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join('');

// internal URL -> base-prefixed; live-site URLs that this build rebuilds are made relative to the base too
const REBUILT = /^\/(?!stores\/|wp-content\/|product\/|cdn-cgi\/)/;
export function href(u) {
  if (!u) return BASE;
  if (/^(mailto:|tel:|#|data:)/.test(u)) return u;
  let p = u;
  if (p.startsWith(ORIGIN)) p = p.slice(ORIGIN.length) || '/';
  if (/^https?:\/\//.test(p)) return p; // external stays as is
  if (!p.startsWith('/')) return p;
  if (!REBUILT.test(p) && p !== '/') return ORIGIN + p; // the live menu and uploads stay on the live site
  const [pathPart, rest = ''] = p.split(/(?=[?#])/);
  let clean = pathPart;
  if (clean !== '/' && !/\.[a-z0-9]+$/i.test(clean) && !clean.endsWith('/')) clean += '/';
  return BASE + clean.replace(/^\//, '') + rest;
}
export const asset = (p) => BASE + 'assets/' + p.replace(/^\//, '');
export const isExternal = (u) => /^https?:\/\//.test(u) && !String(u).startsWith(ORIGIN + '/') || /^https?:\/\//.test(u) && /\/stores\//.test(u);

// ---- images (src/content/images.json, written by tools/process-images.py) ----
let REG = null;
const reg = () => REG || (REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/images.json'), 'utf8')));
export const imgInfo = (id) => reg().img[id] || null;
// a captured WordPress image URL -> registry id (largest local variant)
export function mediaId(url) {
  if (!url) return null;
  const u = String(url).split('?')[0].replace(/\/+/g, '/').split('/wp-content/').pop();
  const m = u.match(/uploads\/(\d{4}\/\d{2}\/)?([^/]+)$/);
  if (!m) return null;
  const key = ((m[1] || '') + m[2]).replace(/-(\d+)x(\d+)(?=\.\w+$)|-scaled(?=\.\w+$)|-e\d{9,}(?=\.\w+$)/g, '').toLowerCase();
  return reg().media[key] || null;
}
// <img> with srcset from the registry. opts: { alt, sizes, cls, lazy=true, ai, eager, style, fit, decorative }
export function img(id, opts = {}) {
  const r = imgInfo(id);
  if (!r) return '';
  const files = r.files;
  const big = files[files.length - 1];
  const small = files.find((f) => f.w >= (opts.min || 700)) || big;
  const alt = opts.decorative ? '' : opts.alt ?? r.alt ?? '';
  const a = {
    src: asset(small.file), srcset: files.map((f) => `${asset(f.file)} ${f.w}w`).join(', '), sizes: opts.sizes || '100vw',
    width: big.w, height: big.h, alt, loading: opts.eager ? 'eager' : 'lazy', decoding: 'async', fetchpriority: opts.eager ? 'high' : null,
    class: opts.cls || null, style: opts.style || null, 'data-ai': r.ai ? r.ai : null, 'aria-hidden': opts.decorative ? 'true' : null,
    'data-depth': opts.depth ?? null,
  };
  return `<img${attrs(a)}>`;
}
// image by captured URL (falls back to the live URL when the asset was not downloaded)
export function mediaImg(url, opts = {}) {
  const id = mediaId(url);
  if (id) return img(id, opts);
  if (!url) return '';
  return `<img${attrs({ src: url, alt: opts.alt || '', loading: 'lazy', decoding: 'async', class: opts.cls || null })}>`;
}

// ---- store-aware live-menu links: default store in the HTML (works without JS), retargeted by site.js ----
export function menuLink(target, label, opts = {}) {
  const a = { href: menuUrl(DEFAULT_STORE, target), 'data-menu': target, class: opts.cls || null, target: '_blank', rel: 'noopener', 'aria-label': opts.aria || null };
  return `<a${attrs(a)}>${label}</a>`;
}
// a nav-style link object { label, href } | { label, menu }
export function linkTo(l, cls) {
  if (l.menu) return menuLink(l.menu, esc(l.label) + (cls === 'ext' ? icon('arrow-ne') : ''), { cls: cls && cls !== 'ext' ? cls : null });
  const ext = /^https?:\/\//.test(l.href) && !String(l.href).startsWith(ORIGIN + '/') ;
  return `<a${attrs({ href: href(l.href), class: cls && cls !== 'ext' ? cls : null, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null })}>${esc(l.label)}</a>`;
}

// ---- icons (inline SVG, 24px grid, stroke currentColor) ----
const P = {
  'arrow': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-ne': '<path d="M7 17 17 7M9 7h8v8"/>',
  'arrow-l': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  'chev': '<path d="m6 9 6 6 6-6"/>',
  'phone': '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  'pin': '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'bag': '<path d="M6 7h12l1 14H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  'star': '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  'plus': '<path d="M12 5v14M5 12h14"/>',
  'close': '<path d="M6 6l12 12M18 6 6 18"/>',
  'menu': '<path d="M4 7h16M4 12h16M4 17h10"/>',
  'search': '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  'play': '<path d="M8 5v14l11-7z"/>',
  'pause': '<path d="M8 5v14M16 5v14"/>',
  'cal': '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  'id': '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/><path d="M14 10h4M14 14h3"/>',
  'cash': '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  'spark': '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  'leaf': '<path d="M12 21V11M12 11c-4-1-7-4-7-8 4 0 7 3 7 8zM12 11c4-1 7-4 7-8-4 0-7 3-7 8zM12 15c-3 0-6-1-8-4M12 15c3 0 6-1 8-4"/>',
  'facebook': '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
  'instagram': '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
  'x': '<path d="M4 4l16 16M20 4 4 20"/>',
  'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  'gift': '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z"/>',
  'route': '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7"/>',
  'mic': '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  'check': '<path d="m5 12 5 5L20 7"/>',
};
export const icon = (n, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[n] || ''}</svg>`;

export const slug = (s) => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const trimWords = (s, n) => { const w = String(s || '').split(/\s+/); return w.length <= n ? s : w.slice(0, n).join(' ').replace(/[,;:.–—-]+$/, '') + '…'; };
