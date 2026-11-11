/**
 * Upload App — Memory Mesh
 *
 * Responsibilities:
 *  - Step navigation (overview ↔ form)
 *  - File selection with drag & drop, preview
 *  - Image compression via Canvas (WebP, max 1920px, quality 0.8, ≤ 1 MB)
 *  - Form validation (title word count, privacy consent)
 *  - Upload to Supabase Storage bucket 'uploads'
 *  - Insert record into Supabase table 'memories'
 *  - Loading & success feedback
 */

import { supabase } from '../shared/supabase-config.js';
import { initInkBleed } from '../shared/inkBleed.js';
import { renderTextCard, ensureTextCardFont } from '../shared/textCard.js';

// ── Constants ──────────────────────────────────────────────────
const MAX_IMAGE_SIDE = 1920;
const IMAGE_QUALITY_START = 0.8;
const IMAGE_QUALITY_MIN = 0.3;
const IMAGE_QUALITY_STEP = 0.1;
const MAX_FILE_BYTES = 1024 * 1024;        // 1 MB target for images
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB strict limit for video, audio, 3D
// U1: un .glb più pesante si accetta se, alleggerito, rientra nei 10 MB
const MAX_MODEL_INPUT_BYTES = 80 * 1024 * 1024;
const MAX_TITLE_WORDS = 5;
const THUMB_SIDE = 400;     // D1: miniatura per i nodi del display (lato lungo, px)
const THUMB_QUALITY = 0.75;
const MAX_THEME_TAGS = 3;

// ── State ──────────────────────────────────────────────────────
const state = {
  mode: 'file',         // 'file' | 'text'
  file: null,           // processed File ready for upload
  originalFile: null,   // original File from input
  mediaType: null,      // 'image' | 'video' | 'audio' | 'model3d' | 'text'
  themeTags: [],        // string[]  (max 3)
  locationTag: null,    // string | null
};

// ── DOM References ─────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  // Steps
  stepLanding2: $('#step-landing2'),
  stepInfo:     $('#step-info'),
  stepForm:     $('#step-form'),

  // Navigation
  btnGoInfo:   $('#btn-go-info'),
  btnGoForm:   $('#btn-go-form'),
  btnInfoHome: $('#btn-info-home'),
  btnInfoForm: $('#btn-info-form'),
  btnBack:     $('#btn-back'),

  // Media Mode Switcher
  tabModeFile: $('#tab-mode-file'),
  tabModeText: $('#tab-mode-text'),
  panelFile:   $('#panel-file'),
  panelText:   $('#panel-text'),

  // Dropzone (File mode)
  dropzone:         $('#dropzone'),
  dropzoneEmpty:    $('#dropzone-empty'),
  dropzonePreview:  $('#dropzone-preview'),
  fileInput:        $('#file-input'),
  previewImg:       $('#preview-img'),
  previewVideo:     $('#preview-video'),
  previewAudioWrap: $('#preview-audio-wrap'),
  previewAudio:     $('#preview-audio'),
  previewAudioName: $('#preview-audio-name'),
  previewModelWrap: $('#preview-model-wrap'),
  previewModelName: $('#preview-model-name'),
  modelOpt: $('#model-opt'),
  modelOptInfo: $('#model-opt-info'),
  btnRemoveFile:    $('#btn-remove-file'),
  errorFile:        $('#error-file'),

  // Text Card Editor (Text mode)
  memoryQuote:   $('#memory-quote'),
  quoteCounter:  $('#quote-counter'),

  // Form fields
  form:           $('#memory-form'),
  title:          $('#memory-title'),
  titleCounter:   $('#title-counter'),
  errorTitle:     $('#error-title'),
  desc:           $('#memory-desc'),
  fieldTheme:     $('#field-theme'),
  themeChips:     $('#theme-chips'),
  errorTheme:     $('#error-theme'),
  fieldLocation:  $('#field-location'),
  locationChips:  $('#location-chips'),
  errorLocation:  $('#error-location'),

  // Date Segmented
  fieldDate:      $('#field-date'),
  dateSegmented:  $('#date-segmented'),
  dateYear:       $('#date-year'),
  dateMonth:      $('#date-month'),
  dateDay:        $('#date-day'),
  errorDate:      $('#error-date'),

  // Consent
  fieldConsent:   $('#field-consent'),
  privacyConsent: $('#privacy-consent'),
  errorConsent:   $('#error-consent'),

  // Submit
  btnSubmit:    $('#btn-submit'),
  submitLabel:  $('#submit-label'),

  // Home
  memoryCount: $('#memory-count'),

  // Success
  overlay:    $('#success-overlay'),
  btnNew:     $('#btn-new'),
};

// ── U3: niente zoom (Safari iOS ignora user-scalable=no) ─────────
function preventZoom() {
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((t) =>
    document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  let lastTouchEnd = 0; // doppio tap
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd < 300 && !e.target.closest('input, textarea, select, button, label')) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
}

// ── Initialise ─────────────────────────────────────────────────
function init() {
  preventZoom();
  // U6: solo l'inchiostro statico a riposo, niente effetto dinamico al tocco (troppo pesante)
  initInkBleed({ selector: '.action-btn__arrow, .landing2__title, .info-block__title, .header__title, .overlay__title', hover: 'none' });
  bindNavigation();
  bindMediaSwitcher();
  bindDropzone();
  bindDateInput();
  bindFormFields();
  bindSubmit();
  bindSuccess();
  loadMemoryCount();
  console.log('[upload] app ready — supabase client loaded');
}

// ── C3: contatore ricordi nella home ─────────────────────────
let memoryCount = null;
function renderMemoryCount() {
  if (!els.memoryCount || !memoryCount) return;
  els.memoryCount.textContent = memoryCount === 1 ? '1 ricordo raccolto finora' : `${memoryCount} ricordi raccolti finora`;
  els.memoryCount.hidden = false;
}

async function loadMemoryCount() {
  try {
    // Solo il conteggio: nessun contenuto scaricato
    const { count, error } = await supabase.from('memories').select('id', { count: 'exact', head: true });
    if (error) throw error;
    memoryCount = count || 0;
    renderMemoryCount();
  } catch (err) {
    console.warn('[upload] conteggio ricordi non disponibile:', err); // il contatore resta nascosto
  }
}

// ── Navigation State & Logic ────────────────────────────────────
let currentStep = 'landing2';
let previousStep = null;

function bindNavigation() {
  // A3: gli step entrano nella cronologia, così il tasto Indietro del telefono resta nel sito
  history.replaceState({ step: currentStep }, '');
  window.addEventListener('popstate', (e) => {
    // Durante l'invio non si lascia il modulo
    if (els.btnSubmit.disabled && currentStep === 'form') {
      history.pushState({ step: 'form' }, '');
      return;
    }
    if (!els.overlay.hidden) {
      hideSuccess();
      resetForm();
    }
    goToStep(e.state?.step || 'landing2', { fromHistory: true });
  });

  // 2. Landing 2 navigation
  if (els.btnGoInfo) {
    els.btnGoInfo.addEventListener('click', () => goToStep('info'));
  }
  if (els.btnGoForm) {
    els.btnGoForm.addEventListener('click', () => goToStep('form'));
  }

  // 3. Info navigation
  if (els.btnInfoHome) {
    els.btnInfoHome.addEventListener('click', () => goToStep('landing2'));
  }
  if (els.btnInfoForm) {
    els.btnInfoForm.addEventListener('click', () => goToStep('form'));
  }

  // 4. Form back button -> returns to previous screen (landing2 or info)
  if (els.btnBack) {
    els.btnBack.addEventListener('click', () => {
      const target = previousStep === 'info' ? 'info' : 'landing2';
      goToStep(target);
    });
  }
}

function goToStep(target, { fromHistory = false } = {}) {
  if (target === currentStep) return;

  const steps = {
    landing2: els.stepLanding2,
    info:     els.stepInfo,
    form:     els.stepForm,
  };

  const oldStepEl = steps[currentStep];
  const newStepEl = steps[target];
  if (!newStepEl) return;

  // Step directional order for slide transitions
  const order = { landing2: 1, info: 2, form: 3 };
  const goingForward = (order[target] ?? 0) >= (order[currentStep] ?? 0);

  if (oldStepEl) {
    oldStepEl.className = `step step--${currentStep} ${goingForward ? 'step--prev' : 'step--next'}`;
  }

  newStepEl.className = `step step--${target} step--active`;
  newStepEl.scrollTop = 0;

  previousStep = currentStep;
  currentStep = target;
  if (!fromHistory) history.pushState({ step: target }, '');
}

// ── Media Switcher (File vs Text) ──────────────────────────────
function bindMediaSwitcher() {
  els.tabModeFile.addEventListener('click', () => setMediaMode('file'));
  els.tabModeText.addEventListener('click', () => setMediaMode('text'));

  // Text card quote counter
  els.memoryQuote.addEventListener('input', () => {
    const len = els.memoryQuote.value.length;
    els.quoteCounter.textContent = `${len} / 280`;
    if (len > 0) hideFieldError('file');
  });
}

function setMediaMode(mode) {
  state.mode = mode;
  hideFieldError('file');

  if (mode === 'file') {
    els.tabModeFile.classList.add('is-active');
    els.tabModeText.classList.remove('is-active');
    els.panelFile.hidden = false;
    els.panelText.hidden = true;

    // Restore mediaType if a file was previously loaded
    if (state.originalFile) {
      state.mediaType = detectMediaType(state.originalFile);
    } else {
      state.mediaType = null;
    }
  } else {
    els.tabModeText.classList.add('is-active');
    els.tabModeFile.classList.remove('is-active');
    els.panelText.hidden = false;
    els.panelFile.hidden = true;
    state.mediaType = 'text';

    // Requirement 2: Strictly hide any audio HUD when not in audio mode
    hideAudioPlayer();
  }
}

function hideAudioPlayer() {
  if (els.previewAudioWrap) {
    els.previewAudioWrap.hidden = true;
    els.previewAudioWrap.style.display = 'none';
  }
  if (els.previewAudio) {
    els.previewAudio.pause();
    els.previewAudio.removeAttribute('src');
    els.previewAudio.load();
  }
}

// ── File Format Detection ──────────────────────────────────────
function detectMediaType(file) {
  const ext = (file.name || '').split('.').pop().toLowerCase();
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (ext === 'glb' || ext === 'gltf' || file.type.includes('gltf')) return 'model3d';
  return null;
}

// ── Dropzone & File Selection ──────────────────────────────────
function bindDropzone() {
  const dz = els.dropzone;

  // Click to open file picker
  dz.addEventListener('click', () => {
    if (!state.file) els.fileInput.click();
  });
  dz.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !state.file) {
      e.preventDefault();
      els.fileInput.click();
    }
  });

  // File input change
  els.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFileSelect(e.target.files[0]);
  });

  // Drag & drop
  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('is-dragover');
  });
  dz.addEventListener('dragleave', () => {
    dz.classList.remove('is-dragover');
  });
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('is-dragover');
    if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
  });

  // Remove file
  els.btnRemoveFile.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFile();
  });
}

async function handleFileSelect(file) {
  hideFieldError('file');

  const type = detectMediaType(file);
  if (!type) {
    showFieldError('file', 'Formato non supportato. Usa foto, video, audio o 3D (.glb).');
    return;
  }

  // Strict limit of 10 MB for video, audio, 3D (i .glb si possono alleggerire: limite dopo)
  const isGlb = type === 'model3d' && /\.glb$/i.test(file.name);
  if (isGlb ? file.size > MAX_MODEL_INPUT_BYTES : file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(0);
    const max = (isGlb ? MAX_MODEL_INPUT_BYTES : MAX_UPLOAD_BYTES) / (1024 * 1024);
    showFieldError('file', type === 'video'
      ? `Video troppo pesante (${mb} MB, max ${max}). Scegline uno più corto, circa 10 secondi, o accorcialo dalla Galleria.`
      : `Il file pesa ${mb} MB: il limite è ${max} MB.`);
    return;
  }

  state.originalFile = file;
  state.mediaType = type;

  // Reset previews
  hideAllPreviews();

  if (type === 'image') {
    try {
      state.file = await compressImage(file);
      showImagePreview(state.file);
    } catch (err) {
      console.error('[upload] image compression failed:', err);
      showFieldError('file', 'Errore nella compressione dell\'immagine.');
      return;
    }
  } else if (type === 'video') {
    state.file = file;
    showVideoPreview(file);
  } else if (type === 'audio') {
    state.file = file;
    showAudioPreview(file);
  } else if (type === 'model3d') {
    state.file = file;
    showModelPreview(file);
    setupModelOptions(file);
  }

  // Update dropzone appearance
  els.dropzone.classList.add('has-file');
  els.dropzoneEmpty.hidden = true;
  els.dropzonePreview.hidden = false;
}

function hideAllPreviews() {
  if (els.previewImg) {
    els.previewImg.hidden = true;
    els.previewImg.style.display = 'none';
    els.previewImg.removeAttribute('src');
  }
  if (els.previewVideo) {
    els.previewVideo.hidden = true;
    els.previewVideo.style.display = 'none';
    els.previewVideo.pause();
    els.previewVideo.removeAttribute('src');
    els.previewVideo.load();
  }
  hideAudioPlayer();
  if (els.previewModelWrap) {
    els.previewModelWrap.hidden = true;
    els.previewModelWrap.style.display = 'none';
  }
  if (els.dropzonePreview) {
    delete els.dropzonePreview.dataset.mediaType;
  }
}

// ── U1: alleggerimento modelli 3D ─────────────────────────────
// Livello scelto: 'light' | 'medium' | 'original'. Il file ottimizzato sostituisce state.file;
// l'invio attende l'ottimizzazione in corso (state.modelJob).
let modelLevel = 'medium';
let modelJobId = 0;
const formatMB = (b) => `${(b / 1048576).toLocaleString('it-IT', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MB`;

function setupModelOptions(file) {
  const box = els.modelOpt;
  if (!box) return;
  const isGlb = /\.glb$/i.test(file.name);
  box.hidden = !isGlb; // i .gltf con file esterni non si possono elaborare qui
  if (!isGlb) return;
  if (!box.dataset.bound) {
    box.dataset.bound = '1';
    box.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-level]');
      if (!btn || btn.disabled) return;
      e.stopPropagation();
      if (state.originalFile) applyModelLevel(state.originalFile, btn.dataset.level);
    });
  }
  applyModelLevel(file, file.size > 2 * 1048576 ? 'medium' : 'original');
}

function applyModelLevel(file, level) {
  modelLevel = level;
  const info = els.modelOptInfo;
  els.modelOpt.querySelectorAll('[data-level]').forEach((b) => {
    const on = b.dataset.level === level;
    b.classList.toggle('is-selected', on);
    b.setAttribute('aria-checked', String(on));
  });
  info.classList.remove('is-error');
  const jobId = ++modelJobId;

  if (level === 'original') {
    state.file = file;
    state.modelJob = null;
    if (file.size > MAX_UPLOAD_BYTES) {
      info.textContent = `${formatMB(file.size)}: troppo pesante, scegli "Un po'" o "Molto".`;
      info.classList.add('is-error');
    } else {
      info.textContent = `${formatMB(file.size)}, invariato`;
    }
    return;
  }

  info.textContent = 'Sto alleggerendo il modello…';
  const buttons = els.modelOpt.querySelectorAll('[data-level]');
  buttons.forEach((b) => { b.disabled = true; });
  state.modelJob = import('./modelOptimizer.js')
    .then(({ optimizeModel }) => optimizeModel(file, level))
    .then((out) => {
      if (jobId !== modelJobId) return;
      // Se non conviene (modello già leggero) resta l'originale
      const best = out.size < file.size ? out : file;
      state.file = best;
      const pct = Math.round((1 - best.size / file.size) * 100);
      if (best.size > MAX_UPLOAD_BYTES) {
        info.textContent = `${formatMB(best.size)}: ancora troppo pesante, prova "Molto".`;
        info.classList.add('is-error');
      } else {
        info.textContent = best === file
          ? `${formatMB(file.size)}: già leggero, lo invio così`
          : `${formatMB(file.size)} → ${formatMB(best.size)} (−${pct}%)`;
      }
    })
    .catch((err) => {
      if (jobId !== modelJobId) return;
      console.warn('[upload] ottimizzazione 3D non riuscita:', err);
      state.file = file;
      info.textContent = file.size > MAX_UPLOAD_BYTES
        ? 'Non riesco ad alleggerire questo modello e supera i 10 MB.'
        : 'Non riesco ad alleggerirlo: invio il modello originale.';
      if (file.size > MAX_UPLOAD_BYTES) info.classList.add('is-error');
    })
    .finally(() => {
      if (jobId !== modelJobId) return;
      buttons.forEach((b) => { b.disabled = false; });
      state.modelJob = null;
    });
}

function clearFile() {
  modelJobId++;
  state.modelJob = null;
  if (els.modelOpt) els.modelOpt.hidden = true;
  state.file = null;
  state.originalFile = null;
  state.mediaType = (state.mode === 'text') ? 'text' : null;

  els.fileInput.value = '';
  els.dropzone.classList.remove('has-file');
  els.dropzoneEmpty.hidden = false;
  els.dropzonePreview.hidden = true;
  hideAllPreviews();
  hideFieldError('file');
}

function showImagePreview(file) {
  hideAllPreviews();
  const url = URL.createObjectURL(file);
  els.previewImg.src = url;
  els.previewImg.hidden = false;
  els.previewImg.style.display = 'block';
  if (els.dropzonePreview) {
    els.dropzonePreview.dataset.mediaType = 'image';
    els.dropzonePreview.hidden = false;
  }
}

function showVideoPreview(file) {
  hideAllPreviews();
  const url = URL.createObjectURL(file);
  els.previewVideo.src = url;
  els.previewVideo.hidden = false;
  els.previewVideo.style.display = 'block';
  if (els.dropzonePreview) {
    els.dropzonePreview.dataset.mediaType = 'video';
    els.dropzonePreview.hidden = false;
  }
}

function showAudioPreview(file) {
  hideAllPreviews();
  const url = URL.createObjectURL(file);
  els.previewAudio.src = url;
  els.previewAudioName.textContent = file.name;
  els.previewAudioWrap.hidden = false;
  els.previewAudioWrap.style.display = 'flex';
  if (els.dropzonePreview) {
    els.dropzonePreview.dataset.mediaType = 'audio';
    els.dropzonePreview.hidden = false;
  }
}

function showModelPreview(file) {
  hideAllPreviews();
  els.previewModelName.textContent = file.name;
  els.previewModelWrap.hidden = false;
  els.previewModelWrap.style.display = 'flex';
  if (els.dropzonePreview) {
    els.dropzonePreview.dataset.mediaType = 'model3d';
    els.dropzonePreview.hidden = false;
  }
}

// ── Segmented Date Input (GG - MM - AAAA a schermo, U4) ───────────
function bindDateInput() {
  const y = els.dateYear;
  const m = els.dateMonth;
  const d = els.dateDay;
  const container = els.dateSegmented;

  if (!y || !m || !d || !container) return;

  const segments = [d, m, y]; // ordine di inserimento italiano

  // Common input sanitization & auto-advance
  segments.forEach((input, idx) => {
    input.addEventListener('input', () => {
      // Keep only digits
      input.value = input.value.replace(/\D/g, '');
      hideFieldError('date');
      container.classList.remove('is-invalid');

      // Auto-advance if max length reached
      if (input.value.length >= input.maxLength && idx < segments.length - 1) {
        segments[idx + 1].focus();
        segments[idx + 1].select();
      }
    });

    // Backspace & Arrow keys navigation
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && input.value.length === 0 && idx > 0) {
        e.preventDefault();
        segments[idx - 1].focus();
      } else if (e.key === 'ArrowLeft' && input.selectionStart === 0 && idx > 0) {
        e.preventDefault();
        segments[idx - 1].focus();
      } else if (e.key === 'ArrowRight' && input.selectionStart === input.value.length && idx < segments.length - 1) {
        e.preventDefault();
        segments[idx + 1].focus();
      }
    });

    // Paste handling
    input.addEventListener('paste', handleDatePaste);
  });

  // Also catch paste on the segmented container
  container.addEventListener('paste', handleDatePaste);
}

function handleDatePaste(e) {
  const pasteData = (e.clipboardData || window.clipboardData)?.getData('text');
  if (!pasteData) return;

  const digits = pasteData.replace(/\D/g, '');
  if (digits.length >= 8) {
    e.preventDefault();
    const first4 = parseInt(digits.slice(0, 4), 10);
    const last4 = parseInt(digits.slice(4, 8), 10);

    if (first4 >= 1900 && first4 <= 2100) {
      // Format AAAA-MM-GG
      els.dateYear.value = digits.slice(0, 4);
      els.dateMonth.value = digits.slice(4, 6);
      els.dateDay.value = digits.slice(6, 8);
    } else if (last4 >= 1900 && last4 <= 2100) {
      // Italian format: GG-MM-AAAA
      els.dateDay.value = digits.slice(0, 2);
      els.dateMonth.value = digits.slice(2, 4);
      els.dateYear.value = digits.slice(4, 8);
    } else {
      els.dateDay.value = digits.slice(0, 2);
      els.dateMonth.value = digits.slice(2, 4);
      els.dateYear.value = digits.slice(4, 8);
    }

    hideFieldError('date');
    els.dateSegmented.classList.remove('is-invalid');
  }
}

function getDateValue() {
  const y = els.dateYear.value.trim();
  const m = els.dateMonth.value.trim();
  const d = els.dateDay.value.trim();

  // If all empty, it's valid (date is optional)
  if (!y && !m && !d) {
    return { valid: true, value: null };
  }

  // If partially entered
  if (y.length < 4 || m.length < 1 || d.length < 1) {
    return { valid: false, message: 'Completa tutti i campi della data (GG-MM-AAAA).' };
  }

  const yearNum = parseInt(y, 10);
  const monthNum = parseInt(m, 10);
  const dayNum = parseInt(d, 10);

  if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
    return { valid: false, message: `Inserisci un anno valido tra il 1900 e il ${new Date().getFullYear()}.` };
  }
  if (monthNum < 1 || monthNum > 12) {
    return { valid: false, message: 'Inserisci un mese valido (01-12).' };
  }
  if (dayNum < 1 || dayNum > 31) {
    return { valid: false, message: 'Inserisci un giorno valido (01-31).' };
  }

  // Validate real calendar day (e.g. Feb 30th is invalid)
  const dt = new Date(yearNum, monthNum - 1, dayNum);
  if (dt.getFullYear() !== yearNum || dt.getMonth() !== monthNum - 1 || dt.getDate() !== dayNum) {
    return { valid: false, message: 'Data non valida per il calendario.' };
  }
  // Il database rifiuta le date future (CHECK time_event <= oggi + 1)
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (dt > today) {
    return { valid: false, message: 'La data del ricordo non può essere nel futuro.' };
  }

  const formatted = `${String(yearNum).padStart(4, '0')}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  return { valid: true, value: formatted };
}

// ── Image Compression (Canvas WebP) ────────────────────────────
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Resize to fit within MAX_IMAGE_SIDE
      if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) {
        if (width >= height) {
          height = Math.round(height * (MAX_IMAGE_SIDE / width));
          width = MAX_IMAGE_SIDE;
        } else {
          width = Math.round(width * (MAX_IMAGE_SIDE / height));
          height = MAX_IMAGE_SIDE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Iteratively compress until under MAX_FILE_BYTES.
      // Alcuni browser (es. Safari iOS) non sanno codificare WebP e restituiscono
      // silenziosamente un PNG non compresso: in quel caso si passa a JPEG.
      let mime = 'image/webp';
      const tryCompress = (quality) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob returned null'));
              return;
            }
            if (blob.type !== mime) {
              if (mime === 'image/webp') {
                mime = 'image/jpeg';
                tryCompress(IMAGE_QUALITY_START);
                return;
              }
              reject(new Error(`Formato immagine non supportato dal browser (${blob.type})`));
              return;
            }
            if (blob.size > MAX_FILE_BYTES && quality > IMAGE_QUALITY_MIN) {
              tryCompress(quality - IMAGE_QUALITY_STEP);
            } else {
              const ext = mime === 'image/webp' ? '.webp' : '.jpg';
              const compressed = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, '') + ext,
                { type: mime }
              );
              resolve(compressed);
            }
          },
          mime,
          quality
        );
      };

      tryCompress(IMAGE_QUALITY_START);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

// ── D1: Miniatura leggera per il display ─────────────────────
// Il display disegna i nodi a ~86-240px: scaricare il file pieno (fino a 1920px o un video intero) è uno spreco.
function drawThumb(source, srcW, srcH, background = '') {
  return new Promise((resolve) => {
    const k = Math.min(1, THUMB_SIDE / Math.max(srcW, srcH));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(srcW * k));
    canvas.height = Math.max(1, Math.round(srcH * k));
    const ctx = canvas.getContext('2d');
    if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    // WebP dove possibile, JPEG su Safari iOS (non codifica WebP via canvas)
    const exportAs = (mime) => canvas.toBlob((blob) => {
      if (blob && blob.type !== mime && mime === 'image/webp') { exportAs('image/jpeg'); return; }
      if (!blob) { resolve(null); return; }
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
      resolve(new File([blob], `thumb.${ext}`, { type: blob.type }));
    }, mime, THUMB_QUALITY);
    exportAs('image/webp');
  });
}

function imageThumb(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); drawThumb(img, img.naturalWidth, img.naturalHeight).then(resolve); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function videoThumb(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      resolve(result);
    };
    const timer = setTimeout(() => finish(null), 5000); // senza miniatura il display estrae il frame da sé
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.addEventListener('loadeddata', () => {
      try { video.currentTime = Math.min(0.1, (video.duration || 1) * 0.05); } catch (_) { finish(null); }
    }, { once: true });
    video.addEventListener('seeked', () => {
      if (!video.videoWidth) { finish(null); return; }
      drawThumb(video, video.videoWidth, video.videoHeight).then(finish, () => finish(null));
    }, { once: true });
    video.addEventListener('error', () => finish(null), { once: true });
    video.src = url;
  });
}

// D6: anteprima 2D del modello 3D, fotografata con model-viewer (caricato solo qui, on demand)
const MODEL_VIEWER_URL = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
const THUMB_BG = '#F8F3EC'; // stesso fondo dei nodi del display

async function modelThumb(file) {
  await import(MODEL_VIEWER_URL);
  await customElements.whenDefined('model-viewer');
  const url = URL.createObjectURL(file);
  const mv = document.createElement('model-viewer');
  // Nel viewport ma invisibile: fuori schermo model-viewer non disegna
  mv.style.cssText = 'position:fixed;left:0;top:0;width:480px;height:360px;opacity:0;pointer-events:none;z-index:-1';
  mv.setAttribute('camera-orbit', '30deg 75deg auto');
  mv.setAttribute('shadow-intensity', '0.6');
  mv.setAttribute('exposure', '1');
  mv.setAttribute('interaction-prompt', 'none');
  mv.setAttribute('loading', 'eager');
  document.body.appendChild(mv);
  try {
    const loaded = new Promise((resolve, reject) => {
      mv.addEventListener('load', resolve, { once: true });
      mv.addEventListener('error', reject, { once: true });
      setTimeout(() => reject(new Error('timeout modello 3D')), 15000);
    });
    mv.src = url;
    await loaded;
    // Due frame per essere sicuri che la scena sia disegnata
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const blob = await mv.toBlob({ mimeType: 'image/png', idealAspect: true });
    const bmp = await createImageBitmap(blob);
    return drawThumb(bmp, bmp.width, bmp.height, THUMB_BG);
  } finally {
    mv.remove();
    URL.revokeObjectURL(url);
  }
}

async function makeThumb(file, mediaType) {
  if (mediaType === 'image' || mediaType === 'text') return imageThumb(file);
  if (mediaType === 'video') return videoThumb(file);
  if (mediaType === 'model3d') return modelThumb(file).catch((err) => { console.warn('[upload] anteprima 3D non creata:', err); return null; });
  return null; // l'audio ha un'icona disegnata dal display
}

// ── Canvas Text Card Image Generator ───────────────────────────
async function generateTextCardImage(text, title = '') {
  // D30: stessa card del display (testo in corsivo calligrafico)
  await ensureTextCardFont();
  const canvas = renderTextCard(text, title);
  return new Promise((resolve, reject) => {
    // Export to WebP blob (fallback JPEG se il browser non codifica WebP, es. Safari iOS)
    const exportAs = (mime) => canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'));
          return;
        }
        if (blob.type !== mime && mime === 'image/webp') {
          exportAs('image/jpeg');
          return;
        }
        const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
        const file = new File([blob], `text_card_${Date.now()}.${ext}`, { type: blob.type });
        resolve(file);
      },
      mime,
      0.9
    );
    exportAs('image/webp');
  });
}

// ── Form Fields ────────────────────────────────────────────────
function bindFormFields() {
  // Title word counter
  els.title.addEventListener('input', () => {
    const words = getWords(els.title.value);
    const count = words.length;
    els.titleCounter.textContent = `${count} / ${MAX_TITLE_WORDS}`;
    els.titleCounter.classList.toggle('is-over', count > MAX_TITLE_WORDS);
    els.title.classList.toggle('is-invalid', count > MAX_TITLE_WORDS);

    if (count <= MAX_TITLE_WORDS) {
      hideFieldError('title');
    } else {
      showFieldError('title', `Il titolo può avere al massimo ${MAX_TITLE_WORDS} parole.`);
    }
  });

  // Theme tag chips (multi, max 3)
  els.themeChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    const tag = chip.dataset.tag;
    const idx = state.themeTags.indexOf(tag);

    if (idx > -1) {
      // Deselect
      state.themeTags.splice(idx, 1);
      chip.classList.remove('is-selected');
    } else if (state.themeTags.length < MAX_THEME_TAGS) {
      // Select
      state.themeTags.push(tag);
      chip.classList.add('is-selected');
    }

    if (state.themeTags.length > 0) {
      hideFieldError('theme');
      els.themeChips.classList.remove('is-invalid');
    }

    // Disable remaining chips when at max
    els.themeChips.querySelectorAll('.chip').forEach((c) => {
      if (!c.classList.contains('is-selected')) {
        c.classList.toggle('is-disabled', state.themeTags.length >= MAX_THEME_TAGS);
      }
    });
  });

  // Location tag chips (single select)
  els.locationChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    const loc = chip.dataset.location;

    if (state.locationTag === loc) {
      // Deselect
      state.locationTag = null;
      chip.classList.remove('is-selected');
    } else {
      // Select (exclusive)
      state.locationTag = loc;
      els.locationChips.querySelectorAll('.chip').forEach((c) =>
        c.classList.remove('is-selected')
      );
      chip.classList.add('is-selected');
      hideFieldError('location');
      els.locationChips.classList.remove('is-invalid');
    }
  });

  // Privacy consent
  els.privacyConsent.addEventListener('change', () => {
    if (els.privacyConsent.checked) {
      hideFieldError('consent');
      els.fieldConsent.classList.remove('is-invalid');
    }
  });
}

// ── Submit ─────────────────────────────────────────────────────
function bindSubmit() {
  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await submitMemory();
  });
}

function validate() {
  let valid = true;

  // 1. Media validation
  if (state.mode === 'file') {
    if (!state.file) {
      showFieldError('file', 'Seleziona un file multimediale da caricare.');
      valid = false;
    }
  } else if (state.mode === 'text') {
    const quote = els.memoryQuote.value.trim();
    if (!quote) {
      showFieldError('file', 'Inserisci il testo della memoria prima di inviare.');
      valid = false;
    }
  }

  // 2. Title required & max words
  const titleWords = getWords(els.title.value);
  if (titleWords.length === 0) {
    showFieldError('title', 'Inserisci un titolo per la memoria.');
    els.title.classList.add('is-invalid');
    valid = false;
  } else if (titleWords.length > MAX_TITLE_WORDS) {
    showFieldError('title', `Il titolo può avere al massimo ${MAX_TITLE_WORDS} parole.`);
    els.title.classList.add('is-invalid');
    valid = false;
  } else {
    hideFieldError('title');
    els.title.classList.remove('is-invalid');
  }

  // 3. Theme tags required (1 to 3)
  if (state.themeTags.length === 0) {
    showFieldError('theme', 'Seleziona almeno un tag tematico (obbligatorio).');
    els.themeChips.classList.add('is-invalid');
    valid = false;
  } else {
    hideFieldError('theme');
    els.themeChips.classList.remove('is-invalid');
  }

  // 4. Location tag required (single select)
  if (!state.locationTag) {
    showFieldError('location', 'Seleziona il luogo della casa (obbligatorio).');
    els.locationChips.classList.add('is-invalid');
    valid = false;
  } else {
    hideFieldError('location');
    els.locationChips.classList.remove('is-invalid');
  }

  // 5. Date validation (optional, but must be valid if entered)
  const dateResult = getDateValue();
  if (!dateResult.valid) {
    showFieldError('date', dateResult.message);
    els.dateSegmented.classList.add('is-invalid');
    valid = false;
  } else {
    hideFieldError('date');
    els.dateSegmented.classList.remove('is-invalid');
  }

  // 6. Privacy consent required
  if (!els.privacyConsent.checked) {
    showFieldError('consent', 'Conferma il consenso per poter inviare il ricordo.');
    els.fieldConsent.classList.add('is-invalid');
    valid = false;
  } else {
    hideFieldError('consent');
    els.fieldConsent.classList.remove('is-invalid');
  }

  if (!valid) {
    // Scroll to the first error
    const firstError = els.form.querySelector('.field__error:not([hidden])');
    if (firstError) {
      firstError.closest('.field')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return valid;
}

async function submitMemory() {
  hideSubmitError();
  setLoading(true);

  try {
    // U1: attende l'alleggerimento del modello 3D ancora in corso
    if (state.modelJob) await state.modelJob;
    if (state.mediaType === 'model3d' && state.file && state.file.size > MAX_UPLOAD_BYTES) {
      throw new Error('size: modello 3D oltre 10 MB');
    }
    let fileToUpload = state.file;

    // In text mode, generate high-res text card image
    if (state.mode === 'text') {
      const quoteText = els.memoryQuote.value.trim();
      const cardTitle = els.title.value.trim();
      fileToUpload = await generateTextCardImage(quoteText, cardTitle);
    }

    // 1. Upload file to Supabase Storage
    const mediaUrl = await uploadFile(fileToUpload);
    const mediaType = state.mode === 'text' ? 'text' : state.mediaType;

    // 1b. Miniatura per il display: facoltativa, un errore qui non blocca l'invio
    let thumbUrl = null;
    try {
      const thumb = await makeThumb(fileToUpload, mediaType);
      if (thumb) thumbUrl = await uploadFile(thumb);
    } catch (err) {
      console.warn('[upload] miniatura non creata:', err);
    }

    // 2. Insert record into 'memories' table
    const dateResult = getDateValue();
    const record = {
      title: els.title.value.trim(),
      description: els.desc.value.trim() || null,
      tags: state.themeTags.length > 0 ? state.themeTags : null,
      location_tag: state.locationTag,
      time_event: dateResult.value,
      media_url: mediaUrl,
      thumb_url: thumbUrl,
      media_type: mediaType,
      privacy_consent: true,
    };

    await withRetry(async () => {
      const { error } = await supabase.from('memories').insert(record);
      if (error) throw error;
    });

    // 3. Show success
    if (memoryCount !== null) { memoryCount += 1; renderMemoryCount(); }
    showSuccess();
  } catch (err) {
    console.error('[upload] submit failed:', err);
    showSubmitError(err);
  } finally {
    setLoading(false);
  }
}

// Ritenta un'operazione di rete (Wi-Fi affollato all'evento): 3 tentativi, attesa crescente
async function withRetry(fn, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Errori di validazione lato server (4xx) non migliorano ritentando
      const status = Number(err?.statusCode || err?.status || 0);
      const code = String(err?.code || '');
      if ((status >= 400 && status < 500) || code.startsWith('23')) break;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

function showSubmitError(err) {
  const box = $('#submit-error');
  if (!box) return;
  const raw = String(err?.message || err || '');
  let msg = 'Invio non riuscito. Controlla la connessione e riprova.';
  if (/size|too large|exceeded/i.test(raw)) msg = 'Il file è troppo pesante (max 10 MB). Scegline uno più leggero.';
  else if (/mime|type/i.test(raw)) msg = 'Formato del file non accettato. Usa foto, video, audio o modelli .glb.';
  else if (/violates check|constraint/i.test(raw)) msg = 'Alcuni dati non sono validi. Controlla titolo, tag e luogo e riprova.';
  box.textContent = msg;
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideSubmitError() {
  const box = $('#submit-error');
  if (box) box.hidden = true;
}

const EXT_MIME = { glb: 'model/gltf-binary', gltf: 'model/gltf+json' };

async function uploadFile(file) {
  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const ext = file.name.split('.').pop().toLowerCase();
  const filePath = `${timestamp}_${random}.${ext}`;

  // I .glb spesso non hanno MIME dal browser: lo forziamo (il bucket accetta solo tipi noti)
  const contentType = EXT_MIME[ext] || file.type || 'application/octet-stream';

  await withRetry(async () => {
    const { error } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, { cacheControl: '31536000', upsert: false, contentType });
    // 409 = il tentativo precedente era già andato a buon fine (risposta persa)
    if (error && String(error.statusCode) !== '409') throw error;
  });

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

// Requirement 6: Simply disable button without spinners or text oscillations
function setLoading(loading) {
  els.btnSubmit.disabled = loading;
  // A2: etichetta statica durante l'invio (niente spinner)
  if (els.submitLabel) els.submitLabel.textContent = loading ? 'Invio in corso…' : 'Invia il ricordo';

  // Disable form interaction during upload
  const fields = els.form.querySelectorAll('input, textarea, button:not(#btn-submit)');
  fields.forEach((f) => (f.disabled = loading));
}

// ── Success Overlay ────────────────────────────────────────────
function bindSuccess() {
  els.btnNew.addEventListener('click', () => {
    hideSuccess();
    resetForm();
    goToStep('landing2');
  });
}

function showSuccess() {
  els.overlay.hidden = false;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      els.overlay.classList.add('is-visible');
    });
  });
}

function hideSuccess() {
  els.overlay.classList.remove('is-visible');
  setTimeout(() => {
    els.overlay.hidden = true;
  }, 450);
}

function resetForm() {
  // Clear file & previews
  clearFile();

  // Reset media mode to 'file'
  setMediaMode('file');

  // Clear text fields
  els.memoryQuote.value = '';
  els.quoteCounter.textContent = '0 / 280';
  els.title.value = '';
  els.titleCounter.textContent = `0 / ${MAX_TITLE_WORDS}`;
  els.titleCounter.classList.remove('is-over');
  els.title.classList.remove('is-invalid');
  els.desc.value = '';

  // Clear segmented date
  els.dateYear.value = '';
  els.dateMonth.value = '';
  els.dateDay.value = '';
  els.dateSegmented.classList.remove('is-invalid');

  // Clear tags
  state.themeTags = [];
  state.locationTag = null;
  $$('#theme-chips .chip').forEach((c) => {
    c.classList.remove('is-selected', 'is-disabled');
  });
  $$('#location-chips .chip').forEach((c) => {
    c.classList.remove('is-selected');
  });
  els.themeChips.classList.remove('is-invalid');
  els.locationChips.classList.remove('is-invalid');

  // Clear consent
  els.privacyConsent.checked = false;
  els.fieldConsent.classList.remove('is-invalid');
  els.btnSubmit.disabled = false;

  // Clear errors
  hideFieldError('file');
  hideFieldError('title');
  hideFieldError('theme');
  hideFieldError('location');
  hideFieldError('date');
  hideFieldError('consent');
}

// ── Helpers ────────────────────────────────────────────────────
function getWords(str) {
  return str.trim().split(/\s+/).filter(Boolean);
}

function showFieldError(field, message) {
  const el = $(`#error-${field}`);
  if (el) {
    el.textContent = message;
    el.hidden = false;
  }
}

function hideFieldError(field) {
  const el = $(`#error-${field}`);
  if (el) el.hidden = true;
}

// ── Boot ───────────────────────────────────────────────────────
init();
