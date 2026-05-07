import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Ping backend on load so Render free tier wakes up before the user submits a form
const BASE = import.meta.env.VITE_API_URL || '';
if (BASE) fetch(`${BASE}/api/health`).catch(() => {});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
