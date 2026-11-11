/**
 * textCard.js — Card delle memorie testuali (D30): testo in corsivo calligrafico (Caveat)
 * su carta panna, 1200×800. La usa l'upload per creare l'immagine salvata e il display
 * per le memorie testuali senza immagine (es. dati demo), così si comportano come foto 2D.
 * Il font va caricato nella pagina (Google Fonts, famiglia Caveat).
 */

export const TEXT_CARD_FONT = 'Caveat';

export async function ensureTextCardFont() {
  try {
    await document.fonts.load(`500 60px "${TEXT_CARD_FONT}"`);
  } catch (_) { /* fallback su cursive */ }
}

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
  // Il testo più grande che entra nella card
  let size = 96, lines = [];
  for (; size >= 40; size -= 4) {
    ctx.font = `500 ${size}px "${TEXT_CARD_FONT}", cursive`;
    lines = wrap(ctx, body, maxW);
    if (lines.length * size * 1.12 <= maxH) break;
  }
  const lh = size * 1.12;
  const maxLines = Math.max(1, Math.floor(maxH / lh));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }

  ctx.fillStyle = '#99251C';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const blockH = lines.length * lh;
  const top = PAD + (maxH - blockH) / 2 + lh / 2;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, top + i * lh));

  if (title && text) {
    ctx.fillStyle = 'rgba(153, 37, 28, 0.7)';
    ctx.font = '700 24px "Instrument Sans", sans-serif';
    ctx.fillText(String(title).toUpperCase(), W / 2, H - PAD + 10);
  }
  return canvas;
}
