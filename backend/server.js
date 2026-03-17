const express = require('express');
const cors = require('cors');
const { transcribeVideo } = require('./services/transcribeService');
const { saveToNotion } = require('./services/notionService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/transcribe', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const text = await transcribeVideo(url);
    res.json({ text });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message || 'Failed to transcribe video' });
  }
});

app.post('/save-to-notion', async (req, res) => {
  const { text, url } = req.body;

  if (!text || !url) {
    return res.status(400).json({ error: 'Text and URL are required' });
  }

  try {
    await saveToNotion(text, url);
    res.json({ message: 'Saved to Notion successfully!' });
  } catch (error) {
    console.error('Notion error:', error);
    res.status(500).json({ error: error.message || 'Failed to save to Notion' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
