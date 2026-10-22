/**
 * Main Orchestrator — Memory Mesh Kiosk Display
 *
 * Connects:
 *  - Supabase client (shared/supabase-config.js) & real-time Postgres changes
 *  - Computer Vision Tracking (tracking.js)
 *  - 2D Canvas Scene Engine (scene.js)
 *  - Wheel Menus (Left: Layouts, Right: Filters)
 *  - Bento Grid Modals (Info & Memory Details)
 *  - Virtual Cursor & Audio Waveform Visualizer
 */

import { supabase } from '../shared/supabase-config.js';
import { initTracking } from './tracking.js';
import { initScene } from './scene.js';
import { initWheelMenu } from './wheelMenu.js';

// ── Fallback Memories (Centro Giovanile Stoà) ───────────────────
// Displayed when database is empty or offline so the kiosk is vibrant
const FALLBACK_MEMORIES = [
  {
    id: 'stoa-1',
    title: 'Jam session d\'apertura',
    description: 'Improvvisazione jazz e risate sotto il portico per l\'inizio dell\'anno associativo.',
    media_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    tags: ['Musica', 'Social'],
    location_tag: 'Portico',
    time_event: '21:30',
    created_at: '2026-10-15T19:30:00Z',
  },
  {
    id: 'stoa-2',
    title: 'Podcast Stoà Voices #1',
    description: 'Registrazione del primo episodio dedicato ai giovani designer del territorio.',
    media_url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    media_type: 'audio',
    tags: ['Talk', 'Design'],
    location_tag: 'Sala Studio',
    time_event: '16:00',
    created_at: '2026-10-16T14:00:00Z',
  },
  {
    id: 'stoa-3',
    title: 'L\'orto condiviso al tramonto',
    description: 'I primi germogli piantati durante il laboratorio di sostenibilità urbana.',
    media_url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    tags: ['Laboratorio', 'Relax'],
    location_tag: 'Giardino',
    time_event: 'Tramonto',
    created_at: '2026-10-17T17:45:00Z',
  },
  {
    id: 'stoa-4',
    title: 'Torneo di Ping Pong',
    description: 'Finalissima combattuta punto a punto con tifo da stadio nel salone.',
    media_url: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    tags: ['Sport', 'Social'],
    location_tag: 'Salone',
    time_event: '22:15',
    created_at: '2026-10-18T20:15:00Z',
  },
  {
    id: 'stoa-5',
    title: 'Cena sociale multietnica',
    description: 'Tavolata lunga che ha unito sapori da cinque continenti preparati insieme in cucina.',
    media_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    tags: ['Social', 'Relax'],
    location_tag: 'Cucina',
    time_event: '20:00',
    created_at: '2026-10-19T18:00:00Z',
  },
  {
    id: 'stoa-6',
    title: 'Chitarra acustica sulla terrazza',
    description: 'Accordi sussurrati e vista sulle luci della città al calar della sera.',
    media_url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
    media_type: 'audio',
    tags: ['Musica', 'Relax'],
    location_tag: 'Terrazza',
    time_event: 'Notte',
    created_at: '2026-10-20T21:00:00Z',
  },
  {
    id: 'stoa-7',
    title: 'Workshop Serigrafia CAPSUL3',
    description: 'Stampa manuale delle grafiche del progetto sui tote bag in cotone riciclato.',
    media_url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    tags: ['Design', 'Laboratorio'],
    location_tag: 'Salone',
    time_event: '15:30',
    created_at: '2026-10-21T13:30:00Z',
  },
  {
    id: 'stoa-8',
    title: 'Suoni della pioggia nel patio',
    description: 'Pausa studio accompagnata dal ticchettio delle gocce sui vasi di terracotta.',
    media_url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
    media_type: 'audio',
    tags: ['Relax'],
    location_tag: 'Giardino',
    time_event: '17:00',
    created_at: '2026-10-21T15:00:00Z',
  },
  {
    id: 'stoa-9',
    title: 'Mostra fotografica analogica',
    description: 'Ritratti in bianco e nero scattati dai ragazzi durante i workshop primaverili.',
    media_url: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    tags: ['Design', 'Social'],
    location_tag: 'Portico',
    time_event: '18:45',
    created_at: '2026-10-21T16:45:00Z',
  },
];

// ── DOM References ─────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const els = {
  // Canvases & Video
  sceneCanvas: $('#scene-canvas'),
  webcamVideo: $('#webcam-video'),
  cameraCanvas: $('#camera-canvas'),

  // Header & Counters
  memoryCounter: $('#memory-counter'),

  // Wheel Menus
  wheelLeft: $('#wheel-left'),
  wheelLeftBtns: $$('#wheel-left .wheel-btn'),
  wheelRight: $('#wheel-right'),
  wheelRightBtns: $$('#wheel-right .wheel-btn'),

  // Camera HUD
  cameraBadge: $('#camera-badge'),
  hudStatusDot: $('#hud-status-dot'),
  hudStatusText: $('#hud-status-text'),
  indRight: $('#ind-right'),
  indLeft: $('#ind-left'),

  // Info Modal
  btnInfo: $('#btn-info'),
  modalInfo: $('#modal-info'),
  btnCloseInfo: $('#btn-close-info'),

  // Detail Modal
  modalDetail: $('#modal-detail'),
  btnCloseDetail: $('#btn-close-detail'),
  detailImg: $('#detail-img'),
  detailAudioWrap: $('#detail-audio-wrap'),
  detailAudioEl: $('#detail-audio-el'),
  detailLocation: $('#detail-location'),
  detailTime: $('#detail-time'),
  detailTitle: $('#detail-title'),
  detailDesc: $('#detail-desc'),
  detailTags: $('#detail-tags'),
  detailRelatedSection: $('#detail-related-section'),
  detailRelatedCount: $('#detail-related-count'),
  detailRelatedChips: $('#detail-related-chips'),
  audioWaveformCanvas: $('#audio-waveform-canvas'),

  // Realtime Toast
  liveToast: $('#live-toast'),

  // Virtual Cursor
  virtualCursor: $('#virtual-cursor'),
  cursorProgressRing: $('#cursor-progress-ring'),
};

// ── Global App State ───────────────────────────────────────────
const state = {
  memories: [],
  scene: null,
  tracking: null,
  leftWheel: null,
  rightWheel: null,
  leftWheelVisible: false,
  rightWheelVisible: false,
  activeModal: null, // 'info' | 'detail' | null
  cursorX: window.innerWidth / 2,
  cursorY: window.innerHeight / 2,
  audioAnimId: null,
};

// ── Bootstrap App ──────────────────────────────────────────────
async function init() {
  console.log('[display] Initializing Memory Mesh Kiosk...');

  // 1. Initialise Canvas 2D Scene Engine
  state.scene = initScene(els.sceneCanvas);

  // 2. Initialise Computer Vision & Gesture Pipeline
  initTrackingPipeline();

  // 3. Bind UI interactions (Wheel menus, modals, click fallbacks)
  bindUIEvents();

  // 4. Initialise 2D Semicircle Wheel Menus
  state.leftWheel = initWheelMenu({
    container: els.wheelLeft,
    itemsSelector: '.wheel-btn',
    valueAttr: 'data-layout',
    side: 'left',
    onSelect: (layout) => activateLayout(layout, false),
  });

  state.rightWheel = initWheelMenu({
    container: els.wheelRight,
    itemsSelector: '.wheel-btn',
    valueAttr: 'data-filter',
    side: 'right',
    onSelect: (filter) => activateFilter(filter, false),
  });

  // 5. Fetch initial memories from Supabase
  await loadMemories();

  // 6. Subscribe to Real-Time Supabase INSERT events
  setupRealtimeSubscription();

  console.log('[display] Ready and listening.');
}

// ── Load Memories from Supabase ────────────────────────────────
async function loadMemories() {
  try {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      state.memories = data;
    } else {
      console.log('[display] Supabase memories empty. Using Stoà curated memories.');
      state.memories = [...FALLBACK_MEMORIES];
    }
  } catch (err) {
    console.warn('[display] Could not fetch memories from Supabase, loading fallback:', err);
    state.memories = [...FALLBACK_MEMORIES];
  }

  updateCounter();
  state.scene.setMemories(state.memories);
}

// ── Supabase Real-Time Listener ────────────────────────────────
function setupRealtimeSubscription() {
  try {
    supabase
      .channel('public:memories')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'memories' },
        (payload) => {
          console.log('[display] Real-Time INSERT received:', payload.new);
          const newMemory = payload.new;

          // 1. Add new node to the scene
          state.memories.unshift(newMemory);
          state.scene.addMemory(newMemory);

          // 2. Trigger fabric wave distortion animation
          state.scene.triggerFabricWave();

          // 3. Update counter & show toast
          updateCounter();
          showLiveToast();
        }
      )
      .subscribe((status) => {
        console.log('[display] Supabase realtime subscription status:', status);
      });
  } catch (err) {
    console.warn('[display] Realtime subscription failed:', err);
  }
}

function updateCounter() {
  if (els.memoryCounter) {
    els.memoryCounter.textContent = state.memories.length;
  }
}

function showLiveToast() {
  if (!els.liveToast) return;
  els.liveToast.classList.add('is-visible');
  setTimeout(() => {
    els.liveToast.classList.remove('is-visible');
  }, 4000);
}

// ── Hand Tracking Pipeline Setup ───────────────────────────────
function initTrackingPipeline() {
  state.tracking = initTracking({
    videoEl: els.webcamVideo,
    canvasEl: els.cameraCanvas,
    callbacks: {
      onPointerMove: handlePointerMove,
      onSelect: handleSelect,
      onPan: handlePan,
      onZoom: handleZoom,
      onHandStateChange: handleHandStateChange,
    },
  });
}

// ── Decoupled Gesture Callbacks ────────────────────────────────
function handlePointerMove(x, y) {
  state.cursorX = x;
  state.cursorY = y;

  // 1. Move Virtual Cursor
  if (els.virtualCursor) {
    els.virtualCursor.classList.add('is-active');
    els.virtualCursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  // 2. Proximity check for 300% Enlarged Wheel Menus (Hidden by default, reveal on edge proximity)
  const enterThreshold = 300; // Trigger slide-in when cursor approaches within 300px of screen border
  const leaveThreshold = 580; // Keep visible while interacting within 580px, then slide out

  // Left Wheel Proximity (Layouts)
  if (!state.leftWheelVisible && x < enterThreshold) {
    state.leftWheelVisible = true;
    els.wheelLeft.classList.add('is-visible');
    els.wheelLeft.classList.add('is-expanded');
  } else if (state.leftWheelVisible && x > leaveThreshold) {
    state.leftWheelVisible = false;
    els.wheelLeft.classList.remove('is-visible');
    els.wheelLeft.classList.remove('is-expanded');
  }

  // Right Wheel Proximity (Filters)
  if (!state.rightWheelVisible && x > window.innerWidth - enterThreshold) {
    state.rightWheelVisible = true;
    els.wheelRight.classList.add('is-visible');
    els.wheelRight.classList.add('is-expanded');
  } else if (state.rightWheelVisible && x < window.innerWidth - leaveThreshold) {
    state.rightWheelVisible = false;
    els.wheelRight.classList.remove('is-visible');
    els.wheelRight.classList.remove('is-expanded');
  }

  // 3. Test element hover (UI buttons or Scene Nodes)
  let isHoveringInteractive = false;

  // Check UI buttons
  const elUnderCursor = document.elementFromPoint(x, y);
  if (
    elUnderCursor &&
    (elUnderCursor.closest('.wheel-btn') ||
      elUnderCursor.closest('.info-trigger-btn') ||
      elUnderCursor.closest('.bento-close-btn') ||
      elUnderCursor.closest('.related-chip'))
  ) {
    isHoveringInteractive = true;
  }

  // Update hover point in Scene Canvas
  if (!state.activeModal) {
    state.scene.setHoverPoint(x, y);
    if (state.scene.getHoveredNode()) {
      isHoveringInteractive = true;
    }
  } else {
    state.scene.setHoverPoint(-9999, -9999);
  }

  // Set cursor visual state
  if (els.virtualCursor) {
    els.virtualCursor.classList.toggle('is-hovering', isHoveringInteractive);
  }
}

function handleSelect() {
  const x = state.cursorX;
  const y = state.cursorY;

  console.log('[display] Gesture Select triggered at:', Math.round(x), Math.round(y));

  // Pulse cursor
  if (els.virtualCursor) {
    els.virtualCursor.classList.add('is-pinching');
    setTimeout(() => {
      els.virtualCursor.classList.remove('is-pinching');
    }, 200);
  }

  // 1. If modal is open, test modal clicks
  if (state.activeModal) {
    const el = document.elementFromPoint(x, y);
    if (el) {
      if (el.closest('.bento-close-btn') || el.classList.contains('modal-backdrop')) {
        closeModals();
        return;
      }
      const relatedChip = el.closest('.related-chip');
      if (relatedChip) {
        const memId = relatedChip.dataset.id;
        const target = state.memories.find((m) => m.id === memId);
        if (target) openDetailModal(target);
        return;
      }
    }
    return;
  }

  // 2. Check UI elements under cursor
  const el = document.elementFromPoint(x, y);
  if (el) {
    // Wheel Left (Layouts)
    const layoutBtn = el.closest('#wheel-left .wheel-btn');
    if (layoutBtn) {
      const layout = layoutBtn.dataset.layout;
      activateLayout(layout);
      return;
    }

    // Wheel Right (Filters)
    const filterBtn = el.closest('#wheel-right .wheel-btn');
    if (filterBtn) {
      const filter = filterBtn.dataset.filter;
      activateFilter(filter);
      return;
    }

    // Info Button
    const infoBtn = el.closest('#btn-info');
    if (infoBtn) {
      openInfoModal();
      return;
    }
  }

  // 3. Check Scene Nodes
  const clickedNode = state.scene.hitTest(x, y);
  if (clickedNode) {
    openDetailModal(clickedNode.memory);
  }
}

function handlePan(dx, dy) {
  if (state.activeModal) return; // Freeze scene navigation while reading a memory
  state.scene.pan(dx, dy);
}

function handleZoom(factor) {
  if (state.activeModal) return;
  state.scene.zoom(factor);
}

function handleHandStateChange(leftHand, rightHand) {
  // Update Tracking Status text & dot in camera HUD
  const isTracking = leftHand.detected || rightHand.detected;
  els.hudStatusDot.classList.toggle('is-tracking', isTracking);

  if (isTracking) {
    const parts = [];
    if (rightHand.detected) parts.push(rightHand.isPinching ? 'Destra: Pinch' : 'Destra: Puntatore');
    if (leftHand.detected) parts.push(leftHand.isPanning ? 'Sinistra: Pan' : leftHand.isZooming ? 'Sinistra: Zoom' : 'Sinistra: Pronta');
    els.hudStatusText.textContent = parts.join(' · ');
  } else {
    els.hudStatusText.textContent = 'In attesa delle mani';
  }

  // Indicator pills
  els.indRight.classList.toggle('is-active', rightHand.detected);
  els.indLeft.classList.toggle('is-active', leftHand.detected);

  // Pinch progress ring on virtual cursor
  if (els.cursorProgressRing) {
    const progress = rightHand.pinchProgress || 0;
    const perimeter = 125.6; // 2 * PI * 20
    const offset = perimeter - progress * perimeter;
    els.cursorProgressRing.style.strokeDashoffset = offset;
  }
}

// ── UI Events & Bindings ───────────────────────────────────────
function bindUIEvents() {
  // Wheel Left (Layouts)
  els.wheelLeftBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activateLayout(btn.dataset.layout);
    });
  });

  // Wheel Right (Filters)
  els.wheelRightBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activateFilter(btn.dataset.filter);
    });
  });

  // Info Button & Modal
  els.btnInfo.addEventListener('click', openInfoModal);
  els.btnCloseInfo.addEventListener('click', closeModals);
  els.modalInfo.addEventListener('click', (e) => {
    if (e.target === els.modalInfo) closeModals();
  });

  // Detail Modal Close
  els.btnCloseDetail.addEventListener('click', closeModals);
  els.modalDetail.addEventListener('click', (e) => {
    if (e.target === els.modalDetail) closeModals();
  });

  // Canvas Click (Mouse / Touch fallback)
  els.sceneCanvas.addEventListener('click', (e) => {
    if (state.activeModal) return;
    const clicked = state.scene.hitTest(e.clientX, e.clientY);
    if (clicked) {
      openDetailModal(clicked.memory);
    }
  });

  // Keyboard accessibility & kiosk helpers
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModals();
    if (e.key === '1') activateLayout('nodi');
    if (e.key === '2') activateLayout('cluster');
    if (e.key === '3') activateLayout('planimetria');
    if (e.key === '4') activateLayout('timeline');
    if (e.key === '5') activateLayout('griglia');
    if (e.key === 'i' || e.key === 'I') openInfoModal();
    if (e.key === 'w' || e.key === 'W') state.scene.triggerFabricWave();
  });

  // Mouse cursor proximity listener (reveals 300% wheel menus seamlessly on mouse approach)
  window.addEventListener('mousemove', (e) => {
    handlePointerMove(e.clientX, e.clientY);
  });
}

// ── Layout & Filter Switching ──────────────────────────────────
function activateLayout(layoutName, syncWheel = true) {
  els.wheelLeftBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.layout === layoutName));
  state.scene.setLayout(layoutName);
  if (syncWheel && state.leftWheel) {
    state.leftWheel.setActiveByValue(layoutName);
  }
  console.log('[display] Layout switched to:', layoutName);
}

function activateFilter(filterName, syncWheel = true) {
  els.wheelRightBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.filter === filterName));
  state.scene.setFilter(filterName);
  if (syncWheel && state.rightWheel) {
    state.rightWheel.setActiveByValue(filterName);
  }
  console.log('[display] Filter switched to:', filterName);
}

// ── Modal Handlers ─────────────────────────────────────────────
function openInfoModal() {
  state.activeModal = 'info';
  els.modalInfo.classList.add('is-open');
  els.modalInfo.setAttribute('aria-hidden', 'false');
}

function openDetailModal(memory) {
  state.activeModal = 'detail';

  // Fill content
  els.detailTitle.textContent = memory.title || 'Senza titolo';
  els.detailDesc.textContent = memory.description || 'Nessuna descrizione per questo ricordo.';
  els.detailLocation.textContent = memory.location_tag ? `📍 ${memory.location_tag}` : '📍 Stoà';
  els.detailTime.textContent = memory.time_event ? `⏱️ ${memory.time_event}` : '⏱️ Oggi';

  // Tags
  els.detailTags.innerHTML = '';
  const tags = memory.tags || ['Memoria'];
  tags.forEach((tag) => {
    const badge = document.createElement('span');
    badge.className = 'tag-badge';
    badge.textContent = tag;
    els.detailTags.appendChild(badge);
  });

  // Media
  if (memory.media_type === 'image' && memory.media_url) {
    els.detailImg.src = memory.media_url;
    els.detailImg.hidden = false;
    els.detailAudioWrap.hidden = true;
    stopAudioVisualizer();
  } else {
    els.detailImg.hidden = true;
    els.detailAudioWrap.hidden = false;
    els.detailAudioEl.src = memory.media_url || '';
    startAudioVisualizer();
  }

  // Related memories (sharing tags)
  renderRelatedMemories(memory);

  els.modalDetail.classList.add('is-open');
  els.modalDetail.setAttribute('aria-hidden', 'false');
}

function renderRelatedMemories(currentMem) {
  els.detailRelatedChips.innerHTML = '';
  const currentTags = currentMem.tags || [];

  const related = state.memories.filter(
    (m) => m.id !== currentMem.id && (m.tags || []).some((t) => currentTags.includes(t))
  );

  els.detailRelatedCount.textContent = related.length;

  if (related.length === 0) {
    els.detailRelatedChips.innerHTML = '<span class="text-dim" style="font-size:0.75rem;">Nessuna risonanza diretta</span>';
    return;
  }

  related.slice(0, 5).forEach((rel) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'related-chip';
    chip.dataset.id = rel.id;
    chip.textContent = `${rel.title || 'Ricordo'} (${rel.location_tag || 'Stoà'})`;
    chip.addEventListener('click', () => openDetailModal(rel));
    els.detailRelatedChips.appendChild(chip);
  });
}

function closeModals() {
  state.activeModal = null;
  els.modalInfo.classList.remove('is-open');
  els.modalInfo.setAttribute('aria-hidden', 'true');
  els.modalDetail.classList.remove('is-open');
  els.modalDetail.setAttribute('aria-hidden', 'true');

  if (els.detailAudioEl) {
    els.detailAudioEl.pause();
  }
  stopAudioVisualizer();
}

// ── Audio Waveform Visualizer ──────────────────────────────────
function startAudioVisualizer() {
  stopAudioVisualizer();
  const canvas = els.audioWaveformCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function drawWave() {
    const w = canvas.width;
    const h = canvas.height;
    const time = performance.now() * 0.004;

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2.5;

    // Draw 3 harmonic waves
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();
      ctx.strokeStyle = layer === 0 ? '#a7c957' : layer === 1 ? '#5bc0be' : '#84a98c';
      ctx.globalAlpha = 0.5 + layer * 0.2;

      for (let x = 0; x < w; x += 4) {
        const freq = 0.02 + layer * 0.01;
        const amp = 16 - layer * 3;
        const y = h / 2 + Math.sin(x * freq + time + layer * 1.5) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
    state.audioAnimId = requestAnimationFrame(drawWave);
  }

  state.audioAnimId = requestAnimationFrame(drawWave);
}

function stopAudioVisualizer() {
  if (state.audioAnimId) {
    cancelAnimationFrame(state.audioAnimId);
    state.audioAnimId = null;
  }
}

// ── Start Application ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', init);
