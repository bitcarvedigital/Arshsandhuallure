import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { send, methodGuard, getBody, rateLimit } from '../_lib/http.js'
import { looksLikeToken } from '../_lib/tokens.js'

export async function resolvePartyToken(admin, token) {
  if (!looksLikeToken(token)) return null
  const { data } = await admin
    .from('party_share_tokens')
    .select('id, client_id, expires_at, revoked_at, clients ( full_name, event_date )')
    .eq('token', token)
    .maybeSingle()
  if (!data) return null
  if (data.revoked_at) return null
  if (new Date(data.expires_at) < new Date()) return null
  return data
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return
  if (!rateLimit(req, res, { max: 30 })) return
  const { token } = getBody(req)
  const admin = supabaseAdmin()
  const t = await resolvePartyToken(admin, token)
  if (!t) return send(res, 200, { valid: false })
  return send(res, 200, {
    valid: true,
    brideFirstName: (t.clients.full_name || '').split(' ')[0],
    eventDate: t.clients.event_date,
  })
}
