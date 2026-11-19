# Use official lightweight Python image
FROM python:3.11-slim

# Install FFmpeg and clean up apt cache to keep image small
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency definition and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and static files
COPY . .

# Ensure working directories exist
RUN mkdir -p uploads outputs static

# Render exposes PORT dynamically (default to 10000 on Render)
ENV PORT=10000
EXPOSE 10000

# Use Gunicorn with 1 worker and 4 threads
# (1 worker is required so all background threads and progress updates share the same memory space)
CMD exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 300 app:app
