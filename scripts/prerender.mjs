// Writes one static HTML file per marketing route from the SSR bundle.
// Runs as the last step of `npm run build`; vercel.json maps each route to its file.
import { readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const PRERENDER_ROUTES = {
  '/': 'index.html',
  '/about': 'about.html',
  '/services': 'services.html',
  '/reviews': 'reviews.html',
  '/book': 'book.html',
  '/bridal-makeup-artist-mississauga': 'bridal-makeup-artist-mississauga.html',
}

const dist = path.resolve('dist')
const template = readFileSync(path.join(dist, 'index.html'), 'utf8')
// The untouched shell stays as spa.html: vercel.json's catch-all sends the
// portal/admin/party/privacy routes here so they mount from an empty root
// instead of hydrating against the prerendered home page.
writeFileSync(path.join(dist, 'spa.html'), template)
const { render } = await import(pathToFileURL(path.join(dist, 'server', 'entry-server.js')).href)

// The template carries home-page defaults tagged data-rh="true"; Helmet re-emits
// the route's own title/description/canonical/og:* in their place.
const stripDefaults = (html) =>
  html
    .replace(/^\s*<title[^>]*data-rh="true"[^>]*>.*?<\/title>\r?\n/gm, '')
    .replace(/^\s*<(?:meta|link)\b[^>]*data-rh="true"[^>]*\/?>\r?\n/gm, '')

// Inline the (small) CSS bundle so first paint of a prerendered page waits on
// nothing but the HTML itself. spa.html keeps the normal <link>.
const cssFile = readdirSync(path.join(dist, 'assets')).find((f) => /^index-.*\.css$/.test(f))
if (!cssFile) throw new Error('prerender: css bundle not found')
const cssText = readFileSync(path.join(dist, 'assets', cssFile), 'utf8')
const cssLink = new RegExp(`<link rel="stylesheet"[^>]*href="/assets/${cssFile.replace('.', '\\.')}"[^>]*>`)
if (!cssLink.test(template)) throw new Error('prerender: css <link> not found in template')

let words = {}
for (const [url, file] of Object.entries(PRERENDER_ROUTES)) {
  const { html, head } = render(url)
  if (!html || !head) throw new Error(`prerender: empty output for ${url}`)
  const out = stripDefaults(template)
    .replace(cssLink, `<style>${cssText}</style>`)
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
  if (!out.includes(`<div id="root">${html}`)) throw new Error(`prerender: root placeholder missing for ${url}`)
  writeFileSync(path.join(dist, file), out)
  words[url] = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
}
rmSync(path.join(dist, 'server'), { recursive: true, force: true })
console.log('prerendered:', Object.entries(words).map(([u, n]) => `${u} (${n} words)`).join(', '))
