// content.mjs: the content lane. Capital's Education (the blog hub, 40 articles, 17 topic archives), Cannabis 101
// (/learn/, new) and the events hub with its 18 event pages. Existing URLs keep their captured words (titles, meta
// descriptions, H1s, article bodies, event copy) read from capture.mjs; new words are labels and glue written only from
// captured facts (the store FAQs, site.mjs). Empty legacy URLs (blog pagination, author archives, the two empty COA
// entries, the events plugin's /page/2/) redirect.
import { band, dh, kicker, btn, menuBtn, sticker, pageHero, vinyl, floatObj, faqList, faqSection, tracklist, glassCard, postCard, flyer, richHtml, prose, signUp, fitEm, esc, href, img, imgInfo, mediaImg, mediaId, icon, slug, trimWords, asset } from '../lib/parts.mjs';
import { orgLd } from '../lib/layout.mjs';
import { allPages, page as cap, text as plain } from '../lib/capture.mjs';
import { brand, stores, categories, menuUrl, ORIGIN, DEFAULT_STORE } from '../content/site.mjs';

// "today" in New York at build time (2026-11-13 for this build): splits upcoming from past events
const TODAY = process.env.CDC_TODAY || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const DEF = stores.find((s) => s.id === DEFAULT_STORE) || stores[0];
const BLOG = 'Capital’s Education';

// ---------- dates ----------
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ymd = (s) => { const [y, m, d] = String(s).split('-').map(Number); return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
const shortDate = (s) => { const t = ymd(s); return `${MON[t.m - 1]} ${t.d}, ${t.y}`; };
const longDate = (s) => { const t = ymd(s); return `${DAY[t.dow]}, ${MONTH[t.m - 1]} ${t.d}, ${t.y}`; };
const nextDay = (s) => { const t = ymd(s); return new Date(Date.UTC(t.y, t.m - 1, t.d + 1)).toISOString().slice(0, 10); };
function nyOffset(date) { // "-04:00" in summer, "-05:00" in winter
  const v = (new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }).formatToParts(new Date(date + 'T12:00:00Z')).find((p) => p.type === 'timeZoneName') || {}).value || '';
  const m = v.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  return m ? `${m[1]}${m[2].padStart(2, '0')}:${m[3] || '00'}` : '-05:00';
}

// ---------- small helpers ----------
const tidy = (h) => String(h || '').replace(/<p>(?:\s|&nbsp;|&#160;| )*<\/p>/g, '').replace(/<p>\s*$/, '').trim();
const ogOf = (url) => { const id = url && mediaId(url); const r = id && imgInfo(id); if (!r) return undefined; return (r.files.find((f) => f.w >= 1200) || r.files[r.files.length - 1]).file; };
// JSON-LD images point at the rebuild's own asset on the production origin, never at the old platform's uploads
const ldImg = (url) => { const f = ogOf(url); return f ? ORIGIN + '/assets/' + f : undefined; };
const posterOf = (id) => { const r = imgInfo(id); return r ? asset(r.files[r.files.length - 1].file) : ''; };
const publisher = () => { const o = orgLd(); return { '@type': 'Organization', name: o.name, url: o.url, logo: { '@type': 'ImageObject', url: o.logo } }; };
const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
// a captured title as the two-tone display heading: split after a colon or question mark, otherwise near the middle
function split2(t) {
  const s = String(t).trim();
  const c = s.search(/[:?]\s/);
  if (c > 0 && c < s.length - 4) return [s.slice(0, c + 1), s.slice(c + 2)];
  const w = s.split(/\s+/);
  if (w.length === 1) return ['', s];
  let k = w.length <= 3 ? w.length - 1 : Math.ceil(w.length * 0.55);
  // never a lone short word on the lime line ("THINGS TO / DO", "REC ROOTS POP / UP"): it takes the word before it
  if (k > 1 && w.slice(k).join('').replace(/[^\p{L}\p{N}]/gu, '').length <= 3) k--;
  return [w.slice(0, k).join(' '), w.slice(k).join(' ')];
}
// ids on the article's h2s (h3s when a post has no h2) for the table of contents. An h2 that only wraps an image (a
// captured quirk) becomes an image paragraph so the outline has no empty headings.
const RESERVED = new Set(['main', 'gate', 'gate-q', 'drawer', 'store-modal', 'smodal-h', 'cdc-data', 'mega-shop', 'mega-stores', 'mega-learn']);
function sectionize(html) {
  const used = new Set(RESERVED); const toc = [];
  const tag = (h, lvl) => h.replace(new RegExp(`<h${lvl}>([\\s\\S]*?)<\\/h${lvl}>`, 'g'), (m, inner) => {
    const t = plain(inner);
    if (!t) return lvl === 2 ? `<p>${inner}</p>` : m;
    const base = slug(t).slice(0, 56).replace(/-+$/, '') || 'section'; let id = base; let k = 2;
    while (used.has(id)) id = `${base}-${k++}`;
    used.add(id); toc.push({ id, text: t });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });
  let out = tag(html, 2);
  if (!toc.length) out = tag(out, 3);
  return { html: out, toc };
}

// ---------- the captured corpus ----------
let DATA = null;
function data() {
  if (DATA) return DATA;
  const all = allPages();
  const posts = all.filter((p) => /^\/blog\/[^/]+$/.test(p.path) && p.post && p.post.html && (p.post.title || p.h1)).map(postOf)
    .sort((a, b) => b.iso.localeCompare(a.iso));
  const cats = all.filter((p) => /^\/blog\/category\/[^/]+$/.test(p.path)).map((p) => {
    const s = p.path.split('/').pop();
    return { slug: s, name: p.h1 || p.title.replace(/\s+-\s+Capital District Cannabis$/, ''), path: p.path + '/', cap: p, posts: posts.filter((x) => x.catSlugs.includes(s)) };
  }).sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name));
  const events = all.filter((p) => /^\/event\/[^/]+$/.test(p.path) && p.event).map(eventOf).sort((a, b) => b.start.localeCompare(a.start));
  return (DATA = { posts, cats, events, catBySlug: Object.fromEntries(cats.map((c) => [c.slug, c])) });
}

function postOf(p) {
  const meta = p.post.meta || '';
  const date = (meta.match(/([A-Z][a-z]{2} \d{1,2}, \d{4})\s*$/) || [])[1] || (p.published ? shortDate(p.published.slice(0, 10)) : '');
  const ld = (p.jsonld || []).flatMap((j) => j['@graph'] || [j]).find((x) => x && x['@type'] === 'BlogPosting');
  const author = (meta.match(/^By (.+?) [A-Z][a-z]{2} \d{1,2}, \d{4}\s*$/) || [])[1] || (ld && ld.author && ld.author.name) || '';
  const words = plain(p.post.html).split(/\s+/).filter(Boolean).length;
  const excerpt = [...p.post.html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => plain(m[1])).find((t) => t.split(' ').length > 12) || '';
  const cats = p.post.cats || [];
  return {
    cap: p, path: p.path + '/', slug: p.path.split('/').pop(), title: p.post.title || p.h1, cats, catSlugs: cats.map(slug),
    image: p.post.image ? p.post.image.src : null, imageAlt: p.post.image ? p.post.image.alt : '', iso: p.published || '', modified: p.modified || '',
    date, author, html: p.post.html, mins: Math.max(1, Math.round(words / 230)), excerpt,
  };
}
const card = (x) => ({ path: x.path, title: x.title, image: x.image, cats: x.cats, date: x.date });

// blog topics that map cleanly to a live-menu shelf (the "Shop the category" CTA); THC drink posts sit under the
// broad "Consumables" topic, so their slug decides
const CAT_MENU = { flower: 'flower', 'pre-rolls': 'pre-rolls', edibles: 'edibles', vapes: 'vapes', concentrates: 'concentrates', cbd: 'cbd', deals: 'specials' };
function shopTarget(x) {
  for (const c of x.catSlugs) if (CAT_MENU[c]) return CAT_MENU[c];
  if (/thc-drinks|beverage/.test(x.slug)) return 'beverages';
  return null;
}
const targetName = (t) => (categories.find((c) => c.id === t) || {}).name || (t === 'specials' ? 'Specials' : 'the menu');

// ---------- events ----------
function cleanAddr(a) { return String(a || '').replace(/\s*\+\s*Google Map\s*$/i, '').replace(/\s+United States$/i, '').replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim(); }
function parseSchedule(s) {
  const at = String(s || '').split('@')[1];
  if (!at) return { allDay: true, label: '' };
  const m = at.trim().match(/^(\d{1,2}):(\d{2})\s*([ap]m)(?:\s*-\s*(\d{1,2}):(\d{2})\s*([ap]m))?\s*$/i);
  if (!m) return { allDay: false, label: at.trim() };
  const h24 = (h, mm, ap) => { let x = Number(h) % 12; if (/pm/i.test(ap)) x += 12; return String(x).padStart(2, '0') + ':' + mm; };
  return { allDay: false, start: h24(m[1], m[2], m[3]), end: m[4] ? h24(m[4], m[5], m[6]) : null, label: at.trim(), startLabel: `${Number(m[1])}:${m[2]} ${m[3].toLowerCase()}` };
}
function eventOf(p) {
  const e = p.event; const title = e.title || p.h1;
  const addr = cleanAddr(e.address);
  const store = addr ? stores.find((s) => addr.toLowerCase().includes(s.street.split(' ').slice(0, 2).join(' ').toLowerCase())) || null : null;
  const html = tidy(e.html);
  const everywhere = !addr && /all of our locations/i.test(plain(html)); // "vendors in all of our locations"
  const sched = parseSchedule(e.schedule);
  const start = e.startDate || '';
  return {
    cap: p, path: p.path + '/', slug: p.path.split('/').pop(), title, image: e.image ? e.image.src : null, imageAlt: `Event flyer: ${title}`,
    start, sched, schedule: e.schedule || '', addr, store, everywhere, html, upcoming: !!start && start >= TODAY,
    tags: store ? store.id : everywhere ? stores.map((s) => s.id).join(' ') : 'other',
    where: store ? `${store.city} · ${store.street}` : everywhere ? 'All three stores' : addr,
    when: start ? shortDate(start) + (sched.startLabel ? ' · ' + sched.startLabel : '') : e.schedule,
  };
}
const storePlace = (s) => ({ '@type': 'Place', name: `${brand.name}, ${s.city}`, address: { '@type': 'PostalAddress', streetAddress: s.street, addressLocality: s.city, addressRegion: s.region, postalCode: s.zip, addressCountry: 'US' } });
function eventLd(e, ctx = true) {
  const off = e.start ? nyOffset(e.start) : '';
  const endDay = e.sched.end && e.sched.end <= e.sched.start ? nextDay(e.start) : e.start;
  const location = e.store ? storePlace(e.store) : e.everywhere ? stores.map(storePlace) : e.addr ? { '@type': 'Place', name: e.addr, address: e.addr } : undefined;
  return {
    ...(ctx ? { '@context': 'https://schema.org' } : {}), '@type': 'Event', name: e.title, url: ORIGIN + e.path,
    startDate: e.sched.start ? `${e.start}T${e.sched.start}:00${off}` : e.start || undefined,
    endDate: e.sched.start && e.sched.end ? `${endDay}T${e.sched.end}:00${off}` : undefined,
    image: ldImg(e.image) ? [ldImg(e.image)] : undefined, description: trimWords(plain(e.html), 40) || undefined, location,
  };
}
// Google Calendar link, only when the captured schedule parses cleanly (a start and end time, or an all-day date)
function gcal(e) {
  if (!e.start) return null;
  const d = e.start.replace(/-/g, '');
  let dates;
  if (e.sched.allDay) dates = `${d}/${nextDay(e.start).replace(/-/g, '')}`;
  else if (e.sched.start && e.sched.end) {
    const endD = e.sched.end > e.sched.start ? d : nextDay(e.start).replace(/-/g, '');
    dates = `${d}T${e.sched.start.replace(':', '')}00/${endD}T${e.sched.end.replace(':', '')}00`;
  } else return null;
  const loc = e.store ? `${e.store.street}, ${e.store.city}, ${e.store.region} ${e.store.zip}` : e.addr;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${dates}&ctz=America%2FNew_York${loc ? '&location=' + encodeURIComponent(loc) : ''}&details=${encodeURIComponent(ORIGIN + e.path)}`;
}
// a flyer's date and venue lines wrap in narrow poster columns, so their pairs stay together: the "·" with what comes
// before it, a month with its day, a time with its am/pm and a short last word ("Ave", "St", "US-9") with the word
// before it (no "pm" or "Ave" alone on a line)
const NB = ' ';
const noOrphan = (s) => String(s || '').replace(/ (\S+)$/, (m, w) => (w.replace(/[^\p{L}\p{N}]/gu, '').length <= 4 ? NB : ' ') + w);
const keepTogether = (s) => noOrphan(String(s || '').replace(/ ·/g, NB + '·').replace(/\b([A-Z][a-z]{2}) (\d{1,2},)/g, `$1${NB}$2`).replace(/(\d) ([ap]m)\b/gi, `$1${NB}$2`));
const flyerOf = (e) => ({ path: e.path, title: e.title, image: e.image, imageAlt: e.imageAlt, when: keepTogether(e.when), where: keepTogether(e.where) });
// a poster's own shape (width / height)
const arOf = (url) => { const r = url && mediaId(url) && imgInfo(mediaId(url)); return r && r.w && r.h ? Math.round((r.w / r.h) * 1000) / 1000 : 0.8; };
// the poster wall hangs whole posters in equal cells, a landscape poster across two (content.css .ct-wall). Its rows are
// centred, so a landscape poster that cannot fit at the end of a row would leave that row short: the wall keeps the
// newest-first order but lets each landscape poster trade places with its neighbours, as few places as possible, so
// every row of the full wall closes level at two, three and four across (only the last row may be short)
const isWide = (e) => arOf(e.image) >= 1.2;
function wallOrder(list) {
  const wideAt = list.map(isWide); const k = wideAt.filter(Boolean).length; const n = list.length;
  if (!k || k > 6) return list;
  const short = (units) => [2, 3, 4].reduce((sum, cols) => {
    let used = 0, bad = 0;
    for (const u of units) { const w = Math.min(u, cols); if (used + w > cols) { bad++; used = 0; } used += w; if (used === cols) used = 0; }
    return sum + bad;
  }, 0);
  const wides = list.filter((e, i) => wideAt[i]), rest = list.filter((e, i) => !wideAt[i]);
  let best = null;
  const pick = (from, chosen) => {
    if (chosen.length === k) {
      const order = []; let wi = 0, ri = 0;
      for (let i = 0; i < n; i++) order.push(chosen.includes(i) ? wides[wi++] : rest[ri++]);
      const score = short(order.map((e) => (isWide(e) ? 2 : 1))) * 1000 + order.reduce((d, e, i) => d + Math.abs(i - list.indexOf(e)), 0);
      if (!best || score < best.score) best = { score, order };
      return;
    }
    for (let i = from; i <= n - (k - chosen.length); i++) pick(i + 1, [...chosen, i]);
  };
  pick(0, []);
  return best.order;
}
// event posters as the shared gradient carousel (DESIGN.md: "Event posters: the gradient carousel"), the home events
// band's markup: the taped flyers, one per slide, their reveal/tilt hooks dropped (the carousel moves the card). Behaviour
// src/scripts/gcarousel.js [data-gcar] (it tints the .gcar-band behind it); styles gcarousel.css. Without JS: a swipe row.
const gcarGlow = '<div class="gcar-glow" data-gcar-glow><i class="gcar-glow__a"></i><i class="gcar-glow__b"></i><i class="gcar-glow__c"></i></div>';
function gcar(list, label) {
  if (!list.length) return '';
  const card = (e, i) => flyer(flyerOf(e), { i, cls: 'gcar__flyer' }).replace(/^<article\b[^>]*>/, (t) => t.replace(/\s+data-(?:reveal|tilt)(?:="[^"]*")?/g, ''));
  return `<div class="gcar" role="region" aria-roledescription="carousel" aria-label="${esc(label)}" data-gcar data-reveal>
    <div class="gcar__stage"><div class="gcar__track">${list.map((e, i) => `<div class="gcar__slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${list.length}" data-gcar-slide>${card(e, i)}</div>`).join('')}</div></div>
    <div class="gcar__foot">
      <div class="gcar__ctrl" data-gcar-ctrl hidden>
        <button class="gcar__btn" type="button" aria-label="Previous event" data-gcar-prev>${icon('arrow-l')}</button>
        <p class="gcar__count" aria-hidden="true"><b data-gcar-now>01</b><i class="gcar__bar"><i></i></i><span>${String(list.length).padStart(2, '0')}</span></p>
        <button class="gcar__btn" type="button" aria-label="Next event" data-gcar-next>${icon('arrow')}</button>
      </div>
    </div>
    <p class="sr" aria-live="polite" aria-atomic="true" data-gcar-live></p>
  </div>`;
}

// ---------- shared content blocks ----------
const metaItem = (ic, html) => `<span class="ct-meta__i">${icon(ic)}${html}</span>`;
const topicLinks = (cats, cur, o = {}) => `<ul class="ct-topics${o.cls ? ' ' + o.cls : ''}">${cats.map((c, i) => `<li data-reveal style="--i:${i % 8}"><a href="${href(c.path)}"${c.slug === cur ? ' aria-current="page"' : ''}><span>${esc(c.name)}</span><small>${c.posts.length}</small></a></li>`).join('')}</ul>`;
const filterChips = (scope, items, label) => `<div class="chips ct-filter" data-filter-group="${scope}" role="group" aria-label="${esc(label)}">${items.map((it, i) => `<button class="chipbtn" type="button" data-filter="${esc(it.v)}" aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(it.label)}<small class="ct-n">${it.n}</small></button>`).join('')}</div>`;
const storePick = () => `<p class="ct-storepick">${icon('pin')}<span>Shopping <b data-store-name>${esc(DEF.name)}</b></span><button class="ct-storepick__btn" type="button" data-open-store>Change store</button></p>`;

// the cover story: the image fills the card, a glass panel carries the words
function feature(x, o = {}) {
  const h = o.h || 'h2';
  return `<article class="ct-feature${o.cls ? ' ' + o.cls : ''}" data-reveal>
  <a class="ct-feature__art" href="${href(x.path)}" tabindex="-1" aria-hidden="true">${x.image ? mediaImg(x.image, { decorative: true, sizes: '(min-width: 1000px) 66vw, 100vw' }) : ''}</a>
  <div class="ct-feature__panel glass">
    ${kicker(o.kicker || 'Latest')}
    ${x.cats.length ? `<p class="ct-feature__cats">${x.cats.map((c) => `<span class="ct-tag">${esc(c)}</span>`).join('')}</p>` : ''}
    <${h} class="ct-feature__t" style="--fit:${fitEm(x.title)}"><a href="${href(x.path)}">${esc(x.title)}</a></${h}>
    ${x.excerpt ? `<p class="ct-feature__x">${esc(trimWords(x.excerpt, 30))}</p>` : ''}
    <p class="ct-feature__meta"><span>${icon('cal')}${esc(x.date)}</span><span>${icon('clock')}${x.mins} min read</span><span class="ct-feature__go">Read the article${icon('arrow')}</span></p>
  </div>
</article>`;
}
const miniPost = (x, i) => `<a class="ct-mpost" href="${href(x.path)}" data-reveal style="--i:${i + 1}"><span class="ct-mpost__art">${x.image ? mediaImg(x.image, { decorative: true, sizes: '180px' }) : ''}</span><span class="ct-mpost__body"><span class="ct-mpost__cat">${esc(x.cats[0] || 'Blog')}</span><span class="ct-mpost__t">${esc(x.title)}</span><span class="ct-mpost__d">${esc(x.date)}</span></span></a>`;
const cell = (x, i) => `<div class="ct-cell" data-tags="${esc(x.catSlugs.join(' ') || 'blog')}">${postCard(card(x), { i: i % 3 })}</div>`;

// "Shop the category": the category illustration behind glass; the button opens that shelf on the live menu
function shopBand(target, o = {}) {
  const c = categories.find((x) => x.id === target);
  const name = targetName(target);
  const art = c ? img(c.img, { decorative: true, sizes: '100vw', min: 1200 }) : img(target === 'specials' ? 'wall-mural-wide' : 'store-mural', { decorative: true, sizes: '100vw', min: 1200 });
  const text = c ? c.blurb : target === 'specials' ? 'Every store posts its own specials on the live menu.' : 'Browse every shelf on the live menu for your store.';
  const label = target === 'all' ? 'Shop the live menu' : target === 'specials' ? 'Shop specials' : `Shop ${name}`;
  return band(`<div class="ct-shop glass" data-reveal>
    ${kicker(o.kicker || 'Shop the category')}
    ${dh('Shop', target === 'all' ? 'the menu' : name, { size: 'md', id: o.id ? o.id + '-h' : null })}
    <p class="ct-shop__p">${esc(text)}</p>
    <div class="btns">${menuBtn(target, label)}</div>
    ${storePick()}
  </div>`, { tone: 'ink', cls: 'ct-shopband', id: o.id || null, labelledby: o.id ? o.id + '-h' : null, backdrop: `${art}<div class="ct-shade"></div>`, after: o.after || '' });
}

// ================= ARTICLE =================
function postPage(x, D) {
  // a section heading the source tagged h1 (one post) becomes an h2: the page keeps one H1, the outline keeps the section
  const { html, toc } = sectionize(tidy(x.html).replace(/<(\/?)h1>/g, '<$1h2>'));
  const cat = x.catSlugs.length ? D.catBySlug[x.catSlugs[0]] : null;
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog/' }, ...(cat ? [{ label: cat.name, href: cat.path }] : []), { label: x.title, href: x.path }];
  const target = shopTarget(x);
  const chips = x.cats.map((c) => D.catBySlug[slug(c)] ? `<a class="ct-chip" href="${href(D.catBySlug[slug(c)].path)}">${esc(c)}</a>` : `<span class="ct-chip">${esc(c)}</span>`).join('');
  const lede = `<span class="ct-meta">${chips}${x.date ? metaItem('cal', `<time datetime="${esc(x.iso.slice(0, 10))}">${esc(x.date)}</time>`) : ''}${x.author ? metaItem('user', `By ${esc(x.author)}`) : ''}${metaItem('clock', `${x.mins} min read`)}</span>`;
  const hero = pageHero({ cls: 'ct-ahero', crumbs, kicker: BLOG, title: split2(x.title), lede, ledeHtml: true, img: x.image ? { url: x.image } : 'wall-mural-wide', fit: true });

  // a short last word stays with the one before it ("Experience Something New" never leaves "New" alone in the column)
  const tocList = toc.map((t, i) => `<li><a href="#${t.id}"><span class="ct-toc__n">${String(i + 1).padStart(2, '0')}</span><span>${esc(noOrphan(t.text))}</span></a></li>`).join('');
  const tocSide = toc.length > 1 ? `<nav class="ct-toc" aria-labelledby="ct-toc-h"><p class="ct-toc__t" id="ct-toc-h">Table of Contents</p><ol>${tocList}</ol></nav>` : '';
  const tocTop = toc.length > 1 ? `<details class="ct-toc ct-toc--top"><summary><span>Table of Contents</span><small>${toc.length} sections</small>${icon('chev')}</summary><ol>${tocList}</ol></details>` : '';
  const mini = `<div class="ct-mini">
    <p class="ct-mini__k">${icon('bag')}${target && target !== 'all' ? (target === 'specials' ? 'Shop specials' : `Shop ${esc(targetName(target))}`) : 'Shop the menu'}</p>
    <p class="ct-mini__s">Shopping <b data-store-name>${esc(DEF.name)}</b></p>
    ${menuBtn(target || 'all', target === 'specials' ? 'See specials' : target ? `Shop ${targetName(target)}` : 'Shop now', { size: 'sm' })}
  </div>`;
  const share = `<div class="ct-share"><p class="ct-share__t">Like it? Share it!</p><ul>${brand.social.map((s) => `<li><a href="${esc(s.href)}" target="_blank" rel="noopener" aria-label="${esc(s.name)} (opens in a new tab)">${icon(s.icon)}</a></li>`).join('')}</ul></div>`;
  const cover = x.image ? `<figure class="ct-cover" data-reveal="develop">${mediaImg(x.image, { alt: x.imageAlt || '', sizes: '(min-width: 1100px) 880px, 100vw', eager: true })}</figure>` : '';
  const article = band(`<div class="ct-article${toc.length > 1 ? '' : ' ct-article--plain'}">
  <aside class="ct-aside" aria-label="About this article">${tocSide}${mini}</aside>
  <div class="ct-main">
    ${cover}
    ${tocTop}
    <article class="ct-body" aria-label="${esc(x.title)}">
      ${prose(html, { cls: 'ct-prose' })}
    </article>
    <footer class="ct-endnote" data-reveal>
      ${x.cats.length ? `<div class="ct-filed"><p class="ct-filed__t">Filed under</p><p class="ct-filed__list">${chips}</p></div>` : ''}
      ${share}
    </footer>
  </div>
</div>`, { tone: 'night', cls: 'ct-artband', id: 'ct-article' });

  const related = relatedOf(x, D.posts, 3);
  const keep = band(`<div class="band__head"><div class="band__intro">${kicker('From the blog')}${dh('Keep', 'Reading', { id: 'ct-keep-h' })}</div><div data-reveal>${btn('All articles', '/blog/', { kind: 'ghost' })}</div></div>
  <div class="grid grid--3 ct-related">${related.map((r, i) => postCard(card(r), { i })).join('')}</div>`,
  { tone: 'night', lit: true, sheet: true, labelledby: 'ct-keep-h', lx: '20%', ly: '0%' });

  const shop = shopBand(target || 'all', {
    kicker: target ? 'Shop the category' : 'Shop the menu', id: 'ct-shop',
    after: floatObj(target === 'flower' || target === 'pre-rolls' ? 'obj-bud-b' : 'obj-bud-a', { cls: 'ct-float ct-float--shop', style: 'right:5%;top:-64px;width:min(150px,15vw)', depth: 0.14, sizes: '160px' }),
  });

  const ld = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: x.title, description: x.cap.description || undefined,
    image: ldImg(x.image) ? [ldImg(x.image)] : undefined, datePublished: x.iso || undefined, dateModified: x.modified || undefined,
    author: x.author ? { '@type': 'Person', name: x.author } : undefined, publisher: publisher(), mainEntityOfPage: { '@type': 'WebPage', '@id': ORIGIN + x.path },
    articleSection: x.cats.join(', ') || undefined,
  };
  return { path: x.path, title: x.cap.title, description: x.cap.description || trimWords(x.excerpt, 26), type: 'post', ogType: 'article', crumbs, jsonld: [ld], ogImage: ogOf(x.image), main: hero + article + shop + keep + signUp() };
}
function relatedOf(x, posts, k) {
  const score = (y) => y.catSlugs.filter((c) => x.catSlugs.includes(c)).length;
  const others = posts.filter((y) => y.path !== x.path);
  const same = others.filter((y) => score(y) > 0).sort((a, b) => score(b) - score(a) || b.iso.localeCompare(a.iso));
  const fill = others.filter((y) => !same.includes(y));
  return [...same, ...fill].slice(0, k);
}

// ================= TOPIC ARCHIVE =================
function catPage(c, D) {
  const list = c.posts; const lead = list[0];
  const target = CAT_MENU[c.slug] || null;
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog/' }, { label: c.name, href: c.path }];
  const hero = pageHero({
    cls: 'ct-chero', crumbs, kicker: BLOG, title: split2(c.name),
    lede: list.length > 1 ? `${list.length} articles filed under ${c.name}, newest first.` : `One article filed under ${c.name} so far.`,
    ctas: (target ? menuBtn(target, target === 'specials' ? 'Shop specials' : `Shop ${targetName(target)}`) : '') + btn('All articles', '/blog/', { kind: target ? 'ghost' : 'lime' }),
    img: lead && lead.image ? { url: lead.image } : 'wall-mural-wide',
  });
  const rest = list.slice(1);
  const body = band(`<nav class="ct-sib" aria-label="Blog topics" data-reveal><p class="ct-sib__t">Topics</p>${topicLinks(D.cats, c.slug, { cls: 'ct-topics--row' })}</nav>
  ${lead ? feature(lead, { kicker: 'Latest in ' + c.name }) : ''}
  ${rest.length ? `<h2 class="ct-sub" data-reveal>More ${esc(c.name)} reads</h2><div class="grid grid--3 ct-grid">${rest.map((r, i) => postCard(card(r), { i: i % 3 })).join('')}</div>` : ''}
  ${list.length <= 3 ? `<h2 class="ct-sub" data-reveal>More from the blog</h2><div class="grid grid--3 ct-grid">${D.posts.filter((y) => !list.includes(y)).slice(0, 3).map((r, i) => postCard(card(r), { i })).join('')}</div>` : ''}`,
  { tone: 'night', lit: true, cls: 'ct-catband', lx: '80%', ly: '0%', after: floatObj('obj-spraycan', { cls: 'ct-float', style: 'right:3%;bottom:-70px;width:min(110px,11vw)', depth: 0.12, sizes: '140px' }) });
  const shop = target ? shopBand(target, { id: 'ct-shop' }) : '';
  const ld = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: c.name, url: ORIGIN + c.path,
    isPartOf: { '@type': 'Blog', name: BLOG, url: ORIGIN + '/blog/' },
    mainEntity: { '@type': 'ItemList', itemListElement: list.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: ORIGIN + x.path, name: x.title })) },
  };
  return {
    path: c.path, title: c.cap.title, type: 'blog',
    description: c.cap.description || `Every article filed under ${c.name} on ${BLOG}, the ${brand.short} blog for our Albany, Clifton Park and Schenectady dispensaries.`,
    crumbs, jsonld: [ld], ogImage: lead ? ogOf(lead.image) : undefined, main: hero + body + shop + signUp(),
  };
}

// the rack's closing tile: Cannabis 101 behind glass (fills the last row; it carries no data-tags, so filters keep it)
const rackEnd = () => `<aside class="ct-rack__end" data-reveal aria-label="Cannabis 101"><div class="ct-rack__art" aria-hidden="true">${img('wall-mural', { decorative: true, sizes: '(min-width: 1000px) 60vw, 100vw' })}</div>
  <div class="ct-rack__panel glass">${kicker('New here?')}<p class="ct-rack__t">Start with Cannabis 101</p><p>What to bring, how to pay and what New York allows, on one page.</p>${btn('Cannabis 101', '/learn/')}</div></aside>`;

// ================= BLOG HUB =================
function blogHub(D) {
  const b = cap('/blog') || {};
  const list = D.posts; const lead = list[0];
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog/' }];
  const hero = pageHero({
    cls: 'ct-bhero', crumbs, kicker: 'The blog', title: split2(b.h1 || BLOG), lede: b.description || '',
    ctas: btn('Cannabis 101', '/learn/') + btn('Browse topics', '#ct-topics', { kind: 'ghost' }), img: 'wall-mural-wide', sticker: n(list.length, 'article', 'articles'),
  });
  const cover = band(`<div class="band__head"><div class="band__intro">${kicker('New on the blog')}${dh('Cover', 'Story', { id: 'ct-cover-h' })}</div></div>
  <div class="ct-coverstory">
    ${feature(lead)}
    <div class="ct-also"><p class="ct-also__t" data-reveal>Also new</p>${list.slice(1, 4).map(miniPost).join('')}</div>
  </div>`, { tone: 'night', lit: true, spot: true, labelledby: 'ct-cover-h', lx: '75%', ly: '10%' });
  const chips = [{ v: 'all', label: 'All', n: list.length }, ...D.cats.map((c) => ({ v: c.slug, label: c.name, n: c.posts.length }))];
  const rack = band(`<div class="band__head"><div class="band__intro">${kicker('Every article')}${dh('The', 'Rack', { id: 'ct-rack-h' })}</div><p class="lede" data-reveal>Guides, strain picks, local things to do and store news. Tap a topic to filter.</p></div>
  ${filterChips('ct-rack', chips, 'Filter articles by topic')}
  <div class="ct-rack" id="ct-rack">${list.map(cell).join('')}${rackEnd()}</div>
  <p class="ct-empty" data-filter-empty hidden>No articles under that topic yet.</p>`,
  { tone: 'ink', sheet: true, labelledby: 'ct-rack-h', cls: 'ct-rackband', after: floatObj('obj-spraycan', { cls: 'ct-float', style: 'right:4%;top:-80px;width:min(120px,12vw)', depth: 0.12, sizes: '140px' }) });
  const topics = band(`<div class="ct-topicsband">
    <div class="ct-topicsband__intro">${kicker('Browse by topic')}${dh('Pick a', 'Topic', { id: 'ct-topics-h' })}<p class="ct-topicsband__p" data-reveal>Every topic has its own page. New to all this? Start with the basics.</p>
      <div class="btns" data-reveal>${btn('Cannabis 101', '/learn/', { kind: 'ink' })}${btn('FAQs', '/faq/', { kind: 'ghost' })}</div></div>
    ${topicLinks(D.cats, null, { cls: 'ct-topics--mint' })}
  </div>`, { tone: 'mint', id: 'ct-topics', labelledby: 'ct-topics-h', lx: '85%', ly: '0%', tight: true });
  const ld = {
    '@context': 'https://schema.org', '@type': 'Blog', name: b.h1 || BLOG, url: ORIGIN + '/blog/', description: b.description || undefined, publisher: publisher(),
    blogPost: list.map((x) => ({ '@type': 'BlogPosting', headline: x.title, url: ORIGIN + x.path, datePublished: x.iso || undefined, image: ldImg(x.image) })),
  };
  return { path: '/blog/', title: b.title || `${BLOG} - ${brand.short}`, description: b.description || '', type: 'blog', crumbs, jsonld: [ld], ogImage: ogOf(lead && lead.image), main: hero + cover + rack + topics + signUp() };
}

// ================= CANNABIS 101 (NEW) =================
const LEARN_FAQ = [ // captured questions, answered in the client's own words (home, store pages, /visit-us/)
  'Is recreational cannabis legal in New York, and what do I need to shop?',
  'Do I have to be a NY resident to buy cannabis?',
  "Can I shop for weed if I'm from out of state?",
  'How much cannabis can adults purchase per day in New York State?',
  'What forms of payment do you accept?',
  'Can I return or exchange products at any location?',
  'What types of cannabis products can I buy in New York?',
  'Is Capital District Cannabis & Wellness a licensed New York dispensary?',
  'What are the benefits of buying from a licensed New York dispensary versus unlicensed shops?',
  'Will someone help me find the best cannabis products for my preferences?',
];
function capturedFaqs() {
  const by = new Map();
  for (const p of allPages()) for (const m of p.modules) for (const b of m.blocks) if (b.t === 'faq' && !by.has(b.q)) by.set(b.q, { q: b.q, a: b.a, html: b.html });
  return LEARN_FAQ.map((q) => by.get(q)).filter(Boolean);
}
// the explainer post for a menu shelf, when the blog has one
const GUIDE_POST = { flower: '/blog/cannabis-flower', 'pre-rolls': '/blog/cannabis-pre-rolls', edibles: '/blog/cannabis-edibles', vapes: '/blog/cannabis-vape-carts', concentrates: '/blog/cannabis-concentrates', beverages: '/blog/cannabis-thc-drinks', cbd: '/blog/your-local-guide-to-buying-cbd-products-in-albany-schenectady-ny' };
function learnPage(D) {
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Cannabis 101', href: '/learn/' }];
  const hero = pageHero({
    crumbs, kicker: 'Start here', title: ['Cannabis', '101'],
    lede: 'New to cannabis, or new to buying it in New York? Start with the basics: what to bring, how to pay, what the law allows, and a quick guide to every shelf on the menu.',
    ctas: btn('Your first visit', '#ct-first') + menuBtn('all', 'Shop the menu', { kind: 'ghost' }), img: 'wall-mural', sticker: '21+ with valid ID',
  });
  const first = [
    { icon: 'id', title: 'Bring your ID', text: 'You must be 21 or older with a valid government-issued photo ID. State-issued and out-of-state IDs both work.' },
    { icon: 'pin', title: 'No NY address needed', text: 'You do not need to live in New York. Any adult 21 or older, visiting or passing through, can buy at a licensed dispensary.' },
    { icon: 'cash', title: 'How to pay', text: `We accept ${brand.payment}.` },
    { icon: 'leaf', title: 'Know the limits', text: 'New York sets two purchase limits: 3 ounces of flower and 24 grams of concentrates, vape oils and dabs included. Stocking up? Ask your budtender.' },
    { icon: 'clock', title: 'Order ahead', text: 'Pre-order online for any of our three stores. Choose the right pickup location at checkout and your order is prepared there.' },
    { icon: 'mic', title: 'Ask a budtender', text: 'Tell the team what you are after, from relief to creativity, sleep or flavor, and they will walk you through strains, potencies and formats.' },
    { icon: 'bag', title: 'Sales are final', text: 'Products cannot be returned or exchanged once they leave the store, unless there is a confirmed defect. Call the store where you bought it.' },
    { icon: 'route', title: 'Keep it in New York', text: 'Crossing state lines with cannabis is illegal, so enjoy your purchases while you are in the Empire State.' },
  ];
  const start = band(`<div class="band__head"><div class="band__intro">${kicker('Start here')}${dh('Your first', 'Visit', { id: 'ct-first-h' })}</div><p class="lede" data-reveal>Eight things to know before you walk up to the counter at any of our three stores.</p></div>
  <div class="grid grid--4 ct-first">${first.map((f, i) => glassCard({ ...f, i: i % 4, cls: 'ct-gcard' })).join('')}</div>`,
  { tone: 'night', lit: true, spot: true, id: 'ct-first', labelledby: 'ct-first-h', cls: 'ct-firstband', lx: '70%', ly: '10%', backdrop: `${img('wall-mural-wide', { decorative: true, sizes: '100vw', min: 1400 })}<div class="ct-shade ct-shade--deep"></div>` });

  const guides = band(`<div class="band__head"><div class="band__intro">${kicker('Product guides')}${dh('Know your', 'Shelves', { id: 'ct-guides-h' })}</div><p class="lede" data-reveal>Ten shelves on the live menu. Read up first, then shop the shelf at your store.</p></div>
  <div class="ct-guides">${categories.map((c, i) => {
    const arch = D.catBySlug[c.id];
    const gp = GUIDE_POST[c.id] && cap(GUIDE_POST[c.id]) ? GUIDE_POST[c.id] + '/' : null;
    const link = arch ? `<a class="ct-guide__link" href="${href(arch.path)}">${esc(n(arch.posts.length, 'article', 'articles'))}<span class="sr"> about ${esc(c.name)}</span>${icon('arrow')}</a>` : gp ? `<a class="ct-guide__link" href="${href(gp)}">Read the guide${icon('arrow')}</a>` : '';
    return `<article class="ct-guide" data-reveal data-tilt style="--i:${i % 5}">
      <div class="ct-guide__art" aria-hidden="true">${img(c.img, { decorative: true, sizes: '(min-width: 1200px) 260px, (min-width: 560px) 45vw, 90vw', min: 480 })}</div>
      <div class="ct-guide__panel glass"><span class="ct-guide__no">${String(i + 1).padStart(2, '0')}</span><h3 class="ct-guide__t">${esc(c.name)}</h3><p class="ct-guide__p">${esc(c.blurb)}</p>${link}${menuBtn(c.id, `Shop ${c.name}`, { size: 'sm' })}</div>
    </article>`;
  }).join('')}</div>`,
  { tone: 'ink', sheet: true, labelledby: 'ct-guides-h', cls: 'ct-guidesband', after: floatObj('obj-bud-b', { cls: 'ct-float', style: 'right:4%;top:-90px;width:min(130px,13vw)', depth: 0.14, sizes: '150px' }) });

  const reads = band(`<div class="band__head"><div class="band__intro">${kicker('From the blog')}${dh('Featured', 'Articles', { id: 'ct-reads-h' })}</div><div data-reveal>${btn('All articles', '/blog/', { kind: 'ghost' })}</div></div>
  <div class="grid grid--3">${D.posts.slice(0, 6).map((x, i) => postCard(card(x), { i: i % 3 })).join('')}</div>`, { tone: 'night', lit: true, labelledby: 'ct-reads-h', lx: '15%', ly: '0%' });

  const faqs = capturedFaqs();
  // the shared FAQ section (parts.mjs faqSection, the home FAQ's layout); "KNOW THE" keeps one line (fit 6.8em)
  const basics = band(faqSection({ kicker: 'NY cannabis basics', heading: ['Know the', 'Basics'], size: 'lg', fit: 6.8, id: 'ct-basics-h', items: faqs,
    lede: 'Straight answers from our store pages on buying cannabis in New York.', cta: btn('All FAQs', '/faq/', { kind: 'ink' }) + btn('How to order', '/how-to-order/', { kind: 'ghost' }),
    name: 'learn', label: 'Side B · The basics' }),
  { tone: 'mint', labelledby: 'ct-basics-h', id: 'ct-basics', lx: '20%', ly: '0%' });

  const next = band(`<div class="band__head"><div class="band__intro">${kicker('Keep going')}${dh('Next', 'Tracks', { id: 'ct-next-h' })}</div></div>
  <div class="grid grid--4 ct-nextgrid">${[
    { icon: 'search', title: 'FAQs', text: 'More answers on ordering, ID, payment and our stores.', href: '/faq/', go: 'Read the FAQs' },
    { icon: 'bag', title: 'How to order', text: 'Shop the live menu, pick your store and check out for pickup.', href: '/how-to-order/', go: 'See how it works' },
    { icon: 'cal', title: 'Events', text: 'Car meets, boat parties, pop-ups and more from the crew.', href: '/events/', go: 'See the events' },
    { icon: 'spark', title: 'The blog', text: 'Guides, strain picks and local things to do.', href: '/blog/', go: 'Read the blog' },
  ].map((g, i) => glassCard({ ...g, i, cls: 'ct-gcard' })).join('')}</div>`,
  { tone: 'night', lit: true, sheet: true, labelledby: 'ct-next-h', cls: 'ct-nextband', backdrop: `${img('turntable', { decorative: true, sizes: '100vw', min: 1400 })}<div class="ct-shade ct-shade--deep"></div>`, lx: '70%', ly: '20%' });

  const ld = [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }];
  return {
    path: '/learn/', title: 'Cannabis 101 & First-Visit Guide - Capital District Cannabis', type: 'learn', crumbs, jsonld: ld, ogImage: 'img/wall-mural-1600.webp',
    description: 'New to cannabis in New York? What to bring, how to pay, NY purchase limits and a guide to every shelf at our Albany, Clifton Park and Schenectady stores.',
    main: hero + start + guides + reads + basics + next + signUp(),
  };
}

// ================= EVENTS HUB =================
function eventsHub(D) {
  const ev = cap('/events') || {};
  const up = D.events.filter((e) => e.upcoming).sort((a, b) => a.start.localeCompare(b.start));
  const past = D.events.filter((e) => !e.upcoming);
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Events', href: '/events/' }];
  const h1 = (ev.title || 'Upcoming Events').replace(/\s+[–-]\s+Capital District Cannabis$/, '');
  const hero = pageHero({
    crumbs, kicker: 'Events & culture', title: split2(h1),
    lede: 'Car meets, boat parties, grand openings, vendor pop-ups and Toke & Teach sessions across the Capital Region.',
    ctas: (up.length ? btn('What is next', '#ct-next') : '') + btn('Past events', '#ct-past', { kind: up.length ? 'ghost' : 'lime' }), img: 'alley', sticker: '21+',
  });
  const tt = `<video id="ct-tt" class="ct-tt" muted playsinline loop preload="none" poster="${posterOf('loop-turntable')}" data-src="${asset('video/turntable-1600.mp4')}" data-src-sm="${asset('video/turntable-960.mp4')}" aria-hidden="true"></video><div class="ct-shade ct-shade--tt"></div>`;
  const toggle = `<button class="ct-ttbtn" type="button" data-video-toggle aria-controls="ct-tt" aria-pressed="false" aria-label="Pause the loop">${icon('pause', 'ico ct-i-pause')}${icon('play', 'ico ct-i-play')}</button>`;
  const insta = brand.social.find((s) => s.icon === 'instagram');
  const nextInner = up.length
    ? `<div class="band__head"><div class="band__intro">${kicker('Up next')}${dh('Next', 'Up', { id: 'ct-next-h' })}</div></div>${gcar(up, 'Upcoming events')}`
    : `<div class="ct-next glass" data-reveal>
      ${kicker('Up next')}${dh('Next', 'Up', { id: 'ct-next-h', size: 'md' })}
      <p class="ct-next__p">No upcoming events are posted right now. Check back soon, and catch up on what went down below.</p>
      <div class="btns">${btn('Past events', '#ct-past')}${insta ? btn('Follow on Instagram', insta.href, { kind: 'ghost' }) : ''}</div>
    </div>`;
  // upcoming flyers are the gradient carousel (tinted by the active poster, over the turntable); none: the glass note
  const nextBand = band(`${nextInner}<div class="ct-ttbar">${toggle}<span class="ct-ttbar__k">Side A · Now spinning</span></div>`,
    { tone: 'night', id: 'ct-next', labelledby: 'ct-next-h', cls: up.length ? 'ct-nextup ct-nextup--up gcar-band' : 'ct-nextup', backdrop: tt + (up.length ? gcarGlow : '') });

  const venues = [...stores.map((s) => ({ v: s.id, label: s.city, n: past.filter((e) => e.tags.split(' ').includes(s.id)).length })), { v: 'other', label: 'Other venues', n: past.filter((e) => e.tags === 'other').length }];
  const wall = band(`<div class="band__head"><div class="band__intro">${kicker('The poster wall')}${dh('Past', 'Events', { id: 'ct-past-h' })}</div><p class="lede" data-reveal>${n(past.length, 'event', 'events')} and counting, from grand openings to boat parties. Filter by store.</p></div>
  ${filterChips('ct-wall', [{ v: 'all', label: 'All', n: past.length }, ...venues], 'Filter past events by store or venue')}
  <div class="ct-wall" id="ct-wall">${wallOrder(past).map((e, i) => `<div class="ct-cell${isWide(e) ? ' ct-cell--wide' : ''}" data-tags="${esc(e.tags)}">${flyer(flyerOf(e), { i })}</div>`).join('')}</div>
  <p class="ct-empty" data-filter-empty hidden>No past events at that venue yet.</p>`,
  { tone: 'ink', sheet: true, id: 'ct-past', labelledby: 'ct-past-h', cls: 'ct-wallband', after: floatObj('obj-boombox', { cls: 'ct-float', style: 'right:3%;top:-70px;width:min(220px,18vw)', depth: 0.12, sizes: '240px' }) });

  // recurring nights, grouped from the captured event titles
  const SERIES = [
    { title: 'Boat Party', re: /boat party/i, icon: 'spark' },
    { title: 'Summer Smokeout', re: /smokeout/i, icon: 'star' },
    { title: 'Dab Day', re: /dab day/i, icon: 'cal' },
    { title: 'Car and bike meets', re: /car meet|cars & canna|cycles & canna/i, icon: 'route' },
  ];
  const rot = SERIES.map((s) => ({ ...s, list: D.events.filter((e) => s.re.test(e.title)).sort((a, b) => a.start.localeCompare(b.start)) })).filter((s) => s.list.length > 1);
  // the intro runs across the top (the lede beside the heading) and the series sit two to a row beneath it, so no column
  // stands half empty beside a long one (ct-rot in content.css, tracks--2 in components.css)
  const series = rot.length ? band(`<div class="ct-rot">
    <div class="band__head ct-rot__intro"><div class="band__intro">${kicker('On repeat')}${dh('The', 'Rotation', { id: 'ct-rot-h' })}</div><p class="ct-rot__p" data-reveal>Some nights come back around. Here is the rotation so far.</p></div>
    ${tracklist(rot.map((s) => ({ title: s.title, html: true, icon: s.icon, text: `<span class="ct-rot__list">${s.list.map((e) => `<a class="ct-rot__a" href="${href(e.path)}"><span>${esc(e.title)}</span><span class="ct-rot__d">${esc(shortDate(e.start))}</span></a>`).join('')}</span>` })), { cls: 'ct-tracks tracks--2' })}
  </div>`, { tone: 'mint', labelledby: 'ct-rot-h', lx: '80%', ly: '0%' }) : '';

  const ld = [{ '@context': 'https://schema.org', '@type': 'ItemList', name: h1, itemListElement: D.events.map((e, i) => ({ '@type': 'ListItem', position: i + 1, item: eventLd(e, false) })) }];
  return {
    path: '/events/', title: ev.title || `${h1} - ${brand.short}`, description: ev.description || '', type: 'events', crumbs, jsonld: ld,
    ogImage: ogOf((up[0] || past[0] || {}).image), main: hero + nextBand + wall + series + signUp(),
  };
}

// ================= EVENT =================
function eventPage(e, D) {
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Events', href: '/events/' }, { label: e.title, href: e.path }];
  const cal = e.upcoming ? gcal(e) : null;
  const time = e.sched.label || (e.sched.allDay ? 'All day' : '');
  const lede = `<span class="ct-meta">${e.start ? metaItem('cal', `<time datetime="${esc(e.start)}">${esc(longDate(e.start))}</time>`) : ''}${time ? metaItem('clock', esc(time)) : ''}${e.where ? metaItem('pin', esc(e.where)) : ''}</span>`;
  const hero = pageHero({
    cls: 'ct-ahero ct-ehero', crumbs, kicker: e.upcoming ? 'Upcoming event' : 'Past event', title: split2(e.title), lede, ledeHtml: true, fit: true,
    ctas: (cal ? `<a class="btn btn--lime" href="${esc(cal)}" target="_blank" rel="noopener" data-magnetic><span>Add to calendar</span>${icon('cal')}</a>` : '') + btn(e.upcoming ? 'All events' : 'See what is next', '/events/', { kind: cal ? 'ghost' : 'lime' }),
    img: e.image ? { url: e.image } : 'alley',
  });
  const s = e.store;
  const dirUrl = s ? s.directions : e.addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.addr)}` : null;
  const rows = [
    e.start ? ['cal', 'Date', esc(longDate(e.start))] : null,
    time ? ['clock', 'Time', esc(time)] : null,
    s ? ['pin', 'Venue', `${esc(brand.name)}, ${esc(s.city)}`] : e.everywhere ? ['pin', 'Venue', 'All three stores'] : null,
    s ? ['route', 'Address', `${esc(s.street)}, ${esc(s.city)}, ${esc(s.region)} ${esc(s.zip)}`] : e.addr ? ['route', 'Address', esc(e.addr)] : null,
    ['spark', 'Status', e.upcoming ? 'Upcoming' : 'This one has wrapped'],
  ].filter(Boolean);
  // the button row only when it has a button (an event with no address, store or calendar link has none)
  const ctas = [
    cal ? `<a class="btn btn--lime btn--sm" href="${esc(cal)}" target="_blank" rel="noopener"><span>Add to calendar</span>${icon('cal')}</a>` : '',
    dirUrl ? `<a class="btn btn--ghost btn--sm" href="${esc(dirUrl)}" target="_blank" rel="noopener"><span>Directions</span>${icon('arrow-ne')}</a>` : '',
    s ? `<a class="btn btn--lime btn--sm" href="${esc(menuUrl(s.id, 'all'))}" target="_blank" rel="noopener" aria-label="Shop ${esc(s.city)} on the live menu (opens in a new tab)"><span>Shop ${esc(s.city)}</span>${icon('arrow-ne')}</a>` : '',
  ].filter(Boolean);
  const details = `<div class="ct-details glass" data-reveal style="--i:2">
    <h2 class="ct-details__h">Details</h2>
    <dl>${rows.map(([ic, k, v]) => `<div class="ct-details__row"><dt>${icon(ic)}${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    ${ctas.length ? `<div class="btns ct-details__cta">
      ${ctas.join('\n      ')}
    </div>` : ''}
    ${s ? `<p class="ct-details__more"><a class="tlink" href="${href(s.page)}">${esc(s.city)} store hours and details${icon('arrow')}</a></p>` : ''}
  </div>`;
  const poster = e.image ? `<figure class="ct-poster" data-reveal data-tilt><span class="ct-poster__tape" aria-hidden="true"></span>${mediaImg(e.image, { alt: e.imageAlt, sizes: '(min-width: 1000px) 520px, 92vw', eager: true })}</figure>` : '';
  // a square or landscape poster takes half the row (in the narrower column it stood far shorter than the words beside it)
  const wide = poster && arOf(e.image) >= 0.9;
  const main = band(`<div class="ct-event${poster ? '' : ' ct-event--noposter'}${wide ? ' ct-event--wide' : ''}">
    <div class="ct-event__media">${poster}</div>
    <div class="ct-event__body">
      ${kicker(e.upcoming ? 'Be there' : 'How it went down')}${dh('The', 'Rundown', { size: 'md', id: 'ct-ev-h' })}
      <div class="prose ct-desc" data-reveal style="--i:1">${richHtml(e.html)}</div>
      ${details}
    </div>
  </div>`, { tone: 'night', lit: true, spot: true, labelledby: 'ct-ev-h', cls: 'ct-evband', lx: '30%', ly: '20%', backdrop: `${img('wall-mural-wide', { decorative: true, sizes: '100vw', min: 1400 })}<div class="ct-shade ct-shade--deep"></div>` });
  const others = D.events.filter((x) => x.path !== e.path);
  const more = [...others.filter((x) => x.upcoming).sort((a, b) => a.start.localeCompare(b.start)), ...others.filter((x) => !x.upcoming)].slice(0, 3);
  // the same three flyers as the shared gradient carousel (the band takes the centred poster's colour)
  const moreBand = band(`<div class="band__head"><div class="band__intro">${kicker(more.some((x) => x.upcoming) ? 'Up next' : 'From the poster wall')}${dh('More', 'Events', { id: 'ct-more-h' })}</div><div data-reveal>${btn('All events', '/events/', { kind: 'ghost' })}</div></div>
  ${gcar(more, 'More events')}`,
  { tone: 'ink', sheet: true, labelledby: 'ct-more-h', cls: 'ct-moreband gcar-band', backdrop: gcarGlow, after: floatObj('obj-boombox', { cls: 'ct-float', style: 'right:3%;top:-64px;width:min(200px,16vw)', depth: 0.12, sizes: '220px' }) });
  return {
    path: e.path, title: e.cap.title, description: e.cap.description || trimWords(plain(e.html), 28), type: 'event', crumbs, jsonld: [eventLd(e)],
    ogImage: ogOf(e.image), main: hero + main + moreBand + signUp(),
  };
}

// ================= pages =================
export function pages() {
  const D = data();
  const out = [];
  out.push(blogHub(D));
  for (const x of D.posts) out.push(postPage(x, D));
  for (const c of D.cats) out.push(catPage(c, D));
  out.push(learnPage(D));
  out.push(eventsHub(D));
  for (const e of D.events) out.push(eventPage(e, D));

  // captured /blog/ URLs that are neither a post nor a topic: the two COA entries have no content (no title, body or
  // date beyond "By CannaPlanners"), so they redirect; anything else with modules would render generically
  const known = new Set([...D.posts.map((x) => x.path), ...D.cats.map((c) => c.path), '/blog/']);
  for (const p of allPages()) {
    const pth = p.path + '/';
    if (!/^\/blog\//.test(pth) || known.has(pth) || /^\/blog\/page\/\d+\/$/.test(pth)) continue;
    const empty = !(p.post && p.post.html) && !p.modules.some((m) => m.kind !== 'page-banner' && m.kind !== 'single-post-wrapper' && m.kind !== 'newsletter-5050');
    if (empty) out.push({ path: pth, redirect: '/blog/', title: p.title });
    else out.push(genericPage(p));
  }
  // blog pagination and the author archives: the hub lists every article, so they all land there
  for (const p of allPages()) if (/^\/(blog\/page\/\d+|author\/[^/]+(\/page\/\d+)?)$/.test(p.path)) out.push({ path: p.path + '/', redirect: '/blog/', title: p.title });
  // the events plugin's /page/2/ (every inventoried variant is ?post_type=tribe_events pagination) lands on the events hub
  out.push({ path: '/page/2/', redirect: '/events/', title: 'Events' });
  return out;
}

// a captured page with real modules that fits no template: its blocks in order, as prose
function genericPage(p) {
  const blocks = p.modules.flatMap((m) => m.blocks);
  const h1 = p.h1 || p.title;
  const body = blocks.filter((b) => b.t !== 'h1').map((b) => {
    if (/^h[2-6]$/.test(b.t)) return `<h2>${esc(b.text)}</h2>`;
    if (b.t === 'p' || b.t === 'li') return `<p>${richHtml(b.html || esc(b.text))}</p>`;
    if (b.t === 'img') return mediaId(b.src) ? `<p>${mediaImg(b.src, { alt: b.alt })}</p>` : '';
    if (b.t === 'faq') return `<h3>${esc(b.q)}</h3>${richHtml(b.html || esc(b.a))}`;
    return '';
  }).join('');
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog/' }, { label: h1, href: p.path + '/' }];
  return { path: p.path + '/', title: p.title, description: p.description || '', type: 'blog', crumbs, main: pageHero({ crumbs, kicker: BLOG, title: split2(h1), img: 'wall-mural-wide' }) + band(`<div class="prose">${body}</div>`, { tone: 'night' }) + signUp() };
}
