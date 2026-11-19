# Optica 4K — Free Non-AI Video Enhancer & 2K/4K Upscaler

> **100% Free • Unlimited • Zero Cloud Fees • 100% Private (Runs Locally) • Zero AI Hallucinations**

🌐 **Live Web Application (In-Browser)**: [https://client-side-olive.vercel.app](https://client-side-olive.vercel.app)  
💻 **GitHub Repository**: [https://github.com/iamrutvikbarot/optica-4k](https://github.com/iamrutvikbarot/optica-4k)

A complete, dual-engine video enhancement and upscaling system built specifically for creators and users who want to upscale their videos to **2K (1440p)** or **4K (2160p)** and enhance video sharpness, contrast, and clarity **without spending money on expensive AI APIs, cloud subscriptions, or heavy GPU hardware**.

---

## ⚡ Two Deployment Options

1. **Client-Side In-Browser Engine (`/client-side`)**:
   - Zero cloud server costs! Uses **WebAssembly** to run digital signal processing directly on the visitor's device (Mac M-series CPU, PC, etc.).
   - Deployable anywhere: Vercel, Netlify, Cloudflare Pages, GitHub Pages.
   - 100% private: videos are never transmitted over the network.

2. **Python & Native FFmpeg Backend (`/app.py`, `/enhancer.py`)**:
   - High-throughput batch processing with Flask and native FFmpeg Lanczos-3 / AMD FidelityFX CAS filter pipelines.
   - Dockerized and ready for Render, Railway, or local desktop execution.

---

## 💡 Why Non-AI Mathematical Enhancement?

| Feature | Expensive AI Models (Topaz, Real-ESRGAN, Cloud APIs) | **Optica 4K (Non-AI Mathematical)** |
| :--- | :--- | :--- |
| **Cost** | 💸 $50 – $300 or $0.20/min cloud bill | **🎉 $0.00 (100% Free Forever)** |
| **Hardware** | Needs RTX 3080/4090 with 12GB+ VRAM | **Runs on any PC / Laptop / CPU** |
| **Artifacts** | Warps human faces, flickers across frames, hallucinates fake details | **Stable, clean, zero temporal jitter or hallucinations** |
| **Privacy** | Uploads your private videos to third-party cloud servers | **100% offline and local on your machine** |
| **Processing Speed** | 0.05× – 0.2× (Takes hours for short clips) | **0.5× – 2.0× (10× to 20× faster)** |
| **YouTube VP9 Codec** | Indirect | **Directly unlocks YouTube's premium VP9/AV01 bitrate** |

---

## 🔬 How It Works (The 5-Stage Mathematical Pipeline)

1. **Aspect-Ratio Preserving Dimension Calculator**:
   - Accurately scales widescreen 16:9, vertical 9:16 (Shorts/TikTok/Reels), 4:3 vintage, or 21:9 ultrawide video keeping natural proportions and ensuring H.264 even-pixel bounds.
2. **3D Spatial-Temporal Noise Filtering (`hqdn3d`)**:
   - Removes digital sensor noise, ISO grain, and compression macroblocks across adjacent frames before upscaling.
3. **Lanczos-3 Sinc Resampling**:
   - Uses a windowed sinc mathematical interpolation algorithm (`flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp`) to calculate smooth yet sharp gradient transitions between original and new pixels.
4. **AMD FidelityFX Contrast Adaptive Sharpening (CAS)**:
   - Adaptively sharpens soft texture areas while preventing halo rings or over-sharpening already sharp contours.
5. **Micro-Contrast & Vibrance Tuning (`eq`)**:
   - Eliminates washed-out shadows, deepens dark levels, and subtly enriches color vibrance without clipping highlights.
6. **Web-Optimized High-Bitrate H.264 Mastering**:
   - Encodes with visually lossless CRF (18–20), `pix_fmt yuv420p` for 100% browser and TV compatibility, and `-movflags +faststart` for instant streaming.

---

## 🚀 Quick Start Guide

### In-Browser Static Web App (Zero Setup)
Open `client-side/index.html` in your browser, or visit the live deployment at [https://client-side-olive.vercel.app](https://client-side-olive.vercel.app).

### Local Python Backend
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the application
python app.py
```
Visit `http://localhost:5000` to access the full-featured interface.
