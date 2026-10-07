/**
 * Sukriti Sehgal · Gallery page
 * Smooth scrolling, header, mobile menu, scroll reveals, and a photo lightbox.
 */

import Lenis from './vendor/lenis/lenis.mjs';

window.__appReady = true;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduceMotion) {
  document.querySelectorAll('svg').forEach((svg) => {
    svg.pauseAnimations?.();
    svg.setCurrentTime?.(0);
  });
}

// ================================================================
// SMOOTH SCROLLING
// ================================================================

let lenis = null;
if (!reduceMotion) {
  try {
    lenis = new Lenis({ lerp: 0.085, autoRaf: true });
  } catch {
    lenis = null;
  }
}

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
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenu(false);
});

// ================================================================
// SCROLL REVEAL
// ================================================================

const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduceMotion) {
  const revealer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        revealer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach((el) => revealer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-in'));
}

// ================================================================
// LIGHTBOX
// ================================================================

const photos = [...document.querySelectorAll('.ph')].map((fig) => ({
  src: fig.querySelector('img').getAttribute('src'),
  alt: fig.querySelector('img').alt,
  caption: fig.querySelector('figcaption').textContent,
  button: fig.querySelector('.ph-btn'),
}));
const box = document.getElementById('lightbox');
const boxImg = document.getElementById('lb-img');
const boxCap = document.getElementById('lb-cap');
let current = 0;
let opener = null;

const show = (i) => {
  current = (i + photos.length) % photos.length;
  boxImg.src = photos[current].src;
  boxImg.alt = photos[current].alt;
  boxCap.textContent = `${photos[current].caption} · ${current + 1} / ${photos.length}`;
};

photos.forEach((p, i) => p.button.addEventListener('click', () => {
  opener = p.button;
  show(i);
  box.showModal();
  lenis?.stop();
}));
document.getElementById('lb-prev').addEventListener('click', () => show(current - 1));
document.getElementById('lb-next').addEventListener('click', () => show(current + 1));
box.querySelector('[data-close]').addEventListener('click', () => box.close());
box.addEventListener('click', (e) => {
  if (e.target === box) box.close();
});
box.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') show(current - 1);
  if (e.key === 'ArrowRight') show(current + 1);
});
box.addEventListener('close', () => {
  lenis?.start();
  opener?.focus();
});

// ================================================================
// CURSOR RING (mouse/trackpad only)
// ================================================================

if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(ring);
  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  let running = false;
  const follow = () => {
    x += (tx - x) * 0.16;
    y += (ty - y) * 0.16;
    ring.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (Math.abs(tx - x) > 0.2 || Math.abs(ty - y) > 0.2) requestAnimationFrame(follow);
    else running = false;
  };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!ring.classList.contains('is-visible')) {
      x = tx = e.clientX;
      y = ty = e.clientY;
    }
    tx = e.clientX;
    ty = e.clientY;
    ring.classList.add('is-visible');
    if (!running) {
      running = true;
      requestAnimationFrame(follow);
    }
  }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    ring.classList.toggle('is-hover', Boolean(target?.closest('a, button')));
  });
  document.documentElement.addEventListener('pointerleave', () => ring.classList.remove('is-visible'));
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
