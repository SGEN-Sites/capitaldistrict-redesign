/* site.js */
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
  const fmt = (m) => { let h = Math.floor(m / 60), mm = m % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + (mm ? ':' + String(mm).padStart(2, '0') : ':00') + ' ' + ap; }; // a no-break space: "9:00 AM" never splits
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
    $$('[data-store-name]').forEach((el) => { el.textContent = el.closest('.chip') ? s.city : s.name.replace(/ (\S{1,4})$/, ' $1'); }); // "NY" never alone on a line
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
  let footerIn = false, typing = false, barOff = ss.get('cdc.bar') === 'off', barWant = false;
  function hideBar(force) { if (!bar) return; barWant = false; bar.classList.remove('is-on'); root.style.setProperty('--bottom-stack', '0px'); if (force) bar.dataset.force = '1'; }
  function evalBar() {
    if (!bar || barOff) return; delete bar.dataset.force;
    const on = W.scrollY > W.innerHeight * 0.72 && !footerIn && !typing && (!drawer || drawer.hidden) && (!modal || modal.hidden) && !root.classList.contains('gate-open');
    barWant = on;
    // the class goes on a frame later; a jump to the footer can turn the bar off before that frame, so it checks again
    if (on) { bar.hidden = false; requestAnimationFrame(() => { if (barWant) bar.classList.add('is-on'); }); root.style.setProperty('--bottom-stack', (bar.offsetHeight || 80) + 'px'); } else { bar.classList.remove('is-on'); root.style.setProperty('--bottom-stack', '0px'); }
  }
  if (bar) {
    bar.hidden = false;
    $('[data-pickbar-close]', bar).addEventListener('click', () => { barOff = true; ss.set('cdc.bar', 'off'); hideBar(); });
    if (ftr && 'IntersectionObserver' in W) new IntersectionObserver((en) => { footerIn = en[0].isIntersecting; evalBar(); }, { rootMargin: '0px 0px -30% 0px' }).observe(ftr);
    d.addEventListener('focusin', (e) => { if (e.target.matches('input, textarea, select')) { typing = true; evalBar(); } });
    d.addEventListener('focusout', (e) => { if (e.target.matches('input, textarea, select')) { typing = false; W.setTimeout(evalBar, 120); } });
  }

  /* ---------------- footer link columns: folded on phones (their headings open them there), open on wider screens
     (where the headings are plain labels). Without JS they stay open. ---------------- */
  const ftrCols = $$('.ftr__col');
  if (ftrCols.length && W.matchMedia) {
    const narrow = W.matchMedia('(max-width: 640px)');
    const fold = () => ftrCols.forEach((c) => { c.open = !narrow.matches; });
    if (narrow.matches) fold();
    if (narrow.addEventListener) narrow.addEventListener('change', fold); else if (narrow.addListener) narrow.addListener(fold);
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

;
/* cave.js */
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

;
/* ctas.js */
/* ctas.js: CTA groups on phones and tablets (owner, 2026-11-13: "CTAs should match sizes and should utilize full width for
   mobile views and tablet"). Up to 1024 px each group's buttons share its whole width in equal columns (fix.css). On
   phones (under 600 px) that is one button per row. On tablets this sets --cta-cols on each group: the most columns,
   dividing the button count so every row is full, at which the widest label still fits its column on one line; 1 when
   none does. A group is measured again when it or one of its buttons changes size (a drawer or the gate opens, the
   tablet turns, a label changes) and once the fonts have loaded. The group list is the same in fix.css. */
(() => {
  if (!('ResizeObserver' in window)) return;
  const SEL = ':is(.btns, .ph__ctas, .gate__btns, .st-pass__cta, .sh-store__cta, .co-roster__go, .sh-now__act, .sh-crate__foot, .h-shop__foot, .sh-shopat, .st-res__acts):has(> .btn)';
  let groups;
  try { groups = [...document.querySelectorAll(SEL)]; } catch (e) { return; } // no :has(): the CSS is skipped too
  if (!groups.length) return;
  const mq = window.matchMedia('(max-width: 1024px)'), phone = window.matchMedia('(max-width: 599px)');
  const fit = (g) => {
    if (!mq.matches || phone.matches) { g.style.removeProperty('--cta-cols'); return; } // desktop layout, or the phone stack (CSS)
    const W = g.clientWidth;
    if (!W) return; // hidden (the gate, a closed drawer): measured when it shows
    const btns = [...g.children].filter((b) => b.classList.contains('btn') && b.getClientRects().length);
    const n = btns.length;
    if (!n) return;
    const gap = parseFloat(getComputedStyle(g).columnGap) || 0;
    g.classList.add('cta-measure');
    const widest = Math.ceil(Math.max(...btns.map((b) => b.getBoundingClientRect().width)));
    g.classList.remove('cta-measure');
    let cols = 1;
    for (let k = n; k > 1; k--) if (n % k === 0 && k * widest + (k - 1) * gap <= W) { cols = k; break; }
    if (g.style.getPropertyValue('--cta-cols') !== String(cols)) g.style.setProperty('--cta-cols', String(cols));
  };
  const due = new Set(); let raf = 0;
  const later = (g) => { due.add(g); if (!raf) raf = requestAnimationFrame(() => { raf = 0; const list = [...due]; due.clear(); list.forEach(fit); }); };
  const ro = new ResizeObserver((entries) => { for (const e of entries) later(e.target.classList.contains('btn') ? e.target.parentElement : e.target); });
  groups.forEach((g) => { fit(g); ro.observe(g); [...g.children].forEach((b) => { if (b.classList.contains('btn')) ro.observe(b); }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => groups.forEach(later));
  const onMq = () => groups.forEach(later);
  [mq, phone].forEach((m) => { if (m.addEventListener) m.addEventListener('change', onMq); else if (m.addListener) m.addListener(onMq); });
})();

;
/* dv.js */
/* dv.js: section dividers (divider() in src/pages/lab-dividers.mjs, styles in src/styles/dv.css). When a seam comes
   into view it gets .is-on, which plays its one-shot moment (the neon flickers on, the overspray runs drip); while a
   seam is off screen it gets .is-off, which pauses its loops (twinkling windows, travelling glints, the tape). Under
   reduced motion, or without IntersectionObserver, every seam shows its finished state at once. The "before" states
   in dv.css only apply under html.dv-js, which this script sets, so if it never runs nothing stays hidden.
   No globals, no dependencies. */
(() => {
  'use strict';
  const d = document, W = window;
  const seams = Array.prototype.slice.call(d.querySelectorAll('.dv-seam'));
  if (!seams.length) return;
  const rm = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (rm || !('IntersectionObserver' in W)) { seams.forEach((s) => s.classList.add('is-on')); return; }
  d.documentElement.classList.add('dv-js');
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    const s = e.target.parentElement; if (!s) return;
    s.classList.toggle('is-off', !e.isIntersecting);
    if (e.isIntersecting) s.classList.add('is-on');
  }), { rootMargin: '-8% 0px -14% 0px' });
  seams.forEach((s) => { const p = s.querySelector('.dv-seam__probe'); if (p) io.observe(p); else s.classList.add('is-on'); });
})();

;
/* gcarousel.js */
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

;
/* lanyard.js */
/* lanyard.js: the loyalty pass on a stretchy woven band (/loyalty-program/). Ported 2026-11-13 at the owner's request
   from an earlier redesign of ours (a vanilla build of a lanyard badge effect; no third-party code). Drag it, throw it, click (or Enter / Space) to flip it.
   Changes in this port: the strap's printing comes from the page (data-print), no global is exposed.
   Markup: <div class="lanyard" data-length="220"><button class="lanyard__card">
             <span class="lanyard__face lanyard__face--front">...</span>
             <span class="lanyard__face lanyard__face--back">...</span></button></div>
   The band is drawn as an SVG path (verlet rope); the badge hangs from the rope's last point. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  function Lanyard(el) {
    var self = this;
    this.el = el;
    this.card = el.querySelector('.lanyard__card');
    this.front = el.querySelector('.lanyard__face--front');
    this.back = el.querySelector('.lanyard__face--back');
    this.n = 14;
    this.flipped = false;
    this.flipAngle = 0;               // shown flip angle, eases toward 0 / 180
    this.theta = 0; this.omega = 0;   // badge swing angle + angular speed
    this.drag = null;
    this.running = false; this.still = 0; this.visible = true;

    // the band
    var id = 'lanyard-band-' + (++uid);
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'lanyard__band'); svg.setAttribute('aria-hidden', 'true');
    this.edge = document.createElementNS(NS, 'path'); this.edge.setAttribute('class', 'lanyard__edge');
    this.strap = document.createElementNS(NS, 'path'); this.strap.setAttribute('class', 'lanyard__strap'); this.strap.setAttribute('id', id);
    var text = document.createElementNS(NS, 'text'); text.setAttribute('class', 'lanyard__print');
    var tp = document.createElementNS(NS, 'textPath'); tp.setAttribute('href', '#' + id); tp.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#' + id);
    tp.textContent = el.getAttribute('data-print') || '';
    text.appendChild(tp);
    svg.appendChild(this.edge); svg.appendChild(this.strap); svg.appendChild(text);
    el.insertBefore(svg, el.firstChild);

    this.measure();
    this.reset(!reduce);   // swing in from the side on first view (still when motion is reduced)
    this.render();

    // drag / throw / flip
    this.card.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      self.card.setPointerCapture(e.pointerId);
      var last = self.pts[self.n - 1], r = self.el.getBoundingClientRect();
      self.drag = { id: e.pointerId, ox: e.clientX - r.left - last.x, oy: e.clientY - r.top - last.y, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0 };
      self.card.classList.add('is-grabbed');
      self.wake();
    });
    this.card.addEventListener('pointermove', function (e) {
      var d = self.drag; if (!d || d.id !== e.pointerId) return;
      var r = self.el.getBoundingClientRect();
      d.x = e.clientX - r.left - d.ox; d.y = e.clientY - r.top - d.oy;
      d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.sx, e.clientY - d.sy));
      if (reduce) { self.place(d.x, d.y); self.render(); }
    });
    var up = function (e) {
      var d = self.drag; if (!d || d.id !== e.pointerId) return;
      self.drag = null; self.card.classList.remove('is-grabbed');
      // a tap flips; a cancel never does (on touch, a swipe that scrolls the page cancels the pointer, see lanyard.css)
      if (e.type === 'pointerup' && d.moved < 6 && performance.now() - d.t < 400) self.flip();
      if (reduce) { self.reset(false); self.render(); }
      self.wake();
    };
    this.card.addEventListener('pointerup', up);
    this.card.addEventListener('pointercancel', up);
    this.card.addEventListener('click', function (e) { if (e.detail === 0) self.flip(); });   // keyboard Enter / Space
    this.card.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); self.nudge(e.key === 'ArrowLeft' ? -14 : 14); }
    });

    window.addEventListener('resize', function () { self.measure(); self.reset(false); self.render(); self.wake(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; if (self.visible) self.wake(); }).observe(el);
    }
    this.syncFaces();
  }

  Lanyard.prototype.measure = function () {
    var r = this.el.getBoundingClientRect();
    this.w = r.width; this.h = r.height;
    this.len = parseFloat(getComputedStyle(this.el).getPropertyValue('--band')) || parseFloat(this.el.getAttribute('data-length')) || 200;
    this.seg = this.len / (this.n - 1);
    this.ax = this.w / 2; this.ay = 0;
  };

  Lanyard.prototype.reset = function (swingIn) {
    this.pts = [];
    for (var i = 0; i < this.n; i++) {
      var t = i / (this.n - 1);
      // straight down, or laid out to one side so it drops and swings in
      var x = this.ax + (swingIn ? t * this.len * 0.85 : 0), y = this.ay + (swingIn ? t * this.len * 0.35 : t * this.len);
      this.pts.push({ x: x, y: y, px: x, py: y });
    }
    this.theta = swingIn ? 0.9 : 0; this.omega = 0;
  };

  Lanyard.prototype.place = function (x, y) {   // reduced motion: the badge follows the pointer, the band stays a straight line
    for (var i = 0; i < this.n; i++) { var t = i / (this.n - 1); var p = this.pts[i]; p.x = p.px = this.ax + (x - this.ax) * t; p.y = p.py = this.ay + (y - this.ay) * t; }
  };

  Lanyard.prototype.nudge = function (vx) {
    if (reduce) return;
    var last = this.pts[this.n - 1]; last.px -= vx; this.omega -= vx * 0.004; this.wake();
  };

  Lanyard.prototype.flip = function () {
    this.flipped = !this.flipped;
    this.card.setAttribute('aria-pressed', this.flipped ? 'true' : 'false');
    if (reduce) this.flipAngle = this.flipped ? 180 : 0;
    this.syncFaces(); this.wake(); this.render();
  };

  Lanyard.prototype.syncFaces = function () {
    if (this.front) this.front.setAttribute('aria-hidden', this.flipped ? 'true' : 'false');
    if (this.back) this.back.setAttribute('aria-hidden', this.flipped ? 'false' : 'true');
  };

  Lanyard.prototype.wake = function () {
    if (this.running || !this.visible) return;
    this.running = true; this.still = 0; this.tPrev = performance.now(); this.acc = 0;
    var self = this;
    requestAnimationFrame(function tick(now) {
      if (!self.running) return;
      self.acc += Math.min(50, now - self.tPrev); self.tPrev = now;
      while (self.acc >= 1000 / 120) { self.step(); self.acc -= 1000 / 120; }
      self.render();
      if (!self.visible || (!self.drag && self.still > 90)) { self.running = false; return; }
      requestAnimationFrame(tick);
    });
  };

  Lanyard.prototype.step = function () {
    var pts = this.pts, n = this.n, g = 0.16, damp = 0.984, i, p, k;
    var energy = 0;
    if (!reduce) {
      for (i = 1; i < n; i++) {
        p = pts[i];
        var vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + g * (i === n - 1 ? 2.2 : 1);   // the badge weighs the end down
        energy = Math.max(energy, Math.abs(vx) + Math.abs(vy));
      }
    }
    if (this.drag && this.drag.x != null) {
      var last = pts[n - 1];
      last.x += (this.drag.x - last.x) * 0.5; last.y += (this.drag.y - last.y) * 0.5;
    }
    // the band: slightly stretchy (stiffness < 1), anchored at the top
    pts[0].x = this.ax; pts[0].y = this.ay;
    for (k = 0; k < 10; k++) {
      for (i = 0; i < n - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
        var diff = (d - this.seg) / d * 0.5 * 0.92;
        var ox = dx * diff, oy = dy * diff;
        if (i === 0) { b.x -= ox * 2; b.y -= oy * 2; }
        else { a.x += ox; a.y += oy; if (!(this.drag && i + 1 === n - 1)) { b.x -= ox; b.y -= oy; } }
      }
      pts[0].x = this.ax; pts[0].y = this.ay;
    }
    // the badge swings toward the band's last direction (a damped spring), lagging a little for weight
    var e1 = pts[n - 1], e0 = pts[n - 3];
    var target = -Math.atan2(e1.x - e0.x, e1.y - e0.y);   // band heading down-right -> badge turns counter-clockwise
    if (!isFinite(target)) target = 0;
    this.omega += (target - this.theta) * 0.06; this.omega *= 0.86; this.theta += this.omega;
    if (this.theta > 1.31) { this.theta = 1.31; this.omega = 0; } else if (this.theta < -1.31) { this.theta = -1.31; this.omega = 0; }   // never past ~75 deg
    // flip easing
    var goal = this.flipped ? 180 : 0;
    this.flipAngle += (goal - this.flipAngle) * 0.12;
    if (Math.abs(goal - this.flipAngle) < 0.2) this.flipAngle = goal;
    energy = Math.max(energy, Math.abs(this.omega) * 40, Math.abs(goal - this.flipAngle) / 4);
    this.still = energy < 0.02 ? this.still + 1 : 0;
  };

  Lanyard.prototype.render = function () {
    var pts = this.pts, n = this.n, i;
    // smooth path through the points (midpoint quadratic curves)
    var d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (i = 1; i < n - 1; i++) {
      var mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      d += ' Q' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    d += ' L' + pts[n - 1].x.toFixed(1) + ' ' + pts[n - 1].y.toFixed(1);
    this.edge.setAttribute('d', d); this.strap.setAttribute('d', d);
    var last = pts[n - 1], prev = pts[n - 2];
    var vx = last.x - last.px;
    var tiltY = reduce ? 0 : Math.max(-28, Math.min(28, vx * 9));
    this.card.style.transform = 'translate(' + (last.x).toFixed(1) + 'px,' + (last.y).toFixed(1) + 'px) translateX(-50%) rotate(' + (this.theta * 57.3).toFixed(2) + 'deg) rotateY(' + (this.flipAngle + tiltY).toFixed(1) + 'deg)';
  };

  function init(root) {
    (root || document).querySelectorAll('.lanyard:not([data-lanyard-ready])').forEach(function (el) {
      el.setAttribute('data-lanyard-ready', '');
      el.lanyard = new Lanyard(el);
    });
  }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', function () { init(); });
})();

;
/* spray.js */
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

;
/* sticker.js */
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

;
/* story.js */
/* story.js: the store pages' "things to do" story (stores.mjs storyBand, story.css). On wide screens a sticky stage
   beside the chapters shows the photo of the chapter being read: it crossfades, with a slow push-in, as each chapter
   reaches the middle of the screen, a little parallax follows the reading, the bars on top fill with the progress
   (a click on a bar goes to that chapter), and the caption and the photo credit follow the chapter. Phones and no-JS
   keep the plain photo cards; reduced motion still swaps the photo, without the fade, push-in or parallax. Scroll
   work only runs while the story is near the screen. Nothing runs on a page without [data-story]. No globals. */
(() => {
  'use strict';
  const W = window, d = document;
  const roots = Array.prototype.slice.call(d.querySelectorAll('[data-story]'));
  if (!roots.length || !('IntersectionObserver' in W)) return;
  const WIDE = W.matchMedia('(min-width: 960px) and (min-height: 560px)');
  const RM = W.matchMedia('(prefers-reduced-motion: reduce)');

  roots.forEach((root) => {
    const stage = root.querySelector('[data-story-stage]');
    const chs = Array.prototype.slice.call(root.querySelectorAll('[data-story-ch]'));
    if (!stage || !chs.length) return;
    const shots = Array.prototype.slice.call(stage.querySelectorAll('[data-shot]'));
    const bars = Array.prototype.slice.call(stage.querySelectorAll('[data-bar]'));
    const no = stage.querySelector('[data-story-no]');
    const name = stage.querySelector('[data-story-name]');
    const credit = stage.querySelector('[data-story-credit]');
    const cap = stage.querySelector('.story-stage__cap');
    let cur = -1, raf = 0, near = false;

    function show(i) {
      const prev = cur; cur = i;
      shots.forEach((s, k) => {
        s.classList.toggle('is-on', k === i);
        s.classList.toggle('was-on', k === prev && k !== i); // stays drawn while it fades out
        s.classList.toggle('is-near', Math.abs(k - i) <= 2); // drawn, so its photo loads before it is needed
      });
      chs.forEach((c, k) => { c.classList.toggle('is-active', k === i); c.classList.toggle('is-done', k < i); });
      const ch = chs[i];
      stage.classList.toggle('is-store', ch.hasAttribute('data-store'));
      if (no) no.textContent = ch.getAttribute('data-no') || '';
      if (name) name.textContent = ch.getAttribute('data-name') || '';
      if (credit) { const c = ch.querySelector('.story-credit'); credit.textContent = ''; if (c) credit.appendChild(c.cloneNode(true)); }
      if (prev >= 0 && cap && cap.animate && !RM.matches) cap.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 760, easing: 'cubic-bezier(.16, 1, .3, 1)' });
    }

    // the chapter being read is the last one whose top has passed the reading line (a little above the middle)
    function tick() {
      raf = 0;
      if (!WIDE.matches) return;
      const line = W.innerHeight * 0.45; let i = 0, p = 0;
      for (let k = 0; k < chs.length; k++) {
        const r = chs[k].getBoundingClientRect();
        if (r.top <= line) { i = k; p = Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height))); }
      }
      if (i !== cur) show(i);
      const pv = p.toFixed(3);
      bars.forEach((b, k) => b.style.setProperty('--p', k < i ? '1' : k === i ? pv : '0'));
      chs[i].style.setProperty('--p', pv);
      if (!RM.matches && shots[i]) shots[i].style.setProperty('--sp', pv); // only the photo on screen moves
    }
    const ask = () => { if (!raf) raf = W.requestAnimationFrame(tick); };

    new IntersectionObserver((en) => {
      const on = en[en.length - 1].isIntersecting;
      if (on === near) return;
      near = on;
      if (on) { W.addEventListener('scroll', ask, { passive: true }); ask(); } else W.removeEventListener('scroll', ask);
    }, { rootMargin: '300px 0px' }).observe(root);
    W.addEventListener('resize', ask, { passive: true });
    if (WIDE.addEventListener) WIDE.addEventListener('change', ask);

    bars.forEach((b, k) => b.addEventListener('click', () => {
      const r = chs[k].getBoundingClientRect();
      W.scrollTo({ top: W.scrollY + r.top - W.innerHeight * 0.45 + Math.min(r.height * 0.25, 80), behavior: RM.matches ? 'auto' : 'smooth' });
    }));

    show(0);
  });
})();

;
/* su.js */
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
