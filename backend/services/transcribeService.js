const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');
const ffmpeg = require('fluent-ffmpeg');
require('dotenv').config();

const YT_DLP_PATH = process.env.YT_DLP_PATH || path.join(__dirname, '../yt-dlp');
const FFMPEG_PATH = process.env.FFMPEG_PATH || path.join(__dirname, '../ffmpeg');
const FFPROBE_PATH = path.join(path.dirname(FFMPEG_PATH), 'ffprobe');

console.log('--- Startup Config ---');
console.log('__dirname:', __dirname);
console.log('YT_DLP_PATH:', YT_DLP_PATH);
console.log('FFMPEG_PATH:', FFMPEG_PATH);
console.log('YT_DLP_EXISTS:', fs.existsSync(YT_DLP_PATH));
console.log('FFMPEG_EXISTS:', fs.existsSync(FFMPEG_PATH));
console.log('FFPROBE_EXISTS:', fs.existsSync(FFPROBE_PATH));
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

  // 1. Download audio directly using yt-dlp
  console.log('Downloading and extracting audio...');
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
      console.log('COOKIES_TEXT detected. Writing to:', cookiesPath);
      try {
        fs.writeFileSync(cookiesPath, process.env.COOKIES_TEXT);
        console.log('Cookies file written successfully. Size:', fs.statSync(cookiesPath).size);
        cookieArg = `--cookies "${cookiesPath}"`;
      } catch (err) {
        console.error('Error writing cookies file:', err);
      }
    }

    // We use --extract-audio and --audio-format mp3 to get an mp3 directly
    // Pointing --ffmpeg-location to the ABSOLUTE directory so it finds both ffmpeg and ffprobe
    const toolDir = path.resolve(path.dirname(FFMPEG_PATH));
    const command = `"${YT_DLP_PATH}" ${cookieArg} --ffmpeg-location "${toolDir}" --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" --referer "https://www.instagram.com/" -f "ba/b" --extract-audio --audio-format mp3 --match-filter "duration <= ${MAX_DURATION}" --no-playlist --no-warnings -o "${audioPath}" "${url}"`;
    
    exec(command, { env }, (error, stdout, stderr) => {
      if (fs.existsSync(cookiesPath)) {
        try { fs.unlinkSync(cookiesPath); } catch(e) {}
      }

      if (error) {
        console.error('yt-dlp/ffmpeg error:', error);
        return reject(new Error(`Extraction failed: ${stderr || error.message}`));
      }
      
      if (stdout.includes('does not pass filter')) {
        return reject(new Error(`Video is too long (over ${MAX_DURATION} seconds).`));
      }

      resolve();
    });
  });

  // 2. Verify we have the audio file
  if (!fs.existsSync(audioPath)) {
    throw new Error('Audio extraction failed: temp_audio.mp3 not found.');
  }
  
  const stats = fs.statSync(audioPath);
  console.log('Audio file ready at:', audioPath);
  console.log('Audio file size:', stats.size, 'bytes');

  if (stats.size === 0) {
    throw new Error('Audio extraction failed: file is 0 bytes.');
  }

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
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    // Also cleanup any other temp files in the root just in case
    const files = fs.readdirSync(videoDir);
    files.forEach(f => {
      if ((f.startsWith('temp_video') || f.startsWith('temp_audio')) && f.endsWith('.mp3')) {
        // We only delete them if they aren't the one we just processed (though we just deleted it)
      } else if (f.startsWith('temp_video')) {
        try { fs.unlinkSync(path.join(videoDir, f)); } catch(e) {}
      }
    });
  } catch (err) {
    console.error('Error cleaning up files:', err);
  }

  return transcription.text;
}

module.exports = { transcribeVideo };
