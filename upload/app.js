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
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB raw input limit
const MAX_TITLE_WORDS = 5;
const MAX_THEME_TAGS = 3;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4'];

// ── State ──────────────────────────────────────────────────────
const state = {
  file: null,           // processed File ready for upload
  originalFile: null,   // original File from input
  mediaType: null,      // 'image' | 'audio'
  themeTags: [],        // string[]  (max 3)
  locationTag: null,    // string | null
};

// ── DOM References ─────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  // Steps
  stepOverview: $('#step-overview'),
  stepForm:     $('#step-form'),

  // Navigation
  btnStart: $('#btn-start'),
  btnBack:  $('#btn-back'),

  // Dropzone
  dropzone:         $('#dropzone'),
  dropzoneEmpty:    $('#dropzone-empty'),
  dropzonePreview:  $('#dropzone-preview'),
  fileInput:        $('#file-input'),
  previewImg:       $('#preview-img'),
  previewAudioWrap: $('#preview-audio-wrap'),
  previewAudio:     $('#preview-audio'),
  previewAudioName: $('#preview-audio-name'),
  btnRemoveFile:    $('#btn-remove-file'),
  errorFile:        $('#error-file'),

  // Form fields
  form:           $('#memory-form'),
  title:          $('#memory-title'),
  titleCounter:   $('#title-counter'),
  errorTitle:     $('#error-title'),
  desc:           $('#memory-desc'),
  themeChips:     $('#theme-chips'),
  locationChips:  $('#location-chips'),
  timeEvent:      $('#memory-time'),
  privacyConsent: $('#privacy-consent'),

  // Submit
  btnSubmit:    $('#btn-submit'),
  submitLabel:  $('#submit-label'),
  submitLoading:$('#submit-loading'),

  // Success
  overlay:    $('#success-overlay'),
  btnNew:     $('#btn-new'),
};

// ── Initialise ─────────────────────────────────────────────────
function init() {
  bindNavigation();
  bindDropzone();
  bindFormFields();
  bindSubmit();
  bindSuccess();
  console.log('[upload] app ready — supabase client loaded');
}

// ── Navigation ─────────────────────────────────────────────────
function bindNavigation() {
  els.btnStart.addEventListener('click', () => goToStep('form'));
  els.btnBack.addEventListener('click', () => goToStep('overview'));
}

function goToStep(target) {
  if (target === 'form') {
    els.stepOverview.className = 'step step--prev';
    els.stepForm.className = 'step step--active';
    els.stepForm.scrollTop = 0;
  } else {
    els.stepOverview.className = 'step step--active';
    els.stepForm.className = 'step step--next';
    els.stepOverview.scrollTop = 0;
  }
}

// ── Dropzone ───────────────────────────────────────────────────
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
  // Validate size
  if (file.size > MAX_UPLOAD_BYTES) {
    showFieldError('file', `Il file supera il limite di ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`);
    return;
  }

  hideFieldError('file');
  const isImage = IMAGE_TYPES.includes(file.type);
  const isAudio = AUDIO_TYPES.includes(file.type);

  if (!isImage && !isAudio) {
    showFieldError('file', 'Formato non supportato. Usa JPEG, PNG, WebP o un file audio.');
    return;
  }

  state.originalFile = file;
  state.mediaType = isImage ? 'image' : 'audio';

  if (isImage) {
    try {
      state.file = await compressImage(file);
      showImagePreview(state.file);
    } catch (err) {
      console.error('[upload] image compression failed:', err);
      showFieldError('file', 'Errore nella compressione dell\'immagine.');
      return;
    }
  } else {
    state.file = file;
    showAudioPreview(file);
  }

  // Update dropzone appearance
  els.dropzone.classList.add('has-file');
  els.dropzoneEmpty.hidden = true;
  els.dropzonePreview.hidden = false;
}

function clearFile() {
  state.file = null;
  state.originalFile = null;
  state.mediaType = null;

  els.fileInput.value = '';
  els.dropzone.classList.remove('has-file');
  els.dropzoneEmpty.hidden = false;
  els.dropzonePreview.hidden = true;
  els.previewImg.src = '';
  els.previewImg.hidden = true;
  els.previewAudioWrap.hidden = true;
  els.previewAudio.src = '';
  els.previewAudioName.textContent = '';
  hideFieldError('file');
}

function showImagePreview(file) {
  const url = URL.createObjectURL(file);
  els.previewImg.src = url;
  els.previewImg.hidden = false;
  els.previewAudioWrap.hidden = true;
}

function showAudioPreview(file) {
  const url = URL.createObjectURL(file);
  els.previewAudio.src = url;
  els.previewAudioName.textContent = file.name;
  els.previewAudioWrap.hidden = false;
  els.previewImg.hidden = true;
}

// ── Image Compression ──────────────────────────────────────────
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
              const ext = blob.type === 'image/webp' ? 'webp' : 'jpeg';
              const compressed = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, `.${ext}`),
                { type: blob.type }
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
    }
  });

  // Privacy consent → enable/disable submit
  els.privacyConsent.addEventListener('change', () => {
    els.btnSubmit.disabled = !els.privacyConsent.checked;
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

  // File required
  if (!state.file) {
    showFieldError('file', 'Seleziona un file da caricare.');
    valid = false;
  }

  // Title required & max words
  const titleWords = getWords(els.title.value);
  if (titleWords.length === 0) {
    showFieldError('title', 'Inserisci un titolo per la memoria.');
    els.title.classList.add('is-invalid');
    valid = false;
  } else if (titleWords.length > MAX_TITLE_WORDS) {
    showFieldError('title', `Il titolo può avere al massimo ${MAX_TITLE_WORDS} parole.`);
    els.title.classList.add('is-invalid');
    valid = false;
  }

  // Privacy consent
  if (!els.privacyConsent.checked) {
    valid = false;
  }

  return valid;
}

async function submitMemory() {
  setLoading(true);

  try {
    // 1. Upload file to Supabase Storage
    const mediaUrl = await uploadFile(state.file);

    // 2. Insert record into 'memories' table
    const record = {
      title: els.title.value.trim(),
      description: els.desc.value.trim() || null,
      tags: state.themeTags.length > 0 ? state.themeTags : null,
      location_tag: state.locationTag,
      time_event: els.timeEvent.value.trim() || null,
      media_url: mediaUrl,
      media_type: state.mediaType,
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
      contentType: file.type,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

function setLoading(loading) {
  els.btnSubmit.disabled = loading;
  els.submitLabel.hidden = loading;
  els.submitLoading.hidden = !loading;

  // Disable form interaction during upload
  const fields = els.form.querySelectorAll('input, textarea, button:not(#btn-submit)');
  fields.forEach((f) => (f.disabled = loading));
}

// ── Success Overlay ────────────────────────────────────────────
function bindSuccess() {
  els.btnNew.addEventListener('click', () => {
    hideSuccess();
    resetForm();
    goToStep('overview');
  });
}

function showSuccess() {
  els.overlay.hidden = false;
  // Trigger CSS transition (need a frame for hidden→visible)
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
  }, 450); // match CSS transition
}

function resetForm() {
  // Clear file
  clearFile();

  // Clear text fields
  els.title.value = '';
  els.titleCounter.textContent = `0 / ${MAX_TITLE_WORDS}`;
  els.titleCounter.classList.remove('is-over');
  els.title.classList.remove('is-invalid');
  els.desc.value = '';
  els.timeEvent.value = '';

  // Clear tags
  state.themeTags = [];
  state.locationTag = null;
  $$('#theme-chips .chip').forEach((c) => {
    c.classList.remove('is-selected', 'is-disabled');
  });
  $$('#location-chips .chip').forEach((c) => {
    c.classList.remove('is-selected');
  });

  // Clear consent
  els.privacyConsent.checked = false;
  els.btnSubmit.disabled = true;

  // Clear errors
  hideFieldError('file');
  hideFieldError('title');
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
