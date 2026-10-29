import { useState } from 'react';
import axios from 'axios';
import { Copy, Save, Check, Loader2, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
      const errorMsg = err.response?.data?.error || (err.request ? `Network Error: Cannot connect to backend at ${API_BASE_URL}.` : 'An unexpected error occurred.');
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

  const working = loading && !!step;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-sm bg-primary text-primary-foreground">
            <FileText className="size-4" />
          </span>
          Reelnote
        </span>
        <span className="text-sm text-muted-foreground">Videos up to 5 minutes, transcribed with Whisper</span>
      </header>

      <main className="grid gap-6 px-6 pb-10 sm:px-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
        <section className="flex flex-col gap-6 lg:pt-10">
          <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-7xl">
            Reel in,<br />Notion page out.
          </h1>
          <p className="max-w-md text-lg leading-relaxed">
            Paste the link to an Instagram Reel or YouTube video. You get the spoken script back, ready to edit and save to Notion.
          </p>

          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => { e.preventDefault(); handleTranscribe(); }}
          >
            <label htmlFor="video-url" className="text-sm font-medium">Video link</label>
            <Input
              id="video-url"
              type="url"
              placeholder="https://www.instagram.com/reel/..."
              className="h-12 bg-card text-base"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" size="lg" className="h-12 text-base" disabled={loading || !url}>
              {working ? <><Loader2 className="animate-spin" />{step}</> : 'Get the script'}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="bg-card">
              <AlertCircle />
              <AlertTitle>That did not work</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </section>

        <section aria-label="Transcript" className="flex min-h-[28rem] flex-col rounded-md bg-card p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Script</h2>
            {transcript && (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleCopy}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button onClick={handleSaveToNotion} disabled={loading || saved}>
                  {loading && step.startsWith('Saving') ? <Loader2 className="animate-spin" /> : saved ? <Check /> : <Save />}
                  {saved ? 'Saved to Notion' : 'Save to Notion'}
                </Button>
              </div>
            )}
          </div>

          {transcript ? (
            <Textarea
              aria-label="Transcript text"
              className="mt-6 min-h-80 flex-1 resize-none border-0 bg-background text-base leading-relaxed"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          ) : loading ? (
            <div className="mt-6 flex flex-1 flex-col gap-3" aria-busy="true">
              <p className="text-base">{step || 'Working...'}</p>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
              No script yet. Paste a video link and the transcript will appear here, editable before you save it.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
