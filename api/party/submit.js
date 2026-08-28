import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { send, methodGuard, getBody, rateLimit } from '../_lib/http.js'
import { resolvePartyToken } from './info.js'
import { validateMemberProfile, validatePhotos, isUuid } from '../_lib/validate.js'

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return
  if (!rateLimit(req, res, { max: 15 })) return
  const { token, memberId, profile, photos } = getBody(req)

  const admin = supabaseAdmin()
  const t = await resolvePartyToken(admin, token)
  if (!t) return send(res, 403, { error: 'This link is no longer active' })

  const id = isUuid(memberId) ? memberId : undefined
  const prof = validateMemberProfile(profile)
  if (prof.error) return send(res, 400, { error: prof.error })
  const pics = validatePhotos(photos, { clientId: t.client_id, memberId: id || 'none' })
  if (pics.error) return send(res, 400, { error: pics.error })

  const { data: member, error } = await admin
    .from('party_members')
    .insert({
      ...(id ? { id } : {}),
      client_id: t.client_id,
      ...prof.value,
      photos: pics.value,
      source: 'party_link',
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    .select('id, name')
    .single()

  if (error) {
    console.error('party submit failed', error)
    const msg = /duplicate/i.test(error.message)
      ? 'This profile was already submitted'
      : 'We could not save your details — please try again'
    return send(res, 400, { error: msg })
  }

  return send(res, 200, { ok: true, memberId: member.id })
}
