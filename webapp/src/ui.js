// Small DOM + platform helpers shared by every screen.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const ICONS = {
  back: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  prev: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="6.5" y="5" width="4" height="14" rx="1.3" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.3" fill="currentColor"/></svg>',
  replay: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 7h3.5c2 0 3.2 1 4.3 2.7l1.4 2.6c1 1.7 2.3 2.7 4.3 2.7H20M16.5 4.5L20 7l-3.5 2.5M4 17h3.5c1.2 0 2.1-.3 2.9-.9M13.6 7.9c.8-.6 1.7-.9 2.9-.9M16.5 14.5L20 17l-3.5 2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  undo: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  grid: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="3.5" y="3.5" width="7" height="7" rx="2" fill="currentColor"/><rect x="13.5" y="3.5" width="7" height="7" rx="2" fill="currentColor" opacity=".55"/><rect x="3.5" y="13.5" width="7" height="7" rx="2" fill="currentColor" opacity=".55"/><rect x="13.5" y="13.5" width="7" height="7" rx="2" fill="currentColor" opacity=".3"/></svg>',
  wand: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 20L15 9M14 4v3M19 9h-3M17.5 5.5l-2 2M12 6.5l-1-1M18.5 12l-1-1" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4a1.5 1.5 0 0 1 3 0v7m0-5.5a1.5 1.5 0 0 1 3 0V12m0-3.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.3a6 6 0 0 1-4.6-2.2L4.6 15.6a1.6 1.6 0 0 1 2.4-2.1L8 14.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  book: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" transform="translate(0 -1)"/></svg>',
};

export function icon(name) {
  const s = document.createElement('span');
  s.className = 'ic';
  s.innerHTML = ICONS[name];
  return s;
}

export function haptic(kind = 'tap') {
  try {
    window.webkit?.messageHandlers?.haptic?.postMessage(kind);
  } catch {
    /* not running inside the iOS shell */
  }
}

const STORE_KEY = 'cubetutor.v1';
export const store = {
  read() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch {
      return {};
    }
  },
  write(patch) {
    const next = { ...store.read(), ...patch };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: progress is kept for this session only */
    }
    return next;
  },
};

// Notation chip list. Returns { el, setActive(i), setDone(n) }.
export function chips(tokens, opts = {}) {
  const el = h('div', { class: `chips${opts.small ? ' small' : ''}` });
  const items = tokens.map((t) => {
    const c = h('span', { class: 'chip' }, t);
    el.append(c);
    return c;
  });
  return {
    el,
    setActive(i) {
      items.forEach((c, k) => {
        c.classList.toggle('active', k === i);
        c.classList.toggle('done', k < i);
      });
      const a = items[i];
      if (a) a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    },
    reset() {
      items.forEach((c) => c.classList.remove('active', 'done'));
    },
    count: items.length,
  };
}

// Celebration burst in the cube's colours.
export function confetti() {
  const c = h('canvas', { class: 'confetti' });
  document.body.append(c);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = window.innerWidth * dpr;
  c.height = window.innerHeight * dpr;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const cols = ['#ffd21f', '#f4f5f7', '#00a35a', '#1061d6', '#ff6a13', '#d3203b'];
  const W = window.innerWidth;
  const H = window.innerHeight;
  const parts = Array.from({ length: 140 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 60,
    y: H * 0.38,
    vx: (Math.random() - 0.5) * 13,
    vy: -Math.random() * 15 - 5,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    s: 6 + Math.random() * 7,
    c: cols[Math.floor(Math.random() * cols.length)],
  }));
  let t0 = performance.now();
  const step = (now) => {
    const dt = Math.min((now - t0) / 16.67, 3);
    t0 = now;
    g.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of parts) {
      p.vy += 0.42 * dt;
      p.vx *= 0.99;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      if (p.y < H + 40) alive++;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillStyle = p.c;
      g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.7);
      g.restore();
    }
    if (alive) requestAnimationFrame(step);
    else c.remove();
  };
  requestAnimationFrame(step);
}

export function toast(text, kind = '') {
  const t = h('div', { class: `toast ${kind}` }, text);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 400);
  }, 2200);
}
