import { createHash, randomBytes } from 'node:crypto'

export function generateToken() {
  return randomBytes(32).toString('base64url')
}

export function hashToken(raw) {
  return createHash('sha256').update(raw).digest('hex')
}

const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/
export function looksLikeToken(raw) {
  return typeof raw === 'string' && TOKEN_RE.test(raw)
}
