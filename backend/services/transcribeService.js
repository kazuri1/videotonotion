const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');
const ffmpeg = require('fluent-ffmpeg');
require('dotenv').config();

const YT_DLP_PATH = process.env.YT_DLP_PATH || path.join(__dirname, '../yt-dlp');
const FFMPEG_PATH = process.env.FFMPEG_PATH || path.join(__dirname, '../ffmpeg');

console.log('--- Startup Config ---');
console.log('__dirname:', __dirname);
console.log('YT_DLP_PATH:', YT_DLP_PATH);
console.log('FFMPEG_PATH:', FFMPEG_PATH);
console.log('YT_DLP_EXISTS:', fs.existsSync(YT_DLP_PATH));
console.log('FFMPEG_EXISTS:', fs.existsSync(FFMPEG_PATH));
console.log('----------------------');

ffmpeg.setFfmpegPath(FFMPEG_PATH);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MAX_DURATION = 300; // 5 minutes limit

async function transcribeVideo(url) {
  const videoBaseName = 'temp_video';
  const videoDir = path.join(__dirname, '../../');
  const videoTemplate = path.join(videoDir, `${videoBaseName}.%(ext)s`);
  const audioPath = path.join(videoDir, 'temp_audio.mp3');

  // 1. Download video using yt-dlp
  console.log('Downloading video...');
  const ffmpegDir = path.dirname(FFMPEG_PATH);
  const cookiesPath = path.join(videoDir, 'cookies.txt');
  
  await new Promise((resolve, reject) => {
    const env = { 
      ...process.env, 
      PATH: `${ffmpegDir}${path.delimiter}${process.env.PATH}` 
    };

    // Handle cookies if provided in ENV
    let cookieArg = '';
    if (process.env.COOKIES_TEXT) {
      fs.writeFileSync(cookiesPath, process.env.COOKIES_TEXT);
      cookieArg = `--cookies "${cookiesPath}"`;
    }

    // Use output template to let yt-dlp decide extension
    // We increase duration filter to 300s
    exec(`"${YT_DLP_PATH}" ${cookieArg} --ffmpeg-location "${FFMPEG_PATH}" --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" --referer "https://www.instagram.com/" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 --match-filter "duration <= ${MAX_DURATION}" --no-playlist --no-warnings -o "${videoTemplate}" "${url}"`, { env }, (error, stdout, stderr) => {
      // Cleanup cookies file immediately after execution
      if (fs.existsSync(cookiesPath)) {
        try { fs.unlinkSync(cookiesPath); } catch(e) {}
      }

      if (error) {
        console.error('yt-dlp error:', error);
        return reject(new Error(`yt-dlp failed: ${stderr || error.message}`));
      }
      
      if (stdout.includes('does not pass filter')) {
        return reject(new Error(`Video is too long (over ${MAX_DURATION} seconds).`));
      }

      resolve();
    });
  });

  // 2. Find the actual downloaded file (since extension might vary)
  console.log('Finding downloaded video file...');
  const files = fs.readdirSync(videoDir);
  const videoFileName = files.find(f => f.startsWith(videoBaseName) && !f.endsWith('.mp3'));
  
  if (!videoFileName) {
    throw new Error(`Video download failed: No file starting with ${videoBaseName} found in ${videoDir}.`);
  }
  
  const videoPath = path.join(videoDir, videoFileName);
  console.log('Found video file at:', videoPath);

  // 3. Extract audio using ffmpeg
  console.log('Extracting audio...');
  await new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .toFormat('mp3')
      .on('end', resolve)
      .on('error', reject)
      .save(audioPath);
  });

  // 4. Transcribe using Groq Whisper
  console.log('Transcribing with Groq...');
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-large-v3-turbo',
    language: 'en',
    response_format: 'json',
  });

  // Cleanup
  try {
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    // Also cleanup any other temp_video files just in case
    files.forEach(f => {
      if (f.startsWith(videoBaseName) && f !== videoFileName && !f.endsWith('.mp3')) {
        try { fs.unlinkSync(path.join(videoDir, f)); } catch(e) {}
      }
    });
  } catch (err) {
    console.error('Error cleaning up files:', err);
  }

  return transcription.text;
}

module.exports = { transcribeVideo };
