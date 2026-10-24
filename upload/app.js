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

// ── Constants ──────────────────────────────────────────────────
const MAX_IMAGE_SIDE = 1920;
const IMAGE_QUALITY_START = 0.8;
const IMAGE_QUALITY_MIN = 0.3;
const IMAGE_QUALITY_STEP = 0.1;
const MAX_FILE_BYTES = 1024 * 1024;        // 1 MB target for images
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB strict limit for video, audio, 3D
const MAX_TITLE_WORDS = 5;
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
  stepLanding:  $('#step-landing'),
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

  // Success
  overlay:    $('#success-overlay'),
  btnNew:     $('#btn-new'),
};

// ── Initialise ─────────────────────────────────────────────────
function init() {
  bindNavigation();
  bindMediaSwitcher();
  bindDropzone();
  bindDateInput();
  bindFormFields();
  bindSubmit();
  bindSuccess();
  console.log('[upload] app ready — supabase client loaded');
}

// ── Navigation State & Logic ────────────────────────────────────
let currentStep = 'landing';
let previousStep = null;
let landingTimer = null;

function bindNavigation() {
  // 1. Landing -> Landing 2 automatic timer after 2 seconds (2000ms)
  landingTimer = setTimeout(() => {
    if (currentStep === 'landing') {
      goToStep('landing2', { fade: true });
    }
  }, 2000);

  // Skip landing immediately on tap / click
  if (els.stepLanding) {
    els.stepLanding.addEventListener('click', () => {
      if (currentStep === 'landing') {
        if (landingTimer) clearTimeout(landingTimer);
        goToStep('landing2', { fade: true });
      }
    });
  }

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

function goToStep(target, options = {}) {
  if (target === currentStep) return;

  const steps = {
    landing:  els.stepLanding,
    landing2: els.stepLanding2,
    info:     els.stepInfo,
    form:     els.stepForm,
  };

  const oldStepEl = steps[currentStep];
  const newStepEl = steps[target];
  if (!newStepEl) return;

  // Fade transition between landing and landing2
  if (currentStep === 'landing' && target === 'landing2' && options.fade) {
    if (landingTimer) clearTimeout(landingTimer);

    newStepEl.className = 'step step--landing2 step--fade-in';
    oldStepEl.className = 'step step--landing step--fade-out';

    setTimeout(() => {
      oldStepEl.className = 'step step--landing step--prev';
      newStepEl.className = 'step step--landing2 step--active';
    }, 700);

    previousStep = currentStep;
    currentStep = target;
    return;
  }

  // Step directional order for slide transitions
  const order = { landing: 0, landing2: 1, info: 2, form: 3 };
  const goingForward = (order[target] ?? 0) >= (order[currentStep] ?? 0);

  if (oldStepEl) {
    oldStepEl.className = `step step--${currentStep} ${goingForward ? 'step--prev' : 'step--next'}`;
  }

  newStepEl.className = `step step--${target} step--active`;
  newStepEl.scrollTop = 0;

  previousStep = currentStep;
  currentStep = target;
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

  // Strict limit of 10 MB for video, audio, 3D
  if (file.size > MAX_UPLOAD_BYTES) {
    showFieldError('file', `Il file supera il limite massimo di ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`);
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

function clearFile() {
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

// ── Segmented Date Input (AAAA - MM - GG) ─────────────────────
function bindDateInput() {
  const y = els.dateYear;
  const m = els.dateMonth;
  const d = els.dateDay;
  const container = els.dateSegmented;

  if (!y || !m || !d || !container) return;

  const segments = [y, m, d];

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
      els.dateYear.value = digits.slice(0, 4);
      els.dateMonth.value = digits.slice(4, 6);
      els.dateDay.value = digits.slice(6, 8);
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
    return { valid: false, message: 'Completa tutti i campi della data (AAAA-MM-GG).' };
  }

  const yearNum = parseInt(y, 10);
  const monthNum = parseInt(m, 10);
  const dayNum = parseInt(d, 10);

  if (yearNum < 1900 || yearNum > 2100) {
    return { valid: false, message: 'Inserisci un anno valido tra il 1900 e il 2100.' };
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

      // Iteratively compress until under MAX_FILE_BYTES
      const tryCompress = (quality) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob returned null'));
              return;
            }
            if (blob.size > MAX_FILE_BYTES && quality > IMAGE_QUALITY_MIN) {
              tryCompress(quality - IMAGE_QUALITY_STEP);
            } else {
              const compressed = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, '.webp'),
                { type: 'image/webp' }
              );
              resolve(compressed);
            }
          },
          'image/webp',
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

// ── Canvas Text Card Image Generator ───────────────────────────
function generateTextCardImage(text, title = '') {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Background: light cream (panna chiaro)
    ctx.fillStyle = '#F9F6F0';
    ctx.fillRect(0, 0, 1200, 800);

    // Outer border
    ctx.strokeStyle = '#EADBCE';
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, 1160, 760);

    // Inner subtle hairline
    ctx.strokeStyle = 'rgba(153, 37, 28, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(38, 38, 1124, 724);

    // Header badge
    ctx.fillStyle = '#99251C';
    ctx.font = '700 20px "Instrument Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('// MEMORIA TESTUALE · STOÀ', 72, 72);

    // Decorative quote mark
    ctx.fillStyle = 'rgba(153, 37, 28, 0.25)';
    ctx.font = 'italic 400 140px "Instrument Serif", Georgia, serif';
    ctx.fillText('“', 70, 115);

    // Main quote text wrapping in Instrument Serif (italic editorial)
    ctx.fillStyle = '#99251C';
    ctx.font = 'italic 400 52px "Instrument Serif", Georgia, serif';
    const maxWidth = 1040;
    const lineHeight = 66;
    const x = 72;
    let y = 230;

    const words = text.split(/\s+/);
    let line = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = line + (line ? ' ' : '') + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, y);
        line = words[i];
        y += lineHeight;
        if (y > 640) {
          line += '…';
          break;
        }
      } else {
        line = testLine;
      }
    }
    if (line && y <= 640) {
      ctx.fillText(line, x, y);
    }

    // Title footer in Instrument Sans Bold
    if (title) {
      ctx.fillStyle = 'rgba(153, 37, 28, 0.70)';
      ctx.font = '700 22px "Instrument Sans", sans-serif';
      ctx.fillText(title.toUpperCase(), 72, 715);
    }

    // Export to WebP blob
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'));
          return;
        }
        const file = new File([blob], `text_card_${Date.now()}.webp`, { type: 'image/webp' });
        resolve(file);
      },
      'image/webp',
      0.92
    );
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
  setLoading(true);

  try {
    let fileToUpload = state.file;

    // In text mode, generate high-res text card image
    if (state.mode === 'text') {
      const quoteText = els.memoryQuote.value.trim();
      const cardTitle = els.title.value.trim();
      fileToUpload = await generateTextCardImage(quoteText, cardTitle);
    }

    // 1. Upload file to Supabase Storage
    const mediaUrl = await uploadFile(fileToUpload);

    // 2. Insert record into 'memories' table
    const dateResult = getDateValue();
    const record = {
      title: els.title.value.trim(),
      description: els.desc.value.trim() || null,
      tags: state.themeTags.length > 0 ? state.themeTags : null,
      location_tag: state.locationTag,
      time_event: dateResult.value,
      media_url: mediaUrl,
      media_type: state.mode === 'text' ? 'text' : state.mediaType,
      privacy_consent: true,
    };

    const { error } = await supabase.from('memories').insert(record);
    if (error) throw error;

    // 3. Show success
    showSuccess();
  } catch (err) {
    console.error('[upload] submit failed:', err);
    alert(`Errore durante l'invio: ${err.message || err}`);
  } finally {
    setLoading(false);
  }
}

async function uploadFile(file) {
  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const ext = file.name.split('.').pop().toLowerCase();
  const filePath = `${timestamp}_${random}.${ext}`;

  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

// Requirement 6: Simply disable button without spinners or text oscillations
function setLoading(loading) {
  els.btnSubmit.disabled = loading;

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
