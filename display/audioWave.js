/**
 * audioWave.js — Forma d'onda reale di un file audio (D29).
 *
 * Decodifica il file una volta (cache per URL), ne ricava l'intensità per ogni barra
 * e la disegna come linee verticali di altezze diverse; la parte già ascoltata è piena.
 * Se il file non si può leggere (CORS, formato), usa una forma stabile ricavata dall'URL.
 */

const BARS = 64;
const cache = new Map();

export function loadPeaks(url) {
  if (!url) return Promise.resolve(fallbackPeaks(''));
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url)
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
    .then((buf) => {
      const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      return new AC(1, 2, 44100).decodeAudioData(buf);
    })
    .then(computePeaks)
    .catch((err) => {
      console.warn('[audio] Forma d\'onda non leggibile, uso quella di riserva:', err && err.message);
      return fallbackPeaks(url);
    });
  cache.set(url, p);
  return p;
}

// Intensità (RMS) per barra, normalizzata 0..1 e con radice per non schiacciare i passaggi piani
function computePeaks(audio) {
  const chans = [];
  for (let c = 0; c < Math.min(2, audio.numberOfChannels); c++) chans.push(audio.getChannelData(c));
  const len = chans[0].length;
  const bucket = Math.max(1, Math.floor(len / BARS));
  const stride = Math.max(1, Math.floor(bucket / 2000)); // campiona: veloce anche su file lunghi
  const peaks = [];
  for (let b = 0; b < BARS; b++) {
    let sum = 0, n = 0;
    const end = Math.min(len, (b + 1) * bucket);
    for (let i = b * bucket; i < end; i += stride) {
      let v = 0;
      for (const ch of chans) v += ch[i];
      v /= chans.length;
      sum += v * v;
      n++;
    }
    peaks.push(n ? Math.sqrt(sum / n) : 0);
  }
  const max = Math.max(...peaks) || 1;
  return peaks.map((v) => Math.sqrt(v / max));
}

function fallbackPeaks(url) {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) h = Math.imul(h ^ url.charCodeAt(i), 16777619);
  const peaks = [];
  let v = 0.5;
  for (let b = 0; b < BARS; b++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    v = v * 0.55 + (((h >>> 0) % 1000) / 1000) * 0.45;
    peaks.push(0.2 + v * 0.8);
  }
  return peaks;
}

/** Disegna le barre; progress 0..1 = parte ascoltata. peaks null = caricamento (barre basse). */
export function drawWave(canvas, peaks, progress) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const n = peaks ? peaks.length : BARS;
  const gap = w / n;
  const barW = Math.max(2, gap * 0.42);
  ctx.lineCap = 'round';
  ctx.lineWidth = barW;
  for (let i = 0; i < n; i++) {
    const v = peaks ? peaks[i] : 0.12;
    const bh = Math.max(barW, v * (h - barW * 2));
    const x = gap * (i + 0.5);
    ctx.strokeStyle = (i + 0.5) / n <= progress ? '#99251C' : 'rgba(153, 37, 28, 0.26)';
    ctx.beginPath();
    ctx.moveTo(x, h / 2 - bh / 2);
    ctx.lineTo(x, h / 2 + bh / 2);
    ctx.stroke();
  }
}
