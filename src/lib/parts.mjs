// parts.mjs: the shared components. Every page template composes these; page CSS only positions them.
// Hooks (site.js): data-reveal, data-depth, data-tilt, data-magnetic, data-spot, data-menu, data-vinyl, data-tape,
// data-crate, data-wall, data-count, data-store-*. All content stays visible without JS.
import { esc, attrs, href, asset, img, imgInfo, mediaImg, mediaId, icon, menuLink, slug, trimWords } from './html.mjs';
import { brand, stores, categories, phrases, menuUrl, DEFAULT_STORE, ORIGIN } from '../content/site.mjs';

// ---------- primitives ----------
export const kicker = (t, cls = '') => t ? `<p class="kicker ${cls}">${esc(t)}</p>` : '';
// two-tone display heading (the live site's stacked white + lime headings). a/b are plain strings.
export function dh(a, b, o = {}) {
  const tag = o.tag || 'h2'; const size = o.size || 'lg';
  const words = (s, cls) => s ? `<span class="${cls}">${esc(s)}</span>` : '';
  return `<${tag} class="dh dh--${size}${o.cls ? ' ' + o.cls : ''}"${o.id ? ` id="${o.id}"` : ''} data-reveal="stretch">${words(a, 'dh__a')}${b ? ' ' : ''}${words(b, 'dh__b')}${o.spray ? ` <span class="dh__tag">${esc(o.spray)}</span>` : ''}</${tag}>`;
}
export function btn(label, url, o = {}) {
  const ext = /^https?:\/\//.test(url) && !url.startsWith(ORIGIN + '/') || /\/stores\//.test(url);
  const cls = `btn btn--${o.kind || 'lime'}${o.size ? ' btn--' + o.size : ''}${o.cls ? ' ' + o.cls : ''}`;
  return `<a${attrs({ class: cls, href: ext ? url : href(url), target: ext ? '_blank' : null, rel: ext ? 'noopener' : null, 'data-magnetic': o.magnetic === false ? null : '' })}><span>${esc(label)}</span>${icon(ext ? 'arrow-ne' : 'arrow')}</a>`;
}
// a store-aware live-menu button (target: all | specials | <category id> | brands/<slug>)
export const menuBtn = (target, label, o = {}) => menuLink(target, `<span>${esc(label)}</span>${icon('arrow-ne')}`, { cls: `btn btn--${o.kind || 'lime'}${o.size ? ' btn--' + o.size : ''}${o.cls ? ' ' + o.cls : ''}`, aria: `${label} (opens the live menu in a new tab)` });
export const sticker = (t, o = {}) => `<span class="sticker${o.tilt === false ? '' : ' sticker--tilt'}${o.cls ? ' ' + o.cls : ''}"${o.style ? ` style="${o.style}"` : ''}>${esc(t)}</span>`;

// a section band. tone: night | ink | mint | lime | slate. backdrop: html placed in the clipped back plane.
export function band(inner, o = {}) {
  const tone = o.tone || 'ink';
  const style = [o.lx != null ? `--lx:${o.lx}` : '', o.ly != null ? `--ly:${o.ly}` : '', o.style || ''].filter(Boolean).join(';');
  return `<section${attrs({ class: `band band--${tone}${o.lit ? ' band--lit' : ''}${o.sheet ? ' band--sheet' : ''}${o.cls ? ' ' + o.cls : ''}`, id: o.id || null, 'aria-labelledby': o.labelledby || null, 'data-spot': o.spot ? '' : null, style: style || null })}>
${o.backdrop ? `<div class="band__clip" aria-hidden="true">${o.backdrop}</div>` : ''}${o.drip ? dripEdge(o.drip) : ''}
<div class="wrap${o.narrow ? ' wrap--narrow' : ''}${o.wide ? ' wrap--wide' : ''}">${inner}</div>
${o.after || ''}</section>`;
}
// paint drips hanging from the bottom edge of a band (decorative)
export const dripEdge = (color = 'lime') => `<svg class="drip drip--${color}" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 0h1440v28c-18 0-22 10-24 30-2 22-12 22-14 0-2-16-8-22-22-22-20 0-20 14-22 40-2 34-16 34-18 0-1-20-8-26-26-26-24 0-28 8-30 22-3 26-14 26-16 0-1-14-10-20-30-20-30 0-26 18-29 52-3 40-18 40-20 0-2-30-8-40-30-40H996c-22 0-28 6-30 26-2 30-14 30-16 0-1-18-10-24-30-24-26 0-30 12-32 34-3 44-18 44-20 0-2-22-10-30-34-30H748c-20 0-26 8-28 24-2 22-12 22-14 0-1-14-8-20-26-20-22 0-26 10-28 36-3 30-16 30-18 0-2-20-10-26-30-26H460c-24 0-28 12-30 30-2 26-14 26-16 0-2-18-10-26-28-26-24 0-28 14-30 46-3 36-18 36-20 0-2-28-10-36-32-36H190c-18 0-24 8-26 26-2 26-14 26-16 0-1-14-8-24-24-24-22 0-26 10-28 30-2 22-12 22-14 0-2-14-8-18-22-18H0z"/></svg>`;

export const crumbs = (list) => list && list.length > 1 ? `<nav class="crumbs" aria-label="Breadcrumb"><ol>${list.map((c, i) => i === list.length - 1 ? `<li aria-current="page">${esc(c.label)}</li>` : `<li><a href="${href(c.href)}">${esc(c.label)}</a></li>`).join('')}</ol></nav>` : '';

// ---------- inner page hero (one compact height on every inner page) ----------
// o: { kicker, title: string | [a, b], h1Text?, lede, ctas: html, img: registry id | {url}, crumbs, sticker, spray, tone }
export function pageHero(o) {
  const [a, b] = Array.isArray(o.title) ? o.title : [o.title, ''];
  const art = o.img ? (typeof o.img === 'string' ? img(o.img, { decorative: true, sizes: '(min-width: 900px) 60vw, 100vw', eager: true, cls: 'ph__img' }) : mediaImg(o.img.url, { decorative: true, cls: 'ph__img', eager: true, sizes: '(min-width: 900px) 60vw, 100vw' })) : '';
  return `<section class="ph band band--night band--lit${o.cls ? ' ' + o.cls : ''}" data-spot style="--lx:78%;--ly:22%">
  <div class="band__clip" aria-hidden="true">${art}<div class="ph__shade"></div><div class="ph__beam"></div></div>
  <div class="wrap ph__in">
    ${crumbs(o.crumbs)}
    ${kicker(o.kicker)}
    <h1 class="dh dh--xl ph__h1" data-reveal="stretch"><span class="dh__a">${esc(a)}</span>${b ? ` <span class="dh__b">${esc(b)}</span>` : ''}${o.spray ? ` <span class="dh__tag">${esc(o.spray)}</span>` : ''}</h1>
    ${o.lede ? `<p class="ph__lede" data-reveal>${o.ledeHtml ? o.lede : esc(o.lede)}</p>` : ''}
    ${o.ctas ? `<div class="ph__ctas" data-reveal>${o.ctas}</div>` : ''}
    ${o.sticker ? `<span class="ph__sticker">${sticker(o.sticker)}</span>` : ''}
  </div>
</section>`;
}

// ---------- store-aware pieces ----------
export const bullet = (s) => `<span class="bullet" aria-hidden="true">${esc(s.letter)}</span>`;
export const statusLine = (s) => `<span class="status" data-status-for="${s.id}"><i class="status__dot"></i><span class="status__txt">Mon–Sat 9 AM–9 PM · Sun 10 AM–6 PM</span></span>`;
export function hoursTable(s) {
  return `<table class="hours"><caption class="sr">Store hours, ${esc(s.name)}</caption><tbody>${s.hoursText.map(([d, h]) => `<tr><th scope="row">${esc(d)}</th><td>${esc(h)}</td></tr>`).join('')}</tbody></table>`;
}
// the rich store card (locations hub, locator, home)
export function storeCard(s, o = {}) {
  return `<article class="scard${o.cls ? ' ' + o.cls : ''}" data-store-card="${s.id}" data-tilt data-reveal>
  <div class="scard__media">${img(s.photo, { alt: s.photoAlt, sizes: '(min-width: 1000px) 33vw, 100vw' })}<span class="scard__bullet">${bullet(s)}</span></div>
  <div class="scard__body">
    <h3 class="scard__name">${esc(s.name)}</h3>
    ${statusLine(s)}
    <p class="scard__addr">${icon('pin')}<span>${esc(s.street)}, ${esc(s.city)}, ${esc(s.region)} ${esc(s.zip)}</span></p>
    <p class="scard__addr">${icon('phone')}<a href="tel:${s.tel}">${esc(s.phone)}</a></p>
    ${hoursTable(s)}
    <div class="scard__cta">
      <a class="btn btn--lime btn--sm" href="${esc(menuUrl(s.id, 'all'))}" target="_blank" rel="noopener"><span>Shop ${esc(s.city)}</span>${icon('arrow-ne')}</a>
      <button class="btn btn--ghost btn--sm" type="button" data-set-store="${s.id}"><span>Make this my store</span>${icon('check')}</button>
    </div>
    <p class="scard__links"><a href="${href(s.page)}">Store details${icon('arrow')}</a><a href="${esc(s.directions)}" target="_blank" rel="noopener">Directions${icon('arrow-ne')}</a></p>
  </div>
</article>`;
}
export const mapEmbed = (s) => `<div class="map" data-reveal><iframe title="Map: ${esc(brand.short)} ${esc(s.city)}, ${esc(s.street)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(`${s.street}, ${s.city}, ${s.region} ${s.zip}`)}&output=embed"></iframe></div>`;

// ---------- category crate (record sleeves). Every sleeve links straight to products on the live menu ----------
// o.store: a store id pins every sleeve to THAT store's menu (store and town pages); without it the sleeves follow the
// visitor's chosen store (data-menu, retargeted by site.js)
export function crate(o = {}) {
  const list = o.only ? categories.filter((c) => o.only.includes(c.id)) : categories;
  const where = o.store ? ` at ${stores.find((s) => s.id === o.store)?.city || ''}` : '';
  return `<div class="crate${o.cls ? ' ' + o.cls : ''}" data-crate>
  <div class="crate__row">${list.map((c, i) => `<a class="sleeve" href="${esc(menuUrl(o.store || DEFAULT_STORE, c.id))}"${o.store ? '' : ` data-menu="${c.id}"`} target="_blank" rel="noopener" style="--i:${i}" aria-label="Shop ${esc(c.name)}${esc(where)} on the live menu (opens in a new tab)">
    <span class="sleeve__disc" aria-hidden="true"><span class="sleeve__lbl"></span></span>
    <span class="sleeve__card">
      ${img(c.img, { decorative: true, sizes: '(min-width: 1100px) 260px, 60vw', cls: 'sleeve__art' })}
      <span class="sleeve__shade"></span>
      <span class="sleeve__no">${String(i + 1).padStart(2, '0')}</span>
      <span class="sleeve__name">${esc(c.name)}</span>
      <span class="sleeve__go">Shop now${icon('arrow-ne')}</span>
    </span>
  </a>`).join('')}</div>
</div>`;
}

// ---------- the record (3D, CSS-built; the client's round badge as the label) ----------
export const vinyl = (o = {}) => `<div class="vinyl${o.cls ? ' ' + o.cls : ''}" data-vinyl="${o.name || 'main'}" ${o.depth != null ? `data-depth="${o.depth}"` : ''} aria-hidden="true">
  <div class="vinyl__disc"><span class="vinyl__grooves"></span><span class="vinyl__label"><img src="${asset('brand/round-logo-480.webp')}" alt="" width="480" height="480" ${o.eager ? 'fetchpriority="high"' : 'loading="lazy"'}></span><span class="vinyl__hole"></span></div>
  <span class="vinyl__sheen"></span>
</div>`;

// a floating cut-out (generated) that crosses a section seam. pos: inline style (top/left/right/width), depth: parallax
export const floatObj = (id, o = {}) => `<div class="float${o.cls ? ' ' + o.cls : ''}" style="${o.style || ''}" data-depth="${o.depth ?? 0.12}" aria-hidden="true">${img(id, { decorative: true, sizes: o.sizes || '320px' })}</div>`;

// crossing tape marquee with the client's own short phrases
export function tape(o = {}) {
  const list = o.phrases || phrases;
  const run = list.map((t) => `<span>${esc(t)}</span><i aria-hidden="true">✦</i>`).join('');
  return `<div class="tapes${o.cls ? ' ' + o.cls : ''}" aria-label="${esc(list.join(', '))}" role="img">
  <div class="tape tape--a" data-tape="1"><div class="tape__track">${run}${run}</div></div>
  ${o.single ? '' : `<div class="tape tape--b" data-tape="-1"><div class="tape__track">${run}${run}</div></div>`}
</div>`;
}

// ---------- content blocks ----------
export function faqList(items, o = {}) {
  if (!items || !items.length) return '';
  return `<div class="faq${o.cls ? ' ' + o.cls : ''}">${items.map((f, i) => `<details class="faq__item" data-reveal style="--i:${i % 6}"${o.openFirst && i === 0 ? ' open' : ''}><summary><span>${esc(f.q)}</span><i class="faq__pm" aria-hidden="true"></i></summary><div class="faq__a">${f.html ? richHtml(f.html) : `<p>${esc(f.a)}</p>`}</div></details>`).join('')}</div>`;
}
// shout-outs: the captured Google reviews, stamped as captured
export function shoutouts(reviews, o = {}) {
  if (!reviews || !reviews.length) return '';
  return `<div class="shouts${o.cls ? ' ' + o.cls : ''}" data-drag><div class="shouts__row">${reviews.map((r, i) => `<figure class="shout" style="--r:${[-2.2, 1.6, -1, 2.4, -1.8, 1.2][i % 6]}deg" data-tilt>
    <span class="shout__stars" aria-label="Five stars">${icon('star')}${icon('star')}${icon('star')}${icon('star')}${icon('star')}</span>
    <blockquote>${esc(r.text.replace(/^[“‘"']+|[”’"']+$/g, ''))}</blockquote>
    <figcaption>${esc(r.name)}</figcaption>
  </figure>`).join('')}</div><p class="shouts__note">Reviews as published on the ${esc(brand.short)} website, captured November 2026.</p></div>`;
}
// step list styled as a record's track list
export function tracklist(items, o = {}) {
  return `<ol class="tracks${o.cls ? ' ' + o.cls : ''}">${items.map((t, i) => `<li class="track" data-reveal style="--i:${i}"><span class="track__no">${esc(o.side || 'A')}${i + 1}</span><div class="track__body"><h3 class="track__t">${esc(t.title)}</h3><p>${t.html ? t.text : esc(t.text)}</p>${t.cta || ''}</div>${t.icon ? `<span class="track__ic">${icon(t.icon)}</span>` : ''}</li>`).join('')}</ol>`;
}
// 50/50 split: media one side, words the other
export function split(media, body, o = {}) {
  return `<div class="split${o.reverse ? ' split--rev' : ''}${o.cls ? ' ' + o.cls : ''}"><div class="split__media" data-reveal>${media}</div><div class="split__body" data-reveal>${body}</div></div>`;
}
export const glassCard = (o) => `<${o.href ? `a href="${o.ext ? esc(o.href) : href(o.href)}"${o.ext ? ' target="_blank" rel="noopener"' : ''}` : 'div'} class="gcard glass${o.cls ? ' ' + o.cls : ''}" data-tilt data-reveal style="--i:${o.i || 0}">${o.icon ? `<span class="gcard__ic">${icon(o.icon)}</span>` : ''}<h3 class="gcard__t">${esc(o.title)}</h3>${o.text ? `<p>${esc(o.text)}</p>` : ''}${o.href ? `<span class="gcard__go">${esc(o.go || 'Learn more')}${icon(o.ext ? 'arrow-ne' : 'arrow')}</span>` : ''}</${o.href ? 'a' : 'div'}>`;

// a blog post card ("zine" cover)
export function postCard(p, o = {}) {
  const art = p.image ? (mediaId(p.image) ? img(mediaId(p.image), { decorative: true, sizes: '(min-width: 1000px) 30vw, 80vw' }) : '') : '';
  return `<article class="zine${o.cls ? ' ' + o.cls : ''}" data-tilt data-reveal style="--i:${o.i || 0}">
  <a class="zine__link" href="${href(p.path)}"><span class="zine__art">${art || `<span class="zine__ph">${esc((p.cats && p.cats[0]) || 'Blog')}</span>`}</span>
  <span class="zine__body">${p.cats && p.cats.length ? `<span class="zine__cat">${esc(p.cats[0])}</span>` : ''}<span class="zine__t">${esc(p.title)}</span>${p.date ? `<span class="zine__d">${esc(p.date)}</span>` : ''}</span></a>
</article>`;
}
// an event flyer card
export function flyer(e, o = {}) {
  const art = e.image ? (mediaId(e.image) ? img(mediaId(e.image), { alt: e.imageAlt || e.title, sizes: '(min-width: 1000px) 30vw, 80vw' }) : '') : '';
  return `<article class="flyer${o.cls ? ' ' + o.cls : ''}" style="--r:${[-1.6, 1.2, -0.8, 1.8][(o.i || 0) % 4]}deg" data-reveal data-tilt>
  <a href="${href(e.path)}"><span class="flyer__tape" aria-hidden="true"></span><span class="flyer__art">${art || `<span class="flyer__ph">${esc(e.title)}</span>`}</span>
  <span class="flyer__body">${e.when ? `<span class="flyer__when">${icon('cal')}${esc(e.when)}</span>` : ''}<span class="flyer__t">${esc(e.title)}</span>${e.where ? `<span class="flyer__where">${icon('pin')}${esc(e.where)}</span>` : ''}</span></a>
</article>`;
}
// captured rich HTML (posts, FAQ answers, events) with links and images made local
export function richHtml(html) {
  return String(html || '')
    .replace(/<a href="([^"]*)">/g, (m, u) => {
      const raw = u.replace(/&amp;/g, '&');
      if (/^(mailto:|tel:)/.test(raw)) return `<a href="${esc(raw)}">`;
      if (!raw || raw === '#') return `<a href="${esc(menuUrl(DEFAULT_STORE, 'all'))}" data-menu="all" target="_blank" rel="noopener">`; // an empty link on the live site ("our current menu here"): the live menu
      if (raw.startsWith(ORIGIN) || raw.startsWith('/')) {
        const p = raw.startsWith(ORIGIN) ? raw.slice(ORIGIN.length) || '/' : raw;
        if (/^\/stores\/products\/([\w-]+)/.test(p)) { const cat = p.match(/^\/stores\/products\/([\w-]+)/)[1]; const c = categories.find((x) => x.path.endsWith('/' + cat)); return `<a href="${esc(menuUrl(DEFAULT_STORE, c ? c.id : 'all'))}" data-menu="${c ? c.id : 'all'}" target="_blank" rel="noopener">`; }
        if (/^\/stores\/cd-[\w-]+(\/|$)/.test(p)) return `<a href="${esc(ORIGIN + p)}" target="_blank" rel="noopener">`; // a store's own menu page: keep it as captured
        if (/^\/(stores|shop|menu|product)(\/|$)/.test(p)) return `<a href="${esc(menuUrl(DEFAULT_STORE, 'all'))}" data-menu="all" target="_blank" rel="noopener">`;
        return `<a href="${href(p)}">`;
      }
      return `<a href="${esc(raw)}" target="_blank" rel="noopener">`;
    })
    .replace(/<img src="([^"]*)" alt="([^"]*)">/g, (m, u, alt) => { const id = mediaId(u); return id ? img(id, { alt: alt.replace(/&quot;/g, '"'), sizes: '(min-width: 900px) 720px, 100vw' }) : ''; });
}
export const prose = (html, o = {}) => `<div class="prose${o.cls ? ' ' + o.cls : ''}">${richHtml(html)}</div>`;

// newsletter / sign up band (the live site's "Sign Up & Save" block, on every page)
export function signUp(o = {}) {
  return band(`<div class="signup">
  <div class="signup__words">${kicker('News Letter')}${dh('Sign Up', '& Save', { size: 'lg' })}<p class="signup__lede">${esc(o.text || 'Sign up for our loyalty program to stay connected on the best deals in the Albany, NY area.')}</p></div>
  <form class="signup__form glass" data-demo-form onsubmit="return false">
    <label class="field"><span>Email address</span><input type="email" name="email" autocomplete="email" placeholder="you@example.com" required></label>
    <label class="field"><span>Phone (optional)</span><input type="tel" name="phone" autocomplete="tel" placeholder="(518) 555-0123"></label>
    <button class="btn btn--ink" type="submit" data-magnetic><span>Sign Up</span>${icon('arrow')}</button>
    <p class="signup__fine" data-demo-msg>Preview build: form submissions are disabled. <a href="${href('/loyalty-program/')}">How the loyalty program works</a>.</p>
  </form>
</div>`, { tone: 'lime', cls: 'band--signup', id: o.id || null, drip: 'ink' });
}

// area / town link grid
export const areaGrid = (list) => `<ul class="areas">${list.map((a, i) => `<li data-reveal style="--i:${i % 8}"><a href="${href(a.href)}"><span>${esc(a.label)}</span>${a.meta ? `<small>${esc(a.meta)}</small>` : ''}${icon('arrow')}</a></li>`).join('')}</ul>`;

export { esc, href, img, imgInfo, mediaImg, mediaId, icon, menuLink, slug, trimWords, asset };
