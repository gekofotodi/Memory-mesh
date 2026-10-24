/**
 * Scene Module — Light Mode Editorial Canvas Engine (MĒNĒM & Section Clusters Style)
 * References: MĒNĒM, visualizzazione_sezioni.png, images_connection.jpg
 *
 * System Features:
 *  - Light Mode exhibition background (#F4F4F6)
 *  - Clean rectangular photo thumbnails with crisp white borders (#FFFFFF)
 *  - Minimal thin gray filaments (#B0B0B0, 1px) connecting shared memories
 *  - Organic colored boundary rings (red, sage green, blue, yellow) for Clusters (visualizzazione_sezioni.png)
 *  - Architectural blueprint styling for Planimetria & sleek timeline ribbon
 *  - Hover with Space Mono typography & crisp metadata tags
 *  - Real-Time Fabric Wave ('triggerFabricWave()')
 */

// ── House Blueprint Locations (Planimetria Layout) ─────────────
const HOUSE_ROOMS = {
  Salone:      { x: 0,    y: -80,  w: 440, h: 280, label: 'SALONE CENTRALE', code: 'SEC.01' },
  Giardino:    { x: 420,  y: 60,   w: 380, h: 320, label: 'GIARDINO ESTERNO', code: 'SEC.02' },
  Cucina:      { x: -400, y: -190, w: 280, h: 240, label: 'CUCINA CONDIVISA', code: 'SEC.03' },
  Terrazza:    { x: -380, y: 170,  w: 300, h: 220, label: 'TERRAZZA PANORAMICA', code: 'SEC.04' },
  Portico:     { x: 40,   y: 270,  w: 340, h: 180, label: 'PORTICO D\'INGRESSO', code: 'SEC.05' },
  'Sala Studio': { x: -80, y: -380, w: 340, h: 200, label: 'SALA STUDIO // CO-WORKING', code: 'SEC.06' },
};

// ── Primary Section Ring Colors (visualizzazione_sezioni.png) ──
const CLUSTER_PALETTE = {
  Musica:      { stroke: '#A8C3A0', fill: 'rgba(168, 195, 160, 0.08)' }, // Salvia
  Design:      { stroke: '#2E6BFF', fill: 'rgba(46, 107, 255, 0.06)' },  // Blu
  Laboratorio: { stroke: '#FF2E2E', fill: 'rgba(255, 46, 46, 0.06)' },   // Rosso
  Sport:       { stroke: '#F5A623', fill: 'rgba(245, 166, 35, 0.07)' },  // Giallo/Ambra
  Talk:        { stroke: '#9B51E0', fill: 'rgba(155, 81, 224, 0.06)' },  // Viola
  Social:      { stroke: '#00B894', fill: 'rgba(0, 184, 148, 0.07)' },   // Menta
  Relax:       { stroke: '#636E72', fill: 'rgba(99, 110, 114, 0.06)' },   // Fumo
  Default:     { stroke: '#A8C3A0', fill: 'rgba(168, 195, 160, 0.08)' },
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

  // Rectangular Photo Dimensions
  const THUMB_W = 76;
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

  // ── Fabric Wave Offset ───────────────────────────────────────
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
      const radius = 230 + (index % 4) * 85;
      const initX = Math.cos(angle) * radius;
      const initY = Math.sin(angle) * radius;

      const primaryTag = (m.tags && m.tags[0]) || 'Generale';
      const cluster = CLUSTER_PALETTE[primaryTag] || CLUSTER_PALETTE.Default;

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
        primaryTag,
        accentColor: cluster.stroke,
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

    const primaryTag = (newMem.tags && newMem.tags[0]) || 'Generale';
    const cluster = CLUSTER_PALETTE[primaryTag] || CLUSTER_PALETTE.Default;

    const newNode = {
      id: newMem.id || `node-${Date.now()}`,
      memory: newMem,
      x: camera.x + (Math.random() - 0.5) * 60,
      y: camera.y + (Math.random() - 0.5) * 60,
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
      primaryTag,
      accentColor: cluster.stroke,
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
          const dist = 240 + ((i * 61) % 350);
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
          const cy = Math.sin(clusterAngle) * clusterDist * 0.76;

          groupNodes.forEach((node, ni) => {
            const subAngle = (ni / groupNodes.length) * Math.PI * 2;
            const subDist = 70 + Math.floor(ni / 5) * 75;
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

        const spacingX = 145;
        const totalW = sorted.length * spacingX;
        const startX = -totalW / 2;

        sorted.forEach((node, i) => {
          node.targetX = startX + i * spacingX;
          const sign = i % 2 === 0 ? 1 : -1;
          const stemLength = 105 + ((i * 35) % 80);
          node.targetY = sign * stemLength;
          node.targetScale = 1.0;
        });
        break;
      }

      case 'griglia': {
        const cols = Math.max(3, Math.ceil(Math.sqrt(nodes.length * 1.5)));
        const cellW = 130;
        const cellH = 95;
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

  // ── Selectors ────────────────────────────────────────────────
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
    if (currentFilter === 'foto' || currentFilter === 'type-image') return node.memory.media_type === 'image';
    if (currentFilter === 'audio' || currentFilter === 'type-audio') return node.memory.media_type === 'audio';
    if (currentFilter === 'video') return node.memory.media_type === 'video';
    if (currentFilter === 'testo') return node.memory.media_type === 'text';
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

  // ── Hit-Testing ──────────────────────────────────────────────
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
      const targetA = matches ? 1.0 : 0.12;
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

    // Light Mode Exhibition Gallery Background (#F9F6F0)
    ctx.fillStyle = '#F9F6F0';
    ctx.fillRect(0, 0, width, height);

    // Camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 1. Planimetria / Timeline Guides
    if (currentLayout === 'planimetria') {
      drawPlanimetriaGuides();
    } else if (currentLayout === 'timeline') {
      drawTimelineGuides();
    } else if (currentLayout === 'cluster') {
      // 2. Colored Ring Boundaries (visualizzazione_sezioni.png)
      drawClusterSectionRings(now);
    }

    // 3. Thin Filaments
    drawFilaments(now);

    // 4. Clean Rectangular Photo Thumbnails
    drawThumbnails(now);

    ctx.restore();
    requestAnimationFrame(render);
  }

  // ── Planimetria Architectural Blueprint Guides ───────────────
  function drawPlanimetriaGuides() {
    ctx.save();
    Object.entries(HOUSE_ROOMS).forEach(([key, room]) => {
      const rx = room.x - room.w / 2;
      const ry = room.y - room.h / 2;

      // Architectural outline
      ctx.strokeStyle = '#EADBCE';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(rx, ry, room.w, room.h);
      ctx.setLineDash([]);

      // Room Header: Instrument Sans Bold & Instrument Serif
      ctx.fillStyle = 'rgba(153, 37, 28, 0.60)';
      ctx.font = '700 9px "Instrument Sans", sans-serif';
      ctx.fillText(`// ${room.code}`, rx + 16, ry + 22);

      ctx.fillStyle = '#99251C';
      ctx.font = 'italic 16px "Instrument Serif", Georgia, serif';
      ctx.fillText(room.label, rx + 16, ry + 38);
    });
    ctx.restore();
  }

  // ── Timeline Minimal Axis ────────────────────────────────────
  function drawTimelineGuides() {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-1400, 0);
    ctx.lineTo(1400, 0);
    ctx.strokeStyle = '#EADBCE';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.moveTo(n.x, 0);
      ctx.lineTo(n.x, n.y);
      ctx.strokeStyle = '#EADBCE';
      ctx.setLineDash([2, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.restore();
  }

  // ── Colored Section Rings (visualizzazione_sezioni.png) ───────
  function drawClusterSectionRings(now) {
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

      const cluster = CLUSTER_PALETTE[tag] || CLUSTER_PALETTE.Default;
      const radius = 135 + groupNodes.length * 14;

      // Organic smooth ring contour
      ctx.beginPath();
      const points = 16;
      for (let i = 0; i < points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const wobble = Math.sin(theta * 3 + now * 0.001) * 6 + Math.cos(theta * 2 - now * 0.0008) * 4;
        const r = radius + wobble;
        const px = avgX + Math.cos(theta) * r;
        const py = avgY + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Translucent section wash
      ctx.fillStyle = cluster.fill;
      ctx.fill();

      // Crisp colored outline ring
      ctx.strokeStyle = cluster.stroke;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Section Tag in Instrument Serif Italic
      ctx.fillStyle = '#99251C';
      ctx.font = 'italic 16px "Instrument Serif", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Sezione // ${tag}`, avgX, avgY - radius - 12);
    });
    ctx.restore();
  }

  // ── Thin Warm Filaments ─
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

            // Fine clean bordeaux filament line
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `rgba(153, 37, 28, ${baseAlpha * 0.35})`;
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  }

  // ── Clean Rectangular Photo Thumbnails with Crisp White Borders
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

      // Soft light-gallery shadow
      ctx.shadowColor = 'rgba(153, 37, 28, 0.08)';
      ctx.shadowBlur = isHover ? 12 : 6;
      ctx.shadowOffsetY = isHover ? 6 : 2;

      // Light cream solid backing
      ctx.beginPath();
      ctx.roundRect(x0, y0, w, h, r);
      ctx.fillStyle = '#FFFDF9';
      ctx.fill();

      // Reset shadow for inner drawing
      ctx.shadowColor = 'transparent';

      // Draw media thumbnail
      if ((node.memory.media_type === 'image' || node.memory.media_type === 'text') && node.memory.media_url && imageCache.has(node.memory.media_url)) {
        const img = imageCache.get(node.memory.media_url);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x0 + 1.5, y0 + 1.5, w - 3, h - 3, r - 1);
        ctx.clip();
        ctx.drawImage(img, x0 + 1.5, y0 + 1.5, w - 3, h - 3);
        ctx.restore();
      } else {
        const glyph = node.memory.media_type === 'audio' ? '♪' : node.memory.media_type === 'video' ? '▶' : '“';
        ctx.fillStyle = '#99251C';
        ctx.font = `italic 400 ${Math.round(22 * node.scale)}px "Instrument Serif", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(glyph, nx, ny);
      }

      // Crisp Light Cream Border + Hairline
      ctx.beginPath();
      ctx.roundRect(x0, y0, w, h, r);
      ctx.strokeStyle = isHover ? '#99251C' : '#FFFDF9';
      ctx.lineWidth = isHover ? 2.5 : 2.0;
      ctx.stroke();

      // Subtle outer definition hairline when not hovered
      if (!isHover) {
        ctx.beginPath();
        ctx.roundRect(x0 - 0.5, y0 - 0.5, w + 1, h + 1, r + 0.5);
        ctx.strokeStyle = 'rgba(153, 37, 28, 0.15)';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      // Hover: Clean Light Cream Tooltip Card with Instrument Serif typography
      if (isHover) {
        drawHoverTooltip(node, nx, y0 + h + 12 * node.scale);
      }

      ctx.restore();
    });
  }

  // ── Hover Tooltip (Instrument Serif & Instrument Sans Bold) ─────────────
  function drawHoverTooltip(node, cx, topY) {
    const rawTitle = node.memory.title || 'Memoria';
    const loc = node.memory.location_tag ? ` // ${node.memory.location_tag}` : '';
    const text = `${rawTitle}${loc}`;

    ctx.save();
    ctx.font = 'italic 15px "Instrument Serif", Georgia, serif';
    const textW = ctx.measureText(text).width;
    const boxW = Math.max(textW + 24, 70);
    const boxH = 28;

    const bx = cx - boxW / 2;
    const by = topY;

    // Clean light cream card
    ctx.shadowColor = 'rgba(153, 37, 28, 0.10)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#EADBCE';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Bordeaux left accent indicator
    ctx.fillStyle = '#99251C';
    ctx.fillRect(bx, by + 4, 3, boxH - 8);

    // Text in Instrument Serif Italic
    ctx.fillStyle = '#99251C';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 15px "Instrument Serif", Georgia, serif';
    ctx.fillText(text, cx + 2, by + boxH / 2);

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
