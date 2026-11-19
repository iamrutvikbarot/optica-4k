import json
import math
import os
import re
import subprocess
import threading
import time

def run_cmd(cmd, timeout=30):
    """Run a shell command and return stdout string."""
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=timeout, shell=isinstance(cmd, str))
    return res.stdout, res.stderr, res.returncode

def get_video_info(file_path):
    """Probe video file with ffprobe and return clean metadata."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        file_path
    ]

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"FFprobe failed: {res.stderr}")

    data = json.loads(res.stdout)
    streams = data.get("streams", [])
    format_info = data.get("format", {})

    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

    if not video_stream:
        raise ValueError("No video stream found in the uploaded file.")

    width = int(video_stream.get("width", 0))
    height = int(video_stream.get("height", 0))

    # FPS extraction
    fps_str = video_stream.get("r_frame_rate", "30/1")
    try:
        if "/" in fps_str:
            num, den = fps_str.split("/")
            fps = round(float(num) / float(den), 2) if float(den) > 0 else 30.0
        else:
            fps = float(fps_str)
    except Exception:
        fps = 30.0

    # Duration extraction
    duration = 0.0
    if "duration" in video_stream and video_stream["duration"] is not None:
        try:
            duration = float(video_stream["duration"])
        except ValueError:
            duration = 0.0

    if duration <= 0 and "duration" in format_info and format_info["duration"] is not None:
        try:
            duration = float(format_info["duration"])
        except ValueError:
            duration = 0.0

    # Total frames estimation
    nb_frames = video_stream.get("nb_frames")
    if nb_frames and nb_frames.isdigit():
        total_frames = int(nb_frames)
    else:
        total_frames = int(math.ceil(duration * fps)) if duration > 0 else 0

    file_size_bytes = os.path.getsize(file_path)
    file_size_mb = round(file_size_bytes / (1024 * 1024), 2)

    codec_name = video_stream.get("codec_name", "unknown").upper()
    bitrate = int(format_info.get("bit_rate", 0))

    return {
        "width": width,
        "height": height,
        "fps": fps,
        "duration": round(duration, 2),
        "total_frames": total_frames,
        "file_size_mb": file_size_mb,
        "codec": codec_name,
        "has_audio": audio_stream is not None,
        "audio_codec": audio_stream.get("codec_name", "").upper() if audio_stream else None,
        "bitrate_kbps": round(bitrate / 1000) if bitrate else 0,
        "aspect_ratio": f"{width}:{height}" if width and height else "16:9"
    }

def calculate_target_resolution(orig_w, orig_h, mode="4k"):
    """
    Calculate target dimensions keeping aspect ratio intact.
    Always returns even numbers (divisible by 2) for H.264/H.265 compliance.
    """
    is_landscape = orig_w >= orig_h

    if mode == "2k":
        if is_landscape:
            target_h = 1440
            target_w = int(round((orig_w * target_h) / orig_h / 2.0) * 2)
        else:
            target_w = 1440
            target_h = int(round((orig_h * target_w) / orig_w / 2.0) * 2)
    elif mode == "4k":
        if is_landscape:
            target_h = 2160
            target_w = int(round((orig_w * target_h) / orig_h / 2.0) * 2)
        else:
            target_w = 2160
            target_h = int(round((orig_h * target_w) / orig_w / 2.0) * 2)
    elif mode == "1080p":
        if is_landscape:
            target_h = 1080
            target_w = int(round((orig_w * target_h) / orig_h / 2.0) * 2)
        else:
            target_w = 1080
            target_h = int(round((orig_h * target_w) / orig_w / 2.0) * 2)
    elif mode == "2x":
        target_w = int(round(orig_w * 2.0 / 2.0) * 2)
        target_h = int(round(orig_h * 2.0 / 2.0) * 2)
    elif mode == "4x":
        target_w = int(round(orig_w * 4.0 / 2.0) * 2)
        target_h = int(round(orig_h * 4.0 / 2.0) * 2)
    else:
        # Default to 4k
        if is_landscape:
            target_h = 2160
            target_w = int(round((orig_w * target_h) / orig_h / 2.0) * 2)
        else:
            target_w = 2160
            target_h = int(round((orig_h * target_w) / orig_w / 2.0) * 2)

    return target_w, target_h

def build_filter_chain(target_w, target_h, settings):
    """
    Construct the FFmpeg non-AI mathematical filter pipeline.
    Steps:
      1. Pre-Denoise (spatial/temporal) to prevent blowing up compression noise
      2. High-precision Lanczos-3 / Spline36 scaling
      3. AMD CAS (Contrast Adaptive Sharpening) for edge & texture crispness
      4. Subtle Unsharp Masking for fine lines
      5. Micro Dynamic Range / Vibrance calibration (eq filter)
      6. Conversion to universal web-compatible yuv420p
    """
    preset = settings.get("preset", "cinematic")
    filter_parts = []

    # 1. Pre-Denoise Configuration
    denoise_map = {
        "none": None,
        "low": "hqdn3d=1.0:1.0:2.5:2.0",
        "medium": "hqdn3d=1.8:1.5:3.5:3.0",
        "high": "hqdn3d=3.0:2.5:5.0:4.0"
    }

    if preset == "cinematic":
        # Balanced gentle denoise, Lanczos-3 scale, moderate CAS, filmic vibrance
        filter_parts.append("hqdn3d=1.2:1.0:3.0:2.5")
        filter_parts.append(f"scale={target_w}:{target_h}:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp")
        filter_parts.append("cas=0.55")
        filter_parts.append("eq=contrast=1.04:brightness=0.01:saturation=1.06")
    elif preset == "ultra_sharp":
        # Minimum denoise, high CAS, edge contour unsharp for Anime / UI / Gaming
        filter_parts.append("hqdn3d=0.8:0.8:2.0:1.5")
        filter_parts.append(f"scale={target_w}:{target_h}:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp")
        filter_parts.append("cas=0.75")
        filter_parts.append("unsharp=lx=3:ly=3:la=0.4:cx=3:cy=3:ca=0.2")
        filter_parts.append("eq=contrast=1.02:saturation=1.03")
    elif preset == "clean_denoise":
        # Heavy noise reduction for grainy / low-light videos, gentle CAS
        filter_parts.append("hqdn3d=2.5:2.0:4.5:3.5")
        filter_parts.append(f"scale={target_w}:{target_h}:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp")
        filter_parts.append("cas=0.40")
        filter_parts.append("eq=contrast=1.03:saturation=1.04")
    elif preset == "vivid_hdr":
        # Vivid cinema dynamic range lift
        filter_parts.append("hqdn3d=1.0:1.0:2.5:2.0")
        filter_parts.append(f"scale={target_w}:{target_h}:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp")
        filter_parts.append("cas=0.50")
        filter_parts.append("eq=contrast=1.07:brightness=0.01:saturation=1.12")
    elif preset == "fast":
        # Fastest clean Lanczos upscaling with light sharpening
        filter_parts.append(f"scale={target_w}:{target_h}:flags=lanczos")
        filter_parts.append("cas=0.45")
    elif preset == "custom":
        # Custom user parameters
        denoise_level = settings.get("denoise_level", "low")
        if denoise_level in denoise_map and denoise_map[denoise_level]:
            filter_parts.append(denoise_map[denoise_level])

        filter_parts.append(f"scale={target_w}:{target_h}:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp")

        cas_val = float(settings.get("cas_strength", 0.5))
        if cas_val > 0.0:
            cas_val = max(0.05, min(cas_val, 1.0))
            filter_parts.append(f"cas={round(cas_val, 2)}")

        unsharp_val = float(settings.get("unsharp_strength", 0.0))
        if unsharp_val > 0.0:
            unsharp_val = max(0.1, min(unsharp_val, 1.5))
            filter_parts.append(f"unsharp=lx=5:ly=5:la={round(unsharp_val, 2)}:cx=3:cy=3:ca={round(unsharp_val * 0.5, 2)}")

        contrast = float(settings.get("contrast", 1.0))
        brightness = float(settings.get("brightness", 0.0))
        saturation = float(settings.get("saturation", 1.0))
        if contrast != 1.0 or brightness != 0.0 or saturation != 1.0:
            filter_parts.append(f"eq=contrast={round(contrast, 2)}:brightness={round(brightness, 2)}:saturation={round(saturation, 2)}")

    # Ensure final browser compatibility
    filter_parts.append("format=yuv420p")

    return ",".join(filter_parts)


class JobTracker:
    def __init__(self):
        self.jobs = {}
        self.lock = threading.Lock()

    def create_job(self, task_id, orig_filename):
        with self.lock:
            self.jobs[task_id] = {
                "id": task_id,
                "filename": orig_filename,
                "status": "queued",
                "progress": 0.0,
                "current_frame": 0,
                "total_frames": 0,
                "fps": 0.0,
                "speed": "0x",
                "elapsed_sec": 0,
                "eta_sec": 0,
                "error": None,
                "output_filename": None,
                "output_info": None,
                "start_time": None,
                "process": None,
                "cancelled": False
            }

    def update_job(self, task_id, **kwargs):
        with self.lock:
            if task_id in self.jobs:
                self.jobs[task_id].update(kwargs)

    def get_job(self, task_id):
        with self.lock:
            job = self.jobs.get(task_id)
            if not job:
                return None
            # Return safe copy without process object
            res = dict(job)
            res.pop("process", None)
            return res

    def cancel_job(self, task_id):
        with self.lock:
            job = self.jobs.get(task_id)
            if job and job.get("status") in ("queued", "processing"):
                job["cancelled"] = True
                proc = job.get("process")
                if proc:
                    try:
                        proc.terminate()
                    except Exception:
                        pass
                job["status"] = "cancelled"
                return True
        return False


tracker = JobTracker()


def process_video_task(task_id, input_path, output_path, settings):
    """
    Background worker that runs FFmpeg with live progress tracking.
    """
    tracker.update_job(task_id, status="processing", start_time=time.time())

    try:
        # 1. Probe input video
        info = get_video_info(input_path)
        orig_w = info["width"]
        orig_h = info["height"]
        total_frames = info["total_frames"]
        fps = info["fps"]
        duration = info["duration"]

        tracker.update_job(task_id, total_frames=total_frames)

        # 2. Determine target resolution
        mode = settings.get("resolution_mode", "4k")
        target_w, target_h = calculate_target_resolution(orig_w, orig_h, mode)

        # 3. Build filter pipeline
        filter_chain = build_filter_chain(target_w, target_h, settings)

        # 4. Encoder parameters (High quality, web-optimized, high bitrate)
        # CRF 18-20 is visually lossless for 2K/4K mastering
        crf = str(settings.get("crf", 19))
        preset_speed = settings.get("encoder_speed", "faster")

        threads_limit = str(os.environ.get("FFMPEG_THREADS", "2"))

        cmd = [
            "ffmpeg",
            "-y",
            "-nostats",
            "-loglevel", "error",
            "-threads", threads_limit,
            "-i", input_path,
            "-vf", filter_chain,
            "-c:v", "libx264",
            "-preset", preset_speed,
            "-crf", crf,
            "-movflags", "+faststart",  # Enables instant web streaming without loading entire file
        ]

        if info["has_audio"]:
            # Copy original audio without re-encoding loss
            cmd.extend(["-c:a", "copy"])
        else:
            cmd.append("-an")

        cmd.extend([
            "-progress", "pipe:1",
            output_path
        ])

        print(f"[{task_id}] Running FFmpeg with target {target_w}x{target_h}...")
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        tracker.update_job(task_id, process=proc)
        start_time = time.time()

        # Drain stderr in background to avoid any OS pipe buffer deadlock
        stderr_output = []
        def drain_stderr(pipe):
            try:
                for err_line in iter(pipe.readline, ''):
                    if err_line:
                        stderr_output.append(err_line)
            except Exception:
                pass
            finally:
                pipe.close()

        err_thread = threading.Thread(target=drain_stderr, args=(proc.stderr,), daemon=True)
        err_thread.start()

        # Parse FFmpeg progress
        pattern_frame = re.compile(r"^frame=(\d+)")
        pattern_fps = re.compile(r"^fps=([\d\.]+)")
        pattern_speed = re.compile(r"^speed=([\d\.]+)x")
        pattern_time_ms = re.compile(r"^out_time_ms=(\d+)")

        current_frame = 0
        current_fps = 0.0
        current_speed = "1.0x"

        for line in proc.stdout:
            line = line.strip()

            m_frame = pattern_frame.match(line)
            if m_frame:
                current_frame = int(m_frame.group(1))

            m_fps = pattern_fps.match(line)
            if m_fps:
                current_fps = float(m_fps.group(1))

            m_speed = pattern_speed.match(line)
            if m_speed:
                current_speed = f"{m_speed.group(1)}x"

            m_time = pattern_time_ms.match(line)
            if m_time and duration > 0:
                elapsed_video_sec = float(m_time.group(1)) / 1000000.0
                progress_pct = min(99.0, (elapsed_video_sec / duration) * 100.0)
            elif total_frames > 0:
                progress_pct = min(99.0, (current_frame / total_frames) * 100.0)
            else:
                progress_pct = 50.0

            elapsed_wall_sec = round(time.time() - start_time, 1)

            # ETA calculation
            if progress_pct > 2.0:
                total_est_wall = (elapsed_wall_sec / (progress_pct / 100.0))
                eta_sec = max(0, round(total_est_wall - elapsed_wall_sec))
            else:
                eta_sec = 0

            tracker.update_job(
                task_id,
                progress=round(progress_pct, 1),
                current_frame=current_frame,
                fps=current_fps,
                speed=current_speed,
                elapsed_sec=elapsed_wall_sec,
                eta_sec=eta_sec
            )

        proc.wait()

        # Check job status
        job_info = tracker.get_job(task_id)
        if job_info and job_info.get("cancelled"):
            if os.path.exists(output_path):
                try:
                    os.remove(output_path)
                except Exception:
                    pass
            return

        if proc.returncode != 0:
            stderr_out = "".join(stderr_output)
            raise RuntimeError(f"FFmpeg exited with error code {proc.returncode}: {stderr_out[-500:]}")

        # Enhancement finished successfully!
        out_info = get_video_info(output_path)
        total_time = round(time.time() - start_time, 1)

        tracker.update_job(
            task_id,
            status="completed",
            progress=100.0,
            elapsed_sec=total_time,
            eta_sec=0,
            output_filename=os.path.basename(output_path),
            output_info={
                "width": out_info["width"],
                "height": out_info["height"],
                "file_size_mb": out_info["file_size_mb"],
                "duration": out_info["duration"],
                "codec": out_info["codec"],
                "processing_time": f"{total_time}s",
                "scale_factor": f"{round(out_info['width'] / orig_w, 1)}x"
            }
        )
        print(f"[{task_id}] Finished enhancement in {total_time}s -> {output_path}")

    except Exception as e:
        print(f"[{task_id}] Error during enhancement: {e}")
        tracker.update_job(
            task_id,
            status="failed",
            error=str(e)
        )
