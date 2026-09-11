// Local stand-in for Vercel's static serving + vercel.json rewrites, for
// verifying the built site (`npm run build` first). Not used in production.
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')
const port = Number(process.argv[2] || 4199)
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'))
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json', '.ico': 'image/x-icon' }

createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  // Vercel-only injected scripts (analytics) don't exist locally — 404 them honestly.
  if (url.startsWith('/_vercel/')) { res.writeHead(404); return res.end() }
  let file = path.join(dist, url)
  if (!(existsSync(file) && statSync(file).isFile())) {
    const rule = vercel.rewrites.find((r) => new RegExp(`^${r.source.replace(/\((.*)\)/, '($1)')}$`).test(url))
    file = path.join(dist, rule ? rule.destination : 'index.html')
  }
  if (!file.startsWith(dist) || !existsSync(file)) { res.writeHead(404); return res.end('not found') }
  const ext = path.extname(file)
  // Mirror production: HTML always revalidates, hashed assets are immutable.
  const cache = ext === '.html' ? 'no-store' : file.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=86400'
  res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': cache })
  res.end(readFileSync(file))
}).listen(port, () => console.log(`dist served on http://localhost:${port}`))
