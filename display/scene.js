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
  studio:        { stroke: '#2E6BFF', fill: 'rgba(46, 107, 255, 0.07)' },
  evento:        { stroke: '#99251C', fill: 'rgba(153, 37, 28, 0.08)' },
  'vita comune': { stroke: '#A8C3A0', fill: 'rgba(168, 195, 160, 0.08)' },
  fede:          { stroke: '#9B51E0', fill: 'rgba(155, 81, 224, 0.07)' },
  musica:        { stroke: '#E17055', fill: 'rgba(225, 112, 85, 0.08)' },
  amici:         { stroke: '#00B894', fill: 'rgba(0, 184, 148, 0.08)' },
  relax:         { stroke: '#636E72', fill: 'rgba(99, 110, 114, 0.07)' },
  cibo:          { stroke: '#F39C12', fill: 'rgba(243, 156, 18, 0.08)' },
  arte:          { stroke: '#E84393', fill: 'rgba(232, 67, 147, 0.07)' },
  festa:         { stroke: '#D63031', fill: 'rgba(214, 48, 49, 0.08)' },
  carità:        { stroke: '#0984E3', fill: 'rgba(9, 132, 227, 0.07)' },
  design:        { stroke: '#99251C', fill: 'rgba(153, 37, 28, 0.08)' },
  social:        { stroke: '#00B894', fill: 'rgba(0, 184, 148, 0.08)' },
  talk:          { stroke: '#2E6BFF', fill: 'rgba(46, 107, 255, 0.07)' },
  laboratorio:   { stroke: '#F39C12', fill: 'rgba(243, 156, 18, 0.08)' },
  sport:         { stroke: '#E17055', fill: 'rgba(225, 112, 85, 0.08)' },
  default:       { stroke: '#99251C', fill: 'rgba(153, 37, 28, 0.07)' },
};

function getTagPalette(tag) {
  if (!tag) return CLUSTER_PALETTE.default;
  const norm = String(tag).toLowerCase().trim();
  if (CLUSTER_PALETTE[norm]) return CLUSTER_PALETTE[norm];

  const PALETTES = [
    { stroke: '#99251C', fill: 'rgba(153, 37, 28, 0.08)' },
    { stroke: '#2E6BFF', fill: 'rgba(46, 107, 255, 0.07)' },
    { stroke: '#E17055', fill: 'rgba(225, 112, 85, 0.08)' },
    { stroke: '#00B894', fill: 'rgba(0, 184, 148, 0.08)' },
    { stroke: '#9B51E0', fill: 'rgba(155, 81, 224, 0.07)' },
    { stroke: '#F39C12', fill: 'rgba(243, 156, 18, 0.08)' },
    { stroke: '#E84393', fill: 'rgba(232, 67, 147, 0.07)' },
    { stroke: '#A8C3A0', fill: 'rgba(168, 195, 160, 0.08)' },
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
  let pointerScreen = { x: -9999, y: -9999 };

  // Image cache
  const imageCache = new Map();

  // Dimensioni miniature fotografiche (spigoli retti, nessuna cornice)
  const THUMB_W = 78;
  const THUMB_H = 54;
  const THUMB_R = 0;

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
  function parseMemoryDate(mem) {
    let year = 2024;
    let month = 1;

    if (mem.created_at) {
      const d = new Date(mem.created_at);
      if (!isNaN(d.getFullYear())) {
        year = d.getFullYear();
        month = d.getMonth() + 1;
      }
    }
    if (mem.time_event) {
      const matchYear = String(mem.time_event).match(/\b(20\d\d|19\d\d)\b/);
      if (matchYear) year = parseInt(matchYear[1], 10);
      const matchMonth = String(mem.time_event).match(/[-/.](0[1-9]|1[0-2])[-/.]/);
      if (matchMonth) month = parseInt(matchMonth[1], 10);
    }
    return { year, month };
  }

  function getDistinctYears() {
    const years = new Set();
    memories.forEach((m) => years.add(parseMemoryDate(m).year));
    return Array.from(years).sort((a, b) => b - a);
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

    memories.forEach((m) => {
      if ((m.media_type === 'image' || m.media_type === 'text') && m.media_url && !imageCache.has(m.media_url)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = m.media_url;
        img.onload = () => imageCache.set(m.media_url, img);
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

      return {
        id: m.id || `node-${index}`,
        memory: m,
        x: initX,
        y: initY,
        targetX: initX,
        targetY: initY,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        w: THUMB_W,
        h: THUMB_H,
        radius: THUMB_R,
        scale: 0.1,
        targetScale: 1.0,
        alpha: 1.0,
        tags: rawTags,
        primaryTag,
        accentColor: cluster.stroke,
        dateInfo: parseMemoryDate(m),
      };
    });

    recalculateLayoutTargets();
  }

  function addMemory(newMem) {
    memories.unshift(newMem);
    if ((newMem.media_type === 'image' || newMem.media_type === 'text') && newMem.media_url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = newMem.media_url;
      img.onload = () => imageCache.set(newMem.media_url, img);
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
      w: THUMB_W,
      h: THUMB_H,
      radius: THUMB_R,
      scale: 0.1,
      targetScale: 1.0,
      alpha: 1.0,
      tags: rawTags,
      primaryTag,
      accentColor: cluster.stroke,
      dateInfo: parseMemoryDate(newMem),
    };

    nodes.unshift(newNode);
    recalculateLayoutTargets();
    triggerFabricWave(newNode.x, newNode.y);
  }

  // ── Layout Target Calculation ────────────────────────────────
  function recalculateLayoutTargets() {
    if (!nodes.length) return;

    switch (currentLayout) {
      // 1. Nodi — Initial placement for force simulation
      case 'nodi': {
        const count = nodes.length;
        nodes.forEach((node, i) => {
          const phi = (i / count) * Math.PI * 2;
          const dist = 220 + ((i * 59) % 320);
          node.targetX = Math.cos(phi) * dist;
          node.targetY = Math.sin(phi) * dist * 0.72;
          node.targetScale = 1.0;
        });
        break;
      }

      // 2. Cluster — Isole basate esclusivamente sui Tag (nessun luogo)
      case 'cluster': {
        const allTags = getDistinctTags();
        const tagCenters = new Map();
        const countTags = Math.max(1, allTags.length);

        allTags.forEach((tag, idx) => {
          const angle = (idx / countTags) * Math.PI * 2;
          const dist = 380;
          const pos = {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist * 0.76,
          };
          tagCenters.set(tag, pos);
          tagCenters.set(tag.toLowerCase(), pos);
        });

        nodes.forEach((node, ni) => {
          const nodeTags = Array.isArray(node.tags) && node.tags.length ? node.tags : [node.primaryTag];
          let avgX = 0, avgY = 0, validTags = 0;

          nodeTags.forEach((t) => {
            const center = tagCenters.get(t) || tagCenters.get(String(t).toLowerCase());
            if (center) {
              avgX += center.x;
              avgY += center.y;
              validTags++;
            }
          });

          if (validTags > 0) {
            avgX /= validTags;
            avgY /= validTags;
          }

          // Dispersione controllata attorno al centroide dei tag del ricordo
          const dispAngle = (ni * 1.618) * Math.PI * 2;
          const dispDist = 28 + (ni % 5) * 26;

          node.targetX = avgX + Math.cos(dispAngle) * dispDist;
          node.targetY = avgY + Math.sin(dispAngle) * dispDist;
          node.targetScale = 1.0;
        });
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

      // 4. Timeline — Asse orizzontale in basso con steli verso l'alto
      case 'timeline': {
        const isMonthZoom = camera.zoom > 1.35 && focusedTimelineYear !== null;
        const baselineY = 220;

        if (!isMonthZoom) {
          // Yearly View
          const years = getDistinctYears();
          const yearX = new Map();
          const countYears = Math.max(1, years.length);
          const yearSpacing = 340;
          const startX = -((countYears - 1) * yearSpacing) / 2;

          years.forEach((y, idx) => {
            yearX.set(y, startX + idx * yearSpacing);
          });

          const yearCounts = {};
          nodes.forEach((node) => {
            const yr = node.dateInfo.year;
            const x = yearX.get(yr) || 0;
            const idxInYear = yearCounts[yr] || 0;
            yearCounts[yr] = idxInYear + 1;

            node.targetX = x;
            // Stack upwards (negative y) from baseline
            node.targetY = baselineY - 60 - idxInYear * 76;
            node.targetScale = 0.95;
            node.targetAlpha = 1.0;
          });
        } else {
          // Monthly Zoom View for focusedTimelineYear
          const monthSpacing = 135;
          const startX = -((12 - 1) * monthSpacing) / 2;
          const monthCounts = {};

          nodes.forEach((node) => {
            if (node.dateInfo.year !== focusedTimelineYear) {
              node.targetAlpha = 0.08;
              node.targetScale = 0.6;
              return;
            }

            node.targetAlpha = 1.0;
            node.targetScale = 0.95;

            const mIdx = Math.max(0, Math.min(11, node.dateInfo.month - 1));
            const x = startX + mIdx * monthSpacing;
            const countInMonth = monthCounts[mIdx] || 0;
            monthCounts[mIdx] = countInMonth + 1;

            node.targetX = x;
            node.targetY = baselineY - 60 - countInMonth * 76;
          });
        }
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
        const cols = Math.max(3, Math.min(5, Math.floor(availableW / (THUMB_W + 36))));
        const cellW = availableW / cols;
        const cellH = THUMB_H + 54;
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
      camera.targetY = 60;
      camera.targetZoom = 0.95;
      focusedTimelineYear = getDistinctYears()[0] || 2024;
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
    recalculateLayoutTargets();
  }

  function setTimelineYear(year) {
    const yr = parseInt(year, 10);
    focusedTimelineYear = yr;
    camera.targetZoom = 1.45;
    camera.targetY = 80;
    recalculateLayoutTargets();
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
      recalculateLayoutTargets();
    }
  }

  function setHoverPoint(sx, sy) {
    pointerScreen.x = sx;
    pointerScreen.y = sy;
  }

  // ── Hit-Testing ──────────────────────────────────────────────
  function hitTest(screenX, screenY) {
    const worldP = screenToWorld(screenX, screenY);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.alpha < 0.2) continue;
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

  // ── Force-Directed Simulation for Nodi ────────────────────────
  function updateForces() {
    if (currentLayout !== 'nodi') return;

    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];

      // Gravity to center
      n1.vx -= n1.x * 0.00015;
      n1.vy -= n1.y * 0.00015;

      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.hypot(dx, dy) || 1;

        const shared = n1.tags.filter((t) => n2.tags.includes(t));

        if (shared.length > 0) {
          // Spring attraction for related memories
          const targetDist = 160 - Math.min(shared.length, 3) * 25;
          const springForce = (dist - targetDist) * 0.00028;
          const fx = (dx / dist) * springForce;
          const fy = (dy / dist) * springForce;

          n1.vx += fx;
          n1.vy += fy;
          n2.vx -= fx;
          n2.vy -= fy;
        }

        // Repulsion to prevent node overlap
        if (dist < 130) {
          const repForce = (130 - dist) * 0.0006;
          const rx = (dx / dist) * repForce;
          const ry = (dy / dist) * repForce;
          n1.vx -= rx;
          n1.vy -= ry;
          n2.vx += rx;
          n2.vy += ry;
        }
      }

      // Apply velocity and friction
      n1.targetX += n1.vx;
      n1.targetY += n1.vy;
      n1.vx *= 0.88;
      n1.vy *= 0.88;

      // Soft boundary clamp
      if (Math.abs(n1.targetX) > 650) n1.vx -= Math.sign(n1.targetX) * 0.5;
      if (Math.abs(n1.targetY) > 460) n1.vy -= Math.sign(n1.targetY) * 0.5;
    }
  }

  // ── Update Logic (Movimenti lenti, vellutati e organici) ────
  function update() {
    camera.x += (camera.targetX - camera.x) * 0.042;
    camera.y += (camera.targetY - camera.y) * 0.042;
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.042;

    updateForces();

    nodes.forEach((node) => {
      node.x += (node.targetX - node.x) * 0.032;
      node.y += (node.targetY - node.y) * 0.032;

      const isHover = (hoveredNode === node);
      let targetS = isHover ? node.targetScale * 1.25 : node.targetScale;
      node.scale += (targetS - node.scale) * 0.055;

      // Alpha computation: focus on hovered relations in Nodi mode
      let targetA = node.targetAlpha !== undefined ? node.targetAlpha : 1.0;
      if (!isNodeMatchingFilter(node)) targetA = 0.12;

      if (currentLayout === 'nodi' && hoveredNode) {
        if (hoveredNode === node) {
          targetA = 1.0;
        } else {
          const hasShared = node.tags.some((t) => hoveredNode.tags.includes(t));
          targetA = hasShared ? 0.95 : 0.18;
        }
      }

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

    // 2. Filaments (Nodi & Cluster)
    if (currentLayout === 'nodi' || currentLayout === 'cluster') {
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

  // ── Cluster: Isole Organiche basate unicamente sui Tag ──────
  function drawClusterVennIslands(now) {
    const allTags = getDistinctTags();
    ctx.save();

    allTags.forEach((tag) => {
      // Crea il cluster SOLO se esiste almeno un ricordo effettivo con questo tag
      const tagLower = tag.toLowerCase().trim();
      const tagNodes = nodes.filter(
        (n) => Array.isArray(n.tags) && n.tags.some((t) => String(t).toLowerCase().trim() === tagLower)
      );
      if (tagNodes.length === 0) return;

      let avgX = 0, avgY = 0;
      tagNodes.forEach((n) => { avgX += n.x; avgY += n.y; });
      avgX /= tagNodes.length;
      avgY /= tagNodes.length;

      let maxDist = 70;
      tagNodes.forEach((n) => {
        const d = Math.hypot(n.x - avgX, n.y - avgY);
        if (d > maxDist) maxDist = d;
      });

      const radius = maxDist + 65;
      const palette = getTagPalette(tag);

      // Disegno perimetro organico fluttuante
      ctx.beginPath();
      const points = 18;
      for (let i = 0; i < points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const wobble = Math.sin(theta * 3 + now * 0.001) * 7 + Math.cos(theta * 2 - now * 0.0007) * 5;
        const r = radius + wobble;
        const px = avgX + Math.cos(theta) * r;
        const py = avgY + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Riempimento tenue sfumato (le sovrapposizioni creano insiemi di Venn)
      ctx.fillStyle = palette.fill;
      ctx.fill();

      // Contorno perimetrale sottile
      ctx.strokeStyle = palette.stroke;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Nome del cluster: ESATTAMENTE il nome del tag (senza "Sezione // " o all-caps)
      ctx.fillStyle = '#99251C';
      ctx.font = 'italic 18px "Instrument Serif", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(tag, avgX, avgY - radius - 12);
    });

    ctx.restore();
  }

  // ── Timeline: Asse in Basso & Steli verso l'Alto ───────────────
  function drawTimelineGuides() {
    ctx.save();
    const baselineY = 220;
    const isMonthZoom = camera.zoom > 1.35 && focusedTimelineYear !== null;

    // Baseline orizzontale in basso
    ctx.beginPath();
    ctx.moveTo(-2200, baselineY);
    ctx.lineTo(2200, baselineY);
    ctx.strokeStyle = '#99251C';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (!isMonthZoom) {
      // Yearly ticks and upward stems
      const years = getDistinctYears();
      const countYears = Math.max(1, years.length);
      const yearSpacing = 340;
      const startX = -((countYears - 1) * yearSpacing) / 2;

      years.forEach((yr, idx) => {
        const x = startX + idx * yearSpacing;
        const yearNodes = nodes.filter((n) => n.dateInfo.year === yr);
        const stackHeight = yearNodes.length * 76 + 50;

        // Upward stem (dashed)
        ctx.beginPath();
        ctx.moveTo(x, baselineY);
        ctx.lineTo(x, baselineY - stackHeight);
        ctx.strokeStyle = '#EADBCE';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Base tick mark
        ctx.beginPath();
        ctx.arc(x, baselineY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#99251C';
        ctx.fill();

        // Prominent Year Label in Instrument Serif
        ctx.fillStyle = '#99251C';
        ctx.font = '400 28px "Instrument Serif", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(yr), x, baselineY + 36);

        ctx.font = '700 9px "Instrument Sans", sans-serif';
        ctx.fillStyle = 'rgba(153, 37, 28, 0.65)';
        ctx.fillText(`${yearNodes.length} MEMORIE`, x, baselineY + 52);
      });
    } else {
      // Monthly ticks and upward stems for focused year
      const monthSpacing = 135;
      const startX = -((12 - 1) * monthSpacing) / 2;

      // Year Title above
      ctx.fillStyle = '#99251C';
      ctx.font = '400 36px "Instrument Serif", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`ANNO // ${focusedTimelineYear}`, 0, baselineY - 480);

      MONTH_NAMES.forEach((mName, mIdx) => {
        const x = startX + mIdx * monthSpacing;
        const monthNodes = nodes.filter((n) => n.dateInfo.year === focusedTimelineYear && n.dateInfo.month === mIdx + 1);
        const stackHeight = monthNodes.length * 76 + 45;

        // Upward stem
        ctx.beginPath();
        ctx.moveTo(x, baselineY);
        ctx.lineTo(x, baselineY - stackHeight);
        ctx.strokeStyle = '#EADBCE';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Month Base Tick
        ctx.beginPath();
        ctx.arc(x, baselineY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#99251C';
        ctx.fill();

        // Month Label
        ctx.font = '700 11px "Instrument Sans", sans-serif';
        ctx.fillStyle = '#99251C';
        ctx.textAlign = 'center';
        ctx.fillText(mName, x, baselineY + 24);

        if (monthNodes.length > 0) {
          ctx.font = '700 8px "Instrument Sans", sans-serif';
          ctx.fillStyle = 'rgba(153, 37, 28, 0.6)';
          ctx.fillText(`${monthNodes.length}`, x, baselineY + 36);
        }
      });
    }

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
        ctx.shadowColor = 'rgba(153, 37, 28, 0.20)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }

      const mediaUrl = node.memory.media_url;
      const mediaType = node.memory.media_type;

      // Disegno del media a spigoli vivi (nessun bordo stondato, nessuna cornice)
      if (mediaType === 'image' && imageCache.has(mediaUrl)) {
        const img = imageCache.get(mediaUrl);
        ctx.drawImage(img, x0, y0, w, h);
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
    getHoveredNode: () => hoveredNode,
    getCamera: () => camera,
    getDistinctYears,
    getDistinctTags,
  };
}
