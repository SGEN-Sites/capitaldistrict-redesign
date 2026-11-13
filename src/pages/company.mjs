// company.mjs: the company lane. Classes are prefixed co- and styled in src/styles/company.css.
//   existing URLs (the live site's words, verbatim, from capture.mjs): /about/ /loyalty-program/ /careers/ /contact/ /terms-conditions/
//   new URLs (written from site.mjs and capture facts only, for client approval): /faq/ /reviews/ /sitemap/ and 404.html
// Every captured string these pages depend on is looked up, never retyped. A missing one throws, and each existing page
// checks that the captured words it promises are really in its HTML (covered()), so a capture change cannot silently
// drop real content.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  pageHero, band, dh, kicker, btn, menuBtn, sticker, storeCard, vinyl, floatObj, faqList, tracklist, glassCard, flyer,
  richHtml, signUp, bullet, statusLine, esc, href, img, imgInfo, icon, menuLink, slug, asset,
} from '../lib/parts.mjs';
import { orgLd, storeLd } from '../lib/layout.mjs';
import { brand, stores, menuUrl } from '../content/site.mjs';
import { page as cap, allPages, text as plain } from '../lib/capture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---------------------------------------------------------------- capture helpers (fail closed)
const need = (p) => { const x = cap(p); if (!x) throw new Error(`company.mjs: the capture has no page ${p}`); return x; };
const blocksOf = (p, kind) => need(p).modules.filter((m) => !kind || m.kind === kind).flatMap((m) => m.blocks);
function pick(bs, t, re) {
  const b = bs.find((x) => x.t === t && (!re || re.test(x.text || '')));
  if (!b) throw new Error(`company.mjs: no captured <${t}> matching ${re}`);
  return b;
}
function frag(src, re) { const m = String(src).match(re); if (!m) throw new Error(`company.mjs: captured fragment missing ${re}`); return m[0]; }
const short = (t) => String(t || '').replace(/\s+[-–]\s+Capital District Cannabis\b[\s\S]*$/i, '').trim();
// captured answer HTML without the theme's empty paragraphs (markup only, never words)
const tidy = (h) => String(h || '').replace(/<p>(?:\s|&nbsp;|&#160;| )*<\/p>/g, '').replace(/<p>\s*$/, '').trim();
const asBlock = (h, a) => { const t = tidy(h); if (!t) return `<p>${esc(a)}</p>`; return /^<(p|ul|ol|h\d|blockquote)\b/.test(t) ? t : `<p>${t}</p>`; };
const LOREM = /\blorem\b|\bipsum\b|dolor sit|happy little bushes|\bmaecenas\b|\bnulla\b/i;
const nzLoose = (s) => plain(String(s)).replace(/[“”"‘’'`]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const nzStrict = (s) => String(s).replace(/\s+/g, ' ').trim();
function covered(main, texts, where) {
  const hay = nzLoose(main);
  const miss = texts.filter(Boolean).filter((t) => !hay.includes(nzLoose(t)));
  if (miss.length) throw new Error(`company.mjs ${where}: captured words missing from the page: ${miss.map((m) => `"${String(m).slice(0, 70)}"`).join(', ')}`);
}

// ---------------------------------------------------------------- small page helpers
const home = (label, p) => [{ label: 'Home', href: '/' }, { label, href: p }];
const rv = (i, extra = '') => ` data-reveal style="--i:${i}${extra ? ';' + extra : ''}"`;
const og = (id) => { const r = imgInfo(id); if (!r) return undefined; const f = r.files.find((x) => x.w >= 900) || r.files[r.files.length - 1]; return f.file; };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso) => { const [y, m, d] = String(iso || '').split('-').map(Number); return y && m && d ? `${MONTHS[m - 1]} ${d}, ${y}` : ''; };
const storeAt = (addr) => stores.find((s) => String(addr || '').toLowerCase().includes(s.street.toLowerCase().split(' ').slice(0, 2).join(' ')));
const veil = (mod = '') => `<span class="co-veil${mod ? ' co-veil--' + mod : ''}" aria-hidden="true"></span>`;
const backdrop = (id, mod = '', cls = '') => img(id, { decorative: true, sizes: '100vw', min: 1200, cls: `co-bg${cls ? ' ' + cls : ''}` }) + veil(mod);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// the live site's own outbound links, read from the capture
const referralUrl = () => pick(blocksOf('/loyalty-program', '5050'), 'btn', /^Sign Up$/).href; // "Sign Up" on /loyalty-program/
function googleReviewUrl() { // "Leave a Review" on every town page
  for (const p of allPages()) for (const m of p.modules) for (const b of m.blocks) if (b.t === 'btn' && /^leave a review$/i.test(b.text)) return b.href;
  throw new Error('company.mjs: no captured "Leave a Review" button');
}
// the policy's contact address is Cloudflare-obfuscated in the capture: data-cfemail is hex, byte 0 XORs the rest
const cfDecode = (h) => { const k = parseInt(h.slice(0, 2), 16); let s = ''; for (let i = 2; i < h.length; i += 2) s += String.fromCharCode(parseInt(h.slice(i, i + 2), 16) ^ k); return s; };
function policyEmail() {
  const raw = path.join(ROOT, 'audit/raw/terms-conditions.html');
  const DECODED = 'pasha@cdcwinc.com'; // both data-cfemail values in audit/raw/terms-conditions.html, decoded 2026-11-13
  if (!fs.existsSync(raw)) return DECODED; // a clone of the public repo has no raw capture
  const found = [...new Set([...fs.readFileSync(raw, 'utf8').matchAll(/data-cfemail="([0-9a-f]+)"/gi)].map((m) => cfDecode(m[1])))];
  if (found.length !== 1 || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(found[0])) throw new Error(`company.mjs: the policy email did not decode to one address (${found.join(', ')})`);
  return found[0];
}

// ---------------------------------------------------------------- FAQ: every captured question, de-duplicated
const FAQ_GROUPS = [
  { id: 'shopping', title: 'Shopping and ordering', icon: 'bag' },
  { id: 'id', title: 'ID and age', icon: 'id' },
  { id: 'payment', title: 'Payment', icon: 'cash' },
  { id: 'rules', title: 'New York rules and limits', icon: 'leaf' },
  { id: 'stores', title: 'Stores and hours', icon: 'pin' },
  { id: 'loyalty', title: 'Loyalty', icon: 'gift' },
  { id: 'products', title: 'Products and brands', icon: 'spark' },
];
function faqGroupOf(q, src) {
  const s = q.toLowerCase();
  if (/^\/our-brands\//.test(src)) return 'products';
  if (/loyalty|rewards/.test(s)) return 'loyalty';
  if (/payment/.test(s)) return 'payment';
  if (/\bid\b|what do i need to shop/.test(s)) return 'id';
  if (/how much cannabis|resident|out of state|licensed|unlicensed/.test(s)) return 'rules';
  if (/types of cannabis products/.test(s)) return 'products';
  if (/online order|pickup|delivery|same menu|return|help me find/.test(s)) return 'shopping';
  if (/located|areas|\bopen\b|medical or recreational|more than one/.test(s)) return 'stores';
  return null;
}
const srcRank = (p) => (p === '/' ? 0 : p === '/visit-us' ? 1 : p.startsWith('/location/') ? 2 + Math.max(0, stores.findIndex((s) => s.page === p + '/')) / 10 : p.startsWith('/our-brands/') ? 3 : 4);
function srcLabel(p) {
  if (p === '/') return 'Home page';
  const s = stores.find((x) => x.page === p + '/');
  if (s) return `${s.city} store page`;
  if (p.startsWith('/our-brands/')) return `${short(need(p).title)} brand page`;
  return `${short(need(p).title)} page`;
}
let FAQ_CACHE = null;
function collectFaqs() {
  if (FAQ_CACHE) return FAQ_CACHE;
  const pages = allPages().filter((p) => p.modules.some((m) => m.blocks.some((b) => b.t === 'faq')))
    .sort((a, b) => srcRank(a.path) - srcRank(b.path) || a.path.localeCompare(b.path));
  const items = []; const byQ = new Map(); const byA = new Map(); const dropped = []; const mergedQs = [];
  const k = (s) => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
  for (const p of pages) for (const m of p.modules) for (const b of m.blocks) {
    if (b.t !== 'faq') continue;
    if (LOREM.test(b.q) || LOREM.test(b.a)) { dropped.push(`${p.path}: ${b.q}`); continue; }
    const qk = k(b.q); const ak = k(b.a);
    let it = byQ.get(qk) || (ak.length > 80 ? byA.get(ak) : null); // same question, or the same long answer under another wording
    if (it && !byQ.has(qk)) { mergedQs.push(`${b.q} (${p.path}) into "${it.q}"`); byQ.set(qk, it); }
    if (!it) {
      const group = faqGroupOf(b.q, p.path);
      if (!group) throw new Error(`company.mjs: no FAQ group for "${b.q}" (${p.path})`);
      it = { q: b.q, group, variants: [] }; items.push(it); byQ.set(qk, it);
    }
    if (ak.length > 80) byA.set(ak, it);
    let v = it.variants.find((x) => k(x.a) === ak);
    if (!v) it.variants.push(v = { a: b.a, html: asBlock(b.html, b.a), srcs: [] });
    if (!v.srcs.some((x) => x.path === p.path)) v.srcs.push({ path: p.path, label: srcLabel(p.path) });
  }
  FAQ_CACHE = { items, dropped, mergedQs };
  return FAQ_CACHE;
}
// one answer, or each store's own answer under a small label when the same question was answered per store
const faqHtml = (it) => (it.variants.length === 1 ? it.variants[0].html
  : it.variants.map((v) => `<p class="co-src">${esc(v.srcs.map((s) => s.label).join(', '))}</p>${v.html}`).join(''));
const toFaq = (it) => ({ q: it.q, html: faqHtml(it) });
const faqLd = (items) => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: items.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.variants.length === 1 ? it.variants[0].a : it.variants.map((v) => `${v.srcs.map((s) => s.label).join(', ')}: ${v.a}`).join(' ') } })),
});

// ---------------------------------------------------------------- reviews: every captured review, de-duplicated by text
function collectReviews() {
  const k = (s) => String(s).replace(/^[“‘"']+|[”’"']+$/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const seen = new Set();
  const group = (where, paths) => {
    const list = []; const heads = new Map(); let carrying = 0;
    for (const p of paths) {
      const pg = cap(p); if (!pg) continue;
      let has = false;
      for (const m of pg.modules) {
        const revs = m.blocks.filter((b) => b.t === 'review');
        if (!revs.length) continue;
        has = true;
        const h = (m.blocks.find((b) => /^h[1-6]$/.test(b.t)) || {}).text;
        if (h) heads.set(h, (heads.get(h) || 0) + 1);
        for (const r of revs) { const key = k(r.text); if (seen.has(key)) continue; seen.add(key); list.push(r); }
      }
      if (has) carrying++;
    }
    const heading = [...heads].sort((a, b) => b[1] - a[1])[0]; // the section title most of these pages use
    return { where, heading: heading ? heading[0] : null, reviews: list, pages: carrying };
  };
  const towns = allPages().filter((p) => /^\/visit-us\/./.test(p.path)).map((p) => p.path).sort();
  return [
    { id: 'home', ...group('Home page', ['/']) },
    ...stores.map((s) => ({ id: s.id, ...group(`${s.city} store page`, [s.page.replace(/\/$/, '')]) })),
    { id: 'towns', ...group('Town pages', towns) },
  ];
}
// the shared shout-out card markup (parts.mjs shoutouts()), laid out here as a wall instead of a drag row
const shoutCard = (r, i) => `<figure class="shout" style="--r:${[-2.2, 1.6, -1, 2.4, -1.8, 1.2][i % 6]}deg" data-tilt>
    <span class="shout__stars" aria-label="Five stars">${icon('star')}${icon('star')}${icon('star')}${icon('star')}${icon('star')}</span>
    <blockquote>${esc(r.text.replace(/^[“‘"']+|[”’"']+$/g, ''))}</blockquote>
    <figcaption>${esc(r.name)}</figcaption>
  </figure>`;

// ---------------------------------------------------------------- the in-store photos (real client photos, factual captions)
const CULTURE = [
  { id: 'store-mural', cls: 'a', where: 'In store', cap: 'The graffiti mural wall, next to the shelves', alt: 'The graffiti mural wall inside a Capital District Cannabis store, beside the lit product shelves' },
  { id: 'store-albany', cls: 'c', where: 'Albany', cap: 'The mural behind the counter', alt: 'Inside the Albany dispensary: the graffiti mural behind the counter' },
  { id: 'm-2024-06-untitled', cls: 'b', where: 'In store', cap: 'A “got bud?” tee at the counter, and a crowd by the mural', alt: 'Black and white collage: a person in a got bud? tee at the counter, and people by the graffiti mural' },
  { id: 'm-2025-10-img-6709', cls: 'd', where: 'Clifton Park', cap: 'Tin ceiling, a timber table and glass cases', alt: 'Inside the Clifton Park dispensary: tin ceiling, menu screens, a timber table and glass display cases' },
  { id: 'm-2025-10-img-6712', cls: 'e', where: 'On the shelves', cap: 'Tinctures and topicals, drinks and concentrates, edibles', alt: 'Shelves under chalkboard signs reading Tinctures and Topicals, Drinks and Concentrates, and Edibles' },
  { id: 'm-2025-08-image-1', cls: 'f', where: 'At the counter', cap: 'Customers under the round EST. 2022 badge', alt: 'Black and white photo: customers at the counter under the round Capital District Cannabis and Wellness badge' },
];
const gallery = (list) => `<div class="co-gallery">${list.map((p, i) => `<figure class="co-ph co-ph--${p.cls}"${rv(i % 4)}>
    <div class="co-ph__frame" data-tilt>${img(p.id, { alt: p.alt, sizes: p.cls === 'a' ? '(min-width: 760px) 50vw, 100vw' : '(min-width: 760px) 25vw, 50vw' })}</div>
    <figcaption class="co-ph__cap"><b>${esc(p.where)}</b><span>${esc(p.cap)}</span></figcaption>
  </figure>`).join('')}</div>`;

// three real event flyers, one per store (captured /event/ pages)
const EVENT_PICKS = [
  '/event/cdcw-2nd-annual-customer-appreciation-summer-smokeout',
  '/event/capital-district-cannabis-wellness-halfmoon-clifton-park-grand-opening',
  '/event/capital-district-cannabis-wellness-summer-smokeout-schencectady-grand-opening',
];
const eventCards = () => EVENT_PICKS.map((p) => {
  const ev = need(p).event;
  if (!ev || !ev.image) throw new Error(`company.mjs: ${p} has no captured event flyer`);
  const s = storeAt(ev.address);
  return { path: p + '/', title: ev.title, image: ev.image.src, imageAlt: `Event flyer: ${ev.title}`, when: fmtDate(ev.startDate), where: s ? s.city : '' };
});

// the store roster (about): one row per store, its own live menu, details and phone
const rosterRow = (s, i) => `<li class="co-roster__row"${rv(i)}>
  <span class="co-roster__no">${bullet(s)}</span>
  <div class="co-roster__name"><h3>${esc(s.city)}</h3>${statusLine(s)}</div>
  <p class="co-roster__addr">${icon('pin')}<span>${esc(s.street)}<br>${esc(s.city)}, ${esc(s.region)} ${esc(s.zip)}</span></p>
  <p class="co-roster__tel">${icon('phone')}<a href="tel:${s.tel}">${esc(s.phone)}</a></p>
  <div class="co-roster__go"><a class="btn btn--ghost btn--sm" href="${href(s.page)}"><span>Store details</span>${icon('arrow')}</a><a class="btn btn--lime btn--sm" href="${esc(menuUrl(s.id, 'all'))}" target="_blank" rel="noopener" aria-label="Shop ${esc(s.city)} on the live menu (opens in a new tab)"><span>Shop ${esc(s.city)}</span>${icon('arrow-ne')}</a></div>
</li>`;

// a store contact card for the mint "call us" bands (careers)
const callCard = (s, i) => `<article class="co-call"${rv(i)}>
  <div class="co-call__head">${bullet(s)}<h3>${esc(s.name)}</h3></div>
  <p class="co-call__addr">${esc(s.street)}, ${esc(s.city)}, ${esc(s.region)} ${esc(s.zip)}</p>
  <a class="btn btn--ink" href="tel:${s.tel}"><span>Call ${esc(s.phone)}</span>${icon('phone')}</a>
  <a class="co-call__dir" href="${esc(s.directions)}" target="_blank" rel="noopener">Directions${icon('arrow-ne')}</a>
</article>`;

// ================================================================= /about/
function about() {
  const a = blocksOf('/about', '5050');
  const kick = pick(a, 'p', /^Recreational Dispensary in Albany, NY$/).text;
  const h = pick(a, 'h2', /^About Us$/).text;
  const pJourney = pick(a, 'p', /^Just getting started on your cannabis journey/).text;
  const pPride = pick(a, 'p', /^At Capital District Cannabis & Wellness we take pride/).text;
  const nl = blocksOf('/about', 'newsletter-5050');
  const purpose = blocksOf('/', 'centered-image');
  const pH2 = pick(purpose, 'h2', /^Our Purpose$/).text;
  const pH3 = pick(purpose, 'h3', /^A Different Experience$/).text;
  const pP = pick(purpose, 'p', /unified cannabis marketplace/).text;
  const loc = pick(purpose, 'btn', /^Locations$/).text;
  const quote = frag(pP, /We believe in a unified cannabis marketplace[^.]*\./);
  const [h3a, h3b] = [pH3.split(' ').slice(0, 2).join(' '), pH3.split(' ').slice(2).join(' ')];

  const hero = pageHero({
    crumbs: home('About', '/about/'), kicker: kick, title: h.split(' '), img: 'store-mural', sticker: `Est. ${brand.est}`,
    ctas: menuBtn('all', 'Shop Now') + btn(loc, '/location/', { kind: 'ghost' }),
  });

  const story = band(`<div class="co-story">
  <aside class="co-story__aside" aria-label="Our three stores">
    <div class="co-spin"${rv(0)}>${vinyl({ name: 'about' })}<span class="co-spin__stamp">${sticker(`Est. ${brand.est}`)}</span></div>
    <ol class="co-liner"${rv(1)}>${stores.map((s) => `<li>${bullet(s)}<span><b>${esc(s.city)}</b><small>${esc(s.street)}</small></span></li>`).join('')}</ol>
  </aside>
  <div class="co-story__body">
    ${kicker('Our story')}
    ${dh('Come on in', '& explore', { size: 'lg', spray: '518' })}
    <p class="co-lede"${rv(1)}>${esc(pPride)}</p>
    <p class="co-body"${rv(2)}>${esc(pJourney)}</p>
    <div class="btns"${rv(3)}>${btn('Cannabis 101', '/learn/')}${btn('Read the blog', '/blog/', { kind: 'ghost' })}</div>
  </div>
</div>`, { tone: 'ink', lit: true, spot: true, cls: 'co-clipx', lx: '22%', ly: '26%' });

  const purposeBand = band(`<div class="co-purpose">
  <div class="co-purpose__head">${kicker(pH2)}${dh(h3a, h3b, { size: 'lg' })}<blockquote class="co-quote"${rv(1)}><p>${esc(quote)}</p></blockquote></div>
  <div class="co-purpose__card glass"${rv(2)}><p>${esc(pP)}</p><div class="btns">${btn(loc, '/location/')}</div></div>
</div>`, { tone: 'night', lit: true, spot: true, lx: '78%', ly: '18%', backdrop: backdrop('store-albany', 'side', 'co-bg--photo') });

  const culture = band(`<div class="band__head"><div>${kicker('In store')}${dh('Inside', 'the stores', { size: 'lg' })}</div><p class="lede co-lede--ink">Real photos from inside our stores: the mural, the counters and the shelves.</p></div>
${gallery(CULTURE)}`, { tone: 'mint', sheet: true, lx: '18%', ly: '8%', after: floatObj('obj-spraycan', { style: 'top:-118px;right:6%;width:min(132px,17vw)', depth: 0.1 }) });

  const roster = band(`<div class="band__head"><div>${kicker('Where Ya Shopping?')}${dh('Dispensary', 'Locations', { size: 'lg' })}</div>${btn('All locations', '/location/', { kind: 'ghost' })}</div>
<ol class="co-roster">${stores.map(rosterRow).join('')}</ol>`, { tone: 'ink', lit: true, spot: true, lx: '82%', ly: '12%' });

  const community = band(`<div class="band__head"><div>${kicker('Events')}${dh('Building Community', 'Through Cannabis', { size: 'lg' })}<p class="lede co-community__lede">Grand openings, summer smokeouts, car meets and Toke &amp; Teach sessions across all three stores.</p></div><div class="btns">${btn('See all events', '/events/')}</div></div>
<div class="co-flyers">${eventCards().map((e, i) => flyer(e, { i })).join('')}</div>`, { tone: 'night', lit: true, spot: true, lx: '30%', ly: '18%', backdrop: backdrop('wall-mural-wide', 'even', 'co-bg--dim') });

  const crew = band(`<div class="co-cta">
  <div>${kicker('Careers')}${dh('Join', 'the crew', { size: 'lg' })}</div>
  <div class="co-cta__side"><p class="lede">Roles are posted by each store. Ask in store, or call the one you would like to join.</p><div class="btns">${btn('Careers', '/careers/')}${btn('Contact us', '/contact/', { kind: 'ghost' })}</div></div>
</div>`, { tone: 'slate', lit: true, lx: '85%', ly: '30%', after: floatObj('obj-boombox', { style: 'top:-96px;left:5%;width:min(230px,20vw)', depth: 0.08 }) });

  const main = hero + story + purposeBand + culture + roster + community + crew + signUp();
  covered(main, [kick, h, pJourney, pPride, pH2, pH3, pP, loc, ...nl.filter((b) => /^(h\d|p)$/.test(b.t)).map((b) => b.text)], '/about/');
  return {
    path: '/about/', title: need('/about').title, type: 'about', crumbs: home('About', '/about/'), ogImage: og('store-mural'),
    // the captured meta description is theme placeholder text (another business in Burlington, VT): replaced, see the lane report
    description: `${brand.name} is a New York-owned and operated dispensary with three stores in Albany, Clifton Park and Schenectady. Est. ${brand.est}.`,
    jsonld: [orgLd()], main,
  };
}

// ================================================================= /loyalty-program/
function laminate() {
  const strap = Array(6).fill('CDCW ✦ All Access').join(' ✦ ');
  return `<div class="co-stage"${rv(1)}>
  <span class="co-hook" aria-hidden="true"></span>
  <div class="co-lanyard" data-lanyard>
    <span class="co-strap" aria-hidden="true"><span>${esc(strap)}</span></span>
    <span class="co-clip" aria-hidden="true"></span>
    <div class="co-pass" role="img" aria-label="${esc(brand.name)} Rewards: all access pass">
      <span class="co-pass__slot"></span>
      <span class="co-pass__holo">21+</span>
      <span class="co-pass__brand">${esc(brand.name)}</span>
      <img class="co-pass__badge" src="${asset('brand/round-logo-480.webp')}" alt="" width="480" height="480" loading="lazy" decoding="async">
      <span class="co-pass__tier">Rewards</span>
      <span class="co-pass__access">All Access</span>
      <span class="co-pass__foot"><span>${stores.map((s) => esc(s.city)).join(' · ')}</span><span class="co-pass__code"></span></span>
      <span class="co-pass__sheen"></span>
    </div>
  </div>
</div>`;
}
const joinForm = () => `<form class="co-form glass" data-demo-form onsubmit="return false" aria-label="Join the loyalty program (preview)"${rv(2)}>
  <div class="co-form__row">
    <label class="field"><span>First name</span><input type="text" name="first" autocomplete="given-name" required></label>
    <label class="field"><span>Last name</span><input type="text" name="last" autocomplete="family-name"></label>
  </div>
  <label class="field"><span>Email address</span><input type="email" name="email" autocomplete="email" placeholder="you@example.com" required></label>
  <div class="co-form__row">
    <label class="field"><span>Mobile phone</span><input type="tel" name="phone" autocomplete="tel" placeholder="(518) 555-0123"></label>
    <label class="field"><span>Home store</span><select name="store">${stores.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
  </div>
  <button class="btn btn--lime" type="submit" data-magnetic><span>Sign Up</span>${icon('arrow')}</button>
  <p class="co-form__fine" data-demo-msg>Preview build: forms are disabled in this preview, nothing is sent.</p>
</form>`;

function loyalty() {
  const P = '/loyalty-program';
  const h1 = pick(blocksOf(P, 'hero'), 'h1', /^Loyalty Program$/).text;
  const m = blocksOf(P, '5050');
  const h2 = pick(m, 'h2', /^Earn More Every Visit/).text;
  const p1 = pick(m, 'p', /^Make every trip/).text;
  const p2 = pick(m, 'p', /^Signing up is quick/).text;
  const signHref = referralUrl();
  const nl = blocksOf(P, 'newsletter-5050');
  const nlKick = pick(nl, 'h2', /^News Letter$/).text;
  const nlH = pick(nl, 'h3', /^Sign Up & Save$/).text;
  const nlP = pick(nl, 'p', /^Sign up for our loyalty program/).text;
  const cut = h2.indexOf(' with ');
  const [h2a, h2b] = cut > 0 ? [h2.slice(0, cut), h2.slice(cut + 1)] : [h2, ''];
  // the three steps, made only from the captured paragraphs
  const sJoin = frag(p2, /Signing up is quick, free, and starts working for you right away\./);
  const sEarn = frag(p1, /you’ll earn points on every purchase/);
  const sRedeem = frag(p1, /redeemed for exclusive discounts, product perks, and members-only highlights/);
  const sBonus = frag(p2, /From special promotions to early access on select drops/);
  const sAsk = frag(p2, /Ask a budtender in-store or sign up today to start earning\./);
  const steps = [
    { title: 'Join', text: sJoin, icon: 'user' },
    { title: 'Earn', text: sEarn.charAt(0).toUpperCase() + sEarn.slice(1) + '.', icon: 'bag' },
    { title: 'Redeem', text: `Points can be ${sRedeem}.`, icon: 'gift' },
  ];
  const lfaq = collectFaqs().items.filter((it) => it.group === 'loyalty');
  if (!lfaq.length) throw new Error('company.mjs: no captured loyalty questions');

  const hero = pageHero({
    crumbs: home('Loyalty Program', '/loyalty-program/'), kicker: 'Rewards', title: h1.split(' '), img: { url: pick(m, 'img').src }, sticker: 'All Access',
    ctas: btn('Sign Up', signHref) + btn('How it works', '#how', { kind: 'ghost' }),
  });

  const lam = band(`<div class="co-lam">
  <div class="co-lam__words">${dh(h2a, h2b, { size: 'md', cls: 'co-h2split' })}<p class="co-lede"${rv(1)}>${esc(p1)}</p><p class="co-body"${rv(2)}>${esc(p2)}</p><div class="btns"${rv(3)}>${btn('Sign Up', signHref)}${btn('Join here', '#join', { kind: 'ghost' })}</div></div>
  <div class="co-lam__art">${laminate()}</div>
</div>`, { tone: 'night', lit: true, spot: true, cls: 'co-clipx', lx: '76%', ly: '26%' });

  const how = band(`<div class="co-how">
  <div class="co-how__list">${kicker('How it works')}${dh('Join. Earn.', 'Redeem.', { size: 'lg' })}${tracklist(steps, { side: 'A', cls: 'co-tracks' })}</div>
  <aside class="co-how__bonus glass"${rv(2)}><span class="co-how__tag">Bonus track</span><p class="co-how__big">${esc(sBonus)}.</p><p class="co-how__note">${esc(sAsk)}</p></aside>
</div>`, { tone: 'ink', lit: true, sheet: true, id: 'how', lx: '80%', ly: '40%', backdrop: img('turntable', { decorative: true, sizes: '60vw', cls: 'co-bg co-bg--right' }) + veil('left'), after: floatObj('obj-bud-a', { cls: 'co-bud', style: 'width:min(150px,16vw)', depth: 0.12 }) });

  const access = band(`<div class="co-access">
  <div class="co-access__words">${kicker('All Access')}${dh('Works at', 'every store', { size: 'lg' })}<ul class="co-chips">${stores.map((s, i) => `<li${rv(i)}><a href="${href(s.page)}">${bullet(s)}<span>${esc(s.name)}</span>${icon('arrow')}</a></li>`).join('')}</ul></div>
  <div class="co-access__faq">${faqList(lfaq.map(toFaq), { cls: 'co-faq', openFirst: true })}</div>
</div>`, { tone: 'mint', sheet: true, lx: '14%', ly: '12%' });

  const join = band(`<div class="co-join">
  <div class="co-join__words">${kicker(nlKick)}${dh('Sign Up', '& Save', { size: 'lg' })}<p class="co-lede"${rv(1)}>${esc(nlP)}</p><p class="co-body"${rv(2)}>${esc(sAsk)}</p></div>
  ${joinForm()}
</div>`, { tone: 'night', lit: true, spot: true, id: 'join', lx: '72%', ly: '30%', backdrop: backdrop('store-mural', 'side', 'co-bg--photo') });

  const main = hero + lam + how + access + join;
  covered(main, [h1, h2, p1, p2, nlKick, nlH, nlP], '/loyalty-program/');
  return {
    path: '/loyalty-program/', title: need(P).title, type: 'loyalty', crumbs: home('Loyalty Program', '/loyalty-program/'), ogImage: og('m-2024-05-image-1'),
    description: 'Join the Capital District Cannabis loyalty program: earn points on every purchase and redeem them for exclusive discounts, product perks and members-only highlights at all three stores.',
    jsonld: [faqLd(lfaq)], main,
  };
}

// ================================================================= /careers/ (the live page is empty: new copy)
function careers() {
  const P = '/careers';
  if (need(P).modules.length) console.warn('company.mjs: /careers now has captured content; review the new copy against it');
  const hero = pageHero({
    crumbs: home('Careers', '/careers/'), kicker: 'Careers', title: ['Join', 'the crew'], img: 'm-2025-10-img-6709',
    lede: `${brand.name} is New York-owned and operated, with three stores across the Capital Region and a calendar full of community events.`,
    ctas: btn('How to ask about roles', '#apply') + btn('About us', '/about/', { kind: 'ghost' }),
  });
  const what = band(`<div class="band__head"><div>${kicker('What we are')}${dh('Built in', 'New York', { size: 'lg' })}</div></div>
<div class="grid grid--3 co-crew">
  ${glassCard({ icon: 'leaf', title: 'New York-owned and operated', text: `Licensed by New York State to sell adult-use cannabis. Established ${brand.est}.`, i: 0 })}
  ${glassCard({ icon: 'pin', title: 'Three stores', text: 'Albany, Clifton Park and Schenectady, open seven days a week.', i: 1 })}
  ${glassCard({ icon: 'mic', title: 'Community events', text: 'Grand openings, summer smokeouts, car meets and Toke & Teach sessions.', i: 2 })}
</div>`, { tone: 'ink', lit: true, spot: true, lx: '70%', ly: '20%', backdrop: backdrop('m-2024-06-untitled', 'even', 'co-bg--dim') });
  const strip = ['store-albany', 'm-2025-08-image-1', 'm-2025-10-img-6712', 'store-mural'].map((id) => CULTURE.find((c) => c.id === id));
  const floor = band(`<div class="band__head"><div>${kicker('The culture')}${dh('On the', 'floor', { size: 'lg' })}</div><p class="lede">The mural, the counter and the shelves, inside our stores.</p></div>
<div class="co-strip">${strip.map((c, i) => `<figure${rv(i)}><div class="co-strip__img" data-tilt>${img(c.id, { alt: c.alt, sizes: '(min-width: 860px) 25vw, 50vw' })}</div><figcaption><b>${esc(c.where)}</b> ${esc(c.cap)}</figcaption></figure>`).join('')}</div>`, { tone: 'night', lit: true, lx: '20%', ly: '10%', after: floatObj('obj-boombox', { style: 'top:-90px;right:5%;width:min(220px,19vw)', depth: 0.08 }) });
  const apply = band(`<div class="band__head"><div>${kicker('How to get in')}${dh('Ask in store', 'or call', { size: 'lg' })}</div><p class="lede co-lede--ink">Roles are posted by each store. Stop by and ask at the counter, or call the store you would like to join.</p></div>
<div class="co-calls">${stores.map(callCard).join('')}</div>`, { tone: 'mint', sheet: true, id: 'apply', lx: '80%', ly: '10%' });
  return {
    path: '/careers/', title: need(P).title, type: 'careers', crumbs: home('Careers', '/careers/'), ogImage: og('m-2025-10-img-6709'),
    description: `Join the crew at ${brand.name}: New York-owned and operated, three stores in Albany, Clifton Park and Schenectady. Ask in store or call to find out about roles.`,
    main: hero + what + floor + apply + signUp(),
  };
}

// ================================================================= /contact/
const contactForm = () => `<form class="co-form glass" data-demo-form onsubmit="return false" aria-label="Send a message (preview)"${rv(2)}>
  <div class="co-form__row">
    <label class="field"><span>Name</span><input type="text" name="name" autocomplete="name" required></label>
    <label class="field"><span>Email address</span><input type="email" name="email" autocomplete="email" placeholder="you@example.com" required></label>
  </div>
  <div class="co-form__row">
    <label class="field"><span>Phone (optional)</span><input type="tel" name="phone" autocomplete="tel" placeholder="(518) 555-0123"></label>
    <label class="field"><span>About</span><select name="store"><option value="general">A general question</option>${stores.map((s) => `<option value="${s.id}">${esc(s.name)} store</option>`).join('')}</select></label>
  </div>
  <label class="field"><span>Message</span><textarea name="message" rows="5" required></textarea></label>
  <button class="btn btn--lime" type="submit" data-magnetic><span>Send message</span>${icon('arrow')}</button>
  <p class="co-form__fine" data-demo-msg>Preview build: forms are disabled in this preview, nothing is sent. For anything urgent, call your store.</p>
</form>`;
const handle = (u) => { const seg = String(u).replace(/^https?:\/\/[^/]+\//, '').split('/').filter((x) => x && x !== 'people' && !/^\d+$/.test(x))[0] || ''; return /instagram|x\.com|twitter/.test(u) ? '@' + seg : seg; };

function contact() {
  const P = '/contact';
  const f = blocksOf(P, 'contact-form');
  const kick = pick(f, 'p', /^Get in Touch$/).text;
  const h = pick(f, 'h2', /^Let's Talk$/).text;
  const acc = blocksOf(P, 'accordion');
  const accKick = pick(acc, 'p', /^It's Simple$/).text;
  const accH = pick(acc, 'h2', /^Any Questions\?/).text;
  const visit = blocksOf('/visit-us', 'accordion').filter((b) => b.t === 'faq' && !LOREM.test(b.q + b.a)).map((b) => ({ q: b.q, html: asBlock(b.html, b.a) }));
  if (visit.length < 5) throw new Error('company.mjs: the /visit-us FAQ is missing from the capture');
  const [ha, hb] = [h.split(' ')[0], h.split(' ').slice(1).join(' ')];
  const qcut = accH.indexOf('?') + 1;

  const hero = pageHero({
    crumbs: home('Contact', '/contact/'), kicker: kick, title: [ha, hb], img: 'skyline',
    lede: 'Call a store, stop by, or send us a note. Here is how to reach all three.',
    ctas: btn('Store contacts', '#stores') + btn('Send a message', '#message', { kind: 'ghost' }),
  });
  const cards = band(`<div class="band__head"><div>${kicker('Where Ya Shopping?')}${dh('Call or', 'stop by', { size: 'lg' })}</div><p class="lede">Open Monday to Saturday 9 AM to 9 PM, and Sunday 10 AM to 6 PM, at all three stores.</p></div>
<div class="co-cards">${stores.map((s) => storeCard(s)).join('')}</div>`, { tone: 'ink', lit: true, spot: true, id: 'stores', lx: '20%', ly: '10%' });
  const message = band(`<div class="co-msg">
  <div class="co-msg__words">${kicker('Write to us')}${dh('Send a', 'message', { size: 'lg' })}<p class="co-lede"${rv(1)}>For orders, stock and hours, your store is the quickest answer. For anything else, drop us a line.</p>
    <p class="co-follow"${rv(2)}>Follow along</p>
    <ul class="co-social">${brand.social.map((s, i) => `<li${rv(i + 2)}><a href="${esc(s.href)}" target="_blank" rel="noopener"><span class="co-social__ic">${icon(s.icon)}</span><span>${esc(s.name)}</span><small>${esc(handle(s.href))}</small>${icon('arrow-ne')}</a></li>`).join('')}</ul>
  </div>
  ${contactForm()}
</div>`, { tone: 'night', lit: true, spot: true, id: 'message', lx: '70%', ly: '30%', backdrop: backdrop('store-albany', 'side', 'co-bg--photo') });
  const faqs = band(`<div class="co-qa">
  <div class="co-qa__head">${kicker(accKick)}${dh(accH.slice(0, qcut), accH.slice(qcut).trim(), { size: 'md' })}<p class="co-lede co-lede--ink">Quick answers about shopping at our three stores.</p>${btn('All FAQs', '/faq/', { kind: 'ghost' })}</div>
  <div>${faqList(visit, { cls: 'co-faq', openFirst: true })}</div>
</div>`, { tone: 'mint', sheet: true, lx: '86%', ly: '10%', after: floatObj('obj-bud-b', { style: 'top:-110px;left:6%;width:min(110px,14vw)', depth: 0.12 }) });
  const main = hero + cards + message + faqs + signUp();
  covered(main, [kick, h, accKick, accH, ...visit.map((x) => x.q)], '/contact/');
  return {
    path: '/contact/', title: need(P).title, type: 'contact', crumbs: home('Contact', '/contact/'), ogImage: og('skyline'),
    // the captured meta description is theme placeholder text (another business in Burlington, VT): replaced, see the lane report
    description: `Contact ${brand.name}: phone numbers, addresses, hours and directions for our Albany, Clifton Park and Schenectady dispensaries.`,
    jsonld: stores.map(storeLd), main,
  };
}

// ================================================================= /faq/ (new: every captured FAQ, grouped)
function faqPage() {
  const { items } = collectFaqs();
  const groups = FAQ_GROUPS.map((g) => ({ ...g, items: items.filter((it) => it.group === g.id) })).filter((g) => g.items.length);
  const hero = pageHero({
    crumbs: home('FAQs', '/faq/'), kicker: 'FAQs', title: ['Questions?', 'Answered'], img: 'm-2025-10-img-6712',
    lede: 'Shopping, ID, payment, New York rules, our stores, rewards and the brands we carry. All in one place.',
  });
  const nav = `<nav class="co-jump" aria-label="FAQ topics"><p class="co-jump__t">Jump to</p>${groups.map((g) => `<a href="#faq-${g.id}">${icon(g.icon)}<span>${esc(g.title)}</span><small>${g.items.length}</small></a>`).join('')}</nav>`;
  const body = groups.map((g) => `<section class="co-fgroup" id="faq-${g.id}" aria-labelledby="faq-${g.id}-h">
  <header class="co-fgroup__h" data-reveal><span class="co-fgroup__ic">${icon(g.icon)}</span><div><h2 id="faq-${g.id}-h">${esc(g.title)}</h2><small>${plural(g.items.length, 'question', 'questions')}</small></div></header>
  ${faqList(g.items.map(toFaq), { cls: 'co-faq', openFirst: true })}
</section>`).join('');
  const list = band(`<div class="co-faqs">${nav}<div class="co-faqs__groups">${body}</div></div>`, { tone: 'night', lit: true, spot: true, lx: '82%', ly: '6%', after: floatObj('obj-bud-b', { style: 'top:-96px;right:7%;width:min(118px,14vw)', depth: 0.12 }) });
  const help = band(`<div class="band__head"><div>${kicker('Still stuck?')}${dh('Ask your', 'budtender', { size: 'lg' })}</div><p class="lede co-lede--ink">Call the store you shop at, or send us a message.</p></div>
<div class="co-calls">${stores.map(callCard).join('')}</div>
<p class="co-more">${btn('Contact us', '/contact/', { kind: 'ghost' })}</p>`, { tone: 'mint', sheet: true, lx: '20%', ly: '10%' });
  const main = hero + list + help + signUp();
  covered(main, items.flatMap((it) => [it.q, ...it.variants.map((v) => v.a)]), '/faq/');
  return {
    path: '/faq/', title: 'FAQs - Capital District Cannabis', type: 'faq', crumbs: home('FAQs', '/faq/'), ogImage: og('m-2025-10-img-6712'),
    description: 'Answers on shopping and ordering, ID, payment, New York purchase limits, store hours, the loyalty program and the brands at Capital District Cannabis.',
    jsonld: [faqLd(items)], main,
  };
}

// ================================================================= /reviews/ (new: every captured review)
function reviewsPage() {
  const groups = collectReviews();
  const shown = groups.filter((g) => g.reviews.length);
  const leave = googleReviewUrl();
  const hero = pageHero({
    crumbs: home('Reviews', '/reviews/'), kicker: 'Word on the street', title: ['NY Dispensary', 'Reviews'], img: 'm-2025-08-image-1',
    lede: 'Every Google review published on our website, in one place.',
    ctas: btn('Leave a Review', leave),
  });
  let n = 0;
  const wall = band(`<p class="co-revnote" data-reveal>Google reviews as published on the ${esc(brand.short)} website, captured November 2026.</p>
${shown.map((g) => `<section class="co-revgrp" aria-labelledby="rev-${g.id}">
  <header class="co-revgrp__h" data-reveal><div><p class="co-revgrp__where">${esc(g.where)}</p><h2 id="rev-${g.id}">${esc(g.heading || g.where)}</h2></div><p class="co-revgrp__meta">${plural(g.reviews.length, 'review', 'reviews')}${g.pages > 1 ? `, published on all ${g.pages} town pages` : ''}</p></header>
  <div class="co-wall">${g.reviews.map((r) => shoutCard(r, n++)).join('')}</div>
</section>`).join('')}`, { tone: 'night', lit: true, spot: true, lx: '50%', ly: '4%', after: floatObj('obj-boombox', { style: 'top:-80px;right:4%;width:min(210px,18vw)', depth: 0.08 }) });
  const cta = band(`<div class="co-cta">
  <div>${kicker('Your turn')}${dh('Been in', 'lately?', { size: 'lg' })}</div>
  <div class="co-cta__side"><p class="lede co-lede--ink">Tell us how it went. Leave a review on Google.</p><div class="btns">${btn('Leave a Review', leave)}${btn('Find a store', '/location/', { kind: 'ghost' })}</div></div>
</div>`, { tone: 'mint', sheet: true, lx: '80%', ly: '20%' });
  const main = hero + wall + cta + signUp();
  covered(main, shown.flatMap((g) => g.reviews.flatMap((r) => [r.text, r.name])), '/reviews/');
  return {
    path: '/reviews/', title: 'Reviews - Capital District Cannabis', type: 'reviews', crumbs: home('Reviews', '/reviews/'), ogImage: og('m-2025-08-image-1'),
    description: 'Google reviews of Capital District Cannabis & Wellness, as published on our website: the home page, the Albany store page and our town pages.',
    main,
  };
}

// ================================================================= /terms-conditions/ (it holds the Privacy Policy)
const POLICY_HEADS = ['Information We Collect', 'Purpose of Data Collection', 'Sharing of Personal Information', 'Use of Cookies', 'Data Security', 'Data Retention', 'Rights of Website Visitors', 'Age Restrictions', 'Compliance with Applicable Laws', 'Changes to this Privacy Policy'];
function policy() {
  const bs = blocksOf('/terms-conditions', 'text').filter((b) => b.t === 'p');
  const [docTitle, effective, intro, ...rest] = bs;
  if (!docTitle || !/Privacy Policy$/.test(docTitle.text) || !/^Effective Date/.test(effective.text)) throw new Error('company.mjs: the captured policy does not open as expected');
  const sections = []; const lead = [];
  for (const b of rest) {
    const lines = b.html.split(/<br\s*\/?>\s*/i).map((l) => l.trim()).filter(Boolean);
    lines.forEach((line, i) => {
      const head = POLICY_HEADS.find((x) => line === x || line.startsWith(x + ' '));
      if (head) { // the live page runs each heading into its first sentence: split it out, words unchanged
        sections.push({ h: head, id: 'pp-' + slug(head), parts: [] });
        const body = line.slice(head.length).trim();
        if (body) sections[sections.length - 1].parts.push({ t: 'p', html: body });
        return;
      }
      const into = sections.length ? sections[sections.length - 1].parts : lead;
      if (lines.length > 1 && i < lines.length - 1) { // the live page lists items as lines broken with <br>
        const prev = into[into.length - 1];
        if (prev && prev.t === 'ul') prev.items.push(line); else into.push({ t: 'ul', items: [line] });
      } else into.push({ t: 'p', html: line });
    });
  }
  if (sections.length !== POLICY_HEADS.length) throw new Error(`company.mjs: found ${sections.length} of ${POLICY_HEADS.length} policy headings`);
  const partText = (p) => (p.t === 'ul' ? p.items.map((x) => plain(x)) : [plain(p.html)]);
  const mine = [docTitle.text, effective.text, intro.text, ...lead.flatMap(partText), ...sections.flatMap((s) => [s.h, ...s.parts.flatMap(partText)])].join(' ');
  if (nzStrict(mine) !== nzStrict(bs.map((b) => b.text).join(' '))) throw new Error('company.mjs: the restructured policy text differs from the capture');
  return { docTitle, effective, intro, lead, sections };
}
function terms() {
  const P = '/terms-conditions';
  const { docTitle, effective, intro, lead, sections } = policy();
  const mail = policyEmail();
  const fix = (h) => richHtml(String(h).replace(/<a href="\/cdn-cgi\/l\/email-protection">[\s\S]*?<\/a>/g, `<a href="mailto:${mail}">${mail}</a>`));
  const part = (p) => (p.t === 'ul' ? `<ul>${p.items.map((x) => `<li>${fix(x)}</li>`).join('')}</ul>` : `<p>${fix(p.html)}</p>`);
  const hero = pageHero({ crumbs: home('Terms & Conditions', '/terms-conditions/'), kicker: 'Privacy Policy', title: ['Terms &', 'Conditions'], img: 'alley', sticker: effective.text });
  const outline = `<nav class="co-outline" aria-label="On this page"><p class="co-jump__t">On this page</p><ol>${sections.map((s) => `<li><a href="#${s.id}">${esc(s.h)}</a></li>`).join('')}</ol></nav>`;
  const doc = `<article class="prose co-doc">
  <header class="co-doc__head"><h2>${esc(docTitle.text)}</h2><p class="co-stamp">${icon('cal')}<span>${esc(effective.text)}</span></p></header>
  <p>${fix(intro.html)}</p>
  ${lead.map(part).join('')}
  ${sections.map((s) => `<section id="${s.id}" aria-labelledby="${s.id}-h"><h3 id="${s.id}-h">${esc(s.h)}</h3>${s.parts.map(part).join('')}</section>`).join('\n  ')}
</article>`;
  const body = band(`<div class="co-legal">${outline}${doc}</div>`, { tone: 'ink', lit: true, lx: '12%', ly: '4%' });
  const main = hero + body + signUp();
  if (!main.includes(`mailto:${mail}`) || /email-protection|\[email/.test(main)) throw new Error('company.mjs: the policy email was not decoded into the page');
  return {
    path: '/terms-conditions/', title: need(P).title, type: 'legal', crumbs: home('Terms & Conditions', '/terms-conditions/'), ogImage: og('alley'),
    description: `The ${brand.name} privacy policy: what we collect and why, cookies, data security and retention, and your rights. Effective 12/8/23.`,
    main,
  };
}

// ================================================================= /sitemap/ (new: every page, grouped)
function sitemapGroups() {
  const used = new Set(['/']);
  const item = (p, label, meta) => { const x = cap(p); if (!x) return null; used.add(x.path); return { label: label || short(x.title), href: p === '/' ? '/' : p + '/', meta }; };
  const fresh = (label, p) => ({ label, href: p });
  const all = allPages();
  const byPath = (re) => all.filter((p) => re.test(p.path));
  // town name: from the title ("... Near Troy, NY - Capital ..."), else from the page's first H2 (the SUNY Albany title has no "Near")
  const townName = (p) => (p.title.match(/Near ([^|]+?)(?:,\s*NY)?\s*-\s*Capital/i) || [])[1]
    || ((p.modules.flatMap((m) => m.blocks).find((b) => b.t === 'h2' && /\bNear\b/i.test(b.text)) || {}).text || '').replace(/^.*?\bNear\s+/i, '')
    || p.path.split('/').pop();
  const towns = byPath(/^\/visit-us\/./).map((p) => { used.add(p.path); return { label: townName(p).replace(/(?:,\s*|\s+)NY$/, '').trim(), href: p.path + '/' }; }).sort((a, b) => a.label.localeCompare(b.label));
  const posts = byPath(/^\/blog\/(?!category\/|cp_coa\/|page\/)./).map((p) => { used.add(p.path); return { label: (p.post && p.post.title) || short(p.title), href: p.path + '/' }; }).sort((a, b) => a.label.localeCompare(b.label));
  const topics = byPath(/^\/blog\/category\//).map((p) => { used.add(p.path); return { label: short(p.title), href: p.path + '/' }; }).sort((a, b) => a.label.localeCompare(b.label));
  const coa = byPath(/^\/blog\/cp_coa\//).map((p) => { used.add(p.path); return { label: short(p.title), href: p.path + '/' }; }).sort((a, b) => a.label.localeCompare(b.label));
  const events = byPath(/^\/event\//).map((p) => { used.add(p.path); return { label: (p.event && p.event.title) || short(p.title), href: p.path + '/', meta: p.event && fmtDate(p.event.startDate), d: (p.event && p.event.startDate) || '' }; }).sort((a, b) => b.d.localeCompare(a.d));
  const groups = [
    { id: 'shop', title: 'Shop', icon: 'bag', links: [fresh('Shop', '/shop/'), fresh('Deals', '/deals/'), fresh('How to order', '/how-to-order/'), fresh('Order ahead and pickup', '/pickup/'), item('/brands', 'Brands we carry'), item('/our-brands'), item('/our-brands/ayrloom'), item('/our-brands/hashtag-honey')], live: true },
    { id: 'locations', title: 'Locations', icon: 'pin', links: [item('/location'), ...stores.map((s) => item(s.page.replace(/\/$/, ''), s.name)), item('/store-locator'), item('/find-a-dispensary')] },
    { id: 'company', title: 'Company', icon: 'user', links: [{ label: 'Home', href: '/' }, item('/about', 'About us'), item('/loyalty-program'), item('/careers'), item('/contact')] },
    { id: 'legal', title: 'Legal', icon: 'id', links: [item('/terms-conditions'), fresh('Site map', '/sitemap/')] },
    { id: 'areas', title: 'Areas we serve', icon: 'route', wide: true, links: [item('/visit-us', 'Visit Us: all towns'), ...towns] },
    { id: 'learn', title: 'Learn and blog', icon: 'spark', wide: true, links: [fresh('Cannabis 101', '/learn/'), fresh('FAQs', '/faq/'), fresh('Reviews', '/reviews/'), item('/blog', 'Blog')], subs: [{ title: 'Posts', links: posts }, { title: 'Topics', links: topics }, { title: 'Lab results', links: coa }] },
    { id: 'events', title: 'Events', icon: 'cal', wide: true, links: [item('/events', 'All events'), ...events] },
  ];
  // archive views are not pages of their own: pagination, author archives, and /albany/ (a duplicate of /location/albany/)
  const skip = (p) => /\/page\/\d+$/.test(p) || /^\/author\//.test(p) || p === '/albany';
  const other = all.filter((p) => !used.has(p.path) && !skip(p.path)).map((p) => ({ label: short(p.title) || p.path, href: p.path + '/' }));
  if (other.length) groups.push({ id: 'other', title: 'Other pages', icon: 'plus', wide: true, links: other });
  for (const g of groups) g.links = g.links.filter(Boolean);
  return groups;
}
function sitemap() {
  const groups = sitemapGroups();
  const count = (g) => g.links.length + (g.subs || []).reduce((n, s) => n + s.links.length, 0);
  const li = (l) => `<li><a href="${href(l.href)}"><span>${esc(l.label)}</span>${l.meta ? `<small>${esc(l.meta)}</small>` : ''}</a></li>`;
  const hero = pageHero({
    crumbs: home('Site map', '/sitemap/'), kicker: 'Site map', title: ['Every page.', 'One map.'], img: 'wall-mural-wide',
    lede: 'Every page on this site, grouped. Shop links open the live menu in a new tab.',
  });
  const chips = `<nav class="co-mapnav" aria-label="Site map sections" data-reveal>${groups.map((g) => `<a href="#map-${g.id}">${icon(g.icon)}<span>${esc(g.title)}</span><small>${count(g)}</small></a>`).join('')}</nav>`;
  const cards = groups.map((g, i) => `<section class="co-mapgrp${g.wide ? ' co-mapgrp--wide' : ''}" id="map-${g.id}" aria-labelledby="map-${g.id}-h"${rv(i % 4)}>
  <h2 class="co-mapgrp__h" id="map-${g.id}-h">${icon(g.icon)}<span>${esc(g.title)}</span><small>${count(g)}</small></h2>
  <ul class="co-maplist">${g.links.map(li).join('')}${g.live ? `<li>${menuLink('all', `<span>Live menu</span><small>new tab</small>`, { aria: 'Live menu (opens in a new tab)' })}</li>` : ''}</ul>
  ${(g.subs || []).filter((s) => s.links.length).map((s) => `<h3 class="co-mapsub">${esc(s.title)} <small>${s.links.length}</small></h3><ul class="co-maplist">${s.links.map(li).join('')}</ul>`).join('')}
</section>`).join('');
  const body = band(`${chips}<div class="co-map">${cards}</div>`, { tone: 'night', lit: true, lx: '80%', ly: '4%' });
  return {
    path: '/sitemap/', title: 'Site Map - Capital District Cannabis', type: 'sitemap', crumbs: home('Site map', '/sitemap/'), ogImage: og('wall-mural-wide'),
    description: 'Every page on the Capital District Cannabis website: shop, locations, areas we serve, learn and blog, events, company and legal.',
    main: hero + body + signUp(),
  };
}

// ================================================================= 404: the record scratch
function notFound() {
  const deck = `<div class="co-deck" aria-hidden="true">
  <span class="co-deck__plate"></span>
  <div class="co-deck__rec">${vinyl({ name: 'scratch', eager: true })}</div>
  <span class="co-arm"><span class="co-arm__base"></span><span class="co-arm__rod"></span><span class="co-arm__head"></span></span>
</div>`;
  const main = band(`<div class="co-404__grid">
  <div class="co-404__words">
    ${kicker('Error 404')}
    ${dh('Track', 'not found', { tag: 'h1', size: 'xl', spray: 'scratch' })}
    <p class="co-lede"${rv(1)}>The needle skipped. This page is not on the record, but the rest of the album is still playing.</p>
    <div class="btns"${rv(2)}>${btn('Back home', '/')}${menuBtn('all', 'Shop the menu', { kind: 'ghost' })}${btn('Find a store', '/location/', { kind: 'ghost' })}</div>
    <p class="co-404__more"${rv(3)}><span>Or try</span><a href="${href('/shop/')}">Shop by category</a><a href="${href('/faq/')}">FAQs</a><a href="${href('/sitemap/')}">Site map</a></p>
  </div>
  <div class="co-404__art"${rv(1)}>${deck}</div>
</div>`, { tone: 'night', lit: true, spot: true, cls: 'co-404 co-clipx', lx: '72%', ly: '40%', backdrop: backdrop('alley', 'even', 'co-bg--dim') });
  return {
    file: '404.html', path: '/404/', title: 'Track Not Found - Capital District Cannabis', type: '404',
    description: 'This page is not on the record. Head home, shop the live menu or find one of our three stores.',
    main,
  };
}

export function pages() {
  return [about(), loyalty(), careers(), contact(), faqPage(), reviewsPage(), terms(), sitemap(), notFound()];
}
// what the lane report needs (node -e "import('./src/pages/company.mjs').then(m=>console.log(m.report()))")
export function report() {
  const f = collectFaqs();
  return { faqItems: f.items.length, faqDropped: f.dropped, faqMerged: f.mergedQs, reviews: collectReviews().map((g) => ({ where: g.where, n: g.reviews.length, pages: g.pages })) };
}
