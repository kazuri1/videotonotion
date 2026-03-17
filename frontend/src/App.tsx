import { useState } from 'react';
import axios from 'axios';
import { Copy, Save, Check, Loader2, AlertCircle } from 'lucide-react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleTranscribe = async () => {
    if (!url) return;
    setLoading(true);
    setTranscript('');
    setError('');
    setSaved(false);
    
    try {
      setStep('Downloading video...');
      const response = await axios.post(`${API_BASE_URL}/transcribe`, { url });
      setTranscript(response.data.text);
      setStep('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || (err.request ? 'Network Error: Cannot connect to backend.' : 'An unexpected error occurred.');
      setError(`${errorMsg} Please ensure the URL is valid and the video is under 5 minutes.`);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToNotion = async () => {
    if (!transcript) return;
    setLoading(true);
    setError('');
    
    try {
      setStep('Saving to Notion...');
      await axios.post(`${API_BASE_URL}/save-to-notion`, { text: transcript, url });
      setSaved(true);
      setStep('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save to Notion.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Video Transcriber</h1>
        <p className="subtitle">Convert Reel or video URLs to Notion-ready scripts.</p>

        <div className="form-group">
          <input
            type="text"
            placeholder="Paste video URL (Instagram Reel, YouTube, etc.)"
            className="input-field"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />

          <button
            onClick={handleTranscribe}
            disabled={loading || !url}
            className={`btn-primary ${loading ? 'btn-loading' : ''}`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                <span>{step || 'Processing...'}</span>
              </>
            ) : (
              'Get Script'
            )}
          </button>

          {error && (
            <div className="error-box">
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}

          {transcript && (
            <div className="transcript-area animate-fade-in">
              <div className="textarea-wrapper">
                <textarea
                  className="textarea"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Transcript will appear here..."
                />
              </div>

              <div className="action-buttons">
                <button
                  onClick={handleCopy}
                  className="btn-secondary"
                >
                  {copied ? <Check size={20} className="text-success" /> : <Copy size={20} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleSaveToNotion}
                  disabled={loading || saved}
                  className={`btn-purple ${saved ? 'btn-success' : ''}`}
                >
                  {saved ? <Check size={20} /> : <Save size={20} />}
                  {saved ? 'Saved to Notion' : 'Save to Notion'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <p className="footer">Max video length: 5 minutes • Uses Whisper API</p>
    </div>
  );
}

export default App;
