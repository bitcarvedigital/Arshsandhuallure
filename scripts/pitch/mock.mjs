// Network-level mock of Supabase (PostgREST + auth + storage) and the /api
// serverless functions, attached to a Playwright BrowserContext.
import { createRequire } from 'node:module'
import { ADMIN_USER, CLIENT_USER, CLIENT_ID, PARTY_TOKEN } from './fixtures.mjs'

const require = createRequire(new URL('../../package.json', import.meta.url).pathname)
const sharp = require('sharp')

export const SUPA = 'http://mock.supabase'
export const STORAGE_KEY = 'sb-mock-auth-token'

const imgCache = new Map()
async function placeholder(slot, idx) {
  const key = `${slot}-${idx}`
  if (imgCache.has(key)) return imgCache.get(key)
  const palettes = {
    selfie: ['#E9D5C6', '#C9A48C'],
    makeup_inspo: ['#F1DCD4', '#C98E8A'],
    hair_inspo: ['#E7DACB', '#A98866'],
    additional: ['#E3DED7', '#9E9488'],
  }
  const [a, b] = palettes[slot] || palettes.additional
  const label = { selfie: 'selfie', makeup_inspo: 'makeup', hair_inspo: 'hair', additional: 'inspo' }[slot] || 'photo'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="400" height="400" fill="url(#g)"/>
    <circle cx="200" cy="${idx % 2 ? 150 : 170}" r="${70 + (idx % 3) * 12}" fill="rgba(255,255,255,0.28)"/>
    <text x="200" y="360" font-family="Georgia, serif" font-size="30" fill="rgba(60,40,30,0.55)" text-anchor="middle" font-style="italic">${label}</text>
  </svg>`
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer()
  imgCache.set(key, buf)
  return buf
}

function parseFilter(raw) {
  // "eq.value" | "in.(a,b)" | "is.null" | "gt.x" ...
  const dot = raw.indexOf('.')
  const op = raw.slice(0, dot)
  const val = raw.slice(dot + 1)
  return { op, val }
}

function matches(row, col, { op, val }) {
  const v = row[col]
  switch (op) {
    case 'eq':
      return String(v) === val
    case 'neq':
      return String(v) !== val
    case 'in': {
      const list = val.replace(/^\(|\)$/g, '').split(',').map((s) => s.trim().replace(/^"|"$/g, ''))
      return list.includes(String(v))
    }
    case 'is':
      return val === 'null' ? v == null : val === 'true' ? v === true : v === false
    case 'gt':
      return v != null && v > val
    case 'gte':
      return v != null && v >= val
    case 'lt':
      return v != null && v < val
    case 'lte':
      return v != null && v <= val
    default:
      return true
  }
}

function applyOrder(rows, orderParam) {
  if (!orderParam) return rows
  const clauses = orderParam.split(',').map((c) => {
    const parts = c.split('.')
    return { col: parts[0], desc: parts.includes('desc'), nullsFirst: parts.includes('nullsfirst') }
  })
  return [...rows].sort((a, b) => {
    for (const { col, desc, nullsFirst } of clauses) {
      const x = a[col]
      const y = b[col]
      if (x == null && y == null) continue
      if (x == null) return nullsFirst ? -1 : 1
      if (y == null) return nullsFirst ? 1 : -1
      if (x < y) return desc ? 1 : -1
      if (x > y) return desc ? -1 : 1
    }
    return 0
  })
}

function scopeForPersona(state, table, rows) {
  // Mimic RLS: a client only sees her own rows and only visible documents.
  if (state.persona !== 'client') return rows
  if (table === 'clients') return rows.filter((r) => r.id === CLIENT_ID)
  if (table === 'client_documents') return rows.filter((r) => r.client_id === CLIENT_ID && r.visible)
  if (['agreements', 'payments', 'intakes', 'party_members', 'party_share_tokens', 'submissions'].includes(table)) {
    return rows.filter((r) => r.client_id === CLIENT_ID)
  }
  return rows
}

export function attachMock(context, state) {
  const { db } = state

  // ---- PostgREST -----------------------------------------------------------
  context.route(`${SUPA}/rest/v1/**`, async (route, request) => {
    const url = new URL(request.url())
    const method = request.method()
    const path = url.pathname.replace('/rest/v1/', '')
    const headers = request.headers()
    const wantsObject = (headers.accept || '').includes('vnd.pgrst.object')
    const json = (body, status = 200, extra = {}) =>
      route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...extra }, body: JSON.stringify(body) })

    if (path.startsWith('rpc/')) {
      const fn = path.slice(4)
      if (fn === 'is_admin') return json(state.persona === 'admin')
      return json(null)
    }

    const table = path
    let rows = scopeForPersona(state, table, db[table] || [])
    const filters = []
    for (const [k, v] of url.searchParams.entries()) {
      if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue
      filters.push([k, parseFilter(v)])
    }
    const filtered = rows.filter((r) => filters.every(([col, f]) => matches(r, col, f)))

    if (method === 'HEAD') {
      return route.fulfill({
        status: 200,
        headers: { 'content-range': `0-${Math.max(filtered.length - 1, 0)}/${filtered.length}`, 'access-control-allow-origin': '*' },
        body: '',
      })
    }

    if (method === 'GET') {
      let out = applyOrder(filtered, url.searchParams.get('order'))
      const limit = url.searchParams.get('limit')
      if (limit) out = out.slice(0, Number(limit))
      if (wantsObject) {
        if (out.length !== 1) return json({ code: 'PGRST116', message: 'no rows' }, 406)
        return json(out[0])
      }
      return json(out)
    }

    if (method === 'POST') {
      const body = request.postDataJSON()
      const list = Array.isArray(body) ? body : [body]
      const created = list.map((b) => ({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'draft',
        ...b,
      }))
      db[table] = [...(db[table] || []), ...created]
      return json(wantsObject ? created[0] : created, 201)
    }

    if (method === 'PATCH') {
      const patch = request.postDataJSON()
      const ids = new Set(filtered.map((r) => r.id ?? r.key ?? r.client_id))
      db[table] = (db[table] || []).map((r) => (ids.has(r.id ?? r.key ?? r.client_id) ? { ...r, ...patch, updated_at: new Date().toISOString() } : r))
      const updated = (db[table] || []).filter((r) => ids.has(r.id ?? r.key ?? r.client_id))
      return json(wantsObject ? updated[0] : updated)
    }

    if (method === 'DELETE') {
      const ids = new Set(filtered.map((r) => r.id))
      db[table] = (db[table] || []).filter((r) => !ids.has(r.id))
      return json([])
    }

    return json({ error: 'unhandled' }, 500)
  })

  // ---- Auth ----------------------------------------------------------------
  context.route(`${SUPA}/auth/v1/**`, async (route, request) => {
    const url = new URL(request.url())
    const p = url.pathname
    const user = state.persona === 'admin' ? ADMIN_USER : CLIENT_USER
    const fullUser = { ...user, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-08-01T00:00:00Z' }
    if (p.endsWith('/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fullUser) })
    if (p.endsWith('/logout')) return route.fulfill({ status: 204, body: '' })
    if (p.endsWith('/token')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(makeSession(fullUser)) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  // ---- Storage -------------------------------------------------------------
  context.route(`${SUPA}/storage/v1/**`, async (route, request) => {
    const url = new URL(request.url())
    const p = url.pathname
    if (request.method() === 'POST' && p.includes('/object/sign/')) {
      const objPath = p.split('/object/sign/')[1]
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ signedURL: `/object/sign/${objPath}?token=demo` }),
      })
    }
    if (request.method() === 'GET' && p.includes('/object/sign/')) {
      const parts = p.split('/')
      const file = parts[parts.length - 1]
      const slot = parts[parts.length - 2]
      const idx = Number((file.match(/\d+/) || [1])[0])
      const buf = await placeholder(slot, idx)
      return route.fulfill({ status: 200, contentType: 'image/jpeg', body: buf })
    }
    if (request.method() === 'POST' || request.method() === 'PUT') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'client-uploads/x' }) })
    }
    return route.fulfill({ status: 404, body: '' })
  })

  // ---- /api serverless functions ------------------------------------------
  context.route('**/api/**', async (route, request) => {
    const url = new URL(request.url())
    const p = url.pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (p.endsWith('/api/invite-info')) return json({ valid: true, firstName: 'Priya', email: CLIENT_USER.email })
    if (p.endsWith('/api/party/info')) return json({ valid: true, brideFirstName: 'Priya', eventDate: '2026-11-14' })
    if (p.endsWith('/api/party/upload-url')) return json({ path: 'x/y/z.jpg', token: 'demo' })
    if (p.endsWith('/api/party/submit')) return json({ ok: true })
    if (p.endsWith('/api/admin/create-client')) {
      return json({ clientId: 'c1c1c1c1-0000-4000-8000-000000000002', inviteUrl: 'https://bellerose.example/join/Zt7Qm2VbKd9RxL4nHs8WcPy3AgEu1JfT' })
    }
    if (p.endsWith('/api/sign-agreement')) return json({ agreement: db.agreements[0] })
    return json({ error: 'not mocked' }, 404)
  })
}

export function makeSession(user) {
  const expires_at = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30
  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    expires_in: 60 * 60 * 24 * 30,
    expires_at,
    token_type: 'bearer',
    user,
  }
}

export async function seedSession(context, persona) {
  const user = persona === 'admin' ? ADMIN_USER : CLIENT_USER
  const fullUser = { ...user, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-08-01T00:00:00Z' }
  const session = makeSession(fullUser)
  await context.addInitScript(
    ({ key, value }) => {
      try {
        window.localStorage.setItem(key, value)
      } catch {}
    },
    { key: STORAGE_KEY, value: JSON.stringify(session) }
  )
}

export { PARTY_TOKEN }
