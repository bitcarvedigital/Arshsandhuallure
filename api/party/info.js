import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { send, methodGuard, getBody, rateLimit } from '../_lib/http.js'
import { looksLikeToken } from '../_lib/tokens.js'
import { bookingServices, allowedServiceOptions } from '../../src/shared/booking/services.js'

// What a party member may pick, and which events she can say she's attending.
export async function partyContext(admin, clientId) {
  const [{ data: events }, { data: lines }] = await Promise.all([
    admin.from('events').select('id, name, event_type, event_date, sort_order').eq('client_id', clientId).order('event_date', { ascending: true, nullsFirst: false }),
    admin.from('event_line_items').select('kind, service, qty, for_bride').eq('client_id', clientId).eq('kind', 'service'),
  ])
  const booked = bookingServices(lines || [])
  return {
    events: (events || []).map((e) => ({ id: e.id, name: e.name || e.event_type, event_date: e.event_date })),
    allowed: allowedServiceOptions(booked),
  }
}

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
  const ctx = await partyContext(admin, t.client_id)
  return send(res, 200, {
    valid: true,
    brideFirstName: (t.clients.full_name || '').split(' ')[0],
    eventDate: t.clients.event_date,
    events: ctx.events,
    allowedServices: ctx.allowed,
  })
}
