// shop.mjs: the SHOP lane. /shop/ (new hub), /menu/ + /shop-cbd/ (redirects to /shop/), /deals/, /how-to-order/,
// /pickup/ (new), /brands/ (Brands We Carry + an A-Z of the brands the live menus list), /our-brands/ and its two brand
// pages (captured words, verbatim). New words are built only on facts in site.mjs or the capture.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageHero, band, dh, kicker, btn, menuBtn, crate, vinyl, floatObj, faqList, faqSection, fitEm, tracklist, richHtml, signUp, bullet, storeName, statusLine, hoursTable, esc, href, img, mediaImg, icon, menuLink } from '../lib/parts.mjs';
import { storeLd } from '../lib/layout.mjs';
import { page as cap, allPages, decode } from '../lib/capture.mjs';
import { brand, stores, storeById, categories, menuUrl, ORIGIN } from '../content/site.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STAMP = 'November 2026'; // the menu crawl ran 2026-11-12 (audit/site-inventory.json)
const HOME = { label: 'Home', href: '/' };
const SHOP = { label: 'Shop', href: '/shop/' };

// ---------------------------------------------------------------- capture access (fail closed) ----------
function need(v, what) {
  if (!v || (Array.isArray(v) && !v.length)) throw new Error('shop.mjs: the capture is missing ' + what);
  return v;
}
const capPage = (p) => need(cap(p), 'page ' + p);
const blocksOf = (p) => capPage(p).modules.flatMap((m) => m.blocks);
const faqOf = (p, re) => need(blocksOf(p).find((b) => b.t === 'faq' && re.test(b.q)), `FAQ ${re} on ${p}`);
const PLACEHOLDER = /lorem ipsum|happy little/i;
const dropped = [];
const real = (items, where) => items.filter((b) => {
  const junk = PLACEHOLDER.test([b.q, b.a, b.text].join(' '));
  if (junk) dropped.push(`${where}: "${b.q || b.text}"`);
  return !junk;
});

// captured links to a store's live menu (/stores/cd-<store>-ny/...) are kept exactly as the live site set them, so a
// deep link (a brand inside a category, a store's specials) still lands on products; everything else goes through
// the shared richHtml mapping
const keepStoreLinks = (html) => String(html || '').replace(/<a href="([^"]*)">/g, (m, u) => {
  const raw = u.replace(/&amp;/g, '&');
  const p = raw.startsWith(ORIGIN) ? raw.slice(ORIGIN.length) : raw;
  return /^\/stores\/cd-[a-z-]+-ny(\/|$)/.test(p) ? `<a href="${esc(ORIGIN + p)}" target="_blank" rel="noopener">` : m;
});
const capHtml = (html) => richHtml(keepStoreLinks(html));
// a captured block as plain text without the space the capture's text() leaves where a link closed ("Cannabis .")
const plain = (b) => (b.html ? decode(b.html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim() : '') || b.text || '';
// a captured FAQ answer used on a card: the same words without the leading "Yes." that only reads inside a Q&A
const bare = (a) => String(a).replace(/^(Yes|No)[.!]\s+/, '');
const capFaqs = (items) => items.map((f) => ({ ...f, html: keepStoreLinks(f.html) }));
const faqLd = (items) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });

// ---------------------------------------------------------------- shared lane pieces ----------
// a button pinned to ONE store's live menu (store pages, store cards, brand pages): never retargeted by the chip
function shopAt(s, target, label, o = {}) {
  return `<a class="btn btn--${o.kind || 'lime'}${o.size === false ? '' : ' btn--sm'}${o.cls ? ' ' + o.cls : ''}" href="${esc(menuUrl(s.id, target))}" target="_blank" rel="noopener" aria-label="${esc((o.aria || label) + ' (opens the live menu in a new tab)')}"><span>${esc(label)}</span>${icon('arrow-ne')}</a>`;
}
// a full-bleed photo in a band's back plane, darkened so glass and type read on top of it
const backdrop = (id, shade = '') => `${img(id, { decorative: true, sizes: '100vw', cls: 'sh-bd' })}<span class="sh-bd-shade${shade ? ' sh-bd-shade--' + shade : ''}"></span>`;
const statusCurrent = () => statusLine(stores[0]).replace(`data-status-for="${stores[0].id}"`, 'data-status-current');
const srcTag = (t) => `<p class="sh-src">${icon('mic')}<span>${esc(t)}</span></p>`;

// "You're shopping at": bound to the visitor's chosen store by site.js (name, letter, status, phone, directions, page)
function nowShopping(o = {}) {
  const d = stores[0];
  return `<div class="sh-now glass" data-reveal>
  <div class="sh-now__id">
    <span class="sh-now__rec" aria-hidden="true"><span class="bullet" data-store-letter>${esc(d.letter)}</span></span>
    <div class="sh-now__who">
      <p class="sh-now__k">You’re shopping&nbsp;at</p>
      <p class="sh-now__name" data-store-name>${esc(d.name)}</p>
      ${statusCurrent()}
    </div>
  </div>
  <ul class="sh-now__facts">
    <li><a href="tel:${d.tel}" data-store-tel>${icon('phone')}<span data-store-phone>${esc(d.phone)}</span></a></li>
    <li><a href="${esc(d.directions)}" data-store-directions target="_blank" rel="noopener">${icon('route')}<span>Directions</span></a></li>
    <li><a href="${href(d.page)}" data-store-page>${icon('pin')}<span>Store info</span></a></li>
  </ul>
  <div class="sh-now__act">
    ${menuBtn('all', o.cta || 'Shop this store')}
    <button class="btn btn--ghost" type="button" data-open-store><span>Switch store</span>${icon('chev')}</button>
  </div>
  <p class="sh-now__note">${icon('bag')}<span>${esc(brand.separateCarts)}</span></p>
</div>`;
}

// a store card: the shared store card (.scard, components.css; the one home, the store pages and About use), carrying
// this lane's fixed-store buttons. o: { cta (two .btn, the card's equal button grid), links (text links under them),
// extra (rows after the address), pick (the whole card picks the store, as on home) }
function storeTile(s, i, o = {}) {
  return `<article class="scard sh-scard" data-store-card="${s.id}"${o.pick ? ' data-pick-card' : ''} data-reveal style="--i:${i}">
  <div class="scard__media">${img(s.photo, { alt: s.photoAlt, sizes: '(min-width: 1061px) 31vw, (min-width: 701px) 46vw, 92vw' })}<span class="scard__bullet">${bullet(s)}${o.pick ? '' : `<span class="sh-scard__mine">${icon('check')}Your store</span>`}</span></div>
  <div class="scard__body">
    <h3 class="scard__name">${storeName(s)}</h3>
    ${statusLine(s)}
    <p class="scard__addr">${icon('pin')}<span>${esc(s.street)}, ${esc(s.city)}, ${esc(s.region)} ${esc(s.zip)}</span></p>
    ${o.extra || ''}
    <div class="scard__cta">${o.cta}</div>
    ${o.links ? `<p class="scard__links">${o.links}</p>` : ''}
  </div>
</article>`;
}
const infoLink = (s, label = 'Store info') => `<a href="${href(s.page)}">${esc(label)}${icon('arrow')}</a>`;
const specialsLink = (s) => `<a href="${esc(menuUrl(s.id, 'specials'))}" target="_blank" rel="noopener" aria-label="${esc(s.city)} specials (opens the live menu in a new tab)">Specials${icon('arrow-ne')}</a>`;
const pickBtn = (s) => `<button class="btn btn--ghost btn--sm pick" type="button" data-set-store="${s.id}"><span class="pick__off">Make ${esc(s.city)} my store</span><span class="pick__on">${icon('check')}Your store</span></button>`;
const dirBtn = (s, label = 'Directions') => `<a class="btn btn--ghost btn--sm" href="${esc(s.directions)}" target="_blank" rel="noopener" aria-label="${esc(label)}: ${esc(s.name)} (opens Google Maps)"><span>${esc(label)}</span>${icon('route')}</a>`;

// today's specials per store: the shared store tickets (.sp-b / .sp-tix, sp.css; the home page's Daily Specials), each
// one opening that store's specials on its live menu (fixed store). intro: the words beside the tickets
const spTix = (s, i) => `<li data-reveal style="--i:${i}"><a class="sp-tix" href="${esc(menuUrl(s.id, 'specials'))}" target="_blank" rel="noopener" style="--i:${i}" aria-label="Today’s Specials at ${esc(s.name)} (opens the live menu in a new tab)">
      ${bullet(s)}<span class="sp-tix__who"><b>${esc(s.city)}</b><small>${esc(s.street)} · ${esc(`${s.city}, ${s.region} ${s.zip}`).replace(/ /g, ' ')}</small>${statusLine(s)}</span>
      <span class="sp-tix__go"><span>Specials</span>${icon('arrow-ne')}</span></a></li>`;
const tickets = (intro, o = {}) => `<div class="sp-b${o.cls ? ' ' + o.cls : ''}">
    <div class="sp-b__intro">${intro}</div>
    <ul class="sp-b__list">${stores.map(spTix).join('')}</ul>
  </div>`;

// a reading layout: a sticky aside beside a prose column
const readLayout = (aside, body, o = {}) => `<div class="sh-read${o.cls ? ' ' + o.cls : ''}"><aside class="sh-read__aside" data-reveal>${aside}</aside><div class="sh-read__body" data-reveal style="--i:1">${body}</div></div>`;

// FAQ: the shared FAQ section (parts.mjs faqSection, the home FAQ's layout: sticky heading column, record, accordion)
function faqBlock(heading, items, o = {}) {
  return faqSection({ kicker: o.kicker || "It's Simple", heading, id: o.id, lede: o.text || '', cta: o.cta || '', items: capFaqs(items), name: 'faq', vinyl: o.vinyl });
}

// the ordering steps (store, browse, cart, checkout, pickup): one source for /shop/ and /how-to-order/
// times keep a no-break space before AM / PM, so "9" and "PM" never sit on two lines (DESIGN.md: "AM" stays with its time)
const cutoff = (s, day) => { const c = s.hours[day][1] * 60 - 30; const h = Math.floor(c / 60) % 12 || 12; return `${h}:${String(c % 60).padStart(2, '0')} PM`; };
const ORDER_UNTIL = cutoff(stores[0], 1); // Monday to Saturday (9 PM close)
const ORDER_UNTIL_SUN = cutoff(stores[0], 0); // Sunday (6 PM close)
function steps(o = {}) {
  const more = o.more;
  return [
    { title: 'Pick your store', icon: 'pin', text: more ? 'Albany, Clifton Park or Schenectady. Choose it with the store chip at the top of any page, and every Shop button on this site follows your pick.' : 'Albany, Clifton Park or Schenectady. Every Shop button on this site follows the store you pick.', cta: more ? `<button class="btn btn--ghost btn--sm" type="button" data-open-store><span>Pick a store</span>${icon('chev')}</button>` : '' },
    { title: 'Browse by category', icon: 'leaf', text: `${categories.map((c) => c.name).slice(0, -1).join(', ')} and ${categories[categories.length - 1].name}, each one a shelf on your store’s live menu.`, cta: more ? menuBtn('all', 'Browse the menu', { kind: 'ghost', size: 'sm' }) : '' },
    { title: 'Add to your cart', icon: 'bag', text: more ? `Add what you like. Your cart stays with the store you picked. ${brand.separateCarts}` : 'Add what you like. Your cart stays with the store you picked.' },
    { title: 'Check out, choose pickup', icon: 'check', text: more ? `Check out on the live menu and choose pickup. Pre-orders close 30 minutes before closing: until ${ORDER_UNTIL} Monday to Saturday and until ${ORDER_UNTIL_SUN} on Sunday.` : `Check out on the live menu and choose pickup. Pre-orders close 30 minutes before closing, so ${ORDER_UNTIL} on a 9 PM night.` },
    { title: 'Pick up with your 21+ ID', icon: 'id', text: `Bring a valid government-issued photo ID that shows you are 21 or older. The stores accept ${brand.payment}.`, cta: more ? btn('What to expect at pickup', '/pickup/', { kind: 'ghost', size: 'sm' }) : '' },
  ];
}

// ---------------------------------------------------------------- the brands the live menus list ----------
// Built from the crawled menu URLs (/stores/<store>/brands/<slug>, status 200). The saved pages carry no brand name
// (title and h1 are both the generic "Brands"; the menu renders names in the browser), so each name is the spelling
// the client's own published text uses for that brand (captured blog posts), else the slug made readable.
// SNAPSHOT is the same list generated from audit/site-inventory.json, for a clone of the public source (no audit/).
const STORE_BY_MENU = Object.fromEntries(stores.map((s) => [s.menu, s.id]));
const SNAPSHOT = [['1906', 'a'], ['7-seaz', 'a'], ['anthem', 'c'], ['ayrloom', 'ac'], ['bodega-boyz', 'c'], ['brass-knuckles', 'a'], ['breakfast-connections', 'a'], ['cam', 'a'], ['canna-dots', 'a'], ['cannabals', 'as'], ['casa-verde-farms', 'c'], ['chaos', 'a'], ['cheech-chong', 'a'], ['cru-cannabis', 'a'], ['crumbles', 'a'], ['curaleaf', 'a'], ['dank-by-definition', 'a'], ['day-zed', 'a'], ['dayzed', 'a'], ['dime-industries', 's'], ['dolla-treez', 'a'], ['doobie-labs', 'a'], ['dragonfly', 'a'], ['electraleaf-new-york', 'a'], ['eureka', 'a'], ['fernway', 'a'], ['florette', 'a'], ['florist-farms', 'a'], ['foy', 'a'], ['generic-af', 'as'], ['grassroots', 'a'], ['gron', 'ac'], ['hashtag-honey', 's'], ['heady-tree', 'a'], ['heavy-hitters', 'a'], ['high-falls-canna', 'a'], ['high-falls-canna-ny', 'as'], ['high-falls-hemp-ny', 'a'], ['high-peaks', 'ac'], ['house-of-sacci', 'a'], ['hudson-cannabis', 'ac'], ['incredibles', 'c'], ['jaunty', 'ac'], ['jeeter', 'a'], ['jetpacks', 'ac'], ['knack', 'a'], ['layup', 'c'], ['leal', 'a'], ['left-coast', 'a'], ['mfny', 'acs'], ['mind-melters', 'a'], ['mnfy', 'a'], ['moonys-zooties', 'a'], ['myhi', 'a'], ['naka', 'a'], ['nerd-bar', 'a'], ['nyce', 'as'], ['off-hours', 'a'], ['pax', 'a'], ['plantwerks', 'c'], ['rec-roots', 'a'], ['rem-zzz', 'a'], ['rove', 'acs'], ['ruby-farms', 'a'], ['rythm', 'a'], ['spacebuds', 'a'], ['sugarhouse-farms', 'a'], ['supernaturals-new-york', 'c'], ['terp-x', 'c'], ['upstate-elevator-supply-co', 'a'], ['vireo-health', 's'], ['waferz', 'c'], ['wana', 'a'], ['wyld', 'ac'], ['zizzle', 'a'], ['zonk', 'a']];
const LETTER_STORE = Object.fromEntries(stores.map((s) => [s.letter.toLowerCase(), s.id]));

function menuBrandSlugs() {
  const inv = path.join(ROOT, 'audit/site-inventory.json');
  const fromSnap = () => SNAPSHOT.map(([slug, l]) => [slug, [...l].map((c) => LETTER_STORE[c])]);
  if (!fs.existsSync(inv)) return fromSnap();
  const map = {};
  for (const p of JSON.parse(fs.readFileSync(inv, 'utf8')).pages || []) {
    if (p.status !== 200) continue;
    const m = String(p.url || '').match(/\/stores\/([^/]+)\/brands\/([^/?#]+)\/?$/);
    if (!m || !STORE_BY_MENU[m[1]]) continue;
    (map[m[2]] ||= new Set()).add(STORE_BY_MENU[m[1]]);
  }
  const list = Object.keys(map).sort().map((slug) => [slug, stores.map((s) => s.id).filter((id) => map[slug].has(id))]);
  const snap = JSON.stringify(fromSnap());
  if (JSON.stringify(list) !== snap) console.warn('shop.mjs: the brand list in audit/site-inventory.json differs from SNAPSHOT; regenerate SNAPSHOT');
  return list;
}
function readable(slug) {
  return slug.split('-').map((w, i) => {
    if (/^\d+$/.test(w)) return w;
    if (i && /^(of|by|and|the)$/.test(w)) return w;
    if (!/[aeiou]/.test(w)) return w.toUpperCase();
    return w[0].toUpperCase() + w.slice(1);
  }).join(' ');
}
function brandNames(slugs) {
  let corpus = '';
  for (const p of allPages()) {
    for (const m of p.modules) for (const b of m.blocks) corpus += ' ' + [b.text, b.q, b.a].filter(Boolean).join(' ');
    if (p.post && p.post.html) corpus += ' ' + p.post.html.replace(/<[^>]+>/g, ' ');
  }
  corpus = corpus.replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const caps = (s) => (s.match(/[A-Z]/g) || []).length;
  const out = {};
  for (const slug of slugs) {
    const words = slug.split('-').map((w) => w.replace(/[^a-z0-9]/g, ''));
    const re = new RegExp('(?<![A-Za-z0-9])' + words.join('[\\s-]*(?:&|and)?[\\s-]*') + '(?![A-Za-z0-9])', 'gi');
    const hits = {};
    for (const m of corpus.matchAll(re)) hits[m[0]] = (hits[m[0]] || 0) + 1;
    const best = Object.entries(hits).filter(([k]) => /^[A-Z0-9]/.test(k)).sort((a, b) => b[1] - a[1] || caps(b[0]) - caps(a[0]) || a[0].localeCompare(b[0]))[0];
    out[slug] = best ? best[0] : readable(slug);
  }
  return out;
}
let BRANDS = null;
function menuBrands() {
  if (BRANDS) return BRANDS;
  const list = menuBrandSlugs();
  const names = brandNames(list.map(([s]) => s));
  const byName = new Map();
  for (const [slug, at] of list) {
    const name = names[slug];
    const key = name.toLowerCase();
    if (!byName.has(key)) byName.set(key, { name, slugs: {}, all: [] });
    const e = byName.get(key);
    e.all.push(slug);
    for (const id of at) if (!e.slugs[id]) e.slugs[id] = slug; // two menu slugs with one name: the first per store
  }
  BRANDS = [...byName.values()].map((e) => ({ ...e, letter: /^[a-z]/i.test(e.name) ? e.name[0].toLowerCase() : 'num' }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }));
  return BRANDS;
}

function brandRow(b) {
  const ids = stores.map((s) => s.id).filter((id) => b.slugs[id]);
  const everywhere = ids.length === stores.length && new Set(ids.map((id) => b.slugs[id])).size === 1;
  const name = everywhere
    ? menuLink(`brands/${b.slugs[ids[0]]}`, `<span>${esc(b.name)}</span>${icon('arrow-ne')}`, { cls: 'sh-brand__name sh-brand__name--go', aria: `Shop ${b.name} at your store (opens the live menu in a new tab)` })
    : `<span class="sh-brand__name">${esc(b.name)}</span>`;
  const dots = stores.map((s) => b.slugs[s.id]
    ? `<a class="sh-dot" href="${esc(menuUrl(s.id, 'brands/' + b.slugs[s.id]))}" target="_blank" rel="noopener" aria-label="Shop ${esc(b.name)} at ${esc(s.city)} (opens the live menu in a new tab)">${esc(s.letter)}</a>`
    : `<span class="sh-dot sh-dot--off" title="Not on the ${esc(s.city)} menu in ${STAMP}"><span aria-hidden="true">${esc(s.letter)}</span><span class="sr">Not listed at ${esc(s.city)}</span></span>`).join('');
  return `<li class="sh-brand">${name}<span class="sh-brand__at">${dots}</span></li>`;
}
function brandDirectory() {
  const list = menuBrands();
  const groups = [];
  for (const b of list) { const g = groups[groups.length - 1]; if (g && g.letter === b.letter) g.items.push(b); else groups.push({ letter: b.letter, items: [b] }); }
  const label = (l) => (l === 'num' ? '#' : l.toUpperCase());
  const listings = list.reduce((n, b) => n + Object.keys(b.slugs).length, 0);
  return `<div class="sh-az">
  <div class="sh-az__bar" data-reveal>
    <ul class="sh-az__legend" aria-label="Store key">${stores.map((s) => `<li><span class="sh-dot sh-dot--key" aria-hidden="true">${esc(s.letter)}</span>${esc(s.city)}</li>`).join('')}</ul>
    <p class="sh-az__stamp">${icon('cal')}<span>${list.length} brands, ${listings} store listings, as listed on the live menus, ${STAMP}</span></p>
  </div>
  <div class="sh-az__chips" data-filter-group="sh-az-list" role="group" aria-label="Filter brands by first letter" style="--chips:${groups.length + 1};--chips-half:${Math.ceil((groups.length + 1) / 2)}">
    <button class="chipbtn" type="button" data-filter="all" aria-pressed="true">All</button>
    ${groups.map((g) => `<button class="chipbtn" type="button" data-filter="${g.letter}" aria-pressed="false" aria-label="Brands starting with ${g.letter === 'num' ? 'a number' : label(g.letter)}">${label(g.letter)}</button>`).join('')}
  </div>
  <div class="sh-bins" id="sh-az-list">
    ${groups.map((g, i) => `<section class="sh-bin" data-tags="${g.letter}" data-reveal style="--i:${i % 6}" aria-label="Brands, ${g.letter === 'num' ? 'numbers' : label(g.letter)}">
      <div class="sh-bin__tab"><span class="sh-bin__l" aria-hidden="true">${label(g.letter)}</span><span class="sh-bin__n">${g.items.length} ${g.items.length === 1 ? 'brand' : 'brands'}</span></div>
      <ul>${g.items.map(brandRow).join('')}</ul>
    </section>`).join('')}
  </div>
  <p class="sh-az__how">A lit letter opens that store’s brand page on the live menu. A dimmed letter means that store’s menu did not list the brand when we checked. Brands listed at all three stores link to your chosen store from the name.</p>
</div>`;
}

// ---------------------------------------------------------------- brand partners (captured) ----------
function partner(slug) {
  const pg = capPage(`/our-brands/${slug}`);
  const top = need(pg.modules.find((m) => m.blocks.some((b) => b.t === 'h1')), `intro module on /our-brands/${slug}`);
  const logo = need(top.blocks.find((b) => b.t === 'img'), `logo on /our-brands/${slug}`);
  const ps = top.blocks.filter((b) => b.t === 'p');
  return { slug, path: `/our-brands/${slug}/`, name: need(top.blocks.find((b) => b.t === 'h1'), 'h1').text, logo, kick: ps[0] && ps[0].text, intro: ps[1], top, pg };
}
const PARTNERS = ['ayrloom', 'hashtag-honey'];
// the /brands/ capture: "Brands We Carry" over the two partner logos
const brandsCap = () => {
  const bl = blocksOf('/brands');
  return { h2: need(bl.find((b) => b.t === 'h2'), '/brands h2').text, logos: need(bl.filter((b) => b.t === 'img'), '/brands logos') };
};
function partnerTile(b, i, o = {}) {
  return `<a class="sh-partner" href="${href(b.path)}" data-reveal style="--i:${i}">
  <span class="sh-partner__in" data-tilt>
    <span class="sh-partner__logo">${mediaImg(o.logo ? o.logo.src : b.logo.src, { alt: (o.logo ? o.logo.alt : b.logo.alt) || `${b.name} logo`, sizes: '(min-width: 900px) 280px, 70vw' })}</span>
    <span class="sh-partner__body">
      ${b.kick ? `<span class="sh-partner__k">${esc(b.kick)}</span>` : ''}
      <span class="sh-partner__name">${esc(b.name)}</span>
      ${o.long && b.intro ? `<span class="sh-partner__txt">${esc(plain(b.intro))}</span>` : ''}
      <span class="sh-partner__go">${esc(o.go || 'Read the story')}${icon('arrow')}</span>
    </span>
  </span>
</a>`;
}
// "Shop Now" on a brand page: one button per store, each straight to that store's brand page on the live menu
// (the live site's own Shop Now points at /stores/brands/<slug>, which answers 404 without a store)
const shopNowAt = (slug, name, o = {}) => `<div class="sh-shopat${o.cls ? ' ' + o.cls : ''}"><span class="sh-shopat__k">${esc(o.label || 'Shop Now')}</span>${stores.map((s) => shopAt(s, 'brands/' + slug, s.city, { kind: o.kind || 'lime', aria: `Shop ${name} at ${s.city}` })).join('')}</div>`;

// ================================================================= pages ==========
export function pages() {
  const out = [shopHub(), deals(), howToOrder(), pickup(), brandsPage(), ourBrands(), ...PARTNERS.map(brandDetail),
    { path: '/menu/', redirect: '/shop/', title: 'Shop' },
    { path: '/shop-cbd/', redirect: '/shop/', title: 'Shop' }];
  if (dropped.length) console.log('shop.mjs dropped placeholder content: ' + dropped.join('; '));
  return out;
}

// ---------------------------------------------------------------- /shop/ (NEW) ----------
function shopHub() {
  const crumbs = [HOME, SHOP];
  const faqs = [
    faqOf('/visit-us', /^Can I place an online order/),
    faqOf('/visit-us', /^Do all of your locations offer the same menu/),
    faqOf('/location/albany', /^What forms of payment/),
    faqOf('/location/clifton-park', /^Do I need an ID/),
    faqOf('/location/albany', /^Can I shop for weed if I'm from out of state/),
  ];
  const main = pageHero({
    kicker: 'Order ahead', title: ['Shop the', 'Live Menu'], img: 'store-mural', crumbs, sticker: 'Pickup at the counter', cls: 'sh-ph sh-ph--long',
    lede: 'Shop the live menu of your Capital District Cannabis store: Albany, Clifton Park or Schenectady. Fill your cart, check out for pickup and grab it at the counter with your ID.',
    ctas: menuBtn('all', 'Shop now') + menuBtn('specials', 'Specials', { kind: 'ghost' }),
  })
  + band(`<div class="sh-head"><div>${kicker('Where Ya Shopping?')}${dh('Pick your', 'Store', { id: 'sh-pick-h' })}</div>
    <p class="lede" data-reveal>Every Shop button on this site follows your store. Switch any time, or shop a store directly from its card.</p></div>
    ${nowShopping()}
    <div class="sh-stores">${stores.map((s, i) => storeTile(s, i, { pick: true, cta: shopAt(s, 'all', 'Shop menu', { aria: `Shop the ${s.city} menu` }) + pickBtn(s), links: specialsLink(s) + infoLink(s) })).join('')}</div>`,
  { tone: 'ink', id: 'sh-pick', labelledby: 'sh-pick-h', backdrop: backdrop('wall-mural-wide', 'deep') })
  + band(`<div class="sh-head"><div>${kicker('The crate')}${dh('Shop By', 'Category', { id: 'sh-crate-h' })}</div>
    <p class="lede" data-reveal>Flip through the crate. Each sleeve opens that shelf of your store’s live menu, ready to add to your cart.</p></div>
    ${crate()}
    <div class="sh-crate__foot" data-reveal>${menuBtn('all', 'Shop all products', { kind: 'ghost' })}<a class="tlink sh-tap" href="${href('/brands/')}">Brands we carry${icon('arrow')}</a></div>`,
  { tone: 'night', lit: true, spot: true, sheet: true, id: 'sh-crate', labelledby: 'sh-crate-h', lx: '20%', ly: '10%', cls: 'sh-lift', after: floatObj('obj-spraycan', { style: 'right:3%;bottom:-60px;width:min(130px,13vw)', depth: 0.14, sizes: '160px' }) })
  + band(tickets(`${kicker('Specials')}${dh('Deals at', 'Every Store', { size: 'md', id: 'sh-deals-h' })}
      <p class="sp-b__lede" data-reveal>Each store posts its own specials on its live menu. Pick a counter and see today’s deals.</p>
      ${btn('All deals by store', '/deals/', { kind: 'ghost', size: 'sm' })}`),
  { tone: 'slate', id: 'sh-deals', labelledby: 'sh-deals-h', cls: 'sp-band' })
  // the heading sits above the record, so the record's column stands about as tall as the five steps beside it (the
  // record used to float mid-column beside the heading and the steps); phones keep heading, steps, then the record
  + band(`<div class="sh-steps">
    <div class="sh-steps__deck">${kicker('How it works')}${dh('Order', 'Ahead', { id: 'sh-steps-h' })}
      <div class="sh-steps__rec" data-reveal>${vinyl({ name: 'shop', cls: 'sh-vinyl' })}<p class="sh-steps__cap">Side A: five steps from the couch to the counter</p></div></div>
    <div class="sh-steps__words">${tracklist(steps())}
      <div class="btns sh-steps__cta" data-reveal>${menuBtn('all', 'Start an order')}${btn('How to order', '/how-to-order/', { kind: 'ghost' })}</div></div>
  </div>`, { tone: 'mint', id: 'sh-steps', labelledby: 'sh-steps-h', lx: '20%', ly: '10%' })
  + band(faqBlock(['Any Questions?', "We've Got Answers"], faqs, { id: 'sh-faq-h', kicker: "It's Simple", text: 'Ordering, pickup, payment and ID, straight from our store FAQs.', cta: btn('Pickup details', '/pickup/', { kind: 'ghost', size: 'sm' }) }),
    { tone: 'ink', lit: true, spot: true, id: 'sh-faq', labelledby: 'sh-faq-h', lx: '12%', ly: '20%' })
  + signUp();
  return {
    path: '/shop/', type: 'shop', crumbs, main,
    title: 'Shop Online and Order Ahead for Pickup | Capital District Cannabis',
    description: 'Shop the live menu of your Capital District Cannabis store in Albany, Clifton Park or Schenectady, NY. Order ahead and pick up at the counter with your 21+ ID.',
    jsonld: [faqLd(faqs)],
  };
}

// ---------------------------------------------------------------- /deals/ (NEW) ----------
function deals() {
  const crumbs = [HOME, { label: 'Deals', href: '/deals/' }];
  const albany = storeById('albany');
  const dealMod = need(capPage('/location/albany').modules.find((m) => m.blocks.some((b) => b.t === 'h2' && /Deals & Specials/.test(b.text))), 'the Albany deals module');
  const dealH2 = dealMod.blocks.find((b) => b.t === 'h2').text;
  const dealPs = need(dealMod.blocks.filter((b) => b.t === 'p'), 'Albany deals paragraphs');
  const dealBtn = need(dealMod.blocks.find((b) => b.t === 'btn'), 'Albany deals button');
  const promo = ['clifton-park', 'schenectady'].map((id) => ({ s: storeById(id), f: faqOf('/location/' + id, /loyalty program or specials/) }));
  const loy = need(capPage('/loyalty-program').modules.find((m) => m.blocks.some((b) => b.t === 'h2' && /Rewards/.test(b.text))), 'the loyalty module');
  const loyH2 = loy.blocks.find((b) => b.t === 'h2').text;
  const loyImg = loy.blocks.find((b) => b.t === 'img');
  const loyFaq = faqOf('/visit-us', /loyalty or rewards program/);
  const idFaq = faqOf('/location/clifton-park', /^Do I need an ID/);
  const limits = faqOf('/location/albany', /^How much cannabis can I buy/);
  const [h2a, ...h2b] = dealH2.split(' Deals');

  const main = pageHero({
    kicker: 'Deals & specials', title: ['Deals &', 'Specials'], img: 'wall-mural-wide', crumbs, sticker: 'Three stores', cls: 'sh-ph',
    lede: 'Every store runs its own specials on its live menu. Pick your counter and see today’s deals, then stack points with the loyalty program.',
    ctas: menuBtn('specials', 'Shop specials') + btn('Loyalty program', '/loyalty-program/', { kind: 'ghost' }),
  })
  + band(tickets(`${kicker('Pick your counter')}${dh('Today’s', 'Specials', { size: 'md', id: 'sh-tix-h' })}
      <p class="sp-b__lede" data-reveal>Tear off a ticket. Each one opens that store’s specials on the live menu, with its own prices and its own cart.</p>
      <p class="sh-note" data-reveal>${icon('bag')}<span>${esc(brand.separateCarts)}</span></p>`),
  { tone: 'night', lit: true, spot: true, id: 'sh-tix', labelledby: 'sh-tix-h', lx: '70%', ly: '0%', cls: 'sh-lift sp-band', after: floatObj('obj-spraycan', { style: 'right:4%;bottom:-100px;width:min(110px,10vw)', depth: 0.14, sizes: '160px' }) })
  + band(readLayout(
    `<figure class="sh-read__photo" data-tilt>${img(albany.photo, { alt: albany.photoAlt, sizes: '(min-width: 900px) 36vw, 92vw' })}<figcaption>${bullet(albany)}<span>${esc(albany.street)}, ${esc(albany.city)}</span></figcaption></figure>
     ${srcTag('From the Albany store page')}
     <div class="btns">${shopAt(albany, 'specials', dealBtn.text, { size: false })}</div>`,
    `${kicker(albany.city)}${dh(h2a, 'Deals' + h2b.join(' Deals'), { size: 'md', id: 'sh-alb-h' })}
     ${dealPs.map((p) => `<p>${capHtml(p.html || esc(p.text))}</p>`).join('')}`)
  + `<div class="sh-quotes">${promo.map(({ s, f }, i) => `<figure class="sh-quote" data-reveal style="--i:${i}">
      <span class="sh-quote__who">${bullet(s)}<span>From the ${esc(s.city)} store FAQ</span></span>
      <p class="sh-quote__q">${esc(f.q)}</p>
      <blockquote>${capHtml(f.html) || `<p>${esc(f.a)}</p>`}</blockquote>
      <figcaption>${shopAt(s, 'specials', `Shop ${s.city} Deals`, { aria: `Shop ${s.city} deals` })}</figcaption>
    </figure>`).join('')}</div>`,
  { tone: 'ink', id: 'sh-alb', labelledby: 'sh-alb-h' })
  + band(`<div class="sh-loyal">
    <div class="sh-loyal__media" data-reveal>${loyImg ? mediaImg(loyImg.src, { alt: 'Customers at the Capital District Cannabis counter under the round badge', sizes: '(min-width: 900px) 46vw, 92vw' }) : img('store-albany', { decorative: true })}<span class="sh-loyal__badge">${icon('gift')}<span>Earn and redeem at all three stores</span></span></div>
    <div class="sh-loyal__words" data-reveal style="--i:1">${kicker('Loyalty tie-in')}
      <h2 class="dh dh--md" id="sh-loy-h" data-reveal="stretch"><span class="dh__a">${esc(loyH2.split(' with ')[0])}</span>${loyH2.includes(' with ') ? ` <span class="sh-dh2__sub">${esc('with ' + loyH2.split(' with ').slice(1).join(' with '))}</span>` : ''}</h2>
      ${loy.blocks.filter((b) => b.t === 'p').map((p) => `<p>${capHtml(p.html || esc(p.text))}</p>`).join('')}
    </div>
    <div class="sh-loyal__more" data-reveal style="--i:2"><p class="sh-loyal__faq"><b>${esc(loyFaq.q)}</b> ${esc(loyFaq.a)}</p>
      <div class="btns">${btn('Join the loyalty program', '/loyalty-program/')}${menuBtn('specials', 'Shop specials', { kind: 'ghost' })}</div></div>
  </div>`, { tone: 'mint', id: 'sh-loy', labelledby: 'sh-loy-h', lx: '85%', ly: '15%' })
  + band(`<div class="sh-head"><div>${kicker('Fine print')}${dh('Before you', 'Stack Deals', { size: 'md', id: 'sh-fine-h', cls: 'dh--inline' })}</div></div>
    <div class="sh-fine">
      <div class="sh-fine__item" data-reveal style="--i:0">${icon('id')}<h3>21+ with valid ID</h3><p>${esc(bare(idFaq.a))}</p>${srcTag('Store FAQ')}</div>
      <div class="sh-fine__item" data-reveal style="--i:1">${icon('leaf')}<h3>Purchase limits</h3>${capHtml(limits.html) || `<p>${esc(limits.a)}</p>`}${srcTag('Store FAQ')}</div>
      <div class="sh-fine__item" data-reveal style="--i:2">${icon('pin')}<h3>Deals are per store</h3><p>Each store has its own specials page on the live menu, and inventory can vary by store. Check your store’s specials before you head out.</p></div>
    </div>`, { tone: 'slate', id: 'sh-fine', labelledby: 'sh-fine-h', tight: true })
  + signUp();
  return {
    path: '/deals/', type: 'deals', crumbs, main,
    title: 'Dispensary Deals & Specials by Store | Capital District Cannabis',
    description: 'See today’s specials at Capital District Cannabis in Albany, Clifton Park and Schenectady, NY. Each store posts its own deals on its live menu.',
  };
}

// ---------------------------------------------------------------- /how-to-order/ (NEW) ----------
function howToOrder() {
  const crumbs = [HOME, SHOP, { label: 'How to order', href: '/how-to-order/' }];
  const list = steps({ more: true });
  const idFaq = faqOf('/location/clifton-park', /^Do I need an ID/);
  const faqs = [
    faqOf('/visit-us', /^Can I place an online order/),
    { q: 'When do pre-orders close?', a: `Pre-orders close 30 minutes before closing. Monday to Saturday the stores are open 9 AM to 9 PM, so the live menu takes pre-orders until ${ORDER_UNTIL}. On Sunday the stores are open 10 AM to 6 PM, so pre-orders close at ${ORDER_UNTIL_SUN}.` },
    { q: 'Can I move my cart to another store?', a: brand.separateCarts },
    faqOf('/visit-us', /^Do all of your locations offer the same menu/),
    faqOf('/location/albany', /^What forms of payment/),
    idFaq,
    faqOf('/location/albany', /^Can I shop for weed if I'm from out of state/),
  ];
  const main = pageHero({
    kicker: 'How to order', title: ['How to', 'Order'], spray: 'ahead', img: 'turntable', crumbs, sticker: 'Five steps', cls: 'sh-ph',
    lede: 'Five steps from the couch to the counter: pick your store, browse the live menu, fill your cart, check out for pickup and bring your ID.',
    ctas: menuBtn('all', 'Start an order') + btn('Pickup details', '/pickup/', { kind: 'ghost' }),
  })
  + band(`<div class="sh-head"><div>${kicker('Step one')}${dh('Where Ya', 'Shopping?', { id: 'sh-who-h' })}</div>
    <p class="lede" data-reveal>Your store decides the menu, the specials and the cart. This is the one you are shopping right now.</p></div>
    ${nowShopping({ cta: 'Shop this store' })}`,
  { tone: 'ink', id: 'sh-who', labelledby: 'sh-who-h', backdrop: backdrop('store-mural', 'deep') })
  + band(`<div class="sh-howto">
    <div class="sh-howto__aside" data-reveal>${kicker('The track list')}${dh('Side A', 'Five Steps', { size: 'md', id: 'sh-how-h' })}
      <p class="sh-howto__now">${icon('clock')}<span>Right now at <b data-store-name>${esc(stores[0].name)}</b>: ${statusCurrent()}</span></p>
      ${vinyl({ name: 'order', cls: 'sh-vinyl sh-vinyl--aside' })}</div>
    <div class="sh-howto__list">${tracklist(list)}</div>
  </div>`, { tone: 'night', lit: true, spot: true, sheet: true, id: 'sh-how', labelledby: 'sh-how-h', lx: '15%', ly: '15%' })
  + band(`<div class="sh-head"><div>${kicker('What you need')}${dh('Bring', 'These', { size: 'md', id: 'sh-need-h' })}</div>
    <p class="lede" data-reveal>Four things make pickup quick. Everything here comes from our store FAQs and the live menu.</p></div>
    <div class="sh-need">
      <div class="sh-need__card" data-reveal style="--i:0"><span class="sh-need__ic">${icon('id')}</span><h3 class="sh-need__t">21+ photo ID</h3><p>${esc(bare(idFaq.a))}</p></div>
      <div class="sh-need__card" data-reveal style="--i:1"><span class="sh-need__ic">${icon('cash')}</span><h3 class="sh-need__t">A way to pay</h3><p>We accept ${esc(brand.payment)} at all three stores.</p></div>
      <div class="sh-need__card" data-reveal style="--i:2"><span class="sh-need__ic">${icon('clock')}</span><h3 class="sh-need__t">Time to spare</h3><p>Pre-orders close 30 minutes before closing: ${ORDER_UNTIL} Monday to Saturday, ${ORDER_UNTIL_SUN} on Sunday.</p></div>
      <div class="sh-need__card" data-reveal style="--i:3"><span class="sh-need__ic">${icon('bag')}</span><h3 class="sh-need__t">The right store</h3><p>${esc(brand.separateCarts)}</p></div>
    </div>`, { tone: 'mint', id: 'sh-need', labelledby: 'sh-need-h', lx: '20%', ly: '0%', tight: true })
  + band(`<div class="sh-head"><div>${kicker('Step two')}${dh('Pick a', 'Shelf', { id: 'sh-shelf-h' })}</div>
    <p class="lede" data-reveal>Your next click lands on products. Every sleeve opens that category on your store’s live menu.</p></div>
    ${crate()}
    <div class="sh-crate__foot" data-reveal>${menuBtn('all', 'Shop all products')}${menuBtn('specials', 'Specials', { kind: 'ghost' })}</div>`,
  { tone: 'night', lit: true, spot: true, id: 'sh-shelf', labelledby: 'sh-shelf-h', lx: '80%', ly: '10%', cls: 'sh-lift', after: floatObj('obj-bud-a', { cls: 'sh-float-dn', style: 'left:3%;bottom:-100px;width:min(170px,16vw)', depth: 0.16, sizes: '180px' }) })
  + band(faqBlock(['Any Questions?', "We've Got Answers"], faqs, { id: 'sh-faq-h', text: 'Ordering ahead, store by store.', cta: menuBtn('all', 'Start an order', { size: 'sm' }) }),
    { tone: 'ink', id: 'sh-faq', labelledby: 'sh-faq-h' })
  + signUp();
  const howLd = {
    '@context': 'https://schema.org', '@type': 'HowTo', name: 'How to order ahead for pickup at Capital District Cannabis',
    step: list.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.text })),
  };
  return {
    path: '/how-to-order/', type: 'how-to-order', crumbs, main,
    title: 'How to Order Cannabis Online for Pickup | Capital District Cannabis',
    description: 'Order ahead at Capital District Cannabis in five steps: pick your store, browse the live menu, add to your cart, check out for pickup and bring your 21+ ID.',
    jsonld: [howLd, faqLd(faqs)],
  };
}

// ---------------------------------------------------------------- /pickup/ (NEW) ----------
function pickup() {
  const crumbs = [HOME, SHOP, { label: 'Pickup', href: '/pickup/' }];
  const anyLoc = faqOf('/visit-us', /^Can I place an online order/);
  const idFaq = faqOf('/location/clifton-park', /^Do I need an ID/);
  const pay = faqOf('/location/albany', /^What forms of payment/);
  const deliv = ['clifton-park', 'schenectady'].map((id) => faqOf('/location/' + id, /pickup or weed delivery/));
  const limits = faqOf('/location/albany', /^How much cannabis can I buy/);
  const returns = faqOf('/visit-us', /^Can I return or exchange/);
  const faqs = [anyLoc, idFaq, pay, deliv[0], returns];
  const pickSteps = [
    { title: 'Head to the store you picked', icon: 'route', text: 'Your order is prepared at the store you chose at checkout, so double-check the address below before you go.' },
    { title: 'Show your ID at the counter', icon: 'id', text: 'A valid government-issued photo ID that shows you are 21 or older. New York requires it for every adult-use purchase.' },
    { title: 'Pay your way', icon: 'cash', text: `All three stores accept ${brand.payment}.` },
    { title: 'Collect your order', icon: 'bag', text: 'Your budtender hands it over. Questions about a product? Ask before you head out.' },
  ];
  const main = pageHero({
    kicker: 'In-store pickup', title: ['Pickup at', 'the Counter'], img: 'store-albany', crumbs, sticker: '21+ with ID', cls: 'sh-ph',
    lede: 'Ordered ahead? Here is what to bring and what happens when you pull up to Albany, Clifton Park or Schenectady.',
    ctas: menuBtn('all', 'Start an order') + btn('How to order', '/how-to-order/', { kind: 'ghost' }),
  })
  + band(`<div class="sh-head"><div>${kicker('What to bring')}${dh('Pocket', 'Check', { id: 'sh-bring-h' })}</div>
    <p class="lede" data-reveal>Two things in your pocket and the right address. That is the whole list.</p></div>
    <div class="sh-bring">
      <div class="sh-bring__card glass" data-tilt data-reveal style="--i:0"><span class="sh-bring__ic">${icon('id')}</span><h3>Your 21+ ID</h3><p>${esc(bare(idFaq.a))}</p></div>
      <div class="sh-bring__card glass" data-tilt data-reveal style="--i:1"><span class="sh-bring__ic">${icon('cash')}</span><h3>A way to pay</h3><p>${esc(bare(pay.a))}</p></div>
      <div class="sh-bring__card glass" data-tilt data-reveal style="--i:2"><span class="sh-bring__ic">${icon('pin')}</span><h3>The right store</h3><p>${esc(bare(anyLoc.a))}</p></div>
    </div>`,
  { tone: 'night', lit: true, spot: true, id: 'sh-bring', labelledby: 'sh-bring-h', backdrop: backdrop('m-2024-05-image-1', 'soft'), lx: '75%', ly: '10%' })
  // four short steps: the heading and the pull quote run across the top and the steps sit two to a row beneath, so no
  // column stands half empty (sh-howto--wide in shop.css)
  + band(`<div class="sh-howto sh-howto--wide">
    <div class="sh-howto__aside" data-reveal>${kicker('At the counter')}${dh('Side B', 'Pickup', { size: 'md', id: 'sh-pk-h' })}
      <figure class="sh-pull"><span class="sh-pull__k">${icon('mic')}Straight from our store FAQs</span><p class="sh-pull__q">${esc(deliv[0].q)}</p><blockquote>${esc(deliv[0].a)}</blockquote><figcaption>Clifton Park and Schenectady store pages</figcaption></figure></div>
    <div class="sh-howto__list">${tracklist(pickSteps, { side: 'B', cls: 'tracks--2' })}</div>
  </div>`, { tone: 'ink', sheet: true, id: 'sh-pk', labelledby: 'sh-pk-h' })
  + band(`<div class="sh-limits">
    <div class="sh-limits__head">${kicker('Know your limits')}${dh('Per Day', 'in New York', { size: 'md', id: 'sh-lim-h' })}</div>
    <p class="sh-limit" data-reveal><b>3 oz</b><span>of flower</span></p>
    <p class="sh-limit" data-reveal style="--i:1"><b>24 g</b><span>of concentrates</span></p>
    <div class="sh-limits__txt" data-reveal style="--i:2">${capHtml(limits.html) || `<p>${esc(limits.a)}</p>`}${srcTag('From our store FAQs')}</div>
  </div>`, { tone: 'mint', id: 'sh-lim', labelledby: 'sh-lim-h', lx: '80%', ly: '0%' })
  + band(`<div class="sh-head"><div>${kicker('Store by store')}${dh('Pickup', 'Notes', { id: 'sh-notes-h' })}</div>
    <p class="lede" data-reveal>Address, hours, phone and directions for each counter. Open daily, with pre-orders closing 30 minutes before close.</p></div>
    <div class="sh-stores">${stores.map((s, i) => storeTile(s, i, {
    cta: shopAt(s, 'all', 'Shop this store', { aria: `Shop the ${s.city} menu` }) + dirBtn(s),
    links: infoLink(s),
    extra: `<p class="scard__addr">${icon('phone')}<a href="tel:${s.tel}">${esc(s.phone)}</a></p><p class="scard__addr sh-scard__near">${icon('route')}<span>${esc(s.near[0].toUpperCase() + s.near.slice(1))}</span></p>${hoursTable(s)}`,
  })).join('')}</div>`,
  { tone: 'night', lit: true, spot: true, sheet: true, id: 'sh-notes', labelledby: 'sh-notes-h', lx: '50%', ly: '0%', cls: 'sh-lift', after: floatObj('obj-boombox', { style: 'right:3%;bottom:-90px;width:min(220px,18vw)', depth: 0.12, sizes: '240px' }) })
  + band(faqBlock(['Any Questions?', "We've Got Answers"], faqs, { id: 'sh-faq-h', text: 'Pickup, ID, payment and returns, from our store FAQs.', cta: menuBtn('all', 'Start an order', { size: 'sm' }) }),
    { tone: 'ink', id: 'sh-faq', labelledby: 'sh-faq-h' })
  + signUp();
  return {
    path: '/pickup/', type: 'pickup', crumbs, main,
    title: 'In-Store Pickup: What to Bring | Capital District Cannabis',
    description: 'Picking up a pre-order in Albany, Clifton Park or Schenectady, NY? Bring a valid government-issued photo ID (21+). We accept Cash, Debit, and Dutchie Pay.',
    jsonld: [...stores.map(storeLd), faqLd(faqs)],
  };
}

// ---------------------------------------------------------------- /brands/ (existing) ----------
function brandsPage() {
  const crumbs = [HOME, SHOP, { label: 'Brands We Carry', href: '/brands/' }];
  const c = brandsCap();
  const pg = capPage('/brands');
  const [a, ...b] = c.h2.split(' ');
  const sameMenu = faqOf('/visit-us', /^Do all of your locations offer the same menu/);
  const partners = PARTNERS.map(partner);
  const main = pageHero({
    kicker: 'On the shelf', title: [a, b.join(' ')], img: 'm-2025-10-img-6712', crumbs, sticker: `${menuBrands().length} brands`, cls: 'sh-ph',
    lede: 'Our brand partners up top, then an A to Z of every brand the three live menus listed, each one linked straight to that brand’s shelf.',
    ctas: menuBtn('all', 'Shop all products') + btn('Our brand partners', '/our-brands/', { kind: 'ghost' }),
  })
  + band(`<div class="sh-head"><div>${kicker('Featured partners')}${dh('Brand', 'Partners', { size: 'md', id: 'sh-bp-h' })}</div>
    <p class="lede" data-reveal>Two New York brands with their own pages: the story, the product line and where to buy.</p></div>
    <div class="sh-partners">${partners.map((p, i) => partnerTile(p, i, { logo: c.logos[i] })).join('')}</div>`,
  { tone: 'ink', id: 'sh-bp', labelledby: 'sh-bp-h' })
  + band(`<div class="sh-head"><div>${kicker('A to Z')}${dh('Every Brand', 'on the Menus', { id: 'sh-az-h' })}</div>
    <p class="lede" data-reveal>Filter by letter, then tap a store letter to open that brand on the store’s live menu.</p></div>
    ${brandDirectory()}`,
  { tone: 'night', lit: true, spot: true, sheet: true, id: 'sh-azb', labelledby: 'sh-az-h', lx: '85%', ly: '5%', cls: 'sh-lift', after: floatObj('obj-bud-b', { style: 'right:4%;bottom:-40px;width:min(130px,13vw)', depth: 0.16, sizes: '140px' }) })
  + band(`<div class="sh-same">
    <div class="fitcol" data-reveal>${kicker('Store to store')}<h2 class="sh-same__q" id="sh-same-h" style="--fit:${fitEm(sameMenu.q)}">${esc(sameMenu.q)}</h2></div>
    <div class="sh-same__a" data-reveal style="--i:1">${capHtml(sameMenu.html) || `<p>${esc(sameMenu.a)}</p>`}<div class="btns">${menuBtn('all', 'Shop your store')}${menuBtn('specials', 'Specials', { kind: 'ghost' })}</div></div>
  </div>`, { tone: 'mint', id: 'sh-same', labelledby: 'sh-same-h', lx: '15%', ly: '0%', tight: true })
  + signUp();
  return {
    path: '/brands/', type: 'brands', crumbs, main,
    title: pg.title,
    description: pg.description || 'Brands We Carry at Capital District Cannabis: featured partners Ayrloom and Hashtag Honey, plus an A to Z of the brands on our Albany, Clifton Park and Schenectady menus.',
  };
}

// ---------------------------------------------------------------- /our-brands/ (existing) ----------
function ourBrands() {
  const crumbs = [HOME, { label: 'Our Brands', href: '/our-brands/' }];
  const pg = capPage('/our-brands');
  const h2 = need(pg.modules.flatMap((m) => m.blocks).find((b) => b.t === 'h2'), '/our-brands h2').text;
  const logos = pg.modules.flatMap((m) => m.blocks).filter((b) => b.t === 'img');
  const partners = PARTNERS.map(partner);
  const [a, ...b] = h2.split(' ');
  const main = pageHero({
    kicker: 'Brand partners', title: ['Our', 'Brands'], img: 'm-2025-03-clifton-park-interior', crumbs, sticker: 'Made in New York', cls: 'sh-ph',
    lede: 'The New York brands we feature, with the story behind each one and a straight line to their shelf at all three stores.',
    ctas: btn('Brands we carry, A to Z', '/brands/') + menuBtn('all', 'Shop all products', { kind: 'ghost' }),
  })
  + band(`<div class="sh-head"><div>${kicker('Now on our shelves')}${dh(a, b.join(' '), { id: 'sh-ob-h', cls: 'dh--inline' })}</div></div>
    <div class="sh-stories">${partners.map((p, i) => partnerTile(p, i, { long: true, logo: logos[i] })).join('')}</div>`,
  { tone: 'ink', id: 'sh-ob', labelledby: 'sh-ob-h', backdrop: backdrop('wall-mural', 'deep') })
  + band(`<div class="sh-head"><div>${kicker('Where to buy')}${dh('Shop by', 'Store', { size: 'md', id: 'sh-wb-h' })}</div>
    <p class="lede" data-reveal>Each button opens the brand’s page on that store’s live menu.</p></div>
    <div class="sh-matrix">${partners.map((p, i) => `<div class="sh-matrix__row" data-reveal style="--i:${i}"><p class="sh-matrix__name">${esc(p.name)}</p>${shopNowAt(p.slug, p.name, { label: 'Shop at', kind: 'ghost' })}</div>`).join('')}</div>`,
  { tone: 'mint', id: 'sh-wb', labelledby: 'sh-wb-h', lx: '80%', ly: '10%', tight: true })
  + signUp();
  return {
    path: '/our-brands/', type: 'brands', crumbs, main,
    title: pg.title,
    description: pg.description || 'Our Brands at Capital District Cannabis: the stories behind Ayrloom and Hashtag Honey, two New York brands on our shelves in Albany, Clifton Park and Schenectady.',
  };
}

// ---------------------------------------------------------------- /our-brands/<brand>/ (existing) ----------
const HERO_ART = { ayrloom: 'cat-beverages', 'hashtag-honey': 'cat-flower' }; // category illustration, mood only
function brandDetail(slug) {
  const p = partner(slug);
  const { pg, top, name } = p;
  const crumbs = [HOME, { label: 'Our Brands', href: '/our-brands/' }, { label: name, href: p.path }];
  const M = pg.modules;
  const byH2 = (re) => M.find((m) => m.blocks.some((b) => b.t === 'h2' && re.test(b.text)));
  const reviews = need(byH2(/Reviews$/i), `${slug} reviews module`);
  const line = need(byH2(/Product Line$/i), `${slug} product line module`);
  const gallery = M.find((m) => m.kind === 'gallery');
  const faqMod = need(M.find((m) => m.kind === 'accordion'), `${slug} FAQ module`);
  const where = need(byH2(/^Where to Buy/i), `${slug} where-to-buy module`);
  const faqs = real(faqMod.blocks.filter((b) => b.t === 'faq'), p.path);
  const site = top.blocks.find((b) => b.t === 'btn' && !/^shop now$/i.test(b.text));
  const h2 = (m) => m.blocks.find((b) => b.t === 'h2').text;
  const split2 = (t) => { const w = t.split(' '); const k = Math.ceil(w.length / 2); return [w.slice(0, k).join(' '), w.slice(k).join(' ')]; };
  const lineItems = line.blocks.filter((b) => b.t === 'li');
  const lineP = line.blocks.filter((b) => b.t === 'p');
  const pics = gallery ? gallery.blocks.filter((b) => b.t === 'img') : [];
  const whereP = where.blocks.filter((b) => b.t === 'p');
  const whereKick = whereP.length > 1 ? whereP[0].text : '';
  const whereText = whereP[whereP.length - 1];
  const dirLabel = (where.blocks.find((b) => b.t === 'btn') || {}).text || 'Get Directions';

  const productLine = lineItems.length
    ? `${tracklist(lineItems.map((li) => ({ title: (li.text.match(/^(.+?)\s(?:are|include|round out)\b/) || [, li.text.split(' ').slice(0, 3).join(' ')])[1], text: capHtml(li.html || esc(li.text)), html: true })))}
       ${lineP.map((x) => `<p class="sh-line__more" data-reveal>${capHtml(x.html || esc(x.text))}</p>`).join('')}`
    : `<div class="sh-line__cols">${lineP.map((x, i) => `<div class="sh-line__col" data-reveal style="--i:${i}"><span class="sh-line__no">A${i + 1}</span><p>${capHtml(x.html || esc(x.text))}</p></div>`).join('')}</div>`;

  const main = pageHero({
    kicker: p.kick || 'Now Available at Capital District Cannabis', title: name, img: HERO_ART[slug] || 'wall-mural', crumbs, cls: 'sh-ph',
    lede: pg.description || '',
    ctas: shopNowAt(slug, name, { cls: 'sh-shopat--hero' }),
  })
  // the logo is slapped across the hero seam. A band that ends with a cut-out (.float) hanging up gets that seam drawn
  // inside it, one layer under its objects (build.mjs seams(), dv.css .dv-in), so the empty .float here puts the seam
  // under the slap (z-index 5 in shop.css) instead of over it
  + band(`<div class="sh-bstory">
    <div class="sh-slap" data-reveal><div class="sh-slap__in" data-tilt>${mediaImg(p.logo.src, { alt: p.logo.alt || `${name} logo`, sizes: '(min-width: 900px) 340px, 60vw' })}</div></div>
    <div class="sh-bstory__words" data-reveal style="--i:1">${kicker('The story')}
      ${p.intro ? `<p class="sh-bstory__lede">${capHtml(p.intro.html || esc(p.intro.text))}</p>` : ''}
      <div class="btns">${site ? btn(site.text, site.href, { kind: 'ghost' }) : ''}<a class="tlink sh-tap" href="#sh-where">Where to buy${icon('arrow')}</a></div>
    </div>
  </div>`, { tone: 'ink', cls: 'sh-bstory-band', id: 'sh-story', after: '<div class="float sh-seam-under" style="top:0" aria-hidden="true"></div>' })
  + band(`<div class="sh-head"><div>${kicker('Liner notes')}${dh(...split2(h2(reviews)), { size: 'md', id: 'sh-rv-h', cls: 'dh--inline' })}</div></div>
    <div class="sh-notes">${reviews.blocks.filter((b) => b.t === 'p').map((x, i) => `<div class="sh-noteq glass" data-tilt data-reveal style="--i:${i}"><span class="sh-noteq__ic">${icon('star')}</span><p>${capHtml(x.html || esc(x.text))}</p></div>`).join('')}</div>`,
  { tone: 'night', lit: true, spot: true, sheet: true, id: 'sh-rv', labelledby: 'sh-rv-h', lx: '75%', ly: '10%', backdrop: pics[0] ? `${mediaImg(pics[0].src, { decorative: true, cls: 'sh-bd', sizes: '100vw' })}<span class="sh-bd-shade sh-bd-shade--deep"></span>` : '' })
  + band(`<div class="sh-head"><div>${kicker('The lineup')}${dh(...split2(h2(line)), { size: 'md', id: 'sh-ln-h', cls: 'dh--inline' })}</div></div>
    ${productLine}
    ${shopNowAt(slug, name, { cls: 'sh-shopat--line' })}`,
  { tone: 'mint', id: 'sh-ln', labelledby: 'sh-ln-h', lx: '85%', ly: '0%' })
  + (pics.length ? band(`<div class="sh-gal">${pics.map((x, i) => `<figure class="sh-frame" data-reveal style="--i:${i};--r:${[-2.4, 1.8, -1.2, 2.2][i % 4]}deg"><span class="sh-frame__in" data-tilt>${mediaImg(x.src, { alt: x.alt || '', sizes: '(min-width: 900px) 24vw, 46vw' })}</span></figure>`).join('')}</div>`,
    { tone: 'slate', id: 'sh-gal', cls: 'sh-gal-band' }) : '')
  // the record only beside a list of four or more: beside three short answers the column (heading, the three store
  // buttons and the record) stood far taller than the list (parts.mjs faqSection: the record is off where the column
  // already holds links taller than the list)
  + band(faqBlock(split2(h2(faqMod)), faqs, { id: 'sh-faq-h', kicker: 'Good to know', cta: shopNowAt(slug, name, { label: 'Shop', kind: 'ghost' }), vinyl: faqs.length >= 4 }),
    { tone: 'ink', id: 'sh-faq', labelledby: 'sh-faq-h' })
  + band(`<div class="sh-head"><div>${kicker(whereKick || brand.name)}${dh(...split2(h2(where)), { size: 'md', id: 'sh-where-h' })}</div>
    ${whereText ? `<p class="lede" data-reveal>${capHtml(whereText.html || esc(whereText.text))}</p>` : ''}</div>
    <div class="sh-stores">${stores.map((s, i) => storeTile(s, i, { cta: shopAt(s, 'brands/' + slug, `Shop ${name}`, { aria: `Shop ${name} at ${s.city}` }) + dirBtn(s, dirLabel), links: infoLink(s) })).join('')}</div>`,
  { tone: 'night', lit: true, spot: true, sheet: true, id: 'sh-where', labelledby: 'sh-where-h', lx: '20%', ly: '0%', cls: 'sh-lift', after: floatObj('obj-bud-a', { style: 'right:3%;bottom:-100px;width:min(160px,15vw)', depth: 0.14, sizes: '180px' }) })
  + signUp();
  return {
    path: p.path, type: 'brand', crumbs, main,
    title: pg.title, description: pg.description || `${name} at Capital District Cannabis.`,
    jsonld: faqs.length ? [faqLd(faqs)] : [],
  };
}
