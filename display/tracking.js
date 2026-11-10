/**
 * Tracking Module — MediaPipe Hands Pipeline & Gesture Recognition
 *
 * Implements decoupled hand tracking:
 *  - Right Hand: Pointer & Selection with Lerp smoothing, jitter deadzone,
 *    and coordinate-freeze during pinch click.
 *  - Left Hand: 2D Canvas Pan (pinch-drag with release inertia) & Zoom (wrist tilt > 20°).
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
const LERP_FACTOR = 0.16;             // Smoothing factor for pointer
const JITTER_DEADZONE_PX = 3.5;       // Jitter deadzone in screen pixels
const PINCH_ENTER_DIST = 0.28;        // Normalized threshold to start pinch
const PINCH_EXIT_DIST = 0.38;         // Hysteresis threshold to release pinch
const PINCH_HOLD_MS_TO_SELECT = 120;  // Milliseconds of held pinch before selection triggers
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
      hasTriggeredSelect: false,
      pinchProgress: 0, // 0 to 1
    },

    // Left Hand (Pan & Zoom)
    left: {
      detected: false,
      rawX: 0,
      rawY: 0,
      prevX: 0,
      prevY: 0,
      isPinching: false,
      isPanning: false,
      velocityX: 0,
      velocityY: 0,
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

  // ── Hand Pose Analysis ──────────────────────────────────────
  function analyzeRightHand(landmarks, now) {
    const r = state.right;
    r.detected = true;

    // Normalizing hand size using Wrist (0) to Middle MCP (9) distance
    const handScale = Math.max(0.04, distance2D(landmarks[WRIST], landmarks[MIDDLE_MCP]));

    // Tip of Index finger (8)
    const indexTip = landmarks[INDEX_TIP];
    const thumbTip = landmarks[THUMB_TIP];

    // Coordinate mapping (mirror X axis: 1.0 - x)
    const targetX = (1.0 - indexTip.x) * window.innerWidth;
    const targetY = indexTip.y * window.innerHeight;

    // Pinch distance (Thumb tip to Index tip, normalized by hand scale)
    const rawPinchDist = distance3D(thumbTip, indexTip);
    const normPinchDist = rawPinchDist / handScale;

    // Pinch state machine with hysteresis
    if (!r.isPinching && normPinchDist < PINCH_ENTER_DIST) {
      // ENTER PINCH: CRITICAL REQUIREMENT -> FREEZE (X, Y) COORDINATES
      r.isPinching = true;
      r.pinchStartTime = now;
      r.hasTriggeredSelect = false;
      r.frozenX = r.smoothX;
      r.frozenY = r.smoothY;
    } else if (r.isPinching && normPinchDist > PINCH_EXIT_DIST) {
      // RELEASE PINCH: unfreeze coordinates
      r.isPinching = false;
      r.frozenX = null;
      r.frozenY = null;
      r.pinchProgress = 0;
      r.hasTriggeredSelect = false;
    }

    if (r.isPinching) {
      // While pinching, coordinates remain frozen!
      const elapsed = now - r.pinchStartTime;
      r.pinchProgress = Math.min(1.0, elapsed / PINCH_HOLD_MS_TO_SELECT);

      if (!r.hasTriggeredSelect && r.pinchProgress >= 1.0) {
        r.hasTriggeredSelect = true;
        cb.onSelect();
      }

      // Keep reporting the frozen position
      cb.onPointerMove(r.frozenX, r.frozenY);
    } else {
      // Pointer free movement: Apply Lerp + Dynamic Deadzone
      const dx = targetX - r.smoothX;
      const dy = targetY - r.smoothY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > JITTER_DEADZONE_PX) {
        r.smoothX += dx * LERP_FACTOR;
        r.smoothY += dy * LERP_FACTOR;
      }

      cb.onPointerMove(r.smoothX, r.smoothY);
    }
  }

  function analyzeLeftHand(landmarks, now) {
    const l = state.left;
    l.detected = true;

    const handScale = Math.max(0.04, distance2D(landmarks[WRIST], landmarks[MIDDLE_MCP]));
    const indexTip = landmarks[INDEX_TIP];
    const thumbTip = landmarks[THUMB_TIP];

    // Screen coordinate of left hand center
    const currX = (1.0 - landmarks[MIDDLE_MCP].x) * window.innerWidth;
    const currY = landmarks[MIDDLE_MCP].y * window.innerHeight;

    // Left hand pinch for 2D Pan
    const pinchDist = distance3D(thumbTip, indexTip) / handScale;
    const isPinching = pinchDist < PINCH_ENTER_DIST;

    if (isPinching) {
      if (!l.isPanning) {
        l.isPanning = true;
        l.prevX = currX;
        l.prevY = currY;
        l.velocityX = 0;
        l.velocityY = 0;
      } else {
        const deltaX = currX - l.prevX;
        const deltaY = currY - l.prevY;

        // Apply pan directly
        cb.onPan(deltaX, deltaY);

        // Track velocity for inertia
        l.velocityX = deltaX * 0.7 + l.velocityX * 0.3;
        l.velocityY = deltaY * 0.7 + l.velocityY * 0.3;

        l.prevX = currX;
        l.prevY = currY;
      }
    } else {
      if (l.isPanning) {
        l.isPanning = false;
        // Trigger release inertia
        startPanInertia(l.velocityX, l.velocityY);
      }
    }
    l.isPinching = isPinching;

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

    // Reset detection flags
    state.right.detected = false;
    state.left.detected = false;

    // Render webcam feed & skeleton to camera canvas
    renderSkeleton(results);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        let label = 'Right'; // default fallback

        if (results.multiHandedness && results.multiHandedness[i]) {
          // MediaPipe labels: In selfie/mirrored webcam mode,
          // 'Left' returned by MediaPipe corresponds to physical Right Hand.
          label = results.multiHandedness[i].label;
        }

        // In mirrored camera mode:
        // 'Left' detection = physical Right Hand (Pointer & Select)
        // 'Right' detection = physical Left Hand (Pan & Zoom)
        if (label === 'Left') {
          analyzeRightHand(landmarks, now);
        } else {
          analyzeLeftHand(landmarks, now);
        }
      }
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
    if (results.image) {
      canvasCtx.drawImage(results.image, 0, 0, w, h);
    } else if (videoEl && videoEl.readyState >= 2) {
      canvasCtx.drawImage(videoEl, 0, 0, w, h);
    }

    // Translucent dark tint for high-contrast skeleton overlay
    canvasCtx.fillStyle = 'rgba(9, 12, 16, 0.45)';
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
      hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.65,
      });

      hands.onResults(onResults);
    } catch (err) {
      console.warn('[tracking] MediaPipe initialization failed:', err);
      enableMouseFallback();
      return;
    }

    await startCamera();
    watchdog();
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
            if (!state.active) return;
            try {
              await hands.send({ image: videoEl });
            } catch (err) {
              scheduleRestart('errore elaborazione frame');
            }
          },
          width: 1280,
          height: 720,
        });
        await mpCamera.start();
      } else {
        await setupDirectWebcam(hands);
      }
      state.webcamRunning = true;
      state.active = true;
      lastFrameAt = performance.now();

      // Webcam scollegata (cavo USB, driver): il track termina
      const stream = videoEl && videoEl.srcObject;
      if (stream && stream.getVideoTracks) {
        stream.getVideoTracks().forEach((t) => t.addEventListener('ended', () => scheduleRestart('webcam scollegata')));
      }
      if (typeof callbacks.onTrackingStatus === 'function') callbacks.onTrackingStatus('camera');
      console.log('[tracking] Webcam avviata @ 720p');
    } catch (err) {
      console.warn('[tracking] Webcam non disponibile, riprovo tra 10s:', err);
      enableMouseFallback();
      scheduleRestart('avvio fallito', RETRY_MS);
    }
  }

  function stopCamera() {
    state.active = false;
    state.webcamRunning = false;
    try { if (mpCamera) mpCamera.stop(); } catch (_) {}
    mpCamera = null;
    const stream = videoEl && videoEl.srcObject;
    if (stream && stream.getTracks) stream.getTracks().forEach((t) => t.stop());
    if (videoEl) videoEl.srcObject = null;
  }

  function scheduleRestart(reason, delay = 3000) {
    if (restartTimer) return;
    console.warn(`[tracking] Riavvio webcam (${reason})`);
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
    if (state.webcamRunning && !restartTimer && performance.now() - lastFrameAt > STALL_MS) {
      scheduleRestart('nessun frame');
    }
    setTimeout(watchdog, 4000);
  }

  async function setupDirectWebcam(hands) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('navigator.mediaDevices not available');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      audio: false,
    });

    videoEl.srcObject = stream;
    await videoEl.play();
    state.webcamRunning = true;
    state.active = true;

    async function streamLoop() {
      if (state.active) {
        try {
          await hands.send({ image: videoEl });
        } catch (_) {
          scheduleRestart('errore elaborazione frame');
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
    stop: () => {
      state.active = false;
      if (state.inertiaAnimId) cancelAnimationFrame(state.inertiaAnimId);
    },
  };
}
