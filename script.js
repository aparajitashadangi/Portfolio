(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- split text into characters (keeps words unbroken) ---------- */
  $$('.split').forEach(el => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    let i = 0;
    text.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { el.append(' '); return; }
      const word = document.createElement('span');
      word.style.whiteSpace = 'nowrap';
      word.setAttribute('aria-hidden', 'true');
      for (const c of part) {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c;
        s.style.setProperty('--i', i++);
        word.append(s);
      }
      el.append(word);
    });
  });

  /* ---------- loader ---------- */
  const finishLoad = () => {
    root.classList.add('is-loaded');
    // once the name has risen into place, stop masking it so nothing is ever cropped
    setTimeout(() => root.classList.add('name-done'), reduced ? 0 : 2600);
  };
  const loader = $('.loader');
  if (reduced || !loader) {
    finishLoad();
  } else {
    const bar = $('.loader__bar span'), count = $('.loader__count');
    const dur = 1100, t0 = performance.now();
    const step = now => {
      const p = clamp((now - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      bar.style.transform = `scaleX(${e})`;
      count.textContent = Math.round(e * 100);
      if (p < 1) requestAnimationFrame(step);
      else setTimeout(finishLoad, 150);
    };
    requestAnimationFrame(step);
  }

  /* ---------- mobile menu ---------- */
  const burger = $('.nav__burger'), menu = $('#menu');
  let menuOpen = false;
  $$('.menu__list li').forEach((li, i) => li.style.setProperty('--i', i));
  const setMenu = open => {
    menuOpen = open;
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); }
    else { menu.classList.remove('is-open'); setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 800); }
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!menuOpen));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });

  /* ---------- inertia scrolling (mouse wheel / trackpad on desktop) ---------- */
  let smoothTo = y => scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  if (finePointer && !reduced) {
    let target = scrollY, current = scrollY, running = false;
    const maxY = () => root.scrollHeight - innerHeight;
    const tick = () => {
      current += (target - current) * 0.11;
      if (Math.abs(target - current) < 0.4) { current = target; running = false; }
      scrollTo(0, current);
      if (running) requestAnimationFrame(tick);
    };
    const start = () => { if (!running) { running = true; current = scrollY; requestAnimationFrame(tick); } };
    addEventListener('wheel', e => {
      if (e.ctrlKey || menuOpen) return;
      if (e.target.closest('textarea')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;           // horizontal swipes (carousel) stay native
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 40; else if (e.deltaMode === 2) dy *= innerHeight;
      target = clamp(target + dy, 0, maxY());
      start();
    }, { passive: false });
    // keyboard, scrollbar or find-in-page scrolling: follow it
    addEventListener('scroll', () => { if (!running) target = current = scrollY; }, { passive: true });
    addEventListener('resize', () => { target = clamp(target, 0, maxY()); });
    smoothTo = y => { target = clamp(y, 0, maxY()); start(); };
  }

  /* ---------- in-page links ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    e.preventDefault();
    if (menuOpen) setMenu(false);
    smoothTo(id === 'top' ? 0 : el.getBoundingClientRect().top + scrollY);
    if (id === 'main') el.focus({ preventScroll: true });
    history.replaceState(null, '', '#' + id);
  });

  /* ---------- reveal on scroll (content sharpens out of a soft blur) ---------- */
  const revObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      revObs.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .08 });
  $$('.reveal').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.setProperty('--d', (sibs.indexOf(el) % 6) * 0.08 + 's');
    revObs.observe(el);
  });
  $$('.sec-head').forEach(h => revObs.observe(h));

  const big = $('.contact__big');
  if (big) {
    const o = new IntersectionObserver(([en]) => { if (en.isIntersecting) { big.classList.add('in'); o.disconnect(); } }, { threshold: .3 });
    o.observe(big);
  }

  /* ---------- oversized drifting section numbers ---------- */
  const ghosts = [];
  $$('.scene').forEach(sec => {
    const num = $('.sec-num', sec);
    if (!num) return;
    const g = document.createElement('span');
    g.className = 'ghost';
    g.setAttribute('aria-hidden', 'true');
    g.textContent = num.textContent.replace(/[()]/g, '');
    sec.prepend(g);
    ghosts.push([g, sec]);
  });

  /* ---------- shared backdrop: light moves to a new place for each section ---------- */
  const orbs = $$('.ambient i');
  const tones = {            // [x vw, y vh, scale] for pink, wine, navy
    Intro:          [[50, 92, 1.1], [12, 25, 1], [88, 10, 1]],
    About:          [[88, 18, 1], [10, 85, 1.1], [45, 40, .8]],
    Skills:         [[15, 20, .9], [85, 80, 1.1], [60, 10, 1]],
    Experience:     [[80, 70, 1.1], [20, 15, 1], [50, 100, .9]],
    Internships:    [[10, 75, 1], [70, 10, 1], [95, 90, .9]],
    Education:      [[90, 85, .9], [30, 30, 1.1], [5, 95, 1]],
    Projects:       [[20, 95, 1.1], [90, 20, .9], [50, 50, .8]],
    Certifications: [[75, 15, 1], [15, 70, 1], [90, 95, 1]],
    Contact:        [[55, 60, 1.25], [10, 10, 1], [95, 30, .9]]
  };
  const setTone = name => {
    (tones[name] || tones.Intro).forEach(([x, y, s], i) => {
      if (!orbs[i]) return;
      orbs[i].style.setProperty('--x', x);
      orbs[i].style.setProperty('--y', y);
      orbs[i].style.setProperty('--s', s);
    });
  };

  /* ---------- scroll-driven effects ---------- */
  const nav = $('.nav'), railFill = $('.rail__fill');
  const navLinks = $$('.nav__links a'), railLinks = $$('.rail__list a');
  const scenes = $$('[data-section]');
  const nameFirst = $('.name-part--first'), nameLast = $('.name-part--last');
  const heroSides = $$('.hero__side');
  const scrubEl = $('.scrub');
  const tlWrap = $('.timeline'), tlLine = $('.timeline__line span');
  let lastY = scrollY, activeIdx = -1, ticking = false;

  let words = [];
  if (scrubEl) {
    const text = scrubEl.textContent.trim();
    scrubEl.textContent = '';
    text.split(/\s+/).forEach((w, i, arr) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      scrubEl.append(s, i < arr.length - 1 ? ' ' : '');
    });
    words = $$('.w', scrubEl);
  }

  function setActive(i) {
    const sec = scenes[i];
    const id = sec.id;
    navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    railLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    setTone(sec.dataset.section);
  }

  function frame() {
    const y = scrollY, vh = innerHeight;

    nav.classList.toggle('is-scrolled', y > 40);
    if (y > lastY + 2 && y > 400 && !menuOpen) nav.classList.add('is-hidden');
    else if (y < lastY - 2) nav.classList.remove('is-hidden');
    lastY = y;
    const max = root.scrollHeight - vh;
    railFill.style.transform = `scaleY(${max > 0 ? y / max : 0})`;

    let idx = 0;
    scenes.forEach((s, i) => { if (s.getBoundingClientRect().top <= vh * 0.5) idx = i; });
    if (idx !== activeIdx) { activeIdx = idx; setActive(idx); }

    if (!reduced) {
      // hero: the two halves of the name drift apart, the portrait eases back
      const p = clamp(y / vh, 0, 1);
      nameFirst.style.translate = `${-p * 12}vw`;
      nameLast.style.translate = `${p * 12}vw`;
      heroSides.forEach(s => { s.style.opacity = 1 - p * 1.1; });

      ghosts.forEach(([g, sec]) => {
        const r = sec.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        g.style.transform = `translate3d(0, ${r.top * 0.32}px, 0)`;
      });
    }

    if (scrubEl && !reduced) {
      const r = scrubEl.getBoundingClientRect();
      const start = vh * 0.85, end = vh * 0.35;
      const p = clamp((start - r.top) / (start - end + r.height * 0.6), 0, 1);
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    }

    if (tlWrap) {
      const r = tlWrap.getBoundingClientRect();
      tlLine.style.setProperty('--p', clamp((vh * 0.7 - r.top) / r.height, 0, 1));
    }
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', () => requestAnimationFrame(frame));

  /* ---------- counters ---------- */
  const cntObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, target = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0);
      cntObs.unobserve(el);
      if (reduced) { el.textContent = target.toFixed(dec); return; }
      const t0 = performance.now(), dur = 1600;
      const tick = now => {
        const p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
        el.textContent = (target * e).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => cntObs.observe(el));

  /* ---------- tenure (live) ---------- */
  $$('.tenure').forEach(el => {
    const s = new Date(el.dataset.start), n = new Date();
    let m = (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth());
    if (n.getDate() < s.getDate()) m--;
    const y = Math.floor(m / 12), mo = m % 12;
    el.textContent = `${y} yr${y === 1 ? '' : 's'}${mo ? ` ${mo} mo${mo === 1 ? '' : 's'}` : ''}`;
  });

  /* ---------- tabs (competencies) ---------- */
  const tabs = $$('[role=tab]');
  const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  panels.forEach(p => $$('.chips li', p).forEach((li, i) => li.style.setProperty('--i', i)));
  const selectTab = (i, focus) => {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
      panels[j].classList.toggle('is-active', on);
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(i));
    t.addEventListener('keydown', e => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (k) { e.preventDefault(); selectTab((i + k + tabs.length) % tabs.length, true); }
      if (e.key === 'Home') { e.preventDefault(); selectTab(0, true); }
      if (e.key === 'End') { e.preventDefault(); selectTab(tabs.length - 1, true); }
    });
  });
  if (tabs.length) selectTab(0);

  /* ---------- internship rows ---------- */
  $$('.row').forEach(row => {
    const btn = $('.row__head', row);
    btn.addEventListener('click', () => {
      const open = !row.classList.contains('is-open');
      row.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open);
    });
  });

  /* ---------- project labs ---------- */
  const inr = v => '₹' + Math.round(v).toLocaleString('en-IN') + ' Cr';
  const pct = (v, d = 1) => v.toFixed(d) + '%';
  const labs = {
    ratio(v, r) {
      const margin = v.np / v.rev * 100, cr = v.ca / v.cl;
      r.margin.textContent = pct(margin);
      r.cr.textContent = cr.toFixed(2) + '×';
      r.verdict.textContent = cr >= 1.5 ? 'Comfortable liquidity: current assets cover short-term obligations well.'
        : cr >= 1 ? 'Adequate liquidity, but working capital is worth watching.'
        : 'Liquidity pressure: current liabilities exceed current assets.';
      return { rev: inr(v.rev), np: inr(v.np), ca: inr(v.ca), cl: inr(v.cl) };
    },
    dcf(v, r) {
      const g = v.g / 100, w = v.w / 100, tg = v.tg / 100;
      const pvs = [];
      let last = 0;
      for (let t = 1; t <= 5; t++) { last = v.fcf * Math.pow(1 + g, t - 1); pvs.push(last / Math.pow(1 + w, t)); }
      const tv = last * (1 + tg) / (w - tg) / Math.pow(1 + w, 5);
      const ev = pvs.reduce((a, b) => a + b, 0) + tv;
      r.ev.textContent = inr(ev);
      r.tv.textContent = pct(tv / ev * 100, 0);
      const all = [...pvs, tv], mx = Math.max(...all);
      r.bars.innerHTML = all.map((x, i) => `<i style="height:${Math.max(4, x / mx * 100)}%" title="${i < 5 ? 'PV of year ' + (i + 1) + ' FCF' : 'PV of terminal value'}"></i>`).join('');
      return { fcf: inr(v.fcf), g: pct(v.g), w: pct(v.w), tg: pct(v.tg) };
    },
    capm(v, r) {
      const rp = v.b * (v.rm - v.rf), er = v.rf + rp;
      r.er.textContent = pct(er, 2);
      r.rp.textContent = pct(rp, 2);
      const W = 200, H = 90, P = 6;
      const yAt = b => v.rf + b * (v.rm - v.rf);
      const ys = [0, yAt(0), yAt(2.5)], lo = Math.min(...ys), hi = Math.max(...ys) || 1;
      const X = b => P + b / 2.5 * (W - 2 * P), Y = yy => H - P - (yy - lo) / (hi - lo || 1) * (H - 2 * P);
      r.sml.innerHTML = `
        <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="rgba(242,230,234,.15)"/>
        <line x1="${X(1)}" y1="${P}" x2="${X(1)}" y2="${H - P}" stroke="rgba(242,230,234,.12)" stroke-dasharray="2 3"/>
        <text x="${X(1) + 3}" y="${P + 7}" fill="#b9a7b1" font-size="7">β = 1</text>
        <line x1="${X(0)}" y1="${Y(yAt(0))}" x2="${X(2.5)}" y2="${Y(yAt(2.5))}" stroke="#a85863" stroke-width="1.5"/>
        <circle cx="${X(v.b)}" cy="${Y(er)}" r="4.5" fill="#e8829f"/>
        <text x="${W - P}" y="${H - P - 4}" fill="#b9a7b1" font-size="7" text-anchor="end">beta →</text>`;
      return { rf: pct(v.rf, 2), b: v.b.toFixed(2), rm: pct(v.rm, 2) };
    }
  };
  $$('[data-lab]').forEach(lab => {
    const fn = labs[lab.dataset.lab];
    const inputs = $$('input[data-i]', lab);
    const outs = Object.fromEntries($$('output[data-o]', lab).map(o => [o.dataset.o, o]));
    const res = Object.fromEntries($$('[data-r]', lab).map(o => [o.dataset.r, o]));
    const update = () => {
      const v = {};
      inputs.forEach(i => {
        v[i.dataset.i] = parseFloat(i.value);
        i.style.setProperty('--fill', ((i.value - i.min) / (i.max - i.min) * 100) + '%');
      });
      const labels = fn(v, res);
      for (const k in labels) if (outs[k]) outs[k].textContent = labels[k];
    };
    inputs.forEach(i => i.addEventListener('input', update));
    update();
  });

  /* ---------- certifications carousel: arrows, drag, keyboard, counter ---------- */
  $$('[data-carousel]').forEach(car => {
    const track = $('.cert-list', car), items = [...track.children];
    const cur = $('[data-cur]', car), total = $('[data-total]', car);
    const prev = $('[data-prev]', car), next = $('[data-next]', car), bar = $('.carousel__progress span', car);
    total.textContent = String(items.length).padStart(2, '0');
    const step = () => items[1] ? items[1].offsetLeft - items[0].offsetLeft : track.clientWidth;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const i = Math.round(track.scrollLeft / step());
      const atEnd = track.scrollLeft >= max - 4;
      cur.textContent = String(atEnd ? items.length : Math.min(items.length, i + 1)).padStart(2, '0');
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = atEnd;
      const w = track.clientWidth / track.scrollWidth;
      bar.style.setProperty('--w', w * 100 + '%');
      bar.style.setProperty('--x', (max > 0 ? track.scrollLeft / max : 0) * (1 / w - 1) * 100 + '%');
    };
    const go = dir => track.scrollBy({ left: dir * step(), behavior: reduced ? 'auto' : 'smooth' });
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    addEventListener('resize', update);
    let down = false, startX = 0, startL = 0, moved = false;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startL = track.scrollLeft;
    });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4 && !moved) { moved = true; track.classList.add('is-drag'); }
      if (moved) track.scrollLeft = startL - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (moved) {
        track.classList.remove('is-drag');
        track.scrollTo({ left: Math.round(track.scrollLeft / step()) * step(), behavior: reduced ? 'auto' : 'smooth' });
      }
    });
    update();
  });

  /* ---------- clock (Koraput is on IST) ---------- */
  const clock = $('.clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
    const tickClock = () => { clock.textContent = fmt.format(new Date()) + ' IST'; };
    tickClock();
    setInterval(tickClock, 15000);
  }
  $$('.year').forEach(y => { y.textContent = new Date().getFullYear(); });

  /* ---------- toast + copy email ---------- */
  const toast = $('.toast');
  let toastT;
  const showToast = msg => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('show'), 2200);
  };
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    btn.textContent = 'Copied ✓';
    btn.classList.add('is-done');
    showToast('Email address copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('is-done'); }, 2000);
  }));

  /* ---------- contact form → mailto ---------- */
  const form = $('#contact-form');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const name = form.name.value.trim(), org = form.org.value.trim(), msg = form.message.value.trim();
    const err = $('.form__error', form);
    if (!name || !msg) {
      err.textContent = !name ? 'Please add your name.' : 'Please write a short message.';
      (!name ? form.name : form.message).focus();
      return;
    }
    err.textContent = '';
    const subject = `Portfolio enquiry from ${name}${org ? ' (' + org + ')' : ''}`;
    const body = `${msg}\n\n— ${name}${org ? ', ' + org : ''}`;
    location.href = `mailto:aparajitashadangi356@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showToast('Opening your email app…');
  });

  /* ---------- the traveller ----------
     One fixed element sits behind each section's centrepiece (anchors marked
     data-morph). As the next anchor scrolls into view, the element reshapes
     from the current anchor's box into the next one's and cross-fades its
     skin, so the hero photo becomes the About photo, which becomes the Skills
     panel, and so on down to the Contact photo. */
  const morph = $('.morph');
  const anchors = $$('[data-morph]');
  if (morph && anchors.length > 1 && !reduced) {
    root.classList.add('morph-on');
    const skins = Object.fromEntries($$('.morph__skin', morph).map(el => [el.dataset.skin, el]));
    const skinOf = a => { const v = a.dataset.morph; return v.startsWith('img:') ? v.slice(4) : 'surface'; };
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const mix = (a, b, t) => a + (b - a) * t;
    let radii = [];
    const measure = () => { radii = anchors.map(a => parseFloat(getComputedStyle(a).borderTopLeftRadius) || 0); };
    measure();
    addEventListener('resize', measure);
    let last = '';
    const morphFrame = () => {
      const vh = innerHeight;
      const rects = anchors.map(a => a.getBoundingClientRect());
      let k = 0, n = -1, t = 0;
      for (let j = 1; j < anchors.length; j++) {
        if (!rects[j].width) continue;
        // 0 while the next anchor is below the screen, 1 once its top reaches ~55% of the height,
        // so it has fully settled by the time its section reaches the top of the screen
        const q = clamp((vh * 0.95 - rects[j].top) / (vh * 0.4), 0, 1);
        if (q >= 1) { k = j; continue; }
        if (q > 0) { n = j; t = q; }
        break;
      }
      const e = ease(t), a = rects[k], b = n >= 0 ? rects[n] : a;
      const x = mix(a.left, b.left, e), y = mix(a.top, b.top, e);
      const w = mix(a.width, b.width, e), h = mix(a.height, b.height, e);
      const r = mix(radii[k], n >= 0 ? radii[n] : radii[k], e);
      const key = `${x.toFixed(1)},${y.toFixed(1)},${w.toFixed(1)},${h.toFixed(1)},${r.toFixed(1)},${k},${n},${e.toFixed(3)}`;
      if (key === last) return;
      last = key;
      morph.style.transform = `translate3d(${x}px,${y}px,0)`;
      morph.style.width = w + 'px';
      morph.style.height = h + 'px';
      morph.style.borderRadius = r + 'px';
      const sa = skinOf(anchors[k]), sb = n >= 0 ? skinOf(anchors[n]) : sa;
      for (const name in skins) {
        skins[name].style.opacity = name === sa && name === sb ? 1 : name === sa ? 1 - e : name === sb ? e : 0;
      }
    };
    const morphLoop = () => { morphFrame(); requestAnimationFrame(morphLoop); };
    morphLoop();
  }

  frame();

  /* ---------- pointer-driven effects (desktop only) ---------- */
  if (!finePointer) return;

  // cursor
  const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; cur.classList.remove('is-hidden'); }, { passive: true });
  document.addEventListener('pointerleave', () => { cur.classList.add('is-hidden'); setHL(null); });

  /* Text highlight. Over text, a pink disc follows the cursor. Inside it the
     dark ground turns pink and pink or light letters turn dark. It works by
     laying an inverted copy of the text block on top, clipped to a circle. */
  const HL_SEL = '.name-part, .sec-title, h3, h4, p, dt, dd, .hero__facts li, .duty__tag, .cert__date, .path__tag, .tl__date, .tl__tag, .row__role, .row__org, .row__date, .sec-num, .label, .stats__n, .stats__l, .contact__email a, .contact__list a, .contact__list span:not(.label), .award__years li, .footer > span';
  const HL_SKIP = '.lab, .form, .btn, .carousel__btn, .copy, [role=tab], .chips, .loader, .cursor, .menu, .nav, .rail, .toast, .marquee, .hl, .panel__title, .carousel__count';
  const PAD = 150;
  let hlCur = null;
  const radiusFor = el => {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    return fs >= 60 ? 120 : fs >= 26 ? 82 : 56;
  };
  const makeHL = el => {
    const cs = getComputedStyle(el);
    if (cs.position === 'static') { el.style.position = 'relative'; el.dataset.hlPos = '1'; }
    const hl = document.createElement('span');
    hl.className = 'hl';
    hl.setAttribute('aria-hidden', 'true');
    hl.innerHTML = el.innerHTML;
    hl.querySelectorAll('.hl').forEach(n => n.remove());
    hl.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    const num = k => parseFloat(cs[k]) || 0;
    const bl = num('borderLeftWidth'), br = num('borderRightWidth'), bt = num('borderTopWidth'), bb = num('borderBottomWidth');
    let disp = cs.display;
    if (disp.startsWith('inline-')) disp = disp.slice(7);
    if (disp === 'inline' || disp === 'list-item' || disp === 'contents') disp = 'block';
    Object.assign(hl.style, {
      left: -PAD + 'px', top: -PAD + 'px',
      width: (el.offsetWidth - bl - br + PAD * 2) + 'px',
      height: (el.offsetHeight - bt - bb + PAD * 2) + 'px',
      boxSizing: 'border-box',
      padding: `${num('paddingTop') + PAD}px ${num('paddingRight') + PAD}px ${num('paddingBottom') + PAD}px ${num('paddingLeft') + PAD}px`,
      display: disp,
      flexDirection: cs.flexDirection, flexWrap: cs.flexWrap, alignItems: cs.alignItems, justifyContent: cs.justifyContent,
      alignContent: cs.alignContent, justifyItems: cs.justifyItems, gap: cs.gap,
      gridTemplateColumns: cs.gridTemplateColumns, gridTemplateRows: cs.gridTemplateRows,
      whiteSpace: cs.whiteSpace, textAlign: cs.textAlign
    });
    el.append(hl);
    return hl;
  };
  const retire = ({ el, hl }) => {
    hl.style.setProperty('--hr', '0px');
    hl._t = setTimeout(() => {
      hl.remove();
      if (el.dataset.hlPos && !el.querySelector(':scope > .hl')) { el.style.position = ''; delete el.dataset.hlPos; }
    }, 520);
  };
  function setHL(el) {
    if (hlCur && hlCur.el === el) return;
    if (hlCur) retire(hlCur);
    hlCur = null;
    cur.classList.toggle('is-text', !!el);
    if (!el) return;
    let hl = el.querySelector(':scope > .hl');
    if (hl) clearTimeout(hl._t); else hl = makeHL(el);
    hlCur = { el, hl };
    const r = hl.getBoundingClientRect();
    hl.style.setProperty('--hx', (rx - r.left) + 'px');
    hl.style.setProperty('--hy', (ry - r.top) + 'px');
    const rad = radiusFor(el);
    requestAnimationFrame(() => hl.style.setProperty('--hr', rad + 'px'));
  }

  document.addEventListener('pointerover', e => {
    const t = e.target.closest('[data-cursor], a, button, input, textarea, label');
    cur.classList.toggle('is-hover', !!t);
    const lbl = t && t.closest('[data-cursor]');
    cur.classList.toggle('is-label', !!lbl);
    label.textContent = lbl ? lbl.dataset.cursor : '';
    const h = e.target.closest(HL_SEL);
    setHL(h && !h.closest(HL_SKIP) && h.textContent.trim() ? h : null);
  });

  const loop = () => {
    rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2;
    dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    if (hlCur) {
      const r = hlCur.hl.getBoundingClientRect();
      hlCur.hl.style.setProperty('--hx', (rx - r.left) + 'px');
      hlCur.hl.style.setProperty('--hy', (ry - r.top) + 'px');
    }
    requestAnimationFrame(loop);
  };
  loop();

  if (reduced) return;

  // magnetic buttons
  $$('[data-magnetic]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  // the hero photo leans slightly with the pointer; the backdrop leans the other way
  const heroSkin = $('.morph__skin[data-skin="hero"]'), amb = $('.ambient__inner');
  $('.hero').addEventListener('pointermove', e => {
    const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
    if (heroSkin) heroSkin.style.translate = `${nx * -16}px ${ny * -10}px`;
  });
  addEventListener('pointermove', e => {
    amb.style.setProperty('--amx', (e.clientX / innerWidth - .5) * -40 + 'px');
    amb.style.setProperty('--amy', (e.clientY / innerHeight - .5) * -40 + 'px');
  }, { passive: true });

  // card glow follows pointer
  $$('[data-glow]').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--gx', e.clientX - r.left + 'px');
    el.style.setProperty('--gy', e.clientY - r.top + 'px');
  }));
})();
