/**
 * Scene Module — 2D Canvas Graphics Engine & Spatial Layouts
 *
 * Responsibilities:
 *  - 60 FPS rendering loop with HiDPI support
 *  - Virtual camera with Pan & Zoom smoothing
 *  - 5 Interactive Visualization Layouts:
 *      1. 'nodi': Floating constellation with glowing filaments between shared tags
 *      2. 'cluster': Thematic clouds with colored boundaries and tag labels
 *      3. 'planimetria': Spatial house floorplan (Salone, Cucina, Giardino, Portico...)
 *      4. 'timeline': Chronological axis with time ticks and stems
 *      5. 'griglia': Curated museum matrix / ordered sequential grid
 *  - Real-Time Fabric Wave ('triggerFabricWave()'): fluid mesh wave distortion
 *    triggered upon Supabase real-time INSERT without interrupting user view
 *  - Node Hover, Hit-testing, and Filtering states
 */

// ── House Blueprint Locations (Planimetria Layout) ─────────────
const HOUSE_ROOMS = {
  Salone:      { x: 0,    y: -80,  w: 420, h: 260, label: 'Salone Centrale',  color: 'rgba(132, 169, 140, 0.12)' },
  Giardino:    { x: 380,  y: 40,   w: 360, h: 320, label: 'Giardino Esterno', color: 'rgba(82, 121, 111, 0.14)' },
  Cucina:      { x: -360, y: -180, w: 260, h: 220, label: 'Cucina Comunitaria', color: 'rgba(202, 210, 197, 0.1)' },
  Terrazza:    { x: -340, y: 150,  w: 280, h: 200, label: 'Terrazza Panoramica', color: 'rgba(91, 192, 190, 0.12)' },
  Portico:     { x: 40,   y: 240,  w: 320, h: 160, label: 'Portico d\'Ingresso', color: 'rgba(167, 201, 87, 0.12)' },
  'Sala Studio': { x: -80, y: -340, w: 320, h: 180, label: 'Sala Studio & Co-Working', color: 'rgba(132, 169, 140, 0.1)' },
};

// ── Color Palettes & Clusters ──────────────────────────────────
const TAG_COLORS = {
  Musica:      '#84a98c',
  Design:      '#5bc0be',
  Laboratorio: '#a7c957',
  Sport:       '#f4a261',
  Talk:        '#e76f51',
  Social:      '#6fffe9',
  Relax:       '#cad2c5',
  Default:     '#84a98c',
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

  // ── Camera (World Space to Screen Space) ──────────────────────
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
  let currentLayout = 'nodi'; // 'nodi' | 'cluster' | 'planimetria' | 'timeline' | 'griglia'
  let currentFilter = 'all';  // 'all' | 'type-image' | 'type-audio' | 'tag-XXX'
  let memories = [];
  let nodes = [];
  let hoveredNode = null;
  let pointerScreen = { x: -9999, y: -9999 };

  // Image cache for avatar thumbnails
  const imageCache = new Map();

  // ── Fabric Wave Distortion State ─────────────────────────────
  const fabricWave = {
    active: false,
    startTime: 0,
    duration: 3200,      // ms
    centerX: 0,          // in world coordinates
    centerY: 0,
    amplitude: 45,       // max distortion offset
    frequency: 0.012,    // wave frequency
    speed: 550,          // speed of wave ripple propagation
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

  // ── World & Screen Coordinate Transforms ─────────────────────
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

  // ── Fabric Wave Distortion Offset ────────────────────────────
  function getWaveOffset(wx, wy, now) {
    if (!fabricWave.active) return { dx: 0, dy: 0, intensity: 0 };

    const elapsed = now - fabricWave.startTime;
    if (elapsed > fabricWave.duration) {
      fabricWave.active = false;
      return { dx: 0, dy: 0, intensity: 0 };
    }

    const progress = elapsed / fabricWave.duration;
    // Harmonic envelope decay: smoothly rises then dissolves
    const envelope = Math.sin(progress * Math.PI) * (1.0 - progress * 0.4);

    const dist = Math.hypot(wx - fabricWave.centerX, wy - fabricWave.centerY);
    const waveFront = elapsed * (fabricWave.speed / 1000);
    const distFromFront = Math.abs(dist - waveFront);

    // Damped sinusoidal ripple around expanding front
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

  // ── Populate & Sync Memories ─────────────────────────────────
  function setMemories(memoriesList) {
    memories = memoriesList || [];

    // Preload images into cache
    memories.forEach((m) => {
      if (m.media_type === 'image' && m.media_url && !imageCache.has(m.media_url)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = m.media_url;
        img.onload = () => imageCache.set(m.media_url, img);
      }
    });

    // Create node objects
    nodes = memories.map((m, index) => {
      // Find existing node if any to preserve smooth motion
      const existing = nodes.find((n) => n.id === m.id);
      if (existing) {
        existing.memory = m;
        return existing;
      }

      // Initial placement
      const angle = (index / Math.max(1, memories.length)) * Math.PI * 2;
      const radius = 180 + (index % 4) * 80;
      const initX = Math.cos(angle) * radius;
      const initY = Math.sin(angle) * radius;

      return {
        id: m.id || `temp-${index}`,
        memory: m,
        // Current animated world coordinates
        x: initX,
        y: initY,
        // Target layout coordinates
        targetX: initX,
        targetY: initY,
        // Float drift velocities for 'nodi' constellation
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: 34,
        scale: 0.2, // initial spawn scale
        targetScale: 1.0,
        alpha: 1.0,
        primaryTag: (m.tags && m.tags[0]) || 'General',
        color: TAG_COLORS[(m.tags && m.tags[0])] || TAG_COLORS.Default,
      };
    });

    recalculateLayoutTargets();
  }

  function addMemory(newMem) {
    memories.unshift(newMem);

    // Preload image if applicable
    if (newMem.media_type === 'image' && newMem.media_url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = newMem.media_url;
      img.onload = () => imageCache.set(newMem.media_url, img);
    }

    const newNode = {
      id: newMem.id || `node-${Date.now()}`,
      memory: newMem,
      x: camera.x + (Math.random() - 0.5) * 100,
      y: camera.y + (Math.random() - 0.5) * 100,
      targetX: 0,
      targetY: 0,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: 38,
      scale: 0.1,
      targetScale: 1.25,
      alpha: 1.0,
      primaryTag: (newMem.tags && newMem.tags[0]) || 'General',
      color: TAG_COLORS[(newMem.tags && newMem.tags[0])] || TAG_COLORS.Default,
      isBrandNew: true,
    };

    nodes.unshift(newNode);
    recalculateLayoutTargets();

    // Trigger fabric wave radiating from the new node!
    triggerFabricWave(newNode.x, newNode.y);
  }

  // ── Calculate Target Positions for the 5 Layouts ─────────────
  function recalculateLayoutTargets() {
    if (!nodes.length) return;

    switch (currentLayout) {
      case 'nodi': {
        // Constellation layout: Organic radial orbit with elasticity
        const count = nodes.length;
        nodes.forEach((node, i) => {
          const phi = (i / count) * Math.PI * 2;
          const dist = 220 + ((i * 47) % 360);
          node.targetX = Math.cos(phi) * dist;
          node.targetY = Math.sin(phi) * dist * 0.75;
          node.targetScale = 1.0;
        });
        break;
      }

      case 'cluster': {
        // Group by primary tag in soft circular clouds
        const tagGroups = new Map();
        nodes.forEach((n) => {
          const t = n.primaryTag;
          if (!tagGroups.has(t)) tagGroups.set(t, []);
          tagGroups.get(t).push(n);
        });

        const numClusters = tagGroups.size;
        let clusterIdx = 0;

        tagGroups.forEach((groupNodes, tag) => {
          const clusterAngle = (clusterIdx / numClusters) * Math.PI * 2;
          const clusterDist = 420;
          const cx = Math.cos(clusterAngle) * clusterDist;
          const cy = Math.sin(clusterAngle) * clusterDist * 0.8;

          groupNodes.forEach((node, ni) => {
            const subAngle = (ni / groupNodes.length) * Math.PI * 2;
            const subDist = 60 + Math.floor(ni / 6) * 75;
            node.targetX = cx + Math.cos(subAngle) * subDist;
            node.targetY = cy + Math.sin(subAngle) * subDist;
            node.targetScale = 1.0;
          });
          clusterIdx++;
        });
        break;
      }

      case 'planimetria': {
        // Distribute nodes into architectural rooms of Stoà
        const roomCounts = {};
        Object.keys(HOUSE_ROOMS).forEach((r) => (roomCounts[r] = 0));

        nodes.forEach((node) => {
          const loc = node.memory.location_tag;
          const room = HOUSE_ROOMS[loc] || HOUSE_ROOMS.Salone;
          const count = roomCounts[loc] || 0;
          roomCounts[loc] = count + 1;

          // Spiral distribution inside room bounding box
          const spiralAngle = count * 1.6;
          const spiralDist = Math.min(room.w, room.h) * 0.28 * Math.sqrt(count + 1);
          node.targetX = room.x + Math.cos(spiralAngle) * spiralDist;
          node.targetY = room.y + Math.sin(spiralAngle) * spiralDist;
          node.targetScale = 0.95;
        });
        break;
      }

      case 'timeline': {
        // Horizontal chronological ribbon
        // Sort chronologically by time_event or created_at
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
          // Alternating stems above and below timeline
          const sign = i % 2 === 0 ? 1 : -1;
          const stemLength = 100 + ((i * 31) % 90);
          node.targetY = sign * stemLength;
          node.targetScale = 1.0;
        });
        break;
      }

      case 'griglia': {
        // Balanced museum matrix
        const cols = Math.max(3, Math.ceil(Math.sqrt(nodes.length * 1.5)));
        const cellW = 160;
        const cellH = 160;
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

  // ── Switch Layout & Apply Filters ────────────────────────────
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

  // ── Hit-Testing (Node Selection) ─────────────────────────────
  function hitTest(screenX, screenY) {
    const worldP = screenToWorld(screenX, screenY);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dist = Math.hypot(n.x - worldP.x, n.y - worldP.y);
      if (dist <= n.radius * n.scale * 1.15) {
        return n;
      }
    }
    return null;
  }

  // ── Update Logic ─────────────────────────────────────────────
  function update() {
    const now = performance.now();

    // 1. Smooth Camera Lerp
    camera.x += (camera.targetX - camera.x) * 0.12;
    camera.y += (camera.targetY - camera.y) * 0.12;
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.14;

    // 2. Update Node Positions with Lerp + Physics Drift
    nodes.forEach((node) => {
      // In 'nodi' constellation mode, apply gentle harmonic drift
      if (currentLayout === 'nodi') {
        node.targetX += node.vx;
        node.targetY += node.vy;
        // Soft boundary reflection
        if (Math.abs(node.targetX) > 600) node.vx *= -1;
        if (Math.abs(node.targetY) > 450) node.vy *= -1;
      }

      // Smooth position lerp
      node.x += (node.targetX - node.x) * 0.085;
      node.y += (node.targetY - node.y) * 0.085;

      // Smooth scale lerp
      const targetS = (hoveredNode === node) ? node.targetScale * 1.35 : node.targetScale;
      node.scale += (targetS - node.scale) * 0.15;

      // Filter alpha handling
      const matches = isNodeMatchingFilter(node);
      const targetA = matches ? 1.0 : 0.18;
      node.alpha += (targetA - node.alpha) * 0.1;
    });

    // 3. Test Hover under pointer
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

    // Camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // ── 1. Background Visual Grid / Fabric Waves ───────────────
    drawBackgroundGrid(now);

    // ── 2. Layout-specific Backgrounds (Planimetria / Timeline) ──
    if (currentLayout === 'planimetria') {
      drawPlanimetriaFloorplan();
    } else if (currentLayout === 'timeline') {
      drawTimelineAxis();
    } else if (currentLayout === 'cluster') {
      drawClusterBoundaries();
    }

    // ── 3. Filaments / Connections between Shared Tags ─────────
    drawConnections(now);

    // ── 4. Nodes ───────────────────────────────────────────────
    drawNodes(now);

    // ── 5. Hover Tooltip ───────────────────────────────────────
    if (hoveredNode) {
      drawNodeTooltip(hoveredNode, now);
    }

    ctx.restore();
    requestAnimationFrame(render);
  }

  // ── Draw Background Grid & Dynamic Fabric Waves ──────────────
  function drawBackgroundGrid(now) {
    const gridSize = 100;
    const halfSpan = 1400;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';

    for (let x = -halfSpan; x <= halfSpan; x += gridSize) {
      ctx.beginPath();
      for (let y = -halfSpan; y <= halfSpan; y += 40) {
        const offset = getWaveOffset(x, y, now);
        const px = x + offset.dx;
        const py = y + offset.dy;
        if (y === -halfSpan) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Wave ripples overlay
    if (fabricWave.active) {
      const elapsed = now - fabricWave.startTime;
      const progress = elapsed / fabricWave.duration;
      const rippleRadius = elapsed * (fabricWave.speed / 1000);
      const alpha = Math.sin(progress * Math.PI) * 0.35;

      ctx.beginPath();
      ctx.arc(fabricWave.centerX, fabricWave.centerY, rippleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(167, 201, 87, ${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Planimetria Architectural Floorplan ───────────────────────
  function drawPlanimetriaFloorplan() {
    ctx.save();
    Object.entries(HOUSE_ROOMS).forEach(([key, room]) => {
      // Room translucent fill
      ctx.fillStyle = room.color;
      ctx.fillRect(room.x - room.w / 2, room.y - room.h / 2, room.w, room.h);

      // Room border
      ctx.strokeStyle = 'rgba(132, 169, 140, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(room.x - room.w / 2, room.y - room.h / 2, room.w, room.h);

      // Room label
      ctx.fillStyle = 'rgba(240, 244, 242, 0.65)';
      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(room.label, room.x - room.w / 2 + 14, room.y - room.h / 2 + 24);
    });
    ctx.restore();
  }

  // ── Timeline Axis ────────────────────────────────────────────
  function drawTimelineAxis() {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-1200, 0);
    ctx.lineTo(1200, 0);
    ctx.strokeStyle = 'rgba(132, 169, 140, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Time ticks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let x = -1100; x <= 1100; x += 140) {
      ctx.fillRect(x - 1, -8, 2, 16);
    }

    // Stem lines from timeline to nodes
    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.moveTo(n.x, 0);
      ctx.lineTo(n.x, n.y);
      ctx.strokeStyle = 'rgba(132, 169, 140, 0.25)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    ctx.restore();
  }

  // ── Cluster Boundaries ───────────────────────────────────────
  function drawClusterBoundaries() {
    const tagGroups = new Map();
    nodes.forEach((n) => {
      const t = n.primaryTag;
      if (!tagGroups.has(t)) tagGroups.set(t, []);
      tagGroups.get(t).push(n);
    });

    ctx.save();
    tagGroups.forEach((groupNodes, tag) => {
      if (groupNodes.length === 0) return;
      // Calculate cluster center
      let avgX = 0, avgY = 0;
      groupNodes.forEach((n) => { avgX += n.x; avgY += n.y; });
      avgX /= groupNodes.length;
      avgY /= groupNodes.length;

      // Soft circular cloud boundary
      const radius = 130 + groupNodes.length * 14;
      const color = TAG_COLORS[tag] || TAG_COLORS.Default;

      ctx.beginPath();
      ctx.arc(avgX, avgY, radius, 0, Math.PI * 2);
      ctx.fillStyle = `${color}10`;
      ctx.fill();
      ctx.strokeStyle = `${color}40`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cluster Tag Label
      ctx.fillStyle = color;
      ctx.font = '700 14px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tag.toUpperCase(), avgX, avgY - radius - 10);
    });
    ctx.restore();
  }

  // ── Filaments between Shared Tags ────────────────────────────
  function drawConnections(now) {
    if (nodes.length < 2) return;

    ctx.save();
    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      if (n1.alpha < 0.25) continue;

      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        if (n2.alpha < 0.25) continue;

        // Check for shared tags
        const tags1 = n1.memory.tags || [];
        const tags2 = n2.memory.tags || [];
        const shared = tags1.filter((t) => tags2.includes(t));

        if (shared.length > 0) {
          const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
          // Limit connection distance for visual clarity
          if (dist < 420 || currentLayout === 'nodi') {
            const wave1 = getWaveOffset(n1.x, n1.y, now);
            const wave2 = getWaveOffset(n2.x, n2.y, now);

            const x1 = n1.x + wave1.dx;
            const y1 = n1.y + wave1.dy;
            const x2 = n2.x + wave2.dx;
            const y2 = n2.y + wave2.dy;

            // Curved Quadratic Bezier
            const midX = (x1 + x2) / 2 + Math.sin(now * 0.002 + i) * 15;
            const midY = (y1 + y2) / 2 + Math.cos(now * 0.002 + j) * 15;

            const baseAlpha = Math.min(n1.alpha, n2.alpha) * (1 - Math.min(1, dist / 500));
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(midX, midY, x2, y2);
            ctx.strokeStyle = `rgba(132, 169, 140, ${baseAlpha * 0.35})`;
            ctx.lineWidth = 1.2 + shared.length * 0.6;
            ctx.stroke();

            // Particle traveling along filament
            const t = ((now * 0.0006 + i * 0.3) % 1);
            const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * midX + t * t * x2;
            const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * midY + t * t * y2;

            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(167, 201, 87, ${baseAlpha * 0.8})`;
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();
  }

  // ── Nodes Rendering ──────────────────────────────────────────
  function drawNodes(now) {
    nodes.forEach((node) => {
      ctx.save();
      ctx.globalAlpha = node.alpha;

      const wave = getWaveOffset(node.x, node.y, now);
      const nx = node.x + wave.dx;
      const ny = node.y + wave.dy;
      const r = node.radius * node.scale;

      const isHover = (hoveredNode === node);

      // Outer Glow
      const glowGrad = ctx.createRadialGradient(nx, ny, r * 0.7, nx, ny, r * 1.8);
      glowGrad.addColorStop(0, isHover ? 'rgba(167, 201, 87, 0.45)' : 'rgba(132, 169, 140, 0.25)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(nx, ny, r * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Node Body
      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.fillStyle = '#0f141a';
      ctx.fill();

      // Image Thumbnail or Audio Icon
      if (node.memory.media_type === 'image' && node.memory.media_url && imageCache.has(node.memory.media_url)) {
        const img = imageCache.get(node.memory.media_url);
        ctx.save();
        ctx.beginPath();
        ctx.arc(nx, ny, r - 3, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, nx - r, ny - r, r * 2, r * 2);
        ctx.restore();
      } else {
        // Audio node: Sound wave concentric circles & icon
        ctx.save();
        ctx.fillStyle = 'rgba(91, 192, 190, 0.15)';
        ctx.beginPath();
        ctx.arc(nx, ny, r - 4, 0, Math.PI * 2);
        ctx.fill();

        // Music note glyph
        ctx.fillStyle = '#6fffe9';
        ctx.font = `${Math.round(r * 0.7)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♪', nx, ny);
        ctx.restore();
      }

      // Border Ring
      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.strokeStyle = isHover ? '#a7c957' : node.color;
      ctx.lineWidth = isHover ? 3.5 : 2;
      ctx.stroke();

      ctx.restore();
    });
  }

  // ── Node Hover Tooltip ───────────────────────────────────────
  function drawNodeTooltip(node, now) {
    const wave = getWaveOffset(node.x, node.y, now);
    const nx = node.x + wave.dx;
    const ny = node.y + wave.dy - (node.radius * node.scale + 16);

    ctx.save();
    const title = node.memory.title || 'Senza titolo';
    const loc = node.memory.location_tag ? `📍 ${node.memory.location_tag}` : '';
    const text = loc ? `${title} · ${loc}` : title;

    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    const textW = ctx.measureText(text).width;
    const padX = 14;
    const padY = 7;
    const boxW = textW + padX * 2;
    const boxH = 28;

    // Tooltip Card
    ctx.fillStyle = 'rgba(15, 19, 25, 0.92)';
    ctx.strokeStyle = '#a7c957';
    ctx.lineWidth = 1.2;

    const bx = nx - boxW / 2;
    const by = ny - boxH;

    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, nx, by + boxH / 2);

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
