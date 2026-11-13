/* cave.js: the store and town pages' "Shop <city> by category" band as a concave carousel, "the cave" (owner request
   2026-11-13: "for location page category, can we convert them into concave carousel? we've already done that in the
   past so you can just port that"; markup: src/pages/stores.mjs caveCrate(), styles: cave.css). Ported from the deals wall
   of an earlier redesign of ours.
   The crate's ten record sleeves hang on a wall that curves round the viewer. Card i hangs at the angle a = (i - pos) *
   step on a drum of radius R, seen from inside it at the perspective distance P: x = R sin a, z = R (1 - cos a), turned
   by -a, so the side cards come closer and turn in (their outer edges forward) and the centred card, facing front, sits
   furthest back; the ring is endless (modulo the card count). A drag keeps the wall under the pointer, a flick carries
   on a little and the wall settles with a card centred; a click (a tap) on a side card centres it and opens nothing, a
   click on the centred card follows its link, the end of a drag never clicks; the buttons, the arrow keys (Home / End
   too) and a sideways trackpad swipe turn it; an up-and-down wheel or swipe stays the page's (touch-action: pan-y).
   Changed in the port: the card width comes from cave.css (--cave-w), the script reads it; a card wholly off the stage
   is hidden (ten cards, not four: most of the ring is out of sight); only the centred slide is exposed to assistive tech
   (the others aria-hidden, their links out of the tab order, as on the home events carousel) and focus on a card's link
   follows the centre; the live region speaks once the wall comes to rest; with reduced motion the wall stays and every
   move is instant (no settle, no flick). One IIFE, no globals, no dependencies; it does nothing on a page without
   [data-cave], and without it the cards are a plain swipe row (cave.css). */
(() => {
  'use strict';
  const d = document, W = window;
  const roots = d.querySelectorAll('[data-cave]');
  if (!roots.length || !W.requestAnimationFrame) return;
  const RMQ = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => !!(RMQ && RMQ.matches);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => (W.performance && W.performance.now ? W.performance.now() : Date.now());
  // the drum per card width (the earlier build's): the eye stands P = 3.2 card widths from the wall, the drum's radius is
  // 1.08 P and the cards hang 4.4% of a card apart (10px at least), so a neighbour turns in about 17 degrees
  const PERSP = 3.2, DRUM = 1.08, GAP = 0.044;
  // each cave on its own: one that fails logs and leaves the next (and the feature modules bundled after this one) alone
  for (let i = 0; i < roots.length; i++) { try { init(roots[i]); } catch (e) { if (W.console) W.console.error('cave.js:', e); } }

  function init(cv) {
    const stage = cv.querySelector('.cave__stage'), wall = cv.querySelector('.cave__wall');
    const panels = Array.prototype.slice.call(cv.querySelectorAll('.cave__panel')), n = panels.length;
    if (!stage || !wall || n < 2) return;
    const links = panels.map((p) => p.querySelector('a[href]'));
    const names = panels.map((p) => { const e = p.querySelector('.cave__name'); return e ? e.textContent.trim() : ''; });
    const ctrl = cv.querySelector('[data-cave-ctrl]'), prevB = cv.querySelector('[data-cave-prev]'), nextB = cv.querySelector('[data-cave-next]');
    const num = cv.querySelector('[data-cave-n]'), live = cv.querySelector('[data-cave-live]');
    let pos = 0, target = null, pw = 0, gap = 0, P = 0, R = 0, step = 0, SW = 0, raf = 0, last = 0, shown = -1, said = 0, lastVW = -1, lastW = -1;
    // the hand: a press (dragging), a drag past 6px (held), and the click it may end in (eat)
    let dragging = false, held = false, eat = false, eatT = 0, pid = null, startX = 0, startPos = 0, lastX = 0, lastT = 0, vel = 0, moved = 0;
    // a card is gone before it wraps round (the earlier build's fade); with ten cards the ones round the back are off the stage anyway
    const END = n / 2 - 0.55, FADE = Math.max(0.2, Math.min(0.6, END - 1));
    const wrap = (k) => { const m = ((k % n) + n) % n; return m >= n / 2 ? m - n : m; }; // into [-n/2, n/2): the short way round

    function measure() {
      const vw = d.documentElement.clientWidth || W.innerWidth;
      if (vw !== lastVW) { lastVW = vw; cv.style.setProperty('--cave-vw', vw + 'px'); } // the stage runs the screen's full width (cave.css)
      lastW = cv.clientWidth;
      SW = stage.clientWidth || vw;
      pw = panels[0].offsetWidth || 300; // --cave-w (cave.css); the layout width, before any transform
      P = pw * PERSP; R = P * DRUM; gap = Math.max(10, Math.round(pw * GAP)); step = (pw + gap) / R;
      wall.style.perspective = Math.round(P) + 'px';
      paint();
    }
    function paint() {
      const half = SW / 2, e = pw / 2;
      for (let i = 0; i < n; i++) {
        const k = wrap(i - pos), a = k * step, sa = Math.sin(a), ca = Math.cos(a), x = R * sa, z = R * (1 - ca), st = panels[i].style;
        // its two side edges on the screen: a card wholly off the stage, or round past the eye, is not drawn at all
        const z1 = z - e * sa, z2 = z + e * sa;
        let on = Math.abs(k) < END && P - z1 > 1 && P - z2 > 1;
        if (on) { const x1 = ((x - e * ca) * P) / (P - z1), x2 = ((x + e * ca) * P) / (P - z2); on = Math.min(x1, x2) < half && Math.max(x1, x2) > -half; }
        const op = on ? clamp((END - Math.abs(k)) / FADE, 0, 1) : 0;
        st.transform = 'translate3d(' + x.toFixed(1) + 'px,0,' + z.toFixed(1) + 'px) rotateY(' + (-a).toFixed(4) + 'rad)';
        st.opacity = op < 1 ? op.toFixed(3) : '';
        st.visibility = op > 0 ? '' : 'hidden';
        st.zIndex = String(100 + Math.round(z / 4)); // the nearer card on top
        st.setProperty('--cave-d', Math.min(1, Math.abs(k)).toFixed(3)); // 0 centred, 1 a card or more away: the night veil (cave.css)
      }
      const c = ((Math.round(pos) % n) + n) % n;
      if (c !== shown) centre(c);
    }
    function centre(c) {
      const ae = d.activeElement, onLink = links.indexOf(ae) >= 0;
      shown = c;
      for (let j = 0; j < n; j++) {
        const p = panels[j], l = links[j];
        if (j === c) { p.setAttribute('aria-current', 'true'); p.removeAttribute('aria-hidden'); if (l) l.removeAttribute('tabindex'); }
        else { p.removeAttribute('aria-current'); p.setAttribute('aria-hidden', 'true'); if (l) l.setAttribute('tabindex', '-1'); } // one slide at a time for assistive tech
      }
      if (num) num.textContent = (c < 9 ? '0' : '') + (c + 1);
      cv.style.setProperty('--cave-p', ((c + 1) / n).toFixed(4));
      cv.setAttribute('data-cave-active', String(c));
      if (onLink && ae !== links[c] && links[c]) links[c].focus({ preventScroll: true }); // focus never stays on a card leaving the centre
    }
    function rested() {
      cv.classList.remove('is-moving');
      if (live && shown !== said) { said = shown; live.textContent = (shown + 1) + ' of ' + n + ': ' + names[shown]; }
    }

    // the settle: one rAF loop, alive only while the wall eases toward `target`
    function tick(t) {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;
      if (dragging || target === null) return;
      pos += (target - pos) * (1 - Math.exp(-dt * 9));
      if (Math.abs(target - pos) < 0.0006) { pos = target; target = null; }
      paint();
      if (target !== null) raf = W.requestAnimationFrame(tick); else rested();
    }
    function settle(t) {
      target = t;
      if (reduced()) { // reduced motion: an instant move
        if (raf) { W.cancelAnimationFrame(raf); raf = 0; }
        pos = t; target = null; paint(); rested();
        return;
      }
      cv.classList.add('is-moving');
      if (!raf) { last = now(); raf = W.requestAnimationFrame(tick); }
    }
    const base = () => (target !== null ? target : Math.round(pos));
    const go = (dir) => settle(base() + dir);
    const goTo = (i) => { const b = base(); settle(b + wrap(i - b)); };

    // ---- drag, flick, click. eat: the click a gesture ends in follows no link (after a drag, or on a side card); it
    //      lapses at the next press or soon after, so a keyboard Enter on the centred card is never eaten ----
    const eatNext = () => { eat = true; W.clearTimeout(eatT); eatT = W.setTimeout(() => { eat = false; }, 400); };
    stage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return; // a middle or right click keeps the link's own menu
      if (raf) { W.cancelAnimationFrame(raf); raf = 0; }
      dragging = true; held = false; eat = false; pid = e.pointerId; target = null; // a press stops the wall where it is
      startX = lastX = e.clientX; startPos = pos; lastT = now(); vel = 0; moved = 0;
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== pid) return;
      if (e.pointerType === 'mouse' && !(e.buttons & 1)) { release(e); return; } // let go outside the window
      const dx = e.clientX - startX, t = now(), dt = Math.max(8, t - lastT);
      moved = Math.max(moved, Math.abs(dx));
      if (!held) {
        if (moved < 6) return;
        held = true; cv.classList.add('is-dragging', 'is-moving');
        try { stage.setPointerCapture(pid); } catch (err) { /* capture is a nicety */ }
      }
      pos = startPos - dx / (pw + gap);
      vel = 0.75 * vel + (0.25 * (-(e.clientX - lastX) / (pw + gap))) / (dt / 1000); // cards a second, smoothed
      lastX = e.clientX; lastT = t;
      paint();
    });
    function release(e) {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false; cv.classList.remove('is-dragging');
      try { if (stage.hasPointerCapture && stage.hasPointerCapture(pid)) stage.releasePointerCapture(pid); } catch (err) { /* already gone */ }
      if (!held) {
        if (e.type !== 'pointerup') { settle(Math.round(pos)); return; } // cancelled (the page took a vertical swipe)
        // a click or a tap: turn to the card under it. A side card opens nothing (a modified click is a link: new tab)
        const hit = d.elementFromPoint(e.clientX, e.clientY), p = hit && hit.closest ? hit.closest('.cave__panel') : null;
        const k = p ? panels.indexOf(p) : -1, c = Math.round(pos);
        if (k >= 0 && k !== shown && (e.metaKey || e.ctrlKey || e.shiftKey)) { settle(c); return; }
        if (k >= 0 && k !== shown) eatNext();
        settle(k >= 0 ? c + Math.round(wrap(k - c)) : c);
        return;
      }
      eatNext();
      if (e.type === 'pointercancel' || now() - lastT > 120 || reduced()) vel = 0; // held still before letting go, or no inertia wanted: no flick
      settle(Math.round(pos + clamp(vel * 0.35, -3, 3)));
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('click', (e) => { if (eat) { e.preventDefault(); e.stopPropagation(); eat = false; } }, true);
    stage.addEventListener('dragstart', (e) => e.preventDefault()); // no ghost image of a sleeve or its link
    stage.addEventListener('scroll', () => { stage.scrollLeft = 0; stage.scrollTop = 0; }); // overflow: hidden never scrolls (focus can try)

    // ---- a sideways swipe on a trackpad (or shift + wheel) turns it; an up-and-down wheel stays the page's ----
    let wheelT = 0;
    stage.addEventListener('wheel', (e) => {
      if (dragging) return;
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? pw + gap : 1;
      let dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      if (!dx && e.shiftKey) dx = dy;
      else if (Math.abs(dx) <= Math.abs(dy)) return;
      if (!dx) return;
      e.preventDefault();
      if (raf) { W.cancelAnimationFrame(raf); raf = 0; }
      target = null; cv.classList.add('is-moving');
      pos += dx / (pw + gap); paint();
      W.clearTimeout(wheelT); wheelT = W.setTimeout(() => settle(Math.round(pos)), 140);
    }, { passive: false });

    // ---- keys (the wall, its centred card or its buttons focused) and buttons ----
    cv.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); go(e.key === 'ArrowRight' ? 1 : -1); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); goTo(e.key === 'Home' ? 0 : n - 1); }
    });
    if (prevB) prevB.addEventListener('click', () => go(-1));
    if (nextB) nextB.addEventListener('click', () => go(1));

    // ---- start ----
    cv.classList.add('cave-on');
    stage.setAttribute('tabindex', '0'); stage.setAttribute('role', 'group');
    stage.setAttribute('aria-label', 'Categories: turn the wall with the left and right arrow keys or the buttons below it');
    if (ctrl) ctrl.hidden = false;
    measure();
    if ('ResizeObserver' in W) {
      const ro = new W.ResizeObserver(() => { if (d.documentElement.clientWidth !== lastVW || cv.clientWidth !== lastW) measure(); });
      ro.observe(cv); ro.observe(d.documentElement); // the screen's width (a scroll bar coming or going) and the band's
    } else W.addEventListener('resize', measure, { passive: true });
    // every card's art loads once the band is near: a card round the wall is clipped by the stage, so the browser's own
    // lazy loading would only fetch it as it turns into view
    const imgs = Array.prototype.slice.call(cv.querySelectorAll('img'));
    const eager = () => imgs.forEach((im) => { if (im.loading === 'lazy') im.loading = 'eager'; });
    if ('IntersectionObserver' in W) {
      const io = new W.IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { io.disconnect(); eager(); } }, { rootMargin: '700px 0px' });
      io.observe(cv);
    } else eager();
    cv.setAttribute('data-cave-ready', '');
  }
})();
