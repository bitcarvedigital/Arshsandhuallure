import { supabaseAdmin } from './supabaseAdmin.js'

export function getBearer(req) {
  const h = req.headers['authorization'] || ''
  return h.startsWith('Bearer ') ? h.slice(7) : null
}

// Validates the caller's JWT and returns { user, admin } (admin client reused).
export async function getCaller(req) {
  const jwt = getBearer(req)
  if (!jwt) return { user: null, admin: supabaseAdmin() }
  const admin = supabaseAdmin()
  const { data, error } = await admin.auth.getUser(jwt)
  if (error || !data?.user) return { user: null, admin }
  return { user: data.user, admin }
}

export async function requireAdmin(req) {
  const { user, admin } = await getCaller(req)
  if (!user) return { error: 'Not signed in', admin: null, user: null }
  const { data } = await admin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!data) return { error: 'Not authorized', admin: null, user: null }
  return { error: null, admin, user }
}

export async function requireClient(req) {
  const { user, admin } = await getCaller(req)
  if (!user) return { error: 'Not signed in', admin: null, user: null, client: null }
  const { data } = await admin.from('clients').select('*').eq('user_id', user.id).maybeSingle()
  if (!data) return { error: 'No client account', admin: null, user: null, client: null }
  return { error: null, admin, user, client: data }
}
