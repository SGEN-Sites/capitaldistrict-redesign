// misc.mjs: lab pages for the owner's design reviews (noindex everywhere, never in the sitemap).
// /lab/reviews/: three layout options for the home page's "NY Dispensary Reviews" section, built with the captured reviews.
import { band, dh, kicker, esc, href, img, icon, btn, bullet, statusLine } from '../lib/parts.mjs';
import { page as cap } from '../lib/capture.mjs';
import { brand, stores, menuUrl } from '../content/site.mjs';

const stars = () => `<span class="rv-stars" aria-label="Five stars">${icon('star')}${icon('star')}${icon('star')}${icon('star')}${icon('star')}</span>`;
const clean = (t) => String(t).replace(/^[“‘"']+|[”’"']+$/g, '');
const firstWords = (t, n = 7) => { const w = clean(t).split(/\s+/); return w.slice(0, n).join(' ') + (w.length > n ? '…' : ''); };
const TONES = ['mint', 'lime', 'paper', 'ink'];

function head(o = {}) {
  return `<div class="band__head"><div class="band__intro">${kicker('Shout-outs')}${dh('NY Dispensary', 'Reviews', { id: o.id })}</div>
  <p class="h-rev__links"><a class="tlink" href="${href('/reviews/')}">Read every review${icon('arrow')}</a></p></div>`;
}
const label = (letter, name, how) => `<div class="lab-label wrap"><span class="lab-label__k">Option ${letter}</span><b>${esc(name)}</b><span>${esc(how)}</span></div>`;
const note = `<p class="rv-note">Google reviews as published on the ${esc(brand.short)} website, captured November 2026.</p>`;

export function pages() {
  const home = cap('/');
  const reviews = home.modules.flatMap((m) => m.blocks).filter((b) => b.t === 'review').map((r) => ({ text: clean(r.text), name: r.name }));

  // ---------- A: The Wall (two rows drifting in opposite directions over the mural) ----------
  // each row cycles all four tones (row 2 starts two along), so neither row is all-light or all-dark
  const card = (r, i, hidden, tone) => `<figure class="rv-a__card rv-a__card--${TONES[tone % 4]}" style="--r:${[-2.4, 1.8, -1.2, 2.6, -1.8, 1.2, -2.8, 2.2][i % 8]}deg"${hidden ? ' aria-hidden="true"' : ''}>${stars()}<blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.name)}</figcaption></figure>`;
  const row1 = reviews.filter((_, i) => i % 2 === 0), row2 = reviews.filter((_, i) => i % 2 === 1);
  const optA = `<section class="band band--night band--lit rv-a" data-spot aria-labelledby="rv-a-h" style="--lx:30%;--ly:20%">
  <div class="band__clip" aria-hidden="true">${img('wall-mural', { decorative: true, sizes: '100vw', cls: 'rv-a__wall' })}</div>
  <div class="wrap">${head({ id: 'rv-a-h' })}</div>
  <div class="rv-a__rows" role="list" aria-label="Google reviews">
    <div class="rv-a__row" style="--dur:${row1.length * 11}s"><div class="rv-a__track">${row1.map((r, i) => card(r, i * 2, false, i)).join('')}${row1.map((r, i) => card(r, i * 2, true, i)).join('')}</div></div>
    <div class="rv-a__row rv-a__row--rev" style="--dur:${row2.length * 13}s"><div class="rv-a__track">${row2.map((r, i) => card(r, i * 2 + 1, false, i + 2)).join('')}${row2.map((r, i) => card(r, i * 2 + 1, true, i + 2)).join('')}</div></div>
  </div>
  <div class="wrap">${note}</div>
</section>`;

  // ---------- B: Spotlight (one review at a time, big, auto-advancing, reviewers as tabs) ----------
  const optB = `<section class="band band--ink band--lit rv-b" data-spot aria-labelledby="rv-b-h" style="--lx:18%;--ly:30%">
  <div class="wrap">
    <div class="rv-b__grid" data-rv-spot>
      <div class="rv-b__stage">
        ${kicker('Shout-outs')}${dh('NY Dispensary', 'Reviews', { id: 'rv-b-h' })}
        <div class="rv-b__quote" aria-live="polite">
          <span class="rv-b__mark" aria-hidden="true">“</span>
          ${reviews.map((r, i) => `<figure class="rv-b__slide${i ? '' : ' is-on'}" data-i="${i}" id="rv-b-s${i}" role="tabpanel" aria-labelledby="rv-b-t${i}">${stars()}<blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.name)}</figcaption></figure>`).join('')}
        </div>
        <div class="rv-b__ctrl">
          <button class="rv-b__btn" type="button" data-rv-prev aria-label="Previous review">${icon('arrow-l')}</button>
          <span class="rv-b__count"><b data-rv-n>01</b> / ${String(reviews.length).padStart(2, '0')}</span>
          <span class="rv-b__bar" aria-hidden="true"><i></i></span>
          <button class="rv-b__btn" type="button" data-rv-next aria-label="Next review">${icon('arrow')}</button>
        </div>
      </div>
      <div class="rv-b__list" role="tablist" aria-label="Choose a review">${reviews.map((r, i) => `<button class="rv-b__tab${i ? '' : ' is-on'}" type="button" role="tab" id="rv-b-t${i}" aria-controls="rv-b-s${i}" aria-selected="${i ? 'false' : 'true'}" data-go="${i}"><b>${esc(r.name.replace(/\s*(via\s+)?Google Reviews?$/i, ''))}</b><span>${esc(firstWords(r.text))}</span></button>`).join('')}</div>
    </div>
    ${note}
    <p class="rv-b__more"><a class="tlink" href="${href('/reviews/')}">Read every review${icon('arrow')}</a></p>
  </div>
</section>`;

  // ---------- C: The Deck (a stack you drag or flick through) ----------
  const optC = `<section class="band band--night band--lit rv-c" data-spot aria-labelledby="rv-c-h" style="--lx:75%;--ly:35%">
  <div class="wrap rv-c__grid">
    <div class="rv-c__copy">
      ${kicker('Shout-outs')}${dh('NY Dispensary', 'Reviews', { id: 'rv-c-h' })}
      <p class="lede">What customers say about us on Google. Drag the top card away, or deal the next one.</p>
      <div class="rv-c__ctrl"><button class="btn btn--lime" type="button" data-rv-deal><span>Next review</span>${icon('arrow')}</button><span class="rv-c__count"><b data-rv-c>01</b> / ${String(reviews.length).padStart(2, '0')}</span></div>
      <p><a class="tlink" href="${href('/reviews/')}">Read every review${icon('arrow')}</a></p>
      ${note}
    </div>
    <div class="rv-c__deck" data-rv-deck aria-live="polite">${reviews.map((r, i) => `<figure class="rv-c__card rv-c__card--${TONES[i % 4]}" style="--pos:${i}" data-k="${i}">${stars()}<blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.name)}</figcaption></figure>`).join('')}</div>
  </div>
</section>`;

  const intro = `<section class="lab-intro"><div class="wrap"><p class="kicker">Design lab</p><h1 class="dh dh--md"><span class="dh__a">Reviews section</span> <span class="dh__b">Three options</span></h1>
  <p class="lede">Three working layouts for the home page's "NY Dispensary Reviews" section, built with the eight Google reviews the home page shows. Pick one and it replaces the current row of cards.</p>
  <p class="lab-jump"><a class="chipbtn" href="#opt-a">A · The Wall</a><a class="chipbtn" href="#opt-b">B · Spotlight</a><a class="chipbtn" href="#opt-c">C · The Deck</a></p></div></section>`;

  return [specialsLab(), {
    path: '/lab/reviews/', type: 'lab', lab: true, noindex: true,
    title: 'Reviews section: three layout options (design lab)',
    description: 'Three working layout options for the reviews section of the Capital District Cannabis redesign.',
    main: intro
      + `<div id="opt-a">${label('A', 'The Wall', 'Two rows drift in opposite directions over the mural; hover to pause and\u00a0read.')}${optA}</div>`
      + `<div id="opt-b">${label('B', 'Spotlight', 'One review at a time, big; advances on its own, or pick a reviewer.')}${optB}</div>`
      + `<div id="opt-c">${label('C', 'The Deck', 'A stack of cards: drag the top one away or deal the\u00a0next.')}${optC}</div>`,
  }];
}

// /lab/specials/: the home page's "Daily Specials" section as it is (A) and two compact layouts (B, C).
// Same words, links and live store status as the home section; B keeps the lede's first sentence, C drops the lede and
// the addresses to stay short. Styles in src/styles/sp.css; nothing new in the script (site.js fills every status).
function specialsLab() {
  const go = (s) => esc(menuUrl(s.id, 'specials'));
  const lede = 'A rotating selection of cannabis deals on flower, pre-rolls, edibles, vapes, and more.';
  // A: the section on the home page today
  const optA = band(`<div class="band__head"><div class="band__intro">${kicker('Fresh at every store')}${dh('Daily', 'Specials', { id: 'sp-a-h' })}</div>
  <p class="lede">${esc(lede)} Each store posts its own, so pick the counter you are heading to.</p></div>
  <div class="h-flyers">${stores.map((s, i) => `<a class="h-flyer" href="${go(s)}" target="_blank" rel="noopener" style="--r:${[-2.5, 1.5, -1.2][i]}deg;--i:${i}" data-tilt>
    <span class="h-flyer__tape" aria-hidden="true"></span><span class="h-flyer__top">${bullet(s)}<span>${esc(s.city)}</span></span>
    <span class="h-flyer__big">Specials</span><span class="h-flyer__sub">${esc(s.street)} · ${esc(s.city)}, NY</span>${statusLine(s)}
    <span class="h-flyer__go">See today’s deals${icon('arrow-ne')}</span></a>`).join('')}</div>
  <p class="h-deals__more">${btn('All deals by store', '/deals/', { kind: 'ghost' })}</p>`, { tone: 'mint', labelledby: 'sp-a-h', lx: '15%', ly: '0%' });

  // B: store tickets. The heading beside three slim ticket rows, one per store, each with a perforated stub
  const optB = band(`<div class="sp-b">
    <div class="sp-b__intro">${kicker('Fresh at every store')}${dh('Daily', 'Specials', { id: 'sp-b-h', size: 'md' })}<p class="sp-b__lede">${esc(lede)}</p>${btn('All deals by store', '/deals/', { kind: 'ghost', size: 'sm' })}</div>
    <ul class="sp-b__list">${stores.map((s, i) => `<li><a class="sp-tix" href="${go(s)}" target="_blank" rel="noopener" style="--i:${i}">
      ${bullet(s)}<span class="sp-tix__who"><b>${esc(s.city)}</b><small>${esc(s.street)} · ${esc(s.city)}, NY</small>${statusLine(s)}</span>
      <span class="sp-tix__go"><span>Specials</span>${icon('arrow-ne')}</span></a></li>`).join('')}</ul>
  </div>`, { tone: 'mint', labelledby: 'sp-b-h', lx: '15%', ly: '0%', cls: 'sp-band' });

  // C: mini flyers. The taped dark flyers kept, shrunk into one row beside the heading
  const optC = band(`<div class="sp-c">
    <div class="sp-c__intro">${kicker('Fresh at every store')}${dh('Daily', 'Specials', { id: 'sp-c-h', size: 'md' })}<p class="sp-c__more"><a class="tlink" href="${href('/deals/')}">All deals by store${icon('arrow')}</a></p></div>
    <div class="sp-c__flyers">${stores.map((s, i) => `<a class="sp-fly" href="${go(s)}" target="_blank" rel="noopener" style="--r:${[-2, 1.3, -1][i]}deg" data-tilt>
      <span class="sp-fly__tape" aria-hidden="true"></span><span class="sp-fly__top">${bullet(s)}<span>${esc(s.city)}</span></span>
      <span class="sp-fly__big">Specials</span>${statusLine(s)}<span class="sp-fly__go">See today’s deals${icon('arrow-ne')}</span></a>`).join('')}</div>
  </div>`, { tone: 'mint', labelledby: 'sp-c-h', lx: '15%', ly: '0%', cls: 'sp-band' });

  const intro = `<section class="lab-intro"><div class="wrap"><p class="kicker">Design lab</p><h1 class="dh dh--md"><span class="dh__a">Daily Specials</span> <span class="dh__b">Compact options</span></h1>
  <p class="lede">The home page's "Daily Specials" section as it is today (A) and two compact layouts (B, C). Same words, the same three store links and the same live status. Pick one and it replaces the current section.</p>
  <p class="lab-jump"><a class="chipbtn" href="#sp-opt-a">A · Today</a><a class="chipbtn" href="#sp-opt-b">B · Store tickets</a><a class="chipbtn" href="#sp-opt-c">C · Mini flyers</a></p></div></section>`;
  return {
    path: '/lab/specials/', type: 'lab', lab: true, noindex: true,
    title: 'Daily Specials: two compact layouts (design lab)',
    description: 'The Daily Specials section of the Capital District Cannabis redesign as it is and in two compact layouts.',
    main: intro
      + `<div id="sp-opt-a">${label('A', 'Today', 'The current section: three tall taped flyers under the heading.')}${optA}</div>`
      + `<div id="sp-opt-b">${label('B', 'Store tickets', 'The heading beside three slim ticket rows, one per store; about a third of the height.')}${optB}</div>`
      + `<div id="sp-opt-c">${label('C', 'Mini flyers', 'The taped flyers kept, shrunk into one row beside the heading.')}${optC}</div>`,
  };
}
