/**
 * Scene Module — Minimal Essential Canvas Engine & Spatial Layouts
 * Inspired by: 'images_connection.jpg'
 *
 * Visual System:
 *  - Deep clean dark background (#08080A), no heavy textures or artificial glow
 *  - Nodes rendered as clean rectangular photo/audio thumbnails (no cards or thick borders)
 *  - Hover: subtle scale expansion with clean floating title and thin border
 *  - Connections: ultra-thin neutral gray filaments (0.8px, opacity ~0.14) connecting shared tags
 *  - 5 Layouts: nodi (constellation), cluster, planimetria, timeline, griglia
 *  - Real-Time Fabric Wave ('triggerFabricWave()')
 */

// ── House Blueprint Locations (Planimetria Layout) ─────────────
const HOUSE_ROOMS = {
  Salone:      { x: 0,    y: -80,  w: 440, h: 280, label: 'Salone' },
  Giardino:    { x: 420,  y: 60,   w: 380, h: 320, label: 'Giardino' },
  Cucina:      { x: -400, y: -190, w: 280, h: 240, label: 'Cucina' },
  Terrazza:    { x: -380, y: 170,  w: 300, h: 220, label: 'Terrazza' },
  Portico:     { x: 40,   y: 270,  w: 340, h: 180, label: 'Portico' },
  'Sala Studio': { x: -80, y: -380, w: 340, h: 200, label: 'Sala Studio' },
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
  let currentLayout = 'nodi';
  let currentFilter = 'all';
  let memories = [];
  let nodes = [];
  let hoveredNode = null;
  let pointerScreen = { x: -9999, y: -9999 };

  // Image cache
  const imageCache = new Map();

  // Rectangular Thumbnail Base Dimensions
  const THUMB_W = 72;
  const THUMB_H = 52;
  const THUMB_R = 4;

  // ── Fabric Wave Distortion State ─────────────────────────────
  const fabricWave = {
    active: false,
    startTime: 0,
    duration: 2800,
    centerX: 0,
    centerY: 0,
    amplitude: 30,
    frequency: 0.012,
    speed: 500,
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

  // ── Trigger Fabric Wave ──────────────────────────────────────
  function triggerFabricWave(originX = 0, originY = 0) {
    fabricWave.active = true;
    fabricWave.startTime = performance.now();
    fabricWave.centerX = originX;
    fabricWave.centerY = originY;
  }

  // ── Sync & Populate Memories ─────────────────────────────────
  function setMemories(memoriesList) {
    memories = memoriesList || [];

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
      const radius = 220 + (index % 4) * 85;
      const initX = Math.cos(angle) * radius;
      const initY = Math.sin(angle) * radius;

      return {
        id: m.id || `node-${index}`,
        memory: m,
        x: initX,
        y: initY,
        targetX: initX,
        targetY: initY,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        w: THUMB_W,
        h: THUMB_H,
        radius: THUMB_R,
        scale: 0.2,
        targetScale: 1.0,
        alpha: 1.0,
        primaryTag: (m.tags && m.tags[0]) || 'Generale',
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

    const newNode = {
      id: newMem.id || `node-${Date.now()}`,
      memory: newMem,
      x: camera.x + (Math.random() - 0.5) * 70,
      y: camera.y + (Math.random() - 0.5) * 70,
      targetX: 0,
      targetY: 0,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      w: THUMB_W,
      h: THUMB_H,
      radius: THUMB_R,
      scale: 0.1,
      targetScale: 1.15,
      alpha: 1.0,
      primaryTag: (newMem.tags && newMem.tags[0]) || 'Generale',
    };

    nodes.unshift(newNode);
    recalculateLayoutTargets();
    triggerFabricWave(newNode.x, newNode.y);
  }

  // ── Calculate Target Positions for Layouts ───────────────────
  function recalculateLayoutTargets() {
    if (!nodes.length) return;

    switch (currentLayout) {
      case 'nodi': {
        const count = nodes.length;
        nodes.forEach((node, i) => {
          const phi = (i / count) * Math.PI * 2;
          const dist = 230 + ((i * 59) % 360);
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
          const clusterDist = 430;
          const cx = Math.cos(clusterAngle) * clusterDist;
          const cy = Math.sin(clusterAngle) * clusterDist * 0.78;

          groupNodes.forEach((node, ni) => {
            const subAngle = (ni / groupNodes.length) * Math.PI * 2;
            const subDist = 65 + Math.floor(ni / 5) * 75;
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
          const spiralDist = Math.min(room.w, room.h) * 0.25 * Math.sqrt(count + 1);
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

        const spacingX = 140;
        const totalW = sorted.length * spacingX;
        const startX = -totalW / 2;

        sorted.forEach((node, i) => {
          node.targetX = startX + i * spacingX;
          const sign = i % 2 === 0 ? 1 : -1;
          const stemLength = 100 + ((i * 37) % 80);
          node.targetY = sign * stemLength;
          node.targetScale = 1.0;
        });
        break;
      }

      case 'griglia': {
        const cols = Math.max(3, Math.ceil(Math.sqrt(nodes.length * 1.5)));
        const cellW = 120;
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

  // ── Hit-Testing (Thumbnail Bounds) ───────────────────────────
  function hitTest(screenX, screenY) {
    const worldP = screenToWorld(screenX, screenY);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
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

      const targetS = (hoveredNode === node) ? node.targetScale * 1.20 : node.targetScale;
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

    // Deep clean solid dark background (#08080A)
    ctx.fillStyle = '#08080A';
    ctx.fillRect(0, 0, width, height);

    // Camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 1. Layout-specific subtle guides
    if (currentLayout === 'planimetria') {
      drawPlanimetriaGuides();
    } else if (currentLayout === 'timeline') {
      drawTimelineGuides();
    } else if (currentLayout === 'cluster') {
      drawClusterGuides();
    }

    // 2. Ultra-thin clean neutral filaments
    drawFilaments(now);

    // 3. Clean rectangular photo/audio thumbnails
    drawThumbnails(now);

    ctx.restore();
    requestAnimationFrame(render);
  }

  // ── Planimetria Minimal Guides ───────────────────────────────
  function drawPlanimetriaGuides() {
    ctx.save();
    Object.entries(HOUSE_ROOMS).forEach(([key, room]) => {
      const rx = room.x - room.w / 2;
      const ry = room.y - room.h / 2;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(rx, ry, room.w, room.h);
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '500 11px "Inter", sans-serif';
      ctx.fillText(room.label, rx + 14, ry + 22);
    });
    ctx.restore();
  }

  // ── Timeline Minimal Guides ──────────────────────────────────
  function drawTimelineGuides() {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-1400, 0);
    ctx.lineTo(1400, 0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.moveTo(n.x, 0);
      ctx.lineTo(n.x, n.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.setLineDash([2, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.restore();
  }

  // ── Cluster Minimal Guides ───────────────────────────────────
  function drawClusterGuides() {
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

      const radius = 130 + groupNodes.length * 12;

      ctx.beginPath();
      ctx.arc(avgX, avgY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '500 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tag, avgX, avgY - radius - 10);
    });
    ctx.restore();
  }

  // ── Ultra-Thin Clean Neutral Filaments ───────────────────────
  // Exactly as in 'images_connection.jpg' — fine, minimal, elegant lines
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

            const baseAlpha = Math.min(n1.alpha, n2.alpha) * (1 - Math.min(1, dist / 520));

            // Ultra-fine neutral line
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${baseAlpha * 0.14})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  }

  // ── Rectangular Thumbnails (Nodes) ───────────────────────────
  function drawThumbnails(now) {
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

      // Draw rectangular thumbnail content
      if (node.memory.media_type === 'image' && node.memory.media_url && imageCache.has(node.memory.media_url)) {
        const img = imageCache.get(node.memory.media_url);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x0, y0, w, h, r);
        ctx.clip();
        ctx.drawImage(img, x0, y0, w, h);
        ctx.restore();
      } else {
        // Audio node: clean dark slate tile with musical glyph
        ctx.beginPath();
        ctx.roundRect(x0, y0, w, h, r);
        ctx.fillStyle = '#14161B';
        ctx.fill();

        ctx.fillStyle = '#8E929B';
        ctx.font = `500 ${Math.round(18 * node.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♪', nx, ny);
      }

      // Thin neat border
      ctx.beginPath();
      ctx.roundRect(x0, y0, w, h, r);
      ctx.strokeStyle = isHover ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = isHover ? 1.5 : 1.0;
      ctx.stroke();

      // Hover: Clean minimal tooltip showing title
      if (isHover) {
        drawMinimalHoverTitle(node, nx, y0 + h + 10 * node.scale);
      }

      ctx.restore();
    });
  }

  // ── Minimal Hover Tooltip ────────────────────────────────────
  function drawMinimalHoverTitle(node, cx, topY) {
    const title = node.memory.title || 'Ricordo';
    const loc = node.memory.location_tag ? ` · ${node.memory.location_tag}` : '';
    const text = `${title}${loc}`;

    ctx.save();
    ctx.font = '500 11px "Inter", sans-serif';
    const textW = ctx.measureText(text).width;
    const boxW = textW + 16;
    const boxH = 24;

    const bx = cx - boxW / 2;
    const by = topY;

    // Dark solid pill
    ctx.fillStyle = 'rgba(8, 8, 10, 0.92)';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 4);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#EDEDED';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, by + boxH / 2);

    ctx.restore();
  }

  // Start rendering loop
  requestAnimationFrame(render);

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
