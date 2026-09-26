// Renders the portal's real invoice and timeline PDFs (api/_lib/*Pdf.js) with
// the placeholder brand, then rasterises their pages to PNG with pdf.js so the
// deck can show them. Output: .pitch/pdf/*.pdf and .pitch/shots/pdf-*.png
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, extname } from 'node:path'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'
import { rebrand } from './brand.mjs'
import { makeDb, CLIENT_ID, E2 } from './fixtures.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const GEN = join(ROOT, '.pitch/gen/')
const PDF = join(ROOT, '.pitch/pdf/')
const SHOTS = join(ROOT, '.pitch/shots/')
for (const d of [GEN, PDF, SHOTS]) mkdirSync(d, { recursive: true })

// a copy of a renderer with the brand swapped and its relative paths pinned
function branded(rel) {
  const src = join(ROOT, rel)
  const code = rebrand(readFileSync(src, 'utf8'))
    .replaceAll('import.meta.url', JSON.stringify(pathToFileURL(src).href))
    .replaceAll("'../../src/shared/", `'${pathToFileURL(join(ROOT, 'src/shared/')).href}`)
  const out = join(GEN, rel.split('/').pop().replace(/\.js$/, '.mjs'))
  writeFileSync(out, code)
  return import(pathToFileURL(out).href)
}

const { renderInvoicePdf } = await branded('api/_lib/invoicePdf.js')
const { renderTimelinePdf, cleanTimelineContent } = await branded('api/_lib/timelinePdf.js')

const db = makeDb()
const invoice = db.invoices[0]
const client = db.clients.find((c) => c.id === CLIENT_ID)
const wedding = db.events.find((e) => e.id === E2)
const content = db.event_timelines.find((t) => t.event_id === E2).content

writeFileSync(join(PDF, 'invoice.pdf'), await renderInvoicePdf({ invoice, snapshot: invoice.snapshot }))
writeFileSync(join(PDF, 'timeline.pdf'), await renderTimelinePdf({ client, event: wedding, content: cleanTimelineContent(content) }))
console.log('✓ pdfs written')

// ---- rasterise with pdf.js in Chromium --------------------------------------
const require = createRequire(import.meta.url)
const PDFJS = dirname(require.resolve('pdfjs-dist/package.json'))
const TYPES = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.pdf': 'application/pdf', '.html': 'text/html', '.map': 'application/json' }
const VIEW = `<!doctype html><body style="margin:0;background:#fff">
<script type="module">
import * as pdfjs from '/pdfjs/build/pdf.mjs'
pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/build/pdf.worker.mjs'
const f = new URLSearchParams(location.search).get('f')
const pdf = await pdfjs.getDocument('/pdf/' + f).promise
for (let n = 1; n <= pdf.numPages; n++) {
  const page = await pdf.getPage(n)
  const vp = page.getViewport({ scale: 2.4 })
  const c = document.createElement('canvas')
  c.width = vp.width; c.height = vp.height; c.id = 'p' + n; c.style.display = 'block'
  document.body.appendChild(c)
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
}
document.body.dataset.pages = pdf.numPages
</script></body>`

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  let file = null
  if (url.pathname === '/view.html') {
    res.writeHead(200, { 'content-type': 'text/html' })
    return res.end(VIEW)
  }
  if (url.pathname.startsWith('/pdfjs/')) file = join(PDFJS, url.pathname.slice(7))
  if (url.pathname.startsWith('/pdf/')) file = join(PDF, url.pathname.slice(5))
  if (!file || !existsSync(file)) {
    res.writeHead(404)
    return res.end()
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise((r) => server.listen(5191, '127.0.0.1', r))

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } })
for (const name of ['invoice', 'timeline']) {
  await page.goto(`http://127.0.0.1:5191/view.html?f=${name}.pdf`)
  await page.waitForSelector('body[data-pages]', { timeout: 30000 })
  const pages = Number(await page.getAttribute('body', 'data-pages'))
  for (let n = 1; n <= pages; n++) {
    await page.locator(`#p${n}`).screenshot({ path: join(SHOTS, `pdf-${name}-p${n}.png`) })
    console.log(`✓ pdf-${name}-p${n}`)
  }
}
await browser.close()
server.close()
