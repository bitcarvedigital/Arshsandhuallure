import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { send } from '../_lib/http.js'
import { sendEmail } from '../_lib/email.js'

// Weekly Vercel Cron. Exports every portal table to JSON, keeps a copy in the
// private `backups` bucket (last 12), and emails a copy offsite. Photos in
// storage are not included. Free-tier Supabase keeps no backups of its own.
const TABLES = [
  'admins', 'clients', 'admin_notes', 'party_members', 'intakes', 'agreement_terms',
  'agreements', 'client_documents', 'payments', 'submissions', 'app_settings',
  'invite_tokens', 'party_share_tokens',
]
const KEEP = 12

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers['authorization'] !== `Bearer ${secret}`) {
    return send(res, 401, { error: 'Unauthorized' })
  }
  const admin = supabaseAdmin()
  const takenAt = new Date().toISOString()
  const dump = { version: 1, taken_at: takenAt, tables: {} }
  let rows = 0
  for (const t of TABLES) {
    const all = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from(t).select('*').range(from, from + 999)
      if (error) return send(res, 500, { error: `${t}: ${error.message}` })
      all.push(...(data || []))
      if (!data || data.length < 1000) break
    }
    dump.tables[t] = all
    rows += all.length
  }

  const json = JSON.stringify(dump)
  const name = `arsh-portal-${takenAt.slice(0, 10)}.json`
  const { error: upErr } = await admin.storage
    .from('backups')
    .upload(name, Buffer.from(json), { contentType: 'application/json', upsert: true })
  if (upErr) return send(res, 500, { error: `upload: ${upErr.message}` })

  // prune: keep the newest KEEP files
  const { data: files } = await admin.storage.from('backups').list('', { limit: 200 })
  const old = (files || []).map((f) => f.name).sort().reverse().slice(KEEP)
  if (old.length) await admin.storage.from('backups').remove(old)

  const { data: setting } = await admin.from('app_settings').select('value').eq('key', 'backup_email').maybeSingle()
  let emailed = false
  if (setting?.value) {
    const r = await sendEmail({
      to: setting.value,
      subject: `Portal backup — ${takenAt.slice(0, 10)}`,
      heading: 'Weekly portal backup',
      bodyHtml: `<p>${rows} rows across ${TABLES.length} tables, attached as JSON. A copy is also kept in the portal's private backups bucket (last ${KEEP} weeks).</p><p>This file contains client details — keep it somewhere private.</p>`,
      attachments: [{ filename: name, content: Buffer.from(json).toString('base64') }],
    })
    emailed = !r.skipped
  }
  return send(res, 200, { ok: true, rows, bytes: json.length, file: name, emailed })
}
