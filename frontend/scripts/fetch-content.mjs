// Runs before every build: downloads the latest saved content from the API and bakes it into the site,
// so the public page always shows current content even if the API is asleep or down.
// If the API can't be reached, the build continues with the last bundled copy.
import { writeFile } from 'node:fs/promises';

const API = (process.env.VITE_API_URL || '').replace(/\/$/, '');
const OUT = new URL('../src/data/content.json', import.meta.url);
const REQUIRED = ['profile', 'stats', 'projects', 'logbook', 'certifications', 'skills', 'contact'];

if (!API) {
  console.log('[content] VITE_API_URL not set, using bundled content.json');
  process.exit(0);
}

// Render's free plan can take up to ~60 s to wake, so retry for about 2 minutes.
const deadline = Date.now() + 120_000;
let attempt = 0;
while (Date.now() < deadline) {
  attempt += 1;
  try {
    const res = await fetch(`${API}/api/content`, { signal: AbortSignal.timeout(70_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { content, updated_at } = await res.json();
    const missing = REQUIRED.filter((k) => !(k in (content || {})));
    if (missing.length) throw new Error(`content missing: ${missing.join(', ')}`);
    await writeFile(OUT, JSON.stringify(content, null, 2) + '\n');
    console.log(`[content] baked live content from ${API} (saved ${updated_at})`);
    process.exit(0);
  } catch (err) {
    console.log(`[content] attempt ${attempt} failed: ${err.message}`);
    await new Promise((r) => setTimeout(r, 10_000));
  }
}
console.log('[content] API unreachable, keeping the bundled content.json');
