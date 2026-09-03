import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { refuseToBeFramed } from './lib/frameGuard'

// Clickjacking guard. ForgeOS is never legitimately inside an iframe — it is a
// top-level page in the browser and the top document inside the Capacitor
// WebView — and `frame-ancestors` cannot help here, because browsers ignore it
// in a <meta> CSP and GitHub Pages cannot send a real header. So the app checks
// for itself, before rendering anything worth stealing a click on.
if (refuseToBeFramed(window)) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
