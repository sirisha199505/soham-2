import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Poll /api/health until the server AND database are ready.
// This warms up Render's free tier before the user hits Submit.
const BASE = import.meta.env.VITE_API_URL || '';
if (BASE) {
  (async function warmUp() {
    for (let i = 0; i < 15; i++) {         // up to ~75 s total
      try {
        const r = await fetch(`${BASE}/api/health`);
        const j = await r.json();
        if (j.db) return;                   // DB is ready — stop polling
      } catch { /* ignore */ }
      await new Promise(r => setTimeout(r, 5000));
    }
  })();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
