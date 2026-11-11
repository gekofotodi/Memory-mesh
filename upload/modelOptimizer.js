/**
 * modelOptimizer.js — Alleggerisce i modelli 3D (.glb) nel browser prima dell'upload (11/11 U1).
 *
 * Caricato solo quando si sceglie un modello 3D (import dinamico da app.js), così chi carica
 * foto o video non scarica queste librerie. Pipeline glTF-Transform:
 *   dedup + prune (dati doppi e inutilizzati) → weld (vertici duplicati) →
 *   simplify (meno poligoni, meshoptimizer) → texture ridotte e ricompresse → quantize.
 * Se qualcosa non riesce (es. modello già compresso Draco), si usa il file originale.
 */

import { WebIO } from 'https://cdn.jsdelivr.net/npm/@gltf-transform/core@4.5.1/+esm';
import { ALL_EXTENSIONS } from 'https://cdn.jsdelivr.net/npm/@gltf-transform/extensions@4.5.1/+esm';
import { dedup, prune, weld, simplify, quantize } from 'https://cdn.jsdelivr.net/npm/@gltf-transform/functions@4.5.1/+esm';
import { MeshoptSimplifier } from 'https://cdn.jsdelivr.net/npm/meshoptimizer@1.3.0/+esm';

/** Livelli proposti all'utente. ratio = quota di vertici da tenere; tex = lato massimo texture. */
export const MODEL_LEVELS = {
  light:  { ratio: 0.2, error: 0.01,  tex: 512,  quality: 0.72 },
  medium: { ratio: 0.5, error: 0.002, tex: 1024, quality: 0.82 },
};

/**
 * @param {File} file  modello .glb
 * @param {'light'|'medium'} level
 * @returns {Promise<File>} nuovo .glb (stesso nome)
 */
export async function optimizeModel(file, level = 'medium') {
  const cfg = MODEL_LEVELS[level];
  if (!cfg) return file;
  await MeshoptSimplifier.ready;
  const io = new WebIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.readBinary(new Uint8Array(await file.arrayBuffer()));
  await doc.transform(
    dedup(),
    prune(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: cfg.ratio, error: cfg.error }),
    shrinkTextures(cfg.tex, cfg.quality),
    quantize(),
    prune(),
  );
  const out = await io.writeBinary(doc);
  const name = file.name.replace(/\.gltf$/i, '.glb');
  return new File([out], name, { type: 'model/gltf-binary' });
}

/**
 * Texture: lato massimo `maxSide` e ricompressione via canvas (il ripiego di glTF-Transform
 * nel browser ignora la qualità). JPEG per tutto, PNG solo per le texture colore di
 * materiali trasparenti (serve il canale alfa). Se il risultato pesa di più, resta l'originale.
 */
function shrinkTextures(maxSide, quality) {
  return async (doc) => {
    const root = doc.getRoot();
    const needsAlpha = new Set();
    root.listMaterials().forEach((m) => {
      if (m.getAlphaMode() !== 'OPAQUE' && m.getBaseColorTexture()) needsAlpha.add(m.getBaseColorTexture());
    });
    for (const tex of root.listTextures()) {
      const img = tex.getImage();
      const mime = tex.getMimeType();
      if (!img || !/^image\/(png|jpeg|webp)$/.test(mime)) continue; // KTX2 ecc.: invariato
      try {
        const bmp = await createImageBitmap(new Blob([img], { type: mime }));
        const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
        const w = Math.max(1, Math.round(bmp.width * k));
        const h = Math.max(1, Math.round(bmp.height * k));
        const canvas = typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(w, h)
          : Object.assign(document.createElement('canvas'), { width: w, height: h });
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bmp, 0, 0, w, h);
        bmp.close && bmp.close();
        const type = needsAlpha.has(tex) ? 'image/png' : 'image/jpeg';
        const blob = canvas.convertToBlob
          ? await canvas.convertToBlob({ type, quality })
          : await new Promise((res) => canvas.toBlob(res, type, quality));
        if (!blob || blob.type !== type) continue;
        const out = new Uint8Array(await blob.arrayBuffer());
        if (out.byteLength >= img.byteLength && k === 1) continue;
        tex.setImage(out).setMimeType(type);
        const uri = tex.getURI();
        if (uri) tex.setURI(uri.replace(/\.(png|jpe?g|webp)$/i, type === 'image/png' ? '.png' : '.jpg'));
      } catch (_) { /* texture non decodificabile: resta com'è */ }
    }
  };
}
