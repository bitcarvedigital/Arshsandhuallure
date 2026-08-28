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
