import { requireAdmin } from '../_lib/auth.js'
import { send, methodGuard, getBody } from '../_lib/http.js'
import { isUuid } from '../_lib/validate.js'

const BUCKET = 'client-uploads'

// storage.list is one level deep — walk the client's whole prefix
async function listAllPaths(admin, prefix) {
  const out = []
  const { data: entries } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000 })
  for (const entry of entries || []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.id) out.push(path) // files have an id; folders don't
    else out.push(...(await listAllPaths(admin, path)))
  }
  return out
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return
  const { error: authErr, admin } = await requireAdmin(req)
  if (authErr) return send(res, 401, { error: authErr })

  const { clientId } = getBody(req)
  if (!isUuid(clientId)) return send(res, 400, { error: 'Invalid client' })

  const { data: client } = await admin
    .from('clients')
    .select('id, user_id')
    .eq('id', clientId)
    .maybeSingle()
  if (!client) return send(res, 404, { error: 'Client not found' })

  // 1. purge uploads
  const paths = await listAllPaths(admin, clientId)
  if (paths.length) {
    const { error: rmErr } = await admin.storage.from(BUCKET).remove(paths)
    if (rmErr) console.error('storage purge failed', rmErr)
  }

  // 2. delete the client row (cascades to every portal table)
  const { error: delErr } = await admin.from('clients').delete().eq('id', clientId)
  if (delErr) {
    console.error('client delete failed', delErr)
    return send(res, 500, { error: 'Could not delete the client' })
  }

  // 3. delete the auth user last
  if (client.user_id) {
    await admin.auth.admin.deleteUser(client.user_id).catch((e) => console.error('auth delete failed', e))
  }

  return send(res, 200, { ok: true, removedFiles: paths.length })
}
