/* sticker.js: elastic die-cut stickers (original implementation, no third-party code).
   Hover curls the corner nearest the pointer. Press lifts the sticker toward you (it grows, its shadow spreads and
   softens); drag moves it inside its section with a rubbery pull at the edges, leaning and swinging behind fast moves;
   release sets it down with an elastic wobble. Arrow keys move it, Escape sends it home, Enter/Space makes it hop.
   An idle hero sticker lifts a corner now and then. Page-hero stickers ([data-sticker-after]) are pinned just after
   the heading's last letter, lightly overlapping it, once the heading has finished stretching in.
   Everything degrades: without this script the sticker is the static CSS one. */
(() => {
  'use strict';
  const d = document, W = window, root = d.documentElement;
  const stickers = Array.from(d.querySelectorAll('[data-sticker]'));
  const pinned = Array.from(d.querySelectorAll('[data-sticker-after]'));
  if (!stickers.length && !pinned.length) return;
  const RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = W.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- pin page-hero stickers after the heading's last letter ----------
  const lastText = (el) => { const tw = d.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, last = null; while ((n = tw.nextNode())) if (n.textContent.trim()) last = n; return last; };
  // the lowest bottom of the heading's text boxes under the span a..b, from the line whose top is y0 down (so a graffiti
  // tag on its own line under that span counts too)
  const lowest = (h, y0, a, b, y) => {
    const tw = d.createTreeWalker(h, NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) {
      if (!n.textContent.trim()) continue;
      const r = d.createRange(); r.selectNodeContents(n);
      for (const x of r.getClientRects()) if (x.bottom > y0 && x.right > a && x.left < b) y = Math.max(y, x.bottom);
    }
    return y;
  };
  function place(wrap) {
    const host = wrap.offsetParent || wrap.parentElement;
    const h = host && host.querySelector(wrap.getAttribute('data-sticker-after'));
    const words = h ? h.querySelectorAll('.dh__a, .dh__b') : [];
    const tn = h && lastText(words.length ? words[words.length - 1] : h); // the heading's words, never its graffiti tag
    if (!tn) { wrap.classList.add('is-placed'); return; }
    // measure from the unhung state: the sticker at its own size, the heading at its own margin
    wrap.classList.remove('is-hung', 'is-fit'); h.classList.remove('is-hung');
    const s = tn.textContent; let i = s.length - 1; while (i > 0 && /\s/.test(s[i])) i--;
    const r = d.createRange(); r.setStart(tn, i); r.setEnd(tn, i + 1);
    const L = r.getBoundingClientRect(), H = host.getBoundingClientRect();
    const st = wrap.firstElementChild; let w = st.offsetWidth, hh = st.offsetHeight;
    const room = root.clientWidth - 12 - H.left - w; // the furthest left it can start and still fit on screen
    let left = L.right - H.left - L.width * 0.24;      // lightly overlapping the last letter
    let top = L.top - H.top + L.height * 0.46 - hh * 0.5;
    if (left > room) {
      // no room after it (phones): it hangs just under the line's end. Its tilted box (--rot) is right-aligned to the
      // last letter, kept inside the text column where it fits and never within 12px of the screen's edges (13 here: the
      // box sizes come in whole pixels); a sticker wider than the screen less 26px is set smaller (.is-fit). Its top edge
      // overlaps the line's text box by 6% of the line height, below the letters' baseline, so it never covers the letters.
      const vw = root.clientWidth, cs = getComputedStyle(st);
      const a = Math.abs(parseFloat(cs.getPropertyValue('--rot')) || 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
      let bw = w * cos + hh * sin;
      if (bw > vw - 26) {
        wrap.style.setProperty('--ph-fs', (parseFloat(cs.fontSize) * (vw - 26) / bw * 0.99).toFixed(2) + 'px'); wrap.classList.add('is-fit');
        w = st.offsetWidth; hh = st.offsetHeight; bw = w * cos + hh * sin;
      }
      const bh = w * sin + hh * cos, lh = Math.min(parseFloat(getComputedStyle(h).lineHeight) || L.height, L.height);
      const bx = Math.max(13, Math.min(vw - 13 - bw, Math.max(L.right - bw, H.left)));
      const by = lowest(h, L.top, bx, bx + bw, L.bottom) - lh * 0.06;
      left = bx + (bw - w) / 2 - H.left - st.offsetLeft; top = by + (bh - hh) / 2 - H.top - st.offsetTop; // the tilted box is centred on the sticker's own box
      // and the heading keeps its room below (--ph-hang, never less than its own margin): the lede, the status line and
      // the buttons start 18px under the sticker's box
      const mb = parseFloat(getComputedStyle(h).marginBottom) || 0;
      h.style.setProperty('--ph-hang', Math.ceil(Math.max(mb, by + bh + 18 - h.getBoundingClientRect().bottom)) + 'px');
      h.classList.add('is-hung'); wrap.classList.add('is-hung');
    } else h.style.removeProperty('--ph-hang');
    wrap.style.left = Math.round(left) + 'px'; wrap.style.top = Math.round(top) + 'px';
  }
  pinned.forEach((wrap) => {
    const host = wrap.offsetParent || wrap.parentElement;
    const h = host && host.querySelector(wrap.getAttribute('data-sticker-after'));
    let shown = false;
    const show = () => { if (shown) return; shown = true; place(wrap); wrap.classList.add('is-placed'); if (!RM) wrap.classList.add('is-slapped'); };
    // the heading stretches in (font-stretch and a wipe, ~1.3 s); the sticker slaps on when it has settled
    const ready = () => !h || !root.classList.contains('js') || !h.hasAttribute('data-reveal') || h.classList.contains('is-in');
    const wait = () => {
      if (!ready()) { W.setTimeout(wait, 120); return; }
      if (RM) { show(); return; }
      // the letters only stop moving when the width stretch (and the second line's wipe) has finished
      const done = (e) => { if (e.propertyName !== 'font-stretch' && e.propertyName !== 'clip-path') return; if (shown) place(wrap); else show(); };
      h && h.addEventListener('transitionend', done);
      W.setTimeout(show, 1500); // fallback if no transition fires
    };
    (d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve()).then(wait);
    let q = 0; const again = () => { if (!shown) return; cancelAnimationFrame(q); q = requestAnimationFrame(() => place(wrap)); };
    W.addEventListener('resize', again, { passive: true }); W.addEventListener('orientationchange', again);
    if ('ResizeObserver' in W && h) new ResizeObserver(again).observe(h);
  });

  // ---------- the elastic sticker ----------
  const spring = (o, k, c, dt) => { o.v += (o.t - o.x) * k * dt; o.v *= Math.exp(-c * dt); o.x += o.v * dt; };
  const val = (x = 0) => ({ x, v: 0, t: x });
  const settled = (o) => Math.abs(o.t - o.x) < 0.02 && Math.abs(o.v) < 0.02;

  stickers.forEach((el) => {
    const S = { x: val(), y: val(), lift: val(), lean: val(), tx: val(), ty: val(), peel: val(), drag: null, raf: 0, last: 0, hover: false, seen: false };
    const box = () => (el.closest('[data-sticker-bounds], .ph, .gate__card, section') || d.body).getBoundingClientRect();
    const peelMax = () => clamp(Math.min(el.offsetWidth, el.offsetHeight) * 0.46, 12, 30);
    el.classList.add('is-live');
    el.setAttribute('data-corner', 'tr');
    if (!el.closest('.gate')) { // not inside the 21+ dialog, whose focus trap must stay closed
      el.tabIndex = 0;
      el.setAttribute('aria-roledescription', 'sticker');
      el.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Escape');
    }

    // how far the drag offset may go so the sticker stays inside its section (with a rubbery pull beyond)
    const limits = () => {
      const b = box(), r = el.getBoundingClientRect(), ox = S.x.x, oy = S.y.x;
      return { x0: b.left - (r.left - ox) + 4, x1: b.right - (r.right - ox) - 4, y0: b.top - (r.top - oy) + 4, y1: b.bottom - (r.bottom - oy) - 4 };
    };
    const rubber = (v, a, b) => (v < a ? a - (a - v) * 0.35 : v > b ? b + (v - b) * 0.35 : v);

    const render = () => {
      const s = el.style;
      s.setProperty('--sx', S.x.x.toFixed(2) + 'px'); s.setProperty('--sy', S.y.x.toFixed(2) + 'px');
      s.setProperty('--lift', clamp(S.lift.x, -0.2, 1.3).toFixed(3));
      s.setProperty('--lean', S.lean.x.toFixed(2) + 'deg'); s.setProperty('--tx', S.tx.x.toFixed(2) + 'deg'); s.setProperty('--ty', S.ty.x.toFixed(2) + 'deg');
      s.setProperty('--peel', Math.max(0, S.peel.x).toFixed(2) + 'px');
      s.setProperty('--shx', (62 + S.ty.x * 2.2 + S.lean.x * 1.1).toFixed(1) + '%');
    };
    const tick = (now) => {
      const dt = Math.min(0.034, (now - (S.last || now)) / 1000 || 0.016); S.last = now;
      const wob = RM ? 30 : 7.5; // elasticity: low damping keeps it wobbling after a stop
      if (!S.drag) { spring(S.x, 140, 17, dt); spring(S.y, 140, 17, dt); }
      spring(S.lift, 180, RM ? 30 : 14, dt);
      spring(S.lean, 230, wob, dt); spring(S.tx, 240, wob + 1.5, dt); spring(S.ty, 240, wob + 1.5, dt);
      spring(S.peel, 320, 24, dt);
      render();
      if (S.drag || ![S.x, S.y, S.lift, S.lean, S.tx, S.ty, S.peel].every(settled)) S.raf = requestAnimationFrame(tick);
      else { S.raf = 0; S.last = 0; }
    };
    const kick = () => { if (!S.raf) S.raf = requestAnimationFrame(tick); };

    // hover: the corner nearest the pointer curls up
    const corner = (cx, cy) => { const r = el.getBoundingClientRect(); return (cy < r.top + r.height / 2 ? 't' : 'b') + (cx < r.left + r.width / 2 ? 'l' : 'r'); };
    el.addEventListener('pointermove', (e) => {
      if (S.drag) return;
      if (e.pointerType !== 'mouse' && !FINE) return;
      S.hover = true;
      const c = corner(e.clientX, e.clientY);
      if (c !== el.getAttribute('data-corner')) { el.setAttribute('data-corner', c); S.peel.x = Math.min(S.peel.x, 4); }
      S.peel.t = peelMax(); kick();
    });
    el.addEventListener('pointerleave', () => { S.hover = false; if (!S.drag) { S.peel.t = 0; kick(); } });

    // press, drag, release
    let moved = 0;
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      S.drag = { id: e.pointerId, px: e.clientX, py: e.clientY, ox: S.x.x, oy: S.y.x, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0, lim: limits() };
      moved = 0; S.lift.t = 1; S.peel.t = 0; el.classList.add('is-held'); kick();
    });
    el.addEventListener('pointermove', (e) => {
      const g = S.drag; if (!g || e.pointerId !== g.id) return;
      const now = performance.now(), dt = Math.max(8, now - g.lt) / 1000;
      g.vx = g.vx * 0.6 + ((e.clientX - g.lx) / dt) * 0.4; g.vy = g.vy * 0.6 + ((e.clientY - g.ly) / dt) * 0.4;
      g.lx = e.clientX; g.ly = e.clientY; g.lt = now;
      moved = Math.max(moved, Math.hypot(e.clientX - g.px, e.clientY - g.py));
      const nx = rubber(g.ox + e.clientX - g.px, g.lim.x0, g.lim.x1), ny = rubber(g.oy + e.clientY - g.py, g.lim.y0, g.lim.y1);
      S.x.x = S.x.t = nx; S.y.x = S.y.t = ny; S.x.v = S.y.v = 0;
      S.lean.t = clamp(g.vx * 0.016, -22, 22); S.ty.t = clamp(g.vx * 0.026, -18, 18); S.tx.t = clamp(-g.vy * 0.026, -16, 16);
      kick();
    });
    const release = (e) => {
      const g = S.drag; if (!g || (e && e.pointerId !== g.id)) return;
      S.drag = null; el.classList.remove('is-held');
      S.x.t = clamp(S.x.x, g.lim.x0, g.lim.x1); S.y.t = clamp(S.y.x, g.lim.y0, g.lim.y1); // stays where it lands, inside its section
      S.lift.t = 0; S.lean.t = 0; S.tx.t = 0; S.ty.t = 0;
      if (!RM) { S.lean.v += clamp(g.vx * 0.04, -260, 260); S.lift.v -= 1.6; } // the slap down: a wobble and a little squash
      S.peel.t = S.hover ? peelMax() : 0; kick();
    };
    el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release); el.addEventListener('lostpointercapture', release);
    el.addEventListener('click', (e) => { if (moved > 4) { e.preventDefault(); e.stopPropagation(); } moved = 0; }, true); // a drag never clicks through

    // keyboard: arrows move it, Escape returns it home, Enter/Space makes it hop
    el.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 40 : 12, k = e.key; let used = true;
      const lim = limits();
      if (k === 'ArrowLeft') S.x.t = clamp(S.x.t - step, lim.x0, lim.x1);
      else if (k === 'ArrowRight') S.x.t = clamp(S.x.t + step, lim.x0, lim.x1);
      else if (k === 'ArrowUp') S.y.t = clamp(S.y.t - step, lim.y0, lim.y1);
      else if (k === 'ArrowDown') S.y.t = clamp(S.y.t + step, lim.y0, lim.y1);
      else if (k === 'Escape' || k === 'Home') { S.x.t = 0; S.y.t = 0; }
      else if (k === 'Enter' || k === ' ') { S.lift.v += 7; S.lean.v += RM ? 0 : 90; }
      else used = false;
      if (used) { e.preventDefault(); if (k.startsWith('Arrow')) { S.lean.v += (k === 'ArrowLeft' ? -60 : k === 'ArrowRight' ? 60 : 0); } kick(); }
    });

    // idle hint (hero stickers only): now and then a corner lifts, so visitors see it can be peeled
    if (el.hasAttribute('data-sticker-hint') && !RM) {
      if ('IntersectionObserver' in W) new IntersectionObserver((es) => { S.seen = es.some((x) => x.isIntersecting); }).observe(el); else S.seen = true;
      const hint = () => {
        const pin = el.closest('.ph__sticker');
        if (S.seen && !S.hover && !S.drag && !d.hidden && (!pin || pin.classList.contains('is-placed'))) {
          el.setAttribute('data-corner', ['tr', 'br', 'tl'][Math.floor(Math.random() * 3)]);
          S.peel.t = peelMax() * 0.85; S.lift.t = 0.18; kick();
          W.setTimeout(() => { if (!S.hover && !S.drag) { S.peel.t = 0; S.lift.t = 0; kick(); } }, 700);
        }
        W.setTimeout(hint, 7000 + Math.random() * 4500);
      };
      W.setTimeout(hint, 3800);
    }
    render();
  });
})();
