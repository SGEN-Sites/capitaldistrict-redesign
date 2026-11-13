/* su.js: the "Sign Up & Save" lab options (/lab/signup/, markup in src/pages/lab-signup.mjs, styles in su.css).
   [data-su="pass"]  B, The Pass: the card leans toward the pointer and fills in as you type; a valid email sweeps the
                     foil, Sign Up swipes the card, an empty or bad email shakes it.
   [data-su="wall"]  C, Paste-up: the heading is sprayed onto the wall once it scrolls in (a can rides each line, drips
                     run from the letters), the poster is pasted up; the field you are in gets a spray swash, a filled
                     field a sprayed tick, Sign Up a burst of mist.
   [data-su="deck"]  D, Needle Drop: focus a field and the tonearm swings over and drops on that field's track (A1 email,
                     A2 phone, A3 the button) and the record spins up; leave the form and it lifts and spins down;
                     Sign Up scratches the record; a fine pointer can scratch it by hand.
   Every form stays a plain form (labels, autocomplete, the browser's own validation, keyboard); this file only listens
   to it and never moves focus or changes what is typed. site.js's [data-demo-form] keeps it from sending. Pointer
   effects run on fine pointers only; under reduced motion each effect shows its end state at once. Nothing here may
   throw: an option that fails to start stays a plain, complete form. No globals, no dependencies, original work. */
(() => {
  'use strict';
  const d = document, W = window;
  const roots = Array.prototype.slice.call(d.querySelectorAll('[data-su]'));
  if (!roots.length) return;
  const mm = (q) => { try { return W.matchMedia(q).matches; } catch (e) { return false; } };
  const RM = mm('(prefers-reduced-motion: reduce)');
  const FINE = mm('(hover: hover) and (pointer: fine)');
  const raf = (f) => (W.requestAnimationFrame ? W.requestAnimationFrame(f) : W.setTimeout(() => f(now()), 16));
  const now = () => (W.performance && W.performance.now ? W.performance.now() : Date.now());
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const digits = (s) => (String(s || '').match(/\d/g) || []).length;
  // the browser's own check decides the submit; the ticks also want a dotted domain ("sam@example" passes the browser)
  const emailOk = (i) => !!(i && i.value.trim() && i.checkValidity() && /@[^@\s]+\.[^@\s.]{2,}$/.test(i.value.trim()));
  const phoneOk = (i) => !!(i && digits(i.value) >= 10);
  const okFor = (i) => (i && i.name === 'email' ? emailOk(i) : phoneOk(i));
  // restart a one-shot animation class (never under reduced motion: the moment is shown by the state classes alone)
  function once(el, cls, ms) {
    if (!el || RM) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    W.clearTimeout(el['su_' + cls]); el['su_' + cls] = W.setTimeout(() => el.classList.remove(cls), ms);
  }
  // which control of the form has focus: 'email' | 'phone' | 'btn' | ''
  const which = (el) => (!el ? '' : el.name === 'email' ? 'email' : el.name === 'phone' ? 'phone' : el.type === 'submit' ? 'btn' : '');
  function watchFocus(form, cb) {
    form.addEventListener('focusin', (e) => cb(which(e.target)));
    form.addEventListener('focusout', () => W.setTimeout(() => { if (!form.contains(d.activeElement)) cb(''); }, 0));
  }
  function whenSeen(el, fn, threshold) {
    if (!('IntersectionObserver' in W)) { fn(); return; }
    const io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { io.disconnect(); fn(); } }, { threshold: threshold || 0.3 });
    io.observe(el);
  }

  const kinds = { pass, wall, deck };
  roots.forEach((r) => { const k = kinds[r.getAttribute('data-su')]; if (k) { try { k(r); } catch (e) { /* stays a plain form */ } } });

  /* ---------------- B: The Pass ---------------- */
  function pass(r) {
    const form = r.querySelector('form'), stage = r.querySelector('[data-su-stage]'), card = r.querySelector('[data-su-card]');
    if (!form || !stage || !card) return;
    const rows = ['email', 'phone'].map((n) => ({ n, inp: form.querySelector('input[name="' + n + '"]'), row: card.querySelector('[data-row="' + n + '"]'), val: card.querySelector('[data-su-val="' + n + '"]') })).filter((x) => x.inp && x.row && x.val);
    let wasOk = false, typing = 0;
    function paint() {
      rows.forEach((x) => {
        const v = x.inp.value.trim();
        x.val.textContent = v || x.val.getAttribute('data-ph') || '';
        x.val.style.setProperty('--len', String(Math.max(1, v.length)));
        x.row.classList.toggle('is-filled', !!v);
        x.row.classList.toggle('is-ok', okFor(x.inp));
      });
    }
    form.addEventListener('input', () => {
      paint();
      const ok = rows.length ? emailOk(rows[0].inp) : false;
      if (ok && !wasOk) once(card, 'is-sweep', 1300);
      wasOk = ok;
      r.classList.add('is-typing'); W.clearTimeout(typing); typing = W.setTimeout(() => r.classList.remove('is-typing'), 700);
    });
    watchFocus(form, (f) => { if (f) r.setAttribute('data-focus', f); else r.removeAttribute('data-focus'); });
    form.addEventListener('invalid', () => once(stage, 'is-shake', 650), true);
    form.addEventListener('submit', () => once(stage, 'is-swipe', 1150));
    paint(); // autofill or a return visit may have filled the fields already
    W.addEventListener('pageshow', paint);
    // the card's idle float and foil drift rest while the band is off screen
    if ('IntersectionObserver' in W) new IntersectionObserver((en) => r.classList.toggle('is-away', !en[0].isIntersecting)).observe(r);
    // the lean: the card turns toward the pointer anywhere over the band (fine pointers only)
    if (!FINE || RM) return;
    const area = r.closest('section') || r;
    let px = 0, py = 0, queued = false;
    const apply = () => { queued = false; stage.style.setProperty('--px', px.toFixed(3)); stage.style.setProperty('--py', py.toFixed(3)); };
    area.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const b = stage.getBoundingClientRect(); if (!b.width) return;
      px = clamp((e.clientX - (b.left + b.width / 2)) / (b.width * 0.62), -1, 1);
      py = clamp((e.clientY - (b.top + b.height / 2)) / (b.height * 0.75), -1, 1);
      if (!queued) { queued = true; raf(apply); }
    });
    area.addEventListener('pointerleave', () => { px = 0; py = 0; if (!queued) { queued = true; raf(apply); } });
  }

  /* ---------------- C: Paste-up ---------------- */
  function wall(r) {
    const tag = r.querySelector('.su-c__tag'), form = r.querySelector('form');
    const lines = Array.prototype.slice.call(r.querySelectorAll('.su-c__line'));
    if (!tag || !lines.length) return;
    // drips hang from chosen letters: [character index, where across the glyph (0..1), length in em]
    const PICK = [[[1, 0.5, 0.62], [3, 0.17, 0.92], [6, 0.2, 0.46]], [[2, 0.2, 0.4], [3, 0.86, 0.78], [5, 0.16, 0.56]]];
    const START = [0.15, 1.3], RUN = [1.05, 0.95]; // seconds: when each line is sprayed, and for how long (as su.css)
    function hang(animated) {
      lines.forEach((ln, li) => {
        Array.prototype.forEach.call(ln.querySelectorAll('.su-c__drip'), (x) => x.remove());
        const ink = ln.querySelector('.su-c__ink'), tn = ink && ink.firstChild;
        if (!tn || tn.nodeType !== 3) return;
        const lb = ln.getBoundingClientRect(), fs = parseFloat(W.getComputedStyle(ink).fontSize) || 16;
        const probe = d.createElement('span'); // a zero-size inline box sits on the baseline
        probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
        ink.appendChild(probe); const base = probe.getBoundingClientRect().top - lb.top; probe.remove();
        (PICK[li] || []).forEach((p, k) => {
          if (p[0] >= tn.length) return;
          const rg = d.createRange(); rg.setStart(tn, p[0]); rg.setEnd(tn, p[0] + 1);
          const g = rg.getBoundingClientRect(); if (!g.width) return;
          const dr = d.createElement('i'); dr.className = 'su-c__drip'; dr.setAttribute('aria-hidden', 'true');
          dr.style.left = (g.left - lb.left + g.width * p[1]).toFixed(1) + 'px';
          dr.style.top = (base - fs * 0.06).toFixed(1) + 'px';
          dr.style.setProperty('--h', p[2] + 'em');
          if (animated) { // each drip starts once the edge has passed its letter, and runs slower the longer it is
            const at = START[li] + RUN[li] * clamp((g.left - lb.left) / Math.max(1, lb.width), 0, 1) + 0.25 + k * 0.08;
            dr.style.setProperty('--d', at.toFixed(2) + 's');
            dr.style.setProperty('--t', (1.4 + p[2] * 1.6).toFixed(2) + 's');
          }
          ln.appendChild(dr);
        });
      });
    }
    const ready = (fn) => { if (d.fonts && d.fonts.ready) d.fonts.ready.then(fn, fn); else fn(); };
    if (RM || !('IntersectionObserver' in W)) ready(() => { hang(false); r.classList.add('is-sprayed'); });
    else {
      r.classList.add('su-armed');
      whenSeen(tag, () => ready(() => {
        hang(true); r.classList.add('is-spraying');
        W.setTimeout(() => r.classList.remove('su-armed'), 2400); // letters painted: the mask comes off
        W.setTimeout(() => { r.classList.remove('is-spraying'); r.classList.add('is-sprayed'); }, 5600); // drips dry
      }), 0.45);
    }
    let rz = 0;
    W.addEventListener('resize', () => { W.clearTimeout(rz); rz = W.setTimeout(() => { if (r.classList.contains('is-sprayed')) hang(false); }, 180); });
    if (!form) return;
    const fields = Array.prototype.slice.call(form.querySelectorAll('.su-c__field'));
    const mark = () => fields.forEach((f) => { const i = f.querySelector('input'); f.classList.toggle('is-ok', okFor(i)); });
    form.addEventListener('input', mark);
    watchFocus(form, (w) => fields.forEach((f) => { const i = f.querySelector('input'); f.classList.toggle('is-focus', !!w && !!i && i.name === w); }));
    form.addEventListener('invalid', (e) => { const f = e.target.closest && e.target.closest('.su-c__field'); if (f) once(f, 'is-miss', 650); }, true);
    form.addEventListener('submit', () => once(form.querySelector('.su-c__go'), 'is-burst', 1000));
    mark(); W.addEventListener('pageshow', mark);
  }

  /* ---------------- D: Needle Drop ---------------- */
  function deck(r) {
    const disc = r.querySelector('.su-d__disc'), rec = r.querySelector('.su-d__rec'), arm = r.querySelector('.su-d__arm');
    const out = r.querySelector('[data-su-now]'), form = r.querySelector('form');
    if (!disc || !rec || !arm || !form) return;
    // the tonearm, in record diameters from the record's top-left corner: pivot P, the record's centre C, arm length L.
    // at(rad) is the CSS rotation (0 = hanging straight down) that sets the stylus on the groove at radius rad.
    const P = [1, -0.1], C = [0.5, 0.5], L = 0.62;
    const dPC = Math.hypot(C[0] - P[0], C[1] - P[1]), toC = Math.atan2(C[1] - P[1], C[0] - P[0]);
    const at = (rad) => (toC - Math.acos((dPC * dPC + L * L - rad * rad) / (2 * dPC * L))) * 180 / Math.PI - 90;
    const REST = -10, RPM = 200; // degrees: parked on the rest; degrees a second: 33 1/3 turns a minute
    const TRACKS = { email: ['A1', 0.45], phone: ['A2', 0.38], btn: ['A3', 0.315] };
    const rows = Array.prototype.slice.call(form.querySelectorAll('[data-trk]'));
    const name = (w) => { const row = form.querySelector('[data-trk="' + w + '"]'); const t = row && row.querySelector(w === 'btn' ? 'button span' : 'label span'); return t ? t.textContent.trim() : ''; };
    let cur = '', down = false, timer = 0;
    // ---- the platter: eased spin, a scripted scratch, a hand scratch; the loop runs only while something moves ----
    let ang = Math.random() * 360, vel = 0, goal = 0, last = 0, looping = false, seen = true, scr = null, hand = null;
    function tick(t) {
      const dt = clamp((t - last) / 1000, 0, 0.05); last = t;
      if (scr) {
        const k = (t - scr.t0) / scr.dur;
        if (k >= 1) { ang = scr.a0 + RPM * scr.dur / 1000; vel = RPM; scr = null; }
        else ang = scr.a0 + RPM * (t - scr.t0) / 1000 - 58 * Math.sin(k * Math.PI * 4) * (1 - k) * Math.sin(k * Math.PI);
      } else if (!hand) { vel += (goal - vel) * Math.min(1, dt * 2.6); ang += vel * dt; }
      disc.style.rotate = (ang % 360).toFixed(2) + 'deg';
      if (seen && (scr || hand || goal || Math.abs(vel) > 0.4)) raf(tick); else looping = false;
    }
    const spin = () => { if (RM || looping) return; looping = true; last = now(); raf(tick); };
    if ('IntersectionObserver' in W) new IntersectionObserver((en) => { seen = en[0].isIntersecting; if (seen) spin(); }).observe(rec);
    // ---- the arm: swing over lifted, then drop; lift, then swing home ----
    const setArm = (deg) => arm.style.setProperty('--arm', deg.toFixed(2) + 'deg');
    function cue(w) {
      rows.forEach((row) => row.classList.toggle('is-on', !!w && row.getAttribute('data-trk') === w));
      if (out) out.textContent = w ? TRACKS[w][0] + ' · ' + name(w) : (out.getAttribute('data-idle') || '');
      if (w === cur) return; // the same cue again (focus leaving the form after the link): let the move in flight finish
      W.clearTimeout(timer);
      cur = w;
      if (w) {
        r.classList.remove('is-down'); down = false; setArm(at(TRACKS[w][1]));
        timer = W.setTimeout(() => { r.classList.add('is-down', 'is-playing'); down = true; goal = RPM; spin(); }, RM ? 0 : 640);
      } else {
        r.classList.remove('is-down'); down = false;
        timer = W.setTimeout(() => { setArm(REST); r.classList.remove('is-playing'); goal = 0; spin(); }, RM ? 0 : 280);
      }
    }
    setArm(REST);
    watchFocus(form, cue);
    form.addEventListener('invalid', () => once(arm, 'is-skip', 520), true);
    form.addEventListener('submit', () => { if (RM || !down) return; scr = { t0: now(), dur: 950, a0: ang }; spin(); });
    // ---- the record slides out of its sleeve as the band arrives ----
    if (RM || !('IntersectionObserver' in W)) r.classList.add('is-out');
    else { r.classList.add('su-armed'); whenSeen(r, () => r.classList.add('is-out'), 0.25); }
    // ---- a fine pointer can scratch the record by hand ----
    if (!FINE || RM) return;
    r.classList.add('is-scratchable');
    const angle = (e) => Math.atan2(e.clientY - hand.cy, e.clientX - hand.cx);
    rec.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.pointerType === 'touch') return;
      const b = rec.getBoundingClientRect();
      hand = { cx: b.left + b.width / 2, cy: b.top + b.height / 2, a: 0, t: now() }; hand.a = angle(e);
      scr = null; rec.classList.add('is-grab');
      try { rec.setPointerCapture(e.pointerId); } catch (x) { /* a capture is a nicety */ }
      e.preventDefault(); spin();
    });
    rec.addEventListener('pointermove', (e) => {
      if (!hand) return;
      const a = angle(e), t = now(); let da = (a - hand.a) * 180 / Math.PI;
      if (da > 180) da -= 360; if (da < -180) da += 360;
      ang += da; vel = clamp(da / Math.max(0.008, (t - hand.t) / 1000), -1500, 1500); hand.a = a; hand.t = t;
    });
    const letGo = () => { if (!hand) return; hand = null; rec.classList.remove('is-grab'); spin(); };
    rec.addEventListener('pointerup', letGo); rec.addEventListener('pointercancel', letGo); rec.addEventListener('lostpointercapture', letGo);
  }
})();
