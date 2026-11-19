# Optica — In-Browser Client-Side Edition (WebAssembly)

> **Zero Cloud Server Costs • Runs 100% On The Visitor's Mac / PC CPU & RAM • 100% Private**

🌐 **Live Web Application**: [https://optica-video.vercel.app](https://optica-video.vercel.app) (also at [https://opticavideo.vercel.app](https://opticavideo.vercel.app))
💻 **GitHub Repository**: [https://github.com/iamrutvikbarot/optica-4k](https://github.com/iamrutvikbarot/optica-4k)

This version uses **FFmpeg.wasm** (FFmpeg compiled directly into WebAssembly with SIMD / multi-threading support). 

### How It Works
- The website is **100% client-side** (HTML, modern CSS, WebAssembly).
- When a user opens the URL on their Mac, PC, or laptop:
  1. The browser loads the WebAssembly mathematical video engine directly into memory.
  2. The visitor selects any local video file (MP4, MOV, WebM, MKV).
  3. **Their device's CPU and RAM do 100% of the video rendering, sinc interpolation, and upscaling**.
  4. The video never touches a server — 100% private and zero cloud computing bills.
  5. The finished 2K/4K video is exported straight to their downloads folder.
- Server cost: **$0.00**, even with thousands of concurrent users.

---

### How to Deploy in 60 Seconds:

#### Option A: Deploy to Vercel (Recommended)
1. Push this folder to a GitHub repository.
2. In [Vercel](https://vercel.com): Import the repository.
3. Root directory: set to `client-side` (or the repository root).
4. Click **Deploy**. Vercel will automatically apply `vercel.json` for Cross-Origin headers.

#### Option B: Deploy to Netlify
1. Drag and drop this `client-side/` folder directly onto [app.netlify.com/drop](https://app.netlify.com/drop).
2. It's live instantly with `netlify.toml` headers!

#### Option C: Deploy to GitHub Pages
1. Go to repository Settings -> Pages -> Deploy from branch -> `/client-side`.
2. `coi-serviceworker.js` will automatically enable cross-origin isolation!
