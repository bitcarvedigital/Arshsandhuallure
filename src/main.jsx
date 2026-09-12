import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'

// A refresh should land at the top of the page, not wherever the browser last was.
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

const root = document.getElementById('root')
const app = (
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
)

// Marketing routes ship prerendered HTML (scripts/prerender.mjs) and hydrate;
// portal/admin/party routes still get the empty shell and mount from scratch.
if (root.hasChildNodes()) {
  hydrateRoot(root, app)
} else {
  createRoot(root).render(app)
}
