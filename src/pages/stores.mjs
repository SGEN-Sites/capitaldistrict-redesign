// stores.mjs: the STORES lane. /location/ (hub), the three store pages, /store-locator/, /visit-us/, the 40
// /visit-us/<town>/ pages and two redirects. Existing pages keep every captured word (src/lib/capture.mjs): this file
// only chooses order and layout. New words are UI labels (buttons, small headings), the three meta descriptions the
// live pages never had, and the five card titles on /visit-us/ (each card quotes a captured sentence).
import {
  pageHero, band, dh, kicker, btn, sticker, storeCard, hoursTable, mapEmbed, crate, floatObj, faqList, shoutouts,
  glassCard, richHtml, signUp, areaGrid, bullet, statusLine, esc, href, img, imgInfo, mediaImg, icon,
} from '../lib/parts.mjs';
import { storeLd } from '../lib/layout.mjs';
import { brand, stores, storeById, menuUrl, categories, ORIGIN, DEFAULT_STORE } from '../content/site.mjs';
import { page as capPage, allPages } from '../lib/capture.mjs';

// ---------- capture + asset access (fail closed) ----------
const cap = (p) => { const c = capPage(p); if (!c) throw new Error('stores: no capture for ' + p); return c; };
const need = (id) => { if (!imgInfo(id)) throw new Error('stores: no image ' + id); return id; };
const og = (id) => { const f = imgInfo(need(id)).files; return (f.find((x) => x.w >= 1200) || f[f.length - 1]).file; };
const isHead = (b) => /^h[1-6]$/.test(b.t);
const addr = (s) => `${s.street}, ${s.city}, ${s.region} ${s.zip}`;

// a captured module as kicker / heading / body / buttons / images
function partsOf(mod) {
  const bl = mod ? mod.blocks : [];
  const hi = bl.findIndex(isHead);
  const before = hi < 0 ? bl : bl.slice(0, hi);
  const kick = before.find((b) => b.t === 'p' && b.text.length <= 80);
  return {
    kick: kick ? kick.text : '',
    head: hi < 0 ? null : bl[hi],
    pre: before.filter((b) => b.t === 'p' && b !== kick),
    body: (hi < 0 ? [] : bl.slice(hi + 1)).filter((b) => b.t !== 'btn' && b.t !== 'img'),
    btns: bl.filter((b) => b.t === 'btn'),
    imgs: bl.filter((b) => b.t === 'img'),
  };
}

// a captured heading cut into the white and lime halves of the two-tone display heading. The cut changes the colour,
// never the words: a + ' ' + b is the captured heading.
function split2(text) {
  const t = String(text).trim().replace(/\s+/g, ' ');
  const w = t.split(' ');
  const q = t.indexOf('? ');
  if (q > 0) return [t.slice(0, q + 1), t.slice(q + 2)];
  if (w.length < 2) return [t, ''];
  const last = (re) => { for (let i = w.length - 1; i >= 1; i--) if (re.test(w[i])) return i; return -1; };
  let cut = w.findIndex((x, i) => i > 0 && x === 'Capital' && w[i + 1] === 'District');
  if (cut < 1) cut = last(/^Near$/i);
  if (cut < 1) cut = last(/^(in|from|to|About|Our|&)$/);
  if (cut < 1) cut = Math.min(w.length - 1, Math.max(1, Math.ceil(w.length * 0.55)));
  return [w.slice(0, cut).join(' '), w.slice(cut).join(' ')];
}
function capDh(text, o = {}) {
  const t = String(text).trim();
  const [a, b] = split2(t);
  return dh(a, b, { ...o, size: o.size || (t.length > 46 ? 'sm' : t.length > 26 ? 'md' : 'lg') });
}

// ---------- captured rich HTML ----------
// Live-menu links in captured copy go straight to products. On a store or town page they are pinned to that page's
// store (no data-menu, like crate({ store })); elsewhere they follow the visitor's store chip. The retired /shop/<cat>/
// paths keep their category. /dispensary-locations/ ("Albany shop", not in the crawl) points to the Albany store page.
const SHOP = { flower: 'flower', 'pre-rolls': 'pre-rolls', edibles: 'edibles', vaporizers: 'vapes', vapes: 'vapes', concentrates: 'concentrates', tinctures: 'tinctures', cbd: 'cbd', topicals: 'topicals', accessories: 'accessories', beverages: 'beverages' };
const BY_MENU = Object.fromEntries(stores.map((s) => [s.menu, s.id]));
function pre(html, sid) {
  return String(html || '').replace(/<a href="([^"]*)">/g, (m, u) => {
    const raw = u.replace(/&amp;/g, '&');
    const p = raw.startsWith(ORIGIN) ? (raw.slice(ORIGIN.length) || '/') : raw;
    if (/^\/dispensary-locations\/?$/.test(p)) return '<a href="/location/albany/">';
    let target = null; let pin = sid;
    // /shop/<cat>/ (retired) and /menu (404 on the live site) -> that category, or the whole menu
    const shop = p.match(/^\/(?:shop|menu)\/?([\w-]*)\/?(?:\?([^#]*))?$/);
    if (shop) target = /beverage/i.test(shop[2] || '') ? 'beverages' : (SHOP[shop[1]] || 'all');
    // /brands/<slug>/ (never crawled; the brand hub /brands/ stays a page) -> that brand on the live menu (slug unverified)
    const brandM = p.match(/^\/brands\/([\w-]+)\/?$/);
    if (brandM) target = 'brands/' + brandM[1];
    if (/^\/specials\/?$/.test(p)) target = 'specials';
    const st = p.match(/^\/stores\/?([\w-]*)\/?(specials)?\/?$/);
    if (st) { target = st[2] ? 'specials' : 'all'; if (BY_MENU[st[1]]) pin = BY_MENU[st[1]]; }
    const sp = p.match(/^\/stores\/(?:([\w-]+)\/)?products\/([\w-]+)/);
    if (sp && !st) { const c = categories.find((x) => x.path.endsWith('/' + sp[2])); target = c ? c.id : 'all'; if (BY_MENU[sp[1]]) pin = BY_MENU[sp[1]]; }
    if (!target) return m;
    if (pin) return `<a href="${esc(menuUrl(pin, target))}" target="_blank" rel="noopener">`;
    return `<a href="${esc(menuUrl(DEFAULT_STORE, target))}" data-menu="${target}" target="_blank" rel="noopener">`;
  });
}
const rich = (html, sid) => richHtml(pre(html, sid));
// a run of captured blocks as HTML: p and li keep their captured rich HTML, headings become h3 (raw: FAQ answers,
// which faqList passes through richHtml itself)
function bodyHtml(blocks, sid, raw = false) {
  const one = (b) => (b.html != null ? (raw ? pre(b.html, sid) : rich(b.html, sid)) : esc(b.text));
  let out = ''; let list = [];
  const flush = () => { if (list.length) { out += `<ul>${list.join('')}</ul>`; list = []; } };
  for (const b of blocks) {
    if (b.t === 'li') { list.push(`<li>${one(b)}</li>`); continue; }
    flush();
    if (b.t === 'p') out += `<p>${one(b)}</p>`;
    else if (isHead(b)) out += `<h3>${esc(b.text)}</h3>`;
    else if (b.t === 'blockquote') out += `<blockquote><p>${esc(b.text)}</p></blockquote>`;
  }
  flush();
  return out;
}

// ---------- the long captured text of a store or town page, cut into typed sections ----------
const KINDS = [
  ['faqhead', /^FAQs?\b/i],
  ['route', /^(getting|directions)\b/i],
  ['things', /^(other reasons|things to do|what is our weed dispensary near|dispensary near|cannabis near)/i],
  ['stay', /^(staying in|places to stay)/i],
  ['visit', /^(visit our dispensary|plan your visit)/i],
  ['q', /^(is|can|do|does|how|what|when|where|will|are)\b.*\?\s*$/i],
];
const kindOf = (t) => (KINDS.find(([, re]) => re.test(t)) || ['prose'])[0];
function sectionize(blocks) {
  const lead = []; const secs = []; let cur = null;
  for (const b of blocks) {
    if (/^h[2-4]$/.test(b.t)) { cur = { h: b, level: Number(b.t[1]), body: [], kind: kindOf(b.text), sub: false }; secs.push(cur); }
    else if (cur) cur.body.push(b); else lead.push(b);
  }
  // a deeper untyped heading under a things / stay / route / visit heading belongs to it (e.g. the four places under
  // "What Is Our Weed Dispensary Near?")
  let top = null;
  for (const s of secs) {
    if (top && s.level > top.level && ['things', 'stay', 'route', 'visit'].includes(top.kind) && (s.kind === 'prose' || s.kind === top.kind)) { s.kind = top.kind; s.sub = true; }
    if (!s.sub) top = s;
  }
  return { lead, secs };
}
function longform(blocks, s, o = {}) {
  const { lead, secs } = sectionize(blocks);
  const qs = secs.filter((x) => x.kind === 'q');
  const faqhead = secs.find((x) => x.kind === 'faqhead');
  const asFaq = qs.length >= 2 || !!faqhead || (o.faqAlways && qs.length > 0);
  return {
    lead,
    prose: secs.filter((x) => x.kind === 'prose' || (!asFaq && x.kind === 'q')),
    faq: asFaq ? { head: faqhead || null, items: qs.map((x) => ({ q: x.h.text, a: x.body.map((b) => b.text).join(' '), html: bodyHtml(x.body, s.id, true) })) } : null,
    things: secs.filter((x) => x.kind === 'things' || x.kind === 'stay'),
    route: secs.filter((x) => x.kind === 'route'),
    visit: secs.filter((x) => x.kind === 'visit'),
  };
}
const faqLd = (items) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });

// ---------- small shared pieces ----------
const mapBox = (s) => `<div class="st-mapbox">${mapEmbed(s)}</div>`;
const toner = () => { let last = 'night'; return (t) => { if (t === last) t = { ink: 'night', night: 'ink', slate: 'ink', mint: 'ink', lime: 'ink' }[t]; last = t; return t; }; };
const backdrop = (id) => `${img(need(id), { decorative: true, sizes: '100vw', cls: 'st-bd' })}<div class="st-shade"></div>`;
// a fixed-store menu button (store and town pages): straight to that store's products, no data-menu
const shopBtn = (s, label, o = {}) => `<a class="btn btn--${o.kind || 'lime'}${o.size ? ' btn--' + o.size : ''}" href="${esc(menuUrl(s.id, o.target || 'all'))}" target="_blank" rel="noopener" data-magnetic aria-label="${esc(label)}, ${esc(s.name)} live menu (opens in a new tab)"><span>${esc(label)}</span>${icon('arrow-ne')}</a>`;
const callBtn = (s, o = {}) => `<a class="btn btn--ghost${o.size ? ' btn--' + o.size : ''}" href="tel:${s.tel}"><span>${esc(o.label || 'Call ' + s.phone)}</span>${icon('phone')}</a>`;
const setBtn = (s) => `<button class="btn btn--ghost" type="button" data-set-store="${s.id}"><span>Make this my store</span>${icon('check')}</button>`;
// a captured button: shop buttons go straight to that store's products, directions stay as captured
function capBtn(b, s, o = {}) {
  const u = b.href.startsWith(ORIGIN) ? b.href.slice(ORIGIN.length) : b.href;
  if (/^\/(shop|stores)(\/|$)/.test(u)) return shopBtn(s, b.text, { kind: o.kind || 'lime', target: /\/specials\/?$/.test(u) ? 'specials' : 'all' });
  return btn(b.text, b.href, { kind: o.kind || 'ghost' });
}
const passCard = (s, label) => `<div class="st-pass" data-reveal style="--i:2">
  <div class="st-pass__top">${bullet(s)}<div><p class="st-pass__name">${esc(s.name)}</p>${statusLine(s)}</div></div>
  <p class="st-pass__addr">${icon('pin')}<span>${esc(addr(s))}</span></p>
  <div class="st-pass__cta">${shopBtn(s, label || `Shop ${s.city}`, { size: 'sm' })}${callBtn(s, { size: 'sm', label: s.phone })}</div>
</div>`;
const licStrip = (s) => `<p class="st-lic" data-reveal><span>${icon('id')}<b>Adults 21+ with valid ID</b></span><span>${esc(s.name)} licence <b>${esc(s.licence)}</b></span><span>${esc(brand.legal)}</span></p>`;

// ---------- the 40 town pages: name, nearest store, drive time, from the capture ----------
const STORE_SIG = [['albany', /997 Central Ave/i, /487-4591/], ['clifton-park', /1508 U\.?S\.?[- ]?9\b/i, /901-0010/], ['schenectady', /1650 Crane St/i, /901-7107/]];
// SUNY Albany: its store block lists 1650 Crane St, but with Albany's phone, (518) 487-4591, and its own hero places the
// store "in Albany, NY about 8 min (2.4 miles) via Washington Ave". Two of the page's facts say Albany. (Flagged.)
const STORE_FIX = { '/visit-us/recreational-cannabis-dispensary-near-suny-albany': 'albany' };
function townStore(p) {
  if (STORE_FIX[p.path]) return STORE_FIX[p.path];
  const txt = (mods) => mods.flatMap((m) => m.blocks).map((b) => [b.text, b.q, b.a].filter(Boolean).join(' ')).join('\n');
  const last = txt(p.modules.slice(-1)); const all = txt(p.modules);
  for (const t of [last, all]) for (const [id, a] of STORE_SIG) if (a.test(t)) return id; // the address first
  for (const t of [last, all]) for (const [id, , ph] of STORE_SIG) if (ph.test(t)) return id; // then the phone
  throw new Error('stores: no store found for ' + p.path);
}
const minutesOf = (s) => { const h = s.match(/(\d+)\s*(?:hr|hour)/i); const m = s.match(/(\d+)\s*(?:min|minute)/i); return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0); };
// the captured drive time in one short form for the town grids ("9 minutes" -> "9 min", "1 hour and 1 minute" -> "1 hr 1 min")
const fmtMins = (n) => (n >= 9999 ? '' : n >= 60 ? `${Math.floor(n / 60)} hr${n % 60 ? ` ${n % 60} min` : ''}` : `${n} min`);
function townOf(p) {
  const hero = p.modules.find((m) => m.kind === 'full-width-cta') || p.modules[0];
  const hi = hero.blocks.findIndex((b) => b.t === 'h1' || b.t === 'h2');
  if (hi < 0) throw new Error('stores: no heading on ' + p.path);
  const head = hero.blocks[hi];
  const kick = hero.blocks.slice(0, hi).find((b) => b.t === 'p');
  const lede = hero.blocks.slice(hi + 1).find((b) => b.t === 'p');
  if (!lede) throw new Error('stores: no drive-time paragraph on ' + p.path);
  const dir = hero.blocks.find((b) => b.t === 'btn' && /directions/i.test(b.text));
  // "...Near Colonie, NY" -> "Colonie"; the state suffix is a separate word, so "SUNY Albany" keeps its "ny"
  const name = head.text.replace(/^.*?\bNear\s+/i, '').replace(/,?\s+NY\s*$/, '').trim();
  const drive = (lede.text.split(/(?<=[.!?])\s+(?=[A-Z])/).find((x) => /\d+\s*(?:min|minute|hr|hour)/i.test(x)) || lede.text).trim();
  const dm = drive.match(/(\d+\s*(?:hr|hour)s?(?:\s*(?:and\s*)?\d+\s*(?:min|minute)s?)?|\d+\s*(?:min|minute)s?)\s*\(([\d.]+\s*miles?)\)/i);
  const mins = dm ? minutesOf(dm[1]) : 9999;
  return { path: p.path + '/', cap: p, name, h1: head.text, kick: kick ? kick.text : '', lede, drive, short: fmtMins(mins), miles: dm ? dm[2] : '', mins, dir: dir ? dir.href : null, store: townStore(p) };
}
let TOWNS_CACHE = null;
const towns = () => TOWNS_CACHE || (TOWNS_CACHE = allPages().filter((p) => /^\/visit-us\/./.test(p.path)).map(townOf).sort((a, b) => a.name.localeCompare(b.name)));

// ---------- art direction per store (real photos for the store; generated art only as mood backdrops) ----------
const LOOK = {
  albany: { hero: 'store-mural', why: 'wall-mural-wide', things: 'skyline', visit: 'alley', town: 'store-albany', townAlt: 'Inside the Albany dispensary: the graffiti mural behind the counter' },
  'clifton-park': { hero: 'm-2025-10-img-6712', why: 'wall-mural-wide', things: 'wall-mural-wide', visit: 'alley', town: 'm-2025-10-img-6709', townAlt: 'Inside the Clifton Park dispensary: tin ceiling, a timber table and glass display cases' },
  schenectady: { hero: 'm-2025-07-istock-1021709806', why: 'alley', things: 'wall-mural-wide', visit: 'wall-mural', town: 'm-2025-08-image-1', townAlt: 'Customers at the counter under the Capital District Cannabis badge' },
};

// ---------- section renderers ----------
function readerBand(L, s, o = {}) {
  if (!L.prose.length) return '';
  const kick = L.lead.find((b) => b.t === 'p' && b.text.length <= 80);
  const rest = L.lead.filter((b) => b !== kick);
  const [first, ...more] = L.prose;
  // an empty heading followed by deeper ones is a group ("Convenient Cannabis Options...": Pre-rolls, Edibles, ...), so
  // its children step down to h4; an empty heading with nothing under it is a closing line ("Check out our resources and
  // upcoming events...!"), which gets the Events and Blog links it talks about
  let group = null;
  const main = bodyHtml(rest, s.id) + bodyHtml(first.body, s.id) + more.map((x, i) => {
    if (group && x.level <= group.level) group = null;
    const next = more[i + 1];
    if (next && next.level > x.level) { group = x; return `<h3>${esc(x.h.text)}</h3>${bodyHtml(x.body, s.id)}`; }
    if (!x.body.length) return `<h3 class="st-callout">${esc(x.h.text)}</h3>${/event|resource/i.test(x.h.text) ? `<p class="st-links"><a class="tlink" href="${href('/events/')}">Events${icon('arrow')}</a><a class="tlink" href="${href('/blog/')}">Blog${icon('arrow')}</a></p>` : ''}`;
    const tag = group ? 'h4' : 'h3';
    return `<${tag}>${esc(x.h.text)}</${tag}>${bodyHtml(x.body, s.id)}`;
  }).join('');
  return band(`<div class="st-read">
  <aside class="st-read__aside">${kicker(kick ? kick.text : '')}${capDh(first.h.text, { size: first.h.text.length > 46 ? 'sm' : 'md' })}${o.pass === false ? '' : passCard(s, o.passLabel)}</aside>
  <div class="prose st-prose st-read__main" data-reveal>${main}</div>
</div>`, { tone: o.tone });
}

const isItem = (b) => b.t === 'li' || (b.t === 'p' && /^\s*(?:<a [^>]*>\s*)?<(?:b|strong)>/i.test(b.html || ''));
function thingsBand(secs, s, o = {}) {
  if (!secs.length) return '';
  const groups = [];
  for (const x of secs) { if (!x.sub || !groups.length) groups.push({ top: x, subs: [] }); else groups[groups.length - 1].subs.push(x); }
  const html = groups.map((g, gi) => {
    const items = g.top.body.filter(isItem); const text = g.top.body.filter((b) => !isItem(b));
    const cards = [
      ...items.map((b) => `<p>${rich(b.html, s.id)}</p>`),
      ...g.subs.map((x) => `<h3 class="st-tip__t">${esc(x.h.text)}</h3>${bodyHtml(x.body, s.id)}`),
    ].map((inner, i) => `<article class="st-tip glass" data-tilt data-reveal style="--i:${i % 4}">${inner}</article>`);
    const head = `<div class="st-things__h">${gi === 0 && o.kick ? kicker(o.kick) : ''}${capDh(g.top.h.text, { size: 'sm', tag: gi === 0 ? 'h2' : 'h3' })}</div>`;
    // a heading with no words of its own needs no glass; three or more paragraphs set in two columns under the heading
    const intro = text.length
      ? `<div class="st-things__intro glass${text.length > 2 ? ' st-things__intro--long' : ''}" data-reveal>${head}<div class="prose st-prose">${bodyHtml(text, s.id)}</div></div>`
      : `<div class="st-things__bare" data-reveal>${head}</div>`;
    const cols = cards.length >= 5 ? 3 : cards.length; // 1-4 cards sit in one row, five or more wrap in threes
    return `<div class="st-things">${intro}${cols ? `<div class="st-things__grid st-things__grid--n${cols}">${cards.join('')}</div>` : ''}</div>`;
  }).join('');
  return band(html, { tone: o.tone, lit: true, spot: true, backdrop: backdrop(o.img || 'wall-mural-wide'), lx: '20%', ly: '10%' });
}

function routeBand(secs, s, o = {}) {
  if (!secs.length) return '';
  const words = secs.map((x, xi) => {
    const lis = x.body.map((b, i) => (b.t === 'li' ? i : -1)).filter((i) => i >= 0);
    const a = lis.length ? lis[0] : x.body.length; const z = lis.length ? lis[lis.length - 1] + 1 : x.body.length;
    const before = x.body.slice(0, a); const steps = x.body.slice(a, z); const after = x.body.slice(z);
    const sub = x.sub ? `<h3 class="st-route__h">${esc(x.h.text)}</h3>` : xi === 0 ? capDh(x.h.text, { size: x.h.text.length > 46 ? 'sm' : 'md' }) : `<h3 class="st-route__h">${esc(x.h.text)}</h3>`;
    return `${sub}${before.length ? `<div class="prose st-prose" data-reveal>${bodyHtml(before, s.id)}</div>` : ''}${steps.length ? `<ol class="st-route${o.cards ? ' st-route--cards' : ''}">${steps.map((b, i) => (b.t === 'li' ? `<li data-reveal style="--i:${i % 6}">${rich(b.html, s.id)}</li>` : `<li class="st-route__note">${bodyHtml([b], s.id)}</li>`)).join('')}</ol>` : ''}${after.length ? `<div class="prose st-prose" data-reveal>${bodyHtml(after, s.id)}</div>` : ''}`;
  }).join('');
  const acts = `<div class="btns" data-reveal>${btn('Get Directions', o.directions || s.directions)}${callBtn(s)}</div>`;
  if (o.map === false) return band(`<div class="st-routeband st-routeband--solo"><div class="st-routeband__words">${words}${acts}</div></div>`, { tone: o.tone });
  return band(`<div class="st-routeband">
  <div class="st-routeband__words">${words}${acts}</div>
  <div class="st-routeband__map">${mapBox(s)}<p class="st-routeband__addr">${bullet(s)}<span><b>${esc(brand.name)}</b>${esc(addr(s))}</span></p></div>
</div>`, { tone: o.tone });
}

function faqBand(F, o = {}) {
  if (!F || !F.items.length) return '';
  return band(`<div class="st-faq">
  <div class="st-faq__head">${kicker(F.kick || '')}${capDh(F.head, { size: F.head.length > 30 ? 'sm' : 'md' })}${F.sub ? `<h3 class="st-faq__sub">${esc(F.sub)}</h3>` : ''}</div>
  <div class="st-faq__list">${faqList(F.items, { openFirst: true })}</div>
</div>`, { tone: o.tone, lit: true, spot: o.tone !== 'mint', id: o.id || null });
}

const storesRow = () => `<div class="st-stores">${stores.map((s) => storeCard(s)).join('')}</div>`;
const mapsRow = () => `<div class="st-maps">${stores.map((s) => `<figure class="st-mapc">${mapBox(s)}<figcaption>${bullet(s)}<span><b>${esc(s.name)}</b><small>${esc(addr(s))}</small></span><a class="btn btn--ghost btn--sm" href="${esc(s.directions)}" target="_blank" rel="noopener"><span>Directions</span>${icon('arrow-ne')}</a></figcaption></figure>`).join('')}</div>`;
function townsGrouped(idp) {
  return `<div class="st-towns">${stores.map((s, i) => {
    const list = towns().filter((t) => t.store === s.id);
    return `<div class="st-towns__grp${s.id === DEFAULT_STORE ? ' st-towns__grp--wide' : ''}">
  <div class="st-towns__head" data-reveal style="--i:${i}">${bullet(s)}<h3 id="${idp}-${s.id}">Nearest store: ${esc(s.name)}</h3><span class="st-towns__n">${list.length} ${list.length === 1 ? 'town' : 'towns'}</span><a class="tlink" href="${href(s.page)}">Store details${icon('arrow')}</a></div>
  <div class="st-areas">${areaGrid(list.map((t) => ({ label: t.name, href: t.path, meta: t.short })))}</div>
</div>`;
  }).join('')}</div>`;
}
const townsBand = (o = {}) => band(`<div class="st-head"><div>${kicker(o.kick || `${towns().length} towns and destinations`)}${dh('Towns', 'We Serve')}</div><p class="lede">Grouped by the store closest to each one, with the drive time from that town's page.</p></div>${townsGrouped(o.idp || 'st-towns')}`, { tone: o.tone || 'ink', id: 'towns' });

// ---------- 1. /location/ ----------
function locationsHub() {
  const c = cap('/location');
  const v = cap('/visit-us');
  const acc = v.modules.find((m) => m.kind === 'accordion');
  const F = partsOf(acc);
  const T = toner();
  const main = [
    pageHero({ kicker: 'Where Ya Shopping?', title: split2(c.h1), img: need('store-mural'), crumbs: CR.location, cls: 'st-hero', sticker: 'Est. 2022',
      ctas: btn('Store locator', '/store-locator/') + btn('Plan your visit', '/visit-us/', { kind: 'ghost' }) }),
    band(`<div class="st-head"><div>${kicker('Three stores')}${dh('Albany, Clifton Park', '& Schenectady', { size: 'md' })}</div><p class="lede">${esc(brand.separateCarts)}</p></div>${storesRow()}`, { tone: T('ink'), sheet: true, after: floatObj('obj-spraycan', { cls: 'st-float', style: 'top:-150px;right:6%;width:min(9vw,120px)', depth: 0.1, sizes: '120px' }) }),
    band(`<div class="st-head">${dh('Get', 'Directions', { size: 'md' })}</div>${mapsRow()}`, { tone: T('night'), lit: true, spot: true }),
    townsBand({ tone: T('ink'), idp: 'loc-towns' }),
    faqBand({ kick: '', head: F.head.text, items: acc.blocks.filter((b) => b.t === 'faq') }, { tone: T('mint') }),
    signUp(),
  ].join('\n');
  return {
    path: '/location/', title: c.title, type: 'locations', crumbs: CR.location, ogImage: og('store-mural'),
    description: c.description || 'Capital District Cannabis & Wellness dispensary locations in Albany (997 Central Ave), Clifton Park (1508 US-9) and Schenectady (1650 Crane St), NY. Hours, directions and the live menu for each store.',
    jsonld: stores.map(storeLd), main,
  };
}

// ---------- 2. the three store pages ----------
function storePage(s) {
  const c = cap(s.page.replace(/\/$/, ''));
  const ms = c.modules;
  const find = (re) => ms.find((m) => m.blocks.some((b) => /^h[1-3]$/.test(b.t) && re.test(b.text)));
  const M = {
    hero: ms.find((m) => m.kind === 'hero'),
    cats: ms.find((m) => m.kind === 'shop-categories'),
    popular: ms.find((m) => m.kind === 'text' && m.blocks.length === 1 && m.blocks[0].t === 'h2'),
    faq: ms.find((m) => m.kind === 'accordion'),
    reviews: ms.find((m) => m.kind === 'slider'),
    deals: find(/Deals/i),
    why: find(/^Why (Shop|Choose)/i),
    glance: find(/^Visit Capital District/i),
    visit: find(/^Visit (Us Today|Our .*Dispensary)$/i),
    long: ms.filter((m) => m.kind === 'text' && m.blocks.length > 3),
  };
  const look = LOOK[s.id]; const T = toner();
  const H = M.hero.blocks;
  const kick = (H.find((b) => b.t === 'p' && b.text.length <= 40) || {}).text || 'Where Ya Shopping?';
  const heroPs = H.filter((b) => b.t === 'p' && b.text.length > 40);
  const heroLis = H.filter((b) => b.t === 'li');
  const capAddr = heroLis.find((b) => /\d{5}/.test(b.text));
  const capPhone = heroLis.find((b) => /\(\d{3}\)/.test(b.text));
  const L = M.long.length ? longform(M.long.flatMap((m) => m.blocks), s, { faqAlways: true }) : { lead: [], prose: [], faq: null, things: [], route: [], visit: [] };

  // hero: captured kicker + H1, live status, address, phone
  const meta = `<span class="st-meta">${statusLine(s)}<a href="${esc(s.directions)}" target="_blank" rel="noopener">${icon('pin')}<span>${esc(capAddr ? capAddr.text : addr(s))}</span></a><a href="tel:${s.tel}">${icon('phone')}<span>${esc(capPhone ? capPhone.text : s.phone)}</span></a></span>`;
  const hero = pageHero({ kicker: kick, title: split2(c.h1), lede: meta, ledeHtml: true, img: need(look.hero), crumbs: CR.store(s), cls: 'st-hero st-ph', sticker: 'Open daily',
    ctas: btn(`Shop ${s.city}`, menuUrl(s.id, 'all')) + btn('Get Directions', s.directions, { kind: 'ghost' }) + callBtn(s, { label: 'Call' }) + setBtn(s) });

  // at a glance: the store photo with its hours on glass, the captured intro + visit words, the map
  const G = M.glance ? partsOf(M.glance) : null;
  // the short "Albany Dispensary Hours | Open Early & Late:" label, not the paragraph that mentions "daily hours"
  const hoursP = G ? G.body.find((b) => b.t === 'p' && /hours/i.test(b.text) && b.text.length <= 70) : null;
  const glanceWords = heroPs.map((b) => `<p>${rich(b.html, s.id)}</p>`).join('') + (G ? `<h3>${esc(G.head.text)}</h3>${bodyHtml(G.body.filter((b) => b.t === 'p' && b !== hoursP), s.id)}` : '');
  const glance = band(`<div class="st-glance">
  <figure class="st-photo" data-reveal="develop">
    ${img(need(s.photo), { alt: s.photoAlt, sizes: '(min-width: 900px) 40vw, 92vw', cls: 'st-photo__img' })}
    <span class="st-photo__tag">${sticker(s.name)}</span>
    <figcaption class="st-hours glass"><p class="st-hours__h">${icon('clock')}<span>${esc(hoursP ? hoursP.text : 'Open daily')}</span></p>${statusLine(s)}${hoursTable(s)}</figcaption>
  </figure>
  <div class="st-glance__body">
    ${dh(s.street, `${s.city}, ${s.region} ${s.zip}`, { size: 'md' })}
    <div class="prose st-prose st-glance__prose" data-reveal>${glanceWords}</div>
    <div class="btns" data-reveal>${G ? G.btns.map((b) => capBtn(b, s, { kind: 'lime' })).join('') : btn('Get Directions', s.directions)}${callBtn(s)}</div>
    ${mapBox(s)}
  </div>
</div>`, { tone: T('ink'), sheet: true, after: floatObj('obj-bud-a', { cls: 'st-float', style: 'top:-118px;right:7%;width:min(15vw,200px)', depth: 0.12, sizes: '200px' }) });

  // shop this store by category (the captured category heading where the page had one)
  const crHead = M.cats ? partsOf(M.cats).head.text : null;
  const crateBand = band(`<div class="band__head"><div>${crHead ? capDh(crHead, { size: 'md' }) : dh(`Shop ${s.city}`, 'by category', { size: 'md' })}<p class="st-note">${icon('pin')}Every sleeve opens the ${esc(s.name)} menu.</p></div><div class="btns">${M.popular ? shopBtn(s, M.popular.blocks[0].text, { kind: 'ghost', target: 'flower' }) : ''}${M.deals ? '' : shopBtn(s, `${s.city} specials`, { kind: 'ghost', target: 'specials' })}${shopBtn(s, `Shop all ${s.city}`)}</div></div>${crate({ store: s.id })}`, { tone: T('night'), lit: true, spot: true });

  // deals (captured, Albany): the mint "lights on" band
  let deals = '';
  if (M.deals) {
    const D = partsOf(M.deals);
    const pic = D.imgs[0] ? mediaImg(D.imgs[0].src, { alt: D.imgs[0].alt, sizes: '380px' }) : img(need(s.photo), { alt: s.photoAlt, sizes: '380px' });
    deals = band(`<div class="st-deals">
  <div class="st-deals__words">${D.kick ? kicker(D.kick) : ''}${capDh(D.head.text, { size: 'md' })}<div class="prose st-prose" data-reveal>${bodyHtml(D.body, s.id)}</div><div class="btns" data-reveal>${D.btns.map((b) => shopBtn(s, b.text, { target: 'specials', kind: 'ink' })).join('')}</div></div>
  <div class="st-print-wrap" data-reveal style="--i:2"><figure class="st-print"><span class="st-print__tape" aria-hidden="true"></span>${pic}<figcaption>${bullet(s)}<span>${esc(s.street)}</span></figcaption><span class="st-print__sticker">${sticker('Specials')}</span></figure></div>
</div>`, { tone: T('mint'), lit: true, lx: '80%', ly: '30%' });
  }

  // why shop / why choose: glass cards when the module is a run of h3 + text, otherwise one glass panel
  let why = '';
  if (M.why) {
    const W = partsOf(M.why);
    const sx = sectionize(M.why.blocks).secs.filter((x) => x.level === 3 && x.body.some((b) => b.t === 'p'));
    const acts = `<div class="btns" data-reveal>${W.btns.map((b) => capBtn(b, s)).join('')}</div>`;
    if (sx.length >= 2) {
      why = band(`<div class="st-head"><div>${W.kick ? kicker(W.kick) : ''}${capDh(W.head.text, { size: 'md' })}</div>${acts}</div>
<div class="st-cards">${sx.map((x, i) => `<article class="gcard glass" data-tilt data-reveal style="--i:${i}"><span class="gcard__ic">${icon(['bag', 'star', 'spark'][i % 3])}</span><h3 class="gcard__t">${esc(x.h.text)}</h3>${bodyHtml(x.body, s.id)}</article>`).join('')}</div>`, { tone: T('night'), lit: true, spot: true, backdrop: backdrop(look.why) });
    } else {
      why = band(`<div class="st-panel glass" data-reveal>${W.kick ? kicker(W.kick) : ''}${capDh(W.head.text, { size: 'md' })}<div class="prose st-prose">${bodyHtml(W.body, s.id)}</div>${acts}</div>`, { tone: T('slate'), lit: true, spot: true, backdrop: backdrop(look.why), lx: '75%', ly: '40%' });
    }
  }

  // the long captured text (discover / explore / things to do / getting here)
  const reader = readerBand(L, s, { tone: T('ink') });
  const things = thingsBand(L.things, s, { tone: T('night'), img: look.things });
  const route = routeBand(L.route, s, { tone: T('slate'), map: false, cards: true });

  // reviews (captured)
  let reviews = '';
  if (M.reviews) {
    const R = partsOf(M.reviews);
    reviews = band(`<div class="st-head">${capDh(R.head.text, { size: 'md' })}${R.btns.map((b) => btn(b.text, b.href, { kind: 'ghost' })).join('')}</div>${shoutouts(M.reviews.blocks.filter((b) => b.t === 'review'))}`, { tone: T('night'), lit: true });
  }

  // FAQs: the accordion, plus any question the long text asks that the accordion does not
  const F = partsOf(M.faq);
  const norm = (q) => q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const items = M.faq.blocks.filter((b) => b.t === 'faq').map((f) => ({ q: f.q, a: f.a, html: pre(f.html, s.id) }));
  const seen = new Set(items.map((f) => norm(f.q)));
  for (const f of (L.faq ? L.faq.items : [])) if (!seen.has(norm(f.q))) { items.push(f); seen.add(norm(f.q)); }
  const faq = faqBand({ kick: F.kick, head: F.head.text, sub: L.faq && L.faq.head ? L.faq.head.h.text : '', items }, { tone: T(M.deals ? 'ink' : 'mint') });

  // visit us today: the captured closing block on glass over a photo
  const V = partsOf(M.visit);
  const label = V.body.find((b) => b.t === 'p' && /^open daily/i.test(b.text));
  const findP = V.body.find((b) => b.t === 'p' && /^find us at/i.test(b.text));
  const vWords = V.body.filter((b) => b.t === 'p' && b !== label && b !== findP);
  const vActs = V.btns.length ? V.btns.map((b) => capBtn(b, s, { kind: /directions/i.test(b.text) ? 'ghost' : 'lime' })).join('') : btn('Get Directions', s.directions, { kind: 'ghost' }) + shopBtn(s, `Shop ${s.city}`);
  const visit = band(`<div class="st-visit glass" data-reveal>
  <div class="st-visit__words">${kicker(V.kick)}${capDh(V.head.text, { size: 'md' })}<div class="prose st-prose">${bodyHtml(vWords, s.id)}${L.visit.map((x) => `<h3>${esc(x.h.text)}</h3>${bodyHtml(x.body, s.id)}`).join('')}</div></div>
  <div class="st-visit__facts">${findP ? `<p class="st-visit__find">${icon('pin')}<span>${rich(findP.html, s.id)}</span></p>` : ''}${label ? `<p class="st-visit__label">${icon('clock')}<span>${esc(label.text)}</span></p>` : ''}<ul class="st-visit__hours">${V.body.filter((b) => b.t === 'li').map((b) => `<li>${esc(b.text)}</li>`).join('')}</ul>${statusLine(s)}<div class="btns">${vActs}</div></div>
</div>`, { tone: T('night'), lit: true, backdrop: backdrop(look.visit), lx: '30%', ly: '20%' });

  // nearby towns, the other two stores, licence
  const mine = towns().filter((t) => t.store === s.id);
  const near = band(`<div class="st-head"><div>${kicker(`Served by ${s.name}`)}${dh('Towns', 'We Serve', { size: 'md' })}</div>${btn(`All ${towns().length} towns`, '/visit-us/#towns', { kind: 'ghost' })}</div><div class="st-areas">${areaGrid(mine.map((t) => ({ label: t.name, href: t.path, meta: t.short })))}</div>`, { tone: T('ink'), sheet: true });
  const others = band(`<div class="st-head">${dh('Our Other', 'Stores', { size: 'md' })}</div><div class="st-stores st-stores--two">${stores.filter((x) => x.id !== s.id).map((x) => storeCard(x)).join('')}</div>${licStrip(s)}`, { tone: T('slate') });

  return {
    path: s.page, title: c.title, description: c.description, type: 'store', crumbs: CR.store(s), ogImage: og(s.photo),
    jsonld: [storeLd(s), faqLd(items)],
    main: [hero, glance, crateBand, deals, why, reader, things, route, reviews, faq, visit, near, others, signUp()].filter(Boolean).join('\n'),
  };
}

// ---------- 3. /store-locator/ ----------
function locatorPage() {
  const c = cap('/store-locator');
  const ban = c.modules.find((m) => m.kind === 'store-locator-banner');
  const kick = (ban.blocks.find((b) => b.t === 'p') || {}).text || '';
  const T = toner();
  const storeRows = stores.map((s, i) => `<li class="st-res st-res--store" data-town="${esc(`${s.name} ${s.city} ${s.street} ${s.zip}`)}" data-reveal style="--i:${i}">
    <div class="st-res__top">${bullet(s)}<div><h3 class="st-res__name">${esc(s.name)}</h3>${statusLine(s)}</div></div>
    <p class="st-res__addr">${icon('pin')}<span>${esc(addr(s))}</span></p>
    <p class="st-res__acts">${shopBtn(s, `Shop ${s.city}`, { size: 'sm' })}<a class="btn btn--ghost btn--sm" href="${href(s.page)}"><span>Store details</span>${icon('arrow')}</a></p>
  </li>`).join('');
  const townRows = towns().map((t, i) => { const s = storeById(t.store); return `<li data-town="${esc(`${t.name} ${s.city} ${s.zip}`)}" data-reveal style="--i:${i % 6}"><a class="st-res st-res--town" href="${href(t.path)}">
    <span class="st-res__name">${esc(t.name)}</span>
    <span class="st-res__near">${bullet(s)}<span>Nearest store: <b>${esc(s.name)}</b></span></span>
    <span class="st-res__drive">${esc(t.drive)}</span>
    <span class="st-res__go">Town guide${icon('arrow')}</span></a></li>`; }).join('');
  const main = [
    pageHero({ kicker: kick, title: split2(c.h1), img: need('alley'), crumbs: CR.locator, cls: 'st-hero',
      ctas: btn('All locations', '/location/') + btn('Plan your visit', '/visit-us/', { kind: 'ghost' }) }),
    band(`<div class="st-loc">
  <div class="st-loc__search" data-locator="st-results"><label class="field"><span>Town or ZIP</span><input type="search" placeholder="Try Troy, Saratoga Springs or 12065" autocomplete="off" aria-describedby="st-loc-hint"></label></div>
  <p class="st-loc__hint" id="st-loc-hint">${stores.length} stores and ${towns().length} towns and destinations. Each town shows its nearest store and the drive from that town's page.</p>
  <p class="st-loc__empty" data-locator-empty hidden role="status">No match yet. Try a town name or a store ZIP (12205, 12065, 12303), or see <a href="${href('/location/')}">all locations</a>.</p>
  <ul class="st-results" id="st-results">${storeRows}${townRows}</ul>
</div>`, { tone: T('ink'), sheet: true, after: floatObj('obj-bud-a', { cls: 'st-float', style: 'top:-120px;right:6%;width:min(14vw,190px)', depth: 0.12, sizes: '190px' }) }),
    band(`<div class="st-head">${dh('Get', 'Directions', { size: 'md' })}</div>${mapsRow()}`, { tone: T('night'), lit: true, spot: true }),
    signUp(),
  ].join('\n');
  return {
    path: '/store-locator/', title: c.title, type: 'locator', crumbs: CR.locator, ogImage: og('store-mural'),
    description: c.description || 'Find the Capital District Cannabis & Wellness store closest to you: search 40 Capital Region towns and destinations, then shop Albany, Clifton Park or Schenectady.',
    jsonld: stores.map(storeLd), main,
  };
}

// ---------- 4. /visit-us/ ----------
function visitHub() {
  const c = cap('/visit-us');
  const acc = c.modules.find((m) => m.kind === 'accordion');
  const F = partsOf(acc);
  const faqs = acc.blocks.filter((b) => b.t === 'faq');
  const storeFaq = cap('/location/albany').modules.find((m) => m.kind === 'accordion').blocks.filter((b) => b.t === 'faq');
  // card text: one captured sentence each (the same answers appear in full in the FAQ below)
  const sentence = (list, qre, sre) => { const f = list.find((x) => qre.test(x.q)); const s = f ? f.a.split(/(?<=[.!?])\s+/).find((x) => sre.test(x)) : null; if (!s) throw new Error('stores: no captured sentence for ' + qre); return s.trim(); };
  const pay = sentence(storeFaq, /payment/i, /Dutchie Pay/);
  if (!pay.includes(brand.payment)) throw new Error('stores: payment sentence no longer matches brand.payment');
  const cards = [
    { icon: 'id', title: 'What to bring', text: sentence(faqs, /\bID\b/, /government-issued ID/) },
    { icon: 'cash', title: 'How to pay', text: pay },
    { icon: 'bag', title: 'Order ahead', text: sentence(faqs, /online order/i, /pre-order/i) },
    { icon: 'leaf', title: 'Know the limits', text: sentence(storeFaq, /How much/i, /three ounces/) },
    { icon: 'gift', title: 'Rewards everywhere', text: sentence(faqs, /loyalty|rewards/i, /earn and redeem/) },
  ];
  const T = toner();
  const main = [
    pageHero({ kicker: 'Plan your visit', title: split2(c.h1), img: need('m-2025-08-image-1'), crumbs: CR.visit, cls: 'st-hero',
      ctas: btn('Find your store', '#stores') + btn('Towns we serve', '#towns', { kind: 'ghost' }) }),
    band(`<div class="st-head"><div>${kicker('Before you go')}${dh('Plan Your', 'Visit', { size: 'md' })}</div>${btn('Order ahead and pickup', '/pickup/', { kind: 'ghost' })}</div><div class="st-plan">${cards.map((x, i) => glassCard({ ...x, i })).join('')}</div>`, { tone: T('night'), sheet: true, lit: true, spot: true, backdrop: backdrop('wall-mural-wide'), after: floatObj('obj-boombox', { cls: 'st-float', style: 'top:-96px;right:5%;width:min(17vw,230px)', depth: 0.1, sizes: '230px' }) }),
    band(`<div class="st-head"><div>${kicker('Where Ya Shopping?')}${dh('Three', 'Stores', { size: 'md' })}</div><p class="lede">${esc(brand.separateCarts)}</p></div>${storesRow()}`, { tone: T('ink'), id: 'stores' }),
    townsBand({ tone: T('night'), idp: 'visit-towns' }),
    faqBand({ kick: 'Visit Us', head: F.head.text, items: faqs }, { tone: T('mint') }),
    signUp(),
  ].join('\n');
  return {
    path: '/visit-us/', title: c.title, type: 'visit', crumbs: CR.visit, ogImage: og('store-mural'),
    description: c.description || 'Plan your visit to Capital District Cannabis & Wellness in Albany, Clifton Park or Schenectady, NY: what to bring, how to pay, the 40 towns we serve and answers to common questions.',
    jsonld: [faqLd(faqs)], main,
  };
}

// ---------- 5. /visit-us/<town>/ x 40 ----------
function townPage(t) {
  const s = storeById(t.store); const p = t.cap; const look = LOOK[s.id];
  const ms = p.modules; const T = toner();
  const fifty = ms.filter((m) => m.kind === '5050');
  const whyM = fifty[0]; const cardM = fifty.length > 1 ? fifty[fifty.length - 1] : null;
  const revM = ms.find((m) => m.kind === 'slider');
  const longM = ms.find((m) => m.kind === 'text');
  const catsM = ms.find((m) => m.kind === 'shop-categories');
  const L = longM ? longform(longM.blocks, s) : { lead: [], prose: [], faq: null, things: [], route: [], visit: [] };
  const crumbs = CR.town(t);

  const hero = pageHero({ kicker: t.kick, title: split2(t.h1), lede: rich(t.lede.html, s.id), ledeHtml: true, img: need(look.hero), crumbs, cls: 'st-hero st-ph st-ph--long',
    ctas: shopBtn(s, 'Order Ahead') + (t.dir ? btn('Get Directions', t.dir, { kind: 'ghost' }) : '') });

  const crateBand = band(`<div class="band__head"><div>${catsM ? capDh(partsOf(catsM).head.text, { size: 'md' }) : dh('Shop By', 'Category', { size: 'md' })}<p class="st-note">${icon('pin')}Every sleeve opens the ${esc(s.name)} menu.</p></div>${shopBtn(s, `Shop all ${s.city}`, { kind: 'ghost' })}</div>${crate({ store: s.id })}`,
    { tone: T('ink'), sheet: true, after: floatObj('obj-bud-b', { cls: 'st-float', style: 'top:-128px;right:6%;width:min(9vw,130px)', depth: 0.12, sizes: '130px' }) });

  let why = '';
  if (whyM) {
    const W = partsOf(whyM);
    const media = `<figure class="st-frame">${img(need(look.town), { alt: look.townAlt, sizes: '(min-width: 860px) 45vw, 92vw', cls: 'st-frame__img' })}<span class="st-frame__tag">${bullet(s)}<span>${esc(s.name)}</span></span></figure>`;
    const body = `${W.kick ? kicker(W.kick) : ''}${W.head ? capDh(W.head.text, { size: 'md' }) : ''}<div class="prose st-prose">${bodyHtml([...W.pre, ...W.body], s.id)}</div><div class="btns">${W.btns.map((b) => capBtn(b, s)).join('')}</div>`;
    why = band(`<div class="split st-why"><div class="split__media" data-reveal="develop">${media}</div><div class="split__body" data-reveal>${body}</div></div>`, { tone: T('night'), lit: true, spot: true });
  }

  let reviews = '';
  if (revM) {
    const R = partsOf(revM);
    reviews = band(`<div class="st-head">${R.head ? capDh(R.head.text, { size: 'md' }) : ''}${R.btns.map((b) => btn(b.text, b.href, { kind: 'ghost' })).join('')}</div>${shoutouts(revM.blocks.filter((b) => b.t === 'review'))}`, { tone: T('slate') });
  }

  const reader = readerBand(L, s, { tone: T('ink'), passLabel: 'Order Ahead' });
  const faq = L.faq ? faqBand({ kick: '', head: L.faq.head ? L.faq.head.h.text : 'Any Questions? We\'ve Got Answers', items: L.faq.items }, { tone: T('mint') }) : '';
  const things = thingsBand(L.things, s, { tone: T('night'), img: look.things });
  const route = routeBand(L.route, s, { tone: T('slate'), directions: t.dir || s.directions });

  // the nearest store: the captured "near me" block (its words, its name / address / phone plate) beside the store card
  // (photo, live status, hours). A plate line that names another store's address or phone is a live-page error
  // (SUNY Albany's address, Glenville's phone): it is replaced with this store's own fact and listed in the report.
  const C = cardM ? partsOf(cardM) : null;
  const fixLine = (txt) => {
    if (/^\(\d{3}\) \d{3}-\d{4}$/.test(txt.trim()) && txt.trim() !== s.phone) return s.phone;
    const sig = STORE_SIG.find(([, a]) => a.test(txt));
    return sig && sig[0] !== s.id ? addr(s) : txt;
  };
  const plate = C ? C.body.filter((b) => b.t === 'p' && b.text.length <= 60) : [];
  const cWords = C ? C.body.filter((b) => !(b.t === 'p' && b.text.length <= 60)) : [];
  const near = band(`<div class="st-near">
  <div class="st-near__words" data-reveal>${C ? kicker(C.kick) : ''}${C && C.head ? capDh(C.head.text, { size: 'md' }) : dh('Your', 'Nearest Store', { size: 'md' })}${cWords.length ? `<div class="prose st-prose">${bodyHtml(cWords, s.id)}</div>` : ''}${plate.length ? `<p class="st-plate">${bullet(s)}<span>${plate.map((b, i) => (i === 0 ? `<b>${esc(fixLine(b.text))}</b>` : `<span>${esc(fixLine(b.text))}</span>`)).join('')}</span></p>` : ''}${L.visit.map((x) => `<h3 class="st-near__h">${esc(x.h.text)}</h3><div class="prose st-prose">${bodyHtml(x.body, s.id)}</div>`).join('')}<div class="btns">${C ? C.btns.map((b) => capBtn(b, s, { kind: 'ghost' })).join('') : ''}${shopBtn(s, 'Order Ahead')}</div></div>
  <div class="st-near__card">${storeCard(s)}</div>
</div>`, { tone: T('ink'), sheet: true });

  const others = towns().filter((x) => x.store === s.id && x !== t).sort((a, b) => a.mins - b.mins).slice(0, 6);
  const more = band(`<div class="st-head"><div>${kicker(`Also served by ${s.name}`)}${dh('Towns', 'We Serve', { size: 'md' })}</div>${btn(`All ${towns().length} towns`, '/visit-us/#towns', { kind: 'ghost' })}</div>${others.length ? `<div class="st-areas">${areaGrid(others.map((x) => ({ label: x.name, href: x.path, meta: x.short })))}</div>` : ''}`, { tone: T('night') });

  return {
    path: t.path, title: p.title, description: p.description || t.lede.text, type: 'town', crumbs, ogImage: og(look.town),
    jsonld: [storeLd(s)],
    main: [hero, crateBand, why, reviews, reader, faq, things, route, near, more, signUp()].filter(Boolean).join('\n'),
  };
}

// ---------- breadcrumbs ----------
const HOME = { label: 'Home', href: '/' };
const CR = {
  location: [HOME, { label: 'Locations', href: '/location/' }],
  locator: [HOME, { label: 'Locations', href: '/location/' }, { label: 'Store Locator', href: '/store-locator/' }],
  visit: [HOME, { label: 'Visit Us', href: '/visit-us/' }],
  store: (s) => [HOME, { label: 'Locations', href: '/location/' }, { label: s.name, href: s.page }],
  town: (t) => [HOME, { label: 'Visit Us', href: '/visit-us/' }, { label: t.name, href: t.path }],
};

export function pages() {
  return [
    locationsHub(),
    ...stores.map(storePage),
    locatorPage(),
    { path: '/find-a-dispensary/', redirect: '/store-locator/', title: cap('/find-a-dispensary').title },
    { path: '/albany/', redirect: '/location/albany/', title: cap('/albany').title },
    visitHub(),
    ...towns().map(townPage),
  ];
}
