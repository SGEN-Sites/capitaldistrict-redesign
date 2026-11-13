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
