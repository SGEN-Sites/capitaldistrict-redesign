// lab-signup.mjs: design lab /lab/signup/ (noindex, never in the sitemap). The "Sign Up & Save" band as it is today (A,
// rendered by signUp() itself) and three dynamic redesigns (B, C, D). Every option carries the band's own words (kicker,
// heading, text, field labels, button, note and link), invents nothing, and keeps a real form: labels, autocomplete, the
// browser's own validation, keyboard, visible focus. Nothing is sent: no action, and site.js's [data-demo-form] stops
// the submit (the preview note says so). Styles: src/styles/su.css. Behaviour: src/scripts/su.js ([data-su]).
import { band, dh, kicker, signUp, esc, href, icon, asset, img } from '../lib/parts.mjs';
import { stores } from '../content/site.mjs';

// the band's words, exactly as signUp() in src/lib/parts.mjs prints them (private/su-test.mjs compares them with A)
const T = {
  kicker: 'News Letter', a: 'Sign Up', b: '& Save',
  text: 'Sign up for our loyalty program to stay connected on the best deals in the Albany, NY area.',
  email: 'Email address', phone: 'Phone (optional)', button: 'Sign Up',
};
const PH = { email: 'you@example.com', phone: '(518) 555-0123' };
const note = (cls = '') => `<p class="su-fine${cls ? ' ' + cls : ''}" data-demo-msg>Preview build: form submissions are disabled. <a href="${href('/loyalty-program/')}">How the loyalty program works</a>.</p>`;
const input = (n) => n === 'email'
  ? `<input type="email" name="email" autocomplete="email" placeholder="${PH.email}" required>`
  : `<input type="tel" name="phone" autocomplete="tel" placeholder="${PH.phone}">`;
const submit = (cls = '') => `<button class="btn btn--ink${cls ? ' ' + cls : ''}" type="submit" data-magnetic><span>${esc(T.button)}</span>${icon('arrow')}</button>`;
const formOpen = (cls) => `<form class="${cls}" data-demo-form onsubmit="return false">`;
const label = (letter, name, how) => `<div class="lab-label wrap"><span class="lab-label__k">Option ${letter}</span><b>${esc(name)}</b><span>${esc(how)}</span></div>`;

// a torn paper edge for the pasted-up poster: a fixed seed, so every build tears it the same way
function torn(seed) {
  let s = seed;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const p = [];
  const N = 30;
  const bite = (y) => y + (r() < 0.14 ? r() * 1.1 : 0); // now and then a deeper bite out of the edge
  for (let i = 0; i <= N; i++) p.push([(i / N) * 100, bite(r() * 0.9)]);
  for (let i = 1; i < 7; i++) p.push([100 - r() * 0.8, (i / 7) * 100]);
  for (let i = N; i >= 0; i--) p.push([(i / N) * 100, 100 - bite(r() * 1)]);
  for (let i = 6; i >= 1; i--) p.push([r() * 0.8, (i / 7) * 100]);
  return `polygon(${p.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(', ')})`;
}

export function pages() {
  // ---------- A: the band on every page today ----------
  const optA = signUp();

  // ---------- B: The Pass. A membership card that leans toward the pointer and fills in as you type ----------
  const tick = `<i class="su-b__ok">${icon('check')}</i>`;
  const row = (n) => `<span class="su-b__row" data-row="${n}"><small>${esc(T[n])}${tick}</small><span class="su-b__val"><b data-su-val="${n}" data-ph="${esc(PH[n])}">${esc(PH[n])}</b><i class="su-b__caret"></i></span></span>`;
  const optB = band(`<div class="su-b__grid" data-su="pass">
  <div class="su-b__words">${kicker(T.kicker)}${dh(T.a, T.b, { id: 'su-b-h', size: 'lg' })}<p class="su-b__lede">${esc(T.text)}</p></div>
  <div class="su-b__stage" data-su-stage aria-hidden="true">
    <div class="su-b__float">
      <div class="su-b__card" data-su-card>
        <div class="su-b__face">
          <span class="su-b__top"><img class="su-b__logo" src="${asset('brand/logo.svg')}" alt="" width="314" height="58" loading="lazy" decoding="async"><span class="su-b__tier">Loyalty program</span></span>
          <span class="su-b__mid"><span class="su-b__chip"><span class="su-b__disc"></span></span><span class="su-b__rows">${row('email')}${row('phone')}</span></span>
          <span class="su-b__foot"><span>${stores.map((s) => esc(s.city)).join(' · ')}</span><span class="su-b__seal"><img src="${asset('brand/round-logo-240.webp')}" alt="" width="240" height="240" loading="lazy" decoding="async"></span></span>
        </div>
        <span class="su-b__holo"></span><span class="su-b__glare"></span><span class="su-b__scan"></span>
      </div>
    </div>
    <span class="su-b__floor"></span>
  </div>
  ${formOpen('su-b__form su-light')}
    <div class="su-b__fields">
      <label class="field"><span>${esc(T.email)}</span>${input('email')}</label>
      <label class="field"><span>${esc(T.phone)}</span>${input('phone')}</label>
    </div>
    <div class="su-b__go">${submit()}</div>
    ${note()}
  </form>
</div>`, { tone: 'lime', cls: 'su-b', labelledby: 'su-b-h', drip: 'ink', lx: '78%', ly: '18%' });

  // ---------- C: Paste-up. The heading is sprayed onto a block wall; the form is a poster pasted over it ----------
  // the spray can is the hero's cut-out (obj-spraycan); one rides each line while it is sprayed
  const can = `<span class="su-c__can" aria-hidden="true">${img('obj-spraycan', { decorative: true, sizes: '120px', min: 300 })}</span>`;
  const line = (cls, t) => `<span class="su-c__line su-c__line--${cls}"><span class="su-c__ink">${esc(t)}</span><i class="su-c__puff" aria-hidden="true"></i>${can}</span>`;
  const tickSvg = `<svg class="su-c__tick" viewBox="0 0 40 32" aria-hidden="true" focusable="false"><path pathLength="1" d="M5 17.5c4.2 2.6 7.2 5.6 9.6 9.4C19.4 17 26.6 9 35 4.5"/></svg>`;
  const cField = (n) => `<label class="field su-c__field"><span class="su-c__lbl">${esc(T[n])}</span><span class="su-c__box">${input(n)}${tickSvg}</span></label>`;
  // su-rough: a little turbulence on the letter edges, so the paint reads as sprayed rather than typeset
  // and overspray: the letters' own colour, blurred wide and broken into droplets by a thresholded noise
  const rough = `<svg class="su-c__defs" width="0" height="0" aria-hidden="true" focusable="false"><filter id="su-rough" x="-6%" y="-10%" width="112%" height="120%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="7" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="paint"/>
    <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="halo"/>
    <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="11" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 15 -9.1" result="dots"/>
    <feComposite in="halo" in2="dots" operator="in" result="spk"/>
    <feMerge><feMergeNode in="spk"/><feMergeNode in="paint"/></feMerge>
  </filter></svg>`;
  const optC = `<section class="band band--night band--lit su-c" aria-labelledby="su-c-h" data-su="wall" data-spot style="--lx:30%;--ly:34%">
  ${rough}
  <div class="band__clip" aria-hidden="true"><span class="su-c__wall"></span><span class="su-c__lamp"></span></div>
  <div class="wrap su-c__grid">
    <div class="su-c__words">
      <h2 class="dh dh--xl su-c__tag" id="su-c-h">${line('a', T.a)} ${line('b', T.b)}</h2>
    </div>
    <div class="su-c__pin">
      <span class="su-c__tape su-c__tape--l" aria-hidden="true"></span><span class="su-c__tape su-c__tape--r" aria-hidden="true"></span>
      <div class="su-c__poster" style="clip-path:${torn(20261113)}">
        <div class="su-c__head">${kicker(T.kicker)}<img src="${asset('brand/round-logo-240.webp')}" alt="" width="240" height="240" loading="lazy" decoding="async"></div>
        <p class="su-c__lede">${esc(T.text)}</p>
        ${formOpen('su-c__form su-light')}
          ${cField('email')}
          ${cField('phone')}
          <div class="su-c__go">${submit()}<i class="su-c__burst" aria-hidden="true"></i></div>
          ${note()}
        </form>
        <span class="su-c__wet" aria-hidden="true"></span>
      </div>
    </div>
  </div>
</section>`;

  // ---------- D: Needle Drop. The form is on the record's sleeve; focus a field and the needle drops on its track ----------
  // A1 / A2 / A3 are the two fields and the button, in tab order; the readout repeats the label of the focused one
  const trk = (no, n) => `<div class="su-d__trk" data-trk="${n}"><span class="su-d__no" aria-hidden="true">${no}</span><label class="field"><span>${esc(T[n])}</span>${input(n)}</label></div>`;
  const optD = `<section class="band band--ink band--lit su-d" aria-labelledby="su-d-h" data-su="deck" data-spot style="--lx:74%;--ly:34%">
  <div class="wrap su-d__grid">
    <div class="su-d__words">${kicker(T.kicker)}${dh(T.a, T.b, { id: 'su-d-h', size: 'lg' })}<p class="su-d__lede">${esc(T.text)}</p></div>
    <div class="su-d__stage">
      <div class="su-d__deck" aria-hidden="true">
        <div class="su-d__rec"><div class="su-d__disc"><span class="su-d__label"><img src="${asset('brand/round-logo-480.webp')}" alt="" width="480" height="480" loading="lazy" decoding="async"></span><span class="su-d__spindle"></span></div><span class="su-d__sheen"></span></div>
        <span class="su-d__base"></span>
        <span class="su-d__arm"><span class="su-d__weight"></span><span class="su-d__rod"></span><span class="su-d__head"></span></span>
      </div>
      <div class="su-d__sleeve su-light">
        <p class="su-d__now" aria-hidden="true"><span class="su-d__eq"><i></i><i></i><i></i><i></i></span><span data-su-now data-idle="Side A">Side A</span><span class="su-d__rpm">33 1/3 rpm</span></p>
        ${formOpen('su-d__form')}
          ${trk('A1', 'email')}
          ${trk('A2', 'phone')}
          <div class="su-d__trk su-d__go" data-trk="btn"><span class="su-d__no" aria-hidden="true">A3</span>${submit()}</div>
          ${note()}
        </form>
      </div>
    </div>
  </div>
</section>`;

  const intro = `<section class="lab-intro"><div class="wrap"><p class="kicker">Design lab</p><h1 class="dh dh--md"><span class="dh__a">Sign Up &amp; Save</span> <span class="dh__b">Dynamic options</span></h1>
  <p class="lede">The sign-up band at the foot of every page as it is today (A) and three dynamic redesigns (B, C, D). Each keeps the band's own words, the same two fields, the note and the link, and each form is real: type in it, tab through it, press Sign Up. Nothing is sent in this preview. Pick one and it replaces the band on every page.</p>
  <p class="lab-jump"><a class="chipbtn" href="#su-opt-a">A · Today</a><a class="chipbtn" href="#su-opt-b">B · The Pass</a><a class="chipbtn" href="#su-opt-c">C · Paste-up</a><a class="chipbtn" href="#su-opt-d">D · Needle Drop</a></p></div></section>`;

  return [{
    path: '/lab/signup/', type: 'lab', lab: true, noindex: true,
    title: 'Sign Up & Save: three dynamic options (design lab)',
    description: 'The Sign Up & Save band of the Capital District Cannabis redesign as it is and in three dynamic, working options.',
    main: intro
      + `<div id="su-opt-a" class="su-opt su-opt--drip">${label('A', 'Today', 'The current band: the glass form on lime, with paint drips into the footer.')}${optA}</div>`
      + `<div id="su-opt-b" class="su-opt su-opt--drip">${label('B', 'The Pass', 'A membership card that leans toward the pointer and fills in as you type; the foil follows the light.')}${optB}</div>`
      + `<div id="su-opt-c" class="su-opt">${label('C', 'Paste-up', 'The heading is sprayed onto the wall as it scrolls in; the form is a pasted-up poster that ticks each field you fill.')}${optC}</div>`
      + `<div id="su-opt-d" class="su-opt">${label('D', 'Needle Drop', 'Focus a field and the needle drops on its track; Tab moves it on; Sign Up scratches the record.')}${optD}</div>`,
  }];
}
