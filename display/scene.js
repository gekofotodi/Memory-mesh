/**
 * Scene Module — Exhibition Canvas Engine & Spatial Layouts (MĒNĒM / CAPSUL3 Style)
 *
 * Visual Highlights:
 *  - Nodes rendered as floating translucent micro-cards with rounded corners,
 *    embedded media preview, and minimalist typography
 *  - Hover state with sage glow (#B4D4C0), subtle scale expansion, and metadata reveal
 *  - Organic ultra-thin glowing filaments with traveling micro-particles
 *  - Pastel desaturated organic boundary blobs for thematic clusters
 *  - Architectural blueprint styling for Planimetria and sleek Timeline ribbon
 *  - Real-Time Fabric Wave distortion animation ('triggerFabricWave()')
 */

// ── House Blueprint Locations (Planimetria Layout) ─────────────
const HOUSE_ROOMS = {
  Salone:      { x: 0,    y: -80,  w: 440, h: 280, label: 'SALONE CENTRALE',  tag: '01' },
  Giardino:    { x: 410,  y: 50,   w: 380, h: 340, label: 'GIARDINO ESTERNO', tag: '02' },
  Cucina:      { x: -390, y: -190, w: 280, h: 240, label: 'CUCINA CONDIVISA', tag: '03' },
  Terrazza:    { x: -370, y: 160,  w: 300, h: 220, label: 'TERRAZZA PANORAMICA', tag: '04' },
  Portico:     { x: 50,   y: 260,  w: 340, h: 180, label: 'PORTICO D\'INGRESSO', tag: '05' },
  'Sala Studio': { x: -80, y: -370, w: 340, h: 200, label: 'SALA STUDIO // CO-WORKING', tag: '06' },
};

// ── Pastel Desaturated Thematic Colors ─────────────────────────
const THEME_PALETTE = {
  Musica:      { primary: '#B4D4C0', tint: 'rgba(180, 212, 192, 0.12)' },
  Design:      { primary: '#B8D4E3', tint: 'rgba(184, 212, 227, 0.12)' },
  Laboratorio: { primary: '#D9E3B8', tint: 'rgba(217, 227, 184, 0.12)' },
  Sport:       { primary: '#E8C5B8', tint: 'rgba(232, 197, 184, 0.12)' },
  Talk:        { primary: '#E3B8C8', tint: 'rgba(227, 184, 200, 0.12)' },
  Social:      { primary: '#B8E3D8', tint: 'rgba(184, 227, 216, 0.12)' },
  Relax:       { primary: '#D2C4DE', tint: 'rgba(210, 196, 222, 0.12)' },
  Default:     { primary: '#CBE3D6', tint: 'rgba(203, 227, 214, 0.10)' },
};

/**
 * Initialise Canvas Scene Engine
 * @param {HTMLCanvasElement} canvas
 * @returns {Object} Scene controller interface
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
    maxZoom: 2.6,
  };

  // ── Scene State ──────────────────────────────────────────────
  let currentLayout = 'nodi'; // 'nodi' | 'cluster' | 'planimetria' | 'timeline' | 'griglia'
  let currentFilter = 'all';
  let memories = [];
  let nodes = [];
  let hoveredNode = null;
  let pointerScreen = { x: -9999, y: -9999 };

  // Image cache for avatar thumbnails
  const imageCache = new Map();

  // ── Micro-Card Dimensions ────────────────────────────────────
  const CARD_W = 146;
  const CARD_H = 46;
  const CARD_R = 14;

  // ── Fabric Wave Distortion State ─────────────────────────────
  const fabricWave = {
    active: false,
    startTime: 0,
    duration: 3200,      // ms
    centerX: 0,          // in world coordinates
    centerY: 0,
    amplitude: 40,       // max distortion offset
    frequency: 0.012,    // wave frequency
    speed: 520,          // ripple propagation speed
  };

  // ── Resize Handler ───────────────────────────────────────────
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

  // ── Fabric Wave Displacement Offset ──────────────────────────
  function getWaveOffset(wx, wy, now) {
    if (!fabricWave.active) return { dx: 0, dy: 0, intensity: 0 };

    const elapsed = now - fabricWave.startTime;
    if (elapsed > fabricWave.duration) {
      fabricWave.active = false;
      return { dx: 0, dy: 0, intensity: 0 };
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
      intensity: Math.abs(ripple) * envelope,
    };
  }

  // ── Trigger Fabric Wave ──────────────────────────────────────
  function triggerFabricWave(originX = 0, originY = 0) {
    fabricWave.active = true;
    fabricWave.startTime = performance.now();
    fabricWave.centerX = originX;
    fabricWave.centerY = originY;
  }

  // ── Memory Node Creation & Caching ───────────────────────────
  function setMemories(memoriesList) {
    memories = memoriesList || [];

    // Preload image thumbnails
    memories.forEach((m) => {
      if (m.media_type === 'image' && m.media_url && !imageCache.has(m.media_url)) {
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
      const radius = 220 + (index % 4) * 90;
      const initX = Math.cos(angle) * radius;
      const initY = Math.sin(angle) * radius;

      const primaryTag = (m.tags && m.tags[0]) || 'General';
      const palette = THEME_PALETTE[primaryTag] || THEME_PALETTE.Default;

      return {
        id: m.id || `node-${index}`,
        memory: m,
        x: initX,
        y: initY,
        targetX: initX,
        targetY: initY,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        w: CARD_W,
        h: CARD_H,
        radius: CARD_R,
        scale: 0.2,
        targetScale: 1.0,
        alpha: 1.0,
        primaryTag,
        color: palette.primary,
        tint: palette.tint,
      };
    });

    recalculateLayoutTargets();
  }

  function addMemory(newMem) {
    memories.unshift(newMem);

    if (newMem.media_type === 'image' && newMem.media_url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = newMem.media_url;
      img.onload = () => imageCache.set(newMem.media_url, img);
    }

    const primaryTag = (newMem.tags && newMem.tags[0]) || 'General';
    const palette = THEME_PALETTE[primaryTag] || THEME_PALETTE.Default;

    const newNode = {
      id: newMem.id || `node-${Date.now()}`,
      memory: newMem,
      x: camera.x + (Math.random() - 0.5) * 80,
      y: camera.y + (Math.random() - 0.5) * 80,
      targetX: 0,
      targetY: 0,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      w: CARD_W,
      h: CARD_H,
      radius: CARD_R,
      scale: 0.1,
      targetScale: 1.15,
      alpha: 1.0,
      primaryTag,
      color: palette.primary,
      tint: palette.tint,
      isBrandNew: true,
    };

    nodes.unshift(newNode);
    recalculateLayoutTargets();
    triggerFabricWave(newNode.x, newNode.y);
  }

  // ── Calculate Layout Target Positions ────────────────────────
  function recalculateLayoutTargets() {
    if (!nodes.length) return;

    switch (currentLayout) {
      case 'nodi': {
        const count = nodes.length;
        nodes.forEach((node, i) => {
          const phi = (i / count) * Math.PI * 2;
          const dist = 240 + ((i * 53) % 360);
          node.targetX = Math.cos(phi) * dist;
          node.targetY = Math.sin(phi) * dist * 0.72;
          node.targetScale = 1.0;
        });
        break;
      }

      case 'cluster': {
        const tagGroups = new Map();
        nodes.forEach((n) => {
          const t = n.primaryTag;
          if (!tagGroups.has(t)) tagGroups.set(t, []);
          tagGroups.get(t).push(n);
        });

        const numClusters = tagGroups.size;
        let clusterIdx = 0;

        tagGroups.forEach((groupNodes) => {
          const clusterAngle = (clusterIdx / numClusters) * Math.PI * 2;
          const clusterDist = 440;
          const cx = Math.cos(clusterAngle) * clusterDist;
          const cy = Math.sin(clusterAngle) * clusterDist * 0.8;

          groupNodes.forEach((node, ni) => {
            const subAngle = (ni / groupNodes.length) * Math.PI * 2;
            const subDist = 70 + Math.floor(ni / 5) * 80;
            node.targetX = cx + Math.cos(subAngle) * subDist;
            node.targetY = cy + Math.sin(subAngle) * subDist;
            node.targetScale = 1.0;
          });
          clusterIdx++;
        });
        break;
      }

      case 'planimetria': {
        const roomCounts = {};
        Object.keys(HOUSE_ROOMS).forEach((r) => (roomCounts[r] = 0));

        nodes.forEach((node) => {
          const loc = node.memory.location_tag;
          const room = HOUSE_ROOMS[loc] || HOUSE_ROOMS.Salone;
          const count = roomCounts[loc] || 0;
          roomCounts[loc] = count + 1;

          const spiralAngle = count * 1.5;
          const spiralDist = Math.min(room.w, room.h) * 0.26 * Math.sqrt(count + 1);
          node.targetX = room.x + Math.cos(spiralAngle) * spiralDist;
          node.targetY = room.y + Math.sin(spiralAngle) * spiralDist;
          node.targetScale = 0.95;
        });
        break;
      }

      case 'timeline': {
        const sorted = [...nodes].sort((a, b) => {
          const tA = a.memory.created_at || a.memory.time_event || '';
          const tB = b.memory.created_at || b.memory.time_event || '';
          return tA.localeCompare(tB);
        });

        const spacingX = 180;
        const totalW = sorted.length * spacingX;
        const startX = -totalW / 2;

        sorted.forEach((node, i) => {
          node.targetX = startX + i * spacingX;
          const sign = i % 2 === 0 ? 1 : -1;
          const stemLength = 110 + ((i * 37) % 85);
          node.targetY = sign * stemLength;
          node.targetScale = 1.0;
        });
        break;
      }

      case 'griglia': {
        const cols = Math.max(3, Math.ceil(Math.sqrt(nodes.length * 1.6)));
        const cellW = 190;
        const cellH = 90;
        const rows = Math.ceil(nodes.length / cols);
        const startX = -((cols - 1) * cellW) / 2;
        const startY = -((rows - 1) * cellH) / 2;

        nodes.forEach((node, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          node.targetX = startX + col * cellW;
          node.targetY = startY + row * cellH;
          node.targetScale = 0.95;
        });
        break;
      }
    }
  }

  // ── Layout & Filter Selectors ────────────────────────────────
  function setLayout(layoutName) {
    if (currentLayout === layoutName) return;
    currentLayout = layoutName;
    recalculateLayoutTargets();
  }

  function setFilter(filterName) {
    currentFilter = filterName;
  }

  function isNodeMatchingFilter(node) {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'type-image') return node.memory.media_type === 'image';
    if (currentFilter === 'type-audio') return node.memory.media_type === 'audio';
    if (currentFilter.startsWith('tag-')) {
      const tag = currentFilter.replace('tag-', '');
      return Array.isArray(node.memory.tags) && node.memory.tags.includes(tag);
    }
    return true;
  }

  // ── Camera Manipulation ──────────────────────────────────────
  function pan(dx, dy) {
    camera.targetX -= dx / camera.zoom;
    camera.targetY -= dy / camera.zoom;
  }

  function zoom(factor) {
    camera.targetZoom = Math.min(camera.maxZoom, Math.max(camera.minZoom, camera.targetZoom * factor));
  }

  function setHoverPoint(sx, sy) {
    pointerScreen.x = sx;
    pointerScreen.y = sy;
  }

  // ── Hit-Testing (Micro-Card Bounds) ──────────────────────────
  function hitTest(screenX, screenY) {
    const worldP = screenToWorld(screenX, screenY);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const halfW = (n.w * n.scale) / 2;
      const halfH = (n.h * n.scale) / 2;

      // Card bounding box hit test with generous buffer
      if (
        worldP.x >= n.x - halfW - 10 &&
        worldP.x <= n.x + halfW + 10 &&
        worldP.y >= n.y - halfH - 10 &&
        worldP.y <= n.y + halfH + 10
      ) {
        return n;
      }
    }
    return null;
  }

  // ── Update Logic ─────────────────────────────────────────────
  function update() {
    camera.x += (camera.targetX - camera.x) * 0.12;
    camera.y += (camera.targetY - camera.y) * 0.12;
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.14;

    nodes.forEach((node) => {
      if (currentLayout === 'nodi') {
        node.targetX += node.vx;
        node.targetY += node.vy;
        if (Math.abs(node.targetX) > 650) node.vx *= -1;
        if (Math.abs(node.targetY) > 480) node.vy *= -1;
      }

      node.x += (node.targetX - node.x) * 0.085;
      node.y += (node.targetY - node.y) * 0.085;

      const targetS = (hoveredNode === node) ? node.targetScale * 1.25 : node.targetScale;
      node.scale += (targetS - node.scale) * 0.16;

      const matches = isNodeMatchingFilter(node);
      const targetA = matches ? 1.0 : 0.15;
      node.alpha += (targetA - node.alpha) * 0.12;
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

    // Deep Dark Slate background fill (#0B0D10)
    ctx.fillStyle = '#0B0D10';
    ctx.fillRect(0, 0, width, height);

    // Camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 1. Technical Exhibition Coordinates & Ambient Grid
    drawExhibitionGrid(now);

    // 2. Layout-specific structures
    if (currentLayout === 'planimetria') {
      drawPlanimetriaBlueprint();
    } else if (currentLayout === 'timeline') {
      drawTimelineRibbon();
    } else if (currentLayout === 'cluster') {
      drawClusterBlobs(now);
    }

    // 3. Ultra-fine Glowing Filaments with Traveling Particles
    drawFilaments(now);

    // 4. Render Micro-Cards (Nodes)
    drawMicroCards(now);

    ctx.restore();
    requestAnimationFrame(render);
  }

  // ── Exhibition Blueprint Grid ────────────────────────────────
  function drawExhibitionGrid(now) {
    const gridSize = 120;
    const halfSpan = 1600;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.022)';

    for (let x = -halfSpan; x <= halfSpan; x += gridSize) {
      ctx.beginPath();
      for (let y = -halfSpan; y <= halfSpan; y += 45) {
        const offset = getWaveOffset(x, y, now);
        const px = x + offset.dx;
        const py = y + offset.dy;
        if (y === -halfSpan) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Wave ripple concentric rings
    if (fabricWave.active) {
      const elapsed = now - fabricWave.startTime;
      const progress = elapsed / fabricWave.duration;
      const rippleRadius = elapsed * (fabricWave.speed / 1000);
      const alpha = Math.sin(progress * Math.PI) * 0.35;

      ctx.beginPath();
      ctx.arc(fabricWave.centerX, fabricWave.centerY, rippleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180, 212, 192, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Planimetria Architectural Floorplan ───────────────────────
  function drawPlanimetriaBlueprint() {
    ctx.save();
    Object.entries(HOUSE_ROOMS).forEach(([key, room]) => {
      const rx = room.x - room.w / 2;
      const ry = room.y - room.h / 2;

      // Soft slate glass fill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.018)';
      ctx.beginPath();
      ctx.roundRect(rx, ry, room.w, room.h, 16);
      ctx.fill();

      // Technical boundary line
      ctx.strokeStyle = 'rgba(203, 227, 214, 0.20)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Room Tag & Label (Space Grotesk style)
      ctx.fillStyle = '#B4D4C0';
      ctx.font = '600 10px "Space Grotesk", monospace';
      ctx.fillText(`// ROOM ${room.tag}`, rx + 18, ry + 24);

      ctx.fillStyle = '#F2F4F7';
      ctx.font = '500 12px "Space Grotesk", sans-serif';
      ctx.fillText(room.label, rx + 18, ry + 42);
    });
    ctx.restore();
  }

  // ── Timeline Ribbon ──────────────────────────────────────────
  function drawTimelineRibbon() {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-1400, 0);
    ctx.lineTo(1400, 0);
    ctx.strokeStyle = 'rgba(203, 227, 214, 0.3)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Ticks & stems
    for (let x = -1300; x <= 1300; x += 180) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(x - 1, -6, 2, 12);
    }

    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.moveTo(n.x, 0);
      ctx.lineTo(n.x, n.y);
      ctx.strokeStyle = 'rgba(203, 227, 214, 0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    ctx.restore();
  }

  // ── Cluster Organic Boundary Blobs ───────────────────────────
  function drawClusterBlobs(now) {
    const tagGroups = new Map();
    nodes.forEach((n) => {
      const t = n.primaryTag;
      if (!tagGroups.has(t)) tagGroups.set(t, []);
      tagGroups.get(t).push(n);
    });

    ctx.save();
    tagGroups.forEach((groupNodes, tag) => {
      if (groupNodes.length === 0) return;
      let avgX = 0, avgY = 0;
      groupNodes.forEach((n) => { avgX += n.x; avgY += n.y; });
      avgX /= groupNodes.length;
      avgY /= groupNodes.length;

      const palette = THEME_PALETTE[tag] || THEME_PALETTE.Default;
      const baseRadius = 140 + groupNodes.length * 15;

      // Draw multi-layered organic blob with harmonic oscillation
      ctx.beginPath();
      const points = 12;
      for (let i = 0; i < points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const wobble = Math.sin(theta * 3 + now * 0.001) * 12 + Math.cos(theta * 2 - now * 0.0008) * 8;
        const r = baseRadius + wobble;
        const px = avgX + Math.cos(theta) * r;
        const py = avgY + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      ctx.fillStyle = palette.tint;
      ctx.fill();
      ctx.strokeStyle = `${palette.primary}44`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cluster Tag Title
      ctx.fillStyle = palette.primary;
      ctx.font = '600 12px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`✦ ${tag.toUpperCase()} ARCHIVE`, avgX, avgY - baseRadius - 16);
    });
    ctx.restore();
  }

  // ── Ultra-Thin Glowing Filaments & Traveling Particles ───────
  function drawFilaments(now) {
    if (nodes.length < 2) return;

    ctx.save();
    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      if (n1.alpha < 0.25) continue;

      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        if (n2.alpha < 0.25) continue;

        const tags1 = n1.memory.tags || [];
        const tags2 = n2.memory.tags || [];
        const shared = tags1.filter((t) => tags2.includes(t));

        if (shared.length > 0) {
          const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
          if (dist < 460 || currentLayout === 'nodi') {
            const wave1 = getWaveOffset(n1.x, n1.y, now);
            const wave2 = getWaveOffset(n2.x, n2.y, now);

            const x1 = n1.x + wave1.dx;
            const y1 = n1.y + wave1.dy;
            const x2 = n2.x + wave2.dx;
            const y2 = n2.y + wave2.dy;

            const midX = (x1 + x2) / 2 + Math.sin(now * 0.0018 + i) * 14;
            const midY = (y1 + y2) / 2 + Math.cos(now * 0.0018 + j) * 14;

            const baseAlpha = Math.min(n1.alpha, n2.alpha) * (1 - Math.min(1, dist / 520));

            // Ultra-fine filament line
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(midX, midY, x2, y2);
            ctx.strokeStyle = `rgba(180, 212, 192, ${baseAlpha * 0.24})`;
            ctx.lineWidth = 1.0;
            ctx.stroke();

            // Traveling micro-particle
            const t = ((now * 0.00045 + i * 0.25) % 1);
            const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * midX + t * t * x2;
            const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * midY + t * t * y2;

            ctx.beginPath();
            ctx.arc(px, py, 2.0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(203, 227, 214, ${baseAlpha * 0.85})`;
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();
  }

  // ── Render Micro-Cards (Nodes) ───────────────────────────────
  function drawMicroCards(now) {
    nodes.forEach((node) => {
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

      // 1. Soft Glow on Hover
      if (isHover) {
        const glowPad = 16;
        const grad = ctx.createRadialGradient(nx, ny, h * 0.5, nx, ny, w * 0.8);
        grad.addColorStop(0, 'rgba(180, 212, 192, 0.35)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x0 - glowPad, y0 - glowPad, w + glowPad * 2, h + glowPad * 2, r + glowPad);
        ctx.fill();
      }

      // 2. Translucent Glassmorphic Card Body
      ctx.beginPath();
      ctx.roundRect(x0, y0, w, h, r);
      ctx.fillStyle = isHover ? 'rgba(20, 24, 30, 0.94)' : 'rgba(15, 18, 24, 0.82)';
      ctx.fill();

      // Card border (Sage on hover, subtle translucent otherwise)
      ctx.strokeStyle = isHover ? '#B4D4C0' : 'rgba(255, 255, 255, 0.09)';
      ctx.lineWidth = isHover ? 1.8 : 1.0;
      ctx.stroke();

      // 3. Media Thumbnail (Left Slot)
      const thumbSize = 32 * node.scale;
      const thumbPad = 7 * node.scale;
      const tx = x0 + thumbPad;
      const ty = y0 + (h - thumbSize) / 2;
      const tr = 8 * node.scale;

      if (node.memory.media_type === 'image' && node.memory.media_url && imageCache.has(node.memory.media_url)) {
        const img = imageCache.get(node.memory.media_url);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(tx, ty, thumbSize, thumbSize, tr);
        ctx.clip();
        ctx.drawImage(img, tx, ty, thumbSize, thumbSize);
        ctx.restore();
      } else {
        // Audio glyph slot
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(tx, ty, thumbSize, thumbSize, tr);
        ctx.fillStyle = 'rgba(180, 212, 192, 0.15)';
        ctx.fill();

        ctx.fillStyle = '#B4D4C0';
        ctx.font = `600 ${Math.round(14 * node.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♪', tx + thumbSize / 2, ty + thumbSize / 2);
        ctx.restore();
      }

      // 4. Title & Meta Text (Right Slot)
      const textX = tx + thumbSize + 8 * node.scale;
      const titleY = y0 + h * 0.42;

      ctx.fillStyle = '#F2F4F7';
      ctx.font = `500 ${Math.round(11 * node.scale)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Truncate title cleanly
      const rawTitle = node.memory.title || 'Memoria Stoà';
      const maxChars = isHover ? 18 : 13;
      const displayTitle = rawTitle.length > maxChars ? `${rawTitle.slice(0, maxChars)}…` : rawTitle;
      ctx.fillText(displayTitle, textX, titleY);

      // Sub-tag or Location
      const subY = y0 + h * 0.72;
      ctx.fillStyle = node.color;
      ctx.font = `500 ${Math.round(9 * node.scale)}px "Inter", sans-serif`;
      const subText = isHover && node.memory.location_tag
        ? `📍 ${node.memory.location_tag}`
        : `✦ ${node.primaryTag}`;
      ctx.fillText(subText, textX, subY);

      // 5. Extended Metadata Pill on Hover
      if (isHover) {
        drawHoverMetadataPill(node, nx, y0 + h + 8 * node.scale);
      }

      ctx.restore();
    });
  }

  // ── Hover Secondary Metadata Tag ─────────────────────────────
  function drawHoverMetadataPill(node, cx, topY) {
    const loc = node.memory.location_tag ? `📍 ${node.memory.location_tag}` : '📍 Stoà';
    const time = node.memory.time_event ? `⏱️ ${node.memory.time_event}` : '';
    const label = time ? `${loc}  ·  ${time}` : loc;

    ctx.save();
    ctx.font = '500 10px "Inter", sans-serif';
    const textW = ctx.measureText(label).width;
    const pillW = textW + 16;
    const pillH = 22;

    const px = cx - pillW / 2;
    const py = topY;

    ctx.fillStyle = 'rgba(11, 13, 16, 0.94)';
    ctx.beginPath();
    ctx.roundRect(px, py, pillW, pillH, 6);
    ctx.fill();

    ctx.strokeStyle = '#B4D4C0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#CBE3D6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, py + pillH / 2);
    ctx.restore();
  }

  // Start rendering loop
  requestAnimationFrame(render);

  // Return public API
  return {
    setLayout,
    setFilter,
    setMemories,
    addMemory,
    triggerFabricWave,
    pan,
    zoom,
    setHoverPoint,
    hitTest,
    getHoveredNode: () => hoveredNode,
    getCamera: () => camera,
  };
}
