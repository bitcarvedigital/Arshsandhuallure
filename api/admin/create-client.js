import { requireAdmin } from '../_lib/auth.js'
import { send, methodGuard, getBody } from '../_lib/http.js'
import { generateToken, hashToken } from '../_lib/tokens.js'
import { sendEmail } from '../_lib/email.js'
import { str, enumOrNull, SERVICES, isUuid } from '../_lib/validate.js'

function inviteUrl(rawToken) {
  const base = process.env.APP_BASE_URL || 'http://localhost:5173'
  return `${base}/join/${rawToken}`
}

async function mintInvite(admin, clientId) {
  // expire any live tokens, then issue a fresh one
  await admin
    .from('invite_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .is('used_at', null)
  const raw = generateToken()
  const { error } = await admin
    .from('invite_tokens')
    .insert({ client_id: clientId, token_hash: hashToken(raw) })
  if (error) throw error
  return inviteUrl(raw)
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return
  const { error: authErr, admin } = await requireAdmin(req)
  if (authErr) return send(res, 401, { error: authErr })

  const body = getBody(req)

  // Re-issue mode: fresh invite link for an existing client
  if (body.reissue) {
    if (!isUuid(body.clientId)) return send(res, 400, { error: 'Invalid client' })
    const { data: client } = await admin
      .from('clients')
      .select('id, email, full_name, user_id')
      .eq('id', body.clientId)
      .maybeSingle()
    if (!client) return send(res, 404, { error: 'Client not found' })
    if (client.user_id) return send(res, 200, { registered: true })
    const url = await mintInvite(admin, client.id)
    await sendEmail({
      to: client.email,
      subject: 'Your Arsh Sandhu Allure client portal',
      heading: `Welcome, ${(client.full_name || '').split(' ')[0]}`,
      bodyHtml:
        '<p>Here is your personal link to set up your client portal, where your agreement, forms, and wedding-day details all live in one place.</p><p>The link is valid for 7 days.</p>',
      ctaText: 'Set Up My Portal',
      ctaUrl: url,
    })
    return send(res, 200, { clientId: client.id, inviteUrl: url })
  }

  // Create mode
  const fullName = str(body.fullName, 200)
  const email = str(body.email, 320).toLowerCase()
  if (!fullName) return send(res, 400, { error: 'Client name is required' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: 'A valid email is required' })

  const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))
  const row = {
    full_name: fullName,
    email,
    phone: str(body.phone, 50),
    event_type: str(body.eventType, 100),
    event_date: body.eventDate || null,
    ready_time: body.readyTime || null,
    booked_time: body.bookedTime || null,
    getting_ready_address: str(body.address, 500),
    services: enumOrNull(body.services, SERVICES),
    party_size: num(body.partySize),
    amount_services: num(body.amountServices),
    amount_travel: num(body.amountTravel),
    amount_total: num(body.amountTotal),
    amount_retainer: num(body.amountRetainer),
    amount_balance: num(body.amountBalance),
  }

  const { data: client, error: insertErr } = await admin.from('clients').insert(row).select().single()
  if (insertErr) {
    const msg = /clients_email_lower_idx|duplicate/i.test(insertErr.message)
      ? 'A client with this email already exists'
      : 'Could not create the client'
    console.error('create client failed', insertErr)
    return send(res, 400, { error: msg })
  }

  const url = await mintInvite(admin, client.id)
  await sendEmail({
    to: client.email,
    subject: 'Your Arsh Sandhu Allure client portal',
    heading: `Welcome, ${fullName.split(' ')[0]}`,
    bodyHtml:
      '<p>We are so honoured to be part of your day. Your personal client portal is ready — your agreement, forms, and wedding-day details all live there.</p><p>The link below is valid for 7 days.</p>',
    ctaText: 'Set Up My Portal',
    ctaUrl: url,
  })

  return send(res, 200, { clientId: client.id, inviteUrl: url })
}
