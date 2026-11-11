/**
 * inkReveal.js — I testi del ricordo compaiono come una macchia d'inchiostro che si allarga
 * (11/11 D3). Ogni testo ha un filtro SVG: sfocatura + bordi irregolari + soglia alfa.
 * All'inizio la sfocatura è ampia e la soglia alta: si vedono solo piccole macchie dove
 * l'inchiostro è più denso; poi la soglia scende e la sfocatura sparisce, le macchie si
 * allargano e si chiudono nelle lettere nitide. In uscita lo stesso al contrario.
 *
 * Un solo loop rAF, attivo solo durante l'animazione. A fine animazione il filtro viene
 * tolto e si ripristina quello che l'elemento aveva (es. ink bleed a riposo del titolo).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const slots = new Map(); // el -> { nodes, id, prevFilter, from, to, start, dur, fs }
let defs = null;
let rafId = 0;
let counter = 0;

function make(tag, attrs) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

function ensureDefs() {
  if (defs) return defs;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  defs = document.createElementNS(SVG_NS, 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);
  return defs;
}

function buildFilter(id) {
  const f = make('filter', { id, x: '-10%', y: '-40%', width: '120%', height: '180%', 'color-interpolation-filters': 'sRGB' });
  const blur = make('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '0', result: 'bl' });
  const noise = make('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.09', numOctaves: '2', seed: String(2 + (counter % 9)), result: 'n' });
  const disp = make('feDisplacementMap', { in: 'bl', in2: 'n', scale: '0', xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' });
  const thresh = make('feColorMatrix', { in: 'd', type: 'matrix', values: '' });
  f.append(blur, noise, disp, thresh);
  ensureDefs().appendChild(f);
  return { blur, disp, thresh };
}

const smooth = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic

// p: 0 = invisibile (macchie non ancora formate), 1 = testo nitido
function applyParams(s, p) {
  const fs = s.fs;
  const q = 1 - p;
  s.nodes.blur.setAttribute('stdDeviation', (fs * 0.3 * q).toFixed(2));
  s.nodes.disp.setAttribute('scale', (fs * 0.5 * q).toFixed(2));
  const A = 9;
  // Soglia alfa: con la sfocatura i tratti si diluiscono (picchi ~0.3-0.4), quindi una
  // soglia vicina al picco lascia vedere solo i nuclei d'inchiostro, che poi si allargano
  const T = 0.2 + 0.2 * q;
  s.nodes.thresh.setAttribute('values', `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${A} ${(-A * T).toFixed(2)}`);
}

function tick(now) {
  rafId = 0;
  let running = false;
  slots.forEach((s, el) => {
    if (!s.active) return;
    const t = Math.min(1, Math.max(0, (now - s.start) / s.dur));
    if (now < s.start) { running = true; return; }
    const p = s.from + (s.to - s.from) * smooth(t);
    applyParams(s, p);
    el.style.opacity = String(Math.min(1, p * 4));
    if (t >= 1) {
      s.active = false;
      el.style.filter = s.prevFilter;
      if (s.to >= 1) el.style.opacity = '';
    } else {
      running = true;
    }
  });
  if (running) rafId = requestAnimationFrame(tick);
}

function slotFor(el) {
  let s = slots.get(el);
  if (!s) {
    const id = `ink-reveal-${++counter}`;
    s = { id, nodes: buildFilter(id), active: false, prevFilter: '' };
    slots.set(el, s);
  }
  return s;
}

/**
 * Anima gli elementi: items = [{ el, delay, dur }], dir 'in' (compaiono) o 'out' (spariscono).
 */
export function inkReveal(items, dir = 'in') {
  const now = performance.now();
  items.forEach(({ el, delay = 0, dur = 650 }) => {
    if (!el) return;
    const s = slotFor(el);
    if (!s.active) s.prevFilter = el.style.filter || '';
    s.fs = parseFloat(getComputedStyle(el).fontSize) || 16;
    s.from = dir === 'in' ? 0 : 1;
    s.to = dir === 'in' ? 1 : 0;
    s.start = now + delay;
    s.dur = dur;
    s.active = true;
    applyParams(s, s.from);
    el.style.filter = `url(#${s.id})`;
    el.style.opacity = dir === 'in' ? '0' : '1';
  });
  if (!rafId) rafId = requestAnimationFrame(tick);
}

/** Interrompe tutto e lascia gli elementi senza stili inline dell'animazione. */
export function resetInkReveal() {
  slots.forEach((s, el) => {
    if (s.active) el.style.filter = s.prevFilter;
    s.active = false;
    el.style.opacity = '';
  });
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
}
