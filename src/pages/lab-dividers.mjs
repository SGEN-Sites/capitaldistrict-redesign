// lab-dividers.mjs: the section-divider lab (/lab/dividers/, noindex, never in the sitemap) and the reusable helper
// behind it. The owner asked for options for the plain straight edge between two dark bands (an ink band above, a
// night band with its key light below). Six options, each drawn between real bands that carry headings and lines
// already on the site, then the strongest one again between the mint band and the dark bands.
//
// divider(kind, { from, to, seed }) returns the markup of one seam, placed between any two sections:
//   band(a, { tone: 'ink' }) + divider('torn', { from: 'ink', to: 'night', seed: 3 }) + band(b, { tone: 'night' })
// kind: torn | spray | tape | sky | neon | record. from / to: the tones of the bands above and below (night, night-2,
// ink, ink-2, slate, mint, lime, paper). seed: another seed draws another tear, spray or skyline.
// The strip is zero-height (the layout never moves), aria-hidden, takes no clicks and clips its art to the page width.
// Styles: src/styles/dv.css. Motion: src/scripts/dv.js (plays the one-shot moments when a seam comes into view and
// pauses the loops off screen; without it every seam shows its finished state). The art paints above both bands, so a
// seam with a divider takes no crossing cut-out and no band--sheet overlap.
import { band, dh, kicker, esc } from '../lib/parts.mjs';
import { divider } from '../lib/dividers.mjs';

// ---------- the lab page ----------
// Every heading and line below is already on the built site (home page sections, the Learn page, the Shop page).
const INK = [
  { k: 'Three stores, one crew', a: 'Where Ya', b: 'Shopping?', t: 'Pick your store once. Every Shop button on the site follows it, straight to that store’s menu, specials and cart.' },
  { k: 'Shout-outs', a: 'NY Dispensary', b: 'Reviews', t: 'What customers say about us on Google.' },
  { k: 'From the blog', a: 'Learn', b: 'The Culture', t: 'Guides, strain picks, local things to do and store news.' },
  { k: 'Building Community Through Cannabis', a: 'Unifying', b: 'Upstate', t: 'Three licensed dispensaries across the Capital Region: Albany, Clifton Park and Schenectady.' },
  { k: 'Product guides', a: 'Know your', b: 'Shelves', t: 'Ten shelves on the live menu. Read up first, then shop the shelf at your store.' },
  { k: 'Where Ya Shopping?', a: 'Pick your', b: 'Store', t: 'Every Shop button on this site follows your store. Switch any time, or shop a store directly from its card.' },
];
const NIGHT = [
  { k: 'Order ahead', a: 'Shop', b: 'Ahead', t: 'Albany, Clifton Park or Schenectady. Each location has its own menu and its own cart.' },
  { k: 'Pop-ups, parties, car meets', a: 'Events', b: '& Culture', t: 'Block parties, boat parties, grand openings and brand pop-ups. The latest from the event calendar.' },
  { k: 'Good to know', a: 'FAQs', b: '', t: 'New York rules, what to bring and how to shop.' },
  { k: 'The crate', a: 'Shop By', b: 'Category', t: 'Flip through the crate. Every sleeve opens that shelf of the live menu for your store, stocked and ready to add to your cart.' },
  { k: 'Start here', a: 'Your first', b: 'Visit', t: 'Eight things to know before you walk up to the counter at any of our three stores.' },
  { k: 'Hall of fame', a: 'Our', b: 'Purpose', t: 'At Capital District Cannabis & Wellness, we’re committed to serving Upstate New York with trusted, state-licensed cannabis.' },
];
const MINT = { k: 'Fresh at every store', a: 'Daily', b: 'Specials', t: 'A rotating selection of cannabis deals on flower, pre-rolls, edibles, vapes, and more.' };

const OPTS = [
  { id: 'a', kind: 'torn', seed: 11, name: 'Wheat-paste tear', how: 'The band above ends in a ripped poster edge: an irregular tear with a pale paper lip and a soft shadow, drawn fresh for every seam.' },
  { id: 'b', kind: 'spray', seed: 5, name: 'Overspray', how: 'One freehand pass of lime spray paint covers the seam: ragged edges, overspray and thin runs. It sprays on and drips as it scrolls into view.' },
  { id: 'c', kind: 'tape', seed: 1, name: 'Tape line', how: 'A strip of lime tape becomes the edge, at a slight angle, carrying the brand’s own phrases; it scrolls, faster while the page scrolls.' },
  { id: 'd', kind: 'sky', seed: 3, name: 'Capital skyline', how: 'The band below rises into a Capital Region skyline (the Capitol, Empire State Plaza, the Egg) in plain shapes, a few windows lit.' },
  { id: 'e', kind: 'neon', seed: 1, name: 'Neon cut', how: 'The edge is cut at an angle and lined with a lime neon tube that flickers on as it comes into view, then hums.' },
  { id: 'f', kind: 'record', seed: 1, name: 'Record edge', how: 'The edge of a giant record rises across the seam: fine grooves, two track gaps and a lime rim light; the sheen follows the scroll.' },
];

const head = (c, id) => `<div class="band__head"><div class="band__intro">${kicker(c.k)}${dh(c.a, c.b, { id, size: 'md' })}</div><p class="lede" data-reveal>${esc(c.t)}</p></div>`;
const darkBand = (c, id, tone = 'ink') => band(head(c, id), { tone, labelledby: id, cls: 'dv-demo' });
const litBand = (c, id, o = {}) => band(head(c, id), { tone: o.tone || 'night', lit: true, spot: true, lx: o.lx || '80%', ly: o.ly || '30%', labelledby: id, cls: 'dv-demo' });
const label = (k, name, how) => `<div class="lab-label wrap"><span class="lab-label__k">${esc(k)}</span><b>${esc(name)}</b><span>${esc(how)}</span></div>`;

export function pages() {
  const opts = OPTS.map((o, i) => `<div id="dv-opt-${o.id}" class="dv-opt">${label('Option ' + o.id.toUpperCase(), o.name, o.how)}
${darkBand(INK[i], `dv-${o.id}-1`)}
${divider(o.kind, { from: 'ink', to: 'night', seed: o.seed })}
${litBand(NIGHT[i], `dv-${o.id}-2`)}</div>`).join('\n');

  // the strongest option (A) between the mint band and the dark bands, both ways, in the home page's order
  const light = `<div id="dv-light" class="dv-opt">${label('Option A', 'On a light band', 'The same tear between the mint band and the dark bands, both ways: dark over light, then light over dark.')}
${litBand(NIGHT[0], 'dv-l-1')}
${divider('torn', { from: 'night', to: 'mint', seed: 23 })}
${band(head(MINT, 'dv-l-2'), { tone: 'mint', lx: '15%', ly: '0%', labelledby: 'dv-l-2', cls: 'dv-demo' })}
${divider('torn', { from: 'mint', to: 'night-2', seed: 37 })}
${darkBand(NIGHT[5], 'dv-l-3', 'night-2')}</div>`;

  const intro = `<section class="lab-intro"><div class="wrap"><p class="kicker">Design lab</p><h1 class="dh dh--md"><span class="dh__a">Section dividers</span> <span class="dh__b">Six options</span></h1>
  <p class="lede">Six ways to replace the plain straight edge between two dark bands. Each one sits between an ink band and a night band with its key light on, as on the home page, and each is one reusable piece, so the pick can go between any two sections. The last demo puts option A between the mint band and the dark bands.</p>
  <p class="lab-jump">${OPTS.map((o) => `<a class="chipbtn" href="#dv-opt-${o.id}">${o.id.toUpperCase()} · ${esc(o.name)}</a>`).join('')}<a class="chipbtn" href="#dv-light">A · On a light band</a></p></div></section>`;

  return [{
    path: '/lab/dividers/', type: 'lab', lab: true, noindex: true,
    title: 'Section dividers: six options (design lab)',
    description: 'Six section-divider options for the seams between bands on the Capital District Cannabis redesign.',
    main: intro + opts + '\n' + light,
  }];
}
