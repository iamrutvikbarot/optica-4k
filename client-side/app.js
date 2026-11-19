// Optica 4K - Client-Side In-Browser Video Enhancement Engine

let ffmpeg = null;
let isEngineReady = false;
let selectedFile = null;
let originalVideoUrl = null;
let enhancedVideoUrl = null;
let isDraggingSlider = false;

// DOM Elements
const engineNotice = document.getElementById('engineNotice');
const engineStatusDot = document.getElementById('engineStatusDot');
const engineStatusText = document.getElementById('engineStatusText');

const uploadSection = document.getElementById('uploadSection');
const configSection = document.getElementById('configSection');
const progressSection = document.getElementById('progressSection');
const resultsSection = document.getElementById('resultsSection');

const dropZone = document.getElementById('dropZone');
const videoFileInput = document.getElementById('videoFileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const demoSampleBtn = document.getElementById('demoSampleBtn');
const changeVideoBtn = document.getElementById('changeVideoBtn');

const inputVideoPlayer = document.getElementById('inputVideoPlayer');
const specRes = document.getElementById('specRes');
const specDuration = document.getElementById('specDuration');
const specSize = document.getElementById('specSize');

const resCards = document.querySelectorAll('.res-pill');
const presetCards = document.querySelectorAll('.preset-pill');
const startProcessBtn = document.getElementById('startProcessBtn');

const progressBarFill = document.getElementById('progressBarFill');
const progressPct = document.getElementById('progressPct');
const progressEta = document.getElementById('progressEta');

const comparisonContainer = document.getElementById('comparisonContainer');
const originalLayer = document.getElementById('originalLayer');
const sliderHandle = document.getElementById('sliderHandle');
const comparisonOriginalVideo = document.getElementById('comparisonOriginalVideo');
const enhancedVideoPlayer = document.getElementById('enhancedVideoPlayer');
const downloadVideoBtn = document.getElementById('downloadVideoBtn');
const restartBtn = document.getElementById('restartBtn');

const syncPlayBtn = document.getElementById('syncPlayBtn');
const syncTimeline = document.getElementById('syncTimeline');
const syncTimeDisplay = document.getElementById('syncTimeDisplay');

// ==========================================
// 1. INITIALIZE FFMPEG.WASM IN BROWSER
// ==========================================

async function initFFmpeg() {
  try {
    if (!window.FFmpegWASM) {
      throw new Error("FFmpeg.wasm script not loaded from CDN.");
    }

    const { FFmpeg } = window.FFmpegWASM;
    const { toBlobURL } = window.FFmpegUtil;

    ffmpeg = new FFmpeg();

    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg Wasm]:', message);
    });

    ffmpeg.on('progress', ({ progress, time }) => {
      const pct = Math.min(99, Math.max(0, Math.round(progress * 100)));
      progressBarFill.style.width = `${pct}%`;
      progressPct.textContent = `${pct}%`;
      const progressTrack = document.getElementById('progressTrack');
      if (progressTrack) progressTrack.setAttribute('aria-valuenow', pct);
      progressEta.textContent = `Rendering timestamp ${(time / 1000000).toFixed(1)}s`;
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
    console.log('✅ In-browser video processing engine ready!');
  } catch (err) {
    console.error('Failed to load FFmpeg.wasm:', err);
    if (engineStatusDot) engineStatusDot.className = 'status-dot error';
    if (engineStatusText) engineStatusText.textContent = `Wasm init error: ${err.message || err}`;
  }
}

// Start loading on page launch
window.addEventListener('DOMContentLoaded', initFFmpeg);

// ==========================================
// 2. FILE SELECTION (LOCAL ONLY)
// ==========================================

selectFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  videoFileInput.click();
});

if (demoSampleBtn) {
  demoSampleBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    demoSampleBtn.disabled = true;
    const prevText = demoSampleBtn.textContent;
    demoSampleBtn.textContent = 'Loading sample…';

    try {
      const res = await fetch('sample.mp4');
      const blob = await res.blob();
      const sampleFile = new File([blob], 'demo_sample_720p.mp4', { type: 'video/mp4' });
      handleLocalVideo(sampleFile);
    } catch (err) {
      console.error('Failed to load sample:', err);
    } finally {
      demoSampleBtn.disabled = false;
      demoSampleBtn.textContent = prevText;
    }
  });
}

dropZone.addEventListener('click', () => {
  videoFileInput.click();
});

dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    videoFileInput.click();
  }
});

videoFileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handleLocalVideo(e.target.files[0]);
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
    handleLocalVideo(e.dataTransfer.files[0]);
  }
});

function handleLocalVideo(file) {
  selectedFile = file;
  originalVideoUrl = URL.createObjectURL(file);

  // Populate preview
  inputVideoPlayer.src = originalVideoUrl;
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

  uploadSection.classList.add('hidden');
  configSection.classList.remove('hidden');
}

changeVideoBtn.addEventListener('click', () => {
  inputVideoPlayer.pause();
  inputVideoPlayer.src = '';
  configSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
  videoFileInput.value = '';
  selectedFile = null;
});

// ==========================================
// 3. RESOLUTION & PRESETS
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
// 4. IN-BROWSER ENHANCEMENT EXECUTION
// ==========================================

startProcessBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  if (!isEngineReady) {
    const originalBtnText = startProcessBtn.innerHTML;
    startProcessBtn.disabled = true;
    startProcessBtn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span><span>Initializing Engine…</span>`;
    
    let waited = 0;
    while (!isEngineReady && waited < 25) {
      await new Promise(r => setTimeout(r, 600));
      waited++;
    }

    if (!isEngineReady) {
      startProcessBtn.disabled = false;
      startProcessBtn.innerHTML = originalBtnText;
      return;
    }

    startProcessBtn.innerHTML = originalBtnText;
    startProcessBtn.disabled = false;
  }

  const resMode = document.querySelector('input[name="resMode"]:checked').value;
  const preset = document.querySelector('input[name="preset"]:checked').value;

  inputVideoPlayer.pause();
  configSection.classList.add('hidden');
  progressSection.classList.remove('hidden');
  progressBarFill.style.width = '0%';
  progressPct.textContent = '0%';
  progressEta.textContent = 'Reading local video into browser memory...';

  const origW = inputVideoPlayer.videoWidth || 1280;
  const origH = inputVideoPlayer.videoHeight || 720;
  const { targetW, targetH } = calculateTargetDimensions(origW, origH, resMode);

  // Build filter chain
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
    // Cinematic Remaster (default)
    filters.push(`scale=${targetW}:${targetH}:flags=lanczos`);
    filters.push('unsharp=lx=5:ly=5:la=0.8:cx=3:cy=3:ca=0.4');
    filters.push('eq=contrast=1.04:saturation=1.06');
  }
  filters.push('format=yuv420p');
  const filterStr = filters.join(',');

  try {
    const { fetchFile } = window.FFmpegUtil;

    // 1. Write file into Wasm virtual memory
    progressEta.textContent = 'Writing video into WebAssembly virtual file system...';
    await ffmpeg.writeFile('input_video', await fetchFile(selectedFile));

    // 2. Execute FFmpeg locally inside browser
    progressEta.textContent = 'Executing mathematical upscaler on your CPU...';
    await ffmpeg.exec([
      '-i', 'input_video',
      '-vf', filterStr,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',  // High speed for in-browser Wasm execution
      '-crf', '20',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      'output_enhanced.mp4'
    ]);

    // 3. Read output from Wasm memory
    progressBarFill.style.width = '100%';
    progressPct.textContent = '100%';
    progressEta.textContent = 'Complete! Creating video player...';

    const outputData = await ffmpeg.readFile('output_enhanced.mp4');
    const outputBlob = new Blob([outputData.buffer], { type: 'video/mp4' });
    enhancedVideoUrl = URL.createObjectURL(outputBlob);

    // Clean virtual memory
    try {
      await ffmpeg.deleteFile('input_video');
      await ffmpeg.deleteFile('output_enhanced.mp4');
    } catch (e) {}

    setTimeout(() => {
      displayResultsView();
    }, 400);

  } catch (err) {
    console.error('Enhancement error:', err);
    alert('Processing error: ' + err.message);
    progressSection.classList.add('hidden');
    configSection.classList.remove('hidden');
  }
});

function calculateTargetDimensions(w, h, mode) {
  const isLandscape = w >= h;
  let targetW = 2560;
  let targetH = 1440;

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
  }

  return { targetW, targetH };
}

// ==========================================
// 5. RESULTS & BEFORE / AFTER SLIDER
// ==========================================

function displayResultsView() {
  progressSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');

  enhancedVideoPlayer.src = enhancedVideoUrl;
  comparisonOriginalVideo.src = originalVideoUrl;
  downloadVideoBtn.href = enhancedVideoUrl;
  downloadVideoBtn.download = `Optica4K_${selectedFile.name}`;

  setSplitPosition(50);

  enhancedVideoPlayer.onloadedmetadata = () => {
    syncTimeline.max = enhancedVideoPlayer.duration || 100;
    updateTimeDisplay(0, enhancedVideoPlayer.duration);
  };
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

window.addEventListener('touchmove', (e) => {
  if (isDraggingSlider && e.touches && e.touches[0]) handleSplitMove(e.touches[0].clientX);
}, { passive: true });

window.addEventListener('touchend', () => { isDraggingSlider = false; });

// Synchronized controls
syncPlayBtn.addEventListener('click', togglePlayPause);
comparisonContainer.addEventListener('click', () => {
  if (!isDraggingSlider) togglePlayPause();
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
  enhancedVideoPlayer.pause();
  comparisonOriginalVideo.pause();
  resultsSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
  videoFileInput.value = '';
  selectedFile = null;
});
