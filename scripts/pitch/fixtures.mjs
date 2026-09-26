// Demo data for screenshotting the portal without a Supabase backend.
// Names are fictional; amounts are illustrative only.

export const ADMIN_USER = { id: '11111111-1111-4111-8111-111111111111', email: 'arsh@studio.test' }
export const CLIENT_USER = { id: '22222222-2222-4222-8222-222222222222', email: 'priya.sharma@example.com' }

export const CLIENT_ID = 'c1c1c1c1-0000-4000-8000-000000000001'
const C2 = 'c1c1c1c1-0000-4000-8000-000000000002'
const C3 = 'c1c1c1c1-0000-4000-8000-000000000003'
const C4 = 'c1c1c1c1-0000-4000-8000-000000000004'
const C5 = 'c1c1c1c1-0000-4000-8000-000000000005'

const BRIDE_ID = 'aaaaaaaa-0000-4000-8000-000000000001'
const M2 = 'aaaaaaaa-0000-4000-8000-000000000002'
const M3 = 'aaaaaaaa-0000-4000-8000-000000000003'
const M4 = 'aaaaaaaa-0000-4000-8000-000000000004'

export const INTAKE_ID = 'bbbbbbbb-0000-4000-8000-000000000001'
export const AGREEMENT_ID = 'dddddddd-0000-4000-8000-000000000001'
export const PARTY_TOKEN = 'wKQ2xp8uHbT7RzVn3YcMfLg9DsE4AoXj1NiUq6ZtBv0'

const NOW = new Date('2026-09-23T10:15:00-04:00')
const iso = (d) => new Date(d).toISOString()

export function makeDb() {
  const db = {}

  db.clients = [
    {
      id: CLIENT_ID,
      user_id: CLIENT_USER.id,
      full_name: 'Priya Sharma',
      email: CLIENT_USER.email,
      phone: '+1 (416) 555-0142',
      event_type: 'Wedding',
      event_date: '2026-11-14',
      ready_time: '11:30',
      booked_time: '06:30',
      getting_ready_address: '88 Harbour St, Toronto',
      services: 'both',
      party_size: 6,
      amount_services: 2450,
      amount_travel: 120,
      amount_total: 2570,
      amount_retainer: 771,
      amount_balance: 1799,
      referral_source: 'Instagram',
      status: 'active',
      archived_at: null,
      created_at: iso('2026-08-02T14:00:00Z'),
      updated_at: iso('2026-09-10T14:00:00Z'),
      admin_notes: [{ difficulty: 'easy' }],
    },
    {
      id: C2,
      user_id: null,
      full_name: 'Simran Gill',
      email: 'simran.gill@example.com',
      phone: '+1 (905) 555-0187',
      event_type: 'Engagement',
      event_date: '2026-10-03',
      ready_time: '15:00',
      booked_time: '11:00',
      getting_ready_address: 'Brampton, ON',
      services: 'makeup',
      party_size: 2,
      amount_services: 650,
      amount_travel: 60,
      amount_total: 710,
      amount_retainer: 213,
      amount_balance: 497,
      status: 'invited',
      archived_at: null,
      created_at: iso('2026-09-20T14:00:00Z'),
      updated_at: iso('2026-09-20T14:00:00Z'),
      admin_notes: [{ difficulty: null }],
    },
    {
      id: C3,
      user_id: 'x',
      full_name: 'Aaliyah Khan',
      email: 'aaliyah.k@example.com',
      phone: null,
      event_type: 'Reception',
      event_date: '2026-10-24',
      ready_time: '16:00',
      booked_time: '12:00',
      getting_ready_address: 'Vaughan, ON',
      services: 'both',
      party_size: 4,
      amount_services: 1800,
      amount_travel: 90,
      amount_total: 1890,
      amount_retainer: 567,
      amount_balance: 1323,
      status: 'active',
      archived_at: null,
      created_at: iso('2026-08-15T14:00:00Z'),
      updated_at: iso('2026-09-01T14:00:00Z'),
      admin_notes: [{ difficulty: 'medium' }],
    },
    {
      id: C4,
      user_id: 'y',
      full_name: 'Emily Tran',
      email: 'emily.tran@example.com',
      phone: null,
      event_type: 'Wedding',
      event_date: '2027-05-22',
      ready_time: '13:00',
      booked_time: '08:00',
      getting_ready_address: 'Oakville, ON',
      services: 'hair',
      party_size: 8,
      amount_services: 2100,
      amount_travel: 100,
      amount_total: 2200,
      amount_retainer: 660,
      amount_balance: 1540,
      status: 'active',
      archived_at: null,
      created_at: iso('2026-09-01T14:00:00Z'),
      updated_at: iso('2026-09-01T14:00:00Z'),
      admin_notes: [{ difficulty: 'hard' }],
    },
    {
      id: C5,
      user_id: 'z',
      full_name: 'Jasleen Dhillon',
      email: 'jasleen.d@example.com',
      phone: null,
      event_type: 'Wedding',
      event_date: '2026-07-18',
      ready_time: '10:00',
      booked_time: '05:30',
      getting_ready_address: 'Mississauga, ON',
      services: 'both',
      party_size: 7,
      amount_services: 2900,
      amount_travel: 80,
      amount_total: 2980,
      amount_retainer: 894,
      amount_balance: 2086,
      status: 'archived',
      archived_at: iso('2026-08-01T14:00:00Z'),
      created_at: iso('2026-03-01T14:00:00Z'),
      updated_at: iso('2026-08-01T14:00:00Z'),
      admin_notes: [{ difficulty: 'easy' }],
    },
  ]

  db.admin_notes = [
    {
      client_id: CLIENT_ID,
      notes: 'Prefers a soft-glam look — loved the dewy finish from her trial. Mom is sensitive to fragrance; bring the unscented setting spray. Venue elevator is slow, allow 10 extra minutes.',
      difficulty: 'easy',
      updated_at: iso('2026-09-10T14:00:00Z'),
    },
  ]

  db.agreement_terms = [
    {
      id: 'eeeeeeee-0000-4000-8000-000000000001',
      version: 1,
      created_at: iso('2026-08-01T00:00:00Z'),
      body: {
        intro:
          'This Service Agreement ("Agreement") is entered into between Belle Rose Artistry ("Artist") and the undersigned client ("Client") for the provision of professional hair and/or makeup services on the date(s) indicated below.',
        sections: [
          { n: 1, title: 'Booking & Retainer Fee', body: 'A non-refundable retainer fee of 30% of the total service fee is required to confirm your booking. Your date will not be secured until the retainer has been received. The retainer is applied toward the final balance of your service.' },
          { n: 2, title: 'Travel & Accommodation', body: "A travel fee, based on the distance from the Artist's location to the service location, is added to the final invoice. For events that require the Artist to travel beyond the Greater Toronto Area, all travel and accommodation arrangements and costs are the responsibility of the Client." },
          { n: 3, title: 'Face & Hair Preparation', body: 'Clients must ensure their face and/or hair is clean, product-free, dry, and blow-dried prior to the service, unless a blow-dry has been explicitly booked. Failure to do so may result in an additional charge based on the time and effort required on the day of the event.' },
          { n: 4, title: 'Final Payment', body: 'The remaining balance must be paid in full on or before the day of the scheduled service, prior to the commencement of services. Accepted payment methods are cash or e-transfer (details provided upon request).' },
          { n: 5, title: 'Rescheduling, Ready-Time Changes & Cancellations', body: "The Client may change the event date or ready time at no cost, provided the request is made at least four (4) weeks before the booked service date and is subject to the Artist's availability. A request made within four (4) weeks of the event may incur a rescheduling fee of $100 CAD. Cancellation within seven (7) days of the event requires full payment." },
          { n: 6, title: 'Client Responsibility & Timeliness', body: 'The Client is responsible for ensuring that all individuals receiving services are ready and present at the agreed time. Any delays caused by the Client may result in reduced service time or additional charges.' },
          { n: 7, title: 'Photography & Promotion Consent', body: "The Client agrees or does not agree (as selected below) to allow photographs of the final hair and/or makeup look to be used for the Artist's professional portfolio, website, and social media." },
          { n: 8, title: 'Allergies & Liability Release', body: 'The Client must inform the Artist in advance of any allergies or sensitivities. If the Artist is not informed, the Artist holds no liability for any resulting reaction. The Artist is not liable for circumstances beyond their reasonable control.' },
        ],
        closing: 'By signing below, the Client confirms that they have read, understood, and agreed to the terms and conditions outlined in this Agreement, and acknowledges that it is binding upon signature.',
      },
    },
  ]

  const snapshot = { ...db.clients[0] }
  delete snapshot.admin_notes
  db.agreements = [
    {
      id: AGREEMENT_ID,
      client_id: CLIENT_ID,
      version: 1,
      snapshot,
      terms_version: 1,
      photo_consent: 'agrees',
      signed_name: 'Priya Sharma',
      agreed: true,
      signed_at: iso('2026-08-04T19:42:00Z'),
      ip_address: '142.112.88.14',
      user_agent: 'Safari iOS',
      status: 'approved',
      created_at: iso('2026-08-04T19:42:00Z'),
    },
  ]

  db.payments = [
    { id: 'ffffffff-0000-4000-8000-000000000001', client_id: CLIENT_ID, kind: 'retainer', amount: 771, status: 'received', method: 'etransfer', received_at: iso('2026-08-06T15:10:00Z'), marked_by: ADMIN_USER.id, stripe_payment_link: null, stripe_session_id: null, created_at: iso('2026-08-02T14:00:00Z') },
    { id: 'ffffffff-0000-4000-8000-000000000002', client_id: CLIENT_ID, kind: 'final', amount: 1799, status: 'due', method: 'etransfer', received_at: null, marked_by: null, stripe_payment_link: null, stripe_session_id: null, created_at: iso('2026-08-02T14:00:00Z') },
  ]

  db.intakes = [
    {
      id: INTAKE_ID,
      client_id: CLIENT_ID,
      version: 1,
      payload: {
        event_type: 'Wedding',
        event_date: '2026-11-14',
        getting_ready_address: '88 Harbour St, Toronto',
        call_time: '06:30',
        phone: '+1 (416) 555-0142',
        email: CLIENT_USER.email,
        referral_source: 'Instagram',
      },
      status: 'pending',
      review_message: null,
      submitted_at: iso('2026-09-21T13:05:00Z'),
      reviewed_at: null,
      reviewed_by: null,
      created_at: iso('2026-08-08T14:00:00Z'),
      updated_at: iso('2026-09-21T13:05:00Z'),
    },
  ]

  const memberBase = {
    client_id: CLIENT_ID,
    foundation_brand: '',
    foundation_shade: '',
    allergies: '',
    skin_concerns: '',
    photos: {},
    created_at: iso('2026-08-08T14:00:00Z'),
    updated_at: iso('2026-09-21T13:05:00Z'),
  }
  db.party_members = [
    {
      ...memberBase,
      id: BRIDE_ID,
      is_bride: true,
      name: 'Priya Sharma',
      relation: 'bride',
      services: 'both',
      skin_type: 'combination',
      hair_length: 'long',
      hair_texture: 'wavy',
      likes: 'Dewy, luminous skin. Soft rose tones, a defined but natural brow, and a romantic low bun with face-framing pieces.',
      dislikes: 'Heavy contour, very dark liner, anything that photographs cakey.',
      foundation_brand: 'NARS',
      foundation_shade: 'Barcelona',
      allergies: 'Latex (lash glue) — please use a latex-free adhesive.',
      skin_concerns: 'Slight dryness around the nose in winter.',
      photos: {
        selfie: [{ kind: 'upload', path: `${CLIENT_ID}/members/${BRIDE_ID}/selfie/1.jpg` }],
        makeup_inspo: [
          { kind: 'upload', path: `${CLIENT_ID}/members/${BRIDE_ID}/makeup_inspo/1.jpg` },
          { kind: 'upload', path: `${CLIENT_ID}/members/${BRIDE_ID}/makeup_inspo/2.jpg` },
          { kind: 'link', url: 'https://pinterest.com/pin/soft-glam-bridal' },
        ],
        hair_inspo: [
          { kind: 'upload', path: `${CLIENT_ID}/members/${BRIDE_ID}/hair_inspo/1.jpg` },
          { kind: 'upload', path: `${CLIENT_ID}/members/${BRIDE_ID}/hair_inspo/2.jpg` },
        ],
        additional: [],
      },
      source: 'admin',
      status: 'pending',
      submitted_at: iso('2026-09-21T13:05:00Z'),
    },
    {
      ...memberBase,
      id: M2,
      is_bride: false,
      name: 'Anjali Sharma',
      relation: 'Sister · Maid of Honour',
      services: 'both',
      skin_type: 'oily',
      hair_length: 'medium',
      hair_texture: 'straight',
      likes: 'Matte skin, winged liner, sleek half-up style.',
      dislikes: 'Glitter.',
      photos: { selfie: [{ kind: 'upload', path: `${CLIENT_ID}/members/${M2}/selfie/1.jpg` }], makeup_inspo: [], hair_inspo: [], additional: [] },
      source: 'party_link',
      status: 'approved',
      submitted_at: iso('2026-09-12T13:05:00Z'),
    },
    {
      ...memberBase,
      id: M3,
      is_bride: false,
      name: 'Meera Sharma',
      relation: 'Mom',
      services: 'makeup',
      skin_type: 'dry',
      hair_length: 'short',
      hair_texture: 'wavy',
      likes: 'Elegant and natural.',
      dislikes: 'Strong fragrance.',
      allergies: 'Sensitive to fragrance.',
      photos: { selfie: [], makeup_inspo: [], hair_inspo: [], additional: [] },
      source: 'party_link',
      status: 'pending',
      submitted_at: iso('2026-09-22T09:40:00Z'),
    },
    {
      ...memberBase,
      id: M4,
      is_bride: false,
      name: 'Chloe Bennett',
      relation: 'Bridesmaid',
      services: 'hair',
      skin_type: null,
      hair_length: 'long',
      hair_texture: 'curly',
      likes: '',
      dislikes: '',
      photos: {},
      source: 'bride',
      status: 'draft',
      submitted_at: null,
    },
  ]

  db.client_documents = [
    { id: 'cdcdcdcd-0000-4000-8000-000000000001', client_id: CLIENT_ID, doc_type: 'agreement', visible: true, content: null, file_path: null, updated_at: iso('2026-08-04T19:42:00Z') },
    {
      id: 'cdcdcdcd-0000-4000-8000-000000000002',
      client_id: CLIENT_ID,
      doc_type: 'timeline',
      visible: true,
      file_path: null,
      updated_at: iso('2026-09-15T14:00:00Z'),
      content: {
        entries: [
          { time: '6:30 – 7:45 am', artist: 'Rose (Lead Artist)', person: 'Priya (Bride)', service: 'Makeup' },
          { time: '7:45 – 9:00 am', artist: 'Rose (Lead Artist)', person: 'Priya (Bride)', service: 'Hair' },
          { time: '9:00 – 9:45 am', artist: 'Rose (Lead Artist)', person: 'Meera (Mom)', service: 'Makeup' },
          { time: '9:45 – 10:45 am', artist: 'Rose (Lead Artist)', person: 'Anjali (MOH)', service: 'Hair & Makeup' },
          { time: '6:30 – 7:30 am', artist: 'Navjot (Assistant)', person: 'Chloe', service: 'Hair' },
          { time: '7:30 – 8:30 am', artist: 'Navjot (Assistant)', person: 'Sana', service: 'Hair & Makeup' },
          { time: '8:30 – 9:30 am', artist: 'Navjot (Assistant)', person: 'Riya', service: 'Hair & Makeup' },
        ],
        notes: [
          'Everyone arrives with clean, dry, product-free hair and a bare, moisturized face.',
          'Please have breakfast and water on hand for the whole party.',
          'Ready by 11:30 am for first-look photos at noon.',
        ],
      },
    },
    { id: 'cdcdcdcd-0000-4000-8000-000000000003', client_id: CLIENT_ID, doc_type: 'hair_guide', visible: true, content: null, file_path: null, updated_at: iso('2026-08-06T15:10:00Z') },
    { id: 'cdcdcdcd-0000-4000-8000-000000000004', client_id: CLIENT_ID, doc_type: 'skin_guide', visible: true, content: null, file_path: null, updated_at: iso('2026-08-06T15:10:00Z') },
  ]

  db.submissions = [
    { id: 'abababab-0000-4000-8000-000000000001', client_id: CLIENT_ID, kind: 'intake', ref_id: INTAKE_ID, status: 'pending', message: null, reviewed_at: null, reviewed_by: null, created_at: iso('2026-09-21T13:05:00Z'), clients: { id: CLIENT_ID, full_name: 'Priya Sharma', event_date: '2026-11-14' } },
    { id: 'abababab-0000-4000-8000-000000000002', client_id: CLIENT_ID, kind: 'party_member', ref_id: BRIDE_ID, status: 'pending', message: null, reviewed_at: null, reviewed_by: null, created_at: iso('2026-09-21T13:05:00Z'), clients: { id: CLIENT_ID, full_name: 'Priya Sharma', event_date: '2026-11-14' } },
    { id: 'abababab-0000-4000-8000-000000000003', client_id: CLIENT_ID, kind: 'party_member', ref_id: M3, status: 'pending', message: null, reviewed_at: null, reviewed_by: null, created_at: iso('2026-09-22T09:40:00Z'), clients: { id: CLIENT_ID, full_name: 'Priya Sharma', event_date: '2026-11-14' } },
    { id: 'abababab-0000-4000-8000-000000000004', client_id: C3, kind: 'agreement', ref_id: 'dddddddd-0000-4000-8000-000000000003', status: 'pending', message: null, reviewed_at: null, reviewed_by: null, created_at: iso('2026-09-22T21:12:00Z'), clients: { id: C3, full_name: 'Aaliyah Khan', event_date: '2026-10-24' } },
  ]

  db.party_share_tokens = [
    { id: 'abcdabcd-0000-4000-8000-000000000001', client_id: CLIENT_ID, token: PARTY_TOKEN, expires_at: iso('2026-12-14T00:00:00Z'), revoked_at: null, created_at: iso('2026-08-09T14:00:00Z') },
  ]

  db.app_settings = [
    { key: 'etransfer_email', value: 'pay@bellerose.example', updated_at: iso(NOW) },
    { key: 'notification_email', value: 'hello@bellerose.example', updated_at: iso(NOW) },
    { key: 'current_terms_version', value: '1', updated_at: iso(NOW) },
  ]

  return db
}

export { BRIDE_ID, M2, M3, M4, C2, C3 }
