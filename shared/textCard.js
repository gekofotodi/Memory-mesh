/**
 * textCard.js — Card delle memorie testuali, 1200×800 su carta panna.
 * D4 (11/11 sera): testo in Helvetica bold con l'inchiostro sbavato a metà intensità
 * (stessi parametri di shared/inkBleed.js con k = 0.5), al posto del corsivo Caveat.
 *
 * L'effetto è calcolato sui pixel del canvas (rumore + spostamento + sfocatura + soglia + grana),
 * non con un filtro SVG: così la card esce identica sul kiosk (Chrome) e su Safari iOS,
 * che non applica `ctx.filter`. La usa l'upload per creare l'immagine salvata e il display
 * per le memorie testuali senza immagine.
 */

export const TEXT_CARD_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const INK_K = 0.5;       // 0 = inchiostro a riposo dei titoli, 1 = sbavatura piena dell'hover
const INK_COLOR = [0x99, 0x25, 0x1C];

/** Helvetica è un font di sistema: niente da scaricare. Resta per compatibilità con i chiamanti. */
export async function ensureTextCardFont() {}

function wrap(ctx, text, maxWidth) {
  const lines = [];
  for (const para of String(text).split(/\n+/)) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);
  }
  return lines;
}

// ── Rumore (value noise frattale), deterministico per seme ─────────────
function hash(ix, iy, seed) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function valueNoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fractal(x, y, freq, seed) {
  // 2 ottave come feTurbulence numOctaves=2
  return (valueNoise(x * freq, y * freq, seed) * 2 + valueNoise(x * freq * 2, y * freq * 2, seed + 1)) / 3;
}

// Sfocatura gaussiana approssimata con 3 passate di box blur (orizzontale + verticale)
function boxBlur(src, w, h, r) {
  if (r < 1) return src;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const norm = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc * norm;
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * norm;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/**
 * Applica l'inchiostro sbavato all'alfa di `mask` (testo pieno su fondo trasparente)
 * e restituisce un canvas dello stesso formato col testo nel colore dell'inchiostro.
 */
function inkify(mask, fs, k = INK_K) {
  const w = mask.width, h = mask.height;
  const srcData = mask.getContext('2d').getImageData(0, 0, w, h).data;
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = srcData[i * 4 + 3] / 255;

  // 1. Bordi irregolari: spostamento dei pixel guidato dal rumore (feDisplacementMap)
  const freq = Math.min(0.9, Math.max(0.22, 16 / fs));
  const scale = fs * (0.06 + 0.06 * k);
  const rough = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (fractal(x, y, freq, 3) - 0.5) * scale;
      const dy = (fractal(x, y, freq, 17) - 0.5) * scale;
      const sx = Math.min(w - 1, Math.max(0, Math.round(x + dx)));
      const sy = Math.min(h - 1, Math.max(0, Math.round(y + dy)));
      rough[y * w + x] = alpha[sy * w + sx];
    }
  }

  // 2. Espansione dell'inchiostro: sfocatura + soglia alfa (chiude le controforme)
  const sd = fs * (0.03 + 0.045 * k);
  const r = Math.max(1, Math.round((Math.sqrt(4 * sd * sd + 1) - 1) / 2)); // 3 passate ≈ gaussiana di deviazione sd
  let blur = boxBlur(rough, w, h, r);
  blur = boxBlur(blur, w, h, r);
  blur = boxBlur(blur, w, h, r);
  const A = 14;
  const threshold = 0.4 - 0.16 * k;

  // 3. Grana: piccoli vuoti nel pieno
  const grainTh = 0.74 - 0.06 * k;

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d');
  const img = octx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < w * h; i++) {
    let a = Math.min(1, Math.max(0, A * blur[i] - A * threshold));
    if (a > 0) {
      const x = i % w, y = (i / w) | 0;
      const g = (hash(x, y, 11) + hash(x, y, 12) + hash(x, y, 13)) / 3; // ~ gaussiana attorno a 0.5
      const grain = Math.min(1, Math.max(0, 12 * g - 12 * grainTh));
      a *= 1 - grain;
    }
    d[i * 4] = INK_COLOR[0];
    d[i * 4 + 1] = INK_COLOR[1];
    d[i * 4 + 2] = INK_COLOR[2];
    d[i * 4 + 3] = Math.round(a * 255);
  }
  octx.putImageData(img, 0, 0);
  return out;
}

/** Disegna la card e restituisce il canvas. */
export function renderTextCard(text, title = '') {
  const W = 1200, H = 800, PAD = 96;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFDF9';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(153, 37, 28, 0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  const body = String(text || title || '').trim() || '…';
  const maxW = W - PAD * 2;
  const maxH = H - PAD * 2 - (title ? 70 : 0);

  // Testo su una maschera separata (solo alfa), poi l'inchiostro
  const mask = document.createElement('canvas');
  mask.width = W;
  mask.height = H;
  const mctx = mask.getContext('2d');
  if ('letterSpacing' in mctx) mctx.letterSpacing = '-1px';

  // Il testo più grande che entra nella card
  let size = 84, lines = [];
  for (; size >= 32; size -= 4) {
    mctx.font = `700 ${size}px ${TEXT_CARD_FONT}`;
    lines = wrap(mctx, body, maxW);
    if (lines.length * size * 1.14 <= maxH) break;
  }
  const lh = size * 1.14;
  const maxLines = Math.max(1, Math.floor(maxH / lh));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }

  mctx.fillStyle = '#000';
  mctx.textAlign = 'center';
  mctx.textBaseline = 'middle';
  const blockH = lines.length * lh;
  const top = PAD + (maxH - blockH) / 2 + lh / 2;
  lines.forEach((l, i) => mctx.fillText(l, W / 2, top + i * lh));

  try {
    ctx.drawImage(inkify(mask, size), 0, 0);
  } catch (err) {
    // In caso di errore la card resta leggibile: testo pieno senza effetto
    console.warn('[textCard] inchiostro non applicato:', err);
    ctx.font = `700 ${size}px ${TEXT_CARD_FONT}`;
    ctx.fillStyle = '#99251C';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, W / 2, top + i * lh));
  }

  if (title && text) {
    ctx.fillStyle = 'rgba(153, 37, 28, 0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 24px "Instrument Sans", sans-serif';
    ctx.fillText(String(title).toUpperCase(), W / 2, H - PAD + 10);
  }
  return canvas;
}
