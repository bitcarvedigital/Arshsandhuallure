import { requireClient } from './_lib/auth.js'
import { send, methodGuard, getBody, getIp } from './_lib/http.js'
import { str } from './_lib/validate.js'

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return
  const { error: authErr, admin, client } = await requireClient(req)
  if (authErr) return send(res, 401, { error: authErr })

  const body = getBody(req)
  const signedName = str(body.signedName, 200)
  const photoConsent = body.photoConsent === 'agrees' ? 'agrees' : body.photoConsent === 'does_not_agree' ? 'does_not_agree' : null
  if (body.agreed !== true) return send(res, 400, { error: 'You must agree to the terms to sign' })
  if (!signedName) return send(res, 400, { error: 'Please type your full name as your signature' })
  if (!photoConsent) return send(res, 400, { error: 'Please choose a photography consent option' })

  const { data: existing } = await admin
    .from('agreements')
    .select('id, status')
    .eq('client_id', client.id)
    .in('status', ['signed', 'approved'])
    .maybeSingle()
  if (existing) return send(res, 400, { error: 'Your agreement is already signed' })

  // latest terms — same row the portal renders, so what she read is what binds
  const { data: latestTerms } = await admin
    .from('agreement_terms')
    .select('version')
    .order('version', { ascending: false })
    .limit(1)
    .single()
  const termsVersion = latestTerms?.version || 1

  // freeze what she is agreeing to, from the source of truth (clients row)
  const snapshot = {
    full_name: client.full_name,
    email: client.email,
    phone: client.phone,
    event_type: client.event_type,
    event_date: client.event_date,
    ready_time: client.ready_time,
    getting_ready_address: client.getting_ready_address,
    services: client.services,
    party_size: client.party_size,
    amount_services: client.amount_services,
    amount_travel: client.amount_travel,
    amount_total: client.amount_total,
    amount_retainer: client.amount_retainer,
    amount_balance: client.amount_balance,
  }

  const { count } = await admin
    .from('agreements')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', client.id)

  const { data: agreement, error: insertErr } = await admin
    .from('agreements')
    .insert({
      client_id: client.id,
      version: (count || 0) + 1,
      snapshot,
      terms_version: termsVersion,
      photo_consent: photoConsent,
      signed_name: signedName,
      agreed: true,
      signed_at: new Date().toISOString(),
      ip_address: getIp(req),
      user_agent: str(req.headers['user-agent'] || '', 400),
      status: 'signed',
    })
    .select()
    .single()

  if (insertErr) {
    console.error('sign failed', insertErr)
    return send(res, 500, { error: 'We could not record your signature — please try again' })
  }

  return send(res, 200, { ok: true, agreement })
}
