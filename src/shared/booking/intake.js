// Intake payload helpers — pure module (no JSX).
//
// payload (schema 2) = {
//   schema: 2,
//   profile: { phone, referral_source },
//   events: [{ event_id, name, event_date, ready_time, address, party_size }],
//   _autofill: { 'profile.phone': 'new' | 'saved', 'events.<id>.<field>': … },
// }
// Autofill markers exist only for fields pre-filled from Arsh's booking; the
// key is removed the moment the bride clicks into that field.

export const EVENT_FIELDS = ['event_date', 'ready_time', 'address', 'party_size']
export const EVENT_FIELD_LABELS = {
  event_date: 'Event date',
  ready_time: 'Ready-by time',
  address: 'Getting-ready address',
  party_size: 'People being styled',
}

export const eventKey = (eventId, field) => `events.${eventId}.${field}`

const norm = (field, v) => {
  if (v == null) return ''
  if (field === 'ready_time') return String(v).slice(0, 5)
  if (field === 'party_size') return v === '' ? '' : String(Number(v))
  return String(v).trim()
}

function fromBooking(e) {
  return {
    event_id: e.id,
    name: e.name || e.event_type || 'Event',
    event_date: e.event_date || '',
    ready_time: (e.ready_time || '').slice(0, 5),
    address: e.address || '',
    party_size: e.party_size ?? '',
  }
}

function markersFor(ev) {
  const out = {}
  for (const f of EVENT_FIELDS) if (norm(f, ev[f]) !== '') out[eventKey(ev.event_id, f)] = 'new'
  return out
}

// First visit: everything Arsh already entered, flagged for checking.
export function newPayload(client, bookingEvents) {
  const events = bookingEvents.map(fromBooking)
  const _autofill = {}
  if (client.phone) _autofill['profile.phone'] = 'new'
  for (const ev of events) Object.assign(_autofill, markersFor(ev))
  return {
    schema: 2,
    profile: { phone: client.phone || '', referral_source: '' },
    events,
    _autofill,
  }
}

// Old single-event payloads → schema 2 (values kept, nothing flagged: she
// already saw and saved them).
export function upgradePayload(payload = {}, bookingEvents = []) {
  if (payload.schema === 2) return payload
  const events = bookingEvents.map(fromBooking)
  // the old answers belong to the event they were about: match on the date she
  // gave, else the event that existed before multi-event booking (oldest row)
  const byDate = events.findIndex((e) => payload.event_date && e.event_date === payload.event_date)
  const oldest = bookingEvents.reduce(
    (best, e, i) => (best < 0 || String(e.created_at || '') < String(bookingEvents[best].created_at || '') ? i : best),
    -1,
  )
  const target = events[byDate >= 0 ? byDate : oldest]
  if (target) {
    if (payload.event_date) target.event_date = payload.event_date
    if (payload.getting_ready_address) target.address = payload.getting_ready_address
  }
  return {
    schema: 2,
    profile: { phone: payload.phone || '', referral_source: payload.referral_source || '' },
    events,
    _autofill: {},
  }
}

// While a draft is open, keep its events in step with the booking: new events
// arrive pre-filled + flagged, removed events disappear, answers are kept.
export function mergeBookingEvents(payload, bookingEvents = []) {
  const byId = Object.fromEntries((payload.events || []).map((e) => [e.event_id, e]))
  const _autofill = { ...(payload._autofill || {}) }
  const events = bookingEvents.map((b) => {
    const mine = byId[b.id]
    if (mine) return { ...mine, name: b.name || b.event_type || mine.name }
    const fresh = fromBooking(b)
    Object.assign(_autofill, markersFor(fresh))
    return fresh
  })
  const live = new Set(bookingEvents.map((b) => b.id))
  for (const k of Object.keys(_autofill)) {
    const m = k.match(/^events\.([^.]+)\./)
    if (m && !live.has(m[1])) delete _autofill[k]
  }
  return { ...payload, events, _autofill }
}

// Explicit Save / Submit: anything still unchecked becomes "please double-check".
export function markSaved(autofill = {}) {
  return Object.fromEntries(Object.entries(autofill).map(([k, v]) => [k, v === 'new' ? 'saved' : v]))
}

export const pendingChecks = (autofill = {}) => Object.keys(autofill).length

// Where the bride's answers differ from Arsh's booking.
export function eventDiffs(payloadEvent, bookingEvent) {
  if (!payloadEvent || !bookingEvent) return []
  return EVENT_FIELDS.filter((f) => norm(f, payloadEvent[f]) !== norm(f, bookingEvent[f])).map((f) => ({
    field: f,
    client: payloadEvent[f],
    booking: bookingEvent[f],
  }))
}
