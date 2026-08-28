import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { send, methodGuard, getBody, rateLimit } from '../_lib/http.js'
import { resolvePartyToken } from './info.js'
import { PHOTO_SLOTS, ALLOWED_MIMES, MAX_FILE_BYTES, MAX_PER_SLOT, isUuid } from '../_lib/validate.js'

const BUCKET = 'client-uploads'
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' }

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return
  if (!rateLimit(req, res, { max: 60 })) return
  const { token, memberId, slot, mime, size } = getBody(req)

  const admin = supabaseAdmin()
  const t = await resolvePartyToken(admin, token)
  if (!t) return send(res, 403, { error: 'This link is no longer active' })

  if (!isUuid(memberId)) return send(res, 400, { error: 'Invalid member id' })
  if (!PHOTO_SLOTS.includes(slot)) return send(res, 400, { error: 'Invalid photo slot' })
  if (!ALLOWED_MIMES.includes(mime)) return send(res, 400, { error: 'Please upload a JPG, PNG, or WebP image' })
  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES) {
    return send(res, 400, { error: 'Images must be under 10 MB' })
  }

  const dir = `${t.client_id}/members/${memberId}/${slot}`
  const { data: existing } = await admin.storage.from(BUCKET).list(dir, { limit: MAX_PER_SLOT + 1 })
  if ((existing || []).length >= MAX_PER_SLOT) {
    return send(res, 400, { error: `Up to ${MAX_PER_SLOT} photos per section` })
  }

  const path = `${dir}/${randomUUID()}.${EXT[mime]}`
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) {
    console.error('signed upload url failed', error)
    return send(res, 500, { error: 'Could not prepare the upload — please try again' })
  }
  return send(res, 200, { path: data.path, token: data.token })
}
