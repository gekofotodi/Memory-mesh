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
import { initInkBleed, setInkHoverPoint } from '../shared/inkBleed.js';
import { loadPeaks, drawWave } from './audioWave.js';
import { inkReveal, resetInkReveal } from './inkReveal.js';

// 11/11 D3: testi del ricordo che compaiono/spariscono a macchia d'inchiostro
const REDUCE_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function detailTextItems(dir) {
  const box = els.modalDetail;
  const list = [
    box.querySelector('.selection-title'),
    box.querySelector('.selection-desc'),
    ...box.querySelectorAll('.meta-col'),
    box.querySelector('.selection-related-row'),
  ].filter(Boolean);
  if (dir === 'in') return list.map((el, i) => ({ el, delay: 620 + i * 90, dur: 700 }));
  // uscita: ordine inverso, rapido, entro l'animazione di chiusura
  return list.reverse().map((el, i) => ({ el, delay: i * 25, dur: 260 }));
}

// ── Fallback Memories (Centro Giovanile Stoà) ───────────────────
// Displayed when database is empty or offline so the kiosk is vibrant
const FALLBACK_MEMORIES = [
  {
    id: 'stoa-1',
    title: 'Jam session d\'apertura',
    description: 'Improvvisazione jazz e risate sotto il portico per l\'inizio dell\'anno associativo.',
    media_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    tags: ['musica', 'amici'],
    location_tag: 'esterno',
    time_event: '21:30',
    created_at: '2024-05-15T19:30:00Z',
  },
  {
    id: 'stoa-2',
    title: 'Podcast Stoà Voices #1',
    description: 'Registrazione del primo episodio dedicato ai giovani designer del territorio.',
    media_url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    media_type: 'audio',
    tags: ['evento', 'arte'],
    location_tag: 'studio',
    time_event: '16:00',
    created_at: '2024-10-16T14:00:00Z',
  },
  {
    id: 'stoa-3',
    title: 'L\'orto condiviso al tramonto',
    description: 'I primi germogli piantati durante il laboratorio di sostenibilità urbana.',
    media_url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    tags: ['studio', 'relax'],
    location_tag: 'giardino',
    time_event: 'Tramonto',
    created_at: '2024-11-20T17:45:00Z',
  },
  {
    id: 'stoa-4',
    title: 'Torneo di Ping Pong',
    description: 'Finalissima combattuta punto a punto con tifo da stadio nel salone.',
    media_url: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    tags: ['festa', 'amici'],
    location_tag: 'sala del re',
    time_event: '22:15',
    created_at: '2025-03-18T20:15:00Z',
  },
  {
    id: 'stoa-5',
    title: 'Cena sociale multietnica',
    description: 'Tavolata lunga che ha unito sapori da cinque continenti preparati insieme in cucina.',
    media_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    tags: ['amici', 'relax'],
    location_tag: 'cucina',
    time_event: '20:00',
    created_at: '2025-07-19T18:00:00Z',
  },
  {
    id: 'stoa-6',
    title: 'Chitarra acustica sulla terrazza',
    description: 'Accordi sussurrati e vista sulle luci della città al calar della sera.',
    media_url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
    media_type: 'audio',
    tags: ['musica', 'relax'],
    location_tag: 'mansarda',
    time_event: 'Notte',
    created_at: '2025-09-20T21:00:00Z',
  },
  {
    id: 'stoa-7',
    title: 'Workshop Serigrafia CAPSUL3',
    description: 'Stampa manuale delle grafiche del progetto sui tote bag in cotone riciclato.',
    media_url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    tags: ['arte', 'studio'],
    location_tag: 'sala del re',
    time_event: '15:30',
    created_at: '2026-02-21T13:30:00Z',
  },
  {
    id: 'stoa-8',
    title: 'Suoni della pioggia nel patio',
    description: 'Pausa studio accompagnata dal ticchettio delle gocce sui vasi di terracotta.',
    media_url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
    media_type: 'audio',
    tags: ['relax'],
    location_tag: 'giardino',
    time_event: '17:00',
    created_at: '2026-04-21T15:00:00Z',
  },
  {
    id: 'stoa-9',
    title: 'Mostra fotografica analogica',
    description: 'Ritratti in bianco e nero scattati dai ragazzi durante i workshop primaverili.',
    media_url: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    tags: ['arte', 'amici'],
    location_tag: 'esterno',
    time_event: '18:45',
    created_at: '2026-06-21T16:45:00Z',
  },
  {
    id: 'stoa-10',
    title: 'Riprese del documentario Stoà',
    description: 'Sequenza video registrata durante i preparativi dell\'installazione interattiva nel salone.',
    media_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    media_type: 'video',
    tags: ['evento', 'arte'],
    location_tag: 'sala del re',
    time_event: '14:20',
    created_at: '2026-08-22T12:20:00Z',
  },
  {
    id: 'stoa-11',
    title: 'Manifesto di partecipazione',
    description: 'Questo luogo appartiene a chi lo attraversa e lascia una traccia sincera del proprio passaggio.',
    media_url: '',
    media_type: 'text',
    tags: ['amici', 'evento'],
    location_tag: 'esterno',
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
  hudHeader: $('#hud-header'),
  hudTitle: $('#hud-title'),

  // Detail Modal (Riquadro di Selezione)
  modalDetail: $('#modal-detail'),
  modalDetailBox: $('#detail-modal-box'),
  btnCloseDetail: $('#btn-close-detail'),
  mediaBoxPhoto: $('#media-box-photo'),
  mediaBoxVideo: $('#media-box-video'),
  mediaBoxAudio: $('#media-box-audio'),
  mediaBoxText: $('#media-box-text'),
  mediaBoxModel: $('#media-box-model'),
  detailModelEl: $('#detail-model-el'),
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

  // Idle overlay & stato webcam
  idleOverlay: $('#idle-overlay'),
  cameraHud: $('#camera-hud'),
  cameraHudStatus: $('#camera-hud-status'),
};

// ── Mouse disattivato (D18) ───────────────────────────────────
// Il kiosk si usa solo con le mani: cursore di sistema nascosto e mouse ignorato.
// Per la manutenzione: /display/?mouse=1 riattiva mouse, click e rotella.
const MOUSE_ENABLED = new URLSearchParams(location.search).has('mouse');
if (!MOUSE_ENABLED) {
  document.documentElement.classList.add('no-mouse');
  ['mousemove', 'mousedown', 'mouseup', 'pointerdown', 'pointermove', 'pointerup', 'click', 'dblclick', 'auxclick', 'contextmenu', 'wheel']
    .forEach((type) => window.addEventListener(type, (e) => {
      if (e.pointerType === 'touch') return;
      e.stopImmediatePropagation();
      if (e.cancelable) e.preventDefault();
    }, { capture: true, passive: false }));
}

// ── Schermata di attesa (idle) ─────────────────────────────────
// Dopo IDLE_MS senza mani/mouse compare il titolo grande con il QR per caricare;
// sparisce al primo gesto (il gesto che la chiude non seleziona nulla).
const IDLE_MS = 45000;
const idle = { lastActivity: performance.now(), visible: false };

// Durante l'attesa solo un saluto verso la webcam la chiude (più tastiera e click con ?mouse=1,
// per la manutenzione). Mani, puntatore, pan e zoom non contano finché l'attesa è visibile.
// La webcam resta accesa e visibile sopra l'attesa (D24): serve a vedere il saluto.
const IDLE_DISMISS_SOURCES = new Set(['saluto', 'tastiera', 'click']);

function markActivity(source = '') {
  if (idle.visible) {
    if (!IDLE_DISMISS_SOURCES.has(source)) return;
    console.log('[display] Schermata di attesa chiusa da:', source);
    idle.lastActivity = performance.now();
    hideIdleOverlay();
    return;
  }
  idle.lastActivity = performance.now();
}

function showIdleOverlay() {
  if (idle.visible || !els.idleOverlay) return;
  idle.visible = true;
  closeModals();
  if (state.currentLayout !== 'nodi') activateLayout('nodi');
  state.leftWheelVisible = false;
  state.rightWheelVisible = false;
  els.wheelLeft.classList.remove('is-visible');
  els.wheelRight.classList.remove('is-visible');
  closeHudPanels();
  els.idleOverlay.classList.add('is-visible');
  document.body.classList.add('is-idle');
  els.idleOverlay.setAttribute('aria-hidden', 'false');
}

function hideIdleOverlay() {
  if (!idle.visible || !els.idleOverlay) return;
  idle.visible = false;
  els.idleOverlay.classList.remove('is-visible');
  document.body.classList.remove('is-idle');
  els.idleOverlay.setAttribute('aria-hidden', 'true');
}

// ── Pannelli a comparsa: info progetto (titolo) e gesture (webcam) ──
// .is-hover segue mouse/mirino, .is-pinned resta aperto dopo click o pinch.
function hudPanelHosts() {
  return [
    { host: els.hudHeader, trigger: els.hudTitle },
    { host: els.cameraHud, trigger: els.cameraHud },
  ].filter((p) => p.host && p.trigger);
}

function syncPanelAria() {
  let anyOpen = false;
  hudPanelHosts().forEach(({ host, trigger }) => {
    const open = host.classList.contains('is-hover') || host.classList.contains('is-pinned');
    if (open) anyOpen = true;
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.body.classList.toggle('hud-panel-open', anyOpen); // D16: sfoca lo sfondo
}

// D16: aperto in hover, il pannello resta visibile 5 s dopo che il mirino se ne va
const PANEL_LINGER_MS = 5000;
const panelLeaveTimers = new Map();
function setPanelHover(host, on) {
  if (!host) return;
  if (on) {
    clearTimeout(panelLeaveTimers.get(host));
    panelLeaveTimers.delete(host);
    if (host.classList.contains('is-hover')) return;
    host.classList.add('is-hover');
    syncPanelAria();
    return;
  }
  if (!host.classList.contains('is-hover') || panelLeaveTimers.has(host)) return;
  panelLeaveTimers.set(host, setTimeout(() => {
    panelLeaveTimers.delete(host);
    host.classList.remove('is-hover');
    syncPanelAria();
  }, PANEL_LINGER_MS));
}

function togglePanelPinned(host) {
  if (!host) return;
  // D6: ogni pannello resta aperto finché non si ri-clicca il suo titolo/webcam
  host.classList.toggle('is-pinned');
  syncPanelAria();
}

function closeHudPanels() {
  panelLeaveTimers.forEach((t) => clearTimeout(t));
  panelLeaveTimers.clear();
  hudPanelHosts().forEach((p) => p.host.classList.remove('is-pinned', 'is-hover'));
  syncPanelAria();
}

// Riavvio preventivo del kiosk: dopo 45 minuti la pagina si ricarica, ma solo durante
// l'attesa (da almeno 20 s, nessuno davanti): libera memoria e GPU di MediaPipe prima che
// si blocchino e facciano ripartire la webcam mentre qualcuno la sta usando.
const PREVENTIVE_RELOAD_MS = 45 * 60 * 1000;
let idleShownAt = 0;
function idleWatch() {
  const now = performance.now();
  if (!idle.visible && now - idle.lastActivity > IDLE_MS) showIdleOverlay();
  if (!idle.visible) idleShownAt = 0;
  else if (!idleShownAt) idleShownAt = now;
  if (idle.visible && now > PREVENTIVE_RELOAD_MS && now - idleShownAt > 20000 && navigator.onLine !== false) {
    console.log('[display] Riavvio preventivo durante l\'attesa');
    try { sessionStorage.setItem('mm-start-idle', '1'); } catch (_) {}
    location.reload();
    return;
  }
  setTimeout(idleWatch, 1000);
}

function handleTrackingStatus(status) {
  if (!els.cameraHud || !els.cameraHudStatus) return;
  const offline = status !== 'camera';
  els.cameraHud.classList.toggle('is-offline', offline);
  els.cameraHudStatus.hidden = !offline;
  els.cameraHudStatus.textContent = status === 'reconnecting' ? 'Webcam: riconnessione…' : 'Webcam non disponibile';
}

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

  // 0. Ink bleed su titoli e menu (hover pilotato dal cursore virtuale)
  // D28: tutte le scritte sbavano in hover; il filtro a riposo resta solo su titoli e menu
  const INK_REST = '.header-title, .wheel-btn, .selection-title, .idle-title';
  initInkBleed({
    selector: `${INK_REST}, .header-subtitle, .idle-subtitle, .idle-cta, .idle-hint, .panel-eyebrow, .project-panel p, `
      + '.gesture-row dt, .gesture-row dd, .selection-desc, .meta-col__label, .meta-col__val, .meta-col__tags > *, '
      + '.related-row__label, .related-chip-link, .live-toast__text, .stamp-label, .text-card__body',
    restSelector: INK_REST,
    hover: 'manual',
  });

  // 1. Initialise Canvas 2D Scene Engine
  state.scene = initScene(els.sceneCanvas);
  // In locale espone la scena per il debug dalla console del browser
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__mm = { state, showIdle: () => showIdleOverlay() };
  if (state.scene.setOnTimelineYearChange) {
    state.scene.setOnTimelineYearChange((val) => {
      if (state.rightWheel && state.currentLayout === 'timeline') {
        state.rightWheel.setActiveByValue(val);
      }
    });
  }

  // 2. Initialise Computer Vision & Gesture Pipeline
  initTrackingPipeline();
  if (new URLSearchParams(location.search).has('fps')) togglePerfHud(true);

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

  // 7. Schermata di attesa dopo 45s di inattività
  // Dopo un riavvio preventivo si riparte direttamente dalla schermata di attesa
  try {
    if (sessionStorage.getItem('mm-start-idle')) {
      sessionStorage.removeItem('mm-start-idle');
      showIdleOverlay();
    }
  } catch (_) {}
  idleWatch();

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
let realtimeRetryId = null;
let realtimeChannel = null;
function setupRealtimeSubscription() {
  try {
    const ch = supabase.channel('public:memories');
    realtimeChannel = ch;
    ch
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'memories' },
        (payload) => {
          console.log('[display] Real-Time INSERT received:', payload.new);
          const newMemory = payload.new;
          if (!newMemory || state.memories.some((m) => String(m.id) === String(newMemory.id))) return;

          // Se erano visibili i ricordi demo, sostituiscili con il primo ricordo reale
          if (state.memories.length && String(state.memories[0].id).startsWith('stoa-')) {
            state.memories = [];
            state.scene.setMemories(state.memories);
          }

          // scene.addMemory condivide l'array state.memories: fa già unshift + onda
          state.scene.addMemory(newMemory);

          // 3. Update counter & show toast
          updateCounter();
          showLiveToast();
        }
      )
      .subscribe((status) => {
        console.log('[display] Supabase realtime subscription status:', status);
        if (ch !== realtimeChannel) return; // canale vecchio: ignora
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Riconnessione silenziosa + riallineamento dati
          clearTimeout(realtimeRetryId);
          realtimeRetryId = setTimeout(() => {
            realtimeChannel = null;
            supabase.removeChannel(ch);
            loadMemories().finally(setupRealtimeSubscription);
          }, 5000);
        }
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
// ── Contatore prestazioni (tasto F, oppure /display/?fps=1) ────
// Webcam = fotogrammi consegnati dalla webcam · MediaPipe = fotogrammi analizzati
// Schermo = fluidità del disegno · GPU = scheda usata da Chrome (SwiftShader = senza accelerazione)
const perfHud = { el: null, timer: null, rafCount: 0, rafId: null, gpu: null };

function detectGpu() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return 'WebGL non disponibile';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return String(name).replace(/^ANGLE \((.*)\)$/, '$1');
  } catch (_) { return 'sconosciuta'; }
}

function perfRow(label, value, level) {
  return `<div class="perf-hud__row is-${level}"><span>${label}</span><strong>${value}</strong></div>`;
}

function updatePerfHud() {
  const st = state.tracking && state.tracking.takePerfStats ? state.tracking.takePerfStats() : null;
  const screenFps = perfHud.rafCount; perfHud.rafCount = 0;
  const lvl = (v, ok, warn) => (v >= ok ? 'ok' : v >= warn ? 'warn' : 'bad');
  const software = /swiftshader|software|llvmpipe|basic render/i.test(perfHud.gpu);
  let html = '<span class="perf-hud__title">PRESTAZIONI · tasto F</span>';
  if (st && st.running) {
    html += perfRow('Webcam', `${st.camFrames} fps · ${st.camW}×${st.camH}`, lvl(st.camFrames, 24, 15));
    html += perfRow('MediaPipe', `${st.results} fps · ${st.sendMs.toFixed(0)} ms`, lvl(st.results, 20, 12));
    html += perfRow('Mani', String(st.hands), 'ok');
    html += perfRow('Riavvii', st.restarts ? `${st.restarts} · ${st.lastRestart}` : '0', st.restarts ? 'warn' : 'ok');
  } else {
    html += perfRow('Webcam', 'non attiva', 'bad');
  }
  html += perfRow('Schermo', `${screenFps} fps`, lvl(screenFps, 50, 30));
  html += perfRow('GPU', perfHud.gpu, software ? 'bad' : 'ok');
  // Verdetto: dove si perde la fluidità
  let verdict = ['Nessuno', 'ok'];
  if (!st || !st.running) verdict = ['Webcam assente', 'bad'];
  else if (software) verdict = ['Chrome senza accelerazione GPU', 'bad'];
  else if (st.results < Math.min(st.camFrames, 30) * 0.8) verdict = ['PC: analisi mani lenta', 'bad'];
  else if (st.camFrames < 24) verdict = ['Webcam lenta (luce o driver)', 'warn'];
  else if (screenFps < 40) verdict = ['PC: disegno della scena lento', 'warn'];
  html += perfRow('Collo di bottiglia', verdict[0], verdict[1]);
  perfHud.el.innerHTML = html;
}

function togglePerfHud(force) {
  const show = typeof force === 'boolean' ? force : !perfHud.el;
  if (!show) {
    clearInterval(perfHud.timer); cancelAnimationFrame(perfHud.rafId);
    if (perfHud.el) perfHud.el.remove();
    perfHud.el = null;
    return;
  }
  if (perfHud.el) return;
  if (!perfHud.gpu) perfHud.gpu = detectGpu();
  perfHud.el = document.createElement('div');
  perfHud.el.className = 'perf-hud';
  perfHud.el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(perfHud.el);
  const countRaf = () => { perfHud.rafCount++; perfHud.rafId = requestAnimationFrame(countRaf); };
  perfHud.rafId = requestAnimationFrame(countRaf);
  if (state.tracking && state.tracking.takePerfStats) state.tracking.takePerfStats(); // azzera
  perfHud.el.innerHTML = '<span class="perf-hud__title">PRESTAZIONI · misuro…</span>';
  perfHud.timer = setInterval(updatePerfHud, 1000);
}

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
      onTrackingStatus: handleTrackingStatus,
      onWave: () => markActivity('saluto'),
    },
  });
}

// ── Decoupled Gesture Callbacks ────────────────────────────────
let pointerRafId = null;

function handlePointerMove(x, y) {
  markActivity('puntatore');
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

    // Sopra la webcam (angolo in basso a sinistra) il menu non si apre: lì c'è la guida gesture
    const hudTop = els.cameraHud ? els.cameraHud.getBoundingClientRect().top - 24 : Infinity;
    const nearCameraHud = py > hudTop || (els.cameraHud && (els.cameraHud.classList.contains('is-hover') || els.cameraHud.classList.contains('is-pinned')) && px < 400);

    // Menu Sinistro (Layout)
    if (nearCameraHud) {
      if (state.leftWheelVisible) {
        state.leftWheelVisible = false;
        els.wheelLeft.classList.remove('is-visible');
      }
    } else if (!state.leftWheelVisible && px < enterThreshold) {
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
    setInkHoverPoint(px, py);
    setPanelHover(els.hudHeader, !!(elUnderCursor && elUnderCursor.closest('#hud-header')));
    setPanelHover(els.cameraHud, !!(elUnderCursor && elUnderCursor.closest('#camera-hud')));
    document.querySelectorAll('.media-box.is-active .media-hover').forEach((h) => {
      h.classList.toggle('is-hover', !!(elUnderCursor && h.contains(elUnderCursor)));
    });
    if (
      elUnderCursor &&
      (elUnderCursor.closest('.wheel-btn') ||
        elUnderCursor.closest('#hud-title') ||
        elUnderCursor.closest('#camera-hud') ||
        elUnderCursor.closest('.bento-close-btn') ||
        elUnderCursor.closest('.media-ctl') ||
        elUnderCursor.closest('#audio-waveform-canvas') ||
        elUnderCursor.closest('.related-chip'))
    ) {
      isHoveringInteractive = true;
    }

    // Update hover point in Scene Canvas
    if (!state.activeModal) {
      state.scene.setHoverPoint(px, py);
      const isNodeHovered = !!state.scene.getHoveredNode();
      const isTimelineHovered = (state.currentLayout === 'timeline' && !!state.scene.hitTestTimeline && !!state.scene.hitTestTimeline(px, py)) ||
        (state.currentLayout === 'planimetria' && !!state.scene.hitTestRoom && !!state.scene.hitTestRoom(px, py));
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
  // Il primo gesto chiude la schermata di attesa senza selezionare nulla
  if (idle.visible) { markActivity('select'); return; }
  markActivity();
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
      if (el.closest('[data-media-action="toggle"]')) { toggleActiveMedia(); return; }
      if (el.closest('#audio-waveform-canvas')) { seekAudioAt(x); return; }
      const relatedChip = el.closest('.related-chip') || el.closest('.related-chip-link');
      if (relatedChip) {
        const memId = relatedChip.dataset.id;
        const target = state.memories.find((m) => String(m.id) === String(memId));
        if (target) openDetailModal(target);
        return;
      }
    }
    return;
  }

  // 2. Check UI elements under cursor
  const el = document.elementFromPoint(x, y);

  // D1 (11/11 pom.): con info o istruzioni aperte, un pinch fuori le chiude e basta
  if (document.body.classList.contains('hud-panel-open') &&
      !(el && el.closest('#hud-header, #camera-hud'))) {
    closeHudPanels();
    return;
  }
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

    // Titolo → info progetto · Webcam → guida gesture
    if (el.closest('#hud-title')) { togglePanelPinned(els.hudHeader); return; }
    if (el.closest('#camera-hud')) { togglePanelPinned(els.cameraHud); return; }
    // Dentro un pannello aperto: non attraversare verso la scena
    if (el.closest('.project-panel') || el.closest('.gesture-panel')) return;
  }

  // 3. Check Scene Nodes
  const clickedNode = state.scene.hitTest(x, y);
  if (clickedNode) {
    openDetailModal(clickedNode.memory);
    return;
  }

  // 3b. Planimetria (D5): pinch su una stanza = entra · pinch fuori dai ricordi = torna al piano
  if (handlePlanSelect(x, y)) return;

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

function handlePlanSelect(x, y) {
  if (state.currentLayout !== 'planimetria' || !state.scene.setPlanRoom) return false;
  if (state.scene.getFocusedRoom()) {
    state.scene.setPlanRoom(null);
    return true;
  }
  const room = state.scene.hitTestRoom(x, y);
  if (room) { state.scene.setPlanRoom(room); return true; }
  return false;
}

function handlePan(dx, dy) {
  markActivity('pan');
  if (idle.visible) return;
  if (state.activeModal) return; // Freeze scene navigation while reading a memory
  state.scene.pan(dx, dy);
}

function handleZoom(factor) {
  markActivity('zoom');
  if (idle.visible) return;
  if (state.activeModal) return;
  state.scene.zoom(factor, state.cursorX, state.cursorY);
}

function handleHandStateChange(leftHand, rightHand) {
  // Update Tracking Status text & dot in camera HUD (if present)
  const isTracking = leftHand.detected || rightHand.detected;
  if (isTracking) markActivity('mano rilevata'); // tiene sveglio il display (non chiude l'attesa: serve il saluto)
  if (els.hudStatusDot) {
    els.hudStatusDot.classList.toggle('is-tracking', isTracking);
  }

  if (els.hudStatusText) {
    if (isTracking) {
      const parts = [];
      if (rightHand.detected) parts.push(rightHand.isPinching ? 'Destra: Sposta' : 'Destra: Puntatore');
      if (leftHand.detected) parts.push(leftHand.isPinching ? 'Sinistra: Seleziona' : leftHand.isZooming ? 'Sinistra: Zoom' : 'Sinistra: Pronta');
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
    const progress = leftHand.pinchProgress || 0; // pinch sinistro = selezione (D19)
    const perimeter = 113.1; // 2 * PI * 18
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

  // Schermata di attesa: click del mouse (manutenzione)
  if (els.idleOverlay) els.idleOverlay.addEventListener('click', () => markActivity('click'));

  // Titolo (info progetto) e webcam (gesture): click / Invio fissano il pannello
  [[els.hudTitle, els.hudHeader], [els.cameraHud, els.cameraHud]].forEach(([trigger, host]) => {
    if (!trigger || !host) return;
    trigger.addEventListener('click', (e) => {
      if (e.target.closest('.project-panel, .gesture-panel')) return;
      e.stopPropagation();
      togglePanelPinned(host);
    });
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePanelPinned(host); }
    });
  });

  // D1: click fuori da info/istruzioni le chiude (manutenzione con ?mouse=1)
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('hud-panel-open') && !e.target.closest('#hud-header, #camera-hud')) {
      closeHudPanels();
      e.stopPropagation();
    }
  }, true);

  // Comandi audio/video della modale (click solo con ?mouse=1)
  els.modalDetail.addEventListener('click', (e) => {
    if (e.target.closest('[data-media-action="toggle"]')) { e.stopPropagation(); toggleActiveMedia(); }
    else if (e.target.closest('#audio-waveform-canvas')) { e.stopPropagation(); seekAudioAt(e.clientX); }
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
    // Aggiorna la posizione cursore dal wheel event per zoom-towards-point preciso
    state.cursorX = e.clientX;
    state.cursorY = e.clientY;
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
    if (handlePlanSelect(e.clientX, e.clientY)) return;

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
    if (idle.visible) { markActivity('tastiera'); return; }
    markActivity();
    if (e.key === 'Escape') { closeModals(); closeHudPanels(); }
    if (e.key === '1') activateLayout('nodi');
    if (e.key === '2') activateLayout('cluster');
    if (e.key === '3') activateLayout('planimetria');
    if (e.key === '4') activateLayout('timeline');
    if (e.key === '5') activateLayout('griglia');
    if (e.key === 'i' || e.key === 'I') togglePanelPinned(els.hudHeader);
    if (e.key === 'w' || e.key === 'W') state.scene.triggerFabricWave();
    if (e.key === 'f' || e.key === 'F') togglePerfHud();
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
      // Prima voce: panoramica di tutte le isole (vista di ingresso)
      state.rightWheel.setItems([{ value: 'all', label: 'Tutti i temi' }, ...items], 'all');
      state.scene.setClusterTag(null);
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

// ── Helper Formattazione Dati Ricordo ──────────────────────────
function formatMemoryDate(createdAt, timeEvent) {
  // Priorità: data dell'evento (YYYY-MM-DD), poi data di invio
  const isoEvent = timeEvent && /^\d{4}-\d{2}-\d{2}/.test(String(timeEvent)) ? `${String(timeEvent).slice(0, 10)}T12:00:00` : null;
  const src = isoEvent || createdAt;
  if (src) {
    try {
      const d = new Date(src);
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
  if (t === 'model3d') return '3D';
  return 'MEMORIA';
}

function openDetailModal(memory) {
  // Se si riapre durante l'animazione di chiusura, la chiusura si completa subito
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
    finishCloseModals();
    void els.modalDetail.offsetWidth; // riparte l'animazione di apertura
  }
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

  if (els.mediaBoxModel) els.mediaBoxModel.classList.remove('is-active');
  if (els.detailModelEl) els.detailModelEl.removeAttribute('src');

  if ((mType === 'model3d' || /\.(glb|gltf)$/i.test(mUrl)) && mUrl && els.mediaBoxModel && els.detailModelEl) {
    // ── 0. MODELLO 3D: model-viewer, inclinato verso il puntatore (D7)
    els.detailModelEl.setAttribute('src', mUrl);
    els.detailModelEl.setAttribute('alt', memory.title ? `Modello 3D: ${memory.title}` : 'Modello 3D del ricordo');
    els.mediaBoxModel.classList.add('is-active');
  } else if (mType === 'video' || (mUrl && /\.(mp4|webm|mov|m4v)$/i.test(mUrl) && mType !== 'audio')) {
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
      els.detailVideoEl.muted = true;
      els.detailVideoEl.loop = true;
      els.detailVideoEl.play().catch(() => {});
      startAudioVisualizer();
    } else if (els.mediaBoxText) {
      els.mediaBoxText.classList.add('is-active');
    }
  } else if (mType === 'audio' || (mUrl && /\.(mp3|wav|ogg|aac|m4a)$/i.test(mUrl))) {
    // ── 2. AUDIO: mostra solo la sound wave e i comandi
    if (els.mediaBoxAudio && els.detailAudioEl && mUrl) {
      els.detailAudioEl.src = mUrl;
      els.detailAudioEl.loop = true;
      els.mediaBoxAudio.classList.add('is-active');
      els.detailAudioEl.play().catch(() => {}); // parte da solo, come il video (kiosk: --autoplay-policy)
      startAudioVisualizer(mUrl);
    } else if (els.mediaBoxText) {
      els.mediaBoxText.classList.add('is-active');
    }
  } else if (mType === 'text' && !mUrl && els.mediaBoxPhoto && els.detailImg && state.scene && state.scene.getTextCard && state.scene.getTextCard(memory)) {
    // ── D30: memoria testuale senza immagine → card in corsivo come foto 2D
    els.detailImg.src = state.scene.getTextCard(memory);
    els.detailImg.alt = memory.title ? `Memoria testuale: ${memory.title}` : 'Memoria testuale';
    els.mediaBoxPhoto.classList.add('is-active');
  } else if (mType === 'image' || mType === 'photo' || mType === 'text' || (mUrl && /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(mUrl)) || mUrl) {
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
  if (!REDUCE_MOTION) inkReveal(detailTextItems('in'), 'in');
  if (els.detailTitle) {
    els.detailTitle.focus();
  }
}

function renderRelatedMemories(currentMem) {
  if (!els.detailRelatedChips || !els.detailRelatedSection) return;
  els.detailRelatedChips.innerHTML = '';
  const currentTags = currentMem.tags || [];

  const related = state.memories.filter(
    (m) => String(m.id) !== String(currentMem.id) && (m.tags || []).some((t) => currentTags.includes(t))
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

// D3: la chiusura ripete al contrario l'animazione di apertura (testi, media, riquadro,
// croci), poi la modale si svuota. La scena torna interattiva subito.
const CLOSE_ANIM_MS = 820;
let closeTimer = null;
function closeModals() {
  state.activeModal = null;
  const open = els.modalDetail.classList.contains('is-open');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!open || reduce) { finishCloseModals(); return; }
  if (closeTimer) return;
  els.modalDetail.classList.add('is-closing');
  inkReveal(detailTextItems('out'), 'out');
  if (els.detailVideoEl) els.detailVideoEl.pause();
  if (els.detailAudioEl) els.detailAudioEl.pause();
  closeTimer = setTimeout(() => { closeTimer = null; finishCloseModals(); }, CLOSE_ANIM_MS);
}

function finishCloseModals() {
  resetInkReveal();
  els.modalDetail.classList.remove('is-open', 'is-closing');
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
  if (els.mediaBoxModel) els.mediaBoxModel.classList.remove('is-active');
  if (els.detailModelEl) els.detailModelEl.removeAttribute('src');

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

  // D7: il modello 3D non ruota da solo, si inclina verso il puntatore come le altre card
  const model = document.querySelector('.media-box--model.is-active .media-model');
  if (model) {
    const r = model.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const nx = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / (window.innerWidth * 0.45)));
    const ny = Math.max(-1, Math.min(1, (y - (r.top + r.height / 2)) / (window.innerHeight * 0.45)));
    model.setAttribute('camera-orbit', `${(-nx * 28).toFixed(1)}deg ${(75 - ny * 14).toFixed(1)}deg auto`);
    return;
  }

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
  if (els.detailModelEl) els.detailModelEl.setAttribute('camera-orbit', '0deg 75deg auto');
  const tiltCards = document.querySelectorAll('.media-tilt-card, .media-photo, .media-video');
  tiltCards.forEach((card) => {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    const photo = card.querySelector('.media-photo') || (card.classList.contains('media-photo') ? card : null);
    if (photo) {
      photo.style.boxShadow = '0 16px 36px rgba(153, 37, 28, 0.12)';
    }
  });
}

// ── Audio e video della modale (D29) ───────────────────────────
// Partono da soli; i comandi (Pausa/Riproduci + tempo) compaiono solo con il mirino sopra.
// Audio: forma d'onda reale del file, la parte ascoltata è piena; pinch sull'onda = salta lì.
function formatTime(t) {
  if (!isFinite(t) || t < 0) t = 0;
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
}

function activeMedia() {
  if (els.mediaBoxAudio && els.mediaBoxAudio.classList.contains('is-active')) return { el: els.detailAudioEl, box: els.mediaBoxAudio };
  if (els.mediaBoxVideo && els.mediaBoxVideo.classList.contains('is-active')) return { el: els.detailVideoEl, box: els.mediaBoxVideo };
  return null;
}

function toggleActiveMedia() {
  const m = activeMedia();
  if (!m || !m.el) return;
  if (m.el.paused) m.el.play().catch(() => {});
  else m.el.pause();
}

function seekAudioAt(clientX) {
  const canvas = els.audioWaveformCanvas;
  const audio = els.detailAudioEl;
  if (!canvas || !audio || !isFinite(audio.duration)) return;
  const r = canvas.getBoundingClientRect();
  audio.currentTime = Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * audio.duration;
  if (audio.paused) audio.play().catch(() => {});
}

const mediaUi = { peaks: null, url: '' };

function startAudioVisualizer(url = '') {
  stopAudioVisualizer();
  mediaUi.url = url;
  mediaUi.peaks = null;
  if (url) {
    loadPeaks(url).then((peaks) => { if (mediaUi.url === url) mediaUi.peaks = peaks; });
  }

  function tick() {
    const m = activeMedia();
    if (!m || !m.el) { state.audioAnimId = null; return; }
    const dur = m.el.duration;
    const progress = isFinite(dur) && dur > 0 ? m.el.currentTime / dur : 0;
    if (m.box === els.mediaBoxAudio && els.audioWaveformCanvas) drawWave(els.audioWaveformCanvas, mediaUi.peaks, progress);
    const btn = m.box.querySelector('.media-ctl');
    const time = m.box.querySelector('.media-ctl__time');
    const label = m.el.paused ? 'Riproduci' : 'Pausa';
    if (btn && btn.textContent !== label) btn.textContent = label;
    const t = `${formatTime(m.el.currentTime)} / ${formatTime(dur)}`;
    if (time && time.textContent !== t) time.textContent = t;
    state.audioAnimId = requestAnimationFrame(tick);
  }
  state.audioAnimId = requestAnimationFrame(tick);
}

function stopAudioVisualizer() {
  if (state.audioAnimId) {
    cancelAnimationFrame(state.audioAnimId);
    state.audioAnimId = null;
  }
  mediaUi.url = '';
  document.querySelectorAll('.media-hover.is-hover').forEach((h) => h.classList.remove('is-hover'));
}

// ── Start Application ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', init);
