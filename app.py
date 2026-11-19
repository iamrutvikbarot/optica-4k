import os
import re
import uuid
import threading
import subprocess
from flask import Flask, request, jsonify, send_file, Response, send_from_directory
from flask_cors import CORS
from enhancer import (
    get_video_info,
    calculate_target_resolution,
    process_video_task,
    tracker
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
STATIC_DIR = os.path.join(BASE_DIR, "static")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024 * 1024  # 2 GB max upload

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".flv", ".m4v"}

def is_allowed_file(filename):
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_EXTENSIONS

@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")

@app.route("/api/system_info", methods=["GET"])
def system_info():
    """Return backend capabilities and algorithms."""
    return jsonify({
        "status": "online",
        "engine": "FFmpeg 9.0 + Pure Mathematical Signal Processing",
        "algorithms": [
            "Lanczos-3 Sinc Resampling (Preserves high frequencies)",
            "AMD Contrast Adaptive Sharpening (CAS - Zero ringing halos)",
            "3D Spatial-Temporal Noise Filtering (hqdn3d)",
            "High-Profile H.264 Web Mastering (CRF 18-20, yuv420p)"
        ],
        "ai_cost": "$0.00 (100% Free & Local)",
        "privacy": "Zero cloud uploads; 100% processed on your machine"
    })

@app.route("/api/upload", methods=["POST"])
def upload_video():
    """Handle video file upload and extract metadata."""
    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    file = request.files["video"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    if not is_allowed_file(file.filename):
        return jsonify({"error": f"Unsupported format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    file_id = str(uuid.uuid4())[:8]
    ext = os.path.splitext(file.filename)[1].lower()
    safe_filename = f"{file_id}_{re.sub(r'[^a-zA-Z0-9_.-]', '_', file.filename)}"
    save_path = os.path.join(UPLOAD_DIR, safe_filename)

    file.save(save_path)

    try:
        info = get_video_info(save_path)
        return jsonify({
            "success": True,
            "file_id": file_id,
            "filename": safe_filename,
            "original_name": file.filename,
            "info": info,
            "preview_url": f"/api/stream/upload/{safe_filename}"
        })
    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        return jsonify({"error": f"Failed to analyze video: {str(e)}"}), 500

@app.route("/api/generate_sample", methods=["POST"])
def generate_sample():
    """Generate a high-detail synthetic 720p sample video for immediate testing."""
    sample_id = str(uuid.uuid4())[:8]
    sample_filename = f"sample_{sample_id}.mp4"
    sample_path = os.path.join(UPLOAD_DIR, sample_filename)

    # Generate 3 seconds of high-detail test pattern with color bars, geometry & text at 1280x720
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", "testsrc=duration=4:size=1280x720:rate=30",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        sample_path
    ]

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        return jsonify({"error": "Failed to generate sample video"}), 500

    info = get_video_info(sample_path)
    return jsonify({
        "success": True,
        "file_id": sample_id,
        "filename": sample_filename,
        "original_name": "Demo_Sample_720p.mp4",
        "info": info,
        "preview_url": f"/api/stream/upload/{sample_filename}"
    })

@app.route("/api/process", methods=["POST"])
def process_video():
    """Initiate non-AI video upscaling and enhancement."""
    data = request.json or {}
    filename = data.get("filename")
    if not filename:
        return jsonify({"error": "Filename is required"}), 400

    input_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(input_path):
        return jsonify({"error": "Uploaded file not found"}), 404

    task_id = str(uuid.uuid4())[:10]
    out_ext = ".mp4"
    output_filename = f"enhanced_{data.get('resolution_mode', '4k')}_{task_id}{out_ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    settings = {
        "resolution_mode": data.get("resolution_mode", "4k"),
        "preset": data.get("preset", "cinematic"),
        "denoise_level": data.get("denoise_level", "low"),
        "cas_strength": float(data.get("cas_strength", 0.55)),
        "unsharp_strength": float(data.get("unsharp_strength", 0.0)),
        "contrast": float(data.get("contrast", 1.04)),
        "saturation": float(data.get("saturation", 1.06)),
        "brightness": float(data.get("brightness", 0.01)),
        "crf": int(data.get("crf", 19)),
        "encoder_speed": data.get("encoder_speed", "faster")
    }

    tracker.create_job(task_id, filename)

    # Launch processing in background thread
    thread = threading.Thread(
        target=process_video_task,
        args=(task_id, input_path, output_path, settings),
        daemon=True
    )
    thread.start()

    return jsonify({
        "success": True,
        "task_id": task_id,
        "output_filename": output_filename
    })

@app.route("/api/progress/<task_id>", methods=["GET"])
def get_progress(task_id):
    """Poll task progress."""
    job = tracker.get_job(task_id)
    if not job:
        return jsonify({"error": "Task not found"}), 404

    res = dict(job)
    if job.get("status") == "completed" and job.get("output_filename"):
        res["stream_url"] = f"/api/stream/output/{job['output_filename']}"
        res["download_url"] = f"/api/download/{task_id}"

    return jsonify(res)

@app.route("/api/cancel/<task_id>", methods=["POST"])
def cancel_task(task_id):
    """Cancel an active enhancement task."""
    success = tracker.cancel_job(task_id)
    return jsonify({"success": success})

@app.route("/api/stream/<folder>/<filename>", methods=["GET"])
def stream_video(folder, filename):
    """
    HTTP 206 Partial Content Video Streaming.
    Enables smooth scrubbing and playback in modern web browsers.
    """
    target_dir = UPLOAD_DIR if folder == "upload" else OUTPUT_DIR
    file_path = os.path.join(target_dir, filename)

    if not os.path.exists(file_path):
        return "File not found", 404

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("Range", None)

    if not range_header:
        # Full content response
        return send_file(file_path, mimetype="video/mp4")

    # Parse byte range e.g. "bytes=0-1048576"
    byte_range = range_header.replace("bytes=", "").split("-")
    start = int(byte_range[0]) if byte_range[0] else 0
    end = int(byte_range[1]) if len(byte_range) > 1 and byte_range[1] else file_size - 1

    if start >= file_size or end >= file_size or start > end:
        return Response(status=416, headers={"Content-Range": f"bytes */{file_size}"})

    length = end - start + 1

    def generate_chunks(fp, offset, byte_count, chunk_size=65536):
        fp.seek(offset)
        remaining = byte_count
        while remaining > 0:
            read_size = min(remaining, chunk_size)
            chunk = fp.read(read_size)
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk

    with open(file_path, "rb") as f:
        # Yield generator inside response
        pass

    file_handle = open(file_path, "rb")
    response = Response(
        generate_chunks(file_handle, start, length),
        status=206,
        mimetype="video/mp4",
        direct_passthrough=True
    )
    response.headers.add("Content-Range", f"bytes {start}-{end}/{file_size}")
    response.headers.add("Accept-Ranges", "bytes")
    response.headers.add("Content-Length", str(length))
    return response

@app.route("/api/download/<task_id>", methods=["GET"])
def download_video(task_id):
    """Download the enhanced video."""
    job = tracker.get_job(task_id)
    if not job or job.get("status") != "completed":
        return jsonify({"error": "File not ready or task not found"}), 404

    output_filename = job.get("output_filename")
    file_path = os.path.join(OUTPUT_DIR, output_filename)

    if not os.path.exists(file_path):
        return jsonify({"error": "File missing on disk"}), 404

    clean_download_name = f"Enhanced_4K_{job.get('filename', 'video.mp4')}"
    if not clean_download_name.lower().endswith(".mp4"):
        clean_download_name += ".mp4"

    return send_file(
        file_path,
        as_attachment=True,
        download_name=clean_download_name,
        mimetype="video/mp4"
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n=======================================================")
    print(f"  🚀 PureScale 4K - Non-AI Video Enhancer & Upscaler")
    print(f"  👉 Open in your browser: http://localhost:{port}")
    print(f"=======================================================\n")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
