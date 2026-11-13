/* gcarousel.js: the home events band as a "gradient carousel" (markup: src/pages/home.mjs, styles: gcarousel.css).
   The flyers stand in a row in 3D, all placed from one float position: the active card centred and square to the
   viewer, the rest turned toward it, set back and smaller. Drag or swipe (inertia with friction, always settling on a
   card), a sideways wheel or trackpad swipe, the arrow keys or the buttons move it; a click on a side card brings it to
   the centre, the centred card follows its link. The band behind is tinted with the active poster's majority colour,
   measured here from a 64 px copy of the poster: quantised to 4 bits a channel, the most frequent chromatic colour
   family (near-black, near-white and grey left out), plus a second, clearly different one for a two-tone glow. One
   IIFE, no globals, no dependencies; the markup is complete without it (a plain swipe row). */
(() => {
  'use strict';
  const d = document, W = window;
  const roots = d.querySelectorAll('[data-gcar]');
  if (!roots.length || !W.requestAnimationFrame) return;
  const RMQ = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => !!(RMQ && RMQ.matches);
  const FRICTION = 0.92; // per 60 fps frame: the release glide and every settle decay by this factor
  const KEY = 'cdc.gcar.v2'; // colour cache: poster file stem -> measured colours (bump when the measure changes)
  const DEFAULT = ['#87a173', '#3f6159']; // a neutral, lime-tinted glow until the poster has been measured
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const memo = new Map();
  let saved = null;

  /* ---------------- colour ---------------- */
  const hex = (c) => '#' + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  function toLab(c) { // sRGB 0-255 -> OKLab
    const r = lin(c[0]), g = lin(c[1]), b = lin(c[2]);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  function fromLab(L, a, b) { // OKLab -> linear sRGB (may fall outside 0-1)
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  }
  const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  // the light a colour throws: same hue, lightness held where it reads as light on the night ground, chroma kept vivid
  // (a near-neutral poster stays near-neutral), pulled back into sRGB by lowering chroma, never by clipping the hue
  function glowOf(h, lo, hi) {
    const [L, a, b] = toLab(parse(h)), C = Math.hypot(a, b), hue = Math.atan2(b, a);
    const L2 = clamp(L, lo, hi); let C2 = C < 0.035 ? C : clamp(C * 1.45, 0.09, 0.24), rgb = null;
    for (let k = 0; k < 30; k++) { rgb = fromLab(L2, C2 * Math.cos(hue), C2 * Math.sin(hue)); if (rgb.every((v) => v > -0.001 && v < 1.001)) break; C2 *= 0.93; }
    return hex(rgb.map((v) => gam(clamp(v, 0, 1)) * 255));
  }
  // The majority colour of an RGBA buffer. Pixels are quantised to 4 bits a channel; each bin is weighed by its pixel
  // count and by how colourful it is in OKLab (soft cut-offs leave out near-black, near-white and grey; a dark but
  // clearly coloured ground, like a night sky, still counts). The bins then vote for their hue on a 5 degree wheel
  // smoothed over +-45 degrees, about one colour name (the oranges, the greens, the magentas), so a colour wins as a
  // family even when its shades scatter over many bins (thin type, gradients, a textured ground). The majority colour is
  // the weighted mean of that family's core (+-20 degrees); the second is the strongest family at least 60 degrees
  // round the wheel. An (almost) black-and-white poster gives its plain most frequent colour instead.
  function analyse(px) {
    const cnt = new Float64Array(4096), sum = new Float64Array(4096 * 3);
    let total = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 128) continue;
      const k = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
      total++; cnt[k]++; sum[k * 3] += px[i]; sum[k * 3 + 1] += px[i + 1]; sum[k * 3 + 2] += px[i + 2];
    }
    if (!total) return null;
    const bins = [], wheel = new Float64Array(72);
    let colourful = 0;
    for (let k = 0; k < 4096; k++) {
      if (!cnt[k]) continue;
      const c = [sum[k * 3] / cnt[k], sum[k * 3 + 1] / cnt[k], sum[k * 3 + 2] / cnt[k]], lab = toLab(c), C = Math.hypot(lab[1], lab[2]);
      const w = cnt[k] * clamp((C - 0.03) / 0.05, 0, 1) * clamp((lab[0] - 0.12) / 0.12, 0, 1) * clamp((0.97 - lab[0]) / 0.05, 0, 1);
      const hue = ((Math.atan2(lab[2], lab[1]) * 180) / Math.PI + 360) % 360;
      bins.push({ k, c, hue, w });
      if (w > 0) { wheel[Math.floor(hue / 5) % 72] += w; colourful += w; }
    }
    const neutral = colourful < total * 0.03;
    const arc = (x, y) => { const v = Math.abs(x - y) % 360; return v > 180 ? 360 - v : v; };
    let c1, c2 = null, share;
    if (neutral) { // the most frequent 4-bit colour, each bin scored with half of each of its 26 neighbours
      const near = (k, fn) => {
        const r = k >> 8, g = (k >> 4) & 15, b = k & 15;
        for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
          const R = r + x, G = g + y, B = b + z;
          if (R >= 0 && G >= 0 && B >= 0 && R < 16 && G < 16 && B < 16) fn((R << 8) | (G << 4) | B, x || y || z ? 0.5 : 1);
        }
      };
      let best = bins[0].k, top = -1;
      for (const x of bins) { let s = 0; near(x.k, (j, w) => { s += cnt[j] * w; }); if (s > top) { top = s; best = x.k; } }
      let n = 0, r = 0, g = 0, b = 0, own = 0;
      near(best, (j, w) => { n += cnt[j] * w; r += sum[j * 3] * w; g += sum[j * 3 + 1] * w; b += sum[j * 3 + 2] * w; own += cnt[j]; });
      c1 = [r / n, g / n, b / n]; share = own / total;
    } else {
      const sm = new Float64Array(72);
      for (let i = 0; i < 72; i++) for (let j = -9; j <= 9; j++) sm[i] += wheel[(i + j + 72) % 72] * (1 - Math.abs(j) / 10);
      let p1 = 0;
      for (let i = 1; i < 72; i++) if (sm[i] > sm[p1]) p1 = i;
      const h1 = p1 * 5 + 2.5;
      const family = (h, rad) => { let W = 0, r = 0, g = 0, b = 0; for (const x of bins) if (x.w > 0 && arc(x.hue, h) <= rad) { W += x.w; r += x.c[0] * x.w; g += x.c[1] * x.w; b += x.c[2] * x.w; } return W ? [r / W, g / W, b / W] : null; };
      c1 = family(h1, 20) || family(h1, 45);
      let p2 = -1;
      for (let i = 0; i < 72; i++) if (arc(i * 5 + 2.5, h1) > 60 && (p2 < 0 || sm[i] > sm[p2])) p2 = i;
      if (p2 >= 0 && sm[p2] >= sm[p1] * 0.1) c2 = family(p2 * 5 + 2.5, 20);
      let fam = 0;
      for (const x of bins) if (x.w > 0 && arc(x.hue, h1) <= 45) fam += x.w;
      share = fam / colourful;
    }
    if (!c2) { // a one-colour poster: a deeper version of the same colour, turned a little round the wheel
      const l1 = toLab(c1), C1 = Math.hypot(l1[1], l1[2]), h = Math.atan2(l1[2], l1[1]) + 0.45;
      c2 = fromLab(Math.max(0.25, l1[0] * 0.72), C1 * Math.cos(h), C1 * Math.sin(h)).map((v) => gam(clamp(v, 0, 1)) * 255);
    }
    return { raw: [hex(c1), hex(c2)], share: +share.toFixed(3), chroma: +(colourful / total).toFixed(3), neutral };
  }
  function sample(img) {
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) return null;
    const k = 64 / Math.max(nw, nh), w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
    const cv = d.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    if (!cx) return null;
    cx.drawImage(img, 0, 0, w, h);
    try { return analyse(cx.getImageData(0, 0, w, h).data); } catch (e) { return null; } // a cross-origin poster: keep the default
  }
  const stemOf = (img) => { const u = String(img.currentSrc || img.src || '').split(/[?#]/)[0]; return u.slice(u.lastIndexOf('/') + 1).replace(/-\d+(?=\.\w+$)/, '').replace(/\.\w+$/, '') || null; };
  const store = () => { if (!saved) { try { saved = JSON.parse(W.localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; } } return saved; };
  const keep = (k, v) => { store()[k] = v; try { W.localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* private mode: memory only */ } };
  const loaded = (img) => new Promise((res, rej) => {
    const ok = () => { if (!img.naturalWidth) { rej(new Error('poster did not load')); return; } (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => res(img)); };
    if (img.complete && img.naturalWidth) { ok(); return; }
    img.addEventListener('load', ok, { once: true });
    img.addEventListener('error', () => rej(new Error('poster failed')), { once: true });
  });

  /* ---------------- the carousel ---------------- */
  roots.forEach(init);
  function init(root) {
    const band = root.closest('.gcar-band') || root.closest('section') || root;
    const glow = band.querySelector('[data-gcar-glow]');
    const stage = root.querySelector('.gcar__stage');
    const slides = Array.prototype.slice.call(root.querySelectorAll('[data-gcar-slide]'));
    const N = slides.length;
    if (!N || !stage) return;
    const links = slides.map((s) => s.querySelector('a[href]'));
    const imgs = slides.map((s) => s.querySelector('img'));
    // the controls sit in the carousel, or elsewhere in its band (home: under the words beside the stage)
    const find = (sel) => root.querySelector(sel) || band.querySelector(sel);
    const ctrl = find('[data-gcar-ctrl]'), prevB = find('[data-gcar-prev]'), nextB = find('[data-gcar-next]');
    const nowEl = find('[data-gcar-now]'), live = root.querySelector('[data-gcar-live]');
    const LOOP = N >= 3; // three or more cards go round; one or two simply stop at the ends
    const colours = new Array(N).fill(null);
    let pos = 0, target = 0, act = -1, said = 0, raf = 0, last = 0, geo = null, pd = null, wh = null, dragEnd = 0;
    const mod = (x) => ((x % N) + N) % N;
    const wrap = (x) => (LOOP ? mod(x + N / 2) - N / 2 : x); // offset from the centre, the short way round
    const rubber = (p) => { // past either end (no loop) the row gives a little and pulls back
      if (LOOP || (p >= 0 && p <= N - 1)) return p;
      const edge = p < 0 ? 0 : N - 1, over = Math.abs(p - edge);
      return edge + Math.sign(p - edge) * 0.32 * (1 - 1 / (1 + over * 1.4));
    };

    function layout() {
      const cs = W.getComputedStyle(root);
      const num = (n, f) => { const v = parseFloat(cs.getPropertyValue(n)); return isFinite(v) ? v : f; };
      const w = slides[0].offsetWidth || 300, persp = num('--gc-persp', 1200), z = num('--gc-z', 180), step = num('--gc-step', 0.96) * w;
      geo = { step, step2: num('--gc-step2', 0.52) * w, rot: num('--gc-rot', 28) * (num('--gc-turn', 1) < 0 ? -1 : 1), z, z2: num('--gc-z2', 80), sc: num('--gc-scale', 0.88), sc2: num('--gc-scale2', 0.05),
        px: (step * persp) / (persp + z) || 300 }; // the on-screen distance between neighbours: one card per this much drag
      if (glow) { // the glow centres on the cards, wherever the band's head leaves them
        const g = glow.getBoundingClientRect(), s = stage.getBoundingClientRect();
        if (g.height > 0 && s.height > 0) glow.style.setProperty('--gc-y', clamp(((s.top + s.height * 0.47 - g.top) / g.height) * 100, 30, 85).toFixed(2) + '%');
      }
    }
    function render() {
      const g = geo;
      for (let i = 0; i < N; i++) {
        const o = wrap(i - pos), a = Math.abs(o), s = o < 0 ? -1 : 1, a1 = Math.min(a, 1), a2 = Math.max(0, a - 1);
        const x = s * (a1 * g.step + a2 * g.step2), z = -(a1 * g.z + a2 * g.z2), ry = -s * a1 * g.rot;
        const sc = Math.max(0.5, 1 - a1 * (1 - g.sc) - a2 * g.sc2);
        let op = clamp((3.3 - a) / 0.9, 0, 1); // the far end fades
        if (LOOP) op = Math.min(op, clamp((N / 2 - a) / 0.45, 0, 1)); // and no card is ever seen crossing the loop's seam
        const st = slides[i].style;
        st.transform = 'translate3d(' + x.toFixed(2) + 'px,0,' + z.toFixed(2) + 'px) rotateY(' + ry.toFixed(3) + 'deg) scale(' + sc.toFixed(4) + ')';
        st.opacity = op < 1 ? op.toFixed(3) : '';
        st.visibility = op < 0.01 ? 'hidden' : '';
        st.zIndex = String(100 - Math.round(a * 10));
        st.setProperty('--gc-d', a1.toFixed(3));
      }
      const n = LOOP ? mod(Math.round(pos)) : clamp(Math.round(pos), 0, N - 1);
      if (n !== act) setActive(n);
    }
    function setActive(n) {
      act = n;
      const ae = d.activeElement;
      slides.forEach((s, i) => {
        const on = i === n;
        s.classList.toggle('is-active', on);
        if (on) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true'); // one slide at a time for assistive tech
        if (links[i]) links[i].tabIndex = on ? 0 : -1;
      });
      root.setAttribute('data-gcar-active', String(n));
      const p = ((n + 1) / N).toFixed(4); // the counter's bar reads it, inside or outside the carousel
      root.style.setProperty('--gc-p', p);
      if (ctrl) ctrl.style.setProperty('--gc-p', p);
      if (nowEl) nowEl.textContent = String(n + 1).padStart(2, '0');
      if (!LOOP) { if (prevB) prevB.disabled = n <= 0; if (nextB) nextB.disabled = n >= N - 1; }
      paint();
      if (ae && links.indexOf(ae) >= 0 && ae !== links[n] && links[n]) links[n].focus({ preventScroll: true }); // focus never stays on a hidden card
    }
    function paint() {
      const c = colours[act], g = c ? c.glow : DEFAULT;
      band.style.setProperty('--gc-1', g[0]);
      band.style.setProperty('--gc-2', g[1]);
      root.setAttribute('data-gcar-tint', c ? c.raw[0] : 'default');
    }
    function announce() {
      if (!live || act === said) return;
      said = act;
      const s = slides[act], t = s.querySelector('.flyer__t'), w = s.querySelector('.flyer__when');
      live.textContent = 'Event ' + (act + 1) + ' of ' + N + ': ' + (t ? t.textContent.trim() : '') + (w ? ', ' + w.textContent.trim() : '');
    }

    // one rAF loop, alive only while something moves: the hand (drag, wheel) or the settle toward `target`
    function kick() { if (!raf) { last = 0; raf = W.requestAnimationFrame(frame); } }
    function frame(now) {
      raf = 0;
      const dt = last ? Math.min(64, now - last) : 16.667;
      last = now;
      if ((pd && pd.drag) || wh) { render(); return; } // the next move asks for the next frame
      const diff = target - pos;
      if (Math.abs(diff) < 0.0005 || reduced()) { pos = target; settle(); return; }
      pos += diff * (1 - Math.pow(FRICTION, dt / 16.667));
      render();
      raf = W.requestAnimationFrame(frame);
    }
    function settle() {
      if (LOOP) pos = target = mod(target);
      render();
      root.classList.remove('is-moving');
      announce();
    }
    function go(t) {
      t = Math.round(t);
      target = LOOP ? t : clamp(t, 0, N - 1);
      if (raf) W.cancelAnimationFrame(raf);
      raf = 0;
      root.classList.add('is-moving');
      if (reduced()) { pos = target; settle(); return; } // reduced motion: an instant snap
      kick();
    }
    const step = (dir) => go(Math.round(target) + dir);
    const goTo = (i) => { const b = Math.round(target); go(LOOP ? b + wrap(i - mod(b)) : i); };

    // ---- pointer: drag or swipe sideways (touch-action: pan-y leaves vertical swipes to the page) ----
    root.addEventListener('pointerdown', () => { dragEnd = 0; });
    stage.addEventListener('pointerdown', (e) => {
      if (N < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
      pd = { id: e.pointerId, x: e.clientX, y: e.clientY, p0: pos, from: Math.round(target), drag: false, s: [] };
    });
    stage.addEventListener('pointermove', (e) => {
      if (!pd || e.pointerId !== pd.id) return;
      if (e.pointerType === 'mouse' && !(e.buttons & 1)) { pd = null; return; }
      const dx = e.clientX - pd.x, dy = e.clientY - pd.y;
      if (!pd.drag) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { pd = null; return; } // an up-down gesture is the page's
        if (Math.abs(dx) < 7) return;
        pd.drag = true; pd.x = e.clientX; pd.p0 = pos; pd.from = Math.round(pos);
        if (raf) { W.cancelAnimationFrame(raf); raf = 0; }
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* the pointer is gone */ }
        root.classList.add('is-drag', 'is-moving');
      }
      pos = rubber(pd.p0 - (e.clientX - pd.x) / geo.px);
      pd.s.push([e.timeStamp, pos]);
      if (pd.s.length > 10) pd.s.shift();
      kick();
    });
    function release(e) {
      if (!pd || e.pointerId !== pd.id) return;
      const p = pd;
      pd = null;
      root.classList.remove('is-drag');
      if (!p.drag) return;
      dragEnd = W.performance.now();
      const s = p.s, end = s[s.length - 1] || [e.timeStamp, pos];
      let beg = end;
      for (let k = s.length - 1; k >= 0 && end[0] - s[k][0] <= 100; k--) beg = s[k];
      const span = end[0] - beg[0];
      let v = span > 0 ? ((end[1] - beg[1]) / span) * 16.667 : 0; // cards per 60 fps frame over the last 100 ms
      if (e.type === 'pointercancel' || e.timeStamp - end[0] > 80 || reduced()) v = 0; // held still, cancelled, or no inertia wanted
      let t = Math.round(pos + (v * FRICTION) / (1 - FRICTION)); // where the glide would come to rest, to the nearest card
      if (t === p.from) { if (Math.abs(v) > 0.03) t += Math.sign(v); else if (Math.abs(pos - p.from) > 0.2) t += Math.sign(pos - p.from); } // a flick or a clear push turns at least one card
      go(clamp(t, p.from - 3, p.from + 3));
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('dragstart', (e) => e.preventDefault());
    stage.addEventListener('scroll', () => { stage.scrollLeft = 0; stage.scrollTop = 0; }); // overflow: hidden must never scroll (focus can try)
    root.addEventListener('click', (e) => {
      if (dragEnd && e.detail && stage.contains(e.target) && W.performance.now() - dragEnd < 600) { dragEnd = 0; e.preventDefault(); e.stopPropagation(); return; } // the end of a drag is not a click
      const s = e.target.closest ? e.target.closest('[data-gcar-slide]') : null;
      const i = s ? slides.indexOf(s) : -1;
      if (i < 0 || i === act || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // the centred card's link, and new-tab clicks, work as links
      e.preventDefault();
      goTo(i);
    }, true);

    // ---- wheel and trackpad: only a sideways intent moves the row; up-down always scrolls the page ----
    stage.addEventListener('wheel', (e) => {
      if (N < 2 || (pd && pd.drag)) return;
      const k = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? geo.px : 1;
      let dx = e.deltaX * k;
      const dy = e.deltaY * k;
      if (!dx && e.shiftKey) dx = dy; // shift + wheel: the mouse's sideways scroll
      else if (Math.abs(dx) <= Math.abs(dy)) return;
      if (!dx) return;
      e.preventDefault();
      if (!wh) { wh = { from: Math.round(target), raw: pos, t: 0 }; if (raf) { W.cancelAnimationFrame(raf); raf = 0; } }
      wh.raw += dx / geo.px;
      pos = rubber(wh.raw);
      root.classList.add('is-moving');
      W.clearTimeout(wh.t);
      wh.t = W.setTimeout(() => {
        const w = wh;
        wh = null;
        let t = Math.round(w.raw);
        if (t === w.from && Math.abs(w.raw - w.from) > 0.12) t += Math.sign(w.raw - w.from); // one notch or a short swipe still turns a card
        go(t);
      }, 160);
      kick();
    }, { passive: false });

    // ---- keys and buttons ----
    root.addEventListener('keydown', (e) => {
      if (N < 2 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || (e.target.closest && e.target.closest('.gcar__more'))) return; // not from the "All events" link beside the controls
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); goTo(e.key === 'Home' ? 0 : N - 1); }
    });
    if (prevB) prevB.addEventListener('click', () => step(-1));
    if (nextB) nextB.addEventListener('click', () => step(1));

    // ---- colours: measured once each poster has loaded (all of them, once the band is near), then cached ----
    function setColour(i, c) {
      colours[i] = { raw: c.raw, glow: [glowOf(c.raw[0], 0.64, 0.8), glowOf(c.raw[1], 0.54, 0.72)] };
      slides[i].setAttribute('data-gcar-colour', c.raw.join(' ') + ' share=' + c.share + ' chroma=' + c.chroma + (c.neutral ? ' neutral' : ''));
      if (i === act) paint();
    }
    function measureColours() {
      slides.map((_, i) => i).sort((a, b) => Math.abs(wrap(a - act)) - Math.abs(wrap(b - act))).forEach((i) => {
        const img = imgs[i];
        if (!img) return;
        const key = stemOf(img), hit = key && (memo.get(key) || store()[key]);
        if (hit && hit.raw) { setColour(i, hit); return; }
        if (img.loading === 'lazy') img.loading = 'eager'; // a poster clipped off the stage would never load lazily
        loaded(img).then(() => {
          const c = sample(img);
          if (!c) return;
          if (key) { memo.set(key, c); keep(key, c); }
          setColour(i, c);
        }).catch(() => { /* no poster: the default glow stays */ });
      });
    }

    // ---- start ----
    stage.scrollLeft = 0;
    if (N > 1) { root.tabIndex = 0; if (ctrl) ctrl.hidden = false; }
    root.classList.add('is-on');
    layout();
    render();
    if ('ResizeObserver' in W) new W.ResizeObserver(() => { layout(); render(); }).observe(band);
    else W.addEventListener('resize', () => { layout(); render(); });
    if ('IntersectionObserver' in W) {
      new W.IntersectionObserver((en) => { band.classList.toggle('is-live', en[en.length - 1].isIntersecting); }).observe(band);
      const io = new W.IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { io.disconnect(); measureColours(); } }, { rootMargin: '800px 0px' });
      io.observe(root);
    } else { band.classList.add('is-live'); measureColours(); }
    root.setAttribute('data-gcar-ready', '');
  }
})();
