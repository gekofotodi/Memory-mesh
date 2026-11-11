/**
 * Tracking Module — MediaPipe Hands Pipeline & Gesture Recognition
 *
 * Implements decoupled hand tracking:
 *  - Right Hand: pointer (index finger) + pinch-drag pan with release inertia
 *    (pointer frozen while dragging).
 *  - Left Hand: pinch = select under the pointer, zoom (wrist tilt > 20°).
 *  - Camera Canvas: Real-time skeleton visualization overlay with distinct color coding.
 *  - Mouse / Touch fallback for kiosk maintenance & test environments.
 *
 * Emits decoupled callbacks:
 *  - onPointerMove(x, y)
 *  - onSelect()
 *  - onPan(dx, dy)
 *  - onZoom(factor)
 *  - onHandStateChange(leftHandState, rightHandState)
 */

// ── Landmark Constants (MediaPipe Hand 21 landmarks) ──────────
const WRIST = 0;
const THUMB_CMC = 1, THUMB_MCP = 2, THUMB_IP = 3, THUMB_TIP = 4;
const INDEX_MCP = 5, INDEX_PIP = 6, INDEX_DIP = 7, INDEX_TIP = 8;
const MIDDLE_MCP = 9, MIDDLE_PIP = 10, MIDDLE_DIP = 11, MIDDLE_TIP = 12;
const RING_MCP = 13, RING_PIP = 14, RING_DIP = 15, RING_TIP = 16;
const PINKY_MCP = 17, PINKY_PIP = 18, PINKY_DIP = 19, PINKY_TIP = 20;

// Skeletal bone connections for visualization
const HAND_CONNECTIONS = [
  // Palm base
  [WRIST, THUMB_CMC], [THUMB_CMC, THUMB_MCP], [THUMB_MCP, THUMB_IP], [THUMB_IP, THUMB_TIP],
  [WRIST, INDEX_MCP], [INDEX_MCP, INDEX_PIP], [INDEX_PIP, INDEX_DIP], [INDEX_DIP, INDEX_TIP],
  [INDEX_MCP, MIDDLE_MCP], [MIDDLE_MCP, MIDDLE_PIP], [MIDDLE_PIP, MIDDLE_DIP], [MIDDLE_DIP, MIDDLE_TIP],
  [MIDDLE_MCP, RING_MCP], [RING_MCP, RING_PIP], [RING_PIP, RING_DIP], [RING_DIP, RING_TIP],
  [RING_MCP, PINKY_MCP], [PINKY_MCP, PINKY_PIP], [PINKY_PIP, PINKY_DIP], [PINKY_DIP, PINKY_TIP],
  [WRIST, PINKY_MCP]
];

// ── Tuning Hyperparameters ────────────────────────────────────
// Puntatore: filtro One Euro (liscio da fermo, reattivo in movimento) sui frame
// di MediaPipe + inseguimento a frame rate del display, così il mirino non scatta
// tra un rilevamento e l'altro e non resta indietro.
const EURO_MIN_CUTOFF = 1.2;          // Hz: più basso = più stabile da fermo
const EURO_BETA = 0.006;              // quanto il filtro si apre con la velocità (px/s)
const EURO_D_CUTOFF = 1.0;
const POINTER_FOLLOW_MS = 38;         // costante di tempo dell'inseguimento a 60fps
// Zona della webcam (coordinate specchiate 0..1) che copre tutto lo schermo:
// la mano destra resta nella metà destra dell'inquadratura e il mirino arriva ovunque
const POINTER_X_RANGE = [0.48, 0.92];
const POINTER_Y_RANGE = [0.12, 0.76];
// Saluto (chiude la schermata di attesa): mano aperta che oscilla destra-sinistra
const WAVE_MIN_SWINGS = 2;            // inversioni di direzione (destra-sinistra-destra)
const WAVE_MIN_AMPLITUDE = 0.035;     // ampiezza minima di ogni oscillazione (frazione della larghezza webcam)
const WAVE_WINDOW_MS = 1600;
// Immagine webcam: luminosità e contrasto (anteprima + regolazione hardware se la webcam lo permette)
const PREVIEW_FILTER = 'brightness(1.45) contrast(1.2)';
const CAMERA_BRIGHTNESS = 0.62;       // posizione nell'intervallo della webcam (0.5 = predefinito tipico)
const CAMERA_CONTRAST = 0.6;
const PINCH_ENTER_DIST = 0.28;        // Normalized threshold to start pinch
const PINCH_EXIT_DIST = 0.38;         // Hysteresis threshold to release pinch
const PINCH_HOLD_MS_TO_SELECT = 120;  // Milliseconds of held pinch before selection triggers
const LEFT_PINCH_ENTER = 0.34;        // D15: pinch sinistro (distanza 2D / dimensione mano)
const LEFT_PINCH_EXIT = 0.46;
const LEFT_LOST_GRACE_MS = 180;       // D15: mano persa per pochi frame = pinch non rilasciato
const TILT_ZOOM_THRESHOLD_DEG = 20;   // Wrist tilt in degrees to activate zoom
const INERTIA_DECAY = 0.92;           // Inertia damping coefficient

/**
 * Initialise Hand Tracking Pipeline
 * @param {Object} options
 * @param {HTMLVideoElement} options.videoEl
 * @param {HTMLCanvasElement} options.canvasEl
 * @param {Object} options.callbacks
 * @returns {Object} Tracking controller
 */
export function initTracking({ videoEl, canvasEl, callbacks = {} }) {
  const cb = {
    onPointerMove: callbacks.onPointerMove || (() => {}),
    onSelect: callbacks.onSelect || (() => {}),
    onPan: callbacks.onPan || (() => {}),
    onZoom: callbacks.onZoom || (() => {}),
    onHandStateChange: callbacks.onHandStateChange || (() => {}),
    onWave: callbacks.onWave || (() => {}),
  };

  const canvasCtx = canvasEl ? canvasEl.getContext('2d') : null;

  // ── State ───────────────────────────────────────────────────
  const state = {
    active: false,
    webcamRunning: false,
    useMouseFallback: false,

    // Right Hand (Pointer & Selection)
    right: {
      detected: false,
      rawX: window.innerWidth / 2,
      rawY: window.innerHeight / 2,
      smoothX: window.innerWidth / 2,
      smoothY: window.innerHeight / 2,
      frozenX: null,
      frozenY: null,
      isPinching: false,
      pinchStartTime: 0,
      prevX: 0,
      prevY: 0,
      velocityX: 0,
      velocityY: 0,
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2,
      lastSeen: 0,
    },

    // Left Hand (Select & Zoom)
    left: {
      detected: false,
      isPinching: false,
      pinchStartTime: 0,
      hasTriggeredSelect: false,
      pinchProgress: 0, // 0 to 1
      wristAngleDeg: 0,
      isZooming: false,
      zoomDir: 0, // -1, 0, 1
    },

    // Inertia simulation loop ID
    inertiaAnimId: null,
  };

  // ── Helpers ─────────────────────────────────────────────────
  function distance2D(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function distance3D(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // ── Filtro One Euro (Casiez et al.) ─────────────────────────
  function makeOneEuro() {
    let xPrev = null, dxPrev = 0, tPrev = 0;
    const alpha = (cutoff, dt) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
    return {
      reset() { xPrev = null; },
      filter(x, tMs) {
        if (xPrev === null) { xPrev = x; tPrev = tMs; dxPrev = 0; return x; }
        const dt = Math.max(1e-3, (tMs - tPrev) / 1000);
        tPrev = tMs;
        const dx = (x - xPrev) / dt;
        dxPrev = dxPrev + alpha(EURO_D_CUTOFF, dt) * (dx - dxPrev);
        const cutoff = EURO_MIN_CUTOFF + EURO_BETA * Math.abs(dxPrev);
        xPrev = xPrev + alpha(cutoff, dt) * (x - xPrev);
        return xPrev;
      },
    };
  }
  const euroX = makeOneEuro();
  const euroY = makeOneEuro();

  // Mappa una zona della webcam su tutto lo schermo (guadagno > 1: il mirino è più veloce della mano)
  function mapRange(v, [lo, hi]) {
    return Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  }

  // ── Riconoscimento del saluto ───────────────────────────────
  // Mano aperta (4 dita distese) che oscilla orizzontalmente: si contano le inversioni
  // di direzione con un'ampiezza minima, entro una finestra di tempo.
  const wave = { dir: 0, extremeX: null, swings: [], lastFire: 0 };
  function isOpenHand(lm) {
    const tips = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];
    const pips = [INDEX_PIP, MIDDLE_PIP, RING_PIP, PINKY_PIP];
    let extended = 0;
    for (let k = 0; k < 4; k++) {
      if (distance2D(lm[tips[k]], lm[WRIST]) > distance2D(lm[pips[k]], lm[WRIST]) * 1.1) extended++;
    }
    return extended >= 4;
  }
  function trackWave(lm, now) {
    if (!isOpenHand(lm)) { wave.dir = 0; wave.extremeX = null; return; }
    const x = lm[MIDDLE_MCP].x;
    if (wave.extremeX === null) { wave.extremeX = x; return; }
    const delta = x - wave.extremeX;
    const dir = Math.sign(delta);
    if (wave.dir === 0) {
      if (Math.abs(delta) > WAVE_MIN_AMPLITUDE) { wave.dir = dir; wave.extremeX = x; }
      return;
    }
    if (dir === wave.dir) {
      wave.extremeX = x; // continua nella stessa direzione: aggiorna l'estremo
    } else if (Math.abs(delta) > WAVE_MIN_AMPLITUDE) {
      wave.swings.push(now); // inversione abbastanza ampia
      wave.dir = dir;
      wave.extremeX = x;
    }
    wave.swings = wave.swings.filter((t) => now - t < WAVE_WINDOW_MS);
    if (wave.swings.length >= WAVE_MIN_SWINGS && now - wave.lastFire > 2000) {
      wave.lastFire = now;
      wave.swings = [];
      cb.onWave();
    }
  }

  // Inseguimento del bersaglio filtrato a frame rate del display
  let pointerLoopAt = 0;
  function pointerLoop(now) {
    requestAnimationFrame(pointerLoop);
    const r = state.right;
    const dt = pointerLoopAt ? Math.min(100, now - pointerLoopAt) : 16;
    pointerLoopAt = now;
    if (r.isPinching || now - r.lastSeen > 400) return; // mano assente o pinch (coordinate congelate)
    const dx = r.targetX - r.smoothX;
    const dy = r.targetY - r.smoothY;
    if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) return;
    const k = 1 - Math.exp(-dt / POINTER_FOLLOW_MS);
    r.smoothX += dx * k;
    r.smoothY += dy * k;
    cb.onPointerMove(r.smoothX, r.smoothY);
  }
  requestAnimationFrame(pointerLoop);

  // ── Diagnostica prestazioni (contatore FPS, tasto F) ────────
  const perf = { camFrames: 0, results: 0, sendMsTotal: 0, sends: 0, hands: 0, restarts: 0, lastRestart: '' };
  // Numero progressivo dei fotogrammi webcam: si analizza solo un fotogramma nuovo,
  // non lo stesso a ogni aggiornamento dello schermo (prima: 120 analisi/s con webcam a 30 fps)
  let frameSeq = 0;
  let lastSentSeq = -1;
  let lastTickAt = 0;
  let lastSendAt = 0;
  const hasVideoFrameCb = !!(videoEl && typeof videoEl.requestVideoFrameCallback === 'function');
  function isNewFrame() {
    const now = performance.now();
    if (hasVideoFrameCb && now - lastTickAt < 1000) {
      if (frameSeq === lastSentSeq) return false;
      lastSentSeq = frameSeq;
    } else if (now - lastSendAt < 33) {
      // conteggio fotogrammi non disponibile o fermo: massimo ~30 analisi/s
      return false;
    }
    lastSendAt = now;
    return true;
  }
  // Gli errori di un'istanza Hands già sostituita (chiusa durante un riavvio) vanno ignorati,
  // altrimenti ogni riavvio ne provoca un altro
  // Webcam: errori più frequenti trovati nel codice
  // - fotogramma inviato a MediaPipe mentre il video non ha ancora dati (durante un riavvio
  //   o dopo un singhiozzo USB): MediaPipe va in errore e la pagina si ricaricava;
  // - errori di un invio partito PRIMA di un riavvio della webcam, che facevano ricaricare;
  // - invio bloccato (MediaPipe non risponde più): ora riconosciuto in 6 s.
  let camGen = 0;            // generazione della webcam (cresce a ogni riavvio)
  let sendPendingSince = 0;  // inizio dell'invio in corso (0 = nessuno)
  let sendErrors = [];       // errori MediaPipe recenti
  function videoReady() {
    return !!videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0;
  }
  function timedSend() {
    if (!videoReady()) return Promise.resolve(); // niente dati: salta il fotogramma
    const t0 = performance.now();
    const h = hands;
    const gen = camGen;
    sendPendingSince = t0;
    return h.send({ image: videoEl }).then(() => {
      sendPendingSince = 0;
      perf.sendMsTotal += performance.now() - t0;
      perf.sends++;
    }, (err) => {
      sendPendingSince = 0;
      if (h !== hands || gen !== camGen || restartTimer) return; // invio di una webcam già riavviata
      logIncident('errore MediaPipe', err);
      // Un errore isolato (fotogramma corrotto) non giustifica una ricarica: solo se si ripete
      const now = performance.now();
      sendErrors = sendErrors.filter((t) => now - t < 10000);
      sendErrors.push(now);
      if (sendErrors.length < 3) return;
      throw err;
    });
  }

  // Registro persistente degli incidenti (localStorage 'mm-incidents', ultimi 40):
  // sul kiosk si legge dalla console con  JSON.parse(localStorage['mm-incidents'])
  function logIncident(reason, err) {
    console.warn(`[tracking] ${reason}`, err || '');
    try {
      const log = JSON.parse(localStorage.getItem('mm-incidents') || '[]');
      log.push({
        t: new Date().toISOString(),
        reason,
        err: err ? String((err && err.message) || err).slice(0, 200) : '',
        uptimeMin: Math.round(performance.now() / 60000),
        heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
      });
      localStorage.setItem('mm-incidents', JSON.stringify(log.slice(-40)));
    } catch (_) {}
  }

  // Ultima risorsa per il kiosk: ricarica la pagina (tutto riparte pulito).
  // Al massimo 5 ricariche in 10 minuti, poi resta il fallback mouse per non andare in loop.
  let reloading = false;
  function reloadPage(reason) {
    if (reloading) return;
    let log = [];
    try { log = JSON.parse(sessionStorage.getItem('mm-reloads') || '[]'); } catch (_) {}
    const now = Date.now();
    log = log.filter((t) => now - t < 10 * 60 * 1000);
    if (log.length >= 5) {
      // Troppe ricariche: pausa di 10 minuti, poi si riprova (prima restava senza webcam per sempre)
      logIncident(`${reason}: troppe ricariche, riprovo tra 10 minuti`);
      reloading = true;
      stopCamera();
      enableMouseFallback();
      setTimeout(() => location.reload(), 10 * 60 * 1000);
      return;
    }
    reloading = true;
    log.push(now);
    try { sessionStorage.setItem('mm-reloads', JSON.stringify(log)); } catch (_) {}
    logIncident(`ricarica pagina: ${reason}`);
    if (typeof callbacks.onTrackingStatus === 'function') callbacks.onTrackingStatus('reconnecting');
    setTimeout(() => location.reload(), 2000);
  }
  // Fotogrammi reali consegnati dalla webcam (indipendenti da MediaPipe)
  let tickGen = 0;
  function countCameraFrames() {
    if (!hasVideoFrameCb) return;
    const gen = ++tickGen; // una sola catena attiva anche dopo i riavvii
    const tick = () => {
      if (gen !== tickGen) return;
      perf.camFrames++; frameSeq++; lastTickAt = performance.now();
      videoEl.requestVideoFrameCallback(tick);
    };
    videoEl.requestVideoFrameCallback(tick);
  }
  // Restituisce i valori dell'ultimo intervallo e azzera i contatori
  function takePerfStats() {
    const out = {
      camFrames: perf.camFrames,
      results: perf.results,
      sendMs: perf.sends ? perf.sendMsTotal / perf.sends : 0,
      hands: perf.hands,
      camW: videoEl ? videoEl.videoWidth : 0,
      camH: videoEl ? videoEl.videoHeight : 0,
      running: state.webcamRunning,
      restarts: perf.restarts,
      lastRestart: perf.lastRestart,
    };
    perf.camFrames = 0; perf.results = 0; perf.sendMsTotal = 0; perf.sends = 0;
    return out;
  }

  // ── Hand Pose Analysis ──────────────────────────────────────
  function analyzeRightHand(landmarks, now) {
    const r = state.right;
    r.detected = true;

    // Normalizing hand size using Wrist (0) to Middle MCP (9) distance
    const handScale = Math.max(0.04, distance2D(landmarks[WRIST], landmarks[MIDDLE_MCP]));

    // Tip of Index finger (8)
    const indexTip = landmarks[INDEX_TIP];
    const thumbTip = landmarks[THUMB_TIP];

    // Coordinate mapping (mirror X axis: 1.0 - x), zona attiva centrale + filtro One Euro
    if (now - r.lastSeen > 400) { euroX.reset(); euroY.reset(); }
    r.lastSeen = now;
    const targetX = euroX.filter(mapRange(1.0 - indexTip.x, POINTER_X_RANGE) * window.innerWidth, now);
    const targetY = euroY.filter(mapRange(indexTip.y, POINTER_Y_RANGE) * window.innerHeight, now);

    // Pinch destro = trascina la vista (D19): il mirino resta fermo, la scena segue la mano
    const normPinchDist = distance3D(thumbTip, indexTip) / handScale;
    const handX = (1.0 - landmarks[MIDDLE_MCP].x) * window.innerWidth;
    const handY = landmarks[MIDDLE_MCP].y * window.innerHeight;

    if (!r.isPinching && normPinchDist < PINCH_ENTER_DIST) {
      r.isPinching = true;
      r.frozenX = r.smoothX;
      r.frozenY = r.smoothY;
      r.prevX = handX;
      r.prevY = handY;
      r.velocityX = 0;
      r.velocityY = 0;
      if (state.inertiaAnimId) { cancelAnimationFrame(state.inertiaAnimId); state.inertiaAnimId = null; }
    } else if (r.isPinching && normPinchDist > PINCH_EXIT_DIST) {
      releaseRightPan();
    }

    if (r.isPinching) {
      const deltaX = handX - r.prevX;
      const deltaY = handY - r.prevY;
      if (deltaX || deltaY) cb.onPan(deltaX, deltaY);
      r.velocityX = deltaX * 0.7 + r.velocityX * 0.3;
      r.velocityY = deltaY * 0.7 + r.velocityY * 0.3;
      r.prevX = handX;
      r.prevY = handY;
      cb.onPointerMove(r.frozenX, r.frozenY);
    } else {
      // Movimento libero: il loop rAF (pointerLoop) insegue questo bersaglio
      r.targetX = targetX;
      r.targetY = targetY;
    }
  }

  // Fine del trascinamento con la destra: inerzia e mirino di nuovo libero
  function releaseRightPan() {
    const r = state.right;
    if (!r.isPinching) return;
    r.isPinching = false;
    r.frozenX = null;
    r.frozenY = null;
    startPanInertia(r.velocityX, r.velocityY);
  }

  function analyzeLeftHand(landmarks, now) {
    const l = state.left;
    l.detected = true;

    const handScale = Math.max(0.04, distance2D(landmarks[WRIST], landmarks[MIDDLE_MCP]));
    const indexTip = landmarks[INDEX_TIP];
    const thumbTip = landmarks[THUMB_TIP];

    // Pinch sinistro = seleziona sotto il mirino (D19), con isteresi e breve tenuta.
    // D15: distanza 2D (la z di MediaPipe è rumorosa e faceva perdere pinch reali)
    // e soglie un po' più larghe solo per la sinistra
    const pinchDist = distance2D(thumbTip, indexTip) / handScale;
    l.lastSeen = now;
    if (!l.isPinching && pinchDist < LEFT_PINCH_ENTER) {
      l.isPinching = true;
      l.pinchStartTime = now;
      l.hasTriggeredSelect = false;
    } else if (l.isPinching && pinchDist > LEFT_PINCH_EXIT) {
      l.isPinching = false;
      l.pinchProgress = 0;
      l.hasTriggeredSelect = false;
    }
    if (l.isPinching) {
      l.pinchProgress = Math.min(1.0, (now - l.pinchStartTime) / PINCH_HOLD_MS_TO_SELECT);
      if (!l.hasTriggeredSelect && l.pinchProgress >= 1.0) {
        l.hasTriggeredSelect = true;
        cb.onSelect();
      }
    }

    // Zoom via Wrist Tilt / Rotation (> 20 deg)
    // Vector from Wrist (0) to Middle MCP (9)
    const vx = landmarks[MIDDLE_MCP].x - landmarks[WRIST].x;
    const vy = landmarks[MIDDLE_MCP].y - landmarks[WRIST].y;
    // Mirrored angle: 0 deg points straight up in canvas (-Y direction)
    const angleRad = Math.atan2(vx, -vy);
    const angleDeg = (angleRad * 180) / Math.PI;
    l.wristAngleDeg = angleDeg;

    // If tilt exceeds threshold and hand is open (not pinching)
    if (!l.isPinching && Math.abs(angleDeg) > TILT_ZOOM_THRESHOLD_DEG) {
      l.isZooming = true;
      // Tilt to the right = Zoom In, tilt to the left = Zoom Out
      const zoomFactor = angleDeg > 0 ? 1.018 : 0.982;
      l.zoomDir = angleDeg > 0 ? 1 : -1;
      cb.onZoom(zoomFactor);
    } else {
      l.isZooming = false;
      l.zoomDir = 0;
    }
  }

  function startPanInertia(initialVx, initialVy) {
    if (state.inertiaAnimId) cancelAnimationFrame(state.inertiaAnimId);

    let vx = initialVx;
    let vy = initialVy;

    function stepInertia() {
      vx *= INERTIA_DECAY;
      vy *= INERTIA_DECAY;

      if (Math.abs(vx) > 0.4 || Math.abs(vy) > 0.4) {
        cb.onPan(vx, vy);
        state.inertiaAnimId = requestAnimationFrame(stepInertia);
      } else {
        state.inertiaAnimId = null;
      }
    }
    state.inertiaAnimId = requestAnimationFrame(stepInertia);
  }

  // ── MediaPipe Results Handler ───────────────────────────────
  function onResults(results) {
    const now = performance.now();
    lastFrameAt = now; // per il watchdog della webcam
    perf.results++;
    perf.hands = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;

    // Reset detection flags
    state.right.detected = false;
    state.left.detected = false;

    // Render webcam feed & skeleton to camera canvas
    renderSkeleton(results);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const all = results.multiHandLandmarks;
      const labels = all.map((_, i) =>
        (results.multiHandedness && results.multiHandedness[i] && results.multiHandedness[i].label) || 'Right');
      // D15: con due mani MediaPipe a volte dà la stessa etichetta a entrambe e la sinistra
      // finiva trattata come destra (il pinch diventava pan). Si decide dalla posizione:
      // nell'immagine non specchiata la mano destra fisica sta a sinistra (x minore).
      if (all.length === 2 && labels[0] === labels[1]) {
        const firstIsRight = all[0][WRIST].x < all[1][WRIST].x;
        labels[0] = firstIsRight ? 'Left' : 'Right';
        labels[1] = firstIsRight ? 'Right' : 'Left';
      }
      for (let i = 0; i < all.length; i++) {
        const landmarks = all[i];
        if (i === 0) trackWave(landmarks, now);
        // MediaPipe labels: In selfie/mirrored webcam mode,
        // 'Left' returned by MediaPipe corresponds to physical Right Hand.
        const label = labels[i];

        // In mirrored camera mode:
        // 'Left' detection = physical Right Hand (Pointer & Pan)
        // 'Right' detection = physical Left Hand (Select & Zoom)
        if (label === 'Left') {
          analyzeRightHand(landmarks, now);
        } else {
          analyzeLeftHand(landmarks, now);
        }
      }
    }

    // Mano uscita dall'inquadratura durante un pinch: rilascia
    if (!state.right.detected) releaseRightPan();
    if (!state.left.detected && state.left.isPinching && now - (state.left.lastSeen || 0) > LEFT_LOST_GRACE_MS) {
      state.left.isPinching = false;
      state.left.pinchProgress = 0;
    }

    // Notify outside world of hand states (UI indicator updates)
    cb.onHandStateChange(state.left, state.right);
  }

  // ── Skeleton Renderer on camera-canvas ──────────────────────
  function renderSkeleton(results) {
    if (!canvasCtx || !canvasEl) return;

    const w = canvasEl.width;
    const h = canvasEl.height;

    // 1. Draw mirrored video background
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, w, h);
    canvasCtx.filter = PREVIEW_FILTER;
    if (results.image) {
      canvasCtx.drawImage(results.image, 0, 0, w, h);
    } else if (videoEl && videoEl.readyState >= 2) {
      canvasCtx.drawImage(videoEl, 0, 0, w, h);
    }
    canvasCtx.filter = 'none';

    // Velatura leggera per far leggere lo scheletro (prima 0.45: immagine troppo scura)
    canvasCtx.fillStyle = 'rgba(9, 12, 16, 0.12)';
    canvasCtx.fillRect(0, 0, w, h);

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      canvasCtx.restore();
      return;
    }

    // 2. Draw Skeletal Connections & Landmarks
    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const landmarks = results.multiHandLandmarks[i];
      const isPhysicalRight = (results.multiHandedness && results.multiHandedness[i]?.label === 'Left');

      const boneColor = isPhysicalRight ? 'rgba(132, 169, 140, 0.85)' : 'rgba(91, 192, 190, 0.85)';
      const jointColor = isPhysicalRight ? '#a7c957' : '#6fffe9';

      // Draw bones
      canvasCtx.lineWidth = 2.2;
      canvasCtx.strokeStyle = boneColor;
      canvasCtx.lineCap = 'round';
      canvasCtx.beginPath();

      for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
        const p1 = landmarks[startIdx];
        const p2 = landmarks[endIdx];
        canvasCtx.moveTo(p1.x * w, p1.y * h);
        canvasCtx.lineTo(p2.x * w, p2.y * h);
      }
      canvasCtx.stroke();

      // Draw joints
      for (let j = 0; j < landmarks.length; j++) {
        const p = landmarks[j];
        const isTip = (j === THUMB_TIP || j === INDEX_TIP || j === MIDDLE_TIP || j === RING_TIP || j === PINKY_TIP);

        canvasCtx.beginPath();
        canvasCtx.arc(p.x * w, p.y * h, isTip ? 3.5 : 2, 0, Math.PI * 2);
        canvasCtx.fillStyle = isTip ? '#ffffff' : jointColor;
        canvasCtx.fill();

        // Highlight pinch on fingertip
        if ((isPhysicalRight && state.right.isPinching) || (!isPhysicalRight && state.left.isPinching)) {
          if (j === INDEX_TIP || j === THUMB_TIP) {
            canvasCtx.beginPath();
            canvasCtx.arc(p.x * w, p.y * h, 6.5, 0, Math.PI * 2);
            canvasCtx.strokeStyle = isPhysicalRight ? '#a7c957' : '#6fffe9';
            canvasCtx.lineWidth = 2;
            canvasCtx.stroke();
          }
        }
      }
    }

    canvasCtx.restore();
  }

  // ── Setup MediaPipe Hands Engine ────────────────────────────
  async function startMediaPipe() {
    if (typeof window.Hands === 'undefined') {
      console.warn('[tracking] MediaPipe Hands not found in window. Enabling mouse fallback.');
      enableMouseFallback();
      return;
    }

    try {
      createHands();
    } catch (err) {
      console.warn('[tracking] MediaPipe initialization failed:', err);
      enableMouseFallback();
      return;
    }

    await startCamera();
    watchdog();
  }

  // Istanza MediaPipe Hands (una sola: ricrearla con questa versione della libreria
  // la manda in errore; se MediaPipe si rompe si ricarica la pagina, vedi reloadPage)
  function createHands() {
    hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 0, // modello lite: ~2x più veloce, sufficiente per puntare e fare pinch
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.65,
    });
    hands.onResults(onResults);
  }

  // ── Webcam: avvio, arresto e riavvio automatico ─────────────
  let hands = null;
  let mpCamera = null;
  let restartTimer = null;
  let lastFrameAt = 0;
  const STALL_MS = 8000;       // nessun frame elaborato per 8s = webcam bloccata
  const RETRY_MS = 10000;      // webcam assente: riprova ogni 10s

  async function startCamera() {
    try {
      if (typeof window.Camera !== 'undefined' && videoEl) {
        mpCamera = new window.Camera(videoEl, {
          onFrame: async () => {
            if (!state.active || !isNewFrame()) return;
            try {
              await timedSend();
            } catch (err) {
              reloadPage('errore MediaPipe');
            }
          },
          width: 640,
          height: 480,
        });
        await mpCamera.start();
      } else {
        await setupDirectWebcam(hands);
      }
      state.webcamRunning = true;
      state.active = true;
      lastFrameAt = performance.now();
      countCameraFrames();

      // Webcam scollegata (cavo USB, driver): il track termina
      const stream = videoEl && videoEl.srcObject;
      tuneCameraImage(stream);
      if (stream && stream.getVideoTracks) {
        stream.getVideoTracks().forEach((t) => t.addEventListener('ended', () => scheduleRestart('webcam scollegata')));
      }
      if (typeof callbacks.onTrackingStatus === 'function') callbacks.onTrackingStatus('camera');
      console.log('[tracking] Webcam avviata @ 640x480');
    } catch (err) {
      console.warn('[tracking] Webcam non disponibile, riprovo tra 10s:', err);
      enableMouseFallback();
      scheduleRestart('avvio fallito', RETRY_MS);
    }
  }

  // Alza luminosità e contrasto direttamente sulla webcam, se il driver lo consente
  // (molte webcam USB su Windows sì; le fotocamere dei Mac di solito no: resta il filtro anteprima)
  function tuneCameraImage(stream) {
    try {
      const track = stream && stream.getVideoTracks && stream.getVideoTracks()[0];
      if (!track || typeof track.getCapabilities !== 'function') return;
      const caps = track.getCapabilities();
      const adv = {};
      const pick = (c, t) => c.min + (c.max - c.min) * t;
      if (caps.brightness) adv.brightness = pick(caps.brightness, CAMERA_BRIGHTNESS);
      if (caps.contrast) adv.contrast = pick(caps.contrast, CAMERA_CONTRAST);
      if (Object.keys(adv).length === 0) return;
      track.applyConstraints({ advanced: [adv] })
        .then(() => console.log('[tracking] Webcam regolata:', adv))
        .catch((err) => console.warn('[tracking] Regolazione webcam non applicata:', err));
    } catch (_) {}
  }

  function stopCamera() {
    camGen++;
    sendPendingSince = 0;
    state.active = false;
    state.webcamRunning = false;
    try { if (mpCamera) mpCamera.stop(); } catch (_) {}
    mpCamera = null;
    const stream = videoEl && videoEl.srcObject;
    if (stream && stream.getTracks) stream.getTracks().forEach((t) => t.stop());
    if (videoEl) videoEl.srcObject = null;
  }

  const restartLog = [];
  function scheduleRestart(reason, delay = 3000) {
    if (restartTimer) return;
    console.warn(`[tracking] Riavvio webcam (${reason})`);
    perf.restarts++;
    perf.lastRestart = reason;
    restartLog.push(performance.now());
    while (restartLog.length && performance.now() - restartLog[0] > 120000) restartLog.shift();
    logIncident(`riavvio webcam: ${reason}`);
    if (restartLog.length > 3) { reloadPage('troppi riavvii webcam'); return; }
    state.right.detected = false;
    state.left.detected = false;
    cb.onHandStateChange(state.left, state.right);
    if (typeof callbacks.onTrackingStatus === 'function') callbacks.onTrackingStatus('reconnecting');
    restartTimer = setTimeout(async () => {
      restartTimer = null;
      stopCamera();
      await startCamera();
    }, delay);
  }

  // Controlla periodicamente che arrivino frame (catena di setTimeout, nessun polling di rete)
  function watchdog() {
    const now = performance.now();
    if (state.webcamRunning && !restartTimer && sendPendingSince && now - sendPendingSince > 6000) {
      // MediaPipe non risponde (di solito GPU/WebGL perso): riavviare la webcam non basta
      reloadPage('MediaPipe bloccato');
    } else if (state.webcamRunning && !restartTimer && now - lastFrameAt > STALL_MS) {
      scheduleRestart('nessun frame');
    }
    setTimeout(watchdog, 2000);
  }

  async function setupDirectWebcam(hands) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('navigator.mediaDevices not available');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
      audio: false,
    });

    videoEl.srcObject = stream;
    await videoEl.play();
    state.webcamRunning = true;
    state.active = true;

    async function streamLoop() {
      if (state.active) {
        if (!isNewFrame()) { requestAnimationFrame(streamLoop); return; }
        try {
          await timedSend();
        } catch (_) {
          reloadPage('errore MediaPipe');
          return;
        }
        requestAnimationFrame(streamLoop);
      }
    }
    requestAnimationFrame(streamLoop);
  }

  // ── Mouse & Touch Fallback ──────────────────────────────────
  function enableMouseFallback() {
    if (state.useMouseFallback) return;
    state.useMouseFallback = true;
    console.log('[tracking] Mouse & keyboard fallback enabled.');
    // Mouse, click, trascinamento e rotella sono già gestiti da main.js (bindUIEvents):
    // qui NON si aggiungono listener, altrimenti ogni click/zoom scatterebbe due volte.
    // Si segnala solo che il tracking mani non è disponibile.
    cb.onHandStateChange({ ...state.left, detected: false }, { ...state.right, detected: false });
    if (typeof callbacks.onTrackingStatus === 'function') callbacks.onTrackingStatus('mouse');
  }

  // Kickstart tracking
  startMediaPipe();

  // Return control interface
  return {
    enableMouseFallback,
    getState: () => state,
    takePerfStats,
    stop: () => {
      state.active = false;
      if (state.inertiaAnimId) cancelAnimationFrame(state.inertiaAnimId);
    },
  };
}
