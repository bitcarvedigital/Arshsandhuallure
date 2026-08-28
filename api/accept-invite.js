import { supabaseAdmin } from './_lib/supabaseAdmin.js'
import { send, methodGuard, getBody, rateLimit } from './_lib/http.js'
import { hashToken, looksLikeToken } from './_lib/tokens.js'

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return
  if (!rateLimit(req, res, { max: 10 })) return
  const { token, password } = getBody(req)
  if (!looksLikeToken(token)) return send(res, 400, { error: 'Invalid link' })
  if (typeof password !== 'string' || password.length < 8) {
    return send(res, 400, { error: 'Password must be at least 8 characters' })
  }

  const admin = supabaseAdmin()
  const { data: invite } = await admin
    .from('invite_tokens')
    .select('id, client_id, expires_at, used_at, clients ( id, email, full_name, user_id )')
    .eq('token_hash', hashToken(token))
    .maybeSingle()

  if (!invite) return send(res, 400, { error: 'This link is not valid' })
  if (invite.used_at) return send(res, 400, { error: 'This link has already been used' })
  if (new Date(invite.expires_at) < new Date()) {
    return send(res, 400, { error: 'This link has expired — please ask for a new one' })
  }
  if (invite.clients.user_id) {
    return send(res, 400, { error: 'This account is already set up — please sign in' })
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: invite.clients.email,
    password,
    email_confirm: true,
  })
  if (createErr) {
    console.error('createUser failed', createErr)
    const msg = /already/i.test(createErr.message || '')
      ? 'An account with this email already exists — try signing in or resetting your password'
      : 'We could not create your account — please try again'
    return send(res, 400, { error: msg })
  }

  // Bind, then consume. If binding fails the token stays valid for a retry.
  const { error: bindErr } = await admin
    .from('clients')
    .update({ user_id: created.user.id, status: 'active' })
    .eq('id', invite.client_id)
  if (bindErr) {
    console.error('bind failed', bindErr)
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {})
    return send(res, 500, { error: 'We could not finish setting up — please try again' })
  }
  await admin.from('invite_tokens').update({ used_at: new Date().toISOString() }).eq('id', invite.id)

  return send(res, 200, { ok: true, email: invite.clients.email })
}
