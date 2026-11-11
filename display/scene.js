/**
 * Scene Module — Light Mode Editorial Canvas Engine (/display)
 * Complete 5-Mode Exhibition Engine
 *
 * 1. Planimetria: Assonometria su 3 piani con animazione di discesa/salita e stanze di Stoà.
 * 2. Cluster: Isole organiche a insiemi sovrapposti (Venn) basati sui tag tematici.
 * 3. Timeline: Asse orizzontale continuo in basso con steli verso l'alto e zoom semantico (anni -> mesi).
 * 4. Nodi: Costellazione fluttuante a forze fisiche con focus relazionale su puntamento.
 * 5. Griglia: Matrice da archivio fotografico a larghezza schermo e pan solo verticale.
 *
 * Thumbnail rule: solo bordo caldo (#EADBCE / #99251C su hover), nessuna cornice/passe-partout panna.
 */

// ── 1. Planimetria: 3 Livelli Assonometrici e Stanze Reali di Stoà ──
const FLOORS = {
  terra: {
    id: 'terra',
    label: 'Piano Terra',
    elevation: 0,
    rooms: {
      'sala del re': { x: -50,  y: 30,   w: 220, h: 160, label: 'Sala del Re' }, // TODO: coordinate provvisorie, planimetria da aggiornare
      cucina:      { x: -250, y: -80,  w: 160, h: 140, label: 'Cucina' },
      studio:      { x: 150,  y: -70,  w: 170, h: 130, label: 'Studio' },
      ghiacciaia:  { x: -250, y: 110,  w: 150, h: 120, label: 'Ghiacciaia' },
      giardino:    { x: 300,  y: 90,   w: 240, h: 190, label: 'Giardino' },
      esterno:     { x: -70,  y: 250,  w: 280, h: 130, label: 'Esterno' },
    }
  },
  primo: {
    id: 'primo',
    label: 'Primo Piano',
    elevation: 1,
    rooms: {
      'sala conferenze': { x: -80, y: 0, w: 290, h: 200, label: 'Sala Conferenze' },
      camere:            { x: 190, y: 0, w: 230, h: 200, label: 'Camere' },
    }
  },
  secondo: {
    id: 'secondo',
    label: 'Secondo Piano',
    elevation: 2,
    rooms: {
      mansarda:   { x: -80, y: 0, w: 270, h: 190, label: 'Mansarda' },
      cappellina: { x: 180, y: 0, w: 190, h: 190, label: 'Cappellina' },
    }
  }
};

// ── 2. Palette Tematica Isole Cluster ──────────────────────────
const CLUSTER_PALETTE = {
  studio:        { stroke: '#2E6BFF', fill: 'rgba(46, 107, 255, 0.05)' },
  evento:        { stroke: '#D63031', fill: 'rgba(214, 48, 49, 0.05)' },
  'vita comune': { stroke: '#00B894', fill: 'rgba(0, 184, 148, 0.05)' },
  fede:          { stroke: '#9B51E0', fill: 'rgba(155, 81, 224, 0.05)' },
  musica:        { stroke: '#E17055', fill: 'rgba(225, 112, 85, 0.05)' },
  amici:         { stroke: '#00A8FF', fill: 'rgba(0, 168, 255, 0.05)' },
  relax:         { stroke: '#576574', fill: 'rgba(87, 101, 116, 0.05)' },
  cibo:          { stroke: '#F39C12', fill: 'rgba(243, 156, 18, 0.05)' },
  arte:          { stroke: '#E84393', fill: 'rgba(232, 67, 147, 0.05)' },
  festa:         { stroke: '#C23616', fill: 'rgba(194, 54, 22, 0.05)' },
  carità:        { stroke: '#4B7BEC', fill: 'rgba(75, 123, 236, 0.05)' },
  default:       { stroke: '#99251C', fill: 'rgba(153, 37, 28, 0.05)' },
};

function getTagPalette(tag) {
  if (!tag) return CLUSTER_PALETTE.default;
  const norm = String(tag).toLowerCase().trim();
  if (CLUSTER_PALETTE[norm]) return CLUSTER_PALETTE[norm];

  const PALETTES = [
    { stroke: '#D63031', fill: 'rgba(214, 48, 49, 0.05)' },
    { stroke: '#00A8FF', fill: 'rgba(0, 168, 255, 0.05)' },
    { stroke: '#00B894', fill: 'rgba(0, 184, 148, 0.05)' },
    { stroke: '#F39C12', fill: 'rgba(243, 156, 18, 0.05)' },
    { stroke: '#9B51E0', fill: 'rgba(155, 81, 224, 0.05)' },
    { stroke: '#E17055', fill: 'rgba(225, 112, 85, 0.05)' },
    { stroke: '#E84393', fill: 'rgba(232, 67, 147, 0.05)' },
    { stroke: '#4B7BEC', fill: 'rgba(75, 123, 236, 0.05)' },
  ];
  let hash = 0;
  for (let i = 0; i < norm.length; i++) hash = (hash * 31 + norm.charCodeAt(i)) & 0xffffffff;
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

const MONTH_NAMES = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];

/**
 * Inizializza il canvas engine per la modalità Display
 * @param {HTMLCanvasElement} canvas
 */
import { renderTextCard, ensureTextCardFont } from '../shared/textCard.js';

// D30: chiave cache della card generata per le memorie testuali senza immagine
const textCardKey = (m) => `textcard:${String(m.id)}`;

export function initScene(canvas) {
  const ctx = canvas.getContext('2d');

  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = window.devicePixelRatio || 1;

  // ── Camera (World to Screen) ─────────────────────────────────
  const camera = {
    x: 0,
    y: 0,
    zoom: 1,
    targetX: 0,
    targetY: 0,
    targetZoom: 1,
    minZoom: 0.35,
    maxZoom: 2.8,
  };

  // Inquadratura automatica: fasce libere per header (alto) e HUD/Info (basso)
  const FIT_PAD_TOP = 130;
  const FIT_PAD_BOTTOM = 120;
  const FIT_PAD_X = 90;
  let fitZoom = 1; // zoom di riferimento dell'ultima inquadratura (per lo zoom semantico)

  // ── Scene State ──────────────────────────────────────────────
  let currentLayout = 'nodi';
  let currentFilter = 'all';
  let activeFloor = 'terra';
  let planimetriaEntranceTime = 0;
  // 11/11 D5: cambio piano = il piano corrente torna nell'esploso, poi scende il nuovo
  let floorSwitch = null; // { from, e0, start, dur }
  let gridSortMode = 'data';
  let focusedTimelineYear = null;
  let focusedClusterTag = null;
  // D4: rotazione della nuvola 3D dei nodi
  let cloudRotY = 0.4, cloudRotX = -0.18, cloudR = 300;
  const CLOUD_FOCAL = 1500;
  let drawOrder = [];          // ordine di disegno (in nodi: dal fondo al davanti)
  let focusedRoom = null;      // D5: stanza aperta in planimetria (chiave di FLOORS[activeFloor].rooms)
  let planZoomAccum = 1;       // D5: zoom accumulato in planimetria (soglie per entrare/uscire)
  // D14: anno aperto — lo scorrimento orizzontale passa all'anno prima/dopo, l'anno resta centrato
  let tlSwipe = 0;             // trascinamento accumulato (px schermo)
  let tlSwipeAt = 0;           // ultimo pan ricevuto
  let tlYearCamX = 0;          // posizione camera dell'anno centrato
  let tlSwitchAt = 0;          // ultimo cambio anno da trascinamento
  let tlZoomOut = 1;           // D12: zoom-out accumulato per tornare a tutti gli anni

  let memories = [];
  let nodes = [];
  let hoveredNode = null;
  let hoveredTimelineItem = null;
  let pointerScreen = { x: -9999, y: -9999 };

  // Image & Video thumbnail canvas cache
  const imageCache = new Map();

  // Dimensioni miniature: vincoli larghezza minima e massima (aspect ratio nativo preservato)
  const MIN_NODE_W = 68;
  const MAX_NODE_W = 105;
  const DEFAULT_NODE_W = 86;
  const THUMB_R = 0;

  /**
   * Applica il rapporto originale del media a un nodo, vincolando solo la larghezza (min/max)
   * e ricavando l'altezza proporzionale esatta: h = w / aspect
   */
  function applyNodeAspectRatio(node, aspect) {
    if (!aspect || !isFinite(aspect) || aspect <= 0) return;
    node.aspectRatio = aspect;
    // Larghezza proporzionata: i panoramici si espandono verso MAX_NODE_W, i verticali si stringono verso MIN_NODE_W
    const proportionalW = Math.round(84 * Math.sqrt(aspect));
    const clampedW = Math.min(MAX_NODE_W, Math.max(MIN_NODE_W, proportionalW));
    node.w = clampedW;
    node.h = Math.round(clampedW / aspect);
  }

  /**
   * Estrae il primo frame del video per usarlo come copertina del ricordo
   */
  function extractVideoFirstFrame(url, onFrameReady) {
    if (!url) return;
    if (imageCache.has(url)) {
      if (onFrameReady) onFrameReady(imageCache.get(url));
      return;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let resolved = false;
    const captureFrame = () => {
      if (resolved) return;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        resolved = true;
        try {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = video.videoWidth;
          offCanvas.height = video.videoHeight;
          const octx = offCanvas.getContext('2d');
          octx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

          imageCache.set(url, offCanvas);
          if (onFrameReady) onFrameReady(offCanvas);
        } catch (err) {
          console.warn('[scene] Video snapshot canvas warning (CORS):', err);
        } finally {
          video.pause();
          video.removeAttribute('src');
          video.load();
        }
      }
    };

    video.addEventListener('loadeddata', () => {
      try {
        video.currentTime = Math.min(0.1, (video.duration || 1) * 0.05);
      } catch (_) {
        captureFrame();
      }
    }, { once: true });

    video.addEventListener('seeked', () => {
      captureFrame();
    }, { once: true });

    video.addEventListener('error', (err) => {
      console.warn('[scene] Impossibile caricare copertina video:', url, err);
    }, { once: true });

    // Fallback timer se seeked non scatta
    setTimeout(() => {
      if (!resolved && video.readyState >= 2) {
        captureFrame();
      }
    }, 2200);

    video.src = url;
  }

  // ── Fabric Wave Distortion State ─────────────────────────────
  const fabricWave = {
    active: false,
    startTime: 0,
    duration: 4600,
    centerX: 0,
    centerY: 0,
    amplitude: 24,
    frequency: 0.010,
    speed: 300,
  };

  // ── Resize ───────────────────────────────────────────────────
  function resize() {
    // Usa clientWidth/clientHeight per evitare l'overflow di 100vw con scrollbar
    width = document.documentElement.clientWidth || window.innerWidth;
    height = document.documentElement.clientHeight || window.innerHeight;
    dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    recalculateLayoutTargets();
    fitCurrentLayout();
  }
  window.addEventListener('resize', resize);
  resize();

  // ── Coordinate Transforms ────────────────────────────────────
  function screenToWorld(sx, sy) {
    return {
      x: (sx - width / 2) / camera.zoom + camera.x,
      y: (sy - height / 2) / camera.zoom + camera.y,
    };
  }

  // ── Wave offset ──────────────────────────────────────────────
  function getWaveOffset(wx, wy, now) {
    if (!fabricWave.active) return { dx: 0, dy: 0 };

    const elapsed = now - fabricWave.startTime;
    if (elapsed > fabricWave.duration) {
      fabricWave.active = false;
      return { dx: 0, dy: 0 };
    }

    const progress = elapsed / fabricWave.duration;
    const envelope = Math.sin(progress * Math.PI) * (1.0 - progress * 0.4);
    const dist = Math.hypot(wx - fabricWave.centerX, wy - fabricWave.centerY);
    const waveFront = elapsed * (fabricWave.speed / 1000);
    const distFromFront = Math.abs(dist - waveFront);

    const ripple = Math.exp(-distFromFront * 0.015) * Math.sin((dist - waveFront) * fabricWave.frequency);
    const amp = fabricWave.amplitude * envelope * ripple;
    const angle = Math.atan2(wy - fabricWave.centerY, wx - fabricWave.centerX);

    return {
      dx: Math.cos(angle) * amp,
      dy: Math.sin(angle) * amp,
    };
  }

  function triggerFabricWave(originX = 0, originY = 0) {
    fabricWave.active = true;
    fabricWave.startTime = performance.now();
    fabricWave.centerX = originX;
    fabricWave.centerY = originY;
  }

  // ── Date parsing helper ──────────────────────────────────────
  const ITALIAN_MONTHS_MAP = {
    gennaio: 1, gen: 1, january: 1, jan: 1,
    febbraio: 2, feb: 2, february: 2, feb: 2,
    marzo: 3, mar: 3, march: 3,
    aprile: 4, apr: 4, april: 4,
    maggio: 5, mag: 5, may: 5,
    giugno: 6, giu: 6, june: 6, jun: 6,
    luglio: 7, lug: 7, july: 7, jul: 7,
    agosto: 8, ago: 8, august: 8, aug: 8,
    settembre: 9, set: 9, september: 9, sep: 9,
    ottobre: 10, ott: 10, october: 10, oct: 10,
    novembre: 11, nov: 11, november: 11,
    dicembre: 12, dic: 12, december: 12, dec: 12,
  };

  function parseMemoryDate(mem) {
    let year = 2024;
    let month = 1;
    let day = 1;

    if (mem.created_at) {
      const d = new Date(mem.created_at);
      if (!isNaN(d.getFullYear())) {
        year = d.getFullYear();
        month = d.getMonth() + 1;
        day = d.getDate();
      }
    }
    const iso = mem.time_event && String(mem.time_event).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      return { year: +iso[1], month: +iso[2], day: +iso[3] };
    }
    if (mem.time_event) {
      const str = String(mem.time_event).toLowerCase();
      const matchYear = str.match(/\b(20\d\d|19\d\d)\b/);
      if (matchYear) year = parseInt(matchYear[1], 10);
      const matchMonth = str.match(/[-/.](0[1-9]|1[0-2])[-/.]/);
      if (matchMonth) {
        month = parseInt(matchMonth[1], 10);
      } else {
        for (const [mName, mNum] of Object.entries(ITALIAN_MONTHS_MAP)) {
          if (str.includes(mName)) {
            month = mNum;
            break;
          }
        }
      }
    }
    return { year, month, day };
  }

  /**
   * Ritorna gli anni distinti in ordine cronologico invertito (dal più vecchio al più recente: a - b)
   */
  function getDistinctYears() {
    const years = new Set();
    memories.forEach((m) => years.add(parseMemoryDate(m).year));
    return Array.from(years).sort((a, b) => a - b);
  }

  function getDistinctTags() {
    const tagMap = new Map();
    memories.forEach((m) => {
      if (Array.isArray(m.tags)) {
        m.tags.forEach((rawT) => {
          if (!rawT || typeof rawT !== 'string') return;
          const trimmed = rawT.trim();
          if (!trimmed) return;
          const lower = trimmed.toLowerCase();
          if (!tagMap.has(lower)) {
            const display = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
            tagMap.set(lower, display);
          }
        });
      }
    });

    // Ritorna esclusivamente i tag che appartengono ad almeno un ricordo effettivo
    return Array.from(tagMap.values()).filter((displayTag) => {
      const lower = displayTag.toLowerCase();
      return memories.some((m) =>
        Array.isArray(m.tags) && m.tags.some((t) => String(t).trim().toLowerCase() === lower)
      );
    });
  }

  // ── Sync Memories ────────────────────────────────────────────
  function setMemories(memoriesList) {
    memories = memoriesList || [];

    // Precaricamento media (Immagini e Primo Frame dei Video)
    memories.forEach((m) => {
      const mType = (m.media_type || '').toLowerCase();
      if ((mType === 'image' || mType === 'text') && m.media_url && !imageCache.has(m.media_url)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = m.media_url;
        img.onload = () => {
          imageCache.set(m.media_url, img);
          const n = nodes.find((node) => node.memory.media_url === m.media_url);
          if (n && img.naturalWidth && img.naturalHeight) {
            applyNodeAspectRatio(n, img.naturalWidth / img.naturalHeight);
          }
        };
      } else if (mType === 'text' && !m.media_url && !imageCache.has(textCardKey(m))) {
        // D30: card in corsivo calligrafico generata qui, trattata come un'immagine 2D
        ensureTextCardFont().then(() => {
          imageCache.set(textCardKey(m), renderTextCard(m.description || '', m.title || ''));
        });
      } else if (mType === 'video' && m.media_url && !imageCache.has(m.media_url)) {
        extractVideoFirstFrame(m.media_url, (offCanvas) => {
          const n = nodes.find((node) => node.memory.media_url === m.media_url);
          if (n && offCanvas.width && offCanvas.height) {
            applyNodeAspectRatio(n, offCanvas.width / offCanvas.height);
          }
        });
      }
    });

    nodes = memories.map((m, index) => {
      const existing = nodes.find((n) => n.id === m.id);
      if (existing) {
        existing.memory = m;
        return existing;
      }

      const angle = (index / Math.max(1, memories.length)) * Math.PI * 2;
      const radius = 220 + (index % 4) * 70;
      const initX = Math.cos(angle) * radius;
      const initY = Math.sin(angle) * radius;

      const rawTags = Array.isArray(m.tags) ? m.tags.map((t) => t.toLowerCase().trim()) : ['amici'];
      const primaryTag = rawTags[0] || 'amici';
      const cluster = CLUSTER_PALETTE[primaryTag] || CLUSTER_PALETTE.default;

      const mType = (m.media_type || '').toLowerCase();
      const node = {
        id: m.id || `node-${index}`,
        memory: m,
        x: initX,
        y: initY,
        targetX: initX,
        targetY: initY,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        w: DEFAULT_NODE_W,
        h: 62,
        radius: THUMB_R,
        scale: 0.1,
        targetScale: 1.0,
        alpha: 1.0,
        tags: rawTags,
        primaryTag,
        accentColor: cluster.stroke,
        dateInfo: parseMemoryDate(m),
        aspectRatio: 1.38,
      };

      // Applica immediatamente l'aspect ratio se l'immagine o il frame è già in cache
      if (m.media_url && imageCache.has(m.media_url)) {
        const cached = imageCache.get(m.media_url);
        const cw = cached.naturalWidth || cached.width;
        const ch = cached.naturalHeight || cached.height;
        if (cw && ch) {
          applyNodeAspectRatio(node, cw / ch);
        }
      } else if (mType === 'audio') {
        applyNodeAspectRatio(node, 84 / 62);
      } else if (mType === 'text') {
        applyNodeAspectRatio(node, 82 / 68);
      }

      return node;
    });

    recalculateLayoutTargets();
    if (currentLayout === 'nodi') fitCurrentLayout();
  }

  function addMemory(newMem) {
    memories.unshift(newMem);
    const mType = (newMem.media_type || '').toLowerCase();

    if (newMem.media_url && !imageCache.has(newMem.media_url)) {
      if (mType === 'image' || mType === 'text') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = newMem.media_url;
        img.onload = () => {
          imageCache.set(newMem.media_url, img);
          const n = nodes.find((node) => node.memory.media_url === newMem.media_url);
          if (n && img.naturalWidth && img.naturalHeight) {
            applyNodeAspectRatio(n, img.naturalWidth / img.naturalHeight);
          }
        };
      } else if (mType === 'video') {
        extractVideoFirstFrame(newMem.media_url, (offCanvas) => {
          const n = nodes.find((node) => node.memory.media_url === newMem.media_url);
          if (n && offCanvas.width && offCanvas.height) {
            applyNodeAspectRatio(n, offCanvas.width / offCanvas.height);
          }
        });
      }
    }

    const rawTags = Array.isArray(newMem.tags) ? newMem.tags.map((t) => t.toLowerCase().trim()) : ['amici'];
    const primaryTag = rawTags[0] || 'amici';
    const cluster = CLUSTER_PALETTE[primaryTag] || CLUSTER_PALETTE.default;

    const newNode = {
      id: newMem.id || `node-${Date.now()}`,
      memory: newMem,
      x: camera.x + (Math.random() - 0.5) * 40,
      y: camera.y + (Math.random() - 0.5) * 40,
      targetX: 0,
      targetY: 0,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      w: DEFAULT_NODE_W,
      h: 62,
      radius: THUMB_R,
      scale: 0.1,
      targetScale: 1.0,
      alpha: 1.0,
      tags: rawTags,
      primaryTag,
      accentColor: cluster.stroke,
      dateInfo: parseMemoryDate(newMem),
      aspectRatio: 1.38,
    };

    if (newMem.media_url && imageCache.has(newMem.media_url)) {
      const cached = imageCache.get(newMem.media_url);
      const cw = cached.naturalWidth || cached.width;
      const ch = cached.naturalHeight || cached.height;
      if (cw && ch) {
        applyNodeAspectRatio(newNode, cw / ch);
      }
    } else if (mType === 'audio') {
      applyNodeAspectRatio(newNode, 84 / 62);
    } else if (mType === 'text') {
      applyNodeAspectRatio(newNode, 82 / 68);
    }

    nodes.unshift(newNode);
    recalculateLayoutTargets();
    if (currentLayout === 'nodi') fitCurrentLayout();
    triggerFabricWave(newNode.x, newNode.y);
  }

  // ── Layout Target Calculation ────────────────────────────────
  function recalculateLayoutTargets() {
    if (!nodes.length) return;

    switch (currentLayout) {
      // 1. Nodi — Costellazione aurea stabile e armoniosa
      case 'nodi': {
        // D4: nuvola sferica 3D (sfera di Fibonacci) fissa al centro; la proiezione
        // e la rotazione si calcolano a ogni frame in updateCloud()
        const N = Math.max(1, nodes.length);
        cloudR = Math.max(260, 78 * Math.sqrt(N));
        nodes.forEach((node, i) => {
          const y = 1 - (2 * (i + 0.5)) / N;
          const r = Math.sqrt(Math.max(0, 1 - y * y));
          const th = i * 2.39996;
          node.p3 = { x: Math.cos(th) * r * cloudR * 1.25, y: y * cloudR * 0.82, z: Math.sin(th) * r * cloudR };
          node.targetAlpha = 1.0;
        });
        updateCloud(true);
        break;
      }

      // 2. Cluster — Isole tematiche: i ricordi non si sovrappongono, i cluster si adattano a loro
      case 'cluster': {
        const allTags = getDistinctTags();
        const countTags = Math.max(1, allTags.length);
        const dist = Math.min(540, 320 + countTags * 38);

        // Ordina i tag per massimizzare la vicinanza di tag che condividono memorie
        const adjacency = {};
        allTags.forEach((t1) => {
          adjacency[t1] = {};
          allTags.forEach((t2) => { adjacency[t1][t2] = 0; });
        });
        nodes.forEach((n) => {
          const nTags = Array.isArray(n.tags) ? n.tags : [n.primaryTag];
          for (let i = 0; i < nTags.length; i++) {
            for (let j = i + 1; j < nTags.length; j++) {
              const tA = nTags[i], tB = nTags[j];
              if (adjacency[tA] && adjacency[tA][tB] !== undefined) adjacency[tA][tB]++;
              if (adjacency[tB] && adjacency[tB][tA] !== undefined) adjacency[tB][tA]++;
            }
          }
        });

        const orderedTags = [allTags[0]];
        const unvisited = new Set(allTags.slice(1));
        while (unvisited.size > 0) {
          const last = orderedTags[orderedTags.length - 1];
          let best = null, maxW = -1;
          for (const cand of unvisited) {
            const w = (adjacency[last] && adjacency[last][cand]) || 0;
            if (w > maxW) { maxW = w; best = cand; }
          }
          const nextTag = best || unvisited.values().next().value;
          orderedTags.push(nextTag);
          unvisited.delete(nextTag);
        }

        const tagCenters = new Map();
        orderedTags.forEach((tag, idx) => {
          const angle = (idx / countTags) * Math.PI * 2;
          const pos = {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * (dist * 0.74),
          };
          tagCenters.set(tag, pos);
          tagCenters.set(tag.toLowerCase(), pos);
        });

        // D3: ogni ricordo si piazza tra i centri di TUTTI i suoi tag (firma = insieme dei tag):
        // un solo tag → dentro la sua isola; più tag → nella zona di intersezione tra le isole.
        const sigOf = (node) => {
          const ts = [...new Set((Array.isArray(node.tags) && node.tags.length ? node.tags : [node.primaryTag])
            .map((t) => String(t).toLowerCase().trim())
            .filter((t) => tagCenters.has(t)))].sort();
          return ts.length ? ts : ['default'];
        };
        const bySig = new Map();
        nodes.forEach((node) => {
          const ts = sigOf(node);
          const key = ts.join('|');
          if (!bySig.has(key)) bySig.set(key, { tags: ts, nodes: [] });
          bySig.get(key).nodes.push(node);
        });
        bySig.forEach((group) => {
          let cx = 0, cy = 0, cc = 0;
          group.tags.forEach((t) => { const c = tagCenters.get(t); if (c) { cx += c.x; cy += c.y; cc++; } });
          if (cc) { cx /= cc; cy /= cc; }
          group.cx = cx; group.cy = cy;
          // Spirale a girasole: gruppo compatto e organico attorno al suo punto
          group.nodes.forEach((node, k) => {
            const r = group.nodes.length === 1 ? 0 : 70 * Math.sqrt(k + 0.5);
            const a = k * 2.39996;
            node.targetX = cx + Math.cos(a) * r;
            node.targetY = cy + Math.sin(a) * r * 0.82;
            node.clusterHome = group;
            node.targetScale = 1.0;
            node.targetAlpha = 1.0;
          });
        });

        // Passata di rilassamento fisico anti-sovrapposizione (garantisce zero overlap)
        for (let iter = 0; iter < 40; iter++) {
          // Coesione: ogni ricordo resta vicino al punto della sua firma di tag
          nodes.forEach((n) => {
            if (!n.clusterHome) return;
            n.targetX += (n.clusterHome.cx - n.targetX) * 0.06;
            n.targetY += (n.clusterHome.cy - n.targetY) * 0.06;
          });
          for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              const nA = nodes[i];
              const nB = nodes[j];
              const dx = nB.targetX - nA.targetX;
              const dy = nB.targetY - nA.targetY;
              const dist = Math.hypot(dx, dy) || 1;
              const reqDist = Math.max((nA.w + nB.w) / 2 + 32, (nA.h + nB.h) / 2 + 28);
              if (dist < reqDist) {
                const push = (reqDist - dist) * 0.5;
                const px = (dx / dist) * push;
                const py = (dy / dist) * push;
                nA.targetX -= px;
                nA.targetY -= py;
                nB.targetX += px;
                nB.targetY += py;
              }
            }
          }
        }

        // Filtro su un tema (D21): restano solo i suoi ricordi, raccolti attorno al centro del cluster
        if (focusedClusterTag) {
          const center = tagCenters.get(focusedClusterTag) || { x: 0, y: 0 };
          const sel = nodes.filter((n) => n.tags.some((t) => String(t).toLowerCase().trim() === focusedClusterTag));
          const K = sel.length;
          const cols = Math.max(1, Math.ceil(Math.sqrt(K * 1.5)));
          const rows = Math.ceil(K / cols);
          sel.forEach((n, k) => {
            const c = k % cols;
            const r = Math.floor(k / cols);
            n.targetX = center.x + (c - (cols - 1) / 2) * 150 + (r % 2 ? 36 : -36) * (cols > 1 ? 1 : 0);
            n.targetY = center.y + (r - (rows - 1) / 2) * 118;
            n.targetScale = 1.0;
            n.targetAlpha = 1.0;
          });
          nodes.forEach((n) => {
            if (sel.includes(n)) return;
            n.targetAlpha = 0.0;
            n.targetScale = 0.5;
          });
        }
        break;
      }

      // 3. Planimetria — Spaccato assonometrico e stanze del piano attivo
      case 'planimetria': {
        // Ogni ricordo sta solo nella sua stanza e solo nel piano di quella stanza (D23).
        // D4: chi non c'è più sparisce sul posto (niente scorrimento); chi entra compare già
        // nella sua stanza quando il piano si è fermato (vedi update()).
        const currentFloorObj = FLOORS[activeFloor] || FLOORS.terra;
        const byRoom = new Map();

        nodes.forEach((node) => {
          const loc = (node.memory.location_tag || '').toLowerCase().trim();
          node.planBase = null;
          const inFloor = !!currentFloorObj.rooms[loc];
          if (!inFloor || (focusedRoom && loc !== focusedRoom)) {
            node.targetAlpha = 0.0;
            node.targetX = node.x;
            node.targetY = node.y;
            return;
          }
          if (!byRoom.has(loc)) byRoom.set(loc, []);
          byRoom.get(loc).push(node);
        });

        if (focusedRoom) {
          // D5: dentro la stanza i suoi ricordi si aprono a griglia, a grandezza piena
          const roomNodes = byRoom.get(focusedRoom) || [];
          const K = roomNodes.length;
          const cols = Math.max(1, Math.ceil(Math.sqrt(K * 1.7)));
          const rows = Math.ceil(K / cols);
          const cellW = 170, cellH = 165;
          roomNodes.forEach((node, k) => {
            const c = k % cols;
            const r = Math.floor(k / cols);
            const inRow = r === rows - 1 ? K - r * cols : cols; // ultima riga centrata
            const x = (c - (inRow - 1) / 2) * cellW;
            const y = (r - (rows - 1) / 2) * cellH;
            node.planBase = { x, y };
            node.targetAlpha = 1.0;
            node.targetScale = 1.15;
            node.targetX = x;
            node.targetY = y;
          });
          break;
        }

        byRoom.forEach((roomNodes, loc) => {
          const room = currentFloorObj.rooms[loc];
          const n = roomNodes.length;
          const cols = Math.ceil(Math.sqrt(n * (room.w / room.h)));
          const rows = Math.ceil(n / cols);
          const scale = Math.max(0.42, Math.min(0.7, 0.85 / Math.max(cols, rows)));
          roomNodes.forEach((node, k) => {
            const c = k % cols;
            const r = Math.floor(k / cols);
            const rx = room.x + ((c + 0.5) / cols - 0.5) * room.w * 0.62;
            const ry = room.y + ((r + 0.5) / rows - 0.5) * room.h * 0.62;
            const iso = toIso(rx, ry, 0);
            node.planBase = { x: iso.x, y: iso.y - 16 };
            node.targetAlpha = 1.0;
            node.targetScale = scale;
            node.targetX = iso.x;
            node.targetY = iso.y - 16;
          });
        });
        break;
      }

      // 4. Timeline — Panoramica annuale o apertura sui 12 mesi per l'anno selezionato/zoomato
      case 'timeline': {
        const baselineY = 220;
        const years = getDistinctYears();
        const countYears = Math.max(1, years.length);
        const yearSpacing = 360;

        if (focusedTimelineYear !== null) {
          // ── ANNO SELEZIONATO: APERTURA SUI MESI ────────────────────
          const focusedYr = focusedTimelineYear;
          const monthSpacing = 160;
          const totalMonthSpan = (12 - 1) * monthSpacing; // 1760px
          const startMonthX = -totalMonthSpan / 2; // Centrato a X = 0

          // Mappa coordinate X per ciascuno dei 12 mesi
          const monthXMap = new Map();
          for (let m = 1; m <= 12; m++) {
            monthXMap.set(m, startMonthX + (m - 1) * monthSpacing);
          }

          // Posiziona i nodi dell'anno selezionato sui rispettivi steli mensili
          for (let m = 1; m <= 12; m++) {
            const mNodes = nodes
              .filter((n) => n.dateInfo.year === focusedYr && n.dateInfo.month === m)
              .sort((a, b) => (a.dateInfo.day || 1) - (b.dateInfo.day || 1));

            const mX = monthXMap.get(m);
            let currentStemY = baselineY - 45;

            mNodes.forEach((node) => {
              const halfH = (node.h * 0.95) / 2;
              currentStemY -= (halfH + 12);
              node.targetX = mX;
              node.targetY = currentStemY;
              currentStemY -= (halfH + 6);
              node.targetScale = 0.95;
              node.targetAlpha = 1.0;
            });
          }

          // Gli altri anni non selezionati si collocano ai lati esterni
          const earlierYears = years.filter((y) => y < focusedYr);
          const laterYears = years.filter((y) => y > focusedYr);

          earlierYears.forEach((yr, eIdx) => {
            const x = startMonthX - 340 - (earlierYears.length - 1 - eIdx) * 260;
            const yNodes = nodes.filter((n) => n.dateInfo.year === yr);
            let currentStemY = baselineY - 45;
            yNodes.forEach((node) => {
              const halfH = (node.h * 0.75) / 2;
              currentStemY -= (halfH + 10);
              node.targetX = x;
              node.targetY = currentStemY;
              currentStemY -= halfH;
              node.targetScale = 0.75;
              node.targetAlpha = 0.40;
            });
          });

          laterYears.forEach((yr, lIdx) => {
            const x = startMonthX + totalMonthSpan + 340 + lIdx * 260;
            const yNodes = nodes.filter((n) => n.dateInfo.year === yr);
            let currentStemY = baselineY - 45;
            yNodes.forEach((node) => {
              const halfH = (node.h * 0.75) / 2;
              currentStemY -= (halfH + 10);
              node.targetX = x;
              node.targetY = currentStemY;
              currentStemY -= halfH;
              node.targetScale = 0.75;
              node.targetAlpha = 0.40;
            });
          });

        } else {
          // ── PANORAMICA GENERALE ANNI (steli annuali) ──────────────
          const yearX = new Map();
          const startX = -((countYears - 1) * yearSpacing) / 2;
          years.forEach((y, idx) => {
            yearX.set(y, startX + idx * yearSpacing);
          });

          years.forEach((yr) => {
            const yearNodes = nodes
              .filter((n) => n.dateInfo.year === yr)
              .sort((a, b) => (a.dateInfo.month - b.dateInfo.month) || (a.dateInfo.day - b.dateInfo.day));

            const x = yearX.get(yr) || 0;
            let currentStemY = baselineY - 45;

            yearNodes.forEach((node) => {
              const halfH = (node.h * 0.95) / 2;
              currentStemY -= (halfH + 12);
              node.targetX = x;
              node.targetY = currentStemY;
              currentStemY -= (halfH + 6);
              node.targetScale = 0.95;
              node.targetAlpha = 1.0;
            });
          });
        }

        // Gestione di eventuali nodi con data non risolta
        nodes.forEach((node) => {
          if (!node.dateInfo.year) {
            node.targetX = 0;
            node.targetY = baselineY - 60;
            node.targetScale = 0.8;
            node.targetAlpha = 0.3;
          }
        });
        break;
      }

      // 5. Griglia — Matrice a larghezza schermo e pan solo verticale
      case 'griglia': {
        const sorted = [...nodes].sort((a, b) => {
          if (gridSortMode === 'data') {
            const tA = a.memory.created_at || a.memory.time_event || '';
            const tB = b.memory.created_at || b.memory.time_event || '';
            return tB.localeCompare(tA);
          }
          if (gridSortMode === 'media') {
            const mA = a.memory.media_type || 'z';
            const mB = b.memory.media_type || 'z';
            return mA.localeCompare(mB);
          }
          if (gridSortMode === 'tag') {
            return a.primaryTag.localeCompare(b.primaryTag);
          }
          if (gridSortMode === 'luogo') {
            const lA = a.memory.location_tag || 'z';
            const lB = b.memory.location_tag || 'z';
            return lA.localeCompare(lB);
          }
          return 0;
        });

        // Fit width to screen with margins
        const availableW = Math.max(480, Math.min(width - 240, 1100));
        const cols = Math.max(3, Math.min(5, Math.floor(availableW / (MAX_NODE_W + 36))));
        const cellW = availableW / cols;
        const maxNodeH = nodes.reduce((max, n) => Math.max(max, n.h || 60), 60);
        const cellH = maxNodeH + 54;
        const startX = -availableW / 2 + cellW / 2;
        const rows = Math.ceil(sorted.length / cols);
        const startY = -(rows * cellH) / 2 + cellH / 2;

        sorted.forEach((node, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          node.targetX = startX + col * cellW;
          node.targetY = startY + row * cellH;
          node.targetScale = 0.95;
          node.targetAlpha = 1.0;
        });

        // Lock horizontal camera in grid mode
        camera.targetX = 0;
        break;
      }
    }
  }

  // ── Inquadratura automatica ──────────────────────────────────
  // Porta tutto il contenuto visibile dentro lo schermo, lasciando libere
  // le fasce occupate da header (alto) e HUD camera / Info (basso).
  // (costanti FIT_PAD_* e fitZoom dichiarate accanto alla camera)
  function fitCameraToContent(opts = {}) {
    const {
      filter = null,       // (node) => bool: inquadra solo questi nodi
      extraMinY = null,    // estensioni in coordinate mondo (es. etichette timeline)
      extraMaxY = null,
      margin = 0,          // margine mondo attorno al contenuto (es. isole cluster)
      maxZoom = 1.1,
      alignTop = false,    // se il contenuto è più alto dello schermo, parti dall'alto
    } = opts;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      if (n.targetAlpha < 0.5) return;
      if (filter && !filter(n)) return;
      const s = n.targetScale || 1;
      const hw = ((n.w || 80) * s) / 2;
      const hh = ((n.h || 60) * s) / 2;
      minX = Math.min(minX, n.targetX - hw);
      maxX = Math.max(maxX, n.targetX + hw);
      minY = Math.min(minY, n.targetY - hh);
      maxY = Math.max(maxY, n.targetY + hh);
    });
    if (!isFinite(minX)) return;
    if (extraMinY !== null) minY = Math.min(minY, extraMinY);
    if (extraMaxY !== null) maxY = Math.max(maxY, extraMaxY);
    minX -= margin; maxX += margin; minY -= margin; maxY += margin;

    const availW = Math.max(200, width - FIT_PAD_X * 2);
    const availH = Math.max(200, height - FIT_PAD_TOP - FIT_PAD_BOTTOM);
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);

    let z = Math.min(availW / bw, availH / bh, maxZoom);
    let alignToTop = false;
    if (alignTop && availH / bh < Math.min(availW / bw, maxZoom)) {
      // Contenuto molto alto (griglia lunga): niente zoom-out estremo, si scorre in verticale
      z = Math.min(availW / bw, maxZoom);
      alignToTop = true;
    }
    z = Math.max(camera.minZoom, Math.min(camera.maxZoom, z));

    const cx = (minX + maxX) / 2;
    // Punto mondo → schermo: (w - cam) * z + size/2
    camera.targetX = cx;
    if (alignToTop) {
      camera.targetY = minY - (FIT_PAD_TOP - height / 2) / z;
    } else {
      const screenCY = FIT_PAD_TOP + availH / 2;
      camera.targetY = (minY + maxY) / 2 - (screenCY - height / 2) / z;
    }
    camera.targetZoom = z;
    fitZoom = z;
  }

  // Inquadratura specifica per ciascun layout (chiamata dopo recalculateLayoutTargets)
  function fitCurrentLayout() {
    if (currentLayout === 'nodi') {
      // D4: nuvola centrata sullo schermo, zoom che la contiene tutta
      const availW = Math.max(200, width - FIT_PAD_X * 2);
      const availH = Math.max(200, height - FIT_PAD_TOP - FIT_PAD_BOTTOM);
      const z = Math.min(availW / (cloudR * 2.5 * 1.3 + 140), availH / (cloudR * 1.64 * 1.3 + 140), 1.1);
      camera.targetZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, z));
      camera.targetX = 0;
      camera.targetY = 0;
      fitZoom = camera.targetZoom;
    } else if (currentLayout === 'timeline') {
      // Include la linea di base e le etichette anno/mese sotto di essa
      fitCameraToContent({ extraMaxY: 300, maxZoom: 1.1 });
      // Altezza sullo schermo della linea del tempo: l'anno aperto la riusa (D26)
      timelineBaselineScreenY = (220 - camera.targetY) * camera.targetZoom + height / 2;
    } else if (currentLayout === 'griglia') {
      fitCameraToContent({ alignTop: true, maxZoom: 1.1 });
    } else if (currentLayout === 'cluster') {
      if (focusedClusterTag) {
        fitCameraToContent({
          filter: (n) => Array.isArray(n.tags) && n.tags.some((t) => String(t).toLowerCase().trim() === focusedClusterTag),
          margin: 90,
          maxZoom: 1.25,
        });
      } else {
        fitCameraToContent({ margin: 90, maxZoom: 1.0 });
      }
    }
  }

  // ── Mode Switchers ───────────────────────────────────────────
  function setLayout(layoutName) {
    if (currentLayout === layoutName) return;
    currentLayout = layoutName;

    if (layoutName === 'nodi') {
      camera.targetX = 0;
      camera.targetY = 0;
    } else if (layoutName === 'planimetria') {
      planimetriaEntranceTime = performance.now();
      floorSwitch = null;
      focusedRoom = null;
      planZoomAccum = 1;
      camera.targetX = 0;
      camera.targetY = 0;
      camera.targetZoom = 1.0;
    } else if (layoutName === 'timeline') {
      focusedTimelineYear = null;
    } else if (layoutName === 'cluster') {
      focusedClusterTag = null;
    }

    recalculateLayoutTargets();
    fitCurrentLayout();
  }

  function setFilter(filterName) {
    currentFilter = filterName;
  }

  function setFloor(floorKey) {
    if (!FLOORS[floorKey]) return;
    const now = performance.now();
    const prev = planPhase(now);
    activeFloor = floorKey;
    focusedRoom = null;
    planZoomAccum = 1;
    if (currentLayout === 'planimetria') recalculateLayoutTargets(); // prima i ricordi restavano quelli del piano precedente
    camera.targetX = 0;
    camera.targetY = 0;
    camera.targetZoom = 1.0;
    if (currentLayout !== 'planimetria') {
      planimetriaEntranceTime = now - 2400;
      floorSwitch = null;
    } else if (prev.ease > 0.02 && prev.key !== floorKey) {
      // Il piano corrente risale nell'esploso (animazione al contrario), poi il nuovo
      // scende al centro: la fase "verso il centro" parte appena finisce il ritorno
      const dur = 700 + 1300 * prev.ease;
      floorSwitch = { from: prev.key, e0: prev.ease, start: now, dur };
      planimetriaEntranceTime = now + dur - 2400;
    } else if (prev.ease <= 0.02) {
      // Ancora nell'esploso iniziale: il nuovo piano scende quando previsto
      floorSwitch = null;
    } else {
      floorSwitch = null;
      planimetriaEntranceTime = now - 2400;
    }
  }

  // D5: entra in una stanza (o torna al piano con null), come l'anno aperto della timeline
  function setPlanRoom(roomKey) {
    if (currentLayout !== 'planimetria') return;
    const rooms = (FLOORS[activeFloor] || FLOORS.terra).rooms;
    focusedRoom = roomKey && rooms[roomKey] ? roomKey : null;
    planZoomAccum = 1;
    recalculateLayoutTargets();
    if (focusedRoom) {
      fitCameraToContent({ filter: (n) => !!n.planBase, margin: 100, maxZoom: 1.5 });
      if (!nodes.some((n) => n.planBase)) { camera.targetX = 0; camera.targetY = 0; camera.targetZoom = 1.0; }
    } else {
      camera.targetX = 0;
      camera.targetY = 0;
      camera.targetZoom = 1.0;
    }
  }

  // Stanza del piano attivo sotto un punto dello schermo (null se fuori o se il piano si muove)
  function hitTestRoom(screenX, screenY, nearest = false) {
    if (currentLayout !== 'planimetria' || focusedRoom) return null;
    const fz = planFloorZ(performance.now());
    const w = screenToWorld(screenX, screenY);
    const rooms = (FLOORS[activeFloor] || FLOORS.terra).rooms;
    let best = null, bestD = Infinity;
    for (const [key, room] of Object.entries(rooms)) {
      const pts = [
        toIso(room.x - room.w / 2, room.y - room.h / 2, fz),
        toIso(room.x + room.w / 2, room.y - room.h / 2, fz),
        toIso(room.x + room.w / 2, room.y + room.h / 2, fz),
        toIso(room.x - room.w / 2, room.y + room.h / 2, fz),
      ];
      let inside = false;
      for (let i = 0, j = 3; i < 4; j = i++) {
        if ((pts[i].y > w.y) !== (pts[j].y > w.y) &&
            w.x < ((pts[j].x - pts[i].x) * (w.y - pts[i].y)) / (pts[j].y - pts[i].y) + pts[i].x) inside = !inside;
      }
      if (inside) return key;
      const c = toIso(room.x, room.y, fz);
      const d = Math.hypot(c.x - w.x, c.y - w.y);
      if (d < bestD) { bestD = d; best = key; }
    }
    return nearest ? best : null;
  }

  let onTimelineYearChange = null;
  let timelineBaselineScreenY = null;

  function setTimelineYear(year, skipCallback = false) {
    if (!year || year === 'all') {
      focusedTimelineYear = null;
      recalculateLayoutTargets();
      fitCurrentLayout();
      if (!skipCallback && onTimelineYearChange) onTimelineYearChange('all');
      return;
    }

    const yr = parseInt(year, 10);
    focusedTimelineYear = yr;

    // Anno aperto sui mesi: inquadra i 12 steli mensili (±880 mondo) e i ricordi dell'anno
    recalculateLayoutTargets();
    fitCameraToContent({
      filter: (n) => n.dateInfo.year === yr,
      extraMaxY: 300,
      maxZoom: 1.1,
    });
    // Garantisce che tutti i 12 mesi siano visibili in larghezza
    const monthsZoom = (width - FIT_PAD_X * 2) / (11 * 160 + 160 + OPEN_YEAR_GAP + 60);
    if (camera.targetZoom > monthsZoom) {
      camera.targetZoom = Math.max(camera.minZoom, monthsZoom);
      fitZoom = camera.targetZoom;
    }
    camera.targetX = (OPEN_YEAR_GAP + 60) / 2; // mesi + anno scritto a destra, centrati
    tlYearCamX = camera.targetX;
    tlSwipe = 0;
    tlZoomOut = 1;
    // Stessa altezza della linea del tempo generale (D26)
    if (timelineBaselineScreenY !== null) {
      camera.targetY = 220 - (timelineBaselineScreenY - height / 2) / camera.targetZoom;
    }
    if (!skipCallback && onTimelineYearChange) onTimelineYearChange(String(yr));
  }

  function setClusterTag(tag) {
    if (!tag || tag === 'all') {
      focusedClusterTag = null;
      recalculateLayoutTargets();
      fitCurrentLayout();
      return;
    }
    focusedClusterTag = tag.toLowerCase().trim();
    recalculateLayoutTargets();
    // Inquadra l'isola del tag scelto (con margine per il contorno dell'isola)
    fitCurrentLayout();
  }

  function setGridSort(sortKey) {
    gridSortMode = sortKey;
    recalculateLayoutTargets();
    fitCurrentLayout();
  }

  function isNodeMatchingFilter(node) {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'foto' || currentFilter === 'type-image') return node.memory.media_type === 'image';
    if (currentFilter === 'audio' || currentFilter === 'type-audio') return node.memory.media_type === 'audio';
    if (currentFilter === 'testo') return node.memory.media_type === 'text';
    if (currentFilter.startsWith('tag-')) {
      const tag = currentFilter.replace('tag-', '');
      return Array.isArray(node.memory.tags) && node.memory.tags.includes(tag);
    }
    return true;
  }

  // ── Camera Manipulation ──────────────────────────────────────
  function pan(dx, dy) {
    if (currentLayout === 'planimetria') return; // D5: vista fissa
    if (currentLayout === 'nodi') {
      // D4: la vista resta ferma, il trascinamento ruota la nuvola
      cloudRotY -= dx * 0.0045; // 11/11: verso invertito, la nuvola segue la mano
      cloudRotX = Math.max(-1.1, Math.min(1.1, cloudRotX - dy * 0.0045));
      cloudTouchedAt = performance.now();
      return;
    }
    if (currentLayout === 'timeline') {
      // D13: solo orizzontale
      if (focusedTimelineYear === null) {
        camera.targetX -= dx / camera.zoom;
        return;
      }
      // D14: anno aperto — oltre la soglia si passa all'anno vicino, mai a metà
      const now = performance.now();
      if (now - tlSwitchAt < 650) return; // l'inerzia del pan non salta un secondo anno
      const years = getDistinctYears();
      const idx = years.indexOf(focusedTimelineYear);
      tlSwipe += dx;
      tlSwipeAt = now;
      const SWIPE = Math.min(260, width * 0.16);
      if (tlSwipe <= -SWIPE && idx >= 0 && idx < years.length - 1) {
        tlSwitchAt = now;
        setTimelineYear(years[idx + 1]);
      } else if (tlSwipe >= SWIPE && idx > 0) {
        tlSwitchAt = now;
        setTimelineYear(years[idx - 1]);
      } else {
        tlSwipe = Math.max(-SWIPE * 1.2, Math.min(SWIPE * 1.2, tlSwipe));
      }
      return;
    }
    // In griglia: pan solo verticale, larghezza fissa allo schermo
    if (currentLayout === 'griglia') {
      camera.targetY -= dy / camera.zoom;
      return;
    }
    camera.targetX -= dx / camera.zoom;
    camera.targetY -= dy / camera.zoom;
  }

  function zoom(factor, screenX, screenY) {
    // In griglia zoom disattivato o molto controllato
    if (currentLayout === 'griglia') return;

    // D12: nell'anno aperto niente zoom; allontanandosi si torna a tutti gli anni
    if (currentLayout === 'timeline' && focusedTimelineYear !== null) {
      tlZoomOut = factor < 1 ? tlZoomOut * factor : Math.min(1, tlZoomOut * factor);
      if (tlZoomOut <= 0.78) setTimelineYear(null);
      return;
    }

    // D5: in planimetria lo zoom non sposta la vista: avvicinarsi apre la stanza
    // sotto il mirino (o la più vicina), allontanarsi torna al piano
    if (currentLayout === 'planimetria') {
      planZoomAccum *= factor;
      if (!focusedRoom && planZoomAccum >= 1.3) {
        const key = hitTestRoom(screenX ?? width / 2, screenY ?? height / 2, true);
        if (key) setPlanRoom(key);
        planZoomAccum = 1;
      } else if (focusedRoom && planZoomAccum <= 0.77) {
        setPlanRoom(null);
      }
      planZoomAccum = Math.min(1.3, Math.max(0.77, planZoomAccum));
      return;
    }

    const oldZoom = camera.targetZoom;
    // 11/11: nella timeline con tutti gli anni non ci si allontana oltre la vista d'insieme
    const minZ = currentLayout === 'timeline' ? Math.max(camera.minZoom, fitZoom * 0.9) : camera.minZoom;
    camera.targetZoom = Math.min(camera.maxZoom, Math.max(minZ, camera.targetZoom * factor));

    if (currentLayout === 'timeline') {
      // Zoom semantico: se si ingrandisce (targetZoom >= 1.20) e nessun anno è aperto,
      // apri automaticamente l'anno più vicino al centro della visuale
      if (camera.targetZoom >= fitZoom * 1.3 && focusedTimelineYear === null) {
        const years = getDistinctYears();
        const countYears = Math.max(1, years.length);
        const yearSpacing = 360;
        const startX = -((countYears - 1) * yearSpacing) / 2;
        let bestYr = years[0];
        let bestDist = Infinity;
        years.forEach((yr, idx) => {
          const x = startX + idx * yearSpacing;
          const d = Math.abs(x - camera.targetX);
          if (d < bestDist) {
            bestDist = d;
            bestYr = yr;
          }
        });
        setTimelineYear(bestYr);
        return; // Lo zoom semantico riposiziona la camera — niente zoom-towards-point
      } else if (camera.targetZoom <= fitZoom * 0.75 && focusedTimelineYear !== null) {
        // Quando ci si allontana con lo zoom, ritorna alla panoramica di tutti gli anni
        setTimelineYear(null);
        return; // Lo zoom semantico riposiziona la camera — niente zoom-towards-point
      } else {
        recalculateLayoutTargets();
      }
    }

    // ── Zoom-towards-point ──────────────────────────────────────
    // Regola la camera affinché il punto del mondo sotto il cursore
    // resti nella stessa posizione sullo schermo (come Google Maps)
    const newZoom = camera.targetZoom;
    if (screenX !== undefined && screenY !== undefined && oldZoom !== newZoom) {
      const dx = screenX - width / 2;
      const dy = screenY - height / 2;
      camera.targetX += dx * (1 / oldZoom - 1 / newZoom);
      camera.targetY += dy * (1 / oldZoom - 1 / newZoom);
    }
  }

  function setHoverPoint(sx, sy) {
    pointerScreen.x = sx;
    pointerScreen.y = sy;
    hoveredTimelineItem = (currentLayout === 'timeline') ? hitTestTimeline(sx, sy) : null;
  }

  // ── Hit-Testing ──────────────────────────────────────────────
  function hitTest(screenX, screenY) {
    const worldP = screenToWorld(screenX, screenY);
    const order = drawOrder.length === nodes.length ? drawOrder : nodes;
    for (let i = order.length - 1; i >= 0; i--) {
      const n = order[i];
      if (n.alpha < 0.05) continue;
      const halfW = (n.w * n.scale) / 2;
      const halfH = (n.h * n.scale) / 2;

      if (
        worldP.x >= n.x - halfW - 8 &&
        worldP.x <= n.x + halfW + 8 &&
        worldP.y >= n.y - halfH - 8 &&
        worldP.y <= n.y + halfH + 8
      ) {
        return n;
      }
    }
    return null;
  }

  // ── Movimento Delicato per Nodi ───────────────────────────────
  // D4: proiezione prospettica della nuvola; i ricordi restano frontali (solo scala e
  // trasparenza cambiano con la profondità), l'ordine di disegno segue la profondità
  function updateCloud(immediate = false) {
    if (currentLayout !== 'nodi') return;
    const cy = Math.cos(cloudRotY), sy = Math.sin(cloudRotY);
    const cx = Math.cos(cloudRotX), sx = Math.sin(cloudRotX);
    nodes.forEach((node) => {
      const p = node.p3;
      if (!p) return;
      const x1 = p.x * cy + p.z * sy;
      const z1 = -p.x * sy + p.z * cy;
      const y2 = p.y * cx - z1 * sx;
      const z2 = p.y * sx + z1 * cx;
      const persp = CLOUD_FOCAL / (CLOUD_FOCAL + z2);
      node.depth = z2;
      node.targetX = x1 * persp;
      node.targetY = y2 * persp;
      node.targetScale = 0.92 * persp;
      const front = 1 - (z2 + cloudR) / (2 * cloudR); // 1 davanti, 0 dietro
      node.targetAlpha = 0.38 + 0.62 * Math.max(0, Math.min(1, front));
      if (immediate) node.baseX = node.targetX;
    });
  }

  function updateForces() {
    if (currentLayout !== 'nodi') return;
    // Rotazione lentissima quando nessuno tocca la nuvola: si legge la profondità
    if (performance.now() - cloudTouchedAt > 4000) cloudRotY -= 0.0009; // 11/11: verso invertito
    updateCloud();
  }
  let cloudTouchedAt = 0;

  // ── Update Logic (Movimenti reattivi e fluidi) ───────────────
  // D9: smorzamenti basati sul tempo reale, non sui frame: se un frame arriva in ritardo
  // (MediaPipe, decodifica immagini) il movimento recupera senza scatti né rallentamenti
  let lastUpdateAt = 0;
  let frameEase = (k) => k;
  function update() {
    const tNow = performance.now();
    const dt = Math.min(50, lastUpdateAt ? tNow - lastUpdateAt : 16.7);
    lastUpdateAt = tNow;
    const r = dt / 16.7;
    frameEase = (k) => 1 - Math.pow(1 - k, r);
    const kCam = frameEase(0.11);
    camera.x += (camera.targetX - camera.x) * kCam;
    camera.y += (camera.targetY - camera.y) * kCam;
    camera.zoom += (camera.targetZoom - camera.zoom) * kCam;

    // ── Camera Bounds Clamping ──────────────────────────────────
    // Calcola il bounding box di tutti i nodi visibili e blocca la camera
    // entro un margine ragionevole per impedire di perdersi nel vuoto
    clampCameraBounds();

    updateForces();

    // D14: la vista segue un po' il trascinamento e torna centrata sull'anno quando ci si ferma
    if (currentLayout === 'timeline' && focusedTimelineYear !== null) {
      if (performance.now() - tlSwipeAt > 140) tlSwipe *= 0.82;
      if (Math.abs(tlSwipe) < 0.5) tlSwipe = 0;
      camera.targetX = tlYearCamX - (tlSwipe * 0.35) / Math.max(0.1, camera.zoom);
    }

    if (currentLayout === 'planimetria') {
      // D4: i ricordi non seguono il piano che scorre: restano nascosti finché il piano
      // non è fermo, poi compaiono direttamente al loro posto (niente scivolamento)
      const settled = focusedRoom || Math.abs(planFloorZ(performance.now())) < 18;
      nodes.forEach((node) => {
        if (!node.planBase) return;
        if (settled) {
          if (node.alpha < 0.05) {
            node.x = node.planBase.x;
            node.y = node.planBase.y;
            node.scale = node.targetScale * 0.92;
          }
          node.targetX = node.planBase.x;
          node.targetY = node.planBase.y;
          node.targetAlpha = 1.0;
        } else {
          node.targetX = node.x;
          node.targetY = node.y;
          node.targetAlpha = 0.0;
        }
      });
    }

    const inCloud = currentLayout === 'nodi';
    if (inCloud) { camera.targetX = 0; camera.targetY = 0; }
    const kPos = frameEase(inCloud ? 0.22 : 0.1), kScale = frameEase(inCloud ? 0.22 : 0.16), kAlpha = frameEase(0.12);
    nodes.forEach((node) => {
      node.x += (node.targetX - node.x) * kPos;
      node.y += (node.targetY - node.y) * kPos;

      const isHover = (hoveredNode === node);
      let targetS = isHover ? node.targetScale * 1.25 : node.targetScale;
      node.scale += (targetS - node.scale) * kScale;

      // Alpha: combina il targetAlpha del layout con il filtro attivo
      // Il più restrittivo tra layout e filtro vince (min)
      let targetA = node.targetAlpha !== undefined ? node.targetAlpha : 1.0;
      if (!isNodeMatchingFilter(node)) targetA = Math.min(targetA, 0.35);

      node.alpha += (targetA - node.alpha) * kAlpha;
    });

    drawOrder = inCloud ? nodes.slice().sort((a, b) => (b.depth || 0) - (a.depth || 0)) : nodes;
    if (pointerScreen.x > 0 && pointerScreen.y > 0) {
      hoveredNode = hitTest(pointerScreen.x, pointerScreen.y);
    } else {
      hoveredNode = null;
    }
  }

  // ── Camera Bounds Clamping (Molla Progressiva) ─────────────────
  // Impedisce alla camera di uscire dalla visualizzazione: l'utente può
  // sforare leggermente i bordi, ma una molla progressiva lo riporta
  // indietro con forza crescente — più si va fuori, più tira forte.
  function clampCameraBounds() {
    if (nodes.length === 0) return;

    // 1. Calcola il bounding box del contenuto visibile
    let cMinX = Infinity, cMaxX = -Infinity;
    let cMinY = Infinity, cMaxY = -Infinity;

    nodes.forEach((node) => {
      if (node.targetScale <= 0.05 || node.targetAlpha < 0.05) return;
      const halfW = node.w / 2;
      const halfH = node.h / 2;
      cMinX = Math.min(cMinX, node.targetX - halfW);
      cMaxX = Math.max(cMaxX, node.targetX + halfW);
      cMinY = Math.min(cMinY, node.targetY - halfH);
      cMaxY = Math.max(cMaxY, node.targetY + halfH);
    });

    if (!isFinite(cMinX)) return;

    // 2. Margine di overscroll: max 30% del viewport in coordinate world
    //    Permette un po' di respiro ma non di perdersi
    const viewHalfW = (width / 2) / camera.zoom;
    const viewHalfH = (height / 2) / camera.zoom;
    const overscrollX = viewHalfW * 0.30;
    const overscrollY = viewHalfH * 0.30;

    const boundMinX = cMinX - overscrollX;
    const boundMaxX = cMaxX + overscrollX;
    const boundMinY = cMinY - overscrollY;
    const boundMaxY = cMaxY + overscrollY;

    // 3. Molla progressiva: forza proporzionale allo sforamento²
    //    Più si esce, più la forza aumenta — impossibile scappare
    camera.targetX = springPull(camera.targetX, boundMinX, boundMaxX);
    camera.targetY = springPull(camera.targetY, boundMinY, boundMaxY);
  }

  /**
   * Molla progressiva con forza crescente:
   *  - Forza base: 18% (sensibile anche a piccoli sforamenti)
   *  - Forza massima: 60% (impedisce derive continue)
   *  - Aumento: proporzionale allo sforamento (0.3% per pixel world)
   */
  function springPull(val, min, max) {
    if (val < min) {
      const overshoot = min - val;
      const force = Math.min(0.60, 0.18 + overshoot * 0.003);
      return val + overshoot * force;
    }
    if (val > max) {
      const overshoot = val - max;
      const force = Math.min(0.60, 0.18 + overshoot * 0.003);
      return val - overshoot * force;
    }
    return val;
  }

  // ── Render Loop (60 FPS) ─────────────────────────────────────
  // Grana: tessera 256px di puntini bordeaux a opacità casuale bassa, generata una volta
  const grainPattern = (() => {
    try {
      const size = 256;
      const tile = document.createElement('canvas');
      tile.width = tile.height = size;
      const g = tile.getContext('2d');
      const img = g.createImageData(size, size);
      for (let i = 0; i < img.data.length; i += 4) {
        const r = Math.random();
        if (r < 0.45) continue;
        img.data[i] = 153; img.data[i + 1] = 37; img.data[i + 2] = 28;
        img.data[i + 3] = Math.round((r - 0.45) * 52); // alfa max ≈ 28/255
      }
      g.putImageData(img, 0, 0);
      return ctx.createPattern(tile, 'repeat');
    } catch (e) {
      return null;
    }
  })();

  function render() {
    update();
    const now = performance.now();

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Light Mode Exhibition Gallery Background (#F9F6F0)
    ctx.fillStyle = '#F9F6F0';
    ctx.fillRect(0, 0, width, height);

    // Grana rossa sotto ai ricordi. D5: fissa sullo schermo solo nei nodi; nelle altre
    // viste è agganciata al mondo e scorre/si ingrandisce insieme alla visualizzazione
    if (grainPattern) {
      if (grainPattern.setTransform) {
        if (currentLayout === 'nodi') {
          grainPattern.setTransform(new DOMMatrix());
        } else {
          grainPattern.setTransform(new DOMMatrix()
            .translate(width / 2 - camera.x * camera.zoom, height / 2 - camera.y * camera.zoom)
            .scale(camera.zoom));
        }
      }
      ctx.fillStyle = grainPattern;
      ctx.fillRect(0, 0, width, height);
    }

    // Camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 1. Guides and Background Layouts
    if (currentLayout === 'planimetria') {
      if (focusedRoom) drawPlanRoomView();
      else drawPlanimetriaAssonometria(now);
    } else if (currentLayout === 'timeline') {
      drawTimelineGuides();
    } else if (currentLayout === 'cluster') {
      drawClusterVennIslands(now);
    }

    // 2. Collegamenti: solo nella vista Nodi (D20: nei cluster bastano le isole)
    if (currentLayout === 'nodi') {
      drawFilaments(now);
    }

    // 3. Thumbnails (solo bordo caldo, no cornice panna)
    drawThumbnails(now);

    // 4. Overlays & Griglia metadata
    if (currentLayout === 'griglia') {
      drawGridMetadata();
    }

    ctx.restore();
    requestAnimationFrame(render);
  }

  // ── Proiezione Assonometrica Isometrica Architettonica ───────
  function toIso(x, y, z = 0) {
    const cos30 = 0.866025; // cos(30°)
    const sin30 = 0.5;      // sin(30°)
    const kVertical = 0.58; // Schiacciamento orizzontale proporzionato al kiosk
    const sx = (x - y) * cos30;
    const sy = (x + y) * sin30 * kVertical - z;
    return { x: sx, y: sy };
  }

  // Quota Z del piano attivo nell'animazione: esploso (0–2.4s), discesa al centro (2.4–4.8s), fermo
  const PLAN_FLOOR_BASE_Z = { secondo: 220, primo: 0, terra: -220 };
  // Fase dell'animazione: quale piano si muove (key) e quanto è sceso al centro
  // (ease 0 = esploso, 1 = al centro). Durante un cambio piano il precedente torna indietro.
  function planPhase(now) {
    const smooth = (t) => 0.5 - 0.5 * Math.cos(Math.max(0, Math.min(1, t)) * Math.PI);
    if (floorSwitch) {
      const t = (now - floorSwitch.start) / floorSwitch.dur;
      if (t < 1) return { key: floorSwitch.from, ease: floorSwitch.e0 * (1 - smooth(t)) };
      floorSwitch = null;
    }
    const elapsed = now - planimetriaEntranceTime;
    return { key: activeFloor, ease: elapsed <= 2400 ? 0 : smooth((elapsed - 2400) / 2400) };
  }
  function planFloorZ(now) {
    const bZ = PLAN_FLOOR_BASE_Z[activeFloor] !== undefined ? PLAN_FLOOR_BASE_Z[activeFloor] : -220;
    const ph = planPhase(now);
    if (ph.key !== activeFloor) return bZ || 220; // piano precedente ancora in movimento
    return bZ * (1 - ph.ease);
  }

  // D5: vista dentro una stanza — nome della stanza sopra la griglia dei suoi ricordi
  function drawPlanRoomView() {
    const floor = FLOORS[activeFloor] || FLOORS.terra;
    const room = floor.rooms[focusedRoom];
    if (!room) return;
    let minX = -120, maxX = 120, minY = -60, maxY = 60;
    nodes.forEach((n) => {
      if (!n.planBase) return;
      const hw = (n.w * (n.targetScale || 1)) / 2, hh = (n.h * (n.targetScale || 1)) / 2;
      minX = Math.min(minX, n.planBase.x - hw); maxX = Math.max(maxX, n.planBase.x + hw);
      minY = Math.min(minY, n.planBase.y - hh); maxY = Math.max(maxY, n.planBase.y + hh);
    });
    const pad = 46;
    ctx.save();
    // Pavimento e pareti della stanza come cornice
    ctx.fillStyle = 'rgba(153, 37, 28, 0.035)';
    ctx.strokeStyle = 'rgba(153, 37, 28, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.fillRect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
    ctx.strokeRect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
    ctx.fillStyle = '#99251C';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.font = '700 12px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.globalAlpha = 0.7;
    ctx.fillText(floor.label, minX - pad, minY - pad - 34);
    ctx.globalAlpha = 1;
    ctx.font = '700 26px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillText(room.label, minX - pad, minY - pad - 8);
    if (!nodes.some((n) => n.planBase)) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '500 15px "Helvetica Neue", Helvetica, Arial, sans-serif';
      ctx.globalAlpha = 0.7;
      ctx.fillText('Ancora nessun ricordo in questa stanza', (minX + maxX) / 2, (minY + maxY) / 2);
    }
    ctx.restore();
  }

  // ── Planimetria: Spaccato Assonometrico Esploso a 3 Piani ────
  function drawPlanimetriaAssonometria(now) {
    ctx.save();

    // Dimensioni 2D della soletta del piano
    const minX = -310;
    const maxX = 310;
    const minY = -180;
    const maxY = 180;
    const slabThickness = 8;

    // Quote Z di default nell'esploso verticale (distanza di 220px tra i piani)
    const floorBaseZ = {
      secondo: 220,
      primo: 0,
      terra: -220,
    };

    // Fasi (tempi lenti e contemplativi): esploso a 3 piani (0–2.4 s), poi il piano
    // selezionato scende al centro e gli altri scivolano via (2.4–4.8 s), poi fermo.
    // 11/11 D5: cambiando piano la stessa animazione va al contrario per il piano corrente.
    const phase = planPhase(now);
    const movingKey = phase.key;
    const ease = phase.ease;
    const activeBaseZ = floorBaseZ[movingKey] !== undefined ? floorBaseZ[movingKey] : -220;
    const guideOpacity = Math.max(0, 1.0 - ease * 1.2);
    const floorStates = {};
    const floorOrder = ['terra', 'primo', 'secondo'];
    floorOrder.forEach((fKey) => {
      const bZ = floorBaseZ[fKey];
      if (fKey === movingKey) {
        floorStates[fKey] = { z: bZ * (1 - ease), opacity: 1.0, isActive: true };
      } else {
        const dir = bZ > activeBaseZ ? 1 : -1;
        floorStates[fKey] = { z: bZ + dir * ease * 300, opacity: Math.max(0, (1 - ease) * 0.88), isActive: false };
      }
    });

    // ── 1. Linee guida d'asse verticali tratteggiate dell'esploso ─
    if (guideOpacity > 0.02) {
      ctx.save();
      ctx.globalAlpha = guideOpacity * 0.40;
      ctx.strokeStyle = '#99251C';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 5]);

      const corners = [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
      ];

      const zBottom = floorStates.terra ? floorStates.terra.z - slabThickness : -230;
      const zTop = floorStates.secondo ? floorStates.secondo.z + 40 : 260;

      corners.forEach(([cx, cy]) => {
        const pBot = toIso(cx, cy, zBottom);
        const pTop = toIso(cx, cy, zTop);
        ctx.beginPath();
        ctx.moveTo(pBot.x, pBot.y);
        ctx.lineTo(pTop.x, pTop.y);
        ctx.stroke();
      });

      ctx.restore();
    }

    // ── 2. Render dei piani (dal basso verso l'alto per corretta sovrapposizione) ─
    floorOrder.forEach((fKey) => {
      const state = floorStates[fKey];
      if (!state || state.opacity <= 0.01) return;

      const fl = FLOORS[fKey];
      const z = state.z;
      const isActive = state.isActive;

      ctx.save();
      ctx.globalAlpha = state.opacity;

      // Coordinate assonometriche dei 4 vertici del piano
      const c0 = toIso(minX, minY, z); // Nord
      const c1 = toIso(maxX, minY, z); // Est
      const c2 = toIso(maxX, maxY, z); // Sud
      const c3 = toIso(minX, maxY, z); // Ovest

      // Vertici inferiori della soletta fisica estrusa
      const c1_b = toIso(maxX, minY, z - slabThickness);
      const c2_b = toIso(maxX, maxY, z - slabThickness);
      const c3_b = toIso(minX, maxY, z - slabThickness);

      // A) Faccia laterale destra della soletta
      ctx.fillStyle = '#E8DDD0';
      ctx.strokeStyle = '#D6C3AF';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.lineTo(c2_b.x, c2_b.y);
      ctx.lineTo(c1_b.x, c1_b.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // B) Faccia frontale sinistra della soletta
      ctx.fillStyle = '#DFD2C2';
      ctx.beginPath();
      ctx.moveTo(c2.x, c2.y);
      ctx.lineTo(c3.x, c3.y);
      ctx.lineTo(c3_b.x, c3_b.y);
      ctx.lineTo(c2_b.x, c2_b.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // C) Superficie calpestabile superiore della soletta (pavimento)
      ctx.fillStyle = isActive ? '#FFFDF9' : '#F9F5EE';
      ctx.strokeStyle = isActive ? 'rgba(153, 37, 28, 0.40)' : 'rgba(153, 37, 28, 0.18)';
      ctx.lineWidth = isActive ? 1.4 : 1.0;
      ctx.beginPath();
      ctx.moveTo(c0.x, c0.y);
      ctx.lineTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.lineTo(c3.x, c3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Griglia modulare architettonica interna leggera
      ctx.save();
      ctx.strokeStyle = 'rgba(153, 37, 28, 0.05)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 4]);
      for (let gx = minX + 80; gx < maxX; gx += 80) {
        const ga = toIso(gx, minY, z);
        const gb = toIso(gx, maxY, z);
        ctx.beginPath();
        ctx.moveTo(ga.x, ga.y);
        ctx.lineTo(gb.x, gb.y);
        ctx.stroke();
      }
      for (let gy = minY + 60; gy < maxY; gy += 60) {
        const ga = toIso(minX, gy, z);
        const gb = toIso(maxX, gy, z);
        ctx.beginPath();
        ctx.moveTo(ga.x, ga.y);
        ctx.lineTo(gb.x, gb.y);
        ctx.stroke();
      }
      ctx.restore();

      // D) Stanze in spaccato assonometrico con pareti sezionate
      Object.entries(fl.rooms).forEach(([rk, room]) => {
        const x1 = room.x - room.w / 2;
        const x2 = room.x + room.w / 2;
        const y1 = room.y - room.h / 2;
        const y2 = room.y + room.h / 2;

        const p0 = toIso(x1, y1, z);
        const p1 = toIso(x2, y1, z);
        const p2 = toIso(x2, y2, z);
        const p3 = toIso(x1, y2, z);

        // 1. Pavimento stanza
        ctx.fillStyle = isActive ? 'rgba(153, 37, 28, 0.035)' : 'rgba(153, 37, 28, 0.015)';
        ctx.strokeStyle = isActive ? 'rgba(153, 37, 28, 0.35)' : 'rgba(153, 37, 28, 0.12)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2. Muri sezionati in spaccato (Altezza = 14px sulle pareti nord ed est di sfondo)
        const wallH = 14;
        const t0 = toIso(x1, y1, z + wallH);
        const t1 = toIso(x2, y1, z + wallH);
        const t2 = toIso(x2, y2, z + wallH);

        // Parete Nord (p0 -> p1 -> t1 -> t0)
        ctx.fillStyle = isActive ? 'rgba(153, 37, 28, 0.12)' : 'rgba(153, 37, 28, 0.06)';
        ctx.strokeStyle = isActive ? 'rgba(153, 37, 28, 0.45)' : 'rgba(153, 37, 28, 0.20)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.lineTo(t0.x, t0.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Parete Est (p1 -> p2 -> t2 -> t1)
        ctx.fillStyle = isActive ? 'rgba(153, 37, 28, 0.08)' : 'rgba(153, 37, 28, 0.04)';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. Etichetta stanza (Solo Nome, nessun numero o livello)
        const mid = toIso(room.x, room.y, z);

        ctx.fillStyle = '#99251C';
        ctx.font = '700 11.4px "Helvetica Neue", Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(room.label, mid.x, mid.y);
      });

      // E) Intestazione del piano a bordo soletta (Solo Nome Piano, nessun codice di livello)
      const labelPos = toIso(minX, minY, z);
      ctx.fillStyle = '#99251C';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '700 15.8px "Helvetica Neue", Helvetica, Arial, sans-serif';
      ctx.fillText(fl.label, labelPos.x - 30, labelPos.y - 14);

      ctx.restore();
    });

    ctx.restore();
  }

  // ── Contorni organici dei cluster (metaball + marching squares) ──
  // Ogni ricordo genera un "campo" che decresce con la distanza dal suo bordo;
  // la curva di livello 1 avvolge il ricordo a distanza R e, quando due ricordi
  // sono vicini, i contorni si fondono come gocce (vedi inspo "visualizzazione sezioni.png").
  // Il calcolo è in cache: si rifà solo quando i ricordi si spostano.
  const clusterContourCache = new Map();
  const CONTOUR_CELL = 14; // lato cella della griglia (px mondo)

  // Il campo parte da un nucleo ridotto del ricordo (30%) con un raggio proprio:
  // attorno a un ricordo singolo il contorno è quasi un cerchio, non un rettangolo
  function clusterFieldAt(px, py, rects) {
    let f = 0;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      const dx = Math.max(Math.abs(px - r.x) - r.hw * 0.3, 0);
      const dy = Math.max(Math.abs(py - r.y) - r.hh * 0.3, 0);
      f += r.r2 / (dx * dx + dy * dy + r.r2 * 0.02);
    }
    return f;
  }

  // Distanza² punto–segmento (per i ponti tra ricordi dello stesso tag)
  function segDist2(px, py, a, b) {
    const vx = b.x - a.x, vy = b.y - a.y;
    const l2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / l2));
    const dx = px - (a.x + vx * t), dy = py - (a.y + vy * t);
    return dx * dx + dy * dy;
  }

  function computeClusterContours(rects, R, edges = [], others = []) {
    for (const r of rects) {
      const rad = R + Math.hypot(r.hw * 0.7, r.hh * 0.7);
      r.r2 = rad * rad;
    }
    for (const o of others) {
      const rad = Math.hypot(o.hw, o.hh) * 0.7 + 14;
      o.r2 = rad * rad;
    }
    const E2 = (R * 0.9 + 14) ** 2; // corridoio dei ponti
    const fieldAt = (px, py) => {
      let f = clusterFieldAt(px, py, rects);
      for (let i = 0; i < edges.length; i++) {
        f += (0.6 * E2) / (segDist2(px, py, edges[i][0], edges[i][1]) + E2 * 0.02);
      }
      for (let i = 0; i < others.length; i++) {
        const o = others[i];
        const dx = Math.max(Math.abs(px - o.x) - o.hw * 0.3, 0);
        const dy = Math.max(Math.abs(py - o.y) - o.hh * 0.3, 0);
        f -= (3 * o.r2) / (dx * dx + dy * dy + o.r2 * 0.02);
      }
      return f;
    };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of rects) {
      minX = Math.min(minX, r.x - r.hw); maxX = Math.max(maxX, r.x + r.hw);
      minY = Math.min(minY, r.y - r.hh); maxY = Math.max(maxY, r.y + r.hh);
    }
    const pad = R * 2.2 + Math.max(...rects.map((r) => Math.max(r.hw, r.hh)));
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const cols = Math.ceil((maxX - minX) / CONTOUR_CELL) + 1;
    const rows = Math.ceil((maxY - minY) / CONTOUR_CELL) + 1;
    if (cols * rows > 160000) return []; // protezione: area enorme

    const field = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) {
      const y = minY + j * CONTOUR_CELL;
      for (let i = 0; i < cols; i++) {
        field[j * cols + i] = fieldAt(minX + i * CONTOUR_CELL, y) - 1;
      }
    }

    // Punto interpolato sul lato di cella, identificato da una chiave univoca
    const pts = new Map();
    const edgePoint = (key, x0, y0, v0, x1, y1, v1) => {
      if (!pts.has(key)) {
        const t = v0 / (v0 - v1);
        pts.set(key, { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t });
      }
      return key;
    };
    const links = new Map(); // chiave -> [chiavi collegate]
    const link = (a, b) => {
      if (!links.has(a)) links.set(a, []);
      if (!links.has(b)) links.set(b, []);
      links.get(a).push(b);
      links.get(b).push(a);
    };

    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const tl = field[j * cols + i], tr = field[j * cols + i + 1];
        const br = field[(j + 1) * cols + i + 1], bl = field[(j + 1) * cols + i];
        const c = (tl > 0 ? 8 : 0) | (tr > 0 ? 4 : 0) | (br > 0 ? 2 : 0) | (bl > 0 ? 1 : 0);
        if (c === 0 || c === 15) continue;
        const x0 = minX + i * CONTOUR_CELL, x1 = x0 + CONTOUR_CELL;
        const y0 = minY + j * CONTOUR_CELL, y1 = y0 + CONTOUR_CELL;
        const T = () => edgePoint(`h${i},${j}`, x0, y0, tl, x1, y0, tr);
        const B = () => edgePoint(`h${i},${j + 1}`, x0, y1, bl, x1, y1, br);
        const L = () => edgePoint(`v${i},${j}`, x0, y0, tl, x0, y1, bl);
        const Rr = () => edgePoint(`v${i + 1},${j}`, x1, y0, tr, x1, y1, br);
        const center = (tl + tr + br + bl) / 4;
        switch (c) {
          case 1: case 14: link(L(), B()); break;
          case 2: case 13: link(B(), Rr()); break;
          case 3: case 12: link(L(), Rr()); break;
          case 4: case 11: link(T(), Rr()); break;
          case 6: case 9: link(T(), B()); break;
          case 7: case 8: link(L(), T()); break;
          case 5: if (center > 0) { link(L(), T()); link(B(), Rr()); } else { link(L(), B()); link(T(), Rr()); } break;
          case 10: if (center > 0) { link(T(), Rr()); link(L(), B()); } else { link(L(), T()); link(B(), Rr()); } break;
        }
      }
    }

    // Unisce i segmenti in anelli chiusi
    const loops = [];
    const visited = new Set();
    for (const start of links.keys()) {
      if (visited.has(start)) continue;
      const loop = [];
      let prev = null, cur = start;
      while (cur && !visited.has(cur)) {
        visited.add(cur);
        loop.push(pts.get(cur));
        const nb = links.get(cur) || [];
        const next = nb[0] !== prev && !visited.has(nb[0]) ? nb[0] : nb[1] !== prev && !visited.has(nb[1]) ? nb[1] : null;
        prev = cur;
        cur = next;
      }
      if (loop.length >= 6) loops.push(loop);
    }
    // Scarta eventuali isolette senza ricordi del tag (restano i buchi attorno agli esclusi)
    const inside = (pt, poly) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        if ((poly[i].y > pt.y) !== (poly[j].y > pt.y) &&
            pt.x < ((poly[j].x - poly[i].x) * (pt.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x) c = !c;
      }
      return c;
    };
    const kept = loops.filter((l) => rects.some((r) => inside(r, l)));
    const holes = loops.filter((l) => !kept.includes(l) && kept.some((k) => inside(l[0], k)));
    return kept.length ? kept.concat(holes) : loops;
  }

  // D3: campo "a bolle" (Bubble Sets semplificato) — un'unica isola per tag:
  // + i ricordi del tag, + i ponti dell'albero minimo che li collega (connessione garantita),
  // − i ricordi che NON hanno il tag (restano fuori dal contorno).
  function getClusterContours(tagLower, tagNodes, tagIndex) {
    const R = 22 + (tagIndex % 4) * 10;
    const toRect = (n) => ({
      x: n.x, y: n.y,
      hw: (n.w * (n.scale || 1)) / 2,
      hh: (n.h * (n.scale || 1)) / 2,
    });
    const rects = tagNodes.map(toRect);
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    rects.forEach((r) => { bx0 = Math.min(bx0, r.x); bx1 = Math.max(bx1, r.x); by0 = Math.min(by0, r.y); by1 = Math.max(by1, r.y); });
    const near = 160;
    const others = nodes
      .filter((n) => n.alpha > 0.3 && !tagNodes.includes(n) && n.x > bx0 - near && n.x < bx1 + near && n.y > by0 - near && n.y < by1 + near)
      .map(toRect);

    const q = (v) => Math.round(v / 3);
    const key = R + '|' + rects.map((r) => `${q(r.x)},${q(r.y)},${q(r.hw)},${q(r.hh)}`).join(';') +
      '|-' + others.map((r) => `${q(r.x)},${q(r.y)}`).join(';');
    const cached = clusterContourCache.get(tagLower);
    if (cached && cached.key === key) return cached.loops;

    // Albero ricoprente minimo (Prim) tra i ricordi del tag
    const edges = [];
    if (rects.length > 1) {
      const inTree = new Array(rects.length).fill(false);
      const best = new Array(rects.length).fill(Infinity);
      const from = new Array(rects.length).fill(-1);
      best[0] = 0;
      for (let it = 0; it < rects.length; it++) {
        let u = -1;
        for (let i = 0; i < rects.length; i++) if (!inTree[i] && (u < 0 || best[i] < best[u])) u = i;
        inTree[u] = true;
        if (from[u] >= 0) edges.push([rects[from[u]], rects[u]]);
        for (let v = 0; v < rects.length; v++) {
          if (inTree[v]) continue;
          const d = Math.hypot(rects[u].x - rects[v].x, rects[u].y - rects[v].y);
          if (d < best[v]) { best[v] = d; from[v] = u; }
        }
      }
    }

    const loops = computeClusterContours(rects, R, edges, others);
    clusterContourCache.set(tagLower, { key, loops });
    return loops;
  }

  // Aggiunge al path corrente un anello chiuso levigato (curve quadratiche sui punti medi)
  function appendSmoothLoop(ctx, pts) {
    const n = pts.length;
    if (n < 3) return;
    ctx.moveTo((pts[0].x + pts[n - 1].x) / 2, (pts[0].y + pts[n - 1].y) / 2);
    for (let i = 0; i < n; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    }
    ctx.closePath();
  }

  function drawClusterVennIslands(now) {
    const allTags = getDistinctTags();
    ctx.save();

    const clusterLabels = [];

    allTags.forEach((tag, tagIndex) => {
      // Crea il cluster SOLO se esiste almeno un ricordo effettivo con questo tag
      const tagLower = tag.toLowerCase().trim();
      const tagNodes = nodes.filter(
        (n) => Array.isArray(n.tags) && n.tags.some((t) => String(t).toLowerCase().trim() === tagLower)
      );
      if (tagNodes.length === 0) return;

      const palette = getTagPalette(tag);
      const isFocused = focusedClusterTag === tagLower;
      if (focusedClusterTag && !isFocused) return; // filtro attivo: gli altri cluster spariscono (D21)

      // Contorni organici (uno o più anelli) che avvolgono i ricordi del tag
      const loops = getClusterContours(tagLower, tagNodes, tagIndex);
      if (loops.length === 0) return;

      ctx.beginPath();
      for (const loop of loops) appendSmoothLoop(ctx, loop);

      // Riempimento a bassissima opacità per trasparenze additive tipo Venn
      ctx.fillStyle = palette.fill;
      ctx.fill('evenodd');

      ctx.strokeStyle = palette.stroke;
      ctx.lineWidth = isFocused ? 1.4 : 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Punto più alto del contorno per l'etichetta del tag
      let topPt = loops[0][0];
      for (const loop of loops) for (const p of loop) if (p.y < topPt.y) topPt = p;

      // Prepara etichetta (Title Case in Helvetica)
      const tagTitle = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
      ctx.font = '700 15.8px "Helvetica Neue", Helvetica, Arial, sans-serif';
      const textWidth = ctx.measureText(tagTitle).width;

      clusterLabels.push({
        tag: tagTitle,
        tagLower,
        x: topPt.x,
        y: topPt.y - 12,
        width: textWidth,
        color: palette.stroke,
        isFocused,
      });
    });

    // ── Motore Anti-Collisione Etichette dei Cluster ──────────────
    // Ordina le etichette per coordinata X
    clusterLabels.sort((a, b) => a.x - b.x);
    for (let i = 0; i < clusterLabels.length; i++) {
      for (let j = i + 1; j < clusterLabels.length; j++) {
        const l1 = clusterLabels[i];
        const l2 = clusterLabels[j];
        const minGapX = (l1.width + l2.width) / 2 + 18;
        if (Math.abs(l1.x - l2.x) < minGapX) {
          // Se collidono orizzontalmente e sono vicine in Y, sfalsa verticalmente la seconda
          if (Math.abs(l1.y - l2.y) < 24) {
            l2.y = l1.y - 24;
          }
        }
      }
    }

    // ── Rendering Etichette: Solo Nome, Nessun Micro-Pill di Sfondo ──
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const lbl of clusterLabels) {
      ctx.fillStyle = lbl.color;
      ctx.font = lbl.isFocused
        ? '700 18.5px "Helvetica Neue", Helvetica, Arial, sans-serif'
        : '700 15.8px "Helvetica Neue", Helvetica, Arial, sans-serif';
      ctx.fillText(lbl.tag, lbl.x, lbl.y);
    }

    ctx.restore();
  }

  // ── Timeline: Asse in Basso & Steli Annuali o Mensili ────────
  const OPEN_YEAR_GAP = 120; // distanza dell'anno aperto dall'ultimo mese (DIC)

  function drawTimelineGuides() {
    ctx.save();
    const baselineY = 220;

    // Baseline orizzontale continua
    ctx.beginPath();
    ctx.moveTo(-3200, baselineY);
    ctx.lineTo(3200, baselineY);
    ctx.strokeStyle = '#99251C';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const years = getDistinctYears();
    const countYears = Math.max(1, years.length);

    if (focusedTimelineYear !== null) {
      // ── VISTA MENSILE ESPANSA PER L'ANNO ATTIVO ────────────────
      const focusedYr = focusedTimelineYear;
      const monthSpacing = 160;
      const totalMonthSpan = 11 * monthSpacing;
      const startMonthX = -totalMonthSpan / 2;

      // 1. Anno aperto: solo l'anno scritto dopo DIC (D27; a sinistra finiva sotto la webcam), toccandolo si torna a tutti gli anni
      const isHoverClose = hoveredTimelineItem && hoveredTimelineItem.type === 'close';
      ctx.save();
      ctx.fillStyle = '#99251C';
      ctx.font = `700 ${isHoverClose ? 34 : 31}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(String(focusedYr), startMonthX + totalMonthSpan + OPEN_YEAR_GAP, baselineY + 38);
      ctx.restore();

      // 2. Steli mensili per ciascuno dei 12 mesi
      for (let m = 1; m <= 12; m++) {
        const mx = startMonthX + (m - 1) * monthSpacing;
        const mNodes = nodes.filter((n) => n.dateInfo.year === focusedYr && n.dateInfo.month === m);
        const hasMemories = mNodes.length > 0;

        let totalStackHeight = 50;
        mNodes.forEach((n) => {
          totalStackHeight += (n.h * 0.95) + 18;
        });
        const stackHeight = hasMemories ? Math.max(90, totalStackHeight) : 22;

        ctx.save();
        // Stelo verticale del mese
        ctx.beginPath();
        ctx.moveTo(mx, baselineY);
        ctx.lineTo(mx, baselineY - stackHeight);
        ctx.strokeStyle = hasMemories ? '#99251C' : 'rgba(234, 219, 206, 0.65)';
        ctx.lineWidth = hasMemories ? 1.5 : 0.8;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Punto di ancoraggio sulla baseline
        ctx.beginPath();
        ctx.arc(mx, baselineY, hasMemories ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = hasMemories ? '#99251C' : '#D6C3AF';
        ctx.fill();

        // Nome mese (GEN, FEB, ...)
        ctx.fillStyle = hasMemories ? '#99251C' : 'rgba(153, 37, 28, 0.35)';
        ctx.font = hasMemories
          ? '700 17.6px "Helvetica Neue", Helvetica, Arial, sans-serif'
          : '700 14.1px "Helvetica Neue", Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(MONTH_NAMES[m - 1], mx, baselineY + 28);

        // Conteggio memorie se presenti
        if (hasMemories) {
          ctx.font = '600 9.5px "Instrument Sans", sans-serif';
          ctx.fillStyle = 'rgba(153, 37, 28, 0.75)';
          ctx.fillText(`${mNodes.length} ${mNodes.length === 1 ? 'ricordo' : 'ricordi'}`, mx, baselineY + 44);
        }

        ctx.restore();
      }

      // 3. Steli per gli altri anni esterni
      const earlierYears = years.filter((y) => y < focusedYr);
      const laterYears = years.filter((y) => y > focusedYr);

      earlierYears.forEach((yr, eIdx) => {
        const x = startMonthX - 340 - (earlierYears.length - 1 - eIdx) * 260;
        const yearNodes = nodes.filter((n) => n.dateInfo.year === yr);
        const isHoverYr = hoveredTimelineItem && hoveredTimelineItem.type === 'year' && hoveredTimelineItem.year === yr;
        drawExternalYearStem(ctx, x, yr, yearNodes.length, baselineY, isHoverYr);
      });

      laterYears.forEach((yr, lIdx) => {
        const x = startMonthX + totalMonthSpan + 340 + lIdx * 260;
        const yearNodes = nodes.filter((n) => n.dateInfo.year === yr);
        const isHoverYr = hoveredTimelineItem && hoveredTimelineItem.type === 'year' && hoveredTimelineItem.year === yr;
        drawExternalYearStem(ctx, x, yr, yearNodes.length, baselineY, isHoverYr);
      });

    } else {
      // ── PANORAMICA GLOBALE ANNI ────────────────────────────────
      const yearSpacing = 360;
      const startX = -((countYears - 1) * yearSpacing) / 2;

      years.forEach((yr, idx) => {
        const x = startX + idx * yearSpacing;
        const yearNodes = nodes.filter((n) => n.dateInfo.year === yr);
        const isHoverYr = hoveredTimelineItem && hoveredTimelineItem.type === 'year' && hoveredTimelineItem.year === yr;

        let totalStackHeight = 50;
        yearNodes.forEach((n) => {
          totalStackHeight += (n.h * 0.95) + 18;
        });
        const stackHeight = Math.max(90, totalStackHeight);

        ctx.save();
        // Stelo verticale tratteggiato verso l'alto
        ctx.beginPath();
        ctx.moveTo(x, baselineY);
        ctx.lineTo(x, baselineY - stackHeight);
        ctx.strokeStyle = isHoverYr ? '#99251C' : '#EADBCE';
        ctx.lineWidth = isHoverYr ? 2.0 : 1.3;
        ctx.setLineDash(isHoverYr ? [4, 2] : [3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Punto di ancoraggio sulla baseline
        ctx.beginPath();
        ctx.arc(x, baselineY, isHoverYr ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#99251C';
        ctx.fill();

        // Etichetta anno
        ctx.fillStyle = '#99251C';
        ctx.font = isHoverYr ? '700 28.2px "Helvetica Neue", Helvetica, Arial, sans-serif' : '700 24.6px "Helvetica Neue", Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(yr), x, baselineY + (isHoverYr ? 38 : 36));

        // Conteggio memorie
        ctx.font = '600 10px "Instrument Sans", sans-serif';
        ctx.fillStyle = isHoverYr ? '#99251C' : 'rgba(153, 37, 28, 0.70)';
        ctx.fillText(`${yearNodes.length} ricordi`, x, baselineY + 54);

        ctx.restore();
      });
    }

    ctx.restore();
  }

  function drawExternalYearStem(ctx, x, yr, count, baselineY, isHover = false) {
    ctx.save();
    ctx.globalAlpha = isHover ? 0.90 : 0.40;
    ctx.beginPath();
    ctx.moveTo(x, baselineY);
    ctx.lineTo(x, baselineY - 120);
    ctx.strokeStyle = isHover ? '#99251C' : '#EADBCE';
    ctx.lineWidth = isHover ? 1.8 : 1.0;
    ctx.setLineDash([3, 4]);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, baselineY, isHover ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#99251C';
    ctx.fill();

    ctx.fillStyle = '#99251C';
    ctx.font = isHover ? '700 22px "Helvetica Neue", Helvetica, Arial, sans-serif' : '700 19.4px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(yr), x, baselineY + 32);

    ctx.font = '600 9px "Instrument Sans", sans-serif';
    ctx.fillText(`${count} ricordi`, x, baselineY + 46);
    ctx.restore();
  }

  // ── Hit-Testing Interattivo per la Timeline (Clic su Anni e Mesi) ──
  function hitTestTimeline(screenX, screenY) {
    if (currentLayout !== 'timeline') return null;
    const worldP = screenToWorld(screenX, screenY);
    const baselineY = 220;

    if (focusedTimelineYear !== null) {
      // 1. Clic sull'anno aperto: torna a tutti gli anni
      const openYearX = (11 * 160) / 2 + OPEN_YEAR_GAP;
      if (Math.abs(worldP.x - openYearX) < 60 && worldP.y >= baselineY + 5 && worldP.y <= baselineY + 52) {
        return { type: 'close' };
      }
      // 2. Clic su un altro anno visibile ai lati
      const years = getDistinctYears();
      const monthSpacing = 160;
      const totalMonthSpan = 11 * monthSpacing;
      const startMonthX = -totalMonthSpan / 2;
      const earlierYears = years.filter((y) => y < focusedTimelineYear);
      const laterYears = years.filter((y) => y > focusedTimelineYear);

      for (let i = 0; i < earlierYears.length; i++) {
        const yr = earlierYears[i];
        const x = startMonthX - 340 - (earlierYears.length - 1 - i) * 260;
        if (Math.hypot(worldP.x - x, worldP.y - (baselineY + 36)) < 45 || (Math.abs(worldP.x - x) < 30 && worldP.y <= baselineY && worldP.y >= baselineY - 140)) {
          return { type: 'year', year: yr };
        }
      }
      for (let i = 0; i < laterYears.length; i++) {
        const yr = laterYears[i];
        const x = startMonthX + totalMonthSpan + 340 + i * 260;
        if (Math.hypot(worldP.x - x, worldP.y - (baselineY + 36)) < 45 || (Math.abs(worldP.x - x) < 30 && worldP.y <= baselineY && worldP.y >= baselineY - 140)) {
          return { type: 'year', year: yr };
        }
      }
    } else {
      // 3. Panoramica: clic su un'etichetta anno o stelo
      const years = getDistinctYears();
      const countYears = Math.max(1, years.length);
      const yearSpacing = 360;
      const startX = -((countYears - 1) * yearSpacing) / 2;

      for (let idx = 0; idx < years.length; idx++) {
        const yr = years[idx];
        const x = startX + idx * yearSpacing;
        if (Math.hypot(worldP.x - x, worldP.y - (baselineY + 36)) < 45 || (Math.abs(worldP.x - x) < 35 && worldP.y <= baselineY && worldP.y >= baselineY - 240)) {
          return { type: 'year', year: yr };
        }
      }
    }
    return null;
  }

  // ── Badge Play per Video ─────────────────────────────────────
  function drawVideoBadge(ctx, cx, cy, w, h, isHover) {
    const badgeR = Math.min(13, Math.max(8, Math.min(w, h) * 0.20));
    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.arc(cx, cy, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = isHover ? 'rgba(153, 37, 28, 0.92)' : 'rgba(26, 22, 20, 0.68)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 253, 249, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Triangolo play bianco
    ctx.beginPath();
    const triH = badgeR * 0.52;
    ctx.moveTo(cx - triH * 0.45, cy - triH * 0.65);
    ctx.lineTo(cx + triH * 0.75, cy);
    ctx.lineTo(cx - triH * 0.45, cy + triH * 0.65);
    ctx.closePath();
    ctx.fillStyle = '#FFFDF9';
    ctx.fill();
    ctx.restore();
  }

  // ── Filamenti di connessione (Ottimizzato con Path Batching) ──
  // Collegamenti tra ricordi: SOLO tag in comune (D22). Ogni linea ha il colore del tema
  // condiviso; puntando un ricordo le sue linee si accendono e mostrano il nome del tema.
  function drawFilaments(now) {
    if (nodes.length < 2) return;
    ctx.save();

    const passiveByColor = new Map();
    const activeLines = [];

    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      if (n1.alpha < 0.15) continue;

      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        if (n2.alpha < 0.15) continue;

        const shared = n1.tags.find((t) => n2.tags.includes(t));
        if (!shared) continue;

        const wave1 = fabricWave.active ? getWaveOffset(n1.x, n1.y, now) : { dx: 0, dy: 0 };
        const wave2 = fabricWave.active ? getWaveOffset(n2.x, n2.y, now) : { dx: 0, dy: 0 };
        const line = [n1.x + wave1.dx, n1.y + wave1.dy, n2.x + wave2.dx, n2.y + wave2.dy];
        const color = '#99251C'; // D2: collegamenti sempre bordeaux, non per tema

        if (hoveredNode && (hoveredNode === n1 || hoveredNode === n2)) {
          activeLines.push({ line, color, tag: shared });
        } else {
          if (!passiveByColor.has(color)) passiveByColor.set(color, []);
          passiveByColor.get(color).push(line);
        }
      }
    }

    // 1. Collegamenti passivi: una draw call per colore
    ctx.lineWidth = 1.0;
    ctx.globalAlpha = hoveredNode ? 0.08 : 0.32;
    passiveByColor.forEach((lines, color) => {
      ctx.beginPath();
      for (const l of lines) { ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); }
      ctx.strokeStyle = color;
      ctx.stroke();
    });

    // 2. Collegamenti del ricordo puntato, con il nome del tema a metà linea
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.2;
    for (const a of activeLines) {
      ctx.beginPath();
      ctx.moveTo(a.line[0], a.line[1]);
      ctx.lineTo(a.line[2], a.line[3]);
      ctx.strokeStyle = a.color;
      ctx.stroke();
    }
    ctx.font = '700 13px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const a of activeLines) {
      const mx = (a.line[0] + a.line[2]) / 2;
      const my = (a.line[1] + a.line[3]) / 2;
      const label = a.tag.charAt(0).toUpperCase() + a.tag.slice(1);
      const w = ctx.measureText(label).width + 10;
      ctx.fillStyle = 'rgba(249, 246, 240, 0.92)';
      ctx.fillRect(mx - w / 2, my - 9, w, 18);
      ctx.fillStyle = a.color;
      ctx.fillText(label, mx, my);
    }

    ctx.restore();
  }

  // ── Miniature Fotografiche (Solo bordo caldo, no cornice panna) ──
  function drawThumbnails(now) {
    (drawOrder.length === nodes.length ? drawOrder : nodes).forEach((node) => {
      if (node.alpha <= 0.02) return;

      ctx.save();
      ctx.globalAlpha = node.alpha;

      const wave = fabricWave.active ? getWaveOffset(node.x, node.y, now) : { dx: 0, dy: 0 };
      const nx = node.x + wave.dx;
      const ny = node.y + wave.dy;

      const w = node.w * node.scale;
      const h = node.h * node.scale;
      const r = node.radius * node.scale;
      const isHover = (hoveredNode === node);

      const x0 = nx - w / 2;
      const y0 = ny - h / 2;

      // Ombra calcolata SOLO su hover
      if (isHover) {
        ctx.shadowColor = 'rgba(153, 37, 28, 0.22)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }

      const mediaType = (node.memory.media_type || '').toLowerCase();
      const mediaUrl = node.memory.media_url || (mediaType === 'text' ? textCardKey(node.memory) : '');

      // Disegno del media a spigoli vivi (nessun bordo stondato, nessuna cornice panna)
      if ((mediaType === 'image' || mediaType === 'video' || mediaType === 'text') && imageCache.has(mediaUrl)) {
        const img = imageCache.get(mediaUrl);
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;
        if (natW && natH && (!node.aspectRatio || Math.abs(node.aspectRatio - (natW / natH)) > 0.02)) {
          applyNodeAspectRatio(node, natW / natH);
        }

        ctx.drawImage(img, x0, y0, w, h);

        // Se è un video, mostra indicatore play elegante sul primo frame
        if (mediaType === 'video') {
          drawVideoBadge(ctx, nx, ny, w, h, isHover);
        }
      } else if (mediaType === 'video') {
        // Fallback video se il frame non è ancora estratto
        ctx.fillStyle = '#F8F3EC';
        ctx.fillRect(x0, y0, w, h);
        drawVideoBadge(ctx, nx, ny, w, h, isHover);
      } else if (mediaType === 'audio') {
        // Minimal warm audio card a spigoli vivi
        ctx.fillStyle = '#F8F3EC';
        ctx.fillRect(x0, y0, w, h);

        ctx.fillStyle = '#99251C';
        ctx.font = '700 16px "Instrument Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('♪', nx, ny - 4);

        ctx.font = '700 8px "Instrument Sans", sans-serif';
        ctx.fillText('AUDIO', nx, ny + 12);
      } else if (mediaType === 'model3d') {
        ctx.fillStyle = '#F8F3EC';
        ctx.fillRect(x0, y0, w, h);
        ctx.fillStyle = '#99251C';
        ctx.font = '700 17.6px "Helvetica Neue", Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('3D', nx, ny - 2);
        ctx.font = '700 7.5px "Instrument Sans", sans-serif';
        ctx.fillText('MODELLO', nx, ny + 12);
      } else {
        // Text / Default memory a spigoli vivi
        ctx.fillStyle = '#F8F3EC';
        ctx.fillRect(x0, y0, w, h);

        ctx.fillStyle = '#99251C';
        ctx.font = '700 15.8px "Helvetica Neue", Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('“ ”', nx, ny - 2);

        ctx.font = '700 7.5px "Instrument Sans", sans-serif';
        ctx.fillText('MEMORIA', nx, ny + 12);
      }

      // Bordo caldo sottile editoriale (#EADBCE / #99251C su hover)
      ctx.strokeStyle = isHover ? '#99251C' : '#EADBCE';
      ctx.lineWidth = isHover ? 1.5 : 0.85;
      ctx.strokeRect(x0, y0, w, h);

      ctx.restore();
    });
  }

  // ── Griglia Metadata (Solo Titolo e Data sotto la foto) ──────
  function drawGridMetadata() {
    ctx.save();
    nodes.forEach((node) => {
      if (node.alpha < 0.2) return;

      const w = node.w * node.scale;
      const h = node.h * node.scale;
      const x = node.x;
      const y = node.y + h / 2 + 14;

      // Line 1: Titolo (Helvetica: naturale, mai in caps lock)
      ctx.fillStyle = '#99251C';
      ctx.font = '700 11.4px "Helvetica Neue", Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      const title = node.memory.title || 'Senza titolo';
      const truncTitle = title.length > 22 ? title.substring(0, 20) + '…' : title;
      ctx.fillText(truncTitle, x, y);

      // Line 2: Data
      ctx.font = '700 8.5px "Instrument Sans", sans-serif';
      ctx.fillStyle = 'rgba(153, 37, 28, 0.65)';
      const dateStr = node.memory.time_event || (node.dateInfo.year ? `${node.dateInfo.year}` : 'STOÀ');
      ctx.fillText(String(dateStr).toUpperCase(), x, y + 13);
    });
    ctx.restore();
  }

  // Start animation loop
  requestAnimationFrame(render);

  return {
    // Debug (solo lettura): stato camera e box dei nodi visibili
    debugInfo: () => ({
      camera: { ...camera }, width, height, fitZoom, layout: currentLayout, focusedClusterTag,
      nodes: nodes.map((n) => ({ x: Math.round(n.targetX), y: Math.round(n.targetY), w: n.w, h: n.h, a: n.targetAlpha })),
    }),
    setLayout,
    setFilter,
    setFloor,
    setTimelineYear,
    setClusterTag,
    setGridSort,
    setMemories,
    addMemory,
    triggerFabricWave,
    pan,
    zoom,
    setHoverPoint,
    hitTest,
    hitTestTimeline,
    hitTestRoom,
    setPlanRoom,
    getFocusedRoom: () => focusedRoom,
    setOnTimelineYearChange: (fn) => { onTimelineYearChange = fn; },
    getFocusedTimelineYear: () => focusedTimelineYear,
    getHoveredTimelineItem: () => hoveredTimelineItem,
    getHoveredNode: () => hoveredNode,
    getCamera: () => camera,
    getDistinctYears,
    getDistinctTags,
    getTextCard: (memory) => {
      const c = memory && imageCache.get(textCardKey(memory));
      return c && c.toDataURL ? c.toDataURL('image/png') : '';
    },
    getVideoPoster: (url) => {
      if (url && imageCache.has(url)) {
        const item = imageCache.get(url);
        if (item instanceof HTMLCanvasElement) {
          try {
            return item.toDataURL();
          } catch (_) {
            return null;
          }
        }
      }
      return null;
    },
  };
}
