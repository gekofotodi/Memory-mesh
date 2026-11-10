/**
 * inkBleed.js — Effetto "inchiostro che sbava" per titoli e menu (Helvetica).
 *
 * A riposo ogni elemento registrato ha un proprio filtro SVG leggero
 * (bordi irregolari + lieve espansione dell'inchiostro + grana), tarato sul
 * suo font-size. In hover NON si intensifica tutta la parola: un doppione
 * del testo con filtro più carico compare solo attorno al cursore, ritagliato
 * da una maschera radiale che segue il puntatore.
 *
 * Modalità hover:
 *  - 'pointer' → eventi pointer nativi (upload, mouse reale)
 *  - 'manual'  → il chiamante invoca setInkHoverPoint(x, y) (display: cursore virtuale)
 *
 * Un solo loop rAF, attivo solo mentre c'è qualcosa da animare.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Intensità massima della zona in hover (1 = versione precedente, -30%). */
const HOVER_STRENGTH = 0.7;
/** Raggio della zona di sbavatura, in multipli del font-size. */
const HOVER_RADIUS_EM = 1.1;

const registry = new Map(); // el -> entry
let defsEl = null;
let rafId = 0;
let counter = 0;
let opts = { selector: '', hover: 'pointer' };
let hovered = null;

const reduceMotion = typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function ensureDefs() {
  if (defsEl) return defsEl;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  defsEl = document.createElementNS(SVG_NS, 'defs');
  svg.appendChild(defsEl);
  document.body.appendChild(svg);
  return defsEl;
}

function make(tag, attrs) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

function buildFilter(id) {
  const f = make('filter', {
    id,
    x: '-15%', y: '-30%', width: '130%', height: '160%',
    'color-interpolation-filters': 'sRGB',
  });
  // 1. Rumore a bassa frequenza → bordi irregolari, come stampa su carta
  const edgeNoise = make('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.5', numOctaves: '2', seed: String(3 + (counter % 7)), result: 'edgeNoise' });
  const displace = make('feDisplacementMap', { in: 'SourceGraphic', in2: 'edgeNoise', scale: '1', xChannelSelector: 'R', yChannelSelector: 'G', result: 'rough' });
  // 2. Blur + soglia alfa → l'inchiostro si espande e chiude le controforme
  const blur = make('feGaussianBlur', { in: 'rough', stdDeviation: '0.5', result: 'blur' });
  const thresh = make('feColorMatrix', { in: 'blur', type: 'matrix', values: '', result: 'ink' });
  // 3. Grana: piccoli vuoti nel pieno (texture tipografica)
  const grainNoise = make('feTurbulence', { type: 'fractalNoise', baseFrequency: '1.4', numOctaves: '1', seed: '11', result: 'grainNoise' });
  const grainMask = make('feColorMatrix', { in: 'grainNoise', type: 'matrix', values: '', result: 'grain' });
  const out = make('feComposite', { in: 'ink', in2: 'grain', operator: 'out' });
  f.append(edgeNoise, displace, blur, thresh, grainNoise, grainMask, out);
  ensureDefs().appendChild(f);
  return { filter: f, edgeNoise, displace, blur, thresh, grainMask };
}

/** Parametri del filtro per intensità k (0 = riposo, 1 = sbavatura piena). */
function applyParams(nodes, fs, k) {
  k = Math.max(0, k);
  nodes.edgeNoise.setAttribute('baseFrequency', String(Math.min(0.9, Math.max(0.22, 16 / fs))));
  nodes.displace.setAttribute('scale', (fs * (0.06 + 0.06 * k)).toFixed(2));
  nodes.blur.setAttribute('stdDeviation', (fs * (0.03 + 0.045 * k)).toFixed(2));
  // alpha' = A·a + B → soglia = -B/A; soglia più bassa = più inchiostro
  const A = 14;
  const threshold = 0.4 - 0.16 * k;
  nodes.thresh.setAttribute('values', `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${A} ${(-A * threshold).toFixed(2)}`);
  const th = 0.74 - 0.06 * k;
  nodes.grainMask.setAttribute('values', `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  12 0 0 0 ${(-12 * th).toFixed(2)}`);
}

function readFontSize(el, fallback = 24) {
  return parseFloat(getComputedStyle(el).fontSize) || fallback;
}

function register(el) {
  if (registry.has(el) || el.classList.contains('ink-hot')) return;
  const id = `ink-bleed-${++counter}`;
  const entry = {
    id,
    fs: readFontSize(el),
    base: buildFilter(id),
    hot: null,       // filtro della zona in hover (creato al primo hover)
    overlay: null,   // doppione del testo, mascherato attorno al cursore
    t: 0, target: 0, // intensità animata della zona in hover
    px: 0, py: 0,    // posizione cursore in coordinate locali (target)
    lx: 0, ly: 0,    // posizione cursore smussata
  };
  registry.set(el, entry);
  applyParams(entry.base, entry.fs, 0);
  el.style.filter = `url(#${id})`;
  if (opts.hover === 'pointer') {
    el.addEventListener('pointerenter', (e) => { hoverAt(el, e.clientX, e.clientY, true); });
    el.addEventListener('pointermove', (e) => { hoverAt(el, e.clientX, e.clientY, false); });
    el.addEventListener('pointerleave', () => setTarget(el, 0));
  }
}

function unregister(el) {
  const entry = registry.get(el);
  if (!entry) return;
  entry.base.filter.remove();
  if (entry.hot) entry.hot.filter.remove();
  if (entry.overlay) entry.overlay.remove();
  registry.delete(el);
  if (hovered === el) hovered = null;
}

function scan(root = document) {
  if (root.matches && root.matches(opts.selector)) register(root);
  if (root.querySelectorAll) root.querySelectorAll(opts.selector).forEach(register);
}

/** Crea (o riallinea al contenuto attuale) il doppione del testo per la zona in hover. */
function ensureOverlay(el, entry) {
  if (!entry.hot) entry.hot = buildFilter(`${entry.id}-hot`);
  const cs = getComputedStyle(el);
  if (cs.position === 'static') el.style.position = 'relative';
  let ov = entry.overlay;
  if (!ov || !ov.isConnected) {
    ov = document.createElement('span');
    ov.className = 'ink-hot';
    ov.setAttribute('aria-hidden', 'true');
    entry.overlay = ov;
  }
  // Copia il contenuto attuale (esclusa la sovrapposizione stessa)
  ov.replaceChildren(...[...el.childNodes].filter((n) => n !== ov).map((n) => n.cloneNode(true)));
  ov.style.cssText = [
    'position:absolute', 'inset:0', 'pointer-events:none', 'box-sizing:border-box',
    `display:${cs.display === 'inline' ? 'block' : cs.display}`,
    `flex-direction:${cs.flexDirection}`, `align-items:${cs.alignItems}`,
    `justify-content:${cs.justifyContent}`, `gap:${cs.gap}`,
    `padding:${cs.padding}`, `text-align:${cs.textAlign}`,
    `filter:url(#${entry.id}-hot)`,
    '-webkit-mask-repeat:no-repeat', 'mask-repeat:no-repeat',
  ].join(';');
  if (ov.parentNode !== el) el.appendChild(ov);
}

function removeOverlay(entry) {
  if (entry.overlay) entry.overlay.remove();
}

/** Converte un punto viewport in coordinate locali dell'elemento (gestisce rotazioni/scale). */
function toLocal(el, x, y) {
  const r = el.getBoundingClientRect();
  const w = el.offsetWidth || r.width;
  const h = el.offsetHeight || r.height;
  // Parte lineare della trasformazione cumulata (elemento + antenati)
  let m = new DOMMatrix();
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const tr = getComputedStyle(n).transform;
    if (tr && tr !== 'none') m = new DOMMatrix(tr).multiply(m);
  }
  const a = m.a, b = m.b, c = m.c, d = m.d;
  const det = a * d - b * c || 1;
  const dx = x - (r.left + r.width / 2);
  const dy = y - (r.top + r.height / 2);
  return {
    x: w / 2 + (d * dx - c * dy) / det,
    y: h / 2 + (-b * dx + a * dy) / det,
  };
}

function hoverAt(el, x, y, snap) {
  const entry = registry.get(el);
  if (!entry) return;
  const p = toLocal(el, x, y);
  entry.px = p.x;
  entry.py = p.y;
  if (snap || entry.t < 0.01) { entry.lx = p.x; entry.ly = p.y; }
  setTarget(el, 1);
}

function setTarget(el, target) {
  const entry = registry.get(el);
  if (!entry) return;
  if (target > 0 && entry.target === 0) ensureOverlay(el, entry);
  entry.target = target;
  if (!rafId) rafId = requestAnimationFrame(tick);
}

function renderHot(entry, now) {
  const ov = entry.overlay;
  if (!ov) return;
  // Respirazione lenta mentre il puntatore resta sopra
  const wobble = !reduceMotion && entry.target > 0 ? Math.sin(now / 420 + entry.fs) * 0.1 : 0;
  applyParams(entry.hot, entry.fs, HOVER_STRENGTH * (1 + wobble));
  const r = entry.fs * HOVER_RADIUS_EM * (0.35 + 0.65 * entry.t);
  const mask = `radial-gradient(circle ${r.toFixed(1)}px at ${entry.lx.toFixed(1)}px ${entry.ly.toFixed(1)}px, rgba(0,0,0,${entry.t.toFixed(3)}) 0%, rgba(0,0,0,${(entry.t * 0.6).toFixed(3)}) 45%, transparent 100%)`;
  ov.style.webkitMaskImage = mask;
  ov.style.maskImage = mask;
}

function tick(now) {
  rafId = 0;
  let active = false;
  for (const [el, entry] of registry) {
    if (!el.isConnected) { unregister(el); continue; }
    if (entry.target === 0 && entry.t === 0) continue;
    if (reduceMotion) {
      entry.t = entry.target;
      entry.lx = entry.px; entry.ly = entry.py;
    } else {
      const d = entry.target - entry.t;
      // salita più rapida della discesa: l'inchiostro "assorbe" subito, si ritira piano
      entry.t = Math.abs(d) < 0.003 ? entry.target : entry.t + d * (d > 0 ? 0.14 : 0.07);
      entry.lx += (entry.px - entry.lx) * 0.22;
      entry.ly += (entry.py - entry.ly) * 0.22;
    }
    if (entry.t === 0) { removeOverlay(entry); continue; }
    renderHot(entry, now);
    if (!reduceMotion) active = true;
  }
  if (active) rafId = requestAnimationFrame(tick);
}

function isVisible(el) {
  if (el.checkVisibility) return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  return el.offsetParent !== null;
}

/**
 * Modalità 'manual': passa la posizione del cursore (coordinate viewport).
 * Hit test per rettangolo, così funziona anche su elementi con pointer-events:none.
 */
export function setInkHoverPoint(x, y) {
  let hit = null;
  for (const [el, entry] of registry) {
    const r = el.getBoundingClientRect();
    const pad = entry.fs * 0.25; // la zona si attiva già avvicinandosi ai bordi
    if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad && isVisible(el)) { hit = el; break; }
  }
  if (hovered && hovered !== hit) setTarget(hovered, 0);
  hovered = hit;
  if (hit) hoverAt(hit, x, y, false);
}

/**
 * @param {object} o
 * @param {string} o.selector  elementi da trattare (anche aggiunti in seguito)
 * @param {'pointer'|'manual'} [o.hover]
 */
export function initInkBleed({ selector, hover = 'pointer' }) {
  opts = { selector, hover };
  scan();
  // Registra anche gli elementi creati dinamicamente (es. voci del wheel menu)
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes.forEach((n) => { if (n.nodeType === 1 && !n.classList.contains('ink-hot')) scan(n); });
      m.removedNodes.forEach((n) => {
        if (n.nodeType !== 1 || n.classList.contains('ink-hot')) return;
        for (const el of [...registry.keys()]) if (!el.isConnected) unregister(el);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  // Il font-size può cambiare (clamp/vw) → ricalcola al resize
  window.addEventListener('resize', () => {
    for (const [el, entry] of registry) {
      entry.fs = readFontSize(el, entry.fs);
      applyParams(entry.base, entry.fs, 0);
    }
  });
}
