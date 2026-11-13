// capture.mjs: the live site's words, read from the untouched capture (audit/raw), never retyped.
//
// Every page the crawl saved becomes { path, title, description, canonical, ogImage, h1, modules[], post?, event? }.
// A module is one top-level block of the source theme (hero, 50/50, text, slider, accordion, ...), kept in source order,
// with typed blocks inside: h1-h6, p, li, img, btn, faq (q + a), review (text + name), cat (category tile).
//
// When audit/raw is absent (a clone of the public repo) the snapshot src/content/capture.json is read instead,
// so the published source rebuilds the same pages without the raw capture.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RAW = path.join(ROOT, 'audit/raw');
const INV = path.join(ROOT, 'audit/site-inventory.json');
const SNAP = path.join(ROOT, 'src/content/capture.json');
const ORIGIN = 'https://capitaldistrictcannabis.com';

const ENT = { '&amp;': '&', '&#038;': '&', '&nbsp;': ' ', '&#8217;': '’', '&#8216;': '‘', '&#8220;': '“', '&#8221;': '”', '&#8211;': '–', '&#8212;': '—', '&#8230;': '…', '&quot;': '"', '&#039;': "'", '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>', '&#x27;': "'", '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”', '&ndash;': '–', '&mdash;': '—', '&hellip;': '…', '&#215;': '×', '&#8243;': '″', '&#8242;': '′' };
export const decode = (s) => String(s || '').replace(/&#?[a-z0-9]+;/gi, (m) => (ENT[m] !== undefined ? ENT[m] : /^&#\d+;$/.test(m) ? String.fromCodePoint(Number(m.slice(2, -1))) : /^&#x[0-9a-f]+;$/i.test(m) ? String.fromCodePoint(parseInt(m.slice(3, -1), 16)) : m));
export const text = (h) => decode(String(h || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => { const m = tag.match(new RegExp('\\s' + name + '\\s*=\\s*"([^"]*)"', 'i')) || tag.match(new RegExp('\\s' + name + "\\s*=\\s*'([^']*)'", 'i')); return m ? decode(m[1]) : null; };
const clean = (h) => String(h).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<noscript[\s\S]*?<\/noscript>/gi, '').replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
export const normPath = (u) => { try { const p = new URL(u, ORIGIN).pathname.replace(/\/+$/, ''); return p || '/'; } catch { return null; } };

// image source: prefer the lazy-load attributes, then the largest srcset candidate
function imgSrc(tag) {
  const cands = [attr(tag, 'data-lazy-src'), attr(tag, 'data-src'), attr(tag, 'src')].filter((s) => s && !/^data:/.test(s));
  const srcset = attr(tag, 'data-lazy-srcset') || attr(tag, 'data-srcset') || attr(tag, 'srcset');
  if (srcset) {
    const best = srcset.split(',').map((s) => s.trim().split(/\s+/)).filter((p) => p[0] && !/^data:/.test(p[0])).sort((a, b) => parseInt(b[1] || '0', 10) - parseInt(a[1] || '0', 10))[0];
    if (best) return best[0];
  }
  return cands[0] || null;
}

// sanitized rich HTML for articles: an allowlist of tags, attributes reduced to href/src/alt
export function sanitize(fragment) {
  let h = clean(fragment);
  h = h.replace(/<img\b[^>]*>/gi, (t) => { const s = imgSrc(t); return s ? `<img src="${s}" alt="${(attr(t, 'alt') || '').replace(/"/g, '&quot;')}">` : ''; });
  h = h.replace(/<a\b[^>]*>/gi, (t) => { const href = attr(t, 'href'); return href ? `<a href="${href.replace(/"/g, '&quot;')}">` : '<a>'; });
  h = h.replace(/<(\/?)(p|h[1-6]|ul|ol|li|strong|b|em|i|blockquote|table|thead|tbody|tr|td|th|figure|figcaption|br)\b[^>]*>/gi, '<$1$2>');
  h = h.replace(/<(?!\/?(?:p|h[1-6]|ul|ol|li|strong|b|em|i|blockquote|table|thead|tbody|tr|td|th|figure|figcaption|br|a|img)\b)[^>]+>/gi, '');
  h = h.replace(/<(p|li|h[1-6]|strong|em|b|i)>\s*<\/\1>/gi, '').replace(/\n\s*\n+/g, '\n').trim();
  return h;
}

// ordered typed blocks inside one module chunk
function blocksOf(chunk) {
  const c = clean(chunk);
  const out = [];
  const push = (off, b) => out.push([off, b]);
  // accordion items: a heading/button then a panel
  const faqRe = /<div[^>]*class="[^"]*accordion-item[^"]*"[^>]*>([\s\S]*?)<section[^>]*class="[^"]*accordion-panel[^"]*"[^>]*>([\s\S]*?)<\/section>/gi;
  const faqSpans = [];
  for (const m of c.matchAll(faqRe)) { push(m.index, { t: 'faq', q: text(m[1]), a: text(m[2]), html: sanitize(m[2]) }); faqSpans.push([m.index, m.index + m[0].length]); }
  // review slides
  const revRe = /<div[^>]*class="[^"]*review-slide-text[^"]*"[^>]*>([\s\S]*?)<div[^>]*class="[^"]*review-slide-title[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  for (const m of c.matchAll(revRe)) { push(m.index, { t: 'review', text: text(m[1]), name: text(m[2]) }); faqSpans.push([m.index, m.index + m[0].length]); }
  const inside = (off) => faqSpans.some(([a, b]) => off >= a && off < b);
  for (const m of c.matchAll(/<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)) { if (inside(m.index)) continue; const tx = text(m[2]); if (tx) push(m.index, { t: m[1].toLowerCase(), text: tx, html: m[1].toLowerCase() === 'p' || m[1].toLowerCase() === 'li' ? sanitize(m[2]) : undefined }); }
  for (const m of c.matchAll(/<img\b[^>]*>/gi)) { if (inside(m.index)) continue; const s = imgSrc(m[0]); if (s) push(m.index, { t: 'img', src: s, alt: attr(m[0], 'alt') || '' }); }
  for (const m of c.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    if (inside(m.index)) continue;
    const cls = attr('<a' + m[1] + '>', 'class') || '';
    const href = attr('<a' + m[1] + '>', 'href');
    const tx = text(m[2]);
    if (href && tx && /\b(btn|button)\b/i.test(cls)) push(m.index, { t: 'btn', text: tx, href });
  }
  out.sort((a, b) => a[0] - b[0]);
  // drop paragraphs that are only the text of a following/previous li or heading duplicate
  const res = []; const seen = new Set();
  for (const [, b] of out) { const k = b.t + '|' + (b.text || b.src || b.q || '') + '|' + (b.href || ''); if (seen.has(k)) continue; seen.add(k); res.push(b); }
  return res;
}

const TOP = /^(module-hero|module-full-width-cta|module-5050|module-newsletter-5050|module-text|module-slider|module-shop-categories|module-accordion|module-code|module-cta-grid|module-gallery|module-centered-image|module-contact-form|module-info|store-locator-banner|page-banner|tribe-events-pg-template|single-post-wrapper)$/;

function region(html) {
  const h = String(html);
  let a = h.search(/<main\b/i);
  const firstModule = h.search(/<(div|section)\b[^>]*class="(module-|page-banner|tribe-events-pg-template|store-locator-banner)/i);
  if (a < 0 || (firstModule >= 0 && firstModule < a)) a = firstModule;
  let b = h.search(/<footer\b/i);
  if (b < 0) b = h.length;
  return a >= 0 ? h.slice(a, b) : '';
}

function modulesOf(html) {
  const r = region(html);
  const starts = [];
  for (const m of r.matchAll(/<(div|section)\b([^>]*)>/g)) {
    const cl = attr('<x' + m[2] + '>', 'class') || '';
    const first = cl.split(/\s+/)[0];
    if (!TOP.test(first)) continue;
    // inner text blocks inside a 50/50 or newsletter are not top level: only a padded module-text is
    if (first === 'module-text' && !/\bpadded\b/.test(cl)) continue;
    starts.push({ i: m.index, kind: first.replace(/^module-/, ''), cls: cl });
  }
  const mods = [];
  for (let k = 0; k < starts.length; k++) {
    const s = starts[k];
    const chunk = r.slice(s.i, k + 1 < starts.length ? starts[k + 1].i : r.length);
    const blocks = blocksOf(chunk);
    if (blocks.length) mods.push({ kind: s.kind, id: (s.cls.match(/setting-id-([\w-]+)/) || [])[1] || null, blocks });
  }
  return mods;
}

function postOf(html) {
  const h = clean(html);
  const content = h.match(/<div[^>]*class="post-content"[^>]*>([\s\S]*?)<div[^>]*class="post-sidebar-right/i);
  if (!content) return null;
  const banner = h.match(/<div[^>]*class="page-banner[^"]*single-post-banner[^"]*"[^>]*>([\s\S]*?)<div[^>]*class="post-thumbnail-wrapper/i);
  const thumb = h.match(/<div[^>]*class="post-thumbnail"[^>]*>([\s\S]*?)<\/div>/i);
  const meta = h.match(/<div[^>]*class="single-post-meta-data"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  const cats = banner ? [...banner[1].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => text(m[1])).filter(Boolean) : [];
  const img = thumb ? (thumb[1].match(/<img\b[^>]*>/i) || [])[0] : null;
  return {
    title: banner ? text((banner[1].match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]) : null,
    cats,
    image: img ? { src: imgSrc(img), alt: attr(img, 'alt') || '' } : null,
    meta: meta ? text(meta[1]) : null,
    html: sanitize(content[1].replace(/<div[^>]*class="post-sidebar-right[\s\S]*$/i, '')),
  };
}

function eventOf(html) {
  const h = clean(html);
  const sec = h.match(/<section[^>]*class="[^"]*tribe-events-pg-template[^"]*"[^>]*>([\s\S]*?)<\/section>\s*<\/main>|<section[^>]*class="[^"]*tribe-events-pg-template[^"]*"[^>]*>([\s\S]*)$/i);
  if (!sec) return null;
  const s = sec[1] || sec[2];
  const title = text((s.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]);
  const sched = text((s.match(/<div[^>]*class="[^"]*tribe-events-schedule[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || [])[1]);
  const imgTag = (s.match(/<div[^>]*class="[^"]*tribe-events-event-image[^"]*"[^>]*>[\s\S]*?(<img\b[^>]*>)/i) || [])[1];
  const desc = (s.match(/<div[^>]*class="[^"]*tribe-events-single-event-description[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<!--|<div)/i) || [])[1] || '';
  const metaHtml = (s.match(/<div[^>]*class="[^"]*tribe-events-event-meta[^"]*"[^>]*>([\s\S]*?)<div[^>]*class="[^"]*tribe-events-after-html/i) || [])[1] || '';
  const dts = {};
  for (const m of metaHtml.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)) dts[text(m[1]).replace(/:$/, '')] = text(m[2]);
  const venue = text((metaHtml.match(/<dd[^>]*class="[^"]*tribe-venue[^"]*"[^>]*>([\s\S]*?)<\/dd>/i) || [])[1]);
  const addr = text((metaHtml.match(/<address[^>]*class="[^"]*tribe-events-address[^"]*"[^>]*>([\s\S]*?)<\/address>/i) || [])[1]);
  const startIso = (metaHtml.match(/<abbr[^>]*class="[^"]*tribe-events-start-date[^"]*"[^>]*title="([^"]+)"/i) || [])[1] || null;
  return { title, schedule: sched, image: imgTag ? { src: imgSrc(imgTag), alt: attr(imgTag, 'alt') || '' } : null, html: sanitize(desc), meta: dts, venue, address: addr, startDate: startIso };
}

function headOf(html) {
  const meta = (n) => { const m = html.match(new RegExp('<meta[^>]+(?:name|property)="' + n + '"[^>]*>', 'i')); return m ? attr(m[0], 'content') : null; };
  const lds = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);
  return {
    title: decode((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').trim(),
    description: meta('description'),
    canonical: (html.match(/<link[^>]+rel="canonical"[^>]*href="([^"]+)"/i) || [])[1] || null,
    ogImage: meta('og:image'),
    ogType: meta('og:type'),
    published: meta('article:published_time'),
    modified: meta('article:modified_time'),
    h1: text((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]),
    jsonld: lds,
  };
}

let CACHE = null;
export function loadCapture() {
  if (CACHE) return CACHE;
  if (fs.existsSync(RAW) && fs.existsSync(INV)) {
    const inv = JSON.parse(fs.readFileSync(INV, 'utf8'));
    const pages = {};
    for (const p of inv.pages) {
      if (p.status !== 200 || !p.savedAs || !/html/.test(p.contentType || 'text/html')) continue;
      const pth = normPath(p.finalUrl || p.url);
      if (!pth || pages[pth]) continue;
      if (/^\/(stores|wp-content|cdn-cgi|events\/(?!$)|page\/|product\/)/.test(pth + '/')) continue; // menu app, calendar views, pagination
      const file = path.join(RAW, p.savedAs);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, 'utf8');
      const rec = { path: pth, source: ORIGIN + (pth === '/' ? '/' : pth + '/'), fetchedAt: p.fetchedAt, ...headOf(html), modules: modulesOf(html) };
      const post = /^\/blog\/./.test(pth) ? postOf(html) : null;
      if (post) rec.post = post;
      const ev = /^\/event\/./.test(pth) ? eventOf(html) : null;
      if (ev) rec.event = ev;
      pages[pth] = rec;
    }
    CACHE = { capturedFrom: ORIGIN, generated: new Date().toISOString(), pages };
  } else if (fs.existsSync(SNAP)) {
    CACHE = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  } else {
    throw new Error('no capture: neither audit/raw nor src/content/capture.json exists');
  }
  return CACHE;
}

export function writeCaptureSnapshot() {
  if (!fs.existsSync(RAW)) return false;
  const c = loadCapture();
  fs.writeFileSync(SNAP, JSON.stringify(c));
  return true;
}

export const page = (pth) => loadCapture().pages[pth] || null;
export const allPages = () => Object.values(loadCapture().pages);
