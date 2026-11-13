// layout.mjs: the page shell every template renders into: head (SEO, share cards, JSON-LD), the 21+ gate (age then
// store, as on the live site), the utility line, the glass header with mega menus and the store chip, the phone drawer,
// the footer (areas served, licences, the state warning), the store switcher and the sticky pickup bar.
import { esc, attrs, href, asset, img, icon, linkTo, menuLink, base } from './html.mjs';
import { brand, stores, nav, footerCols, categories, DEFAULT_STORE, ORIGIN, menuUrl } from '../content/site.mjs';
import { loadCapture } from './capture.mjs';

let PREVIEW = false; let VERSION = '0'; let SHARE_ORIGIN = '';
export const setPreview = (v) => { PREVIEW = v; };
export const setVersion = (v) => { VERSION = v; };
export const setOrigin = (v) => { SHARE_ORIGIN = v; };
export const isPreview = () => PREVIEW;

const def = stores.find((s) => s.id === DEFAULT_STORE);
const todayLine = 'Mon\u2013Sat 9 AM\u20139 PM \u00b7 Sun 10 AM\u20136 PM';

// ---------- JSON-LD builders (facts only, from site.mjs) ----------
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hh = (h) => String(h).padStart(2, '0') + ':00';
export function storeLd(s) {
  return {
    '@context': 'https://schema.org', '@type': 'Store', name: `${brand.name} \u2013 ${s.city}`, url: ORIGIN + s.page,
    telephone: '+1-' + s.tel.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'),
    address: { '@type': 'PostalAddress', streetAddress: s.street, addressLocality: s.city, addressRegion: s.region, postalCode: s.zip, addressCountry: 'US' },
    openingHoursSpecification: DAYS.map((d, i) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: d, opens: hh(s.hours[i][0]), closes: hh(s.hours[i][1]) })),
    parentOrganization: { '@type': 'Organization', name: brand.name, url: ORIGIN + '/' },
  };
}
export const orgLd = () => ({
  '@context': 'https://schema.org', '@type': 'Organization', name: brand.name, url: ORIGIN + '/', logo: ORIGIN + '/assets/brand/round-logo-480.webp',
  sameAs: brand.social.map((s) => s.href), foundingDate: brand.est,
});
export const crumbsLd = (crumbs) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: ORIGIN + (c.href === '/' ? '/' : c.href) })),
});

// ---------- small shared chrome parts ----------
export const bullet = (s, cls = '') => `<span class="bullet ${cls}" data-store-letter aria-hidden="true">${esc(s.letter)}</span>`;
const statusSpan = (s) => `<span class="status" data-status-for="${s.id}"><i class="status__dot"></i><span class="status__txt">${esc(todayLine)}</span></span>`;

function storeCardMini(s, opts = {}) {
  return `<article class="mini" data-store-card="${s.id}">
  <div class="mini__head">${bullet(s)}<div><h3 class="mini__name">${esc(s.name)}</h3>${statusSpan(s)}</div></div>
  <p class="mini__addr">${esc(s.street)}<br>${esc(s.city)}, ${esc(s.region)} ${esc(s.zip)}</p>
  <p class="mini__links"><a href="tel:${s.tel}">${icon('phone')}${esc(s.phone)}</a><a href="${esc(s.directions)}" target="_blank" rel="noopener">${icon('route')}Directions</a></p>
  <div class="mini__cta">${opts.choose ? `<button class="btn btn--lime btn--sm" type="button" data-set-store="${s.id}">Shop ${esc(s.city)}</button>` : `<a class="btn btn--lime btn--sm" href="${esc(menuUrl(s.id, 'all'))}" target="_blank" rel="noopener">Shop ${esc(s.city)}${icon('arrow-ne')}</a>`}<a class="btn btn--ghost btn--sm" href="${href(s.page)}">Store details</a></div>
</article>`;
}

function ageGate() {
  return `<div class="gate" id="gate" role="dialog" aria-modal="true" aria-labelledby="gate-q" hidden>
  <div class="gate__bg">${img('skyline', { decorative: true, sizes: '100vw', min: 1200 })}<div class="gate__beam"></div></div>
  <div class="gate__card glass">
    <img class="gate__logo" src="${asset('brand/logo.svg')}" alt="${esc(brand.name)}" width="314" height="58">
    <div class="gate__step" data-gate-step="1">
      <p class="sticker sticker--tilt">21+</p>
      <h2 class="gate__q" id="gate-q">${esc(brand.agegate)}</h2>
      <div class="gate__btns"><button class="btn btn--lime" type="button" data-gate-yes>Yes, I Am</button><button class="btn btn--ghost" type="button" data-gate-no>No, I'm Not</button></div>
      <p class="gate__no" data-gate-msg hidden>You are not old enough to view this Website</p>
    </div>
    <div class="gate__step" data-gate-step="2" hidden>
      <p class="kicker">Where Ya Shopping?</p>
      <h2 class="gate__q">Pick your store</h2>
      <div class="gate__stores">${stores.map((s) => `<button class="gate__store" type="button" data-set-store="${s.id}" data-gate-done>${bullet(s)}<span><b>${esc(s.name)}</b><small>${esc(s.street)}</small>${statusSpan(s)}</span>${icon('arrow')}</button>`).join('')}</div>
      <p class="gate__fine">${esc(brand.separateCarts)}</p>
    </div>
  </div>
</div>`;
}

function megaPanel(key, m) {
  const card = m.card;
  const cardLink = card.menu ? `href="${esc(menuUrl(DEFAULT_STORE, card.menu))}" data-menu="${card.menu}" target="_blank" rel="noopener"` : `href="${href(card.href)}"`;
  return `<div class="mega" id="mega-${key}" data-mega="${key}" hidden>
  <div class="mega__in glass">
    ${m.groups.map((g) => `<div class="mega__col"><p class="mega__title">${esc(g.title)}</p><ul>${g.links.map((l) => `<li>${linkTo(l, l.menu ? 'ext' : null)}</li>`).join('')}</ul></div>`).join('')}
    <a class="mega__card" ${cardLink}>${img(card.img, { decorative: true, sizes: '320px' })}<span class="mega__cardtxt"><b>${esc(card.title)}</b><small>${esc(card.text)}</small></span></a>
  </div>
</div>`;
}

function header(current) {
  const isCur = (h) => current && (current === h || (h !== '/' && current.startsWith(h)));
  const mega = (key) => { const m = nav[key]; return `<li class="nav__item"><button class="nav__btn${isCur(m.href) ? ' is-current' : ''}" type="button" aria-expanded="false" aria-controls="mega-${key}" data-mega-btn="${key}">${esc(m.label)}${icon('chev')}</button>${megaPanel(key, m)}</li>`; };
  return `<div class="topbar" role="region" aria-label="Store information">
  <div class="topbar__in">
    <p class="topbar__lic">Licensed New York adult-use dispensaries \u00b7 21+ with valid ID</p>
    <button class="topbar__store" type="button" data-open-store><span>Pickup at</span> <b data-store-name>${esc(def.name)}</b> ${statusSpan(def).replace(`data-status-for="${def.id}"`, 'data-status-current')}</button>
    <p class="topbar__links"><a href="${href('/loyalty-program/')}">Rewards</a><a href="${href('/events/')}">Events</a><a href="tel:${def.tel}" data-store-tel>${icon('phone')}<span data-store-phone>${esc(def.phone)}</span></a></p>
  </div>
</div>
<header class="hdr" data-hdr>
  <div class="hdr__in">
    <a class="hdr__logo" href="${href('/')}" aria-label="${esc(brand.name)} home"><img src="${asset('brand/logo.svg')}" alt="${esc(brand.name)}" width="314" height="58"></a>
    <nav class="nav" aria-label="Main"><ul class="nav__list">
      ${mega('shop')}${mega('stores')}${mega('learn')}
      ${nav.flat.map((l) => `<li class="nav__item"><a class="nav__link${isCur(l.href) ? ' is-current' : ''}" href="${href(l.href)}"${isCur(l.href) ? ' aria-current="page"' : ''}>${esc(l.label)}</a></li>`).join('')}
    </ul></nav>
    <div class="hdr__act">
      <button class="chip" type="button" data-open-store aria-label="Change store">${bullet(def)}<span class="chip__txt"><small>Your store</small><b data-store-name>${esc(def.city)}</b></span>${icon('chev')}</button>
      ${menuLink('all', `<span>Shop now</span>${icon('arrow-ne')}`, { cls: 'btn btn--lime btn--sm hdr__shop', aria: 'Shop now on the live menu (opens in a new tab)' })}
      <button class="burger" type="button" aria-expanded="false" aria-controls="drawer" data-drawer-btn aria-label="Open menu">${icon('menu')}</button>
    </div>
  </div>
</header>
<div class="drawer" id="drawer" data-drawer hidden>
  <div class="drawer__in">
    <button class="drawer__store" type="button" data-open-store>${bullet(def)}<span><small>Your store</small><b data-store-name>${esc(def.name)}</b>${statusSpan(def).replace(`data-status-for="${def.id}"`, 'data-status-current')}</span>${icon('chev')}</button>
    ${['shop', 'stores', 'learn'].map((k) => `<details class="drawer__grp"><summary>${esc(nav[k].label)}${icon('plus')}</summary>${nav[k].groups.map((g) => `<p class="drawer__title">${esc(g.title)}</p><ul>${g.links.map((l) => `<li>${linkTo(l)}</li>`).join('')}</ul>`).join('')}</details>`).join('')}
    <ul class="drawer__flat">${nav.flat.map((l) => `<li>${linkTo(l)}</li>`).join('')}<li>${linkTo({ label: 'Contact', href: '/contact/' })}</li></ul>
    ${menuLink('all', `Shop now${icon('arrow-ne')}`, { cls: 'btn btn--lime drawer__shop' })}
  </div>
</div>`;
}

function footer() {
  const towns = loadCapture();
  const areaLinks = Object.values(towns.pages).filter((p) => /^\/visit-us\/./.test(p.path)).map((p) => {
    const h2 = (p.modules.flatMap((m) => m.blocks).find((b) => b.t === 'h2') || {}).text || '';
    const name = (p.title.match(/Near ([^|]+?)(?:,\s*NY)?\s*-\s*Capital/i) || [])[1] || (h2.match(/Near (.+)$/i) || [])[1] || p.path.split('/').pop();
    return { label: name.replace(/(?:,\s*|\s+)NY\??$/, '').trim(), href: p.path + '/' };
  }).sort((a, b) => a.label.localeCompare(b.label));
  return `<footer class="ftr" data-ftr>
  <div class="ftr__finale band band--night" data-spot>
    <div class="band__clip">${img('alley', { decorative: true, sizes: '100vw', cls: 'ftr__alley' })}</div>
    <div class="wrap ftr__top">
      <div class="ftr__hello">
        <p class="kicker">Where Ya Shopping?</p>
        <h2 class="dh dh--md"><span class="dh__a">Three stores.</span><span class="dh__b">One crew.</span></h2>
        <p class="ftr__lede">Albany, Clifton Park and Schenectady. Open daily, ${esc(todayLine)}.</p>
      </div>
      <div class="ftr__stores">${stores.map((s) => storeCardMini(s)).join('')}</div>
    </div>
    <div class="ftr__record" aria-hidden="true"><div class="vinyl vinyl--footer" data-vinyl="footer"><div class="vinyl__disc"><span class="vinyl__label"><img src="${asset('brand/round-logo-480.webp')}" alt="" width="480" height="480" loading="lazy"></span></div></div></div>
  </div>
  <div class="ftr__main wrap">
    <div class="ftr__brand">
      <img src="${asset('brand/logo.svg')}" alt="${esc(brand.name)}" width="314" height="58" loading="lazy">
      <p>${esc(brand.kicker)}. New York\u2013owned and operated since ${esc(brand.est)}.</p>
      <ul class="ftr__social">${brand.social.map((s) => `<li><a href="${esc(s.href)}" target="_blank" rel="noopener" aria-label="${esc(s.name)}">${icon(s.icon)}</a></li>`).join('')}</ul>
      <a class="btn btn--lime btn--sm" href="${href('/loyalty-program/')}">Join the loyalty program${icon('arrow')}</a>
    </div>
    ${footerCols.map((c) => `<details class="ftr__col" open><summary>${esc(c.title)}${icon('plus')}</summary><ul>${c.links.map((l) => `<li>${linkTo(l)}</li>`).join('')}</ul></details>`).join('')}
  </div>
  <div class="wrap">
    <details class="ftr__areas"><summary>Areas we serve <small>${areaLinks.length} towns and destinations</small>${icon('plus')}</summary><ul>${areaLinks.map((a) => `<li><a href="${href(a.href)}">${esc(a.label)}</a></li>`).join('')}</ul></details>
    <div class="ftr__legal">
      <p class="ftr__lic">${esc(brand.licences)}</p>
      <div class="ftr__warn"><p>${esc(brand.warning)}</p><p>${esc(brand.hopeline)} Visit <a href="${esc(brand.hopelineUrl)}" target="_blank" rel="noopener">${esc(brand.hopelineUrl)}</a></p></div>
    </div>
    <div class="ftr__bottom">
      <p>${esc(brand.copyright)}</p>
      <p class="ftr__preview">Design concept preview, not the official ${esc(brand.short)} website. Shop links open the live menu.</p>
      <p><a href="${href('/terms-conditions/')}">Terms &amp; Conditions</a> \u00b7 <a href="${href('/sitemap/')}">Site map</a></p>
    </div>
  </div>
</footer>`;
}

function storeModal() {
  return `<div class="smodal" id="store-modal" role="dialog" aria-modal="true" aria-labelledby="smodal-h" data-smodal hidden>
  <div class="smodal__scrim" data-smodal-close></div>
  <div class="smodal__card glass">
    <button class="smodal__x" type="button" data-smodal-close aria-label="Close">${icon('close')}</button>
    <p class="kicker">Where Ya Shopping?</p>
    <h2 class="smodal__h" id="smodal-h">Switch your store?</h2>
    <p class="smodal__note">${esc(brand.separateCarts)}</p>
    <div class="smodal__list">${stores.map((s) => storeCardMini(s, { choose: true })).join('')}</div>
  </div>
</div>`;
}

function pickbar() {
  return `<aside class="pickbar" data-pickbar aria-label="Your pickup store" hidden>
  <div class="pickbar__in glass">
    <button class="pickbar__store" type="button" data-open-store>${bullet(def)}<span><small>Pickup at</small><b data-store-name>${esc(def.name)}</b></span></button>
    <span class="pickbar__status">${statusSpan(def).replace(`data-status-for="${def.id}"`, 'data-status-current')}</span>
    <div class="pickbar__acts">
      ${menuLink('all', `<span>Shop now</span>${icon('arrow-ne')}`, { cls: 'btn btn--lime btn--sm', aria: 'Shop now on the live menu (opens in a new tab)' })}
      <a class="pickbar__ic" href="tel:${def.tel}" data-store-tel aria-label="Call the store">${icon('phone')}<span>Call</span></a>
      <a class="pickbar__ic" href="${esc(def.directions)}" data-store-directions target="_blank" rel="noopener" aria-label="Directions">${icon('route')}<span>Directions</span></a>
    </div>
    <button class="pickbar__x" type="button" data-pickbar-close aria-label="Hide the pickup bar">${icon('close')}</button>
  </div>
</aside>`;
}

// ---------- the page ----------
// p: { path, title, description, main, type?, crumbs?, jsonld?, ogImage?, bodyClass?, canonical?, ogType? }
export function page(p) {
  const canonical = p.canonical || ORIGIN + (p.path === '/' ? '/' : p.path);
  const share = (p.ogImage && /^https?:/.test(p.ogImage)) ? p.ogImage : (SHARE_ORIGIN || ORIGIN) + base() + 'assets/' + (p.ogImage || 'img/store-mural-1200.webp');
  const ld = [...(p.jsonld || [])];
  if (p.crumbs && p.crumbs.length > 1) ld.push(crumbsLd(p.crumbs));
  const stamp = '?v=' + VERSION;
  return `<!doctype html>
<html lang="en" class="no-js" data-store="${DEFAULT_STORE}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description || '')}">
<link rel="canonical" href="${esc(canonical)}">
${PREVIEW ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<meta name="theme-color" content="#121716">
<meta property="og:type" content="${esc(p.ogType || 'website')}">
<meta property="og:site_name" content="${esc(brand.name)}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description || '')}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(share)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/webp" href="${asset('brand/round-logo-240.webp')}">
<link rel="preload" as="font" type="font/woff2" href="${asset('fonts/anybody-normal.woff2')}" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="${asset('fonts/worksans-normal.woff2')}" crossorigin>
<link rel="stylesheet" href="${asset('css/site.css')}${stamp}">
<script>(function(d){d.documentElement.className=d.documentElement.className.replace('no-js','js');try{var s=localStorage.getItem('cdc.store');if(s)d.documentElement.setAttribute('data-store',s);}catch(e){}})(document);</script>
${ld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body class="${esc(['t-' + (p.type || 'page'), p.bodyClass || ''].join(' ').trim())}">
<a class="skip" href="#main">Skip to content</a>
${ageGate()}
${header(p.path)}
<main id="main" tabindex="-1">
${p.main}
</main>
${footer()}
${storeModal()}
${pickbar()}
<script type="application/json" id="cdc-data">${JSON.stringify({
  menu: ORIGIN + '/stores', defaultStore: DEFAULT_STORE,
  cats: Object.fromEntries(categories.map((c) => [c.id, c.path])),
  stores: stores.map((s) => ({ id: s.id, letter: s.letter, name: s.name, city: s.city, phone: s.phone, tel: s.tel, directions: s.directions, page: href(s.page), menu: s.menu, hours: [0, 1, 2, 3, 4, 5, 6].map((i) => s.hours[i]) })),
}).replace(/</g, '\\u003c')}</script>
<script src="${asset('js/site.js')}${stamp}" defer></script>
</body>
</html>
`;
}
