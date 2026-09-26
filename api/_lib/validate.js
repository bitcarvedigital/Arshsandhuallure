// One vocabulary for browser + server (pure module shared with src/).
import {
  SERVICES, SKIN_TYPES, HAIR_LENGTHS, HAIR_TEXTURES, PHOTO_SLOTS, stripIrrelevant,
} from '../../src/shared/booking/services.js'

export { SERVICES, SKIN_TYPES, HAIR_LENGTHS, HAIR_TEXTURES, PHOTO_SLOTS }
export const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_PER_SLOT = 6

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v)
}

export function str(v, max = 2000) {
  if (typeof v !== 'string') return ''
  return v.slice(0, max).trim()
}

export function enumOrNull(v, allowed) {
  return allowed.includes(v) ? v : null
}

// Shared shape for a party-member profile arriving from the public form.
// `allowed` = service choices the booking includes; `eventIds` = the
// booking's events (anything else is dropped). Answers that don't apply to the
// chosen service are removed server-side too.
export function validateMemberProfile(profile = {}, { allowed = SERVICES, eventIds = [] } = {}) {
  const name = str(profile.name, 200)
  if (!name) return { error: 'Name is required' }
  let services = enumOrNull(profile.services, SERVICES)
  if (services && !allowed.includes(services)) services = allowed.length === 1 ? allowed[0] : null
  if (!services && allowed.length === 1) services = allowed[0]
  const events = Array.isArray(profile.event_ids) ? profile.event_ids.filter((id) => isUuid(id) && eventIds.includes(id)) : []
  const value = stripIrrelevant({
    name,
    relation: str(profile.relation, 200),
    services,
    skin_type: enumOrNull(profile.skin_type, SKIN_TYPES),
    hair_length: enumOrNull(profile.hair_length, HAIR_LENGTHS),
    hair_texture: enumOrNull(profile.hair_texture, HAIR_TEXTURES),
    likes: str(profile.likes),
    dislikes: str(profile.dislikes),
    foundation_brand: str(profile.foundation_brand, 200),
    foundation_shade: str(profile.foundation_shade, 200),
    allergies: str(profile.allergies),
    skin_concerns: str(profile.skin_concerns),
  })
  return { value: { ...value, event_ids: [...new Set(events)] } }
}

// photos: { slot: [{kind:'upload', path} | {kind:'link', url}] }
export function validatePhotos(photos = {}, { clientId, memberId }) {
  const clean = {}
  for (const slot of PHOTO_SLOTS) {
    const list = Array.isArray(photos[slot]) ? photos[slot].slice(0, MAX_PER_SLOT) : []
    const out = []
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      if (item.kind === 'upload' && typeof item.path === 'string') {
        const prefix = `${clientId}/members/${memberId}/${slot}/`
        if (!item.path.startsWith(prefix) || item.path.includes('..')) {
          return { error: 'Invalid upload path' }
        }
        out.push({ kind: 'upload', path: item.path })
      } else if (item.kind === 'link' && typeof item.url === 'string') {
        const url = item.url.slice(0, 500).trim()
        if (!/^https?:\/\//i.test(url)) return { error: 'Links must start with http(s)://' }
        out.push({ kind: 'link', url })
      }
    }
    if (out.length) clean[slot] = out
  }
  return { value: clean }
}
