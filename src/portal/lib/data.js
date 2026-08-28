import { supabase } from '../../lib/supabaseClient'

const BUCKET = 'client-uploads'

// Everything the portal needs, in one round of parallel queries (all RLS-scoped).
export async function loadPortalBundle() {
  const [agreement, payments, intakes, members, docs, settings] = await Promise.all([
    supabase
      .from('agreements')
      .select('*')
      .in('status', ['signed', 'approved'])
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('payments').select('*'),
    supabase
      .from('intakes')
      .select('*')
      .neq('status', 'superseded')
      .order('version', { ascending: false }),
    supabase.from('party_members').select('*').order('is_bride', { ascending: false }).order('created_at'),
    supabase.from('client_documents').select('*'),
    supabase.from('app_settings').select('value').eq('key', 'etransfer_email').maybeSingle(),
  ])
  return {
    agreement: agreement.data || null,
    payments: payments.data || [],
    intake: (intakes.data || [])[0] || null,
    members: members.data || [],
    docs: docs.data || [],
    etransferEmail: settings.data?.value || '',
  }
}

export async function uploadMemberPhoto(clientId, memberId, slot, file) {
  const ext = (file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg')
  const path = `${clientId}/members/${memberId}/${slot}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
  if (error) throw new Error('Upload failed — please try again')
  return { path }
}

export async function signedPhotoUrl(path) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error) return ''
  return data.signedUrl
}

export function generatePartyToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
