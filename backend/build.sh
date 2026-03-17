#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install yt-dlp
echo "Downloading yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ./yt-dlp
chmod a+rx ./yt-dlp

# Install ffmpeg (static build for Linux)
echo "Downloading ffmpeg..."
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
tar -xf ffmpeg.tar.xz
# Find the ffmpeg binary in the extracted folder and move it to the root
mv ffmpeg-*-amd64-static/ffmpeg ./ffmpeg
mv ffmpeg-*-amd64-static/ffprobe ./ffprobe
chmod a+rx ./ffmpeg ./ffprobe

# Cleanup
rm -rf ffmpeg-*-amd64-static
rm ffmpeg.tar.xz

echo "Build dependencies installed successfully!"
echo "Verifying local files:"
ls -la ./yt-dlp ./ffmpeg ./ffprobe
