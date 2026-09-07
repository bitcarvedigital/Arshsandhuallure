import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { send, methodGuard, getBody } from '../_lib/http.js'
import { sendEmail, esc } from '../_lib/email.js'

const KIND_LABEL = {
  agreement: 'a signed service agreement',
  intake: 'a client intake form',
  party_member: 'a wedding-party profile',
}

// Target of the Supabase Database Webhook on INSERT into public.submissions.
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return
  const secret = process.env.SUBMISSION_WEBHOOK_SECRET
  if (!secret || req.headers['x-webhook-secret'] !== secret) {
    return send(res, 401, { error: 'Unauthorized' })
  }

  const body = getBody(req)
  const record = body.record
  if (body.type !== 'INSERT' || body.table !== 'submissions' || !record?.id) {
    return send(res, 400, { error: 'Unexpected payload' })
  }

  const admin = supabaseAdmin()

  // A wizard submit can enqueue a dozen rows at once (intake + every party
  // member). Only the first submission in a 20-second window per client emails;
  // separate human actions minutes apart still each get their own email.
  // Bulk inserts share one created_at, so ties break on id to pick exactly one.
  const windowStart = new Date(new Date(record.created_at).getTime() - 20 * 1000).toISOString()
  const { data: earlier } = await admin
    .from('submissions')
    .select('id')
    .eq('client_id', record.client_id)
    .gte('created_at', windowStart)
    .or(`created_at.lt.${record.created_at},and(created_at.eq.${record.created_at},id.lt.${record.id})`)
    .limit(1)
  if (earlier && earlier.length) return send(res, 200, { ok: true, deduped: true })

  const [{ data: client }, { data: setting }, { count: pending }] = await Promise.all([
    admin.from('clients').select('full_name, event_date').eq('id', record.client_id).maybeSingle(),
    admin.from('app_settings').select('value').eq('key', 'notification_email').maybeSingle(),
    admin.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])
  const to = setting?.value
  if (!to) return send(res, 200, { ok: true, skipped: 'no notification email configured' })

  const base = process.env.APP_BASE_URL || 'http://localhost:5173'
  await sendEmail({
    to,
    subject: `New submission from ${client?.full_name || 'a client'}`,
    heading: 'New client submission',
    bodyHtml: `<p><strong>${esc(client?.full_name || 'A client')}</strong>${
      client?.event_date ? ` (event ${esc(client.event_date)})` : ''
    } just sent ${KIND_LABEL[record.kind] || 'a submission'}.</p><p>${
      pending || 1
    } item${(pending || 1) === 1 ? '' : 's'} waiting for your review.</p>`,
    ctaText: 'Review Now',
    ctaUrl: `${base}/admin/queue`,
  })

  return send(res, 200, { ok: true })
}
