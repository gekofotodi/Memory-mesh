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
    label: 'PIANO TERRA',
    code: 'LIV.00',
    elevation: 0,
    rooms: {
      salone:      { x: -50,  y: 30,   w: 220, h: 160, label: 'SALONE CENTRALE', code: '0.1' },
      cucina:      { x: -250, y: -80,  w: 160, h: 140, label: 'CUCINA', code: '0.2' },
      studio:      { x: 150,  y: -70,  w: 170, h: 130, label: 'STUDIO', code: '0.3' },
      ghiacciaia:  { x: -250, y: 110,  w: 150, h: 120, label: 'GHIACCIAIA', code: '0.4' },
      giardino:    { x: 300,  y: 90,   w: 240, h: 190, label: 'GIARDINO', code: '0.5' },
      esterno:     { x: -70,  y: 250,  w: 280, h: 130, label: 'ESTERNO // ACCESSO', code: '0.6' },
    }
  },
  primo: {
    id: 'primo',
    label: 'PRIMO PIANO',
    code: 'LIV.01',
    elevation: 1,
    rooms: {
      'sala conferenze': { x: -80, y: 0, w: 290, h: 200, label: 'SALA CONFERENZE', code: '1.1' },
      camere:            { x: 190, y: 0, w: 230, h: 200, label: 'CAMERE', code: '1.2' },
    }
  },
  secondo: {
    id: 'secondo',
    label: 'SECONDO PIANO',
    code: 'LIV.02',
    elevation: 2,
    rooms: {
      mansarda:   { x: -80, y: 0, w: 270, h: 190, label: 'MANSARDA', code: '2.1' },
      cappellina: { x: 180, y: 0, w: 190, h: 190, label: 'CAPPELLINA', code: '2.2' },
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
  default:       { stroke: '#99251C', fill: 'rgba(153, 37, 28, 0.07)' },
};

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

  // Dimensioni miniature fotografiche
  const THUMB_W = 78;
  const THUMB_H = 54;
  const THUMB_R = 4;

  // ── Fabric Wave Distortion State ─────────────────────────────
  const fabricWave = {
    active: false,
    startTime: 0,
    duration: 2800,
    centerX: 0,
    centerY: 0,
    amplitude: 28,
    frequency: 0.012,
    speed: 500,
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
    const tags = new Set();
    memories.forEach((m) => {
      if (Array.isArray(m.tags)) m.tags.forEach((t) => tags.add(t.toLowerCase().trim()));
    });
    return Array.from(tags).filter(Boolean);
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

      // 2. Cluster — Isole a insiemi sovrapposti (Venn)
      case 'cluster': {
        const allTags = getDistinctTags();
        const tagCenters = new Map();
        const countTags = Math.max(1, allTags.length);

        allTags.forEach((tag, idx) => {
          const angle = (idx / countTags) * Math.PI * 2;
          const dist = 380;
          tagCenters.set(tag, {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist * 0.76,
          });
        });

        nodes.forEach((node, ni) => {
          const nodeTags = node.tags && node.tags.length ? node.tags : [node.primaryTag];
          let avgX = 0, avgY = 0, validTags = 0;

          nodeTags.forEach((t) => {
            const center = tagCenters.get(t);
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

          // Small dispersion hash so identical-tag nodes don't overlap exactly
          const dispAngle = (ni * 1.618) * Math.PI * 2;
          const dispDist = 28 + (ni % 5) * 26;

          node.targetX = avgX + Math.cos(dispAngle) * dispDist;
          node.targetY = avgY + Math.sin(dispAngle) * dispDist;
          node.targetScale = 1.0;
        });
        break;
      }

      // 3. Planimetria — Assonometria e stanze del piano attivo
      case 'planimetria': {
        const currentFloorObj = FLOORS[activeFloor] || FLOORS.terra;
        const roomCounts = {};

        nodes.forEach((node) => {
          const loc = (node.memory.location_tag || '').toLowerCase().trim();
          let targetRoom = currentFloorObj.rooms[loc];

          // Check if memory belongs to a room on the active floor
          if (!targetRoom) {
            // If location matches a room on another floor, place it offscreen/fade
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

          const spiralAngle = count * 1.5;
          const spiralDist = Math.min(targetRoom.w, targetRoom.h) * 0.22 * Math.sqrt(count + 1);

          node.targetX = targetRoom.x + Math.cos(spiralAngle) * spiralDist;
          node.targetY = targetRoom.y + Math.sin(spiralAngle) * spiralDist;
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
    focusedClusterTag = tag.toLowerCase().trim();
    const tagCenter = getDistinctTags();
    const idx = tagCenter.indexOf(focusedClusterTag);
    if (idx >= 0) {
      const angle = (idx / Math.max(1, tagCenter.length)) * Math.PI * 2;
      camera.targetX = Math.cos(angle) * 380;
      camera.targetY = Math.sin(angle) * 380 * 0.76;
      camera.targetZoom = 1.25;
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

  // ── Update Logic ─────────────────────────────────────────────
  function update() {
    camera.x += (camera.targetX - camera.x) * 0.12;
    camera.y += (camera.targetY - camera.y) * 0.12;
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.14;

    updateForces();

    nodes.forEach((node) => {
      node.x += (node.targetX - node.x) * 0.09;
      node.y += (node.targetY - node.y) * 0.09;

      const isHover = (hoveredNode === node);
      let targetS = isHover ? node.targetScale * 1.25 : node.targetScale;
      node.scale += (targetS - node.scale) * 0.16;

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

      node.alpha += (targetA - node.alpha) * 0.14;
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

  // ── Planimetria: Assonometria a 3 Piani ───────────────────────
  function drawPlanimetriaAssonometria(now) {
    const elapsed = now - planimetriaEntranceTime;
    const entranceDuration = 1800;
    const progress = Math.min(1.0, elapsed / entranceDuration);

    ctx.save();

    const floorOrder = ['terra', 'primo', 'secondo'];
    floorOrder.forEach((fKey) => {
      const fl = FLOORS[fKey];
      const isActive = (fKey === activeFloor);

      let floorOffsetY = 0;
      let floorOpacity = 1.0;

      if (progress < 0.4) {
        // Initial stacked axonometric preview
        const norm = progress / 0.4;
        floorOffsetY = (fl.elevation - 1) * -160;
        floorOpacity = 0.85;
      } else {
        // Upper floors slide upwards and disappear
        const slideProgress = (progress - 0.4) / 0.6;
        if (isActive) {
          floorOffsetY = 0;
          floorOpacity = 1.0;
        } else {
          // Slide upwards away
          floorOffsetY = (fl.elevation - 1) * -160 - slideProgress * 700;
          floorOpacity = Math.max(0, 0.85 - slideProgress * 1.2);
        }
      }

      if (floorOpacity <= 0.01) return;

      ctx.save();
      ctx.translate(0, floorOffsetY);
      ctx.globalAlpha = floorOpacity;

      // Base axonometric floor plate
      ctx.strokeStyle = isActive ? 'rgba(153, 37, 28, 0.40)' : 'rgba(153, 37, 28, 0.15)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([4, 6]);
      ctx.strokeRect(-380, -200, 760, 480);
      ctx.setLineDash([]);

      // Floor tag
      ctx.fillStyle = '#99251C';
      ctx.font = 'italic 20px "Instrument Serif", Georgia, serif';
      ctx.fillText(`${fl.label} // ${fl.code}`, -360, -215);

      // Draw Rooms of this floor
      Object.entries(fl.rooms).forEach(([rk, room]) => {
        const rx = room.x - room.w / 2;
        const ry = room.y - room.h / 2;

        ctx.strokeStyle = isActive ? 'rgba(153, 37, 28, 0.50)' : 'rgba(153, 37, 28, 0.20)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        ctx.strokeRect(rx, ry, room.w, room.h);
        ctx.setLineDash([]);

        // Room label
        ctx.fillStyle = 'rgba(153, 37, 28, 0.60)';
        ctx.font = '700 8.5px "Instrument Sans", sans-serif';
        ctx.fillText(`// ${room.code}`, rx + 12, ry + 18);

        ctx.fillStyle = '#99251C';
        ctx.font = 'italic 14px "Instrument Serif", Georgia, serif';
        ctx.fillText(room.label, rx + 12, ry + 34);
      });

      ctx.restore();
    });

    ctx.restore();
  }

  // ── Cluster: Isole Organiche a Insiemi Sovrapposti (Venn) ──────
  function drawClusterVennIslands(now) {
    const allTags = getDistinctTags();
    ctx.save();

    allTags.forEach((tag) => {
      const tagNodes = nodes.filter((n) => n.tags && n.tags.includes(tag));
      if (!tagNodes.length) return;

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
      const palette = CLUSTER_PALETTE[tag] || CLUSTER_PALETTE.default;

      // Draw smooth organic wobbling perimeter
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

      // Soft translucent fill (overlaps visually create Venn intersections!)
      ctx.fillStyle = palette.fill;
      ctx.fill();

      // Crisp subtle boundary line
      ctx.strokeStyle = palette.stroke;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Label in Instrument Serif Italic
      ctx.fillStyle = '#99251C';
      ctx.font = 'italic 18px "Instrument Serif", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Sezione // ${tag.toUpperCase()}`, avgX, avgY - radius - 10);
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

  // ── Filamenti di connessione ──────────────────────────────────
  function drawFilaments(now) {
    if (nodes.length < 2) return;
    ctx.save();

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

            let strokeAlpha = Math.min(n1.alpha, n2.alpha) * 0.35;
            let strokeWidth = 1.0;
            let strokeColor = `rgba(153, 37, 28, ${strokeAlpha})`;

            if (hoveredNode) {
              if (isHoveredConnection) {
                strokeColor = '#99251C';
                strokeWidth = 2.4;
                strokeAlpha = 1.0;
              } else {
                strokeAlpha = 0.05;
                strokeColor = `rgba(153, 37, 28, ${strokeAlpha})`;
              }
            }

            const wave1 = getWaveOffset(n1.x, n1.y, now);
            const wave2 = getWaveOffset(n2.x, n2.y, now);

            ctx.beginPath();
            ctx.moveTo(n1.x + wave1.dx, n1.y + wave1.dy);
            ctx.lineTo(n2.x + wave2.dx, n2.y + wave2.dy);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  }

  // ── Miniature Fotografiche (Solo bordo caldo, no cornice panna) ──
  function drawThumbnails(now) {
    nodes.forEach((node) => {
      if (node.alpha <= 0.02) return;

      ctx.save();
      ctx.globalAlpha = node.alpha;

      const wave = getWaveOffset(node.x, node.y, now);
      const nx = node.x + wave.dx;
      const ny = node.y + wave.dy;

      const w = node.w * node.scale;
      const h = node.h * node.scale;
      const r = node.radius * node.scale;
      const isHover = (hoveredNode === node);

      const x0 = nx - w / 2;
      const y0 = ny - h / 2;

      // Soft ambient shadow
      ctx.shadowColor = 'rgba(153, 37, 28, 0.12)';
      ctx.shadowBlur = isHover ? 16 : 8;
      ctx.shadowOffsetY = isHover ? 8 : 3;

      // Clip rounded photo box
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x0, y0, w, h, r);
      ctx.clip();

      const mediaUrl = node.memory.media_url;
      const mediaType = node.memory.media_type;

      if (mediaType === 'image' && imageCache.has(mediaUrl)) {
        const img = imageCache.get(mediaUrl);
        ctx.drawImage(img, x0, y0, w, h);
      } else if (mediaType === 'audio') {
        // Minimal warm audio card
        ctx.fillStyle = '#F8F3EC';
        ctx.fillRect(x0, y0, w, h);

        ctx.fillStyle = '#99251C';
        ctx.font = '700 16px "Instrument Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('♪', nx, ny - 4);

        ctx.font = '700 8px "Instrument Sans", sans-serif';
        ctx.fillText('AUDIO', nx, ny + 12);
      } else {
        // Text / Default memory
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

      // Solo bordo caldo (#EADBCE) — bordo bordeaux pieno su hover
      ctx.beginPath();
      ctx.roundRect(x0, y0, w, h, r);
      ctx.strokeStyle = isHover ? '#99251C' : '#EADBCE';
      ctx.lineWidth = isHover ? 2.2 : 1.2;
      ctx.stroke();

      ctx.restore();

      // Tooltip on hover (outside Griglia)
      if (isHover && currentLayout !== 'griglia') {
        drawHoverCard(node, nx, y0);
      }
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

      // Line 1: Titolo
      ctx.fillStyle = '#99251C';
      ctx.font = 'italic 13px "Instrument Serif", Georgia, serif';
      ctx.textAlign = 'center';
      const title = (node.memory.title || 'Senza titolo').toUpperCase();
      const truncTitle = title.length > 20 ? title.substring(0, 18) + '…' : title;
      ctx.fillText(truncTitle, x, y);

      // Line 2: Data
      ctx.font = '700 8.5px "Instrument Sans", sans-serif';
      ctx.fillStyle = 'rgba(153, 37, 28, 0.65)';
      const dateStr = node.memory.time_event || (node.dateInfo.year ? `${node.dateInfo.year}` : 'STOÀ');
      ctx.fillText(String(dateStr).toUpperCase(), x, y + 13);
    });
    ctx.restore();
  }

  // ── Hover Card Tooltip ───────────────────────────────────────
  function drawHoverCard(node, cx, topY) {
    const rawTitle = node.memory.title || 'Ricordo';
    const loc = node.memory.location_tag ? ` // ${node.memory.location_tag.toUpperCase()}` : '';
    const text = `${rawTitle}${loc}`;

    ctx.save();
    ctx.font = 'italic 15px "Instrument Serif", Georgia, serif';
    const textW = ctx.measureText(text).width;
    const boxW = Math.max(textW + 24, 80);
    const boxH = 28;

    const bx = cx - boxW / 2;
    const by = topY - boxH - 8;

    ctx.shadowColor = 'rgba(153, 37, 28, 0.12)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 4);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#99251C';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#99251C';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, by + boxH / 2);

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
