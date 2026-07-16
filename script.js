// ============================================================
// Pickles by Girija — background motion
//  1. Kolam patterns that slowly trace themselves (canvas)
//  2. Drifting chilies, mustard seeds & curry leaves (canvas)
//  3. Mango-leaf toran garland under the header (DOM + CSS sway)
//  4. Scroll reveal, smooth anchors
// ============================================================

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function rand(min, max) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ------------------------------------------------------------
// Canvas layer: kolam + drifting spices
// ------------------------------------------------------------
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1, isMobile = false, frameInterval = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    isMobile = W <= 620;
    // cheaper backing store + capped frame rate on phones (saves battery / GPU)
    DPR = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    frameInterval = isMobile ? 1000 / 30 : 0;   // 0 = run every frame (desktop)
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // ---------- Kolam: a symmetric looped pattern that draws itself ----------
  const KOLAM_STEPS = 640;

  class Kolam {
    constructor(offset) {
      this.reset();
      // stagger concurrent kolams through their life cycle
      this.age = offset * this.totalLife;
    }

    reset() {
      const margin = 140;
      this.cx = rand(margin, Math.max(margin + 1, W - margin));
      this.cy = rand(margin, Math.max(margin + 1, H - margin));
      this.R = rand(80, 150);
      this.k = pick([4, 5, 6, 8]);            // fold symmetry
      this.a = rand(0.5, 0.62);               // inner radius ratio
      this.rot = rand(0, Math.PI * 2);
      this.drawTime = rand(10, 14);           // seconds to trace
      this.holdTime = 5;
      this.fadeTime = 4;
      this.totalLife = this.drawTime + this.holdTime + this.fadeTime;
      this.age = 0;

      // precompute the looped rose-curve points
      this.pts = [];
      const b = 1 - this.a;
      for (let i = 0; i <= KOLAM_STEPS; i++) {
        const t = (i / KOLAM_STEPS) * Math.PI * 2;
        const r = this.R * (this.a + b * Math.cos(this.k * t));
        this.pts.push([
          this.cx + r * Math.cos(t + this.rot),
          this.cy + r * Math.sin(t + this.rot),
        ]);
      }

      // pulli (dot grid): center, inner ring, petal tips
      this.dots = [[this.cx, this.cy]];
      for (let j = 0; j < this.k; j++) {
        const t = (j / this.k) * Math.PI * 2;
        this.dots.push([
          this.cx + this.R * Math.cos(t + this.rot),
          this.cy + this.R * Math.sin(t + this.rot),
        ]);
        const ri = this.R * this.a * 0.55;
        this.dots.push([
          this.cx + ri * Math.cos(t + this.rot + Math.PI / this.k),
          this.cy + ri * Math.sin(t + this.rot + Math.PI / this.k),
        ]);
      }
    }

    update(dt) {
      this.age += dt;
      if (this.age > this.totalLife) this.reset();
    }

    draw(ctx) {
      const { age, drawTime, holdTime, fadeTime } = this;
      let progress = 1;
      let alpha = 1;

      if (age < drawTime) {
        // ease-out trace
        const t = age / drawTime;
        progress = 1 - Math.pow(1 - t, 2);
      } else if (age > drawTime + holdTime) {
        alpha = Math.max(0, 1 - (age - drawTime - holdTime) / fadeTime);
      }

      if (alpha <= 0) return;

      const lineAlpha = 0.16 * alpha;
      const dotAlpha = 0.32 * alpha * Math.min(1, progress * 1.5);

      // traced curve
      const count = Math.max(2, Math.floor(progress * this.pts.length));
      ctx.beginPath();
      ctx.moveTo(this.pts[0][0], this.pts[0][1]);
      for (let i = 1; i < count; i++) ctx.lineTo(this.pts[i][0], this.pts[i][1]);
      ctx.strokeStyle = `rgba(151, 57, 43, ${lineAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // moving "hand" glow at the tip while drawing
      if (progress < 1) {
        const tip = this.pts[count - 1];
        ctx.beginPath();
        ctx.arc(tip[0], tip[1], 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(185, 138, 47, ${0.55 * alpha})`;
        ctx.fill();
      }

      // pulli dots
      ctx.fillStyle = `rgba(185, 138, 47, ${dotAlpha})`;
      for (const [x, y] of this.dots) {
        ctx.beginPath();
        ctx.arc(x, y, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ---------- Drifting spices & curry leaves ----------
  const KINDS = ['chili', 'seed', 'leaf', 'seed'];

  function createParticle() {
    const kind = pick(KINDS);
    let size;
    if (kind === 'chili') size = rand(20, 34);
    else if (kind === 'leaf') size = rand(18, 30);
    else size = rand(4, 7);
    return {
      kind, size,
      x: rand(0, W), y: rand(0, H),
      angle: rand(0, Math.PI * 2),
      spin: rand(-0.005, 0.005),
      vx: rand(-0.18, 0.18),
      vy: rand(0.06, 0.26),
      wobble: rand(0, Math.PI * 2),
      wobbleSpeed: rand(0.004, 0.012),
      opacity: rand(0.22, 0.45),
    };
  }

  function drawChili(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = '#41652f';
    ctx.fillRect(-1.6, -p.size * 0.5, 3.2, p.size * 0.14);
    const grad = ctx.createLinearGradient(0, -p.size * 0.4, 0, p.size * 0.5);
    grad.addColorStop(0, '#c25340');
    grad.addColorStop(1, '#7e2a1c');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -p.size * 0.36);
    ctx.bezierCurveTo(p.size * 0.26, -p.size * 0.33, p.size * 0.18, p.size * 0.42, 0, p.size * 0.5);
    ctx.bezierCurveTo(-p.size * 0.18, p.size * 0.42, -p.size * 0.26, -p.size * 0.33, 0, -p.size * 0.36);
    ctx.fill();
    ctx.restore();
  }

  function drawSeed(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = p.opacity;
    const grad = ctx.createRadialGradient(-p.size * 0.2, -p.size * 0.2, 0, 0, 0, p.size);
    grad.addColorStop(0, '#e3b45c');
    grad.addColorStop(1, '#8f5f16');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.55, p.size * 0.45, p.angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLeaf(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = p.opacity;
    const grad = ctx.createLinearGradient(0, -p.size * 0.5, 0, p.size * 0.5);
    grad.addColorStop(0, '#6f9550');
    grad.addColorStop(1, '#33531f');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -p.size * 0.5);
    ctx.bezierCurveTo(p.size * 0.32, -p.size * 0.28, p.size * 0.24, p.size * 0.38, 0, p.size * 0.5);
    ctx.bezierCurveTo(-p.size * 0.24, p.size * 0.38, -p.size * 0.32, -p.size * 0.28, 0, -p.size * 0.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 243, 225, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -p.size * 0.42);
    ctx.lineTo(0, p.size * 0.42);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- scene ----------
  let kolams = [];
  const particles = [];

  function init() {
    resize();
    // fewer concurrent kolams + drifting bits on small screens
    kolams = [new Kolam(0)];
    if (W > 620) kolams.push(new Kolam(0.45));
    if (W > 1100) kolams.push(new Kolam(0.75));
    particles.length = 0;
    const target = isMobile
      ? Math.min(10, Math.floor((W * H) / 90000))
      : Math.min(30, Math.floor((W * H) / 60000));
    for (let i = 0; i < target; i++) particles.push(createParticle());
  }

  function update(dt) {
    for (const k of kolams) k.update(dt);
    for (const p of particles) {
      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * 0.25;
      p.y += p.vy;
      p.angle += p.spin;
      if (p.y > H + 50) { p.y = -50; p.x = rand(0, W); }
      if (p.x > W + 50) p.x = -50;
      if (p.x < -50) p.x = W + 50;
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    for (const k of kolams) k.draw(ctx);
    for (const p of particles) {
      if (p.kind === 'chili') drawChili(p);
      else if (p.kind === 'leaf') drawLeaf(p);
      else drawSeed(p);
    }
  }

  let last = performance.now();
  let running = false, rafId = null;

  function loop(now) {
    if (!running) return;
    const elapsed = now - last;
    if (elapsed >= frameInterval) {
      const dt = Math.min(0.05, elapsed / 1000);
      // keep the phase when throttling so motion stays smooth at 30fps
      last = frameInterval ? now - (elapsed % frameInterval) : now;
      update(dt);
      render();
    }
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running || prefersReduced) return;
    running = true;
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  init();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 150);
  });

  // pause the whole loop while the tab is in the background
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  if (!prefersReduced) {
    start();
  } else {
    // static frame: fully drawn kolams, scattered spices
    for (const k of kolams) k.age = k.drawTime;
    render();
  }
})();

// ------------------------------------------------------------
// Mango-leaf toran garland
// ------------------------------------------------------------
(function () {
  const row = document.getElementById('toran-row');
  if (!row) return;

  const LEAF_SVG =
    '<svg viewBox="0 0 26 34" width="22" height="30">' +
    '<path d="M13 1 L13 5" stroke="#33531f" stroke-width="2"/>' +
    '<path d="M13 4 C 21 11 24 19 13 33 C 2 19 5 11 13 4 Z" fill="url(#tlg)" stroke="#33531f" stroke-width="0.8"/>' +
    '<path d="M13 6 L13 29" stroke="#e9dfc2" stroke-width="1" opacity="0.5"/>' +
    '</svg>';

  // one shared gradient def for all leaves
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0');
  defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  defs.innerHTML =
    '<defs><linearGradient id="tlg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#5b8a43"/><stop offset="1" stop-color="#33531f"/>' +
    '</linearGradient></defs>';
  document.body.appendChild(defs);

  function build() {
    row.innerHTML = '';
    const count = Math.ceil(window.innerWidth / 34);
    for (let i = 0; i < count; i++) {
      const leaf = document.createElement('span');
      leaf.className = 'toran-leaf';
      leaf.style.setProperty('--dur', rand(3.2, 5.2).toFixed(2) + 's');
      leaf.style.setProperty('--delay', (-rand(0, 5)).toFixed(2) + 's');
      leaf.innerHTML = LEAF_SVG;
      row.appendChild(leaf);
    }
  }

  build();
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(build, 200);
  });
})();

// ------------------------------------------------------------
// Scroll reveal
// ------------------------------------------------------------
(function () {
  const selectors = [
    '.story-copy', '.story-visual',
    '.pickle-card',
    '.craft-steps li',
    '.section-head',
    '.order-card',
  ];

  const elements = document.querySelectorAll(selectors.join(','));
  elements.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i % 6) * 60 + 'ms';
  });

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

  elements.forEach((el) => obs.observe(el));
})();

// ------------------------------------------------------------
// Mobile navigation (hamburger toggle)
// ------------------------------------------------------------
(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!nav.classList.contains('open'));
  });

  // close when a link is tapped, when tapping outside, or on Escape
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) {
      setOpen(false);
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
})();

// ------------------------------------------------------------
// Smooth anchor scrolling
// ------------------------------------------------------------
(function () {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id.length <= 1) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();

// ------------------------------------------------------------
// WhatsApp ordering — one place to set the number
// ------------------------------------------------------------
(function () {
  // TODO: replace with Girija's real WhatsApp number — country code first, digits only, no + or spaces
  const WHATSAPP_NUMBER = '8248160132';
  const message = "Vanakkam Girija! I'd like to order some pickles";
  const href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
  document.querySelectorAll('.js-wa').forEach((a) => {
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
  });
})();

// ------------------------------------------------------------
// Mobile sticky order bar — slides up once the hero is scrolled past
// ------------------------------------------------------------
(function () {
  const bar = document.querySelector('.mobile-order-bar');
  const hero = document.querySelector('.hero');
  if (!bar || !hero) return;

  let ticking = false;
  const apply = () => {
    ticking = false;
    // reveal once the reader has scrolled ~60% past the hero
    const past = window.scrollY > hero.offsetHeight * 0.6;
    bar.classList.toggle('show', past);
  };
  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(apply); }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  apply();
})();
