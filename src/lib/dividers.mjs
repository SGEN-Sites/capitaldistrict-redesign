// dividers.mjs: the section seams (owner, 2026-11-13). divider(kind, { from, to, seed }) returns one seam to place between
// two bands; kinds torn | spray | tape | sky | neon | record (see /lab/dividers/). build.mjs places them site-wide:
// into a light band the wheat-paste tear, around deals the neon cut, everywhere else the overspray. Styles: dv.css;
// motion: dv.js. Moved here from src/pages/lab-dividers.mjs (the lab now imports it).
import { esc } from './parts.mjs';
import { phrases } from '../content/site.mjs';

const TONE = { night: '--night', 'night-2': '--night-2', ink: '--ink', 'ink-2': '--ink-2', slate: '--slate', mint: '--mint', lime: '--lime', paper: '--paper' };
const LIGHT = ['mint', 'lime', 'paper'];
const KINDS = { torn, spray, tape, sky, neon, record };

export function divider(kind, o = {}) {
  const make = KINDS[kind];
  if (!make) throw new Error(`divider: unknown kind "${kind}"`);
  const from = TONE[o.from] ? o.from : 'ink', to = TONE[o.to] ? o.to : 'night';
  const cls = ['dv-seam', `dv-seam--${kind}`, LIGHT.includes(from) ? 'dv-seam--from-light' : '', LIGHT.includes(to) ? 'dv-seam--to-light' : '', o.cls || ''].filter(Boolean).join(' ');
  return `<div class="${cls}" style="--dv-a:var(${TONE[from]});--dv-b:var(${TONE[to]})" aria-hidden="true"><i class="dv-seam__probe"></i>${make({ ...o, seed: o.seed ?? 1 })}</div>`;
}

// ---------- shared drawing helpers ----------
// a seeded stream in [0, 1): xorshift32, the seed spread first so neighbouring seeds draw unrelated shapes
function rng(seed) {
  let x = Math.imul((seed | 0) + 1, 2654435761) >>> 0 || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}
// smooth 1-D value noise: a random value every `period` px, eased in between, within ±amp
function wave(r, period, amp, span) {
  const v = Array.from({ length: Math.ceil(span / period) + 3 }, () => r() * 2 - 1);
  return (x) => { const t = Math.max(0, x) / period, i = Math.floor(t), f = t - i, s = f * f * (3 - 2 * f); return (v[i] + (v[i + 1] - v[i]) * s) * amp; };
}
const n1 = (v) => Math.round(v * 10) / 10;
// a polyline as compact path data: steps between the rounded points (so the rounding never drifts), short numbers
const num = (v) => String(n1(v)).replace(/^(-?)0\./, '$1.');
const steps = (pts) => pts.slice(1).map(([x, y], i) => { const dx = num(n1(x) - n1(pts[i][0])), dy = num(n1(y) - n1(pts[i][1])); return `l${dx}${dy[0] === '-' ? '' : ' '}${dy}`; }).join('');
let uid = 0; // unique ids for the SVG defs of several seams on one page

// ---------- A. torn: a ripped wheat-paste poster edge ----------
// The band above is the poster: its bottom edge is torn (three scales of wobble plus fibres), a pale paper lip shows
// where the print tore off the paper, and the whole flap casts a soft shadow. Drawn 1:1 in px on a 2400px canvas and
// centred, so the tear keeps its grain at every width (never stretched).
function torn(o) {
  const W = 2400, H = 80, SEAM = 6, id = `dv-tn${++uid}`;
  const r = rng(o.seed), span = W + 60;
  const big = wave(r, 410, 7, span), mid = wave(r, 92, 4.2, span), fine = wave(r, 23, 1.7, span), lipW = wave(r, 58, 1, span);
  const edge = [], lip = [];
  for (let x = -16; x <= W + 16; x += 3 + Math.floor(r() * 6)) {
    const s = x + 30;
    let y = SEAM + 21 + big(s) + mid(s) + fine(s) + (r() - 0.5) * 2.2;
    if (r() < 0.045) y += 1.5 + r() * 3.5; // a fibre left hanging
    edge.push([x, y]);
    lip.push([x, y + Math.max(0, 1.2 + lipW(s) * 2.7 + (r() - 0.5) * 1.2)]);
  }
  // the flap starts above the canvas, so its only drawn edge is the tear; the shadow is drawn inside the svg (the
  // canvas clips it), so nothing darkens the band above the seam
  const d = (pts) => `M${pts[0][0]} -24L${pts[0][0]} ${num(pts[0][1])}${steps(pts)}L${pts[pts.length - 1][0]} -24Z`;
  return `<svg class="dv-torn" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice" focusable="false">
<defs><filter id="${id}" filterUnits="userSpaceOnUse" x="-30" y="-40" width="${W + 60}" height="${H + 60}" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceAlpha" stdDeviation="3.4" result="b"/><feOffset in="b" dy="5" result="o"/>
<feFlood class="dv-torn__shade"/><feComposite in2="o" operator="in" result="s"/>
<feGaussianBlur in="SourceAlpha" stdDeviation=".7" result="b2"/><feOffset in="b2" dy="1.2" result="o2"/>
<feFlood class="dv-torn__shade dv-torn__shade--hard"/><feComposite in2="o2" operator="in" result="s2"/>
<feMerge><feMergeNode in="s"/><feMergeNode in="s2"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter></defs>
<g filter="url(#${id})"><path class="dv-torn__lip" d="${d(lip)}"/><path class="dv-torn__face" d="${d(edge)}"/></g>
</svg>`;
}

// ---------- B. spray: a fat-cap line sprayed over the seam ----------
// One freehand pass of lime paint along the seam: a dense stroke that swells and thins with the pressure and wavers a
// little (never off the seam), its edges ragged where the paint thins, a mist and a scatter of overspray on both sides,
// stray droplets, and thin runs with beads where the paint pooled. Built as an SVG filter (blurred stroke thresholded
// against fine noise). When the seam scrolls into view the line sprays on from left to right and the runs drip; the
// runs live in their own svg so their motion never re-runs the filter.
function spray(o) {
  const W = 2400, H = 140, SEAM = 46, id = `dv-sp${++uid}`;
  const r = rng(o.seed), span = W + 120;
  const big = wave(r, 560, 1.5, span), mid = wave(r, 150, 0.8, span), press = wave(r, 280, 1, span), press2 = wave(r, 64, 1, span);
  const c = (x) => SEAM + 0.5 + big(x + 60) + mid(x + 60);          // the centre line wavers by 2.3px at most
  const hw = (x) => 7.4 + press(x + 60) * 2.6 + press2(x + 60) * 0.8; // half width 4 to 10.8: the seam stays under paint
  const top = [], bot = [];
  for (let x = -40; x <= W + 40; x += 12) { top.push([x, c(x) - hw(x)]); bot.unshift([x, c(x) + hw(x)]); }
  const line = `M${top[0][0]} ${num(top[0][1])}${steps(top)}L${bot[0][0]} ${num(bot[0][1])}${steps(bot)}Z`;
  // stray droplets: three sizes, thinning out with the distance from the line, more below (the paint falls)
  const dots = [[], [], []];
  for (let i = 0; i < 190; i++) {
    const x = r() * W, k = r() < 0.6 ? 0 : r() < 0.72 ? 1 : 2, down = r() < 0.6;
    const dy = (11 + Math.pow(r(), 2.3) * (down ? 34 : 26)) * (down ? 1 : -1); // within 45px: clear of a phone band's text
    dots[k].push(`M${n1(x)} ${n1(c(x) + dy)}h0`);
  }
  // runs: tapered threads ending in a bead, over the middle of the canvas (what a phone or a desktop shows)
  const runs = [];
  const n = 7 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const x = W * (0.2 + 0.6 * ((i + 0.1 + r() * 0.8) / n)), w = 1.2 + r() * 1.3;
    const y0 = c(x) + hw(x) - 3, y1 = y0 + 8 + Math.pow(r(), 1.3) * 32, rb = w * 1.35;
    runs.push(`<path class="dv-spray__run" style="--dl:${(1.05 + r() * 0.9).toFixed(2)}s" d="M${n1(x - w)} ${n1(y0)}L${n1(x - w * 0.5)} ${n1(y1)}A${n1(rb)} ${n1(rb)} 0 1 0 ${n1(x + w * 0.5)} ${n1(y1)}L${n1(x + w)} ${n1(y0)}Z"/>`);
  }
  const svg = (cls, body) => `<svg class="${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice" focusable="false">${body}</svg>`;
  return `<div class="dv-spray">${svg('dv-spray__paint', `
<defs><filter id="${id}" filterUnits="userSpaceOnUse" x="-40" y="0" width="${W + 80}" height="${SEAM + 60}" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency=".52" numOctaves="2" seed="${o.seed}" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="na"/>
<feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="f1"/>
<feComposite in="f1" in2="na" operator="arithmetic" k1="0" k2="10" k3="-12" k4="3" result="c1"/>
<feComponentTransfer in="c1" result="core"><feFuncA type="table" tableValues="0 0 1 1"/></feComponentTransfer>
<feGaussianBlur in="SourceAlpha" stdDeviation="8" result="f2"/>
<feComposite in="f2" in2="na" operator="arithmetic" k1="0" k2="8.5" k3="-10" k4="1" result="c2"/>
<feComponentTransfer in="c2" result="speck"><feFuncA type="table" tableValues="0 0 1 1"/></feComponentTransfer>
<feGaussianBlur in="SourceAlpha" stdDeviation="9" result="f3"/>
<feComponentTransfer in="f3" result="mist"><feFuncA type="linear" slope=".42"/></feComponentTransfer>
<feMerge result="all"><feMergeNode in="mist"/><feMergeNode in="speck"/><feMergeNode in="core"/></feMerge>
<feFlood class="dv-spray__ink"/><feComposite in2="all" operator="in"/>
</filter></defs>
<path d="${line}" filter="url(#${id})"/>
<path class="dv-spray__dots" style="stroke-width:1.2" d="${dots[0].join('')}"/><path class="dv-spray__dots" style="stroke-width:2" d="${dots[1].join('')}"/><path class="dv-spray__dots" style="stroke-width:2.9" d="${dots[2].join('')}"/>`)}${svg('dv-spray__runs', runs.join(''))}</div>`;
}

// ---------- C. tape: a strip of lime tape becomes the edge ----------
// The tape runs at a slight angle (the drop is a share of the page width, capped) with its top edge touching the seam
// at the right; the band above fills the wedge down to it, so the tape is the edge. It carries the brand's own short
// phrases as a marquee; site.js speeds every [data-tape] track up while the page scrolls.
function tape(o) {
  const list = o.phrases || phrases;
  const run = list.map((t) => `<span>${esc(t)}</span><i>✦</i>`).join('');
  return `<div class="dv-tape"><span class="dv-tape__wedge"></span><div class="dv-tape__strip" data-tape="1"><div class="tape__track">${run}${run}</div></div></div>`;
}

// ---------- D. sky: the band below rises into a Capital Region skyline ----------
// Plain geometric shapes, drawn here (not traced from anything): the SUNY tower and the Alfred E. Smith Building, the
// Capitol's steep roofs, the four Agency towers and the Corning Tower on the Empire State Plaza deck, the Egg on its
// stem, the Cultural Education Center and the cathedral's twin spires, between lower city blocks (seeded). A lighter far
// row adds depth (it drifts with the scroll where the browser supports scroll timelines), a lime haze glows behind, a
// few windows are lit and some of them flicker; a beacon pulses on the tallest tower. Canvas 2600 wide, landmarks
// centred, scaled to the band's padding and cropped from the middle, so a phone still shows the Capitol and the Plaza.
function sky(o) {
  const W = 2600, B = 120, H = 124, id = `dv-sk${++uid}`;
  const r = rng(o.seed);
  const Y = (h) => n1(B - h);
  const near = [], far = [], lit = [], dim = [], tw = [];
  // every outline wound the same way, so overlapping shapes in one path never cut holes in each other
  const shape = (pts, list = near) => {
    let a = 0; for (let i = 0; i < pts.length; i++) { const [x0, h0] = pts[i], [x1, h1] = pts[(i + 1) % pts.length]; a += x0 * h1 - x1 * h0; }
    const p = a < 0 ? pts.slice().reverse() : pts;
    list.push('M' + p.map(([x, h]) => `${n1(x)} ${Y(h)}`).join('L') + 'Z');
  };
  const box = (x, w, h0, h1, list = near) => shape([[x, h0], [x + w, h0], [x + w, h1], [x, h1]], list);
  const roof = (x, w, h, apex, inset = 0) => shape(inset ? [[x, h], [x + inset, apex], [x + w - inset, apex], [x + w, h]] : [[x, h], [x + w / 2, apex], [x + w, h]]);
  const windows = (x, w, h, p, h0 = 7) => {
    for (let wy = h - 5; wy >= h0; wy -= 6) for (let wx = x + 3; wx + 4 <= x + w; wx += 5) {
      const q = r(); const cell = `M${n1(wx)} ${Y(wy)}h2v3h-2z`;
      if (q < p * 0.6) lit.push(cell); else if (q < p) dim.push(cell);
    }
  };
  const twinkle = (x, h) => tw.push(`<rect class="dv-sky__tw" x="${n1(x)}" y="${Y(h)}" width="2" height="3" style="--du:${(6 + r() * 7).toFixed(1)}s;--dl:-${(r() * 9).toFixed(1)}s"/>`);
  // lower city blocks, taller toward the middle; rooftop tanks, masts and setbacks
  const city = (x0, x1, lo, hi, list, p) => {
    let x = x0;
    while (x < x1 - 6) {
      const w = Math.min(x1 - x, 14 + Math.floor(r() * 34));
      const c = Math.abs(x + w / 2 - W / 2) / (W / 2);
      const h = Math.round(lo + (hi - lo) * (0.3 + 0.7 * r()) * (1 - c * 0.5));
      box(x, w, list === far ? -14 : 0, h, list);
      if (list === near) {
        const q = r();
        if (w > 22 && q < 0.2) { const t = x + 4 + Math.floor(r() * (w - 16)); box(t, 1, h, h + 5); box(t + 7, 1, h, h + 5); box(t - 1, 10, h + 5, h + 11); roof(t - 1, 10, h + 11, h + 14); }
        else if (q < 0.42) box(x + Math.floor(w * (0.3 + r() * 0.4)), 1, h, h + 7 + Math.floor(r() * 9));
        else if (w > 18 && q < 0.66) box(x + 3, w - 6, h, h + 4);
        if (p) windows(x, w, h, p);
      }
      x += w + (r() < 0.35 ? 1 + Math.floor(r() * 5) : 0);
    }
  };

  city(0, W, 26, 72, far, 0);                   // far row
  city(0, 852, 10, 40, near, 0.1);              // left blocks
  city(1722, W, 10, 40, near, 0.1);             // right blocks
  box(0, W, -3, 4);                             // street level: the seam never shows between buildings
  // SUNY System Administration Building: long gabled body, a central Gothic tower and spire
  box(856, 136, 0, 30); roof(856, 16, 30, 39); roof(976, 16, 30, 39);
  box(915, 22, 0, 60); box(913, 3, 60, 66); box(934, 3, 60, 66); roof(916, 20, 60, 81); box(925.5, 1, 81, 88);
  windows(860, 52, 30, 0.12); windows(940, 48, 30, 0.12); windows(915, 22, 60, 0.16, 34);
  box(994, 30, 0, 22); box(1000, 18, 22, 25);
  // Alfred E. Smith Building: art deco setbacks and a mast
  box(1025, 60, 0, 42); box(1033, 44, 42, 58); box(1041, 28, 58, 70); box(1049, 12, 70, 78); box(1054.5, 1, 78, 87);
  windows(1025, 60, 42, 0.16); windows(1041, 28, 70, 0.18, 46);
  // New York State Capitol: the body under a mansard, steep pavilion roofs, turrets and a high centre roof
  box(1093, 184, 0, 34); shape([[1097, 34], [1103, 41], [1267, 41], [1273, 34]]);
  box(1093, 30, 0, 46); roof(1093, 30, 46, 61, 7); box(1247, 30, 0, 46); roof(1247, 30, 46, 61, 7);
  box(1166, 38, 0, 50); roof(1166, 38, 50, 69, 9); box(1184.5, 1, 69, 75);
  box(1137, 8, 0, 50); roof(1137, 8, 50, 58); box(1225, 8, 0, 50); roof(1225, 8, 50, 58);
  roof(1129, 7, 41, 46); roof(1150, 7, 41, 46); roof(1210, 7, 41, 46); roof(1234, 7, 41, 46);
  windows(1093, 184, 34, 0.12);
  // Empire State Plaza: the deck, four Agency towers, the Corning Tower
  box(1277, 300, 0, 10);
  for (const x of [1289, 1319, 1349, 1379]) { box(x, 22, 0, 56); box(x + 1.5, 19, 56, 58); windows(x, 22, 56, 0.17, 14); }
  box(1418, 36, 0, 100); box(1422, 28, 100, 104); box(1428, 16, 104, 107); box(1435.5, 1, 107, 116);
  windows(1418, 36, 100, 0.15, 14);
  // the Egg, held in its flared concrete stem; a lit rim along its top shows it is a solid form
  shape([[1478, 9], [1483, 19], [1478, 27], [1500, 27], [1495, 19], [1500, 9]]);
  const egg = { cx: 1489, cy: Y(39), rx: 23, ry: 17, deg: -7 };
  egg.at = (t) => { const a = egg.deg * Math.PI / 180, x = egg.rx * Math.cos(t * Math.PI / 180), y = egg.ry * Math.sin(t * Math.PI / 180); return `${n1(egg.cx + x * Math.cos(a) - y * Math.sin(a))} ${n1(egg.cy + x * Math.sin(a) + y * Math.cos(a))}`; };
  // Cultural Education Center, then the cathedral's twin spires
  box(1520, 130, 0, 31); box(1528, 114, 31, 34); windows(1520, 130, 31, 0.1);
  box(1672, 44, 0, 32); box(1672, 11, 0, 52); box(1705, 11, 0, 52); roof(1672, 11, 52, 76); roof(1705, 11, 52, 76); windows(1684, 18, 32, 0.12);
  for (const [x, h] of [[1291, 50], [1352, 38], [1384, 44], [1424, 88], [1440, 70], [1424, 46], [1049, 52], [1103, 24], [1530, 22], [1600, 16], [920, 44], [1260, 26]]) twinkle(x + 3, h);

  return `<svg class="dv-sky" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" focusable="false">
<defs><radialGradient id="${id}g" cx=".5" cy="1" r=".62"><stop offset="0" class="dv-sky__g0"/><stop offset="1" class="dv-sky__g1"/></radialGradient>
<clipPath id="${id}c"><rect x="0" y="0" width="${W}" height="${B}"/></clipPath></defs>
<rect x="0" y="0" width="${W}" height="${B}" fill="url(#${id}g)"/>
<g clip-path="url(#${id}c)"><path class="dv-sky__far" d="${far.join('')}"/></g>
<path class="dv-sky__near" d="${near.join('')}"/>
<ellipse class="dv-sky__near" cx="${egg.cx}" cy="${egg.cy}" rx="${egg.rx}" ry="${egg.ry}" transform="rotate(${egg.deg} ${egg.cx} ${egg.cy})"/>
<path class="dv-sky__rim" d="M${egg.at(206)}A${egg.rx} ${egg.ry} ${egg.deg} 0 1 ${egg.at(332)}"/>
<path class="dv-sky__lit" d="${lit.join('')}"/><path class="dv-sky__dim" d="${dim.join('')}"/>
${tw.join('')}
<circle class="dv-sky__beacon" cx="1436" cy="${Y(116.5)}" r="1.6"/>
</svg>`;
}

// ---------- E. neon: an angled cut lined with a neon tube ----------
// The band above is cut at an angle (deeper to the right, a share of the width, capped); a lime tube in three runs
// (dark electrode caps where the runs meet) follows the cut and spills light on both bands. It flickers on when the
// seam comes into view, then hums.
function neon() {
  return `<div class="dv-neon"><span class="dv-neon__wedge"></span><div class="dv-neon__line">
<span class="dv-neon__lit"><span class="dv-neon__spill"></span><span class="dv-neon__spill dv-neon__spill--up"></span><span class="dv-neon__seg dv-neon__seg--1"></span><span class="dv-neon__seg dv-neon__seg--2"></span><span class="dv-neon__seg dv-neon__seg--3"></span></span>
<span class="dv-neon__cap dv-neon__cap--1"></span><span class="dv-neon__cap dv-neon__cap--2"></span><span class="dv-neon__cap dv-neon__cap--3"></span><span class="dv-neon__cap dv-neon__cap--4"></span>
${[14, 27.5, 53, 84.5].map((x) => `<span class="dv-neon__clip" style="left:${x}%"></span>`).join('')}
</div></div>`;
}

// ---------- F. record: the edge of a giant record ----------
// The top of a record far larger than the page rises across the seam: vinyl with fine concentric grooves and two
// track gaps, a lime rim light, and a soft sheen; everything below the seam fades into the band below. The sheen
// glides as the page scrolls (where the browser has scroll timelines; a slow drift elsewhere). The arc scales with the
// page width (its height is a share of the width, capped).
function record() {
  const id = `dv-rc${++uid}`, cx = 720, cy = 267.7, rx = 1150, ry = 255.7, k = ry / rx, G = 6.5;
  const ring = (i, style) => `<ellipse cx="${cx}" cy="${cy}" rx="${n1(rx - i * G)}" ry="${n1(ry - i * G * k)}" style="${style}"/>`;
  const grooves = [];
  for (let i = 1; i <= 46; i++) {
    if (i === 13 || i === 15 || i === 31 || i === 33) continue; // smooth land either side of a track gap
    const gap = i === 14 || i === 32;
    grooves.push(ring(i, gap ? 'stroke-opacity:.2;stroke-width:1.4' : `stroke-opacity:${[0.09, 0.14, 0.065, 0.12, 0.08][i % 5]}`));
  }
  // light streaks along two radii (the reflection a record throws back), converging on its centre far below
  const streak = (x, w, cls) => `<path class="dv-rec__streak${cls}" fill="url(#${id}k)" d="M${cx} ${cy}L${x - w} -12L${x + w} -12Z"/>`;
  return `<svg class="dv-rec" viewBox="0 0 1440 140" preserveAspectRatio="none" focusable="false">
<defs><clipPath id="${id}c"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>
<linearGradient id="${id}f" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="140"><stop offset=".56" stop-color="#fff"/><stop offset=".97" stop-color="#000"/></linearGradient>
<mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="1440" height="140"><rect width="1440" height="140" fill="url(#${id}f)"/></mask>
<linearGradient id="${id}r" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1440" y2="0"><stop offset="0" class="dv-rec__r0"/><stop offset=".64" class="dv-rec__r1"/><stop offset="1" class="dv-rec__r0"/></linearGradient>
<linearGradient id="${id}k" gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="92"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="dv-rec__s0"/><stop offset=".5" class="dv-rec__s1"/><stop offset="1" class="dv-rec__s0"/></linearGradient>
<filter id="${id}b" x="-5%" y="-60%" width="110%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
<g mask="url(#${id}m)"><g clip-path="url(#${id}c)"><rect class="dv-rec__vinyl" width="1440" height="140"/><g class="dv-rec__grooves">${grooves.join('')}</g>
<g class="dv-rec__streaks">${streak(452, 30, '')}${streak(1036, 14, ' dv-rec__streak--2')}</g>
<rect class="dv-rec__sheen" x="-150" y="0" width="300" height="140" fill="url(#${id}s)"/></g></g>
<ellipse class="dv-rec__rim dv-rec__rim--glow" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="url(#${id}r)" filter="url(#${id}b)"/>
<ellipse class="dv-rec__rim" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="url(#${id}r)"/>
</svg>`;
}
