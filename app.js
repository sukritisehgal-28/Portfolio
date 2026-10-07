/**
 * Sukriti Sehgal · Portfolio
 * Smooth scrolling, header, mobile menu, scroll reveals, "Ask my agents", journey pop-ups,
 * the projects carousel and its live visualizations, the footer wordmark and the cursor ring.
 */

import Lenis from './vendor/lenis/lenis.mjs';
import { gradientField } from './gradient-field.js';
import { JOURNEY } from './data/profile.js';
import { AGENTS, answerLocally, findNamed } from './data/answer-local.js';

window.__appReady = true;

// The figures wink and smile with SVG animation; hold them still for people who prefer less motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('svg').forEach((svg) => {
    svg.pauseAnimations?.();
    svg.setCurrentTime?.(0);
  });
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canObserve = 'IntersectionObserver' in window;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : ms));

// ================================================================
// SMOOTH SCROLLING
// Eased wheel/trackpad scrolling and anchor jumps. Touch scrolling stays native,
// and nothing is smoothed for people who prefer reduced motion.
// ================================================================

let lenis = null;
if (!reduceMotion) {
  try {
    lenis = new Lenis({ lerp: 0.085, autoRaf: true });
  } catch {
    lenis = null;
  }
}

const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

document.addEventListener('click', (e) => {
  if (!lenis || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const link = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
  if (!link) return;
  const hash = link.getAttribute('href');
  const target = hash === '#' || hash === '#top' ? 0 : document.getElementById(hash.slice(1));
  if (target === null) return;
  e.preventDefault();
  // A card that hasn't revealed yet still sits lower by its reveal offset; aim for where it settles.
  const shift = target instanceof Element ? parseFloat(getComputedStyle(target).translate.split(' ')[1]) || 0 : 0;
  lenis.scrollTo(target, { offset: -shift, duration: 1.3, easing: easeOutQuart });
  history.pushState(null, '', hash === '#' ? location.pathname : hash);
});

// ================================================================
// HEADER + MOBILE MENU
// ================================================================

const header = document.querySelector('.site-header');
const nav = document.getElementById('site-nav');
const menuBtn = document.getElementById('menu-btn');

const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const setMenu = (open) => {
  nav.classList.toggle('is-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};

menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenu(false);
});

// Highlight the nav link for the section in view
if (canObserve) {
  const links = new Map([...nav.querySelectorAll('a[href^="#"]')].map((a) => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => link.classList.remove('is-active'));
      links.get(entry.target.id)?.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) spy.observe(section);
  });
}

// ================================================================
// SCROLL REVEAL
// ================================================================

const revealEls = document.querySelectorAll('.reveal');

if (canObserve && !reduceMotion) {
  const revealer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        revealer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach((el) => revealer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-in'));
}

// ================================================================
// ASK MY AGENTS
// Live answers stream from /api/ask (five Claude agents + an orchestrator).
// If that endpoint isn't reachable, the same agents answer offline from data/profile.js.
// ================================================================

const askForm = document.getElementById('ask-form');
const askInput = document.getElementById('ask-input');
const askSubmit = document.getElementById('ask-submit');
const suggestionBtns = document.querySelectorAll('.suggestion');
const conversation = document.getElementById('conversation');
const askPanel = document.getElementById('panel-ask');
const hubStatus = document.getElementById('hub-status');
const agentNet = document.getElementById('agent-net');
// Each agent's node and spoke in the diagram light up as it works
const netParts = (id) => [...document.querySelectorAll(`.net-node[data-agent="${id}"], .net-spoke[data-agent="${id}"]`)];
const AGENT_NAMES = Object.fromEntries(AGENTS.map((a) => [a.id, a.name.replace(' agent', '')]));
// Answers stay short; these links take visitors to the full sections on the page.
const SECTION_FOR = {
  experience: ['#journey', 'Journey'],
  recognition: ['#journey', 'Journey'],
  education: ['#journey', 'Journey'],
  projects: ['#projects', 'Projects'],
  careers: ['#contact', 'Contact'],
};
let busy = false;

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inline = (s) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const BULLET = /^\s*[-•*]\s+/;

// Small, safe renderer: paragraphs, "- " bullet lists and **bold**. Everything else is escaped.
const renderAnswer = (text) => text.trim().split(/\n{2,}/).map((block) => {
  const lines = block.split('\n').filter((l) => l.trim());
  const first = lines.findIndex((l) => BULLET.test(l));
  if (first === -1) return `<p>${inline(lines.join(' '))}</p>`;
  const lead = first > 0 ? `<p>${inline(lines.slice(0, first).join(' '))}</p>` : '';
  const items = lines.slice(first).map((l) => `<li>${inline(l.replace(BULLET, ''))}</li>`).join('');
  return `${lead}<ul>${items}</ul>`;
}).join('');

const setAgent = (id, status) => {
  netParts(id).forEach((node) => {
    node.classList.remove('is-working', 'is-done', 'is-empty', 'is-error');
    if (status !== 'idle') node.classList.add(`is-${status}`);
  });
};

const setBusy = (on) => {
  busy = on;
  askSubmit.disabled = on;
  askInput.readOnly = on;
  suggestionBtns.forEach((btn) => { btn.disabled = on; });
  agentNet?.classList.toggle('is-busy', on);
  hubStatus.textContent = on ? 'Five agents searching' : 'Five agents ready';
};

// Stream the live answer. Resolves to the mode ('live' | 'mock') or null when the browser should fall back.
async function askLive(question, onAgent, onDelta) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body || !(res.headers.get('content-type') || '').includes('ndjson')) return null;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let mode = null;
    let gotText = false;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const raw = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!raw) continue;
        const event = JSON.parse(raw);
        if (event.type === 'agent') onAgent(event);
        else if (event.type === 'delta') { gotText = true; onDelta(event.text); }
        else if (event.type === 'done') mode = event.mode;
        else if (event.type === 'error' && !gotText) return null;
      }
    }
    return gotText ? mode || 'live' : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Offline: same agents, answered from the site's own data.
async function askOffline(question, onAgent, onDelta) {
  const { agents, text } = answerLocally(question);
  agents.filter((a) => a.used).forEach((a) => onAgent({ id: a.id, status: 'working' }));
  for (const a of agents) {
    await wait(a.used ? 380 : 120);
    onAgent({ id: a.id, status: a.used ? 'done' : 'empty', note: a.note });
  }
  for (const chunk of text.match(/[\s\S]{1,18}/g) || []) {
    await wait(16);
    onDelta(chunk);
  }
  return 'offline';
}

async function ask(rawQuestion) {
  const question = rawQuestion.replace(/\s+/g, ' ').trim().slice(0, 300);
  if (!question || busy) return;
  setBusy(true);
  AGENTS.forEach((a) => setAgent(a.id, 'idle'));

  askPanel.classList.add('has-answer');
  conversation.textContent = '';
  const qBubble = document.createElement('div');
  qBubble.className = 'q-bubble';
  qBubble.textContent = question;
  const aBubble = document.createElement('div');
  aBubble.className = 'a-bubble';
  aBubble.innerHTML = '<span class="a-thinking">Five agents are searching her record</span>';
  conversation.append(qBubble, aBubble);

  let text = '';
  let frame = 0;
  const used = new Set();
  const onAgent = (e) => {
    setAgent(e.id, e.status, e.note);
    if (e.status === 'done') used.add(e.id);
  };
  const onDelta = (delta) => {
    if (!text) aBubble.classList.add('is-streaming');
    text += delta;
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        aBubble.innerHTML = renderAnswer(text);
      });
    }
  };

  let mode = await askLive(question, onAgent, onDelta);
  if (!mode) {
    text = '';
    used.clear();
    AGENTS.forEach((a) => setAgent(a.id, 'idle'));
    mode = await askOffline(question, onAgent, onDelta);
  }

  cancelAnimationFrame(frame);
  frame = 0;
  aBubble.classList.remove('is-streaming');
  aBubble.innerHTML = renderAnswer(text);

  const more = moreLinks(question, used);
  if (more) conversation.append(more);

  const meta = document.createElement('div');
  meta.className = 'a-meta';
  const names = [...used].map((id) => AGENT_NAMES[id]).join(', ');
  const how = { live: 'answered live by Claude agents', mock: 'mock mode', offline: 'answered from site data' }[mode] || mode;
  meta.textContent = `${names ? `Sources: ${names} · ` : ''}${how}`;
  conversation.append(meta);

  setBusy(false);
}

// "More on the page": the item the question named (its pop-up or project card), then the sections behind the answer.
function moreLinks(question, used) {
  const links = [];
  const named = findNamed(question);
  if (named?.type === 'journey' && document.querySelector(`.jrow[data-exp="${named.id}"]`)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Open full details';
    btn.addEventListener('click', () => document.querySelector(`.jrow[data-exp="${named.id}"]`).click());
    links.push(btn);
  } else if (named?.type === 'project') {
    const slide = [...document.querySelectorAll('.slide[id]')].find((el) => el.querySelector('h3')?.textContent === named.name);
    if (slide) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = `${escapeHtml(named.name)} <span aria-hidden="true">↓</span>`;
      btn.addEventListener('click', () => goToProject(slide.id));
      links.push(btn);
    }
  }
  const seen = new Set();
  [...used].forEach((id) => {
    const [href, label] = SECTION_FOR[id] || [];
    if (href && !seen.has(href)) {
      seen.add(href);
      links.push([href, label]);
    }
  });
  if (!links.length) return null;

  const row = document.createElement('nav');
  row.className = 'a-more';
  row.setAttribute('aria-label', 'More on this page');
  const label = document.createElement('span');
  label.className = 'mono';
  label.textContent = 'MORE ON THE PAGE';
  row.append(label);
  links.forEach((link) => {
    if (link instanceof HTMLElement) {
      row.append(link);
      return;
    }
    const a = document.createElement('a');
    a.href = link[0];
    a.innerHTML = `${escapeHtml(link[1])} <span aria-hidden="true">↓</span>`;
    row.append(a);
  });
  return row;
}

askForm.addEventListener('submit', (e) => {
  e.preventDefault();
  ask(askInput.value);
});

suggestionBtns.forEach((btn) => btn.addEventListener('click', () => {
  askInput.value = btn.textContent;
  ask(btn.textContent);
}));

// ================================================================
// PROJECTS CAROUSEL: arrows, project pills, keyboard and swipe
// Each slide's visualization plays when the slide comes into view.
// ================================================================

const track = document.getElementById('car-track');
const slides = [...document.querySelectorAll('.slide')];
const pills = [...document.querySelectorAll('.car-pill')];
const prevBtn = document.getElementById('car-prev');
const nextBtn = document.getElementById('car-next');
const indexEl = document.getElementById('car-index');
let activeSlide = -1;
let carouselSeen = false;

// ---- Project Uzima: six hospitals called at once (an illustrative case)
const hospEls = [...document.querySelectorAll('.hosp')];
const lineEls = [...document.querySelectorAll('.fan-line')];
const voiceCap = document.getElementById('voice-cap');
const VOICE = {
  results: [['yes', 40], ['no', 'no beds'], ['no', 'no neuro ICU'], ['yes', 55], ['no', 'full'], ['no', 'no beds']],
  order: [1, 0, 4, 2, 5, 3],
  best: 0,
};
let voiceTimers = [];

const stopVoice = () => {
  voiceTimers.forEach(clearTimeout);
  voiceTimers = [];
};
const later = (ms, fn) => voiceTimers.push(setTimeout(fn, reduceMotion ? 0 : ms));

const setHosp = (i, state, label) => {
  hospEls[i].classList.remove('is-calling', 'is-yes', 'is-no', 'is-best');
  lineEls[i].classList.remove('is-calling', 'is-yes', 'is-best');
  hospEls[i].classList.add(`is-${state}`);
  if (state !== 'no') lineEls[i].classList.add(`is-${state}`);
  hospEls[i].querySelector('em').textContent = label;
};

function runVoice() {
  if (!hospEls.length) return;
  stopVoice();
  voiceCap.textContent = `Calling ${hospEls.length} hospitals at once · illustrative`;
  hospEls.forEach((_, i) => setHosp(i, 'calling', 'calling'));
  VOICE.order.forEach((i, k) => later(1000 + k * 450, () => {
    const [state, info] = VOICE.results[i];
    setHosp(i, state, state === 'yes' ? `yes · ${info} min` : info);
  }));
  later(1000 + VOICE.order.length * 450 + 400, () => {
    hospEls[VOICE.best].classList.add('is-best');
    lineEls[VOICE.best].classList.add('is-best');
    voiceCap.textContent = 'Fastest yes: Mercy General, 40 min · illustrative';
  });
}

document.getElementById('voice-replay')?.addEventListener('click', runVoice);

// ---- Live view / screenshot toggle on each slide
document.querySelectorAll('.view-toggle').forEach((group) => {
  const viz = group.closest('.slide-viz');
  group.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
    viz.dataset.view = btn.dataset.view;
    group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  }));
});

// ---- Which slide is showing
const setActive = (i) => {
  if (i === activeSlide) return;
  activeSlide = i;
  pills.forEach((p, k) => (k === i ? p.setAttribute('aria-current', 'true') : p.removeAttribute('aria-current')));
  // Keep the active name visible in the pill row (horizontal only, so the page never jumps)
  const pillRow = pills[i]?.parentElement;
  if (pillRow && pillRow.scrollWidth > pillRow.clientWidth) {
    const left = pills[i].offsetLeft - (pillRow.clientWidth - pills[i].offsetWidth) / 2;
    pillRow.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  indexEl.textContent = String(i + 1).padStart(2, '0');
  prevBtn.disabled = i === 0;
  nextBtn.disabled = i === slides.length - 1;
  if (carouselSeen) playSlide(i);
};

// Restart a slide's CSS animations, and the voice sequence on the Uzima slide
function playSlide(i) {
  slides.forEach((slide, k) => {
    if (k !== i) slide.classList.remove('is-live');
  });
  const slide = slides[i];
  slide.classList.remove('is-live');
  void slide.offsetWidth;
  slide.classList.add('is-live');
  if (slide.dataset.key === 'uzima') runVoice();
  else stopVoice();
}

const goTo = (i) => {
  const k = Math.max(0, Math.min(slides.length - 1, i));
  track.scrollTo({ left: slides[k].offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
};

function goToProject(id) {
  const k = slides.findIndex((s) => s.id === id);
  if (k < 0) return;
  const section = document.getElementById('projects');
  if (lenis) lenis.scrollTo(section, { duration: 1.2, easing: easeOutQuart });
  else section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  goTo(k);
}

if (track) {
  prevBtn.addEventListener('click', () => goTo(activeSlide - 1));
  nextBtn.addEventListener('click', () => goTo(activeSlide + 1));
  pills.forEach((p) => p.addEventListener('click', () => goTo(Number(p.dataset.to))));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(activeSlide + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(activeSlide - 1); }
  });

  if (canObserve) {
    const slideWatcher = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(slides.indexOf(entry.target));
      });
    }, { root: track, threshold: 0.6 });
    slides.forEach((slide) => slideWatcher.observe(slide));

    // Start the first visualization only once the carousel is on screen
    new IntersectionObserver((entries, obs) => {
      if (!entries[0].isIntersecting) return;
      carouselSeen = true;
      playSlide(Math.max(activeSlide, 0));
      obs.disconnect();
    }, { threshold: 0.35 }).observe(track);
  } else {
    carouselSeen = true;
    setActive(0);
  }
  if (activeSlide < 0) setActive(0);
}

// ================================================================
// JOURNEY: each row opens a details pop-up
// ================================================================

const dialog = document.getElementById('exp-dialog');
const KIND_LABEL = { rec: 'RECOGNITION', founder: 'FOUNDER', exp: 'EXPERIENCE', edu: 'EDUCATION' };
const indexById = new Map(JOURNEY.map((item, i) => [item.id, i]));
const el = (id) => document.getElementById(id);
let currentIndex = 0;
let opener = null;

const listItems = (target, values) => {
  target.textContent = '';
  values.forEach((value) => {
    const li = document.createElement('li');
    li.textContent = value;
    target.append(li);
  });
};

const fillDialog = (i) => {
  const item = JOURNEY[i];
  currentIndex = i;
  const kind = el('exp-kind');
  kind.textContent = KIND_LABEL[item.kind];
  kind.dataset.kind = item.kind;
  el('exp-title').textContent = item.title;
  el('exp-meta').textContent = [item.org, item.location, item.start ? item.when : null].filter(Boolean).join(' · ');
  el('exp-summary').textContent = item.summary;
  listItems(el('exp-bullets'), item.bullets);
  listItems(el('exp-tags'), item.tags);
  const links = el('exp-links');
  links.textContent = '';
  item.links.forEach((link) => {
    const a = document.createElement('a');
    a.className = 'btn btn-light btn-sm';
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = link.label;
    links.append(a);
  });
  el('exp-prev').disabled = i === 0;
  el('exp-next').disabled = i === JOURNEY.length - 1;
  el('exp-count').textContent = `${i + 1} / ${JOURNEY.length}`;
};

document.querySelectorAll('.jrow').forEach((btn) => {
  btn.addEventListener('click', () => {
    const i = indexById.get(btn.dataset.exp);
    if (i === undefined) return;
    opener = btn;
    fillDialog(i);
    dialog.showModal();
    lenis?.stop();
  });
});

el('exp-prev').addEventListener('click', () => fillDialog(Math.max(0, currentIndex - 1)));
el('exp-next').addEventListener('click', () => fillDialog(Math.min(JOURNEY.length - 1, currentIndex + 1)));
dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close(); // click on the backdrop
});
dialog.addEventListener('close', () => {
  lenis?.start();
  opener?.focus();
});

// ================================================================
// GRADIENT FIELDS: soft behind "a good deed", pixel boxes behind the contact panel.
// Same five colour blobs in both; they drift toward the mouse, the nearer ones more.
// ================================================================

const FIELD_BLOBS = [
  { x: 0.24, y: 0.42, r: 0.36, c: [140, 160, 250], depth: 1.0, ph: 0 },
  { x: 0.74, y: 0.38, r: 0.32, c: [248, 158, 98], depth: 1.7, ph: 2 },
  { x: 0.52, y: 0.78, r: 0.34, c: [176, 150, 240], depth: 0.6, ph: 4 },
  { x: 0.9, y: 0.82, r: 0.2, c: [120, 140, 245], depth: 1.3, ph: 1 },
  { x: 0.1, y: 0.86, r: 0.18, c: [250, 180, 130], depth: 0.9, ph: 3 },
];
// strength 0.5 keeps the colours soft enough that the text on top stays easy to read
const FIELD_LOOK = { base: () => [250, 250, 248], blobs: FIELD_BLOBS, strength: 0.5, falloff: 2.4, drift: 0.025, range: 0.14 };

const statementEl = document.querySelector('.statement');
if (statementEl) gradientField(statementEl, { ...FIELD_LOOK, style: 'soft', cell: 8 });

const ctaEl = document.querySelector('.cta');
// a negative range makes the pixel colours move away from the cursor instead of toward it
if (ctaEl) gradientField(ctaEl, { ...FIELD_LOOK, style: 'pixel', cell: 14, gap: 1, dither: true, range: -0.14 });

// ================================================================
// FOOTER WORDMARK: the photos inside the letters drift while it's on screen
// ================================================================

const wordmark = document.getElementById('wordmark');
const WORDMARK_PHOTOS = 'images/wordmark-color.jpg';
const PAN_SPEED = 55; // pixels per second

// The photo strip repeats seamlessly: loop exactly one strip width at a steady speed
const sizeStrip = (img) => {
  const h = wordmark.querySelector('.wm-layer').getBoundingClientRect().height;
  if (!h || !img.naturalHeight) return;
  const w = (img.naturalWidth * h) / img.naturalHeight;
  wordmark.style.setProperty('--strip-w', `${w.toFixed(1)}px`);
  wordmark.style.setProperty('--pan-dur', `${(w / PAN_SPEED).toFixed(1)}s`);
};

if (wordmark && canObserve && !reduceMotion) {
  const strip = new Image();
  strip.onload = () => sizeStrip(strip);
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !strip.src) strip.src = WORDMARK_PHOTOS;
    if (entry.isIntersecting) wordmark.classList.add('is-in');
    wordmark.classList.toggle('is-panning', entry.isIntersecting);
  }).observe(wordmark);
  window.addEventListener('resize', () => sizeStrip(strip), { passive: true });
} else {
  wordmark?.classList.add('is-in');
}

// ================================================================
// CURSOR RING: a soft circle that trails the pointer (mouse/trackpad only)
// ================================================================

if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(ring);

  let targetX = 0;
  let targetY = 0;
  let x = 0;
  let y = 0;
  let seen = false;
  let running = false;

  const follow = () => {
    x += (targetX - x) * 0.16;
    y += (targetY - y) * 0.16;
    ring.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (Math.abs(targetX - x) > 0.2 || Math.abs(targetY - y) > 0.2) {
      requestAnimationFrame(follow);
    } else {
      running = false;
    }
  };

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    targetX = e.clientX;
    targetY = e.clientY;
    if (!seen) {
      x = targetX;
      y = targetY;
      seen = true;
    }
    ring.classList.add('is-visible');
    if (!running) {
      running = true;
      requestAnimationFrame(follow);
    }
  }, { passive: true });

  document.addEventListener('pointerover', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    ring.classList.toggle('is-hover', Boolean(target?.closest('a, button, input, textarea, select, label')));
  });
  document.documentElement.addEventListener('pointerleave', () => ring.classList.remove('is-visible'));
  window.addEventListener('pointerdown', () => ring.classList.add('is-down'));
  window.addEventListener('pointerup', () => ring.classList.remove('is-down'));
}

// ================================================================
// FOOTER YEAR
// ================================================================

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
