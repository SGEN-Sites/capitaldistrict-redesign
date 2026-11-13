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
