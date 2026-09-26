import { supabase } from '../../../lib/supabaseClient'

// Review a pending submission; falls back to a direct update when a record
// has no pending queue row (e.g. Arsh edits long after approval).
export async function review(kind, refId, status, message) {
  const { data: sub } = await supabase
    .from('submissions')
    .select('id')
    .eq('kind', kind)
    .eq('ref_id', refId)
    .eq('status', 'pending')
    .maybeSingle()
  if (sub) {
    await supabase.from('submissions').update({ status, message: message || null }).eq('id', sub.id)
    return
  }
  const table = kind === 'intake' ? 'intakes' : kind === 'party_member' ? 'party_members' : 'agreements'
  const patch = { status }
  if (kind === 'intake' && status === 'changes_requested') patch.review_message = message || null
  await supabase.from(table).update(patch).eq('id', refId)
}
