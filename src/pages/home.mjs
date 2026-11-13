// home.mjs: the home page. Every captured home block is here (hero kicker + H1 + its two buttons, Shop By Category,
// Our Purpose / A Different Experience, NY Dispensary Reviews, FAQs, News Letter / Sign Up & Save), re-ordered into the
// adopted dispensary spine: hero with the store, categories, store picker, order ahead, specials, story, proof, events,
// learn, FAQ, sign up. New words are neutral glue only (section labels, one-line descriptions, button labels).
import { band, dh, kicker, btn, menuBtn, sticker, crate, vinyl, floatObj, tape, faqList, faqSection, shoutouts, tracklist, postCard, flyer, signUp, storeCard, bullet, statusLine, esc, href, img, icon, asset } from '../lib/parts.mjs';
import { orgLd, storeLd } from '../lib/layout.mjs';
import { page as cap, allPages } from '../lib/capture.mjs';
import { brand, stores, menuUrl } from '../content/site.mjs';

const TODAY = '2026-11-13';

export function home() {
  const h = cap('/');
  const mods = Object.fromEntries(h.modules.map((m) => [m.id || m.kind, m]));
  const blocks = (k) => (mods[k] ? mods[k].blocks : []);
  const heroB = blocks('hero');
  const kick = heroB.find((b) => b.t === 'p')?.text || brand.kicker;
  const h1 = heroB.find((b) => b.t === 'h1')?.text || brand.h1;
  const purpose = blocks('our-purpose');
  const purposeP = purpose.find((b) => b.t === 'p');
  const reviews = blocks('review-slider').filter((b) => b.t === 'review');
  const faqs = blocks('faq-section').filter((b) => b.t === 'faq');
  const nl = blocks('newsletter-5050');
  const nlText = nl.find((b) => b.t === 'p')?.text;

  // recent events (all captured events are past as of the capture date) and the latest posts
  const events = allPages().filter((p) => p.event && p.event.image).map((p) => ({
    path: p.path + '/', title: p.event.title || p.h1, image: p.event.image.src, imageAlt: p.event.image.alt, start: p.event.startDate || '',
    when: (p.event.schedule || '').replace(/\s*@.*$/, ''), where: p.event.venue || '',
  })).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 4);
  const posts = allPages().filter((p) => p.post).sort((a, b) => String(b.published || '').localeCompare(String(a.published || ''))).slice(0, 3)
    .map((p) => ({ path: p.path + '/', title: p.post.title || p.h1, image: p.post.image && p.post.image.src, cats: p.post.cats, date: (p.post.meta || '').replace(/^By [^A-Z]*[A-Za-z ]+?(?=[A-Z][a-z]{2} \d)/, '').trim() }));

  // ---------- 1. hero: the skyline after dark, the record, the store ----------
  const hero = `<section class="h-hero" aria-labelledby="h-h1">
  <div class="h-hero__bg" aria-hidden="true">
    <div class="h-sky" data-depth="-0.06">${img('skyline', { decorative: true, eager: true, sizes: '100vw', min: 1600 })}</div>
    <div class="h-water">${img('skyline', { decorative: true, sizes: '100vw', min: 1200 })}</div>
    <div class="h-beams"><i></i><i></i><i></i></div>
    <div class="h-haze"></div>
  </div>
  <svg class="h-fx" aria-hidden="true" focusable="false"><filter id="h-ripple"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.09" numOctaves="2" seed="7"><animate attributeName="baseFrequency" dur="18s" values="0.006 0.09;0.008 0.11;0.006 0.09" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" scale="14"/></filter></svg>
  <div class="wrap wrap--wide h-hero__in">
    <div class="h-copy">
      ${kicker(kick)}
      <h1 class="dh h-h1" id="h-h1" data-reveal="stretch"><span class="dh__a">${esc(h1.split(' ')[0])}</span> <span class="dh__b">${esc(h1.split(' ').slice(1).join(' '))}</span></h1>
      <p class="h-lede" data-reveal style="--i:2">Three licensed dispensaries across the Capital Region: Albany, Clifton Park and Schenectady. Shop ahead on the live menu and pick up at the counter.</p>
      <div class="btns" data-reveal style="--i:3">${heroB.filter((b) => b.t === 'btn').map((b, i) => /\/stores\//.test(b.href) ? menuBtn('all', b.text) : btn(b.text, b.href, { kind: i ? 'ghost' : 'lime' })).join('')}</div>
    </div>
    <div class="h-deck">
      ${vinyl({ name: 'hero', cls: 'h-vinyl', eager: true })}
      <div class="h-sleeve glass" data-reveal style="--i:2">
        <span class="h-est">${sticker('Est. ' + brand.est)}</span>
        <p class="h-sleeve__k">Now spinning at</p>
        <p class="h-sleeve__store"><span class="bullet" data-store-letter aria-hidden="true">A</span><b data-store-name>${esc(stores[0].name)}</b></p>
        <p class="h-sleeve__status"><span class="status" data-status-current><i class="status__dot"></i><span class="status__txt">Mon–Sat 9 AM–9 PM · Sun 10 AM–6 PM</span></span></p>
        <div class="h-sleeve__pick" role="group" aria-label="Choose your store">${stores.map((s) => `<button type="button" class="h-pick" data-set-store="${s.id}" data-store-card="${s.id}" aria-label="Switch to ${esc(s.name)}"><span class="bullet" aria-hidden="true">${s.letter}</span><span class="h-pick__name">${esc(s.city)}</span></button>`).join('')}</div>
        <div class="h-sleeve__cta">${menuBtn('all', 'Shop this store', { size: 'sm' })}<a class="btn btn--ghost btn--sm h-sleeve__tel" href="tel:${stores[0].tel}" data-store-tel>${icon('phone')}<span data-store-phone>${esc(stores[0].phone)}</span></a></div>
      </div>
      <div class="float h-can" data-depth="0.18" data-spray aria-hidden="true"><span class="h-can__body">${img('obj-spraycan', { decorative: true, sizes: '220px' })}<i class="h-can__nozzle"></i></span></div>
    </div>
  </div>
  <a class="h-scroll" href="#h-shop" aria-label="Scroll to Shop By Category"><span></span></a>
</section>`;

  // ---------- 2-3. tapes + Shop By Category (the crate) ----------
  const catHead = blocks('shop-categories').find((b) => b.t === 'h2')?.text || 'Shop By Category';
  const shop = band(`<div class="band__head">
    <div class="band__intro">${kicker('The crate')}${dh(catHead.split(' ').slice(0, 2).join(' '), catHead.split(' ').slice(2).join(' '), { id: 'h-shop-h', cls: 'dh--inline' })}</div>
    <p class="lede" data-reveal>Flip through the crate. Every sleeve opens that shelf of the live menu for your store, stocked and ready to add to your cart.</p>
  </div>${crate()}<div class="h-shop__foot" data-reveal>${menuBtn('all', 'Shop all products', { kind: 'ghost' })}${menuBtn('specials', 'Today’s specials', { kind: 'ghost' })}<a class="tlink" href="${href('/brands/')}">Brands we carry${icon('arrow')}</a></div>`,
  { tone: 'night', lit: true, spot: true, id: 'h-shop', cls: 'h-shop', lx: '18%', ly: '8%', labelledby: 'h-shop-h', after: floatObj('obj-bud-a', { cls: 'h-bud', depth: 0.22, sizes: '260px' }) });

  // ---------- 4. Where Ya Shopping? (store selection) ----------
  const pick = band(`<div class="band__head"><div class="band__intro">${kicker('Three stores, one crew')}${dh('Where Ya', 'Shopping?', { id: 'h-stores-h', cls: 'dh--inline' })}</div>
    <p class="lede" data-reveal>Pick your store once. Every Shop button on the site follows it, straight to that store’s menu, specials and cart.</p></div>
  <div class="grid grid--3 h-stores">${stores.map((s, i) => storeCard(s, { cls: 'h-scard' }).replace('data-reveal', `data-reveal style="--i:${i}"`)).join('')}</div>
  <p class="h-stores__more" data-reveal><a class="tlink" href="${href('/store-locator/')}">Find the closest store to your town${icon('arrow')}</a> <a class="tlink" href="${href('/visit-us/')}">Areas we serve${icon('arrow')}</a></p>`,
  { tone: 'ink', sheet: true, id: 'h-stores', labelledby: 'h-stores-h' });

  // ---------- 5. Shop Ahead (ordering flow) ----------
  const ahead = band(`<div class="h-ahead">
  <div class="h-ahead__words">${kicker('Order ahead')}${dh('Shop', 'Ahead', { id: 'h-ahead-h' })}
    ${tracklist([
    { title: 'Pick your store', text: 'Albany, Clifton Park or Schenectady. Each location has its own menu and its own cart.', icon: 'pin' },
    { title: 'Fill your cart', text: 'Browse the live menu by category, add what you like and check out for pickup.', icon: 'bag' },
    { title: 'Pull up with your ID', text: 'Adults 21 and over with a valid government-issued ID. We accept Cash, Debit, and Dutchie Pay.', icon: 'id' },
  ])}
    <div class="btns" data-reveal>${menuBtn('all', 'Start an order')}${btn('How pickup works', '/pickup/', { kind: 'ghost' })}</div>
  </div>
  <div class="h-ahead__media" data-reveal>
    <div class="h-tt">
      <video id="h-tt-video" muted playsinline loop preload="none" poster="${asset(img_poster('loop-turntable'))}" data-src="${asset('video/turntable-1600.mp4')}" data-src-sm="${asset('video/turntable-960.mp4')}" aria-hidden="true"></video>
      <button class="h-tt__btn" type="button" data-video-toggle aria-controls="h-tt-video" aria-pressed="false" aria-label="Pause the loop">${icon('pause')}</button>
      <span class="h-tt__k">Side A · Order ahead</span>
    </div>
  </div>
</div>`, { tone: 'night', lit: true, spot: true, id: 'h-ahead', labelledby: 'h-ahead-h', lx: '80%', ly: '30%' });

  // ---------- 6. specials: store tickets (the owner's pick from /lab/specials/, option B; styles in sp.css) ----------
  const specials = band(`<div class="sp-b">
    <div class="sp-b__intro">${kicker('Fresh at every store')}${dh('Daily', 'Specials', { id: 'h-deals-h', size: 'md' })}<p class="sp-b__lede" data-reveal>A rotating selection of cannabis deals on flower, pre-rolls, edibles, vapes, and more.</p>${btn('All deals by store', '/deals/', { kind: 'ghost', size: 'sm' })}</div>
    <ul class="sp-b__list">${stores.map((s, i) => `<li data-reveal style="--i:${i}"><a class="sp-tix" href="${esc(menuUrl(s.id, 'specials'))}" target="_blank" rel="noopener" style="--i:${i}" aria-label="Today’s specials at ${esc(s.name)} (opens the live menu in a new tab)">
      ${bullet(s)}<span class="sp-tix__who"><b>${esc(s.city)}</b><small>${esc(s.street)} · ${esc(s.city)}, NY</small>${statusLine(s)}</span>
      <span class="sp-tix__go"><span>Specials</span>${icon('arrow-ne')}</span></a></li>`).join('')}</ul>
  </div>`, { tone: 'mint', id: 'h-deals', labelledby: 'h-deals-h', lx: '15%', ly: '0%', cls: 'sp-band' });

  // ---------- 7. Our Purpose: the hall of fame (real in-store photos) under a flashlight ----------
  const pa = purpose.find((b) => b.t === 'h2')?.text || 'Our Purpose';
  const pb = purpose.find((b) => b.t === 'h3')?.text || 'A Different Experience';
  // a band in its own tone (band--night-2, the ground .h-story paints), so build.mjs seams it like every other band:
  // the neon cut out of the specials above, the overspray into the reviews below
  const story = `<section class="h-story band band--night-2" id="h-story" aria-labelledby="h-story-h">
  <div class="h-wall" data-wall aria-hidden="true">
    <div class="h-wall__dark">${img('wall-mural', { decorative: true, sizes: '100vw' })}</div>
    <div class="h-wall__lit">${img('wall-mural', { decorative: true, sizes: '100vw' })}</div>
  </div>
  <div class="wrap h-story__in">
    <div class="h-story__words glass" data-reveal>
      ${kicker('Hall of fame')}
      <h2 class="dh dh--lg" id="h-story-h" data-reveal="stretch"><span class="dh__a">${esc(pa.split(' ')[0])}</span> <span class="dh__b">${esc(pa.split(' ').slice(1).join(' '))}</span></h2>
      <h3 class="h-story__h3">${esc(pb)}</h3>
      ${purposeP ? `<p>${esc(purposeP.text)}</p>` : ''}
      <div class="btns">${purpose.filter((b) => b.t === 'btn').map((b, i) => btn(b.text, b.href, { kind: i ? 'ghost' : 'lime' })).join('')}</div>
    </div>
    <div class="h-gallery">
      <figure class="h-frame h-frame--mural" data-tilt data-reveal="develop">${img('store-mural', { alt: 'Inside Capital District Cannabis & Wellness: the graffiti mural wall beside the product shelves', sizes: '(min-width: 1000px) 46vw, 92vw' })}<span class="h-frame__glare" aria-hidden="true"></span><figcaption>In store: the mural wall</figcaption></figure>
      <figure class="h-frame h-frame--collage" data-tilt data-reveal="develop" style="--i:2">${img('m-2024-06-untitled', { alt: 'Black-and-white photos from inside the store: a customer in a got bud? tee at the counter and the graffiti mural', sizes: '(min-width: 1000px) 26vw, 60vw' })}<span class="h-tape" aria-hidden="true"></span></figure>
      <span class="h-gotbud">${sticker('got bud?')}</span>
    </div>
  </div>
</section>`;

  // ---------- 8. reviews: The Deck (the owner's pick from /lab/reviews/, option C; behaviour in site.js [data-rv-deck], styles in rv.css) ----------
  const revHead = blocks('review-slider').find((b) => b.t === 'h2')?.text || 'NY Dispensary Reviews';
  const TONES = ['mint', 'lime', 'paper', 'ink'];
  const five = `<span class="rv-stars" aria-label="Five stars">${icon('star').repeat(5)}</span>`;
  const deck = reviews.map((r) => ({ text: String(r.text).replace(/^[“‘"']+|[”’"']+$/g, ''), name: r.name }));
  const proof = band(`<div class="rv-c__grid">
    <div class="rv-c__copy">
      ${kicker('Shout-outs')}${dh(revHead.split(' ').slice(0, 2).join(' '), revHead.split(' ').slice(2).join(' '), { id: 'h-rev-h' })}
      <p class="lede" data-reveal>What customers say about us on Google. Drag the top card away, or deal the next one.</p>
      <div class="rv-c__ctrl"><button class="btn btn--lime" type="button" data-rv-deal><span>Next review</span>${icon('arrow')}</button><span class="rv-c__count"><b data-rv-c>01</b> / ${String(deck.length).padStart(2, '0')}</span></div>
      <p class="h-rev__links"><a class="tlink" href="${href('/reviews/')}">Read every review${icon('arrow')}</a></p>
      <p class="rv-note">Google reviews as published on the ${esc(brand.short)} website, captured November 2026.</p>
    </div>
    <div class="rv-c__deck" data-rv-deck aria-live="polite">${deck.map((r, i) => `<figure class="rv-c__card rv-c__card--${TONES[i % 4]}" style="--pos:${i}" data-k="${i}">${five}<blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.name)}</figcaption></figure>`).join('')}</div>
  </div>`,
  { tone: 'ink', lit: true, spot: true, lx: '75%', ly: '35%', cls: 'rv-c', id: 'h-reviews', labelledby: 'h-rev-h' });

  // ---------- 9. events: real flyers on the wall, as a gradient carousel ----------
  // The same taped flyer() cards, one per slide (its reveal/tilt hooks dropped: the carousel moves the card). Script:
  // src/scripts/gcarousel.js (3D row, drag/wheel/keys/buttons, band tinted from the active poster's majority colour);
  // styles: src/styles/gcarousel.css. Without JS the slides stay a plain swipe row and the controls stay hidden.
  // Compact: md heading, the lede and "All events" in the words column beside the stage.
  const evCard = (e, i) => flyer({ ...e, when: e.when }, { i, cls: 'gcar__flyer' }).replace(/^<article\b[^>]*>/, (t) => t.replace(/\s+data-(?:reveal|tilt)(?:="[^"]*")?/g, ''));
  const evMore = `<p class="gcar-split__more" data-reveal>${btn('All events', '/events/', { kind: 'ghost' })}</p>`;
  const evCar = events.length ? `<div class="gcar" id="h-ev-car" role="region" aria-roledescription="carousel" aria-label="Recent events" data-gcar data-reveal>
    <div class="gcar__stage"><div class="gcar__track">${events.map((e, i) => `<div class="gcar__slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${events.length}" data-gcar-slide>${evCard(e, i)}</div>`).join('')}</div></div>
    <p class="sr" aria-live="polite" aria-atomic="true" data-gcar-live></p>
  </div>` : '';
  // previous / counter / next: under the words beside the stage on desktop, under the stage on tablets and phones
  // (gcarousel.css); gcarousel.js finds them in the carousel's band
  const evCtrl = events.length ? `<div class="gcar__ctrl" data-gcar-ctrl data-reveal hidden>
      <button class="gcar__btn" type="button" aria-label="Previous event" aria-controls="h-ev-car" data-gcar-prev>${icon('arrow-l')}</button>
      <p class="gcar__count" aria-hidden="true"><b data-gcar-now>01</b><i class="gcar__bar"><i></i></i><span>${String(events.length).padStart(2, '0')}</span></p>
      <button class="gcar__btn" type="button" aria-label="Next event" aria-controls="h-ev-car" data-gcar-next>${icon('arrow')}</button>
    </div>` : '';
  const evGlow = '<div class="gcar-glow" data-gcar-glow><i class="gcar-glow__a"></i><i class="gcar-glow__b"></i><i class="gcar-glow__c"></i></div>';
  // owner, 2026-11-13: the carousel on the left, the words stacked on the right (in the markup the words come first,
  // so the heading still reads before the carousel; phones stack words then carousel). The controls sit with the words,
  // so the two columns end level (the stage alone beside the words, not the stage plus a row of controls)
  const ev = band(`<div class="gcar-split">
  <div class="gcar-split__words">${kicker('Pop-ups, parties, car meets')}${dh('Events', '& Culture', { id: 'h-ev-h', size: 'md' })}
  <p class="lede" data-reveal>Block parties, boat parties, grand openings and brand pop-ups. The latest from the event calendar.</p>${evMore}${evCtrl}</div>
  <div class="gcar-split__media">${evCar}</div>
  </div>`,
  { tone: 'night', lit: true, sheet: true, id: 'h-events', cls: 'gcar-band', labelledby: 'h-ev-h', lx: '50%', ly: '0%', backdrop: evGlow, after: floatObj('obj-boombox', { cls: 'h-boom', depth: 0.1, sizes: '340px' }) }); // a gentler drift: it sits between the deck and the events kicker

  // ---------- 10. learn ----------
  const learn = band(`<div class="band__head"><div class="band__intro">${kicker('From the blog')}${dh('Learn', 'The Culture', { id: 'h-learn-h' })}</div>
  <div class="btns" data-reveal>${btn('Cannabis 101', '/learn/', { kind: 'ghost' })}${btn('All articles', '/blog/', { kind: 'ghost' })}</div></div>
  <div class="grid grid--3">${posts.map((p, i) => postCard(p, { i })).join('')}</div>`, { tone: 'ink', id: 'h-learn', labelledby: 'h-learn-h' });

  // ---------- 11. FAQ (the shared FAQ section, parts.mjs faqSection: every FAQ on the site uses this layout) ----------
  const faqHead = blocks('faq-section').find((b) => b.t === 'h2')?.text || 'FAQs';
  const faq = band(faqSection({ kicker: 'Good to know', heading: faqHead, size: 'lg', id: 'h-faq-h', items: faqs, vinyl: true, name: 'faq',
    lede: `New York rules, what to bring and how to shop. More answers on the <a class="tlink" href="${href('/faq/')}">FAQ page</a>.`, ledeHtml: true }),
  { tone: 'night', lit: true, id: 'h-faq', labelledby: 'h-faq-h', lx: '10%', ly: '20%' });

  const main = [hero, tape(), shop, pick, ahead, specials, story, proof, ev, learn, faq, signUp({ text: nlText })].join('\n');
  return {
    path: '/', type: 'home', bodyClass: 'has-hero',
    title: h.title, description: h.description,
    jsonld: [orgLd(), ...stores.map(storeLd)],
    ogImage: 'img/store-mural-1200.webp',
    main,
  };
}

// the poster of a generated loop (registered by tools/encode-loops.py)
import { imgInfo } from '../lib/parts.mjs';
function img_poster(id) { const r = imgInfo(id); return r ? r.files[r.files.length - 1].file : 'img/turntable-1600.webp'; }
