// Optica - Client-Side In-Browser Media Enhancement Engine (Video & Image)

let ffmpeg = null;
let isEngineReady = false;
let currentMediaType = 'video'; // 'video' | 'image'
let selectedFile = null;
let originalMediaUrl = null;
let enhancedMediaUrl = null;
let isDraggingSlider = false;

// DOM Elements
const engineNotice = document.getElementById('engineNotice');
const engineStatusDot = document.getElementById('engineStatusDot');
const engineStatusText = document.getElementById('engineStatusText');

const tabVideo = document.getElementById('tabVideo');
const tabImage = document.getElementById('tabImage');

const uploadSection = document.getElementById('uploadSection');
const configSection = document.getElementById('configSection');
const progressSection = document.getElementById('progressSection');
const resultsSection = document.getElementById('resultsSection');

const dropZone = document.getElementById('dropZone');
const mediaFileInput = document.getElementById('mediaFileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const demoSampleBtn = document.getElementById('demoSampleBtn');
const changeVideoBtn = document.getElementById('changeVideoBtn');

const dropzoneHeading = document.getElementById('dropzoneHeading');
const dropzoneSub = document.getElementById('dropzoneSub');

const inputVideoPlayer = document.getElementById('inputVideoPlayer');
const inputImgPlayer = document.getElementById('inputImgPlayer');
const specRes = document.getElementById('specRes');
const specDurationLabel = document.getElementById('specDurationLabel');
const specDuration = document.getElementById('specDuration');
const specSize = document.getElementById('specSize');

const resCards = document.querySelectorAll('.res-pill');
const presetCards = document.querySelectorAll('.preset-pill');
const startProcessBtn = document.getElementById('startProcessBtn');

const resHead1 = document.getElementById('resHead1');
const resDims1 = document.getElementById('resDims1');
const resHead2 = document.getElementById('resHead2');
const resDims2 = document.getElementById('resDims2');
const resHead3 = document.getElementById('resHead3');
const resDims3 = document.getElementById('resDims3');
const resTag1 = document.getElementById('resTag1');

const progressBarFill = document.getElementById('progressBarFill');
const progressPct = document.getElementById('progressPct');
const progressEta = document.getElementById('progressEta');

const comparisonContainer = document.getElementById('comparisonContainer');
const originalLayer = document.getElementById('originalLayer');
const sliderHandle = document.getElementById('sliderHandle');
const comparisonOriginalVideo = document.getElementById('comparisonOriginalVideo');
const comparisonOriginalImg = document.getElementById('comparisonOriginalImg');
const enhancedVideoPlayer = document.getElementById('enhancedVideoPlayer');
const enhancedImgPlayer = document.getElementById('enhancedImgPlayer');
const enhancedLayerTag = document.getElementById('enhancedLayerTag');
const downloadMediaBtn = document.getElementById('downloadMediaBtn');
const restartBtn = document.getElementById('restartBtn');

const videoControlDock = document.getElementById('videoControlDock');
const syncPlayBtn = document.getElementById('syncPlayBtn');
const syncTimeline = document.getElementById('syncTimeline');
const syncTimeDisplay = document.getElementById('syncTimeDisplay');

// ==========================================
// 1. INITIALIZE FFMPEG.WASM FOR VIDEO
// ==========================================

async function initFFmpeg() {
  try {
    if (!window.FFmpegWASM) {
      throw new Error("FFmpeg.wasm script not loaded.");
    }

    const { FFmpeg } = window.FFmpegWASM;
    const { toBlobURL } = window.FFmpegUtil;

    ffmpeg = new FFmpeg();

    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg Wasm]:', message);
    });

    ffmpeg.on('progress', ({ progress, time }) => {
      if (currentMediaType === 'video') {
        const pct = Math.min(99, Math.max(0, Math.round(progress * 100)));
        progressBarFill.style.width = `${pct}%`;
        progressPct.textContent = `${pct}%`;
        const progressTrack = document.getElementById('progressTrack');
        if (progressTrack) progressTrack.setAttribute('aria-valuenow', pct);
        progressEta.textContent = `Rendering timestamp ${(time / 1000000).toFixed(1)}s`;
      }
    });

    if (engineStatusText) engineStatusText.textContent = 'Loading video processing core...';

    try {
      const coreBlob = await toBlobURL('ffmpeg-core.js', 'text/javascript');
      const wasmBlob = await toBlobURL('ffmpeg-core.wasm', 'application/wasm');
      await ffmpeg.load({ coreURL: coreBlob, wasmURL: wasmBlob });
    } catch (loadErr) {
      console.warn('Blob load failed, trying direct relative URLs:', loadErr);
      await ffmpeg.load({ coreURL: 'ffmpeg-core.js', wasmURL: 'ffmpeg-core.wasm' });
    }

    isEngineReady = true;
    if (engineStatusDot) engineStatusDot.className = 'status-dot';
    if (engineStatusText) engineStatusText.textContent = 'Engine Ready';
    console.log('✅ In-browser media processing engine ready!');
  } catch (err) {
    console.error('Failed to load FFmpeg.wasm:', err);
    if (engineStatusDot) engineStatusDot.className = 'status-dot error';
    if (engineStatusText) engineStatusText.textContent = `Wasm init error: ${err.message || err}`;
  }
}

// Start loading on page launch
window.addEventListener('DOMContentLoaded', initFFmpeg);

// ==========================================
// 2. MEDIA TYPE MODE SWITCHER
// ==========================================

function setMediaType(type) {
  currentMediaType = type;

  if (type === 'video') {
    tabVideo.classList.add('active');
    tabVideo.setAttribute('aria-selected', 'true');
    tabImage.classList.remove('active');
    tabImage.setAttribute('aria-selected', 'false');

    if (dropzoneHeading) dropzoneHeading.textContent = 'Select a video file to upscale';
    if (dropzoneSub) dropzoneSub.textContent = 'Drag & drop or browse from your device • MP4, MOV, WebM, MKV';
    if (selectFileBtn) selectFileBtn.textContent = 'Browse Video File';
    if (demoSampleBtn) demoSampleBtn.textContent = 'Try Demo Video';
    if (startProcessBtn) startProcessBtn.textContent = 'Enhance Video (Run on Device)';

    if (resHead1) resHead1.textContent = '2K QHD';
    if (resDims1) resDims1.textContent = '2560 × 1440';
    if (resHead2) resHead2.textContent = '4K UHD';
    if (resDims2) resDims2.textContent = '3840 × 2160';
    if (resHead3) resHead3.textContent = 'Double (2×)';
    if (resDims3) resDims3.textContent = 'Double Native';
    if (resTag1) resTag1.textContent = 'Recommended';
  } else {
    tabImage.classList.add('active');
    tabImage.setAttribute('aria-selected', 'true');
    tabVideo.classList.remove('active');
    tabVideo.setAttribute('aria-selected', 'false');

    if (dropzoneHeading) dropzoneHeading.textContent = 'Select an image to upscale & enhance';
    if (dropzoneSub) dropzoneSub.textContent = 'Drag & drop or browse from your device • PNG, JPG, WebP, AVIF, BMP';
    if (selectFileBtn) selectFileBtn.textContent = 'Browse Image File';
    if (demoSampleBtn) demoSampleBtn.textContent = 'Try Demo Image';
    if (startProcessBtn) startProcessBtn.textContent = 'Enhance Image (Run on Device)';

    if (resHead1) resHead1.textContent = '2× Super-Res';
    if (resDims1) resDims1.textContent = 'Double Resolution';
    if (resHead2) resHead2.textContent = '4× Ultra-HD';
    if (resDims2) resDims2.textContent = 'Quad Resolution';
    if (resHead3) resHead3.textContent = '1× Enhance Only';
    if (resDims3) resDims3.textContent = 'Native Clarity';
    if (resTag1) resTag1.textContent = 'Popular';
  }
}

if (tabVideo) tabVideo.addEventListener('click', () => setMediaType('video'));
if (tabImage) tabImage.addEventListener('click', () => setMediaType('image'));

// ==========================================
// 3. FILE SELECTION & DRAG-AND-DROP
// ==========================================

selectFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  mediaFileInput.click();
});

if (demoSampleBtn) {
  demoSampleBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    demoSampleBtn.disabled = true;
    const prevText = demoSampleBtn.textContent;
    demoSampleBtn.textContent = 'Loading sample…';

    try {
      if (currentMediaType === 'video') {
        const res = await fetch('sample.mp4');
        const blob = await res.blob();
        const sampleFile = new File([blob], 'demo_sample_720p.mp4', { type: 'video/mp4' });
        handleLocalFile(sampleFile);
      } else {
        const res = await fetch('sample.jpg');
        const blob = await res.blob();
        const sampleFile = new File([blob], 'demo_sample_texture.jpg', { type: 'image/jpeg' });
        handleLocalFile(sampleFile);
      }
    } catch (err) {
      console.error('Failed to load sample:', err);
    } finally {
      demoSampleBtn.disabled = false;
      demoSampleBtn.textContent = prevText;
    }
  });
}

dropZone.addEventListener('click', () => {
  mediaFileInput.click();
});

dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    mediaFileInput.click();
  }
});

mediaFileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handleLocalFile(e.target.files[0]);
  }
});

['dragenter', 'dragover'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
  });
});

['dragleave', 'drop'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
  });
});

dropZone.addEventListener('drop', (e) => {
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleLocalFile(e.dataTransfer.files[0]);
  }
});

function handleLocalFile(file) {
  selectedFile = file;
  originalMediaUrl = URL.createObjectURL(file);

  // Auto-detect whether dropped file is image or video
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|avif|bmp|tiff)$/i.test(file.name);
  if (isImage) {
    setMediaType('image');
    inputVideoPlayer.pause();
    inputVideoPlayer.classList.add('hidden');
    inputImgPlayer.classList.remove('hidden');
    inputImgPlayer.src = originalMediaUrl;

    if (specDurationLabel) specDurationLabel.textContent = 'Format';
    const ext = file.name.split('.').pop().toUpperCase();
    specDuration.textContent = file.type ? file.type.split('/')[1].toUpperCase() : ext;
    specSize.textContent = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
      : `${(file.size / 1024).toFixed(1)} KB`;

    inputImgPlayer.onload = () => {
      specRes.textContent = `${inputImgPlayer.naturalWidth} × ${inputImgPlayer.naturalHeight}`;
      setResolution('2k'); // 2x default for image
    };

  } else {
    setMediaType('video');
    inputImgPlayer.classList.add('hidden');
    inputVideoPlayer.classList.remove('hidden');
    inputVideoPlayer.src = originalMediaUrl;

    if (specDurationLabel) specDurationLabel.textContent = 'Duration';
    specSize.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    inputVideoPlayer.onloadedmetadata = () => {
      specRes.textContent = `${inputVideoPlayer.videoWidth} × ${inputVideoPlayer.videoHeight}`;
      specDuration.textContent = formatDuration(inputVideoPlayer.duration);

      if (inputVideoPlayer.videoWidth >= 1920) {
        setResolution('4k');
      } else {
        setResolution('2k');
      }
    };
  }

  uploadSection.classList.add('hidden');
  configSection.classList.remove('hidden');
}

changeVideoBtn.addEventListener('click', () => {
  inputVideoPlayer.pause();
  inputVideoPlayer.src = '';
  inputImgPlayer.src = '';
  configSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
  mediaFileInput.value = '';
  selectedFile = null;
});

// ==========================================
// 4. RESOLUTION & PRESETS
// ==========================================

function setResolution(resVal) {
  resCards.forEach(card => {
    const radio = card.querySelector('input');
    if (radio.value === resVal) {
      radio.checked = true;
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

resCards.forEach(card => {
  card.addEventListener('click', () => {
    resCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    card.querySelector('input').checked = true;
  });
});

presetCards.forEach(card => {
  card.addEventListener('click', () => {
    presetCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    card.querySelector('input').checked = true;
  });
});

// ==========================================
// 5. MATHEMATICAL DSP IMAGE FILTER PIPELINE
// (AMD FidelityFX CAS & Sinc Interpolation)
// ==========================================

function applyContrastAdaptiveSharpening(srcImageData, sharpness = 0.85) {
  const w = srcImageData.width;
  const h = srcImageData.height;
  const src = srcImageData.data;
  const output = new ImageData(w, h);
  const dst = output.data;

  // Copy alpha channel & boundary pixels
  for (let i = 0; i < src.length; i += 4) {
    dst[i]     = src[i];
    dst[i + 1] = src[i + 1];
    dst[i + 2] = src[i + 2];
    dst[i + 3] = src[i + 3];
  }

  // Clamped CAS kernel (AMD FidelityFX Contrast Adaptive Sharpening)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;

      for (let c = 0; c < 3; c++) {
        const center = src[idx + c];
        const top    = src[((y - 1) * w + x) * 4 + c];
        const bottom = src[((y + 1) * w + x) * 4 + c];
        const left   = src[(y * w + (x - 1)) * 4 + c];
        const right  = src[(y * w + (x + 1)) * 4 + c];

        const minVal = Math.min(center, top, bottom, left, right);
        const maxVal = Math.max(center, top, bottom, left, right);

        // Adaptive weighting bounded strictly to avoid negative norm / ringing
        const amp = Math.min(minVal, 255 - maxVal) / 255;
        const wWeight = -Math.min(0.18, Math.max(0.02, sharpness * (0.05 + 0.12 * amp)));

        const sum = (top + bottom + left + right) * wWeight + center;
        const norm = 1.0 + 4.0 * wWeight;
        const res = sum / norm;

        dst[idx + c] = Math.min(255, Math.max(0, Math.round(res)));
      }
    }
  }

  return output;
}

function applyToneAndVibrance(imageData, contrast = 1.04, saturation = 1.05) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Linear contrast centered around midtone 128
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    // Vibrance & color saturation
    const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
    r = gray + saturation * (r - gray);
    g = gray + saturation * (g - gray);
    b = gray + saturation * (b - gray);

    data[i]     = Math.min(255, Math.max(0, Math.round(r)));
    data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
    data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
  }

  return imageData;
}

// ==========================================
// TOAST NOTIFICATIONS (No blocking alerts)
// ==========================================

function showErrorToast(message) {
  const existing = document.getElementById('opticaToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'opticaToast';
  toast.className = 'optica-toast';
  
  const content = document.createElement('div');
  content.className = 'toast-content';
  content.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span>${message}</span>
  `;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  closeBtn.onclick = () => toast.remove();

  toast.appendChild(content);
  toast.appendChild(closeBtn);
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 6000);
}

// ==========================================
// 6. ENHANCEMENT EXECUTION
// ==========================================

startProcessBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  const isImage = currentMediaType === 'image';
  const resModeInput = document.querySelector('input[name="resMode"]:checked');
  const presetInput = document.querySelector('input[name="preset"]:checked');
  const resMode = resModeInput ? resModeInput.value : '2k';
  const preset = presetInput ? presetInput.value : 'cinematic';

  inputVideoPlayer.pause();
  configSection.classList.add('hidden');
  progressSection.classList.remove('hidden');
  progressBarFill.style.width = '0%';
  progressPct.textContent = '0%';

  if (isImage) {
    // ----------------------------------------
    // ULTRA-FAST MATHEMATICAL IMAGE PIPELINE
    // ----------------------------------------
    progressEta.textContent = 'Decoding source image in memory…';
    progressBarFill.style.width = '20%';
    progressPct.textContent = '20%';

    try {
      // 1. Asynchronously load and decode image to ensure natural dimensions
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Image failed to decode in browser memory.'));
        image.src = originalMediaUrl;
      });

      const origW = img.naturalWidth || img.width || 800;
      const origH = img.naturalHeight || img.height || 600;
      const { targetW, targetH } = calculateTargetDimensions(origW, origH, resMode, true);

      progressEta.textContent = `Executing high-order sinc resampling to ${targetW} × ${targetH}…`;
      progressBarFill.style.width = '45%';
      progressPct.textContent = '45%';
      await new Promise(r => setTimeout(r, 40));

      // 2. Offscreen High-Precision Sinc Canvas Resampling
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, targetW, targetH);

      progressBarFill.style.width = '70%';
      progressPct.textContent = '70%';
      progressEta.textContent = 'Applying AMD FidelityFX Contrast Adaptive Sharpening (CAS)…';
      await new Promise(r => setTimeout(r, 40));

      // 3. Extract ImageData & Apply CAS Filter + Tone Tuning
      const rawData = ctx.getImageData(0, 0, targetW, targetH);
      let sharpness = 0.85;
      let contrast = 1.04;
      let saturation = 1.05;

      if (preset === 'ultra_sharp') {
        sharpness = 1.25;
        contrast = 1.03;
        saturation = 1.03;
      } else if (preset === 'vivid_hdr') {
        sharpness = 0.75;
        contrast = 1.08;
        saturation = 1.14;
      }

      const casData = applyContrastAdaptiveSharpening(rawData, sharpness);
      const tunedData = applyToneAndVibrance(casData, contrast, saturation);

      ctx.putImageData(tunedData, 0, 0);

      progressBarFill.style.width = '90%';
      progressPct.textContent = '90%';
      progressEta.textContent = 'Mastering enhanced image output…';
      await new Promise(r => setTimeout(r, 40));

      const isPng = selectedFile.name.toLowerCase().endsWith('.png');
      const mime = isPng ? 'image/png' : 'image/jpeg';
      const quality = isPng ? undefined : 0.96;

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas export failed to produce image blob.'));
        }, mime, quality);
      });

      enhancedMediaUrl = URL.createObjectURL(blob);
      progressBarFill.style.width = '100%';
      progressPct.textContent = '100%';
      progressEta.textContent = 'Enhancement complete!';

      setTimeout(() => {
        displayResultsView(resMode);
      }, 160);

    } catch (err) {
      console.error('Image enhancement error:', err);
      const msg = err?.message || String(err) || 'Failed to enhance image';
      showErrorToast(`Image error: ${msg}`);
      progressSection.classList.add('hidden');
      configSection.classList.remove('hidden');
    }

  } else {
    // ----------------------------------------
    // VIDEO ENHANCEMENT PIPELINE (WASM)
    // ----------------------------------------
    if (!isEngineReady) {
      const originalBtnText = startProcessBtn.innerHTML;
      startProcessBtn.disabled = true;
      startProcessBtn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span><span>Initializing Video Engine…</span>`;
      
      let waited = 0;
      while (!isEngineReady && waited < 25) {
        await new Promise(r => setTimeout(r, 600));
        waited++;
      }

      if (!isEngineReady) {
        startProcessBtn.disabled = false;
        startProcessBtn.innerHTML = originalBtnText;
        showErrorToast('Video engine is still initializing. Please wait a few seconds and try again.');
        progressSection.classList.add('hidden');
        configSection.classList.remove('hidden');
        return;
      }

      startProcessBtn.innerHTML = originalBtnText;
      startProcessBtn.disabled = false;
    }

    progressEta.textContent = 'Reading local video into browser memory...';

    const origW = inputVideoPlayer.videoWidth || 1280;
    const origH = inputVideoPlayer.videoHeight || 720;
    const { targetW, targetH } = calculateTargetDimensions(origW, origH, resMode, false);

    const filters = [];
    if (preset === 'ultra_sharp') {
      filters.push(`scale=${targetW}:${targetH}:flags=lanczos`);
      filters.push('unsharp=lx=5:ly=5:la=1.2:cx=3:cy=3:ca=0.6');
      filters.push('eq=contrast=1.02:saturation=1.03');
    } else if (preset === 'vivid_hdr') {
      filters.push(`scale=${targetW}:${targetH}:flags=lanczos`);
      filters.push('unsharp=lx=5:ly=5:la=0.7');
      filters.push('eq=contrast=1.07:brightness=0.01:saturation=1.12');
    } else {
      // Cinematic Remaster
      filters.push(`scale=${targetW}:${targetH}:flags=lanczos`);
      filters.push('unsharp=lx=5:ly=5:la=0.8:cx=3:cy=3:ca=0.4');
      filters.push('eq=contrast=1.04:saturation=1.06');
    }
    filters.push('format=yuv420p');
    const filterStr = filters.join(',');

    try {
      const { fetchFile } = window.FFmpegUtil;

      // Clean up any stale files from previous runs
      try { await ffmpeg.deleteFile('input_video'); } catch (e) {}
      try { await ffmpeg.deleteFile('output_enhanced.mp4'); } catch (e) {}

      progressEta.textContent = 'Writing video into WebAssembly virtual file system...';
      await ffmpeg.writeFile('input_video', await fetchFile(selectedFile));

      progressEta.textContent = 'Executing mathematical upscaler on your CPU...';
      await ffmpeg.exec([
        '-y',
        '-i', 'input_video',
        '-vf', filterStr,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '20',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        'output_enhanced.mp4'
      ]);

      progressBarFill.style.width = '100%';
      progressPct.textContent = '100%';
      progressEta.textContent = 'Complete! Creating video player...';

      const outputData = await ffmpeg.readFile('output_enhanced.mp4');
      const outputBlob = new Blob([outputData.buffer], { type: 'video/mp4' });
      enhancedMediaUrl = URL.createObjectURL(outputBlob);

      try {
        await ffmpeg.deleteFile('input_video');
        await ffmpeg.deleteFile('output_enhanced.mp4');
      } catch (e) {}

      setTimeout(() => {
        displayResultsView(resMode);
      }, 400);

    } catch (err) {
      console.error('Video enhancement error:', err);
      const msg = err?.message || (typeof err === 'number' ? `Engine exited with code ${err}` : String(err)) || 'Failed to process video';
      showErrorToast(`Video error: ${msg}`);
      progressSection.classList.add('hidden');
      configSection.classList.remove('hidden');
    }
  }
});

function calculateTargetDimensions(w, h, mode, isImage = false) {
  const isLandscape = w >= h;
  let targetW = 2560;
  let targetH = 1440;

  if (isImage) {
    if (mode === '4k' || mode === '4x') {
      targetW = Math.round(w * 4 / 2) * 2;
      targetH = Math.round(h * 4 / 2) * 2;
    } else if (mode === '1080p' || mode === '1x') {
      targetW = Math.round(w / 2) * 2;
      targetH = Math.round(h / 2) * 2;
    } else {
      // 2k or 2x default for image
      targetW = Math.round(w * 2 / 2) * 2;
      targetH = Math.round(h * 2 / 2) * 2;
    }
    return { targetW, targetH };
  }

  if (mode === '2k') {
    if (isLandscape) {
      targetH = 1440;
      targetW = Math.round((w * targetH) / h / 2) * 2;
    } else {
      targetW = 1440;
      targetH = Math.round((h * targetW) / w / 2) * 2;
    }
  } else if (mode === '4k') {
    if (isLandscape) {
      targetH = 2160;
      targetW = Math.round((w * targetH) / h / 2) * 2;
    } else {
      targetW = 2160;
      targetH = Math.round((h * targetW) / w / 2) * 2;
    }
  } else if (mode === '1080p') {
    if (isLandscape) {
      targetH = 1080;
      targetW = Math.round((w * targetH) / h / 2) * 2;
    } else {
      targetW = 1080;
      targetH = Math.round((h * targetW) / w / 2) * 2;
    }
  } else if (mode === '2x') {
    targetW = Math.round(w * 2 / 2) * 2;
    targetH = Math.round(h * 2 / 2) * 2;
  } else if (mode === '4x') {
    targetW = Math.round(w * 4 / 2) * 2;
    targetH = Math.round(h * 4 / 2) * 2;
  } else if (mode === '1x') {
    targetW = Math.round(w / 2) * 2;
    targetH = Math.round(h / 2) * 2;
  }

  return { targetW, targetH };
}

// ==========================================
// 7. RESULTS & BEFORE / AFTER SLIDER
// ==========================================

function displayResultsView(resMode) {
  progressSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');

  const isImage = currentMediaType === 'image';

  if (isImage) {
    enhancedVideoPlayer.classList.add('hidden');
    comparisonOriginalVideo.classList.add('hidden');
    enhancedImgPlayer.classList.remove('hidden');
    comparisonOriginalImg.classList.remove('hidden');

    enhancedImgPlayer.src = enhancedMediaUrl;
    comparisonOriginalImg.src = originalMediaUrl;

    if (videoControlDock) videoControlDock.classList.add('hidden');
    if (enhancedLayerTag) enhancedLayerTag.textContent = `Enhanced Image (${resMode.toUpperCase()})`;

    downloadMediaBtn.href = enhancedMediaUrl;
    downloadMediaBtn.download = `Optica_${selectedFile.name}`;
    downloadMediaBtn.textContent = 'Download Enhanced Image';

  } else {
    enhancedImgPlayer.classList.add('hidden');
    comparisonOriginalImg.classList.add('hidden');
    enhancedVideoPlayer.classList.remove('hidden');
    comparisonOriginalVideo.classList.remove('hidden');

    enhancedVideoPlayer.src = enhancedMediaUrl;
    comparisonOriginalVideo.src = originalMediaUrl;

    if (videoControlDock) videoControlDock.classList.remove('hidden');
    if (enhancedLayerTag) enhancedLayerTag.textContent = `Enhanced Video (${resMode.toUpperCase()})`;

    downloadMediaBtn.href = enhancedMediaUrl;
    downloadMediaBtn.download = `Optica_${selectedFile.name}`;
    downloadMediaBtn.textContent = 'Download Enhanced Video';

    enhancedVideoPlayer.onloadedmetadata = () => {
      syncTimeline.max = enhancedVideoPlayer.duration || 100;
      updateTimeDisplay(0, enhancedVideoPlayer.duration);
    };
  }

  setSplitPosition(50);
}

let currentSplitPct = 50;

function setSplitPosition(pct) {
  currentSplitPct = Math.max(0, Math.min(100, pct));
  originalLayer.style.clipPath = `polygon(0 0, ${currentSplitPct}% 0, ${currentSplitPct}% 100%, 0 100%)`;
  sliderHandle.style.left = `${currentSplitPct}%`;
  if (comparisonContainer) {
    comparisonContainer.setAttribute('aria-valuenow', Math.round(currentSplitPct));
  }
}

function handleSplitMove(clientX) {
  const rect = comparisonContainer.getBoundingClientRect();
  const pct = ((clientX - rect.left) / rect.width) * 100;
  setSplitPosition(pct);
}

comparisonContainer.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    setSplitPosition(currentSplitPct - 3);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    setSplitPosition(currentSplitPct + 3);
  }
});

comparisonContainer.addEventListener('mousedown', (e) => {
  isDraggingSlider = true;
  handleSplitMove(e.clientX);
});

window.addEventListener('mousemove', (e) => {
  if (isDraggingSlider) handleSplitMove(e.clientX);
});

window.addEventListener('mouseup', () => { isDraggingSlider = false; });

comparisonContainer.addEventListener('touchstart', (e) => {
  isDraggingSlider = true;
  if (e.touches && e.touches[0]) handleSplitMove(e.touches[0].clientX);
}, { passive: true });

comparisonContainer.addEventListener('touchmove', (e) => {
  if (isDraggingSlider && e.touches && e.touches[0]) handleSplitMove(e.touches[0].clientX);
}, { passive: true });

window.addEventListener('touchend', () => { isDraggingSlider = false; });

// Synchronized video controls
syncPlayBtn.addEventListener('click', togglePlayPause);
comparisonContainer.addEventListener('click', () => {
  if (!isDraggingSlider && currentMediaType === 'video') togglePlayPause();
});

function togglePlayPause() {
  if (enhancedVideoPlayer.paused) {
    comparisonOriginalVideo.currentTime = enhancedVideoPlayer.currentTime;
    enhancedVideoPlayer.play();
    comparisonOriginalVideo.play();
  } else {
    enhancedVideoPlayer.pause();
    comparisonOriginalVideo.pause();
  }
}

enhancedVideoPlayer.addEventListener('timeupdate', () => {
  syncTimeline.value = enhancedVideoPlayer.currentTime;
  updateTimeDisplay(enhancedVideoPlayer.currentTime, enhancedVideoPlayer.duration);

  if (Math.abs(comparisonOriginalVideo.currentTime - enhancedVideoPlayer.currentTime) > 0.15) {
    comparisonOriginalVideo.currentTime = enhancedVideoPlayer.currentTime;
  }
});

syncTimeline.addEventListener('input', () => {
  const t = parseFloat(syncTimeline.value);
  enhancedVideoPlayer.currentTime = t;
  comparisonOriginalVideo.currentTime = t;
  updateTimeDisplay(t, enhancedVideoPlayer.duration);
});

function updateTimeDisplay(current, duration) {
  syncTimeDisplay.textContent = `${formatDuration(current)} / ${formatDuration(duration || 0)}`;
}

function formatDuration(sec) {
  if (isNaN(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

restartBtn.addEventListener('click', () => {
  if (currentMediaType === 'video') {
    enhancedVideoPlayer.pause();
    comparisonOriginalVideo.pause();
  }
  resultsSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
  mediaFileInput.value = '';
  selectedFile = null;
});
