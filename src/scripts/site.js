/* site.js: Capital District Cannabis redesign. One file, no dependencies. Every URL comes from the page (the
   #cdc-data block and HTML attributes), never from a hard-coded root, so the build works under any base path.
   Everything degrades: without JS the page is complete, links default to the Albany menu, nothing is hidden. */
(() => {
  'use strict';
  const d = document, root = d.documentElement, W = window;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const dataEl = d.getElementById('cdc-data');
  if (!dataEl) return;
  const DATA = JSON.parse(dataEl.textContent);
  const RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = W.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  const byId = (id) => DATA.stores.find((s) => s.id === id) || DATA.stores[0];

  /* ---------------- store system ---------------- */
  function menuUrl(s, t) {
    const base = DATA.menu + '/' + s.menu;
    if (!t || t === 'all') return base;
    if (t === 'specials') return base + '/specials';
    if (t.indexOf('brands/') === 0) return base + '/' + t;
    return base + '/' + (DATA.cats[t] || 'products/' + t);
  }
  function nyNow() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (t) => (parts.find((p) => p.type === t) || {}).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day: day < 0 ? new Date().getDay() : day, mins: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10) };
  }
  const fmt = (m) => { let h = Math.floor(m / 60), mm = m % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + (mm ? ':' + String(mm).padStart(2, '0') : ':00') + ' ' + ap; };
  // mirrors the live store selector: "Open • Order until 8:30 pm" / "Pre-Orders Closed • Order at 9:00AM"
  function statusOf(s) {
    const n = nyNow(); const [o, c] = s.hours[n.day]; const open = n.mins >= o * 60 && n.mins < c * 60; const cut = c * 60 - 30;
    if (open && n.mins < cut) return { open: true, text: '<b>Open</b> · Order until ' + fmt(cut) };
    if (open) return { open: true, text: '<b>Open</b> until ' + fmt(c * 60) + ' · Pre-orders closed' };
    const before = n.mins < o * 60; const nd = before ? n.day : (n.day + 1) % 7;
    return { open: false, text: 'Pre-orders closed · Order ' + (before ? 'at ' : 'tomorrow at ') + fmt(s.hours[nd][0] * 60) };
  }
  function renderStatus() {
    const cur = root.getAttribute('data-store');
    $$('[data-status-for], [data-status-current]').forEach((el) => {
      const s = byId(el.hasAttribute('data-status-current') ? cur : el.getAttribute('data-status-for'));
      const st = statusOf(s);
      el.classList.toggle('is-open', st.open); el.classList.toggle('is-closed', !st.open);
      const t = el.querySelector('.status__txt'); if (t) t.innerHTML = st.text;
    });
    const n = nyNow();
    $$('.hours').forEach((t) => { const rows = t.querySelectorAll('tbody tr'); rows.forEach((r, i) => r.classList.toggle('is-today', (n.day === 0 ? 1 : 0) === i)); });
  }
  function applyStore(id) {
    const s = byId(id);
    root.setAttribute('data-store', s.id);
    $$('[data-menu]').forEach((a) => { a.href = menuUrl(s, a.getAttribute('data-menu')); });
    $$('[data-store-name]').forEach((el) => { el.textContent = el.closest('.chip') ? s.city : s.name; });
    $$('[data-store-phone]').forEach((el) => { el.textContent = s.phone; });
    $$('[data-store-tel]').forEach((a) => { a.href = 'tel:' + s.tel; });
    $$('[data-store-directions]').forEach((a) => { a.href = s.directions; });
    $$('[data-store-page]').forEach((a) => { a.href = s.page; });
    $$('[data-store-letter]').forEach((el) => { if (!el.closest('[data-store-card]') && !el.closest('.gate__store')) el.textContent = s.letter; });
    $$('[data-store-card]').forEach((c) => c.classList.toggle('is-mine', c.getAttribute('data-store-card') === s.id));
    $$('[data-store-city]').forEach((el) => { el.textContent = s.city; });
    renderStatus();
  }
  applyStore(ls.get('cdc.store') || DATA.defaultStore);
  W.setInterval(renderStatus, 60000);

  function toast(msg) { const t = d.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; d.body.appendChild(t); W.setTimeout(() => t.remove(), 2700); }

  /* ---------------- focus trap for dialogs ---------------- */
  function trap(box, e) {
    if (e.key !== 'Tab') return;
    const f = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', box).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------------- 21+ gate: age, then store (as on the live site) ---------------- */
  const gate = $('#gate');
  function closeGate() { if (!gate) return; gate.hidden = true; root.classList.remove('gate-open'); }
  if (gate && !ls.get('cdc.age') && !/[?&]gate=off/.test(location.search)) {
    gate.hidden = false; root.classList.add('gate-open');
    W.setTimeout(() => { const b = $('[data-gate-yes]', gate); if (b) b.focus(); }, 60);
    gate.addEventListener('keydown', (e) => trap(gate, e));
  }
  if (gate) {
    gate.addEventListener('click', (e) => {
      if (e.target.closest('[data-gate-yes]')) {
        ls.set('cdc.age', '1');
        if (ls.get('cdc.store')) { closeGate(); return; }
        $('[data-gate-step="1"]', gate).hidden = true; const s2 = $('[data-gate-step="2"]', gate); s2.hidden = false; const f = $('button', s2); if (f) f.focus();
      } else if (e.target.closest('[data-gate-no]')) {
        const m = $('[data-gate-msg]', gate); if (m) m.hidden = false;
      }
    });
  }

  /* ---------------- store switcher ---------------- */
  const modal = $('[data-smodal]'); let lastFocus = null;
  function openModal() { if (!modal) return; lastFocus = d.activeElement; modal.hidden = false; root.classList.add('gate-open'); W.setTimeout(() => { const b = $('.smodal__x', modal); if (b) b.focus(); }, 40); hideBar(true); }
  function closeModal() { if (!modal || modal.hidden) return; modal.hidden = true; root.classList.remove('gate-open'); if (lastFocus) lastFocus.focus(); evalBar(); }
  d.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open-store]'); if (o) { e.preventDefault(); openModal(); return; }
    if (e.target.closest('[data-smodal-close]')) { closeModal(); return; }
    const set = e.target.closest('[data-set-store]');
    if (set) { pickStore(set.getAttribute('data-set-store'), set.hasAttribute('data-gate-done')); return; }
    // the whole store card selects its store; its links (phone, directions, Shop, details) keep their own job. A press
    // that started elsewhere and was dragged more than 24px is a drag, not a pick (browsers still send the card a click).
    const card = e.target.closest('[data-pick-card]');
    const dragged = downPos && (e.clientX || e.clientY) && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 24;
    if (card && !dragged && !e.target.closest('a, button, input, select, textarea, summary, label')) pickStore(card.getAttribute('data-store-card'), false);
  });
  let downPos = null;
  d.addEventListener('pointerdown', (e) => { downPos = { x: e.clientX, y: e.clientY }; }, true);
  // A press that starts on a pick button or card and is released a few pixels away (off the button) gets no click
  // from the browser; if it stays inside the same store card, it still picks that store.
  let press = null;
  d.addEventListener('pointerdown', (e) => {
    press = null; if (e.button !== 0) return;
    const btn = e.target.closest('[data-set-store]'); if (!btn) return;
    press = { btn, id: btn.getAttribute('data-set-store'), area: btn.closest('[data-pick-card]') || btn.parentElement, x: e.clientX, y: e.clientY, gate: btn.hasAttribute('data-gate-done') };
  }, true);
  d.addEventListener('pointerup', (e) => {
    const pr = press; press = null; if (!pr) return;
    if (pr.btn.contains(e.target)) return; // released on the button: the normal click picks
    if (Math.hypot(e.clientX - pr.x, e.clientY - pr.y) > 24 || !pr.area.contains(e.target)) return; // a drag, or left the card (a link under the release gets no click: the press began on the button)
    W.setTimeout(() => pickStore(pr.id, pr.gate), 0);
  }, true);
  let lastPick = { id: null, t: 0 };
  function pickStore(id, fromGate) {
    if (lastPick.id === id && performance.now() - lastPick.t < 350) return; // one pick per press
    lastPick = { id, t: performance.now() };
    ls.set('cdc.store', id); applyStore(id);
    $$('[data-store-card="' + id + '"]').forEach((c) => { c.classList.remove('is-picked'); void c.offsetWidth; c.classList.add('is-picked'); W.setTimeout(() => c.classList.remove('is-picked'), 1200); });
    if (fromGate) { closeGate(); toast('Shopping ' + byId(id).name + '. Enjoy!'); return; }
    if (modal && !modal.hidden) W.setTimeout(closeModal, 380); // the pick shows on the card, then the switcher closes
    toast('Now shopping ' + byId(id).name);
  }
  if (modal) modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); trap(modal, e); });

  /* ---------------- header: frost on scroll, mega menus, drawer ---------------- */
  const hdr = $('[data-hdr]');
  let megaOpen = null, megaTimer = 0;
  function setMega(key) {
    $$('[data-mega-btn]').forEach((b) => { const on = b.getAttribute('data-mega-btn') === key; b.setAttribute('aria-expanded', on ? 'true' : 'false'); const p = d.getElementById('mega-' + b.getAttribute('data-mega-btn')); if (p) p.hidden = !on; });
    megaOpen = key; if (hdr) hdr.classList.toggle('is-solid', !!key);
  }
  $$('[data-mega-btn]').forEach((b) => {
    const key = b.getAttribute('data-mega-btn'); const item = b.closest('.nav__item');
    b.addEventListener('click', () => setMega(megaOpen === key ? null : key));
    if (FINE && item) {
      item.addEventListener('mouseenter', () => { W.clearTimeout(megaTimer); megaTimer = W.setTimeout(() => setMega(key), 90); });
      item.addEventListener('mouseleave', () => { W.clearTimeout(megaTimer); megaTimer = W.setTimeout(() => { if (megaOpen === key) setMega(null); }, 220); });
    }
  });
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (megaOpen) { const b = $('[data-mega-btn="' + megaOpen + '"]'); setMega(null); if (b) b.focus(); } closeDrawer(); } });
  d.addEventListener('click', (e) => { if (megaOpen && !e.target.closest('.nav__item')) setMega(null); });
  const qMega = (location.search.match(/[?&]mega=(\w+)/) || [])[1]; if (qMega) setMega(qMega);

  const drawer = $('[data-drawer]'), dbtn = $('[data-drawer-btn]');
  function closeDrawer() { if (!drawer || drawer.hidden) return; drawer.hidden = true; d.body.classList.remove('drawer-open'); if (dbtn) dbtn.setAttribute('aria-expanded', 'false'); if (hdr) hdr.classList.remove('is-solid'); evalBar(); }
  if (dbtn && drawer) dbtn.addEventListener('click', () => {
    if (!drawer.hidden) { closeDrawer(); return; }
    drawer.hidden = false; d.body.classList.add('drawer-open'); dbtn.setAttribute('aria-expanded', 'true'); if (hdr) hdr.classList.add('is-solid'); hideBar(true);
  });
  if (drawer) drawer.addEventListener('click', (e) => { if (e.target.closest('a')) closeDrawer(); });

  /* ---------------- sticky pickup bar: past the hero, gone at the footer, while typing, or for the session ---------------- */
  const bar = $('[data-pickbar]'); const ftr = $('[data-ftr]');
  let footerIn = false, typing = false, barOff = ss.get('cdc.bar') === 'off';
  function hideBar(force) { if (!bar) return; bar.classList.remove('is-on'); root.style.setProperty('--bottom-stack', '0px'); if (force) bar.dataset.force = '1'; }
  function evalBar() {
    if (!bar || barOff) return; delete bar.dataset.force;
    const on = W.scrollY > W.innerHeight * 0.72 && !footerIn && !typing && (!drawer || drawer.hidden) && (!modal || modal.hidden) && !root.classList.contains('gate-open');
    if (on) { bar.hidden = false; requestAnimationFrame(() => bar.classList.add('is-on')); root.style.setProperty('--bottom-stack', (bar.offsetHeight || 80) + 'px'); } else { bar.classList.remove('is-on'); root.style.setProperty('--bottom-stack', '0px'); }
  }
  if (bar) {
    bar.hidden = false;
    $('[data-pickbar-close]', bar).addEventListener('click', () => { barOff = true; ss.set('cdc.bar', 'off'); hideBar(); });
    if (ftr && 'IntersectionObserver' in W) new IntersectionObserver((en) => { footerIn = en[0].isIntersecting; evalBar(); }, { rootMargin: '0px 0px -30% 0px' }).observe(ftr);
    d.addEventListener('focusin', (e) => { if (e.target.matches('input, textarea, select')) { typing = true; evalBar(); } });
    d.addEventListener('focusout', (e) => { if (e.target.matches('input, textarea, select')) { typing = false; W.setTimeout(evalBar, 120); } });
  }

  /* ---------------- scroll loop: header state, bar, parallax, record + tape velocity ---------------- */
  const depth = (!RM && W.innerWidth > 760) ? $$('[data-depth]') : [];
  let lastY = W.scrollY, vel = 0, ticking = false;
  function onScroll() {
    const y = W.scrollY; vel = y - lastY; lastY = y;
    if (hdr) hdr.classList.toggle('is-scrolled', y > 24);
    evalBar();
    if (depth.length) {
      const vh = W.innerHeight;
      for (const el of depth) {
        const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) continue;
        const k = parseFloat(el.getAttribute('data-depth')) || 0; const off = (r.top + r.height / 2 - vh / 2) * -k;
        el.style.translate = '0 ' + off.toFixed(1) + 'px';
      }
    }
    ticking = false;
  }
  W.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  W.addEventListener('resize', () => requestAnimationFrame(onScroll), { passive: true });
  onScroll();

  /* ---------------- reveals ---------------- */
  const reveal = $$('[data-reveal]');
  const lit = $$('.band--lit, .band');
  if ('IntersectionObserver' in W && !RM) {
    const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveal.forEach((el) => io.observe(el));
    const io2 = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('is-lit', 'is-in'); io2.unobserve(x.target); } }), { threshold: 0.18 });
    lit.forEach((el) => io2.observe(el));
    W.setTimeout(() => { reveal.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < W.innerHeight && r.bottom > 0) el.classList.add('is-in'); }); }, 2500);
  } else { reveal.forEach((el) => el.classList.add('is-in')); lit.forEach((el) => el.classList.add('is-lit', 'is-in')); }

  /* ---------------- pointer effects (fine pointers only) ---------------- */
  if (FINE && !RM) {
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ty', ((px - 0.5) * 9).toFixed(2) + 'deg'); el.style.setProperty('--tx', ((0.5 - py) * 7).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--my', (py * 100).toFixed(1) + '%'); el.classList.add('is-tilting');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--tx', '0deg'); el.style.setProperty('--ty', '0deg'); el.classList.remove('is-tilting'); });
    });
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.3; el.style.translate = Math.max(-10, Math.min(10, x)).toFixed(1) + 'px ' + Math.max(-8, Math.min(8, y)).toFixed(1) + 'px'; });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
    $$('[data-spot]').forEach((el) => {
      let raf = 0;
      el.addEventListener('pointermove', (e) => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const r = el.getBoundingClientRect(); el.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); el.style.setProperty('--ly', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); }); });
    });
  }

  /* ---------------- the record: 33 1/3 rpm, scroll nudges it, drag to scratch ---------------- */
  $$('[data-vinyl]').forEach((v) => {
    const disc = $('.vinyl__disc', v); if (!disc) return;
    if (RM) return;
    let ang = Math.random() * 360, speed = 200, last = performance.now(), visible = true, drag = null, boost = 0;
    if ('IntersectionObserver' in W) new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) { last = performance.now(); requestAnimationFrame(tick); } }).observe(v);
    function tick(now) {
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!drag) { boost += (vel * 2.4 - boost) * 0.08; ang += (speed + boost) * dt; }
      disc.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)';
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    const center = () => { const r = disc.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const angleAt = (e) => { const [cx, cy] = center(); return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI; };
    if (v.getAttribute('data-vinyl') !== 'footer') {
      v.style.pointerEvents = 'auto';
      v.addEventListener('pointerdown', (e) => { drag = { a: angleAt(e), base: ang }; v.setPointerCapture(e.pointerId); v.classList.add('is-scratching'); });
      v.addEventListener('pointermove', (e) => {
        if (drag) { ang = drag.base + (angleAt(e) - drag.a); return; }
        if (!FINE) return; const r = v.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        v.style.setProperty('--ty', (px * 16).toFixed(1) + 'deg'); v.style.setProperty('--tx', (-py * 14).toFixed(1) + 'deg');
      });
      const end = () => { drag = null; v.classList.remove('is-scratching'); };
      v.addEventListener('pointerup', end); v.addEventListener('pointercancel', end);
      v.addEventListener('pointerleave', () => { if (!drag) { v.style.setProperty('--tx', '0deg'); v.style.setProperty('--ty', '0deg'); } });
    }
  });

  /* ---------------- tapes speed up with the scroll ---------------- */
  if (!RM) {
    const tracks = $$('[data-tape] .tape__track');
    if (tracks.length && tracks[0].getAnimations) {
      let rate = 1;
      (function loop() { const target = 1 + Math.min(5, Math.abs(vel) * 0.12); rate += (target - rate) * 0.06; vel *= 0.9; tracks.forEach((t) => t.getAnimations().forEach((a) => { a.playbackRate = rate; })); requestAnimationFrame(loop); })();
    }
  }

  /* ---------------- flashlight wall: the pointer is the light ---------------- */
  $$('[data-wall]').forEach((w) => {
    if (RM) { w.classList.add('is-static'); return; }
    if (!FINE) { w.classList.add('is-auto'); return; }
    let raf = 0;
    w.addEventListener('pointermove', (e) => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const r = w.getBoundingClientRect(); w.style.setProperty('--wx', (e.clientX - r.left).toFixed(0) + 'px'); w.style.setProperty('--wy', (e.clientY - r.top).toFixed(0) + 'px'); w.classList.add('is-on'); }); });
    w.addEventListener('pointerleave', () => w.classList.remove('is-on'));
  });

  /* ---------------- counters ---------------- */
  const counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in W) {
    const io = new IntersectionObserver((en) => en.forEach((x) => {
      if (!x.isIntersecting) return; io.unobserve(x.target); const el = x.target, to = parseFloat(el.getAttribute('data-count')); if (RM) { el.textContent = to; return; }
      const t0 = performance.now(); (function step(now) { const p = Math.min(1, (now - t0) / 1400); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(t0);
    }), { threshold: 0.6 });
    counters.forEach((c) => io.observe(c));
  }

  /* ---------------- loops: load near view, pause off screen, never under reduced motion or Save-Data ---------------- */
  const saveData = navigator.connection && navigator.connection.saveData;
  $$('video[data-src]').forEach((v) => {
    if (RM || saveData) return;
    const src = (W.innerWidth < 760 && v.getAttribute('data-src-sm')) || v.getAttribute('data-src');
    const io = new IntersectionObserver((en) => en.forEach((x) => {
      if (x.isIntersecting) { if (!v.src) { v.src = src; v.load(); } const p = v.play(); if (p && p.catch) p.catch(() => {}); } else if (v.src) v.pause();
    }), { rootMargin: '200px 0px' });
    io.observe(v);
  });
  $$('[data-video-toggle]').forEach((b) => b.addEventListener('click', () => {
    const v = d.getElementById(b.getAttribute('aria-controls')); if (!v) return;
    if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'Pause the loop'); }
    else { v.pause(); b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-label', 'Play the loop'); }
  }));

  /* ---------------- drag to scroll (mouse) ---------------- */
  $$('[data-drag]').forEach((wrap) => {
    const row = wrap.firstElementChild; if (!row || !FINE) return; let x0 = 0, s0 = 0, down = false, moved = false;
    row.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; x0 = e.clientX; s0 = row.scrollLeft; });
    W.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - x0; if (Math.abs(dx) > 4) { moved = true; row.classList.add('is-drag'); } row.scrollLeft = s0 - dx; });
    W.addEventListener('pointerup', () => { down = false; row.classList.remove('is-drag'); });
    row.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  });

  /* ---------------- filters (blog, events, FAQ, areas) ---------------- */
  $$('[data-filter-group]').forEach((g) => {
    const scope = d.getElementById(g.getAttribute('data-filter-group')); if (!scope) return;
    g.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]'); if (!b) return; const v = b.getAttribute('data-filter');
      $$('[data-filter]', g).forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      let shown = 0;
      $$('[data-tags]', scope).forEach((it) => { const on = v === 'all' || (' ' + it.getAttribute('data-tags') + ' ').indexOf(' ' + v + ' ') >= 0; it.hidden = !on; if (on) { shown++; it.classList.add('is-in'); } });
      const empty = $('[data-filter-empty]', scope.parentNode); if (empty) empty.hidden = shown > 0;
    });
  });

  /* ---------------- store locator: type a town, see the closest store ---------------- */
  $$('[data-locator]').forEach((box) => {
    const input = $('input', box); const scope = d.getElementById(box.getAttribute('data-locator')); if (!input || !scope) return;
    const items = $$('[data-town]', scope); const empty = $('[data-locator-empty]', box.parentNode);
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase(); let shown = 0;
      items.forEach((it) => { const on = !q || it.getAttribute('data-town').toLowerCase().indexOf(q) >= 0; it.hidden = !on; if (on) { shown++; it.classList.add('is-in'); } });
      if (empty) empty.hidden = shown > 0;
    });
  });

  /* ---------------- the all-access laminate swings with the pointer ---------------- */
  $$('[data-lanyard]').forEach((l) => {
    if (RM) return; let a = 0, va = 0, target = 0, lastX = null; const host = l.closest('section') || l;
    host.addEventListener('pointermove', (e) => { if (lastX != null) target = Math.max(-16, Math.min(16, (e.clientX - lastX) * 0.9)); lastX = e.clientX; });
    host.addEventListener('pointerleave', () => { target = 0; lastX = null; });
    (function loop(t) { const idle = Math.sin(t / 1400) * 3; va += ((target + idle) - a) * 0.04; va *= 0.9; a += va; target *= 0.94; l.style.setProperty('--swing', a.toFixed(2) + 'deg'); requestAnimationFrame(loop); })(0);
  });

  /* ---------------- demo forms never post ---------------- */
  $$('[data-demo-form]').forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); const m = $('[data-demo-msg]', f); if (m) { m.classList.add('is-flash'); m.setAttribute('role', 'status'); } toast('Preview build: forms are switched off'); }));

  /* ---------------- reviews: Spotlight (one at a time, auto-advancing, reviewers as tabs) ---------------- */
  $$('[data-rv-spot]').forEach((g) => {
    const slides = $$('.rv-b__slide', g), tabs = $$('.rv-b__tab', g), bar = $('.rv-b__bar', g), num = $('[data-rv-n]', g);
    if (!slides.length) return;
    const DUR = 7000; let i = 0, timer = 0, paused = false;
    g.style.setProperty('--rv-dur', DUR / 1000 + 's');
    function show(n, user) {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('is-on', k === i));
      tabs.forEach((t, k) => { t.classList.toggle('is-on', k === i); t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; });
      if (num) num.textContent = String(i + 1).padStart(2, '0');
      if (bar) { bar.classList.remove('is-run'); void bar.offsetWidth; if (!RM) bar.classList.add('is-run'); }
      W.clearTimeout(timer); if (!RM && !paused) timer = W.setTimeout(() => show(i + 1), DUR);
    }
    const pause = (on) => { paused = on; g.classList.toggle('is-paused', on); W.clearTimeout(timer); if (!on && !RM) timer = W.setTimeout(() => show(i + 1), DUR / 2); };
    g.addEventListener('mouseenter', () => pause(true)); g.addEventListener('mouseleave', () => pause(false));
    g.addEventListener('focusin', () => pause(true)); g.addEventListener('focusout', () => pause(false));
    const prev = $('[data-rv-prev]', g), next = $('[data-rv-next]', g);
    if (prev) prev.addEventListener('click', () => show(i - 1, true));
    if (next) next.addEventListener('click', () => show(i + 1, true));
    tabs.forEach((t, k) => { t.addEventListener('click', () => show(k, true)); t.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); show(i + 1, true); tabs[i].focus(); } if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1, true); tabs[i].focus(); } }); });
    if ('IntersectionObserver' in W) new IntersectionObserver((en) => { if (en[0].isIntersecting) { if (!paused) show(i); } else W.clearTimeout(timer); }, { threshold: 0.3 }).observe(g);
    else show(0);
  });

  /* ---------------- reviews: The Deck (drag the top card away, or deal the next) ---------------- */
  $$('[data-rv-deck]').forEach((deck) => {
    const cards = $$('.rv-c__card', deck); if (!cards.length) return;
    const section = deck.closest('section'); const counter = section && $('[data-rv-c]', section); const dealBtn = section && $('[data-rv-deal]', section);
    let order = cards.map((_, k) => k);
    function layout() { order.forEach((k, pos) => { const c = cards[k]; c.style.setProperty('--pos', String(Math.min(pos, 4))); c.toggleAttribute('data-pos-hidden', pos > 4); c.style.zIndex = String(50 - pos); c.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true'); }); if (counter) counter.textContent = String(order[0] + 1).padStart(2, '0'); }
    function deal(dir) {
      const k = order[0], c = cards[k];
      c.style.setProperty('--x', (dir * 520) + 'px'); c.style.setProperty('--rot', (dir * 18) + 'deg'); c.style.opacity = '0';
      W.setTimeout(() => { order = order.slice(1).concat(k); c.style.transition = 'none'; c.style.setProperty('--x', '0px'); c.style.setProperty('--y', '0px'); c.style.setProperty('--rot', '0deg'); layout(); void c.offsetWidth; c.style.transition = ''; c.style.opacity = ''; }, RM ? 0 : 380);
    }
    layout();
    if (dealBtn) dealBtn.addEventListener('click', () => deal(1));
    let drag = null;
    deck.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.rv-c__card'); if (!c || c !== cards[order[0]]) return;
      drag = { c, x: e.clientX, y: e.clientY, dx: 0, dy: 0 }; c.classList.add('is-drag'); c.setPointerCapture(e.pointerId);
    });
    deck.addEventListener('pointermove', (e) => { if (!drag) return; drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y; drag.c.style.setProperty('--x', drag.dx + 'px'); drag.c.style.setProperty('--y', drag.dy * 0.4 + 'px'); drag.c.style.setProperty('--rot', drag.dx / 18 + 'deg'); });
    const end = () => { if (!drag) return; const d0 = drag; drag = null; d0.c.classList.remove('is-drag'); if (Math.abs(d0.dx) > 110) deal(d0.dx > 0 ? 1 : -1); else { d0.c.style.setProperty('--x', '0px'); d0.c.style.setProperty('--y', '0px'); d0.c.style.setProperty('--rot', '0deg'); } };
    deck.addEventListener('pointerup', end); deck.addEventListener('pointercancel', end);
    deck.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') deal(1); if (e.key === 'ArrowLeft') deal(-1); });
  });
})();
