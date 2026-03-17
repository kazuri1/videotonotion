# Video Transcriber (Reels to Notion)

A minimal full-stack web app that converts a video URL (Instagram Reel or any public video) into a clean transcript and saves it to Notion.

## Features
- 🎥 Download video from URLs (via `yt-dlp`)
- 🔊 Extract audio (via `ffmpeg`)
- 📝 Transcribe audio using OpenAI Whisper API
- 📓 Save to Notion database with title and source URL
- 💎 Premium Dark UI with Vanilla CSS

## Prerequisites
1. **Node.js**: Ensure you have Node.js installed.
2. **yt-dlp**: Must be installed and available in your PATH.
   - [Installation Guide](https://github.com/yt-dlp/yt-dlp#installation)
3. **ffmpeg**: Must be installed and available in your PATH.
   - [Installation Guide](https://ffmpeg.org/download.html)
4. **API Keys**:
   - **OpenAI API Key**: For transcription.
   - **Notion Integration Token**: Follow [this guide](https://www.notion.so/my-integrations) to create one.
   - **Notion Database ID**: Ensure your database has the following properties:
     - `Name` (Title)
     - `Source URL` (URL)
     - `Created At` (Date)
   - Don't forget to **invite your integration** to the database!

## Setup

### Backend
1. Go to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Fill in your API keys in `.env`.
4. Install dependencies and start:
   ```bash
   npm install
   npm start
   ```

### Frontend
1. Go to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Constraints
- Max video length: 90 seconds.
- No database required other than Notion.
- Clean, minimal end-to-end pipeline.
