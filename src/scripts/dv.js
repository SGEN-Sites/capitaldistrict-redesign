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
