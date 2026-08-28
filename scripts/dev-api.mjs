// Local stand-in for Vercel's /api runtime: maps /api/foo/bar → api/foo/bar.js
// and parses JSON bodies like Vercel does. Vite (npm run dev) proxies /api here.
//   node scripts/dev-api.mjs        (port 3999)
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import process from 'node:process'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
const PORT = 3999

// load .env.local into process.env (no dotenv dep)
import { readFileSync } from 'node:fs'
for (const file of ['.env.local', '.env']) {
  const p = join(ROOT, file)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (!url.pathname.startsWith('/api/')) {
    res.statusCode = 404
    return res.end('not found')
  }
  const rel = url.pathname.slice(5).replace(/[^a-zA-Z0-9/_-]/g, '')
  const file = join(ROOT, 'api', `${rel}.js`)
  if (!file.startsWith(join(ROOT, 'api')) || !existsSync(file)) {
    res.statusCode = 404
    return res.end(JSON.stringify({ error: 'No such endpoint' }))
  }

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  try {
    req.body = raw ? JSON.parse(raw) : {}
  } catch {
    req.body = raw
  }

  try {
    const mod = await import(file)
    await mod.default(req, res)
  } catch (err) {
    console.error(`[${url.pathname}]`, err)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Internal error' }))
  }
})

server.listen(PORT, () => console.log(`dev /api shim on http://localhost:${PORT}`))
