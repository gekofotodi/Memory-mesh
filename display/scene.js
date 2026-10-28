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
      salone:      { x: -50,  y: 30,   w: 220, h: 160, label: 'Salone Centrale' },
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
  design:        { stroke: '#99251C', fill: 'rgba(153, 37, 28, 0.05)' },
  social:        { stroke: '#26DE81', fill: 'rgba(38, 222, 129, 0.05)' },
  talk:          { stroke: '#2E6BFF', fill: 'rgba(46, 107, 255, 0.05)' },
  laboratorio:   { stroke: '#F39C12', fill: 'rgba(243, 156, 18, 0.05)' },
  sport:         { stroke: '#E17055', fill: 'rgba(225, 112, 85, 0.05)' },
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

  // ── Scene State ──────────────────────────────────────────────
  let currentLayout = 'nodi';
  let currentFilter = 'all';
  let activeFloor = 'terra';
  let planimetriaEntranceTime = 0;
  let gridSortMode = 'data';
  let focusedTimelineYear = null;
  let focusedClusterTag = null;

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
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    recalculateLayoutTargets();
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

  function worldToScreen(wx, wy) {
    return {
      x: (wx - camera.x) * camera.zoom + width / 2,
      y: (wy - camera.y) * camera.zoom + height / 2,
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
    triggerFabricWave(newNode.x, newNode.y);
  }

  // ── Layout Target Calculation ────────────────────────────────
  function recalculateLayoutTargets() {
    if (!nodes.length) return;

    switch (currentLayout) {
      // 1. Nodi — Costellazione aurea stabile e armoniosa
      case 'nodi': {
        const count = nodes.length;
        nodes.forEach((node, i) => {
          const phi = i * 2.39996; // Angolo aureo per distribuzione uniforme e naturale
          const dist = 160 + Math.sqrt(i + 1) * 76;
          node.baseX = Math.cos(phi) * dist;
          node.baseY = Math.sin(phi) * dist * 0.74;
          node.targetX = node.baseX;
          node.targetY = node.baseY;
          node.targetScale = 1.0;
          node.targetAlpha = 1.0;
        });

        // Anti-collisione preliminare per garantire una spaziatura eccellente tra le miniature
        for (let iter = 0; iter < 18; iter++) {
          for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              const nA = nodes[i];
              const nB = nodes[j];
              const dx = nB.targetX - nA.targetX;
              const dy = nB.targetY - nA.targetY;
              const d = Math.hypot(dx, dy) || 1;
              const req = (nA.w + nB.w) / 2 + 42;
              if (d < req) {
                const push = (req - d) * 0.5;
                nA.targetX -= (dx / d) * push;
                nA.targetY -= (dy / d) * push;
                nB.targetX += (dx / d) * push;
                nB.targetY += (dy / d) * push;
              }
            }
          }
        }
        nodes.forEach((node) => {
          node.baseX = node.targetX;
          node.baseY = node.targetY;
        });
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

        // Raggruppa le memorie per tag primario
        const nodesByTag = new Map();
        nodes.forEach((node) => {
          const pTag = String(node.primaryTag || 'default').toLowerCase();
          if (!nodesByTag.has(pTag)) nodesByTag.set(pTag, []);
          nodesByTag.get(pTag).push(node);
        });

        // Distribuzione spaziale ampia e ordinata all'interno di ciascun cluster
        nodesByTag.forEach((tagNodes, pTag) => {
          const center = tagCenters.get(pTag) || { x: 0, y: 0 };
          const K = tagNodes.length;

          if (K === 1) {
            tagNodes[0].targetX = center.x;
            tagNodes[0].targetY = center.y;
          } else if (K === 2) {
            tagNodes[0].targetX = center.x - 76;
            tagNodes[0].targetY = center.y;
            tagNodes[1].targetX = center.x + 76;
            tagNodes[1].targetY = center.y;
          } else {
            // Raggio dimensionato in modo che la distanza perimetrale sia sempre > 140px
            const ringR = Math.max(95, 52 * K);
            tagNodes.forEach((node, kIdx) => {
              const theta = (kIdx / K) * Math.PI * 2;
              node.targetX = center.x + Math.cos(theta) * ringR;
              node.targetY = center.y + Math.sin(theta) * (ringR * 0.82);
            });
          }

          // Lieve attrazione morbida se ci sono tag secondari
          tagNodes.forEach((node) => {
            const nodeTags = Array.isArray(node.tags) && node.tags.length ? node.tags : [node.primaryTag];
            const otherTags = nodeTags.filter((t) => String(t).toLowerCase() !== pTag);
            if (otherTags.length > 0) {
              let sx = 0, sy = 0, sc = 0;
              otherTags.forEach((t) => {
                const c = tagCenters.get(String(t).toLowerCase());
                if (c) { sx += c.x; sy += c.y; sc++; }
              });
              if (sc > 0) {
                sx /= sc; sy /= sc;
                const dx = sx - center.x;
                const dy = sy - center.y;
                const d = Math.hypot(dx, dy) || 1;
                const nudge = Math.min(32, d * 0.12);
                node.targetX += (dx / d) * nudge;
                node.targetY += (dy / d) * nudge;
              }
            }
            node.targetScale = 1.0;
            node.targetAlpha = 1.0;
          });
        });

        // Passata di rilassamento fisico anti-sovrapposizione (garantisce zero overlap)
        for (let iter = 0; iter < 24; iter++) {
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
        break;
      }

      // 3. Planimetria — Spaccato assonometrico e stanze del piano attivo
      case 'planimetria': {
        const currentFloorObj = FLOORS[activeFloor] || FLOORS.terra;
        const roomCounts = {};

        nodes.forEach((node) => {
          const loc = (node.memory.location_tag || '').toLowerCase().trim();
          let targetRoom = currentFloorObj.rooms[loc];

          // Check if memory belongs to a room on the active floor
          if (!targetRoom) {
            node.targetAlpha = 0.0;
            node.targetScale = 0.3;
            node.targetX = 0;
            node.targetY = -800;
            return;
          }

          node.targetAlpha = 1.0;
          node.targetScale = 0.95;

          const count = roomCounts[loc] || 0;
          roomCounts[loc] = count + 1;

          // Dispersione controllata attorno al baricentro 2D della stanza
          const angle = count * 1.6;
          const maxDistX = Math.max(8, targetRoom.w * 0.24);
          const maxDistY = Math.max(8, targetRoom.h * 0.24);
          const rx = targetRoom.x + Math.cos(angle) * Math.min(maxDistX, 32);
          const ry = targetRoom.y + Math.sin(angle) * Math.min(maxDistY, 24);

          // Proiezione in assonometria (quota z = 0 poiché il piano attivo si colloca al centro)
          const iso = toIso(rx, ry, 0);
          node.targetX = iso.x;
          node.targetY = iso.y - 18; // Fluttua sul pavimento della stanza
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

  // ── Mode Switchers ───────────────────────────────────────────
  function setLayout(layoutName) {
    if (currentLayout === layoutName) return;
    currentLayout = layoutName;

    if (layoutName === 'planimetria') {
      planimetriaEntranceTime = performance.now();
      camera.targetX = 0;
      camera.targetY = 0;
      camera.targetZoom = 1.0;
    } else if (layoutName === 'griglia') {
      camera.targetX = 0;
      camera.targetZoom = 1.0;
    } else if (layoutName === 'timeline') {
      camera.targetX = 0;
      camera.targetY = 60;
      camera.targetZoom = 0.95;
      focusedTimelineYear = null;
    }

    recalculateLayoutTargets();
  }

  function setFilter(filterName) {
    currentFilter = filterName;
  }

  function setFloor(floorKey) {
    if (!FLOORS[floorKey]) return;
    activeFloor = floorKey;
    camera.targetX = 0;
    camera.targetY = 0;
    // Transizione morbida di scorrimento verso il nuovo piano selezionato (2.4s)
    planimetriaEntranceTime = performance.now() - 2400;
  }

  let onTimelineYearChange = null;

  function setTimelineYear(year, skipCallback = false) {
    if (!year || year === 'all') {
      focusedTimelineYear = null;
      camera.targetX = 0;
      camera.targetY = 60;
      camera.targetZoom = 0.95;
      recalculateLayoutTargets();
      if (!skipCallback && onTimelineYearChange) onTimelineYearChange('all');
      return;
    }

    const yr = parseInt(year, 10);
    focusedTimelineYear = yr;

    // Quando un anno è aperto sui mesi, centrare la visuale sui 12 mesi
    camera.targetX = 0;
    camera.targetY = 40;
    camera.targetZoom = 1.0;
    recalculateLayoutTargets();
    if (!skipCallback && onTimelineYearChange) onTimelineYearChange(String(yr));
  }

  function setClusterTag(tag) {
    if (!tag) {
      focusedClusterTag = null;
      camera.targetX = 0;
      camera.targetY = 0;
      camera.targetZoom = 1.0;
      return;
    }
    const tagLower = tag.toLowerCase().trim();
    focusedClusterTag = tagLower;

    const matchingNodes = nodes.filter(
      (n) => Array.isArray(n.tags) && n.tags.some((t) => String(t).toLowerCase().trim() === tagLower)
    );

    if (matchingNodes.length > 0) {
      let cx = 0, cy = 0;
      matchingNodes.forEach((n) => { cx += n.targetX; cy += n.targetY; });
      cx /= matchingNodes.length;
      cy /= matchingNodes.length;

      camera.targetX = cx;
      camera.targetY = cy;
      camera.targetZoom = 1.35;
    }
  }

  function setGridSort(sortKey) {
    gridSortMode = sortKey;
    recalculateLayoutTargets();
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
    // In griglia: pan solo verticale, larghezza fissa allo schermo
    if (currentLayout === 'griglia') {
      camera.targetY -= dy / camera.zoom;
      return;
    }
    camera.targetX -= dx / camera.zoom;
    camera.targetY -= dy / camera.zoom;
  }

  function zoom(factor) {
    // In griglia zoom disattivato o molto controllato
    if (currentLayout === 'griglia') return;
    camera.targetZoom = Math.min(camera.maxZoom, Math.max(camera.minZoom, camera.targetZoom * factor));

    if (currentLayout === 'timeline') {
      // Zoom semantico: se si ingrandisce (targetZoom >= 1.20) e nessun anno è aperto,
      // apri automaticamente l'anno più vicino al centro della visuale
      if (camera.targetZoom >= 1.20 && focusedTimelineYear === null) {
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
        camera.targetZoom = 1.05;
      } else if (camera.targetZoom <= 0.76 && focusedTimelineYear !== null) {
        // Quando ci si allontana con lo zoom (<= 0.76), ritorna alla panoramica di tutti gli anni
        setTimelineYear(null);
        camera.targetZoom = 0.95;
      } else {
        recalculateLayoutTargets();
      }
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
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
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
  function updateForces() {
    if (currentLayout !== 'nodi') return;

    // Movimento molto lento, calmo e meditativo: i nodi rimangono ancorati alla loro
    // posizione e hanno solo un leggero galleggiamento sul posto (nessun moto caotico o deriva)
    const time = performance.now() * 0.00030;

    nodes.forEach((node, idx) => {
      if (node.baseX === undefined) {
        node.baseX = node.targetX;
        node.baseY = node.targetY;
      }
      const phase = time + idx * 0.95;
      const floatX = Math.sin(phase) * 4.2;
      const floatY = Math.cos(phase * 0.85) * 3.6;

      node.targetX = node.baseX + floatX;
      node.targetY = node.baseY + floatY;
    });
  }

  // ── Update Logic (Movimenti lenti, vellutati e organici) ────
  function update() {
    camera.x += (camera.targetX - camera.x) * 0.042;
    camera.y += (camera.targetY - camera.y) * 0.042;
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.042;

    updateForces();

    nodes.forEach((node) => {
      node.x += (node.targetX - node.x) * 0.038;
      node.y += (node.targetY - node.y) * 0.038;

      const isHover = (hoveredNode === node);
      let targetS = isHover ? node.targetScale * 1.25 : node.targetScale;
      node.scale += (targetS - node.scale) * 0.055;

      // Nessun nodo scompare mai: visibilità sempre piena e stabile
      let targetA = 1.0;
      if (!isNodeMatchingFilter(node)) targetA = 0.35;

      node.alpha += (targetA - node.alpha) * 0.045;
    });

    if (pointerScreen.x > 0 && pointerScreen.y > 0) {
      hoveredNode = hitTest(pointerScreen.x, pointerScreen.y);
    } else {
      hoveredNode = null;
    }
  }

  // ── Render Loop (60 FPS) ─────────────────────────────────────
  function render() {
    update();
    const now = performance.now();

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Light Mode Exhibition Gallery Background (#F9F6F0)
    ctx.fillStyle = '#F9F6F0';
    ctx.fillRect(0, 0, width, height);

    // Camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 1. Guides and Background Layouts
    if (currentLayout === 'planimetria') {
      drawPlanimetriaAssonometria(now);
    } else if (currentLayout === 'timeline') {
      drawTimelineGuides();
    } else if (currentLayout === 'cluster') {
      drawClusterVennIslands(now);
    }

    // 2. Filaments (Nodi & Cluster su hover interattivo)
    if (currentLayout === 'nodi' || (currentLayout === 'cluster' && hoveredNode)) {
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

  // ── Planimetria: Spaccato Assonometrico Esploso a 3 Piani ────
  function drawPlanimetriaAssonometria(now) {
    const elapsed = now - planimetriaEntranceTime;
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

    const activeBaseZ = floorBaseZ[activeFloor] !== undefined ? floorBaseZ[activeFloor] : -220;

    // ── Calcolo dinamico dell'esploso e transizione (tempi lenti e contemplativi) ──
    // 0 -> 2400ms: tutti e tre i piani visibili nell'esploso verticale
    // 2400ms -> 4800ms: i due piani non selezionati scivolano via e sfumano lentamente
    // > 4800ms: rimane visibile al centro solo il piano selezionato
    let guideOpacity = 0.0;
    const floorStates = {};

    const floorOrder = ['terra', 'primo', 'secondo'];

    if (elapsed <= 2400) {
      // Fase 1: Esploso stabile a 3 piani (2.4s per apprezzare l'edificio nella sua interezza)
      guideOpacity = 1.0;
      floorOrder.forEach((fKey) => {
        const isActive = (fKey === activeFloor);
        floorStates[fKey] = {
          z: floorBaseZ[fKey],
          opacity: isActive ? 1.0 : 0.88,
          isActive,
        };
      });
    } else if (elapsed <= 4800) {
      // Fase 2: Transizione lenta e maestosa (2.4s)
      const t = (elapsed - 2400) / 2400;
      const ease = 0.5 - 0.5 * Math.cos(t * Math.PI); // easeInOut
      guideOpacity = Math.max(0, 1.0 - ease * 1.2);

      floorOrder.forEach((fKey) => {
        const isActive = (fKey === activeFloor);
        const bZ = floorBaseZ[fKey];

        if (isActive) {
          // Il piano attivo si porta verso il centro (z = 0)
          floorStates[fKey] = {
            z: bZ + (0 - bZ) * ease,
            opacity: 1.0,
            isActive: true,
          };
        } else {
          // I piani non attivi scivolano via e sfumano dolcemente
          const dir = bZ > activeBaseZ ? 1 : -1;
          floorStates[fKey] = {
            z: bZ + dir * ease * 300,
            opacity: Math.max(0, (1 - ease) * 0.88),
            isActive: false,
          };
        }
      });
    } else {
      // Fase 3: Solo piano attivo al centro
      guideOpacity = 0.0;
      floorOrder.forEach((fKey) => {
        const isActive = (fKey === activeFloor);
        floorStates[fKey] = {
          z: 0,
          opacity: isActive ? 1.0 : 0.0,
          isActive,
        };
      });
    }

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
        ctx.font = 'italic 13px "Instrument Serif", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(room.label, mid.x, mid.y);
      });

      // E) Intestazione del piano a bordo soletta (Solo Nome Piano, nessun codice di livello)
      const labelPos = toIso(minX, minY, z);
      ctx.fillStyle = '#99251C';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = 'italic 18px "Instrument Serif", Georgia, serif';
      ctx.fillText(fl.label, labelPos.x - 30, labelPos.y - 14);

      ctx.restore();
    });

    ctx.restore();
  }

  // ── Cluster: Geometria ad Inviluppo Organico Morbido (Convex Hull & Bézier Spline) ──
  function computeConvexHull(pts) {
    if (pts.length <= 2) return pts.slice();
    const sorted = pts.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
    function crossProduct(o, a, b) {
      return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }
    const lower = [];
    for (let i = 0; i < sorted.length; i++) {
      while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
        lower.pop();
      }
      lower.push(sorted[i]);
    }
    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
        upper.pop();
      }
      upper.push(sorted[i]);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  // ── Smoothing Chaikin per Archi e Tangenti Fluidi ─────────────
  function chaikinSmooth(pts, iterations = 2) {
    let current = pts.slice();
    for (let it = 0; it < iterations; it++) {
      const next = [];
      const len = current.length;
      for (let i = 0; i < len; i++) {
        const p0 = current[i];
        const p1 = current[(i + 1) % len];
        next.push({
          x: 0.75 * p0.x + 0.25 * p1.x,
          y: 0.75 * p0.y + 0.25 * p1.y,
        });
        next.push({
          x: 0.25 * p0.x + 0.75 * p1.x,
          y: 0.25 * p0.y + 0.75 * p1.y,
        });
      }
      current = next;
    }
    return current;
  }

  function generateOrganicHullPoints(tagNodes, tagIndex, now) {
    const N = tagNodes.length;
    if (N === 0) return [];

    // Disambiguazione perimetri concentrici progressivi per tag multipli/condivisi
    const basePadding = 42 + (tagIndex % 4) * 12;
    const breath = Math.sin(now * 0.0012 + tagIndex * 1.35) * 3;

    // Campionamento radiale attorno a ciascun nodo: il cluster si adatta alla dimensione reale del ricordo
    const K = 16;
    const samplePts = [];
    tagNodes.forEach((node) => {
      const halfW = (node.w * (node.scale || 1.0)) / 2;
      const halfH = (node.h * (node.scale || 1.0)) / 2;
      const padX = halfW + basePadding + breath;
      const padY = halfH + basePadding + breath;

      for (let k = 0; k < K; k++) {
        const theta = (k / K) * Math.PI * 2;
        const wobble = Math.sin(theta * 2 + tagIndex * 1.4 + now * 0.0008) * 4 +
                       Math.cos(theta * 3 - tagIndex) * 3;
        const rx = padX + wobble;
        const ry = padY + wobble;
        samplePts.push({
          x: node.x + Math.cos(theta) * rx,
          y: node.y + Math.sin(theta) * ry,
        });
      }
    });

    // Inviluppo convesso globale che racchiude tutti i punti dilatati
    const envelope = computeConvexHull(samplePts);
    if (envelope.length < 3) return envelope;

    // Smoothing continuo con Chaikin Corner Cutting (2 passate) per morbidezza perfetta
    return chaikinSmooth(envelope, 2);
  }

  function drawSmoothClosedBlob(ctx, pts) {
    if (pts.length < 3) return;
    ctx.beginPath();
    const mid0 = {
      x: (pts[0].x + pts[pts.length - 1].x) / 2,
      y: (pts[0].y + pts[pts.length - 1].y) / 2,
    };
    ctx.moveTo(mid0.x, mid0.y);
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      ctx.quadraticCurveTo(p1.x, p1.y, mid.x, mid.y);
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

      // Genera perimetro fluido organico che si adatta esattamente alla quantità di ricordi
      const perimeterPts = generateOrganicHullPoints(tagNodes, tagIndex, now);
      if (perimeterPts.length < 3) return;

      // Tracciamento contorno fluido organico continuo
      drawSmoothClosedBlob(ctx, perimeterPts);

      // Riempimento a bassissima opacità per trasparenze additive tipo Venn
      ctx.fillStyle = palette.fill;
      ctx.fill();

      // Bordo vettoriale continuo sottile dimezzato (0.8px normale, 1.2px se focused)
      ctx.strokeStyle = palette.stroke;
      ctx.lineWidth = isFocused ? 1.2 : 0.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Calcola il punto apicale superiore per l'etichetta del tag
      let topPt = perimeterPts[0];
      for (let p of perimeterPts) {
        if (p.y < topPt.y) topPt = p;
      }

      // Prepara etichetta (Title Case in Instrument Serif naturale)
      const tagTitle = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
      ctx.font = 'italic 18px "Instrument Serif", Georgia, serif';
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
        ? 'italic 21px "Instrument Serif", Georgia, serif'
        : 'italic 18px "Instrument Serif", Georgia, serif';
      ctx.fillText(lbl.tag, lbl.x, lbl.y);
    }

    ctx.restore();
  }

  // ── Timeline: Asse in Basso & Steli Annuali o Mensili ────────
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

      // 1. Intestazione Anno sopra i mesi con pulsante/indicatore di chiusura interattivo
      const isHoverClose = hoveredTimelineItem && hoveredTimelineItem.type === 'close';
      ctx.save();
      const bannerW = 360;
      const bannerH = 54;
      const bannerY = baselineY - 440;

      ctx.fillStyle = isHoverClose ? 'rgba(153, 37, 28, 0.08)' : 'rgba(255, 253, 249, 0.90)';
      ctx.fillRect(-bannerW / 2, bannerY, bannerW, bannerH);
      ctx.strokeStyle = isHoverClose ? '#99251C' : '#EADBCE';
      ctx.lineWidth = isHoverClose ? 1.5 : 0.85;
      ctx.strokeRect(-bannerW / 2, bannerY, bannerW, bannerH);

      ctx.fillStyle = '#99251C';
      ctx.font = 'italic 30px "Instrument Serif", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Anno ${focusedYr}`, 0, baselineY - 414);

      ctx.font = '700 8.5px "Instrument Sans", sans-serif';
      ctx.fillStyle = isHoverClose ? '#99251C' : 'rgba(153, 37, 28, 0.70)';
      ctx.fillText('CHIUDI MESI · MOSTRA TUTTI GLI ANNI', 0, baselineY - 397);
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
          ? 'italic 20px "Instrument Serif", Georgia, serif'
          : '400 16px "Instrument Serif", Georgia, serif';
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
        ctx.font = isHoverYr ? '400 32px "Instrument Serif", Georgia, serif' : '400 28px "Instrument Serif", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(yr), x, baselineY + (isHoverYr ? 38 : 36));

        // Conteggio memorie
        ctx.font = '600 10px "Instrument Sans", sans-serif';
        ctx.fillStyle = isHoverYr ? '#99251C' : 'rgba(153, 37, 28, 0.70)';
        ctx.fillText(`${yearNodes.length} ricordi`, x, baselineY + 54);

        if (isHoverYr) {
          ctx.font = '700 8px "Instrument Sans", sans-serif';
          ctx.fillStyle = '#99251C';
          ctx.fillText('CLICCA PER APRIRE I MESI', x, baselineY + 68);
        }

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
    ctx.font = isHover ? '400 25px "Instrument Serif", Georgia, serif' : '400 22px "Instrument Serif", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(yr), x, baselineY + 32);

    ctx.font = '600 9px "Instrument Sans", sans-serif';
    ctx.fillText(`${count} ricordi`, x, baselineY + 46);
    if (isHover) {
      ctx.font = '700 7.5px "Instrument Sans", sans-serif';
      ctx.fillText('APRI', x, baselineY + 58);
    }
    ctx.restore();
  }

  // ── Hit-Testing Interattivo per la Timeline (Clic su Anni e Mesi) ──
  function hitTestTimeline(screenX, screenY) {
    if (currentLayout !== 'timeline') return null;
    const worldP = screenToWorld(screenX, screenY);
    const baselineY = 220;

    if (focusedTimelineYear !== null) {
      // 1. Clic su banner / pulsante chiudi mesi
      if (Math.abs(worldP.x) < 185 && worldP.y >= baselineY - 445 && worldP.y <= baselineY - 380) {
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
  function drawFilaments(now) {
    if (nodes.length < 2) return;
    ctx.save();

    const passiveLines = [];
    const activeLines = [];

    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      if (n1.alpha < 0.15) continue;

      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        if (n2.alpha < 0.15) continue;

        const shared = n1.tags.filter((t) => n2.tags.includes(t));
        if (shared.length > 0) {
          const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
          if (dist < 520 || currentLayout === 'nodi') {
            const isHoveredConnection = hoveredNode && (hoveredNode === n1 || hoveredNode === n2);

            const wave1 = fabricWave.active ? getWaveOffset(n1.x, n1.y, now) : { dx: 0, dy: 0 };
            const wave2 = fabricWave.active ? getWaveOffset(n2.x, n2.y, now) : { dx: 0, dy: 0 };

            const lineData = [n1.x + wave1.dx, n1.y + wave1.dy, n2.x + wave2.dx, n2.y + wave2.dy];

            if (isHoveredConnection) {
              activeLines.push(lineData);
            } else {
              passiveLines.push(lineData);
            }
          }
        }
      }
    }

    // 1. Disegno in batch delle connessioni passive (1 sola draw call)
    if (passiveLines.length > 0) {
      ctx.beginPath();
      for (let k = 0; k < passiveLines.length; k++) {
        const l = passiveLines[k];
        ctx.moveTo(l[0], l[1]);
        ctx.lineTo(l[2], l[3]);
      }
      ctx.strokeStyle = hoveredNode ? 'rgba(153, 37, 28, 0.06)' : 'rgba(153, 37, 28, 0.22)';
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }

    // 2. Disegno in batch delle connessioni attive in evidenza
    if (activeLines.length > 0) {
      ctx.beginPath();
      for (let k = 0; k < activeLines.length; k++) {
        const l = activeLines[k];
        ctx.moveTo(l[0], l[1]);
        ctx.lineTo(l[2], l[3]);
      }
      ctx.strokeStyle = '#99251C';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Miniature Fotografiche (Solo bordo caldo, no cornice panna) ──
  function drawThumbnails(now) {
    nodes.forEach((node) => {
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

      const mediaUrl = node.memory.media_url;
      const mediaType = (node.memory.media_type || '').toLowerCase();

      // Disegno del media a spigoli vivi (nessun bordo stondato, nessuna cornice panna)
      if ((mediaType === 'image' || mediaType === 'video') && imageCache.has(mediaUrl)) {
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
      } else {
        // Text / Default memory a spigoli vivi
        ctx.fillStyle = '#F8F3EC';
        ctx.fillRect(x0, y0, w, h);

        ctx.fillStyle = '#99251C';
        ctx.font = 'italic 18px "Instrument Serif", Georgia, serif';
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

      // Line 1: Titolo (Instrument Serif: naturale, mai in caps lock)
      ctx.fillStyle = '#99251C';
      ctx.font = 'italic 13px "Instrument Serif", Georgia, serif';
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
    setOnTimelineYearChange: (fn) => { onTimelineYearChange = fn; },
    getFocusedTimelineYear: () => focusedTimelineYear,
    getHoveredTimelineItem: () => hoveredTimelineItem,
    getHoveredNode: () => hoveredNode,
    getCamera: () => camera,
    getDistinctYears,
    getDistinctTags,
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
