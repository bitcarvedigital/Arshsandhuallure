// Build-time renderer used by scripts/prerender.mjs to write real HTML for the
// marketing routes. Never runs in the browser.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { HelmetProvider } from 'react-helmet-async'
import { StaticRouter } from 'react-router'
import { AppRoutes } from './App.jsx'

export function render(url) {
  const helmetContext = {}
  const html = renderToString(
    <StrictMode>
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={url}>
          <AppRoutes />
        </StaticRouter>
      </HelmetProvider>
    </StrictMode>,
  )
  const { helmet } = helmetContext
  const head = [helmet.title.toString(), helmet.meta.toString(), helmet.link.toString()]
    .filter(Boolean)
    .join('\n    ')
  return { html, head }
}
