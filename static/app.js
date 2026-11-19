// PureScale 4K - Frontend Application Logic

// State
let currentFile = null;
let currentTaskId = null;
let pollInterval = null;
let isDraggingSlider = false;

// DOM Elements
const uploadSection = document.getElementById('uploadSection');
const configSection = document.getElementById('configSection');
const progressSection = document.getElementById('progressSection');
const resultsSection = document.getElementById('resultsSection');

const dropZone = document.getElementById('dropZone');
const videoFileInput = document.getElementById('videoFileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const demoSampleBtn = document.getElementById('demoSampleBtn');
const changeVideoBtn = document.getElementById('changeVideoBtn');

// Config DOM
const inputVideoPlayer = document.getElementById('inputVideoPlayer');
const specRes = document.getElementById('specRes');
const specFps = document.getElementById('specFps');
const specDuration = document.getElementById('specDuration');
const specSize = document.getElementById('specSize');
const specCodec = document.getElementById('specCodec');
const specAudio = document.getElementById('specAudio');

const resCards = document.querySelectorAll('.res-card');
const presetCards = document.querySelectorAll('.preset-card');
const customControlsDrawer = document.getElementById('customControlsDrawer');
const startProcessBtn = document.getElementById('startProcessBtn');

// Custom Sliders
const inputCas = document.getElementById('inputCas');
const valCas = document.getElementById('valCas');
const inputUnsharp = document.getElementById('inputUnsharp');
const valUnsharp = document.getElementById('valUnsharp');
const selectDenoise = document.getElementById('selectDenoise');
const valDenoise = document.getElementById('valDenoise');
const inputContrast = document.getElementById('inputContrast');
const valContrast = document.getElementById('valContrast');
const inputSaturation = document.getElementById('inputSaturation');
const valSaturation = document.getElementById('valSaturation');
const inputCrf = document.getElementById('inputCrf');
const valCrf = document.getElementById('valCrf');

// Progress DOM
const progressBarFill = document.getElementById('progressBarFill');
const progressPct = document.getElementById('progressPct');
const progressEta = document.getElementById('progressEta');
const statusMessage = document.getElementById('statusMessage');
const metricFrames = document.getElementById('metricFrames');
const metricSpeed = document.getElementById('metricSpeed');
const metricElapsed = document.getElementById('metricElapsed');
const metricRate = document.getElementById('metricRate');
const cancelBtn = document.getElementById('cancelBtn');

// Results DOM
const comparisonContainer = document.getElementById('comparisonContainer');
const originalLayer = document.getElementById('originalLayer');
const sliderHandle = document.getElementById('sliderHandle');
const comparisonOriginalVideo = document.getElementById('comparisonOriginalVideo');
const enhancedVideoPlayer = document.getElementById('enhancedVideoPlayer');
const downloadVideoBtn = document.getElementById('downloadVideoBtn');
const restartBtn = document.getElementById('restartBtn');

// Sync Controls DOM
const syncPlayBtn = document.getElementById('syncPlayBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const syncTimeline = document.getElementById('syncTimeline');
const syncTimeDisplay = document.getElementById('syncTimeDisplay');
const syncMuteBtn = document.getElementById('syncMuteBtn');

// Stats DOM
const statOrigRes = document.getElementById('statOrigRes');
const statEnhancedRes = document.getElementById('statEnhancedRes');
const statMultiplier = document.getElementById('statMultiplier');
const statTime = document.getElementById('statTime');

// ==========================================
// 1. FILE UPLOAD & INTAKE
// ==========================================

selectFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  videoFileInput.click();
});

dropZone.addEventListener('click', () => {
  videoFileInput.click();
});

videoFileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    uploadFile(e.target.files[0]);
  }
});

// Drag and drop handlers
['dragenter', 'dragover'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-active');
  });
});

['dragleave', 'drop'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-active');
  });
});

dropZone.addEventListener('drop', (e) => {
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    uploadFile(e.dataTransfer.files[0]);
  }
});

demoSampleBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  demoSampleBtn.disabled = true;
  demoSampleBtn.innerHTML = `<span>⏳ Generating Sample...</span>`;

  try {
    const res = await fetch('/api/generate_sample', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate demo sample');
    displayConfigView(data);
  } catch (err) {
    alert('Error generating demo sample: ' + err.message);
  } finally {
    demoSampleBtn.disabled = false;
    demoSampleBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
      Generate Demo Sample
    `;
  }
});

changeVideoBtn.addEventListener('click', () => {
  inputVideoPlayer.pause();
  inputVideoPlayer.src = '';
  configSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
  videoFileInput.value = '';
  currentFile = null;
});

async function uploadFile(file) {
  const formData = new FormData();
  formData.append('video', file);

  selectFileBtn.disabled = true;
  selectFileBtn.innerHTML = `<span>⏳ Analyzing Video...</span>`;

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');

    displayConfigView(data);
  } catch (err) {
    alert('Upload Error: ' + err.message);
  } finally {
    selectFileBtn.disabled = false;
    selectFileBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
      Browse Video File
    `;
  }
}

function displayConfigView(data) {
  currentFile = data;

  // Populate Specs
  const info = data.info;
  specRes.textContent = `${info.width} × ${info.height}`;
  specFps.textContent = `${info.fps} fps`;
  specDuration.textContent = formatDuration(info.duration);
  specSize.textContent = `${info.file_size_mb} MB`;
  specCodec.textContent = info.codec;
  specAudio.textContent = info.has_audio ? (info.audio_codec || 'Yes') : 'None';

  // Load preview stream
  inputVideoPlayer.src = data.preview_url;

  // Auto-adapt recommended resolution based on input resolution
  if (info.width >= 1920 && info.height >= 1080) {
    // If already 1080p, recommend 4K
    setResolution('4k');
  } else {
    // 720p or lower, recommend 2K or 4K
    setResolution('2k');
  }

  // Switch views
  uploadSection.classList.add('hidden');
  configSection.classList.remove('hidden');
}

// ==========================================
// 2. CONFIGURATION & PRESETS
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
    const radio = card.querySelector('input');
    radio.checked = true;

    if (radio.value === 'custom') {
      customControlsDrawer.classList.remove('hidden');
    } else {
      customControlsDrawer.classList.add('hidden');
    }
  });
});

// Custom Slider Change Listeners
inputCas.addEventListener('input', () => { valCas.textContent = inputCas.value; });
inputUnsharp.addEventListener('input', () => { valUnsharp.textContent = inputUnsharp.value; });
selectDenoise.addEventListener('change', () => { valDenoise.textContent = selectDenoise.value; });
inputContrast.addEventListener('input', () => { valContrast.textContent = inputContrast.value; });
inputSaturation.addEventListener('input', () => { valSaturation.textContent = inputSaturation.value; });
inputCrf.addEventListener('input', () => {
  const v = inputCrf.value;
  valCrf.textContent = `${v} (${v <= 18 ? 'Master Quality' : v <= 20 ? 'High Fidelity' : 'Balanced'})`;
});

// ==========================================
// 3. PROCESSING & PROGRESS POLLING
// ==========================================

startProcessBtn.addEventListener('click', async () => {
  if (!currentFile) return;

  const resMode = document.querySelector('input[name="resMode"]:checked').value;
  const preset = document.querySelector('input[name="preset"]:checked').value;

  const payload = {
    filename: currentFile.filename,
    resolution_mode: resMode,
    preset: preset,
    denoise_level: selectDenoise.value,
    cas_strength: parseFloat(inputCas.value),
    unsharp_strength: parseFloat(inputUnsharp.value),
    contrast: parseFloat(inputContrast.value),
    saturation: parseFloat(inputSaturation.value),
    crf: parseInt(inputCrf.value),
    encoder_speed: 'faster'
  };

  inputVideoPlayer.pause();
  configSection.classList.add('hidden');
  progressSection.classList.remove('hidden');

  // Reset progress UI
  progressBarFill.style.width = '0%';
  progressPct.textContent = '0%';
  progressEta.textContent = 'Initializing engine...';
  metricFrames.textContent = `0 / ${currentFile.info.total_frames}`;
  metricSpeed.textContent = '0.0 fps';
  metricElapsed.textContent = '0.0s';
  metricRate.textContent = '0.0x';

  try {
    const res = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Processing failed to start');

    currentTaskId = data.task_id;
    startProgressPolling(currentTaskId);
  } catch (err) {
    alert('Processing Error: ' + err.message);
    progressSection.classList.add('hidden');
    configSection.classList.remove('hidden');
  }
});

function startProgressPolling(taskId) {
  if (pollInterval) clearInterval(pollInterval);

  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/progress/${taskId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to poll task');

      if (data.status === 'processing') {
        const pct = Math.min(99, Math.max(0, data.progress));
        progressBarFill.style.width = `${pct}%`;
        progressPct.textContent = `${pct.toFixed(1)}%`;

        if (pct < 15) {
          statusMessage.textContent = 'Applying 3D noise reduction & color calibration...';
        } else if (pct < 70) {
          statusMessage.textContent = 'Computing Lanczos-3 sinc interpolation & AMD CAS filters...';
        } else {
          statusMessage.textContent = 'Encoding web-optimized H.264 stream...';
        }

        metricFrames.textContent = `${data.current_frame} / ${data.total_frames}`;
        metricSpeed.textContent = `${data.fps.toFixed(1)} fps`;
        metricElapsed.textContent = `${data.elapsed_sec}s`;
        metricRate.textContent = data.speed || '1.0x';

        if (data.eta_sec > 0) {
          progressEta.textContent = `ETA: ~${data.eta_sec}s remaining`;
        } else {
          progressEta.textContent = 'Processing frames...';
        }

      } else if (data.status === 'completed') {
        clearInterval(pollInterval);
        progressBarFill.style.width = '100%';
        progressPct.textContent = '100%';
        progressEta.textContent = 'Done!';

        setTimeout(() => {
          displayResultsView(data);
        }, 600);

      } else if (data.status === 'failed') {
        clearInterval(pollInterval);
        alert('Upscaling Error: ' + (data.error || 'Unknown error occurred.'));
        progressSection.classList.add('hidden');
        configSection.classList.remove('hidden');

      } else if (data.status === 'cancelled') {
        clearInterval(pollInterval);
        progressSection.classList.add('hidden');
        configSection.classList.remove('hidden');
      }

    } catch (err) {
      console.error('Poll error:', err);
    }
  }, 400);
}

cancelBtn.addEventListener('click', async () => {
  if (!currentTaskId) return;
  cancelBtn.disabled = true;
  cancelBtn.textContent = 'Cancelling...';

  try {
    await fetch(`/api/cancel/${currentTaskId}`, { method: 'POST' });
  } catch (err) {
    console.error(err);
  } finally {
    cancelBtn.disabled = false;
    cancelBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
      Cancel Processing
    `;
  }
});

// ==========================================
// 4. RESULTS & BEFORE/AFTER SPLIT SLIDER
// ==========================================

function displayResultsView(job) {
  progressSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');

  // Load both video layers
  enhancedVideoPlayer.src = job.stream_url;
  comparisonOriginalVideo.src = currentFile.preview_url;

  downloadVideoBtn.href = job.download_url;

  // Stats
  statOrigRes.textContent = `${currentFile.info.width} × ${currentFile.info.height}`;
  statEnhancedRes.textContent = `${job.output_info.width} × ${job.output_info.height}`;
  statMultiplier.textContent = `${job.output_info.scale_factor} (${((job.output_info.width * job.output_info.height) / (currentFile.info.width * currentFile.info.height)).toFixed(1)}× pixels)`;
  statTime.textContent = job.output_info.processing_time;

  // Set default split position (50%)
  setSplitPosition(50);

  // Synchronize playback when metadata loads
  enhancedVideoPlayer.addEventListener('loadedmetadata', () => {
    syncTimeline.max = enhancedVideoPlayer.duration || 100;
    updateTimeDisplay(0, enhancedVideoPlayer.duration);
  });
}

function setSplitPosition(pct) {
  pct = Math.max(0, Math.min(100, pct));
  originalLayer.style.clipPath = `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;
  sliderHandle.style.left = `${pct}%`;
}

// Split Slider Mouse & Touch Interaction
function handleSplitMove(clientX) {
  const rect = comparisonContainer.getBoundingClientRect();
  const pct = ((clientX - rect.left) / rect.width) * 100;
  setSplitPosition(pct);
}

comparisonContainer.addEventListener('mousedown', (e) => {
  isDraggingSlider = true;
  handleSplitMove(e.clientX);
});

window.addEventListener('mousemove', (e) => {
  if (isDraggingSlider) {
    handleSplitMove(e.clientX);
  }
});

window.addEventListener('mouseup', () => {
  isDraggingSlider = false;
});

// Touch support for mobile / touchpads
comparisonContainer.addEventListener('touchstart', (e) => {
  isDraggingSlider = true;
  if (e.touches && e.touches[0]) handleSplitMove(e.touches[0].clientX);
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (isDraggingSlider && e.touches && e.touches[0]) {
    handleSplitMove(e.touches[0].clientX);
  }
}, { passive: true });

window.addEventListener('touchend', () => {
  isDraggingSlider = false;
});

// ==========================================
// 5. SYNCHRONIZED VIDEO CONTROLS
// ==========================================

syncPlayBtn.addEventListener('click', togglePlayPause);
comparisonContainer.addEventListener('click', (e) => {
  // If not dragging slider, toggle play
  if (!isDraggingSlider) {
    togglePlayPause();
  }
});

function togglePlayPause() {
  if (enhancedVideoPlayer.paused) {
    // Sync times before playing
    comparisonOriginalVideo.currentTime = enhancedVideoPlayer.currentTime;
    enhancedVideoPlayer.play();
    comparisonOriginalVideo.play();
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  } else {
    enhancedVideoPlayer.pause();
    comparisonOriginalVideo.pause();
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  }
}

// Synchronize video timeline scrubber
enhancedVideoPlayer.addEventListener('timeupdate', () => {
  syncTimeline.value = enhancedVideoPlayer.currentTime;
  updateTimeDisplay(enhancedVideoPlayer.currentTime, enhancedVideoPlayer.duration);

  // Keep original strictly aligned (prevent drifting)
  if (Math.abs(comparisonOriginalVideo.currentTime - enhancedVideoPlayer.currentTime) > 0.15) {
    comparisonOriginalVideo.currentTime = enhancedVideoPlayer.currentTime;
  }
});

syncTimeline.addEventListener('input', () => {
  const seekTime = parseFloat(syncTimeline.value);
  enhancedVideoPlayer.currentTime = seekTime;
  comparisonOriginalVideo.currentTime = seekTime;
  updateTimeDisplay(seekTime, enhancedVideoPlayer.duration);
});

let isMuted = false;
syncMuteBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  enhancedVideoPlayer.muted = isMuted;
  syncMuteBtn.style.opacity = isMuted ? '0.4' : '1.0';
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
  enhancedVideoPlayer.src = '';
  comparisonOriginalVideo.src = '';

  resultsSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
  videoFileInput.value = '';
  currentFile = null;
  currentTaskId = null;
});
