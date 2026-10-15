import { useEffect, useState } from 'react';
import fallback from '../data/content.json';
import { API_URL, fetchContent } from '../api';
import type { Content } from '../types';

// Shows the bundled content instantly, then swaps in live content from the API
// (Render's free tier can take ~30–50 s to wake up, so the page never waits on it).
export function useContent() {
  const [content, setContent] = useState<Content>(fallback as Content);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!API_URL) return;
    let cancelled = false;
    fetchContent()
      .then((d) => { if (!cancelled) { setContent(d.content); setLive(true); } })
      .catch(() => { /* keep bundled content */ });
    return () => { cancelled = true; };
  }, []);

  return { content, live };
}
