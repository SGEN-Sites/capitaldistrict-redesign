/* spray.js: the hero spray can sprays lime mist: while a mouse is over it, and on touch or pen for a tap (a burst of at
   least 1.2 s) or for as long as the press is held. Markup (home.mjs): [data-spray] > .h-can__body > img + i.h-can__nozzle.
   .h-can__body carries the lean and the bob (spray.css) and the nozzle marker sits on the actuator's spray hole inside
   it, so the marker's box is the emission point in every frame, whatever the parallax, bob, rotation or scale; the
   angle of the marker around the body's centre gives the can's on-screen rotation, so the jet always leaves at right
   angles to the can's long axis, on the open side (left, toward the page). The mist is drawn on one full-viewport
   canvas (made on first use, above the hero, under the header) from soft sprites rendered once; the frame loop runs
   only while particles live and stops when the tab is hidden. Reduced motion: one soft, still puff that fades.
   No globals, no dependencies, nothing here may throw: without a canvas the can stays a picture. Original work. */
(() => {
  'use strict';
  const W = window, d = document;
  const boot = () => { try { init(); } catch (e) { /* the can stays a picture */ } };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();

  function init() {
    const cans = Array.prototype.filter.call(d.querySelectorAll('[data-spray]'), (c) => c.querySelector('.h-can__nozzle'));
    if (!cans.length || typeof W.requestAnimationFrame !== 'function') return;

    const TAU = Math.PI * 2, DEG = Math.PI / 180;
    const TILT = 18.9 * DEG;    // the can's long axis leans this far right of vertical in the photo itself (obj-spraycan)
    const BURST = 1200;         // ms: a tap sprays at least this long
    const SPREAD = 14 * DEG;    // half-angle of the mist cone
    const TURB = 95, SETTLE = 40, GRAV = 300; // px/s2 at a full-size can: eddies, mist settling, droplet fall
    const R = Math.random, tri = () => R() + R() - 1; // -1..1, denser in the middle
    const now = () => (W.performance && performance.now ? performance.now() : Date.now());
    const media = (q) => { try { return W.matchMedia(q); } catch (e) { return { matches: false }; } };
    const RMQ = media('(prefers-reduced-motion: reduce)');

    // ---------------- colour: the brand lime from the tokens, a neon core like the cap's yellow-green ----------------
    const rgbOf = (name, fb) => {
      try {
        const v = getComputedStyle(d.documentElement).getPropertyValue(name).trim(); let m;
        if ((m = /^#([0-9a-f]{6})$/i.exec(v))) { const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
        if ((m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v))) return [m[1], m[2], m[3]].map((h) => parseInt(h + h, 16));
        if ((m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(v))) return [+m[1], +m[2], +m[3]];
      } catch (e) {}
      return fb;
    };
    const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';

    // ---------------- the canvas and the sprites, made on first use ----------------
    let cv = null, ctx = null, dead = false, vw = 0, vh = 0, dpr = 1;
    let PUFF = [], CORE = null, DROPC = '#c8f09b';
    function sprite(size, paint) { const c = d.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); if (!g) throw new Error('no 2d'); paint(g, size / 2); return c; }
    function blob(g, x, y, r, col, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(.45, rgba(col, a * .45)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    function puffSprite(col) { // a lumpy, grainy cloud whose every edge fades to nothing
      return sprite(128, (g, h) => {
        blob(g, h, h, h * .95, col, .62);
        for (let i = 0; i < 6; i++) { const a = R() * TAU, o = h * (.1 + R() * .28); blob(g, h + Math.cos(a) * o, h + Math.sin(a) * o, h * (.28 + R() * .3), col, .3 + R() * .3); }
        for (let i = 0; i < 420; i++) { const a = R() * TAU, o = h * .78 * Math.sqrt(R()); g.fillStyle = rgba(col, (.15 + R() * .5).toFixed(2)); g.fillRect(h + Math.cos(a) * o, h + Math.sin(a) * o, 1.5, 1.5); }
        g.globalCompositeOperation = 'destination-in';
        const m = g.createRadialGradient(h, h, 0, h, h, h); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(.5, 'rgba(0,0,0,.72)'); m.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = m; g.fillRect(0, 0, h * 2, h * 2);
      });
    }
    function ensure() {
      if (dead) return false;
      if (ctx) return true;
      try {
        const LIME = rgbOf('--lime', [161, 207, 110]), NEON = [218, 242, 104]; // NEON: the actuator cap's yellow-green, lit
        PUFF = [puffSprite(LIME), puffSprite(LIME), puffSprite(LIME)];
        CORE = sprite(64, (g, h) => { const gr = g.createRadialGradient(h, h, 0, h, h, h); gr.addColorStop(0, 'rgba(246,255,214,1)'); gr.addColorStop(.22, rgba(NEON, .85)); gr.addColorStop(.55, rgba(NEON, .26)); gr.addColorStop(1, rgba(NEON, 0)); g.fillStyle = gr; g.fillRect(0, 0, h * 2, h * 2); });
        DROPC = rgba(NEON, 1);
        const c = d.createElement('canvas'); const g = c.getContext && c.getContext('2d');
        if (!g || !d.body) throw new Error('no canvas');
        c.className = 'spray-mist'; c.setAttribute('aria-hidden', 'true');
        // fixed over the whole viewport: above the hero (z 2) and the page bands, under the pickup bar and the header
        c.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;margin:0;padding:0;border:0;pointer-events:none;visibility:hidden;z-index:calc(var(--z-bar, 55) - 1)';
        d.body.appendChild(c);
        cv = c; ctx = g;
        return true;
      } catch (e) { dead = true; return false; }
    }
    function fit() {
      vw = cv.clientWidth || W.innerWidth; vh = cv.clientHeight || W.innerHeight;
      dpr = Math.min(2, W.devicePixelRatio || 1);
      const bw = Math.max(1, Math.round(vw * dpr)), bh = Math.max(1, Math.round(vh * dpr));
      if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    }

    // ---------------- particles: three recycled pools (mist puffs, the neon core of the jet, fine droplets) ----------------
    const pool = (cap) => ({ a: [], n: 0, cap });
    const mist = pool(560), core = pool(90), drop = pool(70);
    const add = (P) => { if (P.n >= P.cap) return null; let p = P.a[P.n]; if (!p) p = P.a[P.n] = {}; P.n++; return p; };
    const kill = (P, i) => { const j = --P.n; if (i !== j) { const t = P.a[i]; P.a[i] = P.a[j]; P.a[j] = t; } };
    function launch(p, em, a, sp, dt) { // leave the hole along angle a at speed sp, born somewhere inside the last frame
      const c = Math.cos(a), s = Math.sin(a), u = R() * dt, o = R() * 2.5 * em.k + sp * u;
      p.x = em.x + c * o + (R() - .5) * 1.4 * em.k; p.y = em.y + s * o + (R() - .5) * 1.4 * em.k;
      p.vx = c * sp; p.vy = s * sp; p.age = u; p.dist = o; p.k = em.k; p.still = 0;
    }
    function spawn(em, dt, kind) {
      const k = em.k;
      if (kind === 0) {
        const p = add(mist); if (!p) return;
        launch(p, em, em.dir + tri() * SPREAD, (620 + R() * 680) * k, dt);
        p.life = .8 + R() * 1; p.drag = 3 + R() * 1.6; p.r0 = (2 + R() * 2.6) * k; p.grow = .14 + R() * .08; p.diff = (10 + R() * 20) * k;
        p.a0 = .17 + R() * .17; p.spr = (R() * PUFF.length) | 0; p.ph = R() * TAU; look(p);
      } else if (kind === 1) {
        const p = add(core); if (!p) return;
        launch(p, em, em.dir + tri() * SPREAD * .45, (650 + R() * 450) * k, dt);
        p.life = .1 + R() * .14; p.drag = 9; p.r0 = (1.6 + R() * 1.8) * k; p.grow = .16; p.a0 = .35 + R() * .3;
      } else {
        const p = add(drop); if (!p) return;
        launch(p, em, em.dir + tri() * SPREAD * .75, (650 + R() * 700) * k, dt);
        p.life = .45 + R() * .65; p.drag = 1.2 + R() * .7; p.r0 = (.5 + R() * .55) * Math.max(.8, k); p.a0 = .45 + R() * .4;
      }
    }
    function puff(em) { // reduced motion: a soft cloud where the jet would be, standing still, fading
      if (!aim(em)) return;
      for (let i = 0; i < 18; i++) {
        const p = add(mist); if (!p) break;
        const dist = (12 + R() * 120) * em.k, a = em.dir + tri() * SPREAD * .8;
        p.x = em.x + Math.cos(a) * dist; p.y = em.y + Math.sin(a) * dist; p.vx = p.vy = 0; p.age = 0; p.dist = 0; p.k = em.k; p.still = 1;
        p.life = .9 + R() * .4; p.drag = 0; p.r0 = 6 * em.k + dist * .34; p.grow = 0; p.diff = 0; p.a0 = .1 + R() * .08; p.spr = (R() * PUFF.length) | 0; p.ph = 0; look(p);
      }
    }

    // ---------------- emitters: one per can ----------------
    const ems = cans.map((can) => ({ can, body: can.querySelector('.h-can__body') || can, noz: can.querySelector('.h-can__nozzle'), on: false, rm: false, hover: false, down: null, t0: 0, timer: 0, p: 0, acc: [0, 0, 0], x: 0, y: 0, dir: Math.PI, k: 1 }));
    function aim(em) { // where the hole is on screen now, which way it faces, how big the can is drawn
      const b = em.body.getBoundingClientRect(), n = em.noz.getBoundingClientRect();
      if (!b.width || !b.height) return false;
      const nx = n.left + n.width / 2, ny = n.top + n.height / 2;
      const sx = nx - (b.left + b.width / 2), sy = ny - (b.top + b.height / 2);
      const lx = em.noz.offsetLeft + em.noz.offsetWidth / 2 - em.body.offsetWidth / 2, ly = em.noz.offsetTop + em.noz.offsetHeight / 2 - em.body.offsetHeight / 2;
      const sl = Math.hypot(sx, sy), ll = Math.hypot(lx, ly);
      if (!sl || !ll) return false;
      const rot = Math.atan2(sy, sx) - Math.atan2(ly, lx); // the can's total on-screen rotation (lean + bob + hiss)
      em.x = nx; em.y = ny;
      em.dir = TILT + rot - Math.PI;                        // at right angles to the long axis, on the left
      em.k = Math.min(1.25, Math.max(.55, Math.pow(em.body.offsetWidth * (sl / ll) / 150, .4))); // a small can still sprays a readable cloud
      return true;
    }
    function start(em) {
      if (!ensure()) return;
      if (!em.on) {
        em.on = true; em.rm = !!RMQ.matches; em.can.classList.add('is-spraying');
        if (em.rm) puff(em); else em.p = Math.max(em.p, .35); // the first spit as the valve opens
      }
      wake();
    }
    function stop(em) { if (!em.on) return; em.on = false; em.rm = false; em.can.classList.remove('is-spraying'); }
    const settle = (em) => { if (!em.hover && em.down == null && !em.timer) stop(em); };
    const guard = (fn) => function (e) { try { fn(e); } catch (err) { halt(true); } };

    ems.forEach((em) => {
      const can = em.can;
      // mouse: spray while the pointer is over the can (the desktop case: hover: hover and pointer: fine)
      can.addEventListener('pointerenter', guard((e) => { if (e.pointerType !== 'mouse') return; em.hover = true; start(em); }));
      can.addEventListener('pointerleave', guard((e) => { if (e.pointerType !== 'mouse') return; em.hover = false; settle(em); }));
      // touch and pen: a press sprays at once, a tap leaves a burst of at least BURST ms, a hold sprays until release
      can.addEventListener('pointerdown', guard((e) => {
        if (e.pointerType === 'mouse' || e.isPrimary === false) return;
        em.down = e.pointerId; em.t0 = now();
        if (em.timer) { clearTimeout(em.timer); em.timer = 0; }
        try { can.setPointerCapture(e.pointerId); } catch (err) {} // the release comes back here even off the can
        start(em);
      }));
      const release = guard((e) => {
        if (e.pointerType === 'mouse' || em.down == null || e.pointerId !== em.down) return;
        em.down = null;
        const left = BURST - (now() - em.t0);
        if (left > 16) em.timer = setTimeout(() => { try { em.timer = 0; settle(em); } catch (err) { halt(true); } }, left);
        else settle(em);
      });
      can.addEventListener('pointerup', release); can.addEventListener('pointercancel', release); can.addEventListener('lostpointercapture', release);
      can.addEventListener('contextmenu', (e) => { if (em.down != null) e.preventDefault(); }); // a long press is a hold, not a menu
      can.addEventListener('dragstart', (e) => e.preventDefault());
    });

    // ---------------- the frame loop: alive only while something sprays or floats ----------------
    let raf = 0, last = 0, T = 0, lastSX = 0, lastSY = 0;
    function wake() {
      if (raf || !ctx) return;
      cv.style.visibility = 'visible';
      last = now(); lastSX = W.scrollX || 0; lastSY = W.scrollY || 0;
      raf = W.requestAnimationFrame(sprayFrame);
    }
    function sprayFrame(t) {
      raf = 0;
      try {
        // real time down to 5 fps (a slow device still sees a 1.8 s mist last 1.8 s, and the loop ends on time); a
        // first frame stamped before the press that woke it counts as one 60 Hz frame
        let dt = (t - last) / 1000; last = t;
        if (!(dt > 0)) dt = 1 / 60; else if (dt > .2) dt = .2;
        T += dt;
        fit();
        // the mist stays where it was sprayed: when the page scrolls, it scrolls with it
        const sx = W.scrollX || 0, sy = W.scrollY || 0;
        if (sx !== lastSX || sy !== lastSY) { shift(lastSX - sx, lastSY - sy); lastSX = sx; lastSY = sy; }
        step(dt);
        let live = false;
        for (let i = 0; i < ems.length; i++) if (emit(ems[i], dt)) live = true;
        draw(live);
        if (live || mist.n || core.n || drop.n) raf = W.requestAnimationFrame(sprayFrame);
        else idle();
      } catch (e) { halt(true); }
    }
    function emit(em, dt) {
      const active = em.on && !em.rm;
      em.p = active ? em.p + (1 - em.p) * (1 - Math.exp(-dt / .04)) : em.p * Math.exp(-dt / .055); // valve opens, closes
      if (!active && em.p < .01) { em.p = 0; return false; }
      if (!aim(em)) { em.p = 0; if (em.on) { em.hover = false; em.down = null; stop(em); } return false; }
      const f = em.p * (.86 + .14 * Math.sin(T * 41 + Math.sin(T * 13) * 2)) * dt; // a little hiss in the flow
      const acc = em.acc;
      acc[0] += 250 * f; acc[1] += 170 * f; acc[2] += 16 * f;
      for (let kind = 0; kind < 3; kind++) while (acc[kind] >= 1) { acc[kind]--; spawn(em, dt, kind); }
      return true;
    }
    function shift(dx, dy) {
      for (const P of [mist, core, drop]) for (let i = 0; i < P.n; i++) { P.a[i].x += dx; P.a[i].y += dy; }
    }
    const off = (x, y, r) => x + r < 0 || y + r < 0 || x - r > vw || y - r > vh;
    const gone = (x, y, r) => x + r < -60 || y + r < -60 || x - r > vw + 60 || y - r > vh + 60; // well off screen
    function look(p) { // a mist puff: small and dense at the hole, big, soft and thin as it slows (the same paint over a bigger cloud)
      const t = p.age / p.life, fadeIn = p.still ? .15 : .04;
      p.r = p.r0 + p.dist * p.grow + p.age * p.diff;
      p.a = p.a0 * (p.still ? 1 : Math.sqrt(Math.min(1, 34 * p.k / (p.r + 10 * p.k)))) * Math.min(1, p.age / fadeIn) * (1 - t) * (1 - t * .5);
      return fadeIn;
    }
    function step(dt) {
      for (let i = mist.n - 1; i >= 0; i--) {
        const p = mist.a[i]; p.age += dt;
        if (p.age >= p.life) { kill(mist, i); continue; }
        if (!p.still) {
          const tb = TURB * p.k * Math.min(1, p.age * 2.4) * dt; // the jet's momentum fades, the eddies take over
          p.vx += (Math.sin(p.y * .021 + T * 1.7 + p.ph) + Math.sin(p.x * .012 - T * 1.2)) * tb;
          p.vy += (Math.cos(p.x * .018 + T * 1.3 + p.ph) + Math.cos(p.y * .014 + T * .8)) * tb + SETTLE * p.k * dt;
          move(p, dt);
        }
        const fadeIn = look(p);
        if ((p.age > fadeIn && p.a < .004) || gone(p.x, p.y, p.r)) kill(mist, i); // faded or blown away: retire it now
      }
      for (let i = core.n - 1; i >= 0; i--) { const p = core.a[i]; p.age += dt; if (p.age >= p.life) kill(core, i); else move(p, dt); }
      for (let i = drop.n - 1; i >= 0; i--) {
        const p = drop.a[i]; p.age += dt;
        if (p.age >= p.life || gone(p.x, p.y, 0)) { kill(drop, i); continue; }
        p.vy += GRAV * p.k * dt; move(p, dt);
      }
    }
    function move(p, dt) {
      const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy *= dr;
      const mx = p.vx * dt, my = p.vy * dt; p.x += mx; p.y += my; p.dist += Math.sqrt(mx * mx + my * my);
    }
    function draw(live) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let i = 0; i < mist.n; i++) {
        const p = mist.a[i], r = p.r;
        if (!(p.a >= .004) || off(p.x, p.y, r)) continue;
        ctx.globalAlpha = p.a; ctx.drawImage(PUFF[p.spr], p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.lineCap = 'round'; ctx.strokeStyle = DROPC;
      for (let i = 0; i < drop.n; i++) { // fine droplets fly furthest: specks, smeared a little while they are fast
        const p = drop.a[i], a = p.a0 * (1 - p.age / p.life), sp = Math.hypot(p.vx, p.vy) || 1, l = Math.min(4, sp * .0035) / sp;
        if (off(p.x, p.y, 4)) continue;
        ctx.globalAlpha = a; ctx.lineWidth = p.r0 * 1.5;
        ctx.beginPath(); ctx.moveTo(p.x - p.vx * l, p.y - p.vy * l); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < core.n; i++) { // the neon core of the jet: bright, short, stretched along its flight
        const p = core.a[i], t = p.age / p.life, r = p.r0 + p.dist * p.grow, a = p.a0 * (1 - t) * (1 - t);
        if (off(p.x, p.y, r * 4)) continue;
        const sp = Math.hypot(p.vx, p.vy) || 1, c = p.vx / sp, s = p.vy / sp, L = r * (1 + Math.min(3, sp * .004));
        ctx.globalAlpha = a; ctx.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, dpr * p.x, dpr * p.y);
        ctx.drawImage(CORE, -L, -r, L * 2, r * 2);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (live) for (let i = 0; i < ems.length; i++) { // the hole glows while the valve is open
        const em = ems[i]; if (!(em.p > .01)) continue;
        const r = 13 * em.k; ctx.globalAlpha = .6 * em.p; ctx.drawImage(CORE, em.x - r, em.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function idle() {
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      cv.style.visibility = 'hidden';
    }
    function halt(broken) { // tab hidden, or something failed: everything stops and the canvas is emptied
      try {
        if (raf) { W.cancelAnimationFrame(raf); raf = 0; }
        mist.n = core.n = drop.n = 0;
        ems.forEach((em) => { if (em.timer) clearTimeout(em.timer); em.timer = 0; em.hover = false; em.down = null; em.p = 0; em.acc[0] = em.acc[1] = em.acc[2] = 0; stop(em); });
        idle();
      } catch (e) {}
      if (broken) dead = true;
    }
    d.addEventListener('visibilitychange', () => { if (d.hidden) halt(false); });
    W.addEventListener('pagehide', () => halt(false));
  }
})();
