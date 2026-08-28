export function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function methodGuard(req, res, method) {
  if (req.method !== method) {
    send(res, 405, { error: 'Method not allowed' })
    return false
  }
  return true
}

// Vercel parses JSON bodies into req.body; the local dev shim does the same.
export function getBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return {}
}

export function getIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim()
  return req.socket?.remoteAddress || ''
}

// Best-effort per-instance throttle for the public token endpoints. Unguessable
// 256-bit tokens are the real defense; this blunts brute force and spam.
const buckets = new Map()
export function rateLimit(req, res, { max = 30, windowMs = 60_000 } = {}) {
  const key = getIp(req) || 'unknown'
  const now = Date.now()
  const entry = buckets.get(key) || { count: 0, start: now }
  if (now - entry.start > windowMs) {
    entry.count = 0
    entry.start = now
  }
  entry.count += 1
  buckets.set(key, entry)
  if (buckets.size > 5000) buckets.clear()
  if (entry.count > max) {
    send(res, 429, { error: 'Too many requests — please try again shortly' })
    return false
  }
  return true
}
