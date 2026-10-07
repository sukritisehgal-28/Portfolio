/**
 * Gradient field: soft colour blobs (or a grid of pixel boxes) drawn on a canvas behind a section.
 * The blobs drift toward the mouse with a little depth (closer blobs move more), only animate while
 * the section is on screen, and hold still for people who prefer reduced motion.
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/**
 * @param {HTMLElement} host  section to paint behind (should be position: relative)
 * @param {object} o
 *   style     'soft' | 'pixel'
 *   cell      size of one pixel box (pixel) or of one sample (soft), in CSS px
 *   gap       space between pixel boxes, in CSS px
 *   base      (y from 0 to 1) => [r, g, b], the colour under the blobs
 *   blobs     [{ x, y, r, c: [r, g, b], depth }], positions and radii as fractions of the section
 *   strength  how strongly the blobs colour the base, 0 to 1 (lower is more faded)
 *   range     how far the blobs travel toward the cursor, as a fraction of the section
 *   falloff   how quickly a blob fades toward its edge (higher is tighter)
 *   drift     how far the blobs wander on their own, as a fraction of the section
 *   dither    pixel style only: snap colours to steps with an ordered dither, so
 *             neighbouring boxes come out in slightly different colours
 */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const STEP = 14;
export function gradientField(host, o) {
  const canvas = document.createElement('canvas');
  canvas.className = 'field-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  host.classList.add('has-field');
  const ctx = canvas.getContext('2d');
  const sample = document.createElement('canvas');
  const sctx = sample.getContext('2d');

  let w = 0;
  let h = 0;
  let dpr = 1;
  let px = 0;
  let py = 0;
  let tx = 0;
  let ty = 0;
  let running = false;
  let visible = false;

  const resize = () => {
    const rect = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
  };

  const falloff = o.falloff ?? 2.2;
  const colourAt = (x, y, pos) => {
    let c = o.base(y);
    // radii are fractions of the width, widened on tall (portrait) sections so blobs keep their size
    const scale = Math.max(1, (1.6 * h) / w);
    for (const p of pos) {
      const dx = x - p.x;
      const dy = (y - p.y) * (h / w);
      const r = p.r * scale;
      const k = Math.exp(-((dx * dx + dy * dy) / (r * r)) * falloff) * o.strength;
      c = mix(c, p.c, k);
    }
    return c;
  };

  const ditherCell = (c, i, j) => {
    const t = (BAYER[(j % 4) * 4 + (i % 4)] / 16 - 0.5) * STEP;
    return c.map((v) => Math.max(0, Math.min(255, Math.round((v + t) / STEP) * STEP)));
  };

  const draw = (time) => {
    const sec = time / 1000;
    const drift = reduceMotion ? 0 : (o.drift ?? 0.012);
    const pos = o.blobs.map((b, i) => ({
      x: b.x + px * o.range * b.depth + Math.sin(sec * 0.35 + (b.ph ?? i * 1.7)) * drift,
      y: b.y + py * o.range * b.depth + Math.cos(sec * 0.3 + (b.ph ?? i * 1.3)) * drift,
      r: b.r,
      c: b.c,
    }));
    if (o.style === 'pixel') {
      const cols = Math.ceil(w / o.cell);
      const rows = Math.ceil(h / o.cell);
      const ox = (w - cols * o.cell) / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const [br, bg, bb] = o.base(0.5).map(Math.round);
      ctx.fillStyle = `rgb(${br}, ${bg}, ${bb})`;
      ctx.fillRect(0, 0, w, h);
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const cx = (ox + (i + 0.5) * o.cell) / w;
          const cy = ((j + 0.5) * o.cell) / h;
          const raw = colourAt(cx, cy, pos);
          const [r, g, b] = o.dither ? ditherCell(raw, i, j) : raw.map(Math.round);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(ox + i * o.cell, j * o.cell, o.cell - o.gap, o.cell - o.gap);
        }
      }
    } else {
      const cols = Math.max(2, Math.ceil(w / o.cell));
      const rows = Math.max(2, Math.ceil(h / o.cell));
      sample.width = cols;
      sample.height = rows;
      const img = sctx.createImageData(cols, rows);
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const [r, g, b] = colourAt(i / (cols - 1), j / (rows - 1), pos);
          const k = (j * cols + i) * 4;
          img.data[k] = r;
          img.data[k + 1] = g;
          img.data[k + 2] = b;
          img.data[k + 3] = 255;
        }
      }
      sctx.putImageData(img, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sample, 0, 0, canvas.width, canvas.height);
    }
  };

  const loop = (time) => {
    px += (tx - px) * 0.07;
    py += (ty - py) * 0.07;
    draw(time);
    if (visible) requestAnimationFrame(loop);
    else running = false;
  };

  const start = () => {
    if (running || reduceMotion) return;
    running = true;
    requestAnimationFrame(loop);
  };

  // Lean toward the cursor wherever it is on the page, relative to this section's centre
  if (!reduceMotion) {
    window.addEventListener('pointermove', (e) => {
      if (!visible || e.pointerType === 'touch') return;
      const rect = host.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
    }, { passive: true });
  }

  resize();
  draw(0);
  window.addEventListener('resize', () => {
    resize();
    draw(performance.now());
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    }).observe(host);
  }
}
