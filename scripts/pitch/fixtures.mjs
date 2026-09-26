// Demo data for screenshotting the portal without a Supabase backend.
// Names are fictional; amounts are illustrative. Totals, the agreement
// snapshot, the invoice and the timelines are produced by the portal's own
// shared modules, so every number on screen is what the real app computes.

import { summarizeBooking, buildAgreementSnapshot, buildStatement, sortEvents } from '../../src/shared/booking/pricing.js'
import { bricksFromBooking, autoPlan } from '../../src/shared/booking/timeline.js'
import { newPayload } from '../../src/shared/booking/intake.js'
import { DEFAULT_PRICE_LIST } from '../../src/shared/booking/services.js'

export const ADMIN_USER = { id: '11111111-1111-4111-8111-111111111111', email: 'studio@bellerose.example' }
export const CLIENT_USER = { id: '22222222-2222-4222-8222-222222222222', email: 'priya.sharma@example.com' }

export const CLIENT_ID = 'c1c1c1c1-0000-4000-8000-000000000001'
const C2 = 'c1c1c1c1-0000-4000-8000-000000000002'
const C3 = 'c1c1c1c1-0000-4000-8000-000000000003'
const C4 = 'c1c1c1c1-0000-4000-8000-000000000004'
const C5 = 'c1c1c1c1-0000-4000-8000-000000000005'

export const E1 = 'e0e0e0e0-0000-4000-8000-000000000001' // Mehndi
export const E2 = 'e0e0e0e0-0000-4000-8000-000000000002' // Wedding
export const E3 = 'e0e0e0e0-0000-4000-8000-000000000003' // Reception

export const BRIDE_ID = 'aaaaaaaa-0000-4000-8000-000000000001'
const ANJALI = 'aaaaaaaa-0000-4000-8000-000000000002'
export const MEERA = 'aaaaaaaa-0000-4000-8000-000000000003'
const CHLOE = 'aaaaaaaa-0000-4000-8000-000000000004'
const NEHA = 'aaaaaaaa-0000-4000-8000-000000000005'
export const KIRAN = 'aaaaaaaa-0000-4000-8000-000000000006'
const RIYA = 'aaaaaaaa-0000-4000-8000-000000000007'
const SANA = 'aaaaaaaa-0000-4000-8000-000000000008'
const TARA = 'aaaaaaaa-0000-4000-8000-000000000009'

export const INTAKE_ID = 'bbbbbbbb-0000-4000-8000-000000000001'
export const AGREEMENT_ID = 'dddddddd-0000-4000-8000-000000000001'
export const INVOICE_ID = 'f1f1f1f1-0000-4000-8000-000000000001'
export const PARTY_TOKEN = 'wKQ2xp8uHbT7RzVn3YcMfLg9DsE4AoXj1NiUq6ZtBv0'

const iso = (d) => new Date(d).toISOString()
const T0 = '2026-08-02T14:00:00Z'

// ---------------------------------------------------------------- price list
const PRICES = {
  bridal_hm: 950, bridal_makeup: 350, bridal_hair: 450, party_hm: 220, party_makeup: 110, party_hair: 120,
  fg_makeup: 45, fg_hair: 45, draping: 40, early_start: 100, travel: 80, parking: null, toll: null, other_fee: null, discount: null,
}
export const PRICE_LIST = DEFAULT_PRICE_LIST.map((p) => ({ ...p, price: PRICES[p.code] ?? null }))

// ------------------------------------------------------------------- booking
const EVENTS = [
  {
    id: E1, name: 'Mehndi', event_type: 'Mehndi', event_date: '2026-11-12', start_time: '14:30:00', ready_time: '18:00:00',
    address: '42 Mayfield Rd, Brampton', party_size: 5, client_note: 'Please have a table near a window for natural light.',
  },
  {
    id: E2, name: 'Wedding', event_type: 'Wedding', event_date: '2026-11-14', start_time: '06:30:00', ready_time: '11:30:00',
    address: 'Fairmont Royal York, 100 Front St W, Toronto', party_size: 7, client_note: '',
  },
  {
    id: E3, name: 'Reception', event_type: 'Reception', event_date: '2026-11-15', start_time: '14:00:00', ready_time: '17:00:00',
    address: 'Fairmont Royal York, 100 Front St W, Toronto', party_size: 3, client_note: '',
  },
].map((e, i) => ({ ...e, client_id: CLIENT_ID, sort_order: i, created_at: iso(T0), updated_at: iso('2026-09-10T14:00:00Z') }))

let lineSeq = 0
const line = (event_id, code, qty, extra = {}) => {
  const p = PRICE_LIST.find((x) => x.code === code) || {}
  lineSeq += 1
  return {
    id: `11ee11ee-0000-4000-8000-${String(lineSeq).padStart(12, '0')}`,
    event_id, client_id: CLIENT_ID, kind: p.kind || 'fee', code, label: p.label || code, qty,
    unit_price: p.price ?? 0, service: p.kind === 'service' ? p.service : null, for_bride: !!p.for_bride,
    minutes: p.minutes ?? null, sort_order: lineSeq, created_at: iso(T0), updated_at: iso(T0), ...extra,
  }
}
const LINES = [
  line(E1, 'bridal_makeup', 1), line(E1, 'party_makeup', 4), line(E1, 'travel', 1, { unit_price: 60 }),
  line(E2, 'bridal_hm', 1), line(E2, 'party_hm', 3), line(E2, 'party_hair', 1), line(E2, 'party_makeup', 2),
  line(E2, 'early_start', 1), line(E2, 'travel', 1),
  line(E3, 'bridal_hm', 1, { unit_price: 650, label: 'Bridal Hair & Makeup (second look)' }), line(E3, 'party_makeup', 2),
  line(E3, 'travel', 1), line(E3, 'discount', 1, { unit_price: 100, label: 'Multi-event discount' }),
]

const MEMBER_BASE = {
  client_id: CLIENT_ID, foundation_brand: '', foundation_shade: '', allergies: '', skin_concerns: '', likes: '', dislikes: '',
  skin_type: null, hair_length: null, hair_texture: null, photos: {}, autofill: {}, event_ids: [],
  created_at: iso('2026-08-08T14:00:00Z'), updated_at: iso('2026-09-21T13:05:00Z'),
}
const photo = (id, slot, n) => Array.from({ length: n }, (_, i) => ({ kind: 'upload', path: `${CLIENT_ID}/members/${id}/${slot}/${i + 1}.jpg` }))

function members() {
  return [
    {
      ...MEMBER_BASE, id: BRIDE_ID, is_bride: true, name: 'Priya Sharma', relation: 'bride', services: 'both',
      skin_type: 'combination', hair_length: 'long', hair_texture: 'wavy',
      likes: 'Dewy, luminous skin. Soft rose tones, a defined but natural brow, and a romantic low bun with face-framing pieces.',
      dislikes: 'Heavy contour, very dark liner, anything that photographs cakey.',
      foundation_brand: 'NARS', foundation_shade: 'Barcelona', allergies: 'Latex (lash glue) — please use a latex-free adhesive.',
      skin_concerns: 'Slight dryness around the nose in winter.',
      photos: { selfie: photo(BRIDE_ID, 'selfie', 1), makeup_inspo: [...photo(BRIDE_ID, 'makeup_inspo', 2), { kind: 'link', url: 'https://pinterest.com/pin/soft-glam-bridal' }], hair_inspo: photo(BRIDE_ID, 'hair_inspo', 2), additional: [] },
      autofill: { services: 'new' }, source: 'admin', status: 'pending', submitted_at: iso('2026-09-21T13:05:00Z'),
    },
    { ...MEMBER_BASE, id: ANJALI, is_bride: false, name: 'Anjali Sharma', relation: 'Maid of honour', services: 'both', skin_type: 'oily', hair_length: 'medium', hair_texture: 'straight', likes: 'Matte skin, winged liner, sleek half-up style.', photos: { selfie: photo(ANJALI, 'selfie', 1) }, event_ids: [E1, E2, E3], source: 'party_link', status: 'approved', submitted_at: iso('2026-09-12T13:05:00Z') },
    { ...MEMBER_BASE, id: MEERA, is_bride: false, name: 'Meera Sharma', relation: 'Mother of the bride', services: 'makeup', skin_type: 'dry', likes: 'Elegant and natural.', allergies: 'Sensitive to fragrance.', event_ids: [E1, E2], source: 'party_link', status: 'pending', submitted_at: iso('2026-09-22T09:40:00Z') },
    { ...MEMBER_BASE, id: CHLOE, is_bride: false, name: 'Chloe Bennett', relation: 'Bridesmaid', services: 'both', event_ids: [E2], source: 'bride', status: 'draft', submitted_at: null },
    { ...MEMBER_BASE, id: NEHA, is_bride: false, name: 'Neha Verma', relation: 'Bridesmaid', services: 'both', skin_type: 'normal', hair_length: 'long', hair_texture: 'curly', event_ids: [E2], source: 'party_link', status: 'approved', submitted_at: iso('2026-09-14T10:00:00Z') },
    { ...MEMBER_BASE, id: KIRAN, is_bride: false, name: 'Kiran Gill', relation: 'Aunt', services: 'hair', hair_length: 'medium', hair_texture: 'wavy', likes: 'A classic low bun.', photos: { selfie: photo(KIRAN, 'selfie', 1), hair_inspo: photo(KIRAN, 'hair_inspo', 1) }, event_ids: [E2], source: 'party_link', status: 'approved', submitted_at: iso('2026-09-15T10:00:00Z') },
    { ...MEMBER_BASE, id: RIYA, is_bride: false, name: 'Riya Kapoor', relation: 'Friend', services: 'makeup', skin_type: 'normal', event_ids: [E2], source: 'party_link', status: 'approved', submitted_at: iso('2026-09-16T10:00:00Z') },
    { ...MEMBER_BASE, id: SANA, is_bride: false, name: 'Sana Malik', relation: 'Cousin', services: 'makeup', skin_type: 'sensitive', event_ids: [E1, E3], source: 'party_link', status: 'approved', submitted_at: iso('2026-09-16T12:00:00Z') },
    { ...MEMBER_BASE, id: TARA, is_bride: false, name: 'Tara Singh', relation: 'Friend', services: 'makeup', skin_type: 'combination', event_ids: [E1], source: 'party_link', status: 'approved', submitted_at: iso('2026-09-17T12:00:00Z') },
  ]
}

// Timelines, built by the portal's own auto-planner.
function plan(event, lines, mems, columns, extra = {}) {
  const content = {
    version: 1, mode: 'ready_by', anchor: event.ready_time.slice(0, 5), buffer: 30, brideEarly: 90,
    columns, bricks: bricksFromBooking(event, lines, mems), notes: [], ...extra,
  }
  return autoPlan(content)
}

function flatten(client, events, lines, payments) {
  const s = summarizeBooking(events, lines, payments)
  const first = sortEvents(events)[0]
  return {
    ...client,
    event_type: sortEvents(events).map((e) => e.name).join(' · '),
    event_date: first.event_date, ready_time: first.ready_time, booked_time: first.start_time,
    getting_ready_address: first.address, party_size: Math.max(...events.map((e) => e.party_size || 0)),
    services: 'both',
    amount_services: Math.round((s.services - s.discounts) * 100) / 100,
    amount_travel: s.fees || null, amount_total: s.total, amount_retainer: s.retainer, amount_balance: s.balance,
  }
}

// state: 'mid' (default) — signed, retainer + a part payment in, intake submitted
//        'fresh'         — invited today, nothing done yet
export function makeDb(state = 'mid') {
  const db = {}
  const mems = members()
  const fresh = state === 'fresh'

  db.payments = fresh
    ? [
        { id: 'ffffffff-0000-4000-8000-000000000001', client_id: CLIENT_ID, kind: 'retainer', amount: null, status: 'due', method: 'etransfer', received_at: null, label: null, note: null, event_id: null, created_at: iso(T0) },
        { id: 'ffffffff-0000-4000-8000-000000000002', client_id: CLIENT_ID, kind: 'final', amount: null, status: 'due', method: 'etransfer', received_at: null, label: null, note: null, event_id: null, created_at: iso(T0) },
      ]
    : [
        { id: 'ffffffff-0000-4000-8000-000000000001', client_id: CLIENT_ID, kind: 'retainer', amount: null, status: 'received', method: 'etransfer', received_at: iso('2026-08-06T16:00:00Z'), label: null, note: null, event_id: null, created_at: iso(T0) },
        { id: 'ffffffff-0000-4000-8000-000000000002', client_id: CLIENT_ID, kind: 'final', amount: null, status: 'due', method: 'etransfer', received_at: null, label: null, note: null, event_id: null, created_at: iso(T0) },
        { id: 'ffffffff-0000-4000-8000-000000000003', client_id: CLIENT_ID, kind: 'installment', amount: 500, status: 'received', method: 'etransfer', received_at: iso('2026-09-20T16:00:00Z'), label: 'Part payment towards the wedding', note: null, event_id: E2, created_at: iso('2026-09-20T16:00:00Z') },
      ]
  // retainer = 30% of the total (or what arrived); final = what's left
  const pre = summarizeBooking(EVENTS, LINES, [])
  const retainer = db.payments.find((p) => p.kind === 'retainer')
  retainer.amount = pre.retainer
  const after = summarizeBooking(EVENTS, LINES, db.payments)
  db.payments.find((p) => p.kind === 'final').amount = after.balance

  const baseClient = {
    id: CLIENT_ID, user_id: CLIENT_USER.id, full_name: 'Priya Sharma', email: CLIENT_USER.email, phone: '+1 (416) 555-0142',
    referral_source: 'Instagram', status: 'active', archived_at: null, created_at: iso(T0), updated_at: iso('2026-09-10T14:00:00Z'),
  }
  const priya = flatten(baseClient, EVENTS, LINES, db.payments)

  db.events = EVENTS.map((e) => ({ ...e }))
  db.event_line_items = LINES.map((l) => ({ ...l }))

  db.clients = [
    { ...priya, admin_notes: [{ difficulty: 'easy' }], events: EVENTS.map(({ name, event_type, event_date }) => ({ name, event_type, event_date })) },
    { id: C2, user_id: null, full_name: 'Simran Gill', email: 'simran.gill@example.com', phone: '+1 (905) 555-0187', event_type: 'Engagement', event_date: '2026-10-03', status: 'invited', archived_at: null, created_at: iso('2026-09-20T14:00:00Z'), updated_at: iso('2026-09-20T14:00:00Z'), admin_notes: [{ difficulty: null }], events: [{ name: 'Engagement', event_type: 'Engagement', event_date: '2026-10-03' }] },
    { id: C3, user_id: 'x', full_name: 'Aaliyah Khan', email: 'aaliyah.k@example.com', event_type: 'Nikkah · Walima', event_date: '2026-10-24', status: 'active', archived_at: null, created_at: iso('2026-08-15T14:00:00Z'), updated_at: iso('2026-09-01T14:00:00Z'), admin_notes: [{ difficulty: 'medium' }], events: [{ name: 'Nikkah', event_type: 'Other', event_date: '2026-10-24' }, { name: 'Walima', event_type: 'Reception', event_date: '2026-10-25' }] },
    { id: C4, user_id: 'y', full_name: 'Emily Tran', email: 'emily.tran@example.com', event_type: 'Trial · Wedding', event_date: '2027-03-06', status: 'active', archived_at: null, created_at: iso('2026-09-01T14:00:00Z'), updated_at: iso('2026-09-01T14:00:00Z'), admin_notes: [{ difficulty: 'hard' }], events: [{ name: 'Trial', event_type: 'Trial', event_date: '2027-03-06' }, { name: 'Wedding', event_type: 'Wedding', event_date: '2027-05-22' }] },
    { id: C5, user_id: 'z', full_name: 'Jasleen Dhillon', email: 'jasleen.d@example.com', event_type: 'Wedding', event_date: '2026-07-18', status: 'archived', archived_at: iso('2026-08-01T14:00:00Z'), created_at: iso('2026-03-01T14:00:00Z'), updated_at: iso('2026-08-01T14:00:00Z'), admin_notes: [{ difficulty: 'easy' }], events: [{ name: 'Wedding', event_type: 'Wedding', event_date: '2026-07-18' }] },
  ]

  db.admin_notes = [
    { client_id: CLIENT_ID, difficulty: 'easy', updated_at: iso('2026-09-10T14:00:00Z'),
      notes: 'Loved the dewy finish from her trial — same base for the wedding. Mom is sensitive to fragrance; bring the unscented setting spray. Hotel elevator is slow, allow 10 extra minutes with the kit.' },
  ]

  db.agreement_terms = [{ id: 'eeeeeeee-0000-4000-8000-000000000001', version: 1, created_at: iso('2026-08-01T00:00:00Z'), body: TERMS }]
  db.agreements = fresh
    ? []
    : [{
        id: AGREEMENT_ID, client_id: CLIENT_ID, version: 1, snapshot: buildAgreementSnapshot(priya, EVENTS, LINES), terms_version: 1,
        photo_consent: 'agrees', signed_name: 'Priya Sharma', agreed: true, signed_at: iso('2026-08-04T19:42:00Z'),
        ip_address: '142.112.88.14', user_agent: 'Safari iOS', status: 'approved', created_at: iso('2026-08-04T19:42:00Z'),
      }]

  // intake: pre-filled from the booking; she checked most of it, changed one address
  const booking = sortEvents(EVENTS)
  const payload = newPayload(priya, booking)
  payload.profile.referral_source = 'Instagram'
  const af = {}
  af[`events.${E3}.party_size`] = 'saved'
  payload._autofill = af
  payload.events = payload.events.map((e) => (e.event_id === E2 ? { ...e, address: 'Fairmont Royal York — Suite 1204, 100 Front St W, Toronto' } : e))
  db.intakes = fresh
    ? []
    : [{ id: INTAKE_ID, client_id: CLIENT_ID, version: 1, payload, status: 'pending', review_message: null, submitted_at: iso('2026-09-21T13:05:00Z'), reviewed_at: null, reviewed_by: null, created_at: iso('2026-08-08T14:00:00Z'), updated_at: iso('2026-09-21T13:05:00Z') }]

  db.party_members = fresh ? mems.filter((m) => m.is_bride).map((m) => ({ ...m, ...EMPTY_PROFILE, status: 'draft', autofill: { name: 'new', services: 'new' } })) : mems

  const wedding = plan(EVENTS[1], LINES, mems, [
    { id: 'col-rose', name: 'Rose', bestAt: 'hair' },
    { id: 'col-maya', name: 'Maya', bestAt: 'makeup' },
    { id: 'col-aisha', name: 'Aisha', bestAt: 'both' },
  ], { notes: [
    'Everyone arrives with clean, dry, product-free hair and a bare, moisturised face.',
    'Please have breakfast and water on hand for the whole party.',
    'Button-up tops only — nothing goes over finished hair.',
  ] })
  const mehndi = plan(EVENTS[0], LINES, mems, [
    { id: 'col-rose', name: 'Rose', bestAt: 'makeup' },
    { id: 'col-maya', name: 'Maya', bestAt: 'makeup' },
  ], { buffer: 15, brideEarly: 0, notes: ['Good natural light near a window makes all the difference.'] })
  db.event_timelines = fresh
    ? []
    : [
        { event_id: E1, client_id: CLIENT_ID, content: mehndi, visible: true, published_at: iso('2026-09-18T15:00:00Z'), updated_at: iso('2026-09-18T15:00:00Z') },
        { event_id: E2, client_id: CLIENT_ID, content: wedding, visible: true, published_at: iso('2026-09-18T15:00:00Z'), updated_at: iso('2026-09-18T15:00:00Z') },
      ]

  const doc = (n, type, visible) => ({ id: `cdcdcdcd-0000-4000-8000-00000000000${n}`, client_id: CLIENT_ID, doc_type: type, visible, content: null, file_path: null, updated_at: iso('2026-09-18T15:00:00Z') })
  db.client_documents = [doc(1, 'agreement', !fresh), doc(2, 'timeline', !fresh), doc(3, 'hair_guide', !fresh), doc(4, 'skin_guide', !fresh)]

  db.invoices = fresh
    ? []
    : [{
        id: INVOICE_ID, client_id: CLIENT_ID, seq: 12, number: 'BRA-2026-0012', issued_on: '2026-09-21', due_on: '2026-11-12',
        note: 'Thank you! Your retainer secures all three dates.',
        snapshot: buildStatement({ client: priya, events: EVENTS, lines: LINES, payments: db.payments, amountDue: null, dueOn: '2026-11-12', note: 'Thank you! Your retainer secures all three dates.', etransferEmail: 'pay@bellerose.example' }),
        status: 'issued', sent_to: CLIENT_USER.email, sent_at: iso('2026-09-21T15:02:00Z'), created_by: ADMIN_USER.id, created_at: iso('2026-09-21T15:02:00Z'),
      }]

  const who = { clients: { id: CLIENT_ID, full_name: 'Priya Sharma', event_date: priya.event_date } }
  db.submissions = [
    { id: 'abababab-0000-4000-8000-000000000001', client_id: CLIENT_ID, kind: 'intake', ref_id: INTAKE_ID, status: 'pending', message: null, created_at: iso('2026-09-21T13:05:00Z'), ...who },
    { id: 'abababab-0000-4000-8000-000000000002', client_id: CLIENT_ID, kind: 'party_member', ref_id: BRIDE_ID, status: 'pending', message: null, created_at: iso('2026-09-21T13:05:00Z'), ...who },
    { id: 'abababab-0000-4000-8000-000000000003', client_id: CLIENT_ID, kind: 'party_member', ref_id: MEERA, status: 'pending', message: null, created_at: iso('2026-09-22T09:40:00Z'), ...who },
    { id: 'abababab-0000-4000-8000-000000000004', client_id: C3, kind: 'agreement', ref_id: 'dddddddd-0000-4000-8000-000000000003', status: 'pending', message: null, created_at: iso('2026-09-22T21:12:00Z'), clients: { id: C3, full_name: 'Aaliyah Khan', event_date: '2026-10-24' } },
  ]

  db.party_share_tokens = [{ id: 'abcdabcd-0000-4000-8000-000000000001', client_id: CLIENT_ID, token: PARTY_TOKEN, expires_at: iso('2026-12-15T05:00:00Z'), revoked_at: null, created_at: iso('2026-08-09T14:00:00Z') }]

  db.app_settings = [
    { key: 'etransfer_email', value: 'pay@bellerose.example' },
    { key: 'notification_email', value: 'hello@bellerose.example' },
    { key: 'current_terms_version', value: '1' },
    { key: 'price_list', value: JSON.stringify(PRICE_LIST) },
  ]
  return db
}

const EMPTY_PROFILE = {
  skin_type: null, hair_length: null, hair_texture: null, likes: '', dislikes: '', foundation_brand: '', foundation_shade: '',
  allergies: '', skin_concerns: '', photos: {},
}

export const PARTY_INFO = {
  valid: true, brideFirstName: 'Priya', eventDate: '2026-11-12',
  events: EVENTS.map((e) => ({ id: e.id, name: e.name, event_date: e.event_date })),
  allowedServices: ['hair', 'makeup', 'both'],
}

const TERMS = {
  intro: 'This Service Agreement ("Agreement") is entered into between the Artist and the undersigned client ("Client") for the provision of professional hair and/or makeup services on the date(s) indicated below.',
  sections: [
    { n: 1, title: 'Booking & Retainer Fee', body: 'A non-refundable retainer fee of 30% of the total service fee is required to confirm your booking. Your dates will not be secured until the retainer has been received. The retainer is applied toward the final balance of your service.' },
    { n: 2, title: 'Travel & Accommodation', body: "A travel fee, based on the distance from the Artist's location to the service location, is added to the final invoice. For events outside the Artist's service area, travel and accommodation costs are the responsibility of the Client." },
    { n: 3, title: 'Face & Hair Preparation', body: 'Clients must ensure their face and/or hair is clean, product-free, dry, and blow-dried prior to the service, unless a blow-dry has been explicitly booked.' },
    { n: 4, title: 'Final Payment', body: 'The remaining balance must be paid in full on or before the day of the scheduled service, prior to the commencement of services.' },
    { n: 5, title: 'Rescheduling & Cancellations', body: 'Date or ready-time changes are free with at least four (4) weeks’ notice, subject to availability. Cancellation within seven (7) days of the event requires full payment.' },
    { n: 6, title: 'Client Responsibility & Timeliness', body: 'The Client is responsible for ensuring that everyone receiving services is ready and present at the agreed time.' },
    { n: 7, title: 'Photography & Promotion Consent', body: "The Client agrees or does not agree (as selected below) to allow photographs of the final look to be used in the Artist's portfolio, website, and social media." },
    { n: 8, title: 'Allergies & Liability Release', body: 'The Client must inform the Artist in advance of any allergies or sensitivities.' },
  ],
  closing: 'By signing below, the Client confirms that they have read, understood, and agreed to the terms and conditions outlined in this Agreement, and acknowledges that it is binding upon signature.',
}
