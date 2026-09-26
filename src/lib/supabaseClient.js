import { createClient } from '@supabase/supabase-js'

// Lazy-chunk only — never import from marketing components.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export async function authedFetch(path, body) {
  const { data } = await supabase.auth.getSession()
  const jwt = data?.session?.access_token
  const resp = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body || {}),
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(json.error || 'Something went wrong — please try again')
  return json
}

// POST with the session JWT and save the response (e.g. an invoice PDF).
export async function authedDownload(path, body, filename) {
  const { data } = await supabase.auth.getSession()
  const jwt = data?.session?.access_token
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    body: JSON.stringify(body || {}),
  })
  if (!resp.ok) {
    const json = await resp.json().catch(() => ({}))
    throw new Error(json.error || 'Could not download — please try again')
  }
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'download.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function publicFetch(path, body) {
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(json.error || 'Something went wrong — please try again')
  return json
}
