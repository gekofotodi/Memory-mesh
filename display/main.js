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
    created_at: '2024-05-15T19:30:00Z',
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
    created_at: '2024-10-16T14:00:00Z',
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
    created_at: '2024-11-20T17:45:00Z',
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
    created_at: '2025-03-18T20:15:00Z',
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
    created_at: '2025-07-19T18:00:00Z',
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
    created_at: '2025-09-20T21:00:00Z',
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
    created_at: '2026-02-21T13:30:00Z',
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
    created_at: '2026-04-21T15:00:00Z',
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
    created_at: '2026-06-21T16:45:00Z',
  },
  {
    id: 'stoa-10',
    title: 'Riprese del documentario Stoà',
    description: 'Sequenza video registrata durante i preparativi dell\'installazione interattiva nel salone.',
    media_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    media_type: 'video',
    tags: ['Video', 'Design'],
    location_tag: 'Salone',
    time_event: '14:20',
    created_at: '2026-08-22T12:20:00Z',
  },
  {
    id: 'stoa-11',
    title: 'Manifesto di partecipazione',
    description: 'Questo luogo appartiene a chi lo attraversa e lascia una traccia sincera del proprio passaggio.',
    media_url: '',
    media_type: 'text',
    tags: ['Social', 'Talk'],
    location_tag: 'Portico',
    time_event: '10:00',
    created_at: '2026-10-23T08:00:00Z',
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

  // Detail Modal (Riquadro di Selezione)
  modalDetail: $('#modal-detail'),
  modalDetailBox: $('#detail-modal-box'),
  btnCloseDetail: $('#btn-close-detail'),
  mediaBoxPhoto: $('#media-box-photo'),
  mediaBoxVideo: $('#media-box-video'),
  mediaBoxAudio: $('#media-box-audio'),
  mediaBoxText: $('#media-box-text'),
  detailImg: $('#detail-img'),
  detailVideoEl: $('#detail-video-el'),
  detailAudioEl: $('#detail-audio-el'),
  audioWaveformCanvas: $('#audio-waveform-canvas'),
  detailLocationVal: $('#detail-location-val'),
  detailDateVal: $('#detail-date-val'),
  detailTypeVal: $('#detail-type-val'),
  detailTitle: $('#detail-title'),
  detailDesc: $('#detail-desc'),
  detailTagsList: $('#detail-tags-list'),
  detailRelatedSection: $('#detail-related-section'),
  detailRelatedChips: $('#detail-related-chips'),

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
  currentLayout: 'nodi',
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
  if (state.scene.setOnTimelineYearChange) {
    state.scene.setOnTimelineYearChange((val) => {
      if (state.rightWheel && state.currentLayout === 'timeline') {
        state.rightWheel.setActiveByValue(val);
      }
    });
  }

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
    valueAttr: 'data-val',
    side: 'right',
    onSelect: (val) => handleRightWheelSelect(val),
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
  activateLayout(state.currentLayout, true);
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
let pointerRafId = null;

function handlePointerMove(x, y) {
  state.cursorX = x;
  state.cursorY = y;

  // 1. Move Virtual Cursor immediatamente a 60/120fps senza lag
  if (els.virtualCursor) {
    els.virtualCursor.classList.add('is-active');
    els.virtualCursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  // Se la modale dettaglio è aperta, inclina l'immagine/card verso il mouse
  if (state.activeModal === 'detail') {
    updateMediaTilt(x, y);
  }

  // Se c'è già un frame schedulato per il check DOM, attendi il prossimo tick
  if (pointerRafId) return;

  pointerRafId = requestAnimationFrame(() => {
    pointerRafId = null;
    const px = state.cursorX;
    const py = state.cursorY;

    // 2. Proximity check per i menu laterali (mostrati solo all'avvicinamento al lato dello schermo)
    const enterThreshold = 240;
    const leaveThreshold = 380;

    // Menu Sinistro (Layout)
    if (!state.leftWheelVisible && px < enterThreshold) {
      state.leftWheelVisible = true;
      els.wheelLeft.classList.add('is-visible');
    } else if (state.leftWheelVisible && px > leaveThreshold) {
      state.leftWheelVisible = false;
      els.wheelLeft.classList.remove('is-visible');
    }

    // Menu Destro (Filtri / Opzioni contestuali: nascosto in layout 'nodi')
    if (state.currentLayout !== 'nodi') {
      if (!state.rightWheelVisible && px > window.innerWidth - enterThreshold) {
        state.rightWheelVisible = true;
        els.wheelRight.classList.add('is-visible');
      } else if (state.rightWheelVisible && px < window.innerWidth - leaveThreshold) {
        state.rightWheelVisible = false;
        els.wheelRight.classList.remove('is-visible');
      }
    } else {
      state.rightWheelVisible = false;
      els.wheelRight.classList.remove('is-visible');
    }

    // 3. Test element hover (UI buttons or Scene Nodes)
    let isHoveringInteractive = false;

    // Check UI buttons (eseguito solo 1 volta per frame RAF)
    const elUnderCursor = document.elementFromPoint(px, py);
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
      state.scene.setHoverPoint(px, py);
      const isNodeHovered = !!state.scene.getHoveredNode();
      const isTimelineHovered = (state.currentLayout === 'timeline' && !!state.scene.hitTestTimeline && !!state.scene.hitTestTimeline(px, py));
      if (isNodeHovered || isTimelineHovered) {
        isHoveringInteractive = true;
      }
      els.sceneCanvas.style.cursor = (isNodeHovered || isTimelineHovered) ? 'pointer' : 'default';
    } else {
      state.scene.setHoverPoint(-9999, -9999);
      els.sceneCanvas.style.cursor = 'default';
    }

    // Set cursor visual state
    if (els.virtualCursor) {
      els.virtualCursor.classList.toggle('is-hovering', isHoveringInteractive);
    }
  });
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
      if (
        el.closest('.bento-close-btn') ||
        el.classList.contains('modal-backdrop') ||
        (el.closest('.modal-backdrop') && !el.closest('.selection-box') && !el.closest('.drawer-panel'))
      ) {
        closeModals();
        return;
      }
      const relatedChip = el.closest('.related-chip') || el.closest('.related-chip-link');
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
      const val = layoutBtn.getAttribute('data-layout');
      if (state.leftWheel) {
        state.leftWheel.selectValue(val);
      } else {
        activateLayout(val);
      }
      return;
    }

    // Wheel Right (Contextual Menu)
    const rightBtn = el.closest('#wheel-right .wheel-btn');
    if (rightBtn) {
      const val = rightBtn.getAttribute('data-val') || rightBtn.getAttribute('data-filter') || rightBtn.getAttribute('data-layout');
      if (state.rightWheel) {
        state.rightWheel.selectValue(val);
      } else {
        handleRightWheelSelect(val);
      }
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
    return;
  }

  // 4. Check Timeline elements (Year stems, banner)
  if (state.currentLayout === 'timeline' && state.scene.hitTestTimeline) {
    const tlTarget = state.scene.hitTestTimeline(x, y);
    if (tlTarget) {
      if (tlTarget.type === 'year') {
        if (state.rightWheel) state.rightWheel.selectValue(String(tlTarget.year));
        else state.scene.setTimelineYear(tlTarget.year);
      } else if (tlTarget.type === 'close') {
        if (state.rightWheel) state.rightWheel.selectValue('all');
        else state.scene.setTimelineYear(null);
      }
    }
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
  // Update Tracking Status text & dot in camera HUD (if present)
  const isTracking = leftHand.detected || rightHand.detected;
  if (els.hudStatusDot) {
    els.hudStatusDot.classList.toggle('is-tracking', isTracking);
  }

  if (els.hudStatusText) {
    if (isTracking) {
      const parts = [];
      if (rightHand.detected) parts.push(rightHand.isPinching ? 'Destra: Pinch' : 'Destra: Puntatore');
      if (leftHand.detected) parts.push(leftHand.isPanning ? 'Sinistra: Pan' : leftHand.isZooming ? 'Sinistra: Zoom' : 'Sinistra: Pronta');
      els.hudStatusText.textContent = parts.join(' · ');
    } else {
      els.hudStatusText.textContent = 'In attesa delle mani';
    }
  }

  // Indicator pills (if present)
  if (els.indRight) els.indRight.classList.toggle('is-active', rightHand.detected);
  if (els.indLeft) els.indLeft.classList.toggle('is-active', leftHand.detected);

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
  // Wheel Left (Layouts click delegato)
  if (els.wheelLeft) {
    els.wheelLeft.addEventListener('click', (e) => {
      const btn = e.target.closest('.wheel-btn');
      if (btn && btn.dataset.layout) {
        activateLayout(btn.dataset.layout);
      }
    });
  }

  // Wheel Right (Menu contestuale click delegato)
  if (els.wheelRight) {
    els.wheelRight.addEventListener('click', (e) => {
      const btn = e.target.closest('.wheel-btn');
      if (btn) {
        const val = btn.getAttribute('data-val') || btn.getAttribute('data-filter') || btn.getAttribute('data-layout');
        if (val) {
          if (state.rightWheel) {
            state.rightWheel.selectValue(val);
          } else {
            handleRightWheelSelect(val);
          }
        }
      }
    });
  }

  // Info Button & Modal
  els.btnInfo.addEventListener('click', openInfoModal);
  els.btnCloseInfo.addEventListener('click', closeModals);
  els.modalInfo.addEventListener('click', (e) => {
    if (e.target === els.modalInfo) closeModals();
  });

  // Detail Modal Close (Chiusura via click esterno o Esc)
  if (els.btnCloseDetail) {
    els.btnCloseDetail.addEventListener('click', closeModals);
  }
  els.modalDetail.addEventListener('click', (e) => {
    if (e.target === els.modalDetail) closeModals();
  });

  // Canvas Mouse Drag, Wheel Zoom & Click Handling
  let isDraggingCanvas = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let hasDraggedCanvas = false;

  els.sceneCanvas.addEventListener('pointerdown', (e) => {
    if (state.activeModal || e.button !== 0) return;
    isDraggingCanvas = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    hasDraggedCanvas = false;
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDraggingCanvas) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.hypot(dx, dy) > 4) {
      hasDraggedCanvas = true;
      handlePan(dx, dy);
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    }
  });

  window.addEventListener('pointerup', () => {
    isDraggingCanvas = false;
  });

  // Mouse wheel zoom & pan
  els.sceneCanvas.addEventListener('wheel', (e) => {
    if (state.activeModal) return;
    e.preventDefault();
    if (e.shiftKey) {
      handlePan(-e.deltaY, 0);
    } else if (Math.abs(e.deltaX) > 0 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      handlePan(-e.deltaX, 0);
    } else {
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      handleZoom(factor);
    }
  }, { passive: false });

  // Canvas Click (Mouse / Touch fallback)
  els.sceneCanvas.addEventListener('click', (e) => {
    if (state.activeModal) return;
    if (hasDraggedCanvas) return;

    // 1. Clic su un ricordo
    const clicked = state.scene.hitTest(e.clientX, e.clientY);
    if (clicked) {
      openDetailModal(clicked.memory);
      return;
    }

    // 2. Clic su elementi Timeline (Anno o Chiusura vista mensile)
    if (state.currentLayout === 'timeline' && state.scene.hitTestTimeline) {
      const tlTarget = state.scene.hitTestTimeline(e.clientX, e.clientY);
      if (tlTarget) {
        if (tlTarget.type === 'year') {
          if (state.rightWheel) state.rightWheel.selectValue(String(tlTarget.year));
          else state.scene.setTimelineYear(tlTarget.year);
        } else if (tlTarget.type === 'close') {
          if (state.rightWheel) state.rightWheel.selectValue('all');
          else state.scene.setTimelineYear(null);
        }
      }
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

  // Mouse cursor proximity listener (reveals side menus seamlessly on edge approach)
  window.addEventListener('mousemove', (e) => {
    handlePointerMove(e.clientX, e.clientY);
  });

  window.addEventListener('pointerdown', (e) => {
    handlePointerMove(e.clientX, e.clientY);
  });

  document.addEventListener('mouseleave', () => {
    state.leftWheelVisible = false;
    state.rightWheelVisible = false;
    els.wheelLeft.classList.remove('is-visible');
    els.wheelRight.classList.remove('is-visible');
    resetMediaTilt();
  });
}

// ── Layout Switching & Contextual Menus ────────────────────────
function activateLayout(layoutName, syncWheel = true) {
  state.currentLayout = layoutName;

  document.querySelectorAll('#wheel-left .wheel-btn').forEach((b) => {
    b.classList.toggle('is-active', b.getAttribute('data-layout') === layoutName);
  });

  state.scene.setLayout(layoutName);

  if (syncWheel && state.leftWheel) {
    state.leftWheel.setActiveByValue(layoutName);
  }

  // Configura dinamicamente il menu destro contestuale
  if (state.rightWheel) {
    if (layoutName === 'nodi') {
      // In nodi non c'è un menu
      state.rightWheel.setItems([]);
      state.rightWheelVisible = false;
      els.wheelRight.classList.remove('is-visible');
    } else if (layoutName === 'planimetria') {
      // Piani: Terra, Primo, Secondo
      state.rightWheel.setItems([
        { value: 'terra', label: 'Piano Terra' },
        { value: 'primo', label: 'Primo Piano' },
        { value: 'secondo', label: 'Secondo Piano' },
      ], 'terra');
      state.scene.setFloor('terra');
    } else if (layoutName === 'cluster') {
      // Mostra i tag (Title Case per Instrument Serif)
      const tags = state.scene.getDistinctTags();
      const items = tags.map((t) => ({
        value: t,
        label: t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(),
      }));
      const defaultTag = items.length > 0 ? items[0].value : null;
      state.rightWheel.setItems(items, defaultTag);
      if (defaultTag) state.scene.setClusterTag(defaultTag);
    } else if (layoutName === 'timeline') {
      // Mostra panoramica completa per anni
      const years = state.scene.getDistinctYears();
      const items = [
        { value: 'all', label: 'Tutti gli anni' },
        ...years.map((y) => ({ value: String(y), label: String(y) })),
      ];
      state.rightWheel.setItems(items, 'all');
      state.scene.setTimelineYear(null);
    } else if (layoutName === 'griglia') {
      // Riordinamento: Data, Media, Tag, Luogo (senza filtrare ricordi)
      state.rightWheel.setItems([
        { value: 'data', label: 'Data' },
        { value: 'media', label: 'Media' },
        { value: 'tag', label: 'Tag' },
        { value: 'luogo', label: 'Luogo' },
      ], 'data');
      state.scene.setGridSort('data');
    }
  }

  console.log('[display] Layout switched to:', layoutName);
}

function handleRightWheelSelect(val) {
  if (state.currentLayout === 'planimetria') {
    state.scene.setFloor(val);
  } else if (state.currentLayout === 'cluster') {
    state.scene.setClusterTag(val);
  } else if (state.currentLayout === 'timeline') {
    state.scene.setTimelineYear(val && val !== 'all' ? parseInt(val, 10) : null);
  } else if (state.currentLayout === 'griglia') {
    state.scene.setGridSort(val);
  }
}

// ── Modal Handlers (Accessibili con Focus Management) ───────────
function openInfoModal() {
  state.lastActiveElement = document.activeElement;
  state.activeModal = 'info';
  els.modalInfo.classList.add('is-open');
  els.modalInfo.setAttribute('aria-hidden', 'false');
  const infoTitle = $('#info-drawer-title');
  if (infoTitle) infoTitle.focus();
}

// ── Helper Formattazione Dati Ricordo ──────────────────────────
function formatMemoryDate(createdAt, timeEvent) {
  if (createdAt) {
    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        const months = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
        const day = String(d.getDate()).padStart(2, '0');
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
      }
    } catch (_) {}
  }
  if (timeEvent) return String(timeEvent).toUpperCase();
  return 'OGGI';
}

function formatMemoryType(mediaType) {
  const t = (mediaType || '').toLowerCase();
  if (t === 'image' || t === 'photo' || t === 'foto') return 'FOTO';
  if (t === 'video') return 'VIDEO';
  if (t === 'audio') return 'AUDIO';
  if (t === 'text') return 'TESTO';
  return 'MEMORIA';
}

function openDetailModal(memory) {
  state.lastActiveElement = document.activeElement;
  state.activeModal = 'detail';

  // 1. Titolo Serif e Descrizione Sans Bold Giustificato Caps Lock
  els.detailTitle.textContent = memory.title || 'Senza titolo';
  els.detailDesc.textContent = (memory.description || 'Nessuna descrizione per questo ricordo.').toUpperCase();

  // 2. Metadati Secondari in Fondo (4 Colonne: TAG, LOCATION, DATE, TYPE)
  if (els.detailLocationVal) {
    els.detailLocationVal.textContent = (memory.location_tag || 'Stoà').toUpperCase();
  }
  if (els.detailDateVal) {
    els.detailDateVal.textContent = formatMemoryDate(memory.created_at, memory.time_event);
  }
  if (els.detailTypeVal) {
    els.detailTypeVal.textContent = formatMemoryType(memory.media_type);
  }

  // 3. Colonna TAG Verticale
  if (els.detailTagsList) {
    els.detailTagsList.innerHTML = '';
    const tags = Array.isArray(memory.tags) && memory.tags.length > 0 ? memory.tags : ['Memoria'];
    tags.forEach((tag) => {
      const item = document.createElement('span');
      item.className = 'meta-tag-item';
      item.textContent = String(tag).toUpperCase();
      els.detailTagsList.appendChild(item);
    });
  }

  // 4. Metà Sinistra Media: Contenitori DEDICATI e MUTUAMENTE ESCLUSIVI
  // Disattiva preventivamente tutti i contenitori
  if (els.mediaBoxPhoto) els.mediaBoxPhoto.classList.remove('is-active');
  if (els.mediaBoxVideo) els.mediaBoxVideo.classList.remove('is-active');
  if (els.mediaBoxAudio) els.mediaBoxAudio.classList.remove('is-active');
  if (els.mediaBoxText) els.mediaBoxText.classList.remove('is-active');

  // Ferma eventuale riproduzione audio/video precedente
  if (els.detailAudioEl) {
    els.detailAudioEl.pause();
    els.detailAudioEl.removeAttribute('src');
    els.detailAudioEl.load();
  }
  if (els.detailVideoEl) {
    els.detailVideoEl.pause();
    els.detailVideoEl.removeAttribute('src');
    els.detailVideoEl.load();
  }
  stopAudioVisualizer();

  const mType = (memory.media_type || '').toLowerCase().trim();
  const mUrl = memory.media_url || '';

  if (mType === 'video' || (mUrl && /\.(mp4|webm|mov|m4v)$/i.test(mUrl) && mType !== 'audio')) {
    // ── 1. VIDEO: mostra solo il video con i comandi e primo frame come copertina
    if (els.mediaBoxVideo && els.detailVideoEl && mUrl) {
      els.detailVideoEl.src = mUrl;
      if (state.scene && state.scene.getVideoPoster) {
        const poster = state.scene.getVideoPoster(mUrl);
        if (poster) {
          els.detailVideoEl.poster = poster;
        } else {
          els.detailVideoEl.removeAttribute('poster');
        }
      }
      els.mediaBoxVideo.classList.add('is-active');
    } else if (els.mediaBoxText) {
      els.mediaBoxText.classList.add('is-active');
    }
  } else if (mType === 'audio' || (mUrl && /\.(mp3|wav|ogg|aac|m4a)$/i.test(mUrl))) {
    // ── 2. AUDIO: mostra solo la sound wave e i comandi
    if (els.mediaBoxAudio && els.detailAudioEl && mUrl) {
      els.detailAudioEl.src = mUrl;
      els.mediaBoxAudio.classList.add('is-active');
      startAudioVisualizer();
    } else if (els.mediaBoxText) {
      els.mediaBoxText.classList.add('is-active');
    }
  } else if (mType === 'image' || mType === 'photo' || (mUrl && /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(mUrl)) || (mUrl && mType !== 'text')) {
    // ── 3. FOTO: mostra solo la foto senza nessun altro elemento
    if (els.mediaBoxPhoto && els.detailImg && mUrl) {
      els.detailImg.src = mUrl;
      els.detailImg.alt = memory.title ? `Fotografia: ${memory.title}` : 'Fotografia del ricordo';
      els.mediaBoxPhoto.classList.add('is-active');
    } else if (els.mediaBoxText) {
      els.mediaBoxText.classList.add('is-active');
    }
  } else {
    // ── 4. TESTO: memoria solo testuale
    if (els.mediaBoxText) {
      els.mediaBoxText.classList.add('is-active');
    }
  }

  // 5. Collegamenti risonanti (riga discreta sotto i metadati)
  renderRelatedMemories(memory);

  // 6. Riavvio dell'animazione da angolo a angolo del riquadro di selezione
  resetMediaTilt();
  if (els.modalDetailBox) {
    const layout = els.modalDetailBox.querySelector('.selection-layout');
    const crosses = els.modalDetailBox.querySelectorAll('.selection-cross');
    if (layout) {
      layout.style.animation = 'none';
      void layout.offsetHeight; // trigger reflow
      layout.style.animation = '';
    }
    crosses.forEach((cross) => {
      cross.style.animation = 'none';
      void cross.offsetHeight;
      cross.style.animation = '';
    });
  }

  els.modalDetail.classList.add('is-open');
  els.modalDetail.setAttribute('aria-hidden', 'false');
  if (els.detailTitle) {
    els.detailTitle.focus();
  }
}

function renderRelatedMemories(currentMem) {
  if (!els.detailRelatedChips || !els.detailRelatedSection) return;
  els.detailRelatedChips.innerHTML = '';
  const currentTags = currentMem.tags || [];

  const related = state.memories.filter(
    (m) => m.id !== currentMem.id && (m.tags || []).some((t) => currentTags.includes(t))
  );

  if (related.length === 0) {
    els.detailRelatedSection.hidden = true;
    return;
  }

  els.detailRelatedSection.hidden = false;
  related.slice(0, 4).forEach((rel) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'related-chip-link';
    btn.dataset.id = rel.id;
    btn.textContent = `${rel.title || 'Ricordo'} [${(rel.location_tag || 'Stoà').toUpperCase()}]`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetailModal(rel);
    });
    els.detailRelatedChips.appendChild(btn);
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
    els.detailAudioEl.removeAttribute('src');
    els.detailAudioEl.load();
  }
  if (els.detailVideoEl) {
    els.detailVideoEl.pause();
    els.detailVideoEl.removeAttribute('src');
    els.detailVideoEl.load();
  }
  stopAudioVisualizer();

  // Reset contenitori media e tilt 3D
  resetMediaTilt();
  if (els.mediaBoxPhoto) els.mediaBoxPhoto.classList.remove('is-active');
  if (els.mediaBoxVideo) els.mediaBoxVideo.classList.remove('is-active');
  if (els.mediaBoxAudio) els.mediaBoxAudio.classList.remove('is-active');
  if (els.mediaBoxText) els.mediaBoxText.classList.remove('is-active');

  // Ripristina focus all'elemento che ha attivato la modale
  if (state.lastActiveElement && typeof state.lastActiveElement.focus === 'function') {
    state.lastActiveElement.focus();
    state.lastActiveElement = null;
  }
}

// ── Inclinazione 3D della Card Media Verso il Mouse / Puntatore ──
function updateMediaTilt(x, y) {
  if (state.activeModal !== 'detail') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const tiltCard = document.querySelector('.media-box.is-active .media-tilt-card') ||
                   document.querySelector('.media-box.is-active .media-photo') ||
                   document.querySelector('.media-box.is-active .media-video');
  if (!tiltCard) return;

  const rect = tiltCard.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  // Calcola offset normalizzato rispetto al centro (-1 a 1)
  const maxDistX = window.innerWidth * 0.45;
  const maxDistY = window.innerHeight * 0.45;
  const normX = Math.max(-1, Math.min(1, (x - centerX) / maxDistX));
  const normY = Math.max(-1, Math.min(1, (y - centerY) / maxDistY));

  // Inclinazione verso il mouse: rotX negativo se il mouse è in alto, rotY positivo se il mouse è a destra
  const maxAngle = 14;
  const rotX = -normY * maxAngle;
  const rotY = normX * maxAngle;

  tiltCard.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

  // Sposta l'ombra della foto in modo fisico coerente con la luce del puntatore
  const photo = tiltCard.querySelector('.media-photo') || (tiltCard.classList.contains('media-photo') ? tiltCard : null);
  if (photo) {
    const shadowX = (-normX * 18).toFixed(1);
    const shadowY = (16 - normY * 10).toFixed(1);
    photo.style.boxShadow = `${shadowX}px ${shadowY}px 36px rgba(153, 37, 28, 0.16)`;
  }
}

function resetMediaTilt() {
  const tiltCards = document.querySelectorAll('.media-tilt-card, .media-photo, .media-video');
  tiltCards.forEach((card) => {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    const photo = card.querySelector('.media-photo') || (card.classList.contains('media-photo') ? card : null);
    if (photo) {
      photo.style.boxShadow = '0 16px 36px rgba(153, 37, 28, 0.12)';
    }
  });
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

    // Draw 3 harmonic waves in bordeaux tones
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();
      ctx.strokeStyle = layer === 0 ? '#99251C' : layer === 1 ? 'rgba(153, 37, 28, 0.75)' : 'rgba(153, 37, 28, 0.45)';
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
