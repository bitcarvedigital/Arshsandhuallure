import { supabaseAdmin } from './_lib/supabaseAdmin.js'
import { send, methodGuard, getBody, rateLimit } from './_lib/http.js'
import { hashToken, looksLikeToken } from './_lib/tokens.js'

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return
  if (!rateLimit(req, res, { max: 20 })) return
  const { token } = getBody(req)
  if (!looksLikeToken(token)) return send(res, 400, { valid: false })

  const admin = supabaseAdmin()
  const { data: invite } = await admin
    .from('invite_tokens')
    .select('id, client_id, expires_at, used_at, clients ( full_name, email, user_id )')
    .eq('token_hash', hashToken(token))
    .maybeSingle()

  if (!invite) return send(res, 200, { valid: false })
  const expired = new Date(invite.expires_at) < new Date()
  const used = !!invite.used_at
  const registered = !!invite.clients?.user_id
  if (expired || used || registered) return send(res, 200, { valid: false, expired, registered })

  return send(res, 200, {
    valid: true,
    email: invite.clients.email,
    firstName: (invite.clients.full_name || '').split(' ')[0],
  })
}
