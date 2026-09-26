// Shared booking vocabulary — imported by the browser AND by /api.
// Keep this module pure: no JSX, no import.meta.env, no browser globals,
// explicit .js extensions on any import.

export const SERVICES = ['hair', 'makeup', 'both']
export const SERVICE_LABELS = { hair: 'Hair', makeup: 'Makeup', both: 'Hair & Makeup' }

export const SKIN_TYPES = ['normal', 'dry', 'oily', 'combination', 'sensitive']
export const HAIR_LENGTHS = ['short', 'medium', 'long', 'extensions', 'clip_ins']
export const HAIR_TEXTURES = ['straight', 'wavy', 'curly', 'coily']
export const PHOTO_SLOTS = ['selfie', 'makeup_inspo', 'hair_inspo', 'additional']

export const EVENT_TYPES = [
  'Wedding', 'Reception', 'Mehndi', 'Jaggo', 'Sangeet', 'Maiyan', 'Chunni', 'Engagement',
  'Roka', 'Haldi', 'Trial', 'Photoshoot', 'Party', 'Other',
]

// Relations offered on timeline bricks (free text is always allowed too).
export const RELATIONS = [
  'Bride', 'Groom', 'Mother of the bride', 'Mother of the groom', 'Maid of honour',
  'Sister', 'Sister-in-law', 'Cousin', 'Aunt', 'Grandmother', 'Friend', 'Bridesmaid', 'Flower girl', 'Guest',
]

// These relations are starred as important automatically (Bhagesh, 2026-09-26).
// A plain "Mother" from the bride's own party counts as the mother of the bride.
const STARRED = new Set([
  'bride', 'groom', 'mother of the bride', 'mother of the groom', 'maid of honour', 'maid of honor', 'mother', 'mom', 'mum',
])
export const isStarredRelation = (relation) => STARRED.has(String(relation || '').trim().toLowerCase())

// Which side a relation belongs to (Bhagesh, 2026-09-26): picking it moves the
// person to that side; anything else leaves their side as it was (null).
const BRIDE_SIDE = new Set(['bride', 'mother of the bride', 'maid of honour', 'maid of honor', 'bridesmaid'])
const GROOM_SIDE = new Set(['groom', 'mother of the groom', 'best man', 'groomsman'])
export function sideForRelation(relation) {
  const r = String(relation || '').trim().toLowerCase()
  if (BRIDE_SIDE.has(r) || r.endsWith('of the bride')) return 'bride'
  if (GROOM_SIDE.has(r) || r.endsWith('of the groom')) return 'groom'
  return null
}

// "Bride’s side" / "Groom’s side" for a person's details line — left off for
// the bride and groom themselves, where it would only repeat
export function sideLabel(person) {
  const r = String(person?.relation || '').trim().toLowerCase()
  if (person?.bride || r === 'bride' || r === 'groom') return null
  return person?.side === 'groom' ? 'Groom’s side' : 'Bride’s side'
}

// Which profile answers belong to which service. Anything not listed here
// (name, relation, likes, dislikes, allergies, selfie, additional photos) is
// relevant to everyone.
export const HAIR_FIELDS = ['hair_length', 'hair_texture']
export const MAKEUP_FIELDS = ['skin_type', 'foundation_brand', 'foundation_shade', 'skin_concerns']
export const HAIR_PHOTO_SLOTS = ['hair_inspo']
export const MAKEUP_PHOTO_SLOTS = ['makeup_inspo']

export const hasHair = (s) => s === 'hair' || s === 'both'
export const hasMakeup = (s) => s === 'makeup' || s === 'both'

export function servicesValue({ hair, makeup }) {
  if (hair && makeup) return 'both'
  if (hair) return 'hair'
  if (makeup) return 'makeup'
  return null
}

// What the booking includes, from its service line items.
export function bookingServices(lines = [], { forBrideOnly = false } = {}) {
  let hair = false
  let makeup = false
  let itemised = false
  for (const l of lines) {
    if (l.kind !== 'service' || !l.service) continue
    if (forBrideOnly && !l.for_bride) continue
    itemised = true
    if (Number(l.qty) <= 0) continue
    if (hasHair(l.service)) hair = true
    if (hasMakeup(l.service)) makeup = true
  }
  return { hair, makeup, itemised }
}

export function brideServices(lines = []) {
  return servicesValue(bookingServices(lines, { forBrideOnly: true }))
}

// The service choices a person may pick, given what the booking includes.
// Unknown booking → every choice stays open.
export function allowedServiceOptions(booked) {
  if (!booked || (!booked.hair && !booked.makeup)) return SERVICES
  if (booked.hair && booked.makeup) return SERVICES
  return booked.hair ? ['hair'] : ['makeup']
}

// Which sections of a profile form to show for a chosen service.
export function relevantSections(services) {
  return {
    chosen: SERVICES.includes(services),
    hair: hasHair(services),
    makeup: hasMakeup(services),
  }
}

// Drop answers that don't apply to the chosen service (hair-only people keep no
// skin answers, and vice versa). Unchosen service → nothing is stripped.
export function stripIrrelevant(profile = {}) {
  const s = profile.services
  if (!SERVICES.includes(s)) return { ...profile }
  const out = { ...profile }
  if (!hasHair(s)) for (const f of HAIR_FIELDS) out[f] = null
  if (!hasMakeup(s)) {
    for (const f of MAKEUP_FIELDS) out[f] = f === 'skin_type' ? null : ''
  }
  if (profile.photos && typeof profile.photos === 'object') {
    const photos = { ...profile.photos }
    if (!hasHair(s)) for (const slot of HAIR_PHOTO_SLOTS) delete photos[slot]
    if (!hasMakeup(s)) for (const slot of MAKEUP_PHOTO_SLOTS) delete photos[slot]
    out.photos = photos
  }
  return out
}

// The studio's default price list (prices blank until Arsh fills them in).
export const DEFAULT_PRICE_LIST = [
  { code: 'bridal_hm', label: 'Bridal Hair & Makeup', kind: 'service', service: 'both', for_bride: true, minutes: 60, price: null },
  { code: 'bridal_makeup', label: 'Bridal Makeup', kind: 'service', service: 'makeup', for_bride: true, minutes: 60, price: null },
  { code: 'bridal_hair', label: 'Bridal Hair', kind: 'service', service: 'hair', for_bride: true, minutes: 60, price: null },
  { code: 'party_hm', label: 'Party Hair & Makeup', kind: 'service', service: 'both', for_bride: false, minutes: 60, price: null },
  { code: 'party_makeup', label: 'Party Makeup', kind: 'service', service: 'makeup', for_bride: false, minutes: 60, price: null },
  { code: 'party_hair', label: 'Party Hair', kind: 'service', service: 'hair', for_bride: false, minutes: 60, price: null },
  { code: 'fg_makeup', label: 'Flower Girl Makeup', kind: 'service', service: 'makeup', for_bride: false, minutes: 60, price: null },
  { code: 'fg_hair', label: 'Flower Girl Hair', kind: 'service', service: 'hair', for_bride: false, minutes: 60, price: null },
  { code: 'draping', label: 'Dupatta / Saree Draping', kind: 'service', service: null, for_bride: false, minutes: 60, price: null },
  { code: 'early_start', label: 'Early-start fee', kind: 'fee', service: null, for_bride: false, minutes: null, price: null },
  { code: 'travel', label: 'Travel', kind: 'fee', service: null, for_bride: false, minutes: null, price: null },
  { code: 'parking', label: 'Parking', kind: 'fee', service: null, for_bride: false, minutes: null, price: null },
  { code: 'toll', label: 'Toll', kind: 'fee', service: null, for_bride: false, minutes: null, price: null },
  { code: 'other_fee', label: 'Other fee', kind: 'fee', service: null, for_bride: false, minutes: null, price: null },
  { code: 'discount', label: 'Discount', kind: 'discount', service: null, for_bride: false, minutes: null, price: null },
]

export function parsePriceList(raw) {
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(list) && list.length) return list
  } catch {
    /* fall through */
  }
  return DEFAULT_PRICE_LIST
}
