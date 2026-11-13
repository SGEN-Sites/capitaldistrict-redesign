// stores.mjs: the STORES lane. /location/ (hub), the three store pages, /store-locator/, /visit-us/, the 40
// /visit-us/<town>/ pages and two redirects. Existing pages keep every captured word (src/lib/capture.mjs): this file
// only chooses order and layout. New words are UI labels (buttons, small headings), the three meta descriptions the
// live pages never had, and the five card titles on /visit-us/ (each card quotes a captured sentence).
import {
  pageHero, band, dh, fitEm, kicker, btn, sticker, storeCard, hoursTable, mapEmbed, crate, floatObj, faqList, faqSection,
  glassCard, richHtml, signUp, areaGrid, bullet, statusLine, storeName, esc, href, img, imgInfo, mediaImg, icon,
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
// a display line never ends on a lone short word ("NY", "Mall?", "Ann?": four letters or fewer, its punctuation aside,
// the text-overflow audit's rule): the last word is held to the one before it with a no-break space
const holdLast = (t) => String(t).replace(/\s+(?=[\p{L}\p{N}]{1,4}[^\p{L}\p{N}\s]*$)/u, '\u00a0');
const hold2 = ([a, b]) => [holdLast(a), b ? holdLast(b) : b];
// the em width of the widest run a heading cannot break (a word, or words held together), measured as parts.mjs fitEm
// measures one word: an apostrophe (.22em) stands in for the no-break space (.215em). Rendered, it runs 3-6% under.
const runEm = (...ts) => Math.max(0, ...ts.flatMap((t) => String(t || '').split(/[ \t\n]+/)).filter(Boolean).map((r) => fitEm(r.replace(/\u00a0/g, "'"))));
// phones: a heading whose widest held run ("SCHUYLERVILLE, NY") would be wider than the column at its size gives way
// (st-u, stores.css: the size is capped at the column over --u). It tags the first display heading in `html` (a dh()
// heading, or the one inside a shared section such as faqSection); the variable joins any style dh() already set.
function phoneFit(html, a, b) {
  const u = runEm(a, b);
  const at = String(html).search(/<h\d class="dh /);
  if (u < 9 || at < 0) return html;
  const tag = html.slice(at, html.indexOf('>', at) + 1);
  let t = tag.replace(/^<(h\d) class="dh /, '<$1 class="dh st-u ');
  t = /\bstyle="/.test(t) ? t.replace(/\bstyle="/, `style="--u:${u};`) : t.replace(/^<(h\d)\b/, `<$1 style="--u:${u}"`);
  return html.slice(0, at) + t + html.slice(at + tag.length);
}
function capDh(text, o = {}) {
  const t = String(text).trim();
  const [a, b] = hold2(split2(t));
  return phoneFit(dh(a, b, { ...o, size: o.size || (t.length > 46 ? 'sm' : t.length > 26 ? 'md' : 'lg') }), a, b);
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
// a highway's name never breaks at its hyphen ("I- / 87" on phones): I-87, US-9, NY-5 E... are held in a no-wrap span
// (st-nb, stores.css), in the text between tags only; the words stay as captured
const HWY = /\b(?:I|US|NY|SR)-\d+[A-Z]?\b/g;
const nbHwy = (html) => String(html).split(/(<[^>]*>)/).map((x) => (x.startsWith('<') ? x : x.replace(HWY, '<span class="st-nb">$&</span>'))).join('');
const rich = (html, sid) => richHtml(nbHwy(pre(html, sid)));
// a run of captured blocks as HTML: p and li keep their captured rich HTML, headings become h3 (raw: FAQ answers,
// which faqList passes through richHtml itself)
function bodyHtml(blocks, sid, raw = false) {
  const one = (b) => (b.html != null ? (raw ? nbHwy(pre(b.html, sid)) : rich(b.html, sid)) : nbHwy(esc(b.text)));
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
  <div class="st-pass__top">${bullet(s)}<div><p class="st-pass__name">${storeName(s)}</p>${statusLine(s)}</div></div>
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
  // the heading runs across the row (two lines, not four stacked in a narrow aside). A short text sits beside the store
  // pass in a tight band; a long one (900 characters or more) runs in two columns under the heading, the pass beside the
  // heading (st-read, st-read--long in stores.css)
  const short = main.replace(/<[^>]+>/g, '').length < 900;
  return band(`<div class="st-read${short ? '' : ' st-read--long'}">
  <div class="st-read__head fitcol">${kicker(kick ? kick.text : '')}${capDh(first.h.text, { size: first.h.text.length > 46 ? 'sm' : 'md', fit: true })}</div>
  <div class="prose st-prose st-read__main" data-reveal>${main}</div>
  ${o.pass === false ? '' : `<aside class="st-read__aside">${passCard(s, o.passLabel)}</aside>`}
</div>`, { tone: o.tone, tight: short });
}

const isItem = (b) => b.t === 'li' || (b.t === 'p' && /^\s*(?:<a [^>]*>\s*)?<(?:b|strong)>/i.test(b.html || ''));

// ---------- things to do, told as a story (the store pages) ----------
// A store page's "things to do" text, place by place: on wide screens a sticky photo stage beside the chapters
// (src/scripts/story.js), on phones and without JS a photo card per chapter (src/styles/story.css). The captured words
// are cut, never changed: a chapter opens at the first sentence that names its place (`at`, as captured: Albany's
// paragraphs name two places each) or at its captured sub-heading (`sub`), and the build checks that the chapters
// joined are the captured text (fail closed). Each place photo is a real photograph of that place from Wikimedia
// Commons (registry "pl-*" with author, licence and source, credited under the photo; docs/MEDIA.md). A place with no
// free photo gets a map-pin card and its name only (img: ''). The closing chapter is the store on the client's own
// photo: `store` is its caption as the text writes it, or true when the text has no "stop by" words (then the store's
// street). Captured sub-headings after the story (`posts`) become photo postcards. A page whose text does not match its
// entry (every town page) keeps the cards in thingsBand.
const STORY = {
  albany: {
    head: /^Things to Do Near Capital District Cannabis & Wellness in Albany$/,
    chapters: [
      { at: 'Washington Park', img: 'pl-washington-park' },
      { at: 'Albany Pine Bush Preserve', img: 'pl-pine-bush' },
      { at: 'New York State Capitol and Empire State Plaza', img: 'pl-capitol-plaza' },
      { at: 'New York State Museum', img: 'pl-state-museum', pos: '42% 50%' },
      { at: 'Colonie Center', img: 'pl-colonie-center', pos: '78% 50%' },
      { at: 'Crossgates Mall', img: 'pl-crossgates', pos: '46% 50%' },
      { at: 'stop by', store: '997 Central Avenue' },
    ],
    posts: [{ sub: /University at Albany/, img: 'pl-ualbany' }, { sub: /Albany International Airport/, img: 'pl-alb-airport' }],
  },
  schenectady: {
    head: /^What Is Our Weed Dispensary Near\?$/,
    chapters: [
      { sub: /^Proctors Theatre\b/, img: 'pl-proctors' },
      { sub: /^Central Park Rose Garden\b/, img: '' },
      { sub: /^The Edison Downtown\b/, img: '' },
      { sub: /^Museum of Innovation and Science\b/, img: 'pl-misci', pos: '44% 50%' },
      { store: true },
    ],
    posts: [],
  },
};
const STAGE_SIZES = '(min-width: 1280px) 720px, 58vw';
const CARD_SIZES = '(min-width: 760px) 46vw, 92vw';
const plainOf = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;/g, '’').replace(/\s+/g, ' ').trim();
// a captured paragraph's HTML cut where one sentence ends and the next begins (a capital, a quote or a link)
const sentencesOf = (h) => String(h).trim().split(/(?<=[.!?])\s+(?=[A-Z“"<])/);
// (a display line never ends on a lone short word: holdLast, beside capDh above, also holds "Mall", "Ave" and "Near?")
// the credit under a Commons photo: author (to the file page), licence (to its deed), source
function storyCredit(id, tag = 'p') {
  const r = imgInfo(need(id));
  if (!r.photo || !r.credit || !r.license || !r.source) throw new Error('stores: no credit or licence for ' + id);
  const lic = /^public domain$/i.test(r.license) ? 'public domain' : `<a href="${esc(r.licenseUrl)}" target="_blank" rel="license noopener">${esc(r.license)}</a>`;
  return `<${tag} class="story-credit">Photo: <a href="${esc(r.source)}" target="_blank" rel="noopener">${esc(r.credit)}</a>, ${lic}, via Wikimedia Commons</${tag}>`;
}
const storyPin = () => '<span class="story-pin" aria-hidden="true"><span class="story-pin__mark">' + icon('pin') + '</span></span>';
// the chapters of a store page's things text, or null when the page has no story entry or its text does not match it
function storyOf(secs, s) {
  const cfg = STORY[s.id]; const top = secs[0];
  if (!cfg || !top || top.sub || !cfg.head.test(top.h.text.trim()) || secs.slice(1).some((x) => !x.sub)) return null;
  const fail = (m) => { throw new Error(`stores: things story (${s.id}): ${m}`); };
  // 1. the heading's own paragraphs: the intro, then a chapter at the first sentence naming each `at`
  const ats = cfg.chapters.filter((c) => c.at); const atCh = []; const intro = []; let into = intro;
  for (const b of top.body) {
    if (b.t !== 'p' || b.html == null) fail(`a ${b.t} block in the text`);
    let run = null;
    for (const sen of sentencesOf(b.html)) {
      const c = ats[atCh.length];
      if (c && plainOf(sen).includes(c.at)) { const ch = { ...c, paras: [] }; atCh.push(ch); into = ch.paras; run = null; }
      if (!run) { run = []; into.push(run); }
      run.push(sen);
    }
  }
  if (atCh.length < ats.length) fail(`"${ats[atCh.length].at}" is not in the text`);
  const cut = [intro, ...atCh.map((c) => c.paras)].flat().map((r) => r.join(' ')).join(' ');
  if (plainOf(cut) !== plainOf(top.body.map((b) => b.html).join(' '))) fail('the chapters do not add up to the captured text');
  // 2. the captured sub-headings: chapters in captured order, then postcards; none may be left over
  const subs = secs.slice(1); const used = new Set(); let lastSub = -1; let atI = 0;
  const claim = (re) => { const i = subs.findIndex((x, xi) => !used.has(xi) && re.test(x.h.text.trim())); if (i < 0) fail('no sub-heading matches ' + re); used.add(i); return i; };
  const list = cfg.chapters.map((c) => {
    const pic = c.store ? s.photo : c.img;
    if (c.at) {
      const ch = atCh[atI++]; const name = c.store || c.at;
      if (!plainOf(ch.paras.flat().join(' ')).includes(name)) fail(`"${name}" is not in its chapter`);
      return { ...ch, name, pic, titleHtml: `<span class="story-ch__name">${esc(holdLast(name))}</span>`, html: ch.paras.map((r) => `<p>${rich(r.join(' '), s.id)}</p>`).join('') };
    }
    if (c.sub) {
      const i = claim(c.sub); if (i < lastSub) fail('chapters out of captured order'); lastSub = i;
      const t = subs[i].h.text.trim(); const m = t.match(/^(.+?)(: | – | - )(.+)$/);
      const titleHtml = m ? `<span class="story-ch__name">${esc(holdLast(m[1]))}</span><span class="sr">${esc(m[2])}</span><span class="story-ch__tag">${esc(holdLast(m[3]))}</span>` : `<span class="story-ch__name">${esc(holdLast(t))}</span>`;
      return { ...c, name: m ? m[1] : t, pic, titleHtml, html: bodyHtml(subs[i].body, s.id) };
    }
    if (c.store !== true) fail('a chapter with neither at, sub nor store');
    return { ...c, name: s.street, pic, titleHtml: `<span class="story-ch__name">${esc(holdLast(s.street))}</span>`, html: '' };
  });
  const posts = cfg.posts.map((p) => { const i = claim(p.sub); if (i < lastSub) fail('postcards out of captured order'); return { ...p, title: subs[i].h.text.trim(), body: subs[i].body }; });
  if (used.size !== subs.length) fail('a captured sub-heading has no place in the story');
  list.forEach((c, i) => { c.no = c.store ? s.letter : String(i + 1).padStart(2, '0'); c.credit = c.pic && !c.store ? storyCredit(c.pic) : ''; });
  return { top, intro, list, posts };
}
function storyBand(secs, s, o = {}) {
  const st = storyOf(secs, s);
  if (!st) return null;
  const n = st.list.length; const hid = `story-${s.id}-h`;
  const art = (c, sizes, cls, deco) => (c.pic ? img(need(c.pic), { decorative: deco, alt: c.store ? s.photoAlt : undefined, sizes, cls, style: c.pos ? `object-position:${c.pos}` : null }) : storyPin());
  const [ha, hb] = hold2(split2(st.top.h.text)); // the captured heading in its white and lime halves, as capDh cuts it
  // the heading is sized to its column and kept within three lines (fit). A long one (Albany's, 64 characters) runs
  // across the band with the intro under it; a short one keeps the intro beside it on wide screens, where the two end
  // level (story.css)
  const long = fitEm(ha, hb) > 18;
  const head = `<div class="story-head${long ? ' story-head--long' : ''}"><div class="story-head__h fitcol">${dh(ha, hb, { size: 'md', id: hid, fit: true })}</div>${st.intro.length ? `<div class="story-intro" data-reveal>${st.intro.map((r) => `<p>${rich(r.join(' '), s.id)}</p>`).join('')}</div>` : ''}</div>`;
  const chapter = (c, i) => {
    const id = `story-${s.id}-${i + 1}`;
    const no = c.store ? bullet(s) : `<span>${c.no}</span><span class="story-ch__of">/ ${String(n).padStart(2, '0')}</span>`;
    const visit = c.store ? `<p class="story-store"><b>${storeName(s)}</b>${statusLine(s)}</p><div class="btns">${shopBtn(s, `Shop ${s.city}`)}${btn('Get Directions', s.directions, { kind: 'ghost' })}</div>` : '';
    return `<li class="story-ch${c.store ? ' story-ch--store' : ''}${c.pic ? '' : ' story-ch--pin'}" id="${id}" data-story-ch data-no="${esc(c.no)}" data-name="${esc(holdLast(c.name))}"${c.store ? ' data-store' : ''}>
  <div class="story-ch__pic">
    <div class="story-ch__head"><div class="story-ch__media" data-reveal="develop">${art(c, CARD_SIZES, 'story-ch__img', false)}</div><div class="story-ch__cap" data-reveal><p class="story-ch__no" aria-hidden="true">${no}</p><h3 class="story-ch__t" id="${id}-t">${c.titleHtml}</h3></div></div>
    ${c.credit}
  </div>
  <div class="story-ch__body" data-reveal>${c.html}${visit}</div>
</li>`;
  };
  const stage = `<div class="story-stage" data-story-stage>
  <div class="story-stage__frame" aria-hidden="true">${st.list.map((c, i) => `<div class="story-stage__shot${i === 0 ? ' is-on is-near' : i < 3 ? ' is-near' : ''}${c.pic ? '' : ' story-stage__shot--pin'}" data-shot>${art(c, STAGE_SIZES, 'story-stage__img', true)}</div>`).join('')}<span class="story-stage__shade"></span><span class="story-stage__bars">${st.list.map(() => '<i data-bar></i>').join('')}</span><p class="story-stage__cap"><span class="story-stage__no" data-story-no>${esc(st.list[0].no)}</span><span class="story-stage__name" data-story-name>${esc(holdLast(st.list[0].name))}</span></p></div>
  <div class="story-stage__credit" data-story-credit>${st.list[0].credit}</div>
</div>`;
  const posts = st.posts.length ? `<div class="story-posts">${st.posts.map((p, i) => `<article class="story-post" data-reveal style="--i:${i}"><figure class="story-post__fig"><div class="story-post__media">${img(need(p.img), { sizes: '(min-width: 900px) 40vw, 92vw', cls: 'story-post__img' })}</div>${storyCredit(p.img, 'figcaption')}</figure><h3 class="story-post__t">${esc(holdLast(p.title))}</h3><div class="story-post__body">${bodyHtml(p.body, s.id)}</div></article>`).join('')}</div>` : '';
  return band(`<div class="story" data-story>${head}<div class="story-grid"><ol class="story-chs">${st.list.map(chapter).join('')}</ol>${stage}</div>${posts}</div>`,
    { tone: o.tone, lit: true, spot: true, backdrop: backdrop(o.img || 'wall-mural-wide'), lx: '20%', ly: '10%', cls: 'story-band', labelledby: hid });
}

function thingsBand(secs, s, o = {}) {
  if (!secs.length) return '';
  const story = storyBand(secs, s, o); // the store pages (null everywhere else: the cards below)
  if (story) return story;
  const groups = [];
  for (const x of secs) { if (!x.sub || !groups.length) groups.push({ top: x, subs: [] }); else groups[groups.length - 1].subs.push(x); }
  const html = groups.map((g, gi) => {
    const items = g.top.body.filter(isItem); const text = g.top.body.filter((b) => !isItem(b));
    const cards = [
      ...items.map((b) => `<p>${rich(b.html, s.id)}</p>`),
      ...g.subs.map((x) => `<h3 class="st-tip__t">${esc(x.h.text)}</h3>${bodyHtml(x.body, s.id)}`),
    ].map((inner, i) => `<article class="st-tip glass" data-tilt data-reveal style="--i:${i % 4}">${inner}</article>`);
    // the heading is sized to its column and kept within three lines (a .fitcol and dh fit)
    const head = `<div class="st-things__h fitcol">${gi === 0 && o.kick ? kicker(o.kick) : ''}${capDh(g.top.h.text, { size: 'sm', tag: gi === 0 ? 'h2' : 'h3', fit: true })}</div>`;
    // a heading with no words of its own needs no glass. One short paragraph (250 characters or fewer) sits beside the
    // heading, the two ending level; a longer text runs under a heading that crosses the card, in two balanced columns
    // (st-things__intro--side / --stack in stores.css). Beside a long text the heading stacked six lines in a narrow
    // column, and beside a short one it stood taller than the words.
    const chars = text.map((b) => b.text || '').join(' ').length;
    const side = text.length === 1 && chars <= 250;
    const intro = text.length
      ? `<div class="st-things__intro glass st-things__intro--${side ? 'side' : 'stack'}" data-reveal>${head}<div class="prose st-prose">${bodyHtml(text, s.id)}</div></div>`
      : `<div class="st-things__bare" data-reveal>${head}</div>`;
    const cols = cards.length >= 5 ? 3 : cards.length; // 1-4 cards sit in one row, five or more wrap in threes
    return `<div class="st-things">${intro}${cols ? `<div class="st-things__grid st-things__grid--n${cols}">${cards.join('')}</div>` : ''}</div>`;
  }).join('');
  // no cards: the band is only the intro glass, so it stands about as tall as the glass (tight), not twice that
  const tight = groups.every((g) => !g.subs.length && !g.top.body.some(isItem));
  return band(html, { tone: o.tone, lit: true, spot: true, tight, backdrop: backdrop(o.img || 'wall-mural-wide'), lx: '20%', ly: '10%' });
}

function routeBand(secs, s, o = {}) {
  if (!secs.length) return '';
  const words = secs.map((x, xi) => {
    const lis = x.body.map((b, i) => (b.t === 'li' ? i : -1)).filter((i) => i >= 0);
    const a = lis.length ? lis[0] : x.body.length; const z = lis.length ? lis[lis.length - 1] + 1 : x.body.length;
    const before = x.body.slice(0, a); const steps = x.body.slice(a, z); const after = x.body.slice(z);
    const sub = x.sub ? `<h3 class="st-route__h">${esc(x.h.text)}</h3>` : xi === 0 ? capDh(x.h.text, { size: x.h.text.length > 46 ? 'sm' : 'md', fit: true }) : `<h3 class="st-route__h">${esc(x.h.text)}</h3>`;
    return `${sub}${before.length ? `<div class="prose st-prose" data-reveal>${bodyHtml(before, s.id)}</div>` : ''}${steps.length ? `<ol class="st-route${o.cards ? ' st-route--cards' : ''}">${steps.map((b, i) => (b.t === 'li' ? `<li data-reveal style="--i:${i % 6}">${rich(b.html, s.id)}</li>` : `<li class="st-route__note">${bodyHtml([b], s.id)}</li>`)).join('')}</ol>` : ''}${after.length ? `<div class="prose st-prose" data-reveal>${bodyHtml(after, s.id)}</div>` : ''}`;
  }).join('');
  const acts = `<div class="btns" data-reveal>${btn('Get Directions', o.directions || s.directions)}${callBtn(s)}</div>`;
  if (o.map === false) return band(`<div class="st-routeband st-routeband--solo"><div class="st-routeband__words fitcol">${words}${acts}</div></div>`, { tone: o.tone });
  // the heading is sized to the words column and the map stretches to the column's height (st-routeband in stores.css)
  return band(`<div class="st-routeband">
  <div class="st-routeband__words fitcol">${words}${acts}</div>
  <div class="st-routeband__map">${mapBox(s)}<p class="st-routeband__addr">${bullet(s)}<span><b>${esc(brand.name)}</b>${esc(addr(s))}</span></p></div>
</div>`, { tone: o.tone });
}

// the shared FAQ section (parts.mjs faqSection, the home FAQ's layout), the captured heading cut into its two tones
function faqBand(F, o = {}) {
  if (!F || !F.items.length) return '';
  const [fa, fb] = hold2(split2(F.head));
  return band(phoneFit(faqSection({ kicker: F.kick || '', heading: [fa, fb], sub: F.sub || '', items: F.items, name: 'faq' }), fa, fb),
    { tone: o.tone, lit: true, spot: o.tone !== 'mint', id: o.id || null });
}

// featured reviews: The Deck, the site's featured-reviews component (as on the home page: rv.css, site.js [data-rv-deck]):
// the captured heading, buttons and reviews word for word, the top card dragged away or dealt. The heading is sized to
// the copy column within three lines (st-rv in stores.css; the town headings run to 46 characters).
const RV_TONES = ['mint', 'lime', 'paper', 'ink'];
function reviewDeck(R, list, o = {}) {
  if (!list.length) return '';
  const id = 'st-rev-h';
  // a short copy column (a two-line heading, no captured button: Albany's "Check Out Reviews") gives the deck the wider
  // column on narrow desktops, so the longest review's card is not twice the copy's height (st-rv--short, stores.css)
  const short = !R.btns.length && (R.head ? R.head.text.length : 0) <= 26;
  const five = `<span class="rv-stars" aria-label="Five stars">${icon('star').repeat(5)}</span>`;
  const cards = list.map((r, i) => `<figure class="rv-c__card rv-c__card--${RV_TONES[i % 4]}" style="--pos:${i}" data-k="${i}">${five}<blockquote>${esc(String(r.text).replace(/^[“‘"']+|[”’"']+$/g, ''))}</blockquote><figcaption>${esc(r.name)}</figcaption></figure>`).join('');
  return band(`<div class="rv-c__grid">
  <div class="rv-c__copy">
    ${kicker('Shout-outs')}${R.head ? capDh(R.head.text, { size: 'md', id, fit: true }) : ''}
    <p class="lede" data-reveal>What customers say about us on Google. Drag the top card away, or deal the next one.</p>
    <div class="rv-c__ctrl"><button class="btn btn--lime" type="button" data-rv-deal><span>Next review</span>${icon('arrow')}</button><span class="rv-c__count"><b data-rv-c>01</b> / ${String(list.length).padStart(2, '0')}</span></div>
    ${R.btns.length ? `<div class="btns">${R.btns.map((b) => btn(b.text, b.href, { kind: 'ghost' })).join('')}</div>` : ''}
    <p class="rv-note">Reviews as published on the ${esc(brand.short)} website, captured November 2026.</p>
  </div>
  <div class="rv-c__deck" data-rv-deck aria-live="polite">${cards}</div>
</div>`, { tone: o.tone, lit: true, spot: true, lx: '75%', ly: '35%', cls: `rv-c st-rv${short ? ' st-rv--short' : ''}`, labelledby: R.head ? id : null });
}

const storesRow = () => `<div class="st-stores">${stores.map((s) => storeCard(s)).join('')}</div>`;
const mapsRow = () => `<div class="st-maps">${stores.map((s) => `<figure class="st-mapc">${mapBox(s)}<figcaption>${bullet(s)}<span><b>${storeName(s)}</b><small>${esc(addr(s))}</small></span><a class="btn btn--ghost btn--sm" href="${esc(s.directions)}" target="_blank" rel="noopener"><span>Directions</span>${icon('arrow-ne')}</a></figcaption></figure>`).join('')}</div>`;
function townsGrouped(idp) {
  return `<div class="st-towns">${stores.map((s, i) => {
    const list = towns().filter((t) => t.store === s.id);
    return `<div class="st-towns__grp${s.id === DEFAULT_STORE ? ' st-towns__grp--wide' : ''}">
  <div class="st-towns__head" data-reveal style="--i:${i}">${bullet(s)}<h3 id="${idp}-${s.id}">Nearest store: ${storeName(s)}</h3><span class="st-towns__n">${list.length} ${list.length === 1 ? 'town' : 'towns'}</span><a class="tlink" href="${href(s.page)}">Store details${icon('arrow')}</a></div>
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
    pageHero({ kicker: 'Where Ya Shopping?', title: hold2(split2(c.h1)), img: need('store-mural'), crumbs: CR.location, cls: 'st-hero', sticker: 'Est. 2022',
      ctas: btn('Store locator', '/store-locator/') + btn('Plan your visit', '/visit-us/', { kind: 'ghost' }) }),
    band(`<div class="st-head"><div>${kicker('Three stores')}${dh('Albany, Clifton Park', '& Schenectady', { size: 'md' })}</div><p class="lede">${esc(brand.separateCarts)}</p></div>${storesRow()}`, { tone: T('ink'), sheet: true, after: floatObj('obj-spraycan', { cls: 'st-float', style: 'top:-150px;right:6%;width:min(9vw,120px)', depth: 0.1, sizes: '120px' }) }),
    band(`<div class="st-head">${dh('Get', 'Directions', { size: 'md', cls: 'dh--inline st-one' })}</div>${mapsRow()}`, { tone: T('night'), lit: true, spot: true }),
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

// ---------- the category cave (store and town pages; owner request 2026-11-13: "for location page category, can we
// convert them into concave carousel? we've already done that in the past so you can just port that") ----------
// The crate's ten record sleeves hung on a concave wall (styles cave.css, script cave.js; ported from the deals wall
// of an earlier redesign of ours). Every card is one of crate()'s own sleeves, re-hung: its link is crate()'s link
// byte for byte (the href pinned to this store's menu, target, rel, the aria-label; a data-menu only where a crate
// follows the visitor's store), with only its class changed; the card keeps the sleeve's art (sized for the card),
// number, name and "Shop now". It fails closed if crate() changes shape. labelledby: the id of the band's heading.
const CAVE_SIZES = '(max-width: 405px) 74vw, (max-width: 1200px) 300px, (min-width: 1201px) clamp(300px, 25vw, 380px), 380px'; // cave.css --cave-w
function caveCrate(s, labelledby) {
  const sleeves = [...crate({ store: s.id }).matchAll(/<a class="sleeve"([^>]*)>([\s\S]*?)<\/a>/g)];
  if (sleeves.length !== categories.length) throw new Error(`stores: cave: crate() gave ${sleeves.length} sleeves for ${categories.length} categories`);
  const bit = (html, re, what) => { const m = html.match(re); if (!m) throw new Error(`stores: cave: no ${what} in a crate() sleeve`); return m[1]; };
  const n = sleeves.length;
  const panels = sleeves.map(([, at, inner], i) => {
    const art = bit(inner, /(<img [^>]*>)/, 'image').replace(/ sizes="[^"]*"/, ` sizes="${CAVE_SIZES}"`).replace(' class="sleeve__art"', ' class="cave__art"');
    return `<div class="cave__panel" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${n}"><a class="cave__card"${at}>${art}<span class="cave__shade"></span><span class="cave__no">${bit(inner, /<span class="sleeve__no">([^<]*)<\/span>/, 'number')}</span><span class="cave__name">${bit(inner, /<span class="sleeve__name">([^<]*)<\/span>/, 'name')}</span><span class="cave__go">${bit(inner, /<span class="sleeve__go">([\s\S]*?)<\/span>/, '"Shop now"')}</span></a></div>`;
  });
  return `<div class="cave" data-cave data-reveal role="region" aria-roledescription="carousel" aria-labelledby="${labelledby}">
  <div class="cave__stage"><div class="cave__wall">${panels.join('')}</div></div>
  <div class="cave__controls" data-cave-ctrl hidden>
    <button class="cave__btn" type="button" data-cave-prev aria-label="Previous category">${icon('arrow-l')}</button>
    <p class="cave__count" aria-hidden="true"><b data-cave-n>01</b><i class="cave__bar"><i></i></i><span>${String(n).padStart(2, '0')}</span></p>
    <button class="cave__btn" type="button" data-cave-next aria-label="Next category">${icon('arrow')}</button>
  </div>
  <p class="sr" aria-live="polite" aria-atomic="true" data-cave-live></p>
</div>`;
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
  const hero = pageHero({ kicker: kick, title: hold2(split2(c.h1)), lede: meta, ledeHtml: true, img: need(look.hero), crumbs: CR.store(s), cls: 'st-hero st-ph', sticker: 'Open daily', fit: true,
    ctas: btn(`Shop ${s.city}`, menuUrl(s.id, 'all')) + btn('Get Directions', s.directions, { kind: 'ghost' }) + callBtn(s, { label: 'Call' }) + setBtn(s) });

  // at a glance: the store photo with its hours on glass, the captured intro + visit words, the map. The address heading
  // keeps the street whole on one line (its number never alone: "997 / Central Ave" on a 360px phone) and the city line
  // on two at most, sized to the column (fit, the column a .fitcol) and on phones to the street (phoneFit)
  const gStreet = s.street.replace(/ /g, '\u00a0'); const gCity = holdLast(`${s.city}, ${s.region} ${s.zip}`);
  const glanceHead = phoneFit(dh(gStreet, gCity, { size: 'md', fit: Math.max(runEm(gStreet), fitEm(gCity.replace(/\u00a0/g, ' ').replace(/ (\S+)$/, "'$1"))) }), gStreet, gCity);
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
  <div class="st-glance__body fitcol">
    ${glanceHead}
    <div class="prose st-prose st-glance__prose" data-reveal>${glanceWords}</div>
    <div class="btns" data-reveal>${G ? G.btns.map((b) => capBtn(b, s, { kind: 'lime' })).join('') : btn('Get Directions', s.directions)}${callBtn(s)}</div>
  </div>
  <div class="st-glance__map" data-reveal>${mapBox(s)}</div>
</div>`, { tone: T('ink'), sheet: true, after: floatObj('obj-bud-a', { cls: 'st-float', style: 'top:-118px;right:7%;width:min(15vw,200px)', depth: 0.12, sizes: '200px' }) });

  // shop this store by category (the captured category heading where the page had one), the sleeves on the cave (caveCrate)
  const crHead = M.cats ? partsOf(M.cats).head.text : null;
  const crateBand = band(`<div class="band__head"><div>${crHead ? capDh(crHead, { size: 'md', id: 'st-cats-h' }) : dh(`Shop ${s.city}`, 'by category', { size: 'md', id: 'st-cats-h' })}<p class="st-note">${icon('pin')}Every sleeve opens the ${esc(s.name)} menu.</p></div><div class="btns">${M.popular ? shopBtn(s, M.popular.blocks[0].text, { kind: 'ghost', target: 'flower' }) : ''}${M.deals ? '' : shopBtn(s, `${s.city} specials`, { kind: 'ghost', target: 'specials' })}${shopBtn(s, `Shop all ${s.city}`)}</div></div>${caveCrate(s, 'st-cats-h')}`, { tone: T('night'), lit: true, spot: true });

  // deals (captured, Albany): the mint "lights on" band
  let deals = '';
  if (M.deals) {
    const D = partsOf(M.deals);
    const pic = D.imgs[0] ? mediaImg(D.imgs[0].src, { alt: D.imgs[0].alt, sizes: '380px' }) : img(need(s.photo), { alt: s.photoAlt, sizes: '380px' });
    // the heading runs across the band, so the print stands beside the prose alone (st-deals in stores.css)
    deals = band(`<div class="st-deals">
  <div class="st-deals__head">${D.kick ? kicker(D.kick) : ''}${capDh(D.head.text, { size: 'md' })}</div>
  <div class="st-deals__words"><div class="prose st-prose" data-reveal>${bodyHtml(D.body, s.id)}</div><div class="btns" data-reveal>${D.btns.map((b) => shopBtn(s, b.text, { target: 'specials', kind: 'ink' })).join('')}</div></div>
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
    reviews = reviewDeck(partsOf(M.reviews), M.reviews.blocks.filter((b) => b.t === 'review'), { tone: T('night') });
  }

  // FAQs: the accordion, plus any question the long text asks that the accordion does not
  const F = partsOf(M.faq);
  const norm = (q) => q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const items = M.faq.blocks.filter((b) => b.t === 'faq').map((f) => ({ q: f.q, a: f.a, html: nbHwy(pre(f.html, s.id)) }));
  const seen = new Set(items.map((f) => norm(f.q)));
  for (const f of (L.faq ? L.faq.items : [])) if (!seen.has(norm(f.q))) { items.push(f); seen.add(norm(f.q)); }
  const faq = faqBand({ kick: F.kick, head: F.head.text, sub: L.faq && L.faq.head ? L.faq.head.h.text : '', items }, { tone: T(M.deals ? 'ink' : 'mint') });

  // visit us today: the captured closing block on glass over a photo
  const V = partsOf(M.visit);
  const label = V.body.find((b) => b.t === 'p' && /^open daily/i.test(b.text));
  const findP = V.body.find((b) => b.t === 'p' && /^find us at/i.test(b.text));
  const vWords = V.body.filter((b) => b.t === 'p' && b !== label && b !== findP);
  const vActs = V.btns.length ? V.btns.map((b) => capBtn(b, s, { kind: /directions/i.test(b.text) ? 'ghost' : 'lime' })).join('') : btn('Get Directions', s.directions, { kind: 'ghost' }) + shopBtn(s, `Shop ${s.city}`);
  // both columns end near each other whatever the store's text: a long text (over 600 characters) runs under a heading
  // that crosses the card; a shorter one keeps its heading, sized to the column; a short one (under 400) also takes the
  // actions under it, out of the facts (st-visit in stores.css)
  const vText = [...vWords, ...L.visit.flatMap((x) => [x.h, ...x.body])].map((b) => b.text || '').join(' ');
  const vLong = vText.length > 600; const vShort = vText.length < 400;
  const vHead = `${kicker(V.kick)}${capDh(V.head.text, { size: 'md', fit: !vLong })}`;
  const vActsHtml = `<div class="btns">${vActs}</div>`;
  const visit = band(`<div class="st-visit glass${vLong ? ' st-visit--long' : ''}" data-reveal>
  ${vLong ? `<div class="st-visit__head">${vHead}</div>` : ''}
  <div class="st-visit__words${vLong ? '' : ' fitcol'}">${vLong ? '' : vHead}<div class="prose st-prose">${bodyHtml(vWords, s.id)}${L.visit.map((x) => `<h3>${esc(x.h.text)}</h3>${bodyHtml(x.body, s.id)}`).join('')}</div>${vShort ? vActsHtml : ''}</div>
  <div class="st-visit__facts">${findP ? `<p class="st-visit__find">${icon('pin')}<span>${rich(findP.html, s.id)}</span></p>` : ''}${label ? `<p class="st-visit__label">${icon('clock')}<span>${esc(label.text)}</span></p>` : ''}<ul class="st-visit__hours">${V.body.filter((b) => b.t === 'li').map((b) => `<li>${esc(b.text)}</li>`).join('')}</ul>${statusLine(s)}${vShort ? '' : vActsHtml}</div>
</div>`, { tone: T('night'), lit: true, backdrop: backdrop(look.visit), lx: '30%', ly: '20%' });

  // nearby towns, the other two stores, licence
  const mine = towns().filter((t) => t.store === s.id);
  const near = band(`<div class="st-head"><div>${kicker(`Served by ${s.name}`)}${dh('Towns', 'We Serve', { size: 'md' })}</div>${btn(`All ${towns().length} towns`, '/visit-us/#towns', { kind: 'ghost' })}</div><div class="st-areas">${areaGrid(mine.map((t) => ({ label: t.name, href: t.path, meta: t.short })))}</div>`, { tone: T('ink'), sheet: true, tight: true });
  const others = band(`<div class="st-head">${dh('Our Other', 'Stores', { size: 'md', cls: 'dh--inline st-one' })}</div><div class="st-stores st-stores--two">${stores.filter((x) => x.id !== s.id).map((x) => storeCard(x)).join('')}</div>${licStrip(s)}`, { tone: T('slate') });

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
    <div class="st-res__top">${bullet(s)}<div><h3 class="st-res__name">${storeName(s)}</h3>${statusLine(s)}</div></div>
    <p class="st-res__addr">${icon('pin')}<span>${esc(addr(s))}</span></p>
    <p class="st-res__acts">${shopBtn(s, `Shop ${s.city}`, { size: 'sm' })}<a class="btn btn--ghost btn--sm" href="${href(s.page)}"><span>Store details</span>${icon('arrow')}</a></p>
  </li>`).join('');
  const townRows = towns().map((t, i) => { const s = storeById(t.store); return `<li data-town="${esc(`${t.name} ${s.city} ${s.zip}`)}" data-reveal style="--i:${i % 6}"><a class="st-res st-res--town" href="${href(t.path)}">
    <span class="st-res__name">${esc(t.name)}</span>
    <span class="st-res__near">${bullet(s)}<span>Nearest store: <b>${storeName(s)}</b></span></span>
    <span class="st-res__drive">${esc(t.drive)}</span>
    <span class="st-res__go">Town guide${icon('arrow')}</span></a></li>`; }).join('');
  const main = [
    pageHero({ kicker: kick, title: hold2(split2(c.h1)), img: need('alley'), crumbs: CR.locator, cls: 'st-hero',
      ctas: btn('All locations', '/location/') + btn('Plan your visit', '/visit-us/', { kind: 'ghost' }) }),
    band(`<div class="st-loc">
  <div class="st-loc__search" data-locator="st-results"><label class="field"><span>Town or ZIP</span><input type="search" placeholder="Try Troy, Saratoga Springs or 12065" autocomplete="off" aria-describedby="st-loc-hint"></label></div>
  <p class="st-loc__hint" id="st-loc-hint">${stores.length} stores and ${towns().length} towns and destinations. Each town shows its nearest store and the drive from that town's page.</p>
  <p class="st-loc__empty" data-locator-empty hidden role="status">No match yet. Try a town name or a store ZIP (12205, 12065, 12303), or see <a href="${href('/location/')}">all locations</a>.</p>
  <ul class="st-results" id="st-results">${storeRows}${townRows}</ul>
</div>`, { tone: T('ink'), sheet: true, after: floatObj('obj-bud-a', { cls: 'st-float', style: 'top:-120px;right:6%;width:min(14vw,190px)', depth: 0.12, sizes: '190px' }) }),
    band(`<div class="st-head">${dh('Get', 'Directions', { size: 'md', cls: 'dh--inline st-one' })}</div>${mapsRow()}`, { tone: T('night'), lit: true, spot: true }),
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
    pageHero({ kicker: 'Plan your visit', title: hold2(split2(c.h1)), img: need('m-2025-08-image-1'), crumbs: CR.visit, cls: 'st-hero',
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

  const hero = pageHero({ kicker: t.kick, title: hold2(split2(t.h1)), lede: rich(t.lede.html, s.id), ledeHtml: true, img: need(look.hero), crumbs, cls: 'st-hero st-ph st-ph--long', fit: true,
    ctas: shopBtn(s, 'Order Ahead') + (t.dir ? btn('Get Directions', t.dir, { kind: 'ghost' }) : '') });

  // a short category heading ("Shop By Category") runs on one line beside its button, as on the home page (st-one)
  const catHead = catsM ? partsOf(catsM).head.text : 'Shop By Category'; const oneCat = catHead.length <= 18 ? 'dh--inline st-one' : '';
  const crateBand = band(`<div class="band__head"><div>${capDh(catHead, { size: 'md', id: 'st-cats-h', cls: oneCat })}<p class="st-note">${icon('pin')}Every sleeve opens the ${esc(s.name)} menu.</p></div>${shopBtn(s, `Shop all ${s.city}`, { kind: 'ghost' })}</div>${caveCrate(s, 'st-cats-h')}`,
    { tone: T('ink'), sheet: true, after: floatObj('obj-bud-b', { cls: 'st-float', style: 'top:-128px;right:6%;width:min(9vw,130px)', depth: 0.12, sizes: '130px' }) });

  let why = '';
  if (whyM) {
    const W = partsOf(whyM);
    const media = `<figure class="st-frame">${img(need(look.town), { alt: look.townAlt, sizes: '(min-width: 860px) 45vw, 92vw', cls: 'st-frame__img' })}<span class="st-frame__tag">${bullet(s)}<span>${esc(s.name)}</span></span></figure>`;
    // the heading is sized to the words column and the photo stretches to the column's height (st-why in stores.css)
    const body = `${W.kick ? kicker(W.kick) : ''}${W.head ? capDh(W.head.text, { size: 'md', fit: true }) : ''}<div class="prose st-prose">${bodyHtml([...W.pre, ...W.body], s.id)}</div><div class="btns">${W.btns.map((b) => capBtn(b, s)).join('')}</div>`;
    why = band(`<div class="split st-why"><div class="split__media" data-reveal="develop">${media}</div><div class="split__body fitcol" data-reveal>${body}</div></div>`, { tone: T('night'), lit: true, spot: true });
  }

  let reviews = '';
  if (revM) {
    reviews = reviewDeck(partsOf(revM), revM.blocks.filter((b) => b.t === 'review'), { tone: T('slate') });
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
  // beside a short text the store card lies on its side (photo beside the details), so the two columns end together
  // (st-near--short in stores.css); a sub-heading with its own paragraph counts as about 160 characters of height
  const nearText = [C && C.kick, C && C.head && C.head.text, ...cWords, ...plate, ...L.visit.flatMap((x) => [x.h, ...x.body])].map((b) => (typeof b === 'string' ? b : (b && b.text) || '')).join(' ');
  const nearShort = nearText.length + L.visit.length * 160 < 470;
  const near = band(`<div class="st-near${nearShort ? ' st-near--short' : ''}">
  <div class="st-near__words fitcol" data-reveal>${C ? kicker(C.kick) : ''}${C && C.head ? capDh(C.head.text, { size: 'md', fit: true }) : dh('Your', 'Nearest Store', { size: 'md', fit: true })}${cWords.length ? `<div class="prose st-prose">${bodyHtml(cWords, s.id)}</div>` : ''}${plate.length ? `<p class="st-plate">${bullet(s)}<span>${plate.map((b, i) => (i === 0 ? `<b>${esc(fixLine(b.text))}</b>` : `<span>${esc(fixLine(b.text))}</span>`)).join('')}</span></p>` : ''}${L.visit.map((x) => `<h3 class="st-near__h">${esc(x.h.text)}</h3><div class="prose st-prose">${bodyHtml(x.body, s.id)}</div>`).join('')}<div class="btns">${C ? C.btns.map((b) => capBtn(b, s, { kind: 'ghost' })).join('') : ''}${shopBtn(s, 'Order Ahead')}</div></div>
  <div class="st-near__card">${storeCard(s)}</div>
</div>`, { tone: T('ink'), sheet: true });

  const others = towns().filter((x) => x.store === s.id && x !== t).sort((a, b) => a.mins - b.mins).slice(0, 6);
  const more = band(`<div class="st-head"><div>${kicker(`Also served by ${s.name}`)}${dh('Towns', 'We Serve', { size: 'md' })}</div>${btn(`All ${towns().length} towns`, '/visit-us/#towns', { kind: 'ghost' })}</div>${others.length ? `<div class="st-areas">${areaGrid(others.map((x) => ({ label: x.name, href: x.path, meta: x.short })))}</div>` : ''}`, { tone: T('night'), tight: true });

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
