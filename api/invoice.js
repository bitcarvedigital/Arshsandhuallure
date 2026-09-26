import { getCaller } from './_lib/auth.js'
import { send, methodGuard, getBody } from './_lib/http.js'
import { sendEmail, esc } from './_lib/email.js'
import { isUuid, str } from './_lib/validate.js'
import { loadBooking } from './_lib/booking.js'
import { renderInvoicePdf } from './_lib/invoicePdf.js'
import { buildStatement } from '../src/shared/booking/pricing.js'

// One function for everything invoice-related (the Vercel Hobby plan allows
// 12 functions per deployment, so these share a door):
//   action 'send'     studio → create from the live booking + email it
//   action 'resend'   studio → email an existing invoice again
//   action 'preview'  studio → PDF of a draft, nothing saved
//   action 'download' studio (any invoice) or the owning client (issued only)

const money = (v) => `$${Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const shortDate = (d) =>
  new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

function sendPdf(res, buf, filename) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^\w.-]+/g, '-')}"`)
  res.setHeader('Cache-Control', 'private, no-store')
  res.end(buf)
}

async function statementFor(admin, client, body) {
  const booking = await loadBooking(admin, client.id)
  const { data: et } = await admin.from('app_settings').select('value').eq('key', 'etransfer_email').maybeSingle()
  const amountDue = body.amountDue === '' || body.amountDue == null || isNaN(Number(body.amountDue)) ? null : Math.max(0, Number(body.amountDue))
  return {
    booking,
    snapshot: buildStatement({
      client, ...booking, amountDue,
      dueOn: /^\d{4}-\d{2}-\d{2}$/.test(body.dueOn || '') ? body.dueOn : null,
      note: str(body.note, 2000), etransferEmail: et?.value || '',
    }),
  }
}

async function emailInvoice(admin, invoice, client) {
  const { data: setting } = await admin.from('app_settings').select('value').eq('key', 'notification_email').maybeSingle()
  const studio = setting?.value || undefined
  const s = invoice.snapshot || {}
  let pdf = null
  try {
    pdf = await renderInvoicePdf({ invoice, snapshot: s })
  } catch (err) {
    console.error('invoice pdf failed — sending without attachment', err)
  }
  const base = process.env.APP_BASE_URL || 'http://localhost:5173'
  const first = esc((client.full_name || '').split(' ')[0])
  const due = Number(s.amount_due) || 0
  const r = await sendEmail({
    to: client.email,
    subject: `Invoice ${invoice.number} — Arsh Sandhu Allure`,
    heading: `Your invoice, ${first}`,
    bodyHtml: [
      `<p>Please find invoice <strong>${esc(invoice.number)}</strong> ${pdf ? 'attached' : 'in your portal'}.</p>`,
      due > 0
        ? `<p style="font-size:20px;margin:18px 0;"><strong>${esc(money(due))}</strong> due${s.due_on ? ` by ${esc(shortDate(s.due_on))}` : ''}</p>`
        : '<p>Nothing is due right now — thank you!</p>',
      due > 0 && s.etransfer_email
        ? `<p>Send an Interac e-Transfer to <strong>${esc(s.etransfer_email)}</strong> with <strong>${esc(invoice.number)}</strong> in the message.</p>`
        : '',
      s.note ? `<p style="border-left:2px solid #7A5A32;padding-left:12px;color:#5A4030;">${esc(s.note)}</p>` : '',
      '<p>You can see every event, price and payment any time in your client portal.</p>',
    ].join(''),
    ctaText: 'View in your portal',
    ctaUrl: `${base}/portal/invoice/${invoice.id}`,
    attachments: pdf ? [{ filename: `${invoice.number}.pdf`, content: pdf.toString('base64') }] : undefined,
    bcc: studio && studio.toLowerCase() !== String(client.email).toLowerCase() ? studio : undefined,
    replyTo: studio,
  })
  if (!r.skipped) {
    await admin.from('invoices').update({ sent_at: new Date().toISOString(), sent_to: client.email }).eq('id', invoice.id)
  }
  return { emailed: !r.skipped, reason: r.reason, attached: !!pdf }
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return
  const { user, admin } = await getCaller(req)
  if (!user) return send(res, 401, { error: 'Not signed in' })
  const { data: adminRow } = await admin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  const isAdmin = !!adminRow
  const body = getBody(req)
  const action = body.action

  // ---- client-or-studio: download an invoice -------------------------------
  if (action === 'download') {
    if (!isUuid(body.invoiceId)) return send(res, 400, { error: 'Invalid invoice' })
    const { data: invoice } = await admin.from('invoices').select('*').eq('id', body.invoiceId).maybeSingle()
    if (!invoice) return send(res, 404, { error: 'Invoice not found' })
    if (!isAdmin) {
      const { data: client } = await admin.from('clients').select('id').eq('user_id', user.id).maybeSingle()
      if (!client || client.id !== invoice.client_id || invoice.status !== 'issued') {
        return send(res, 404, { error: 'Invoice not found' })
      }
    }
    const buf = await renderInvoicePdf({ invoice, snapshot: invoice.snapshot })
    return sendPdf(res, buf, `${invoice.number}.pdf`)
  }

  // ---- everything below is studio-only -------------------------------------
  if (!isAdmin) return send(res, 401, { error: 'Not authorized' })

  if (action === 'preview') {
    if (!isUuid(body.clientId)) return send(res, 400, { error: 'Invalid client' })
    const { data: client } = await admin.from('clients').select('*').eq('id', body.clientId).maybeSingle()
    if (!client) return send(res, 404, { error: 'Client not found' })
    const { snapshot } = await statementFor(admin, client, body)
    const buf = await renderInvoicePdf({ invoice: { number: 'PREVIEW' }, snapshot })
    return sendPdf(res, buf, 'Invoice-preview.pdf')
  }

  if (action === 'resend') {
    if (!isUuid(body.invoiceId)) return send(res, 400, { error: 'Invalid invoice' })
    const { data: invoice } = await admin.from('invoices').select('*').eq('id', body.invoiceId).maybeSingle()
    if (!invoice || invoice.status !== 'issued') return send(res, 404, { error: 'Invoice not found' })
    const { data: client } = await admin.from('clients').select('id, full_name, email').eq('id', invoice.client_id).maybeSingle()
    if (!client) return send(res, 404, { error: 'Client not found' })
    const result = await emailInvoice(admin, invoice, client)
    return send(res, 200, { invoice, ...result })
  }

  if (action === 'send') {
    if (!isUuid(body.clientId)) return send(res, 400, { error: 'Invalid client' })
    const { data: client } = await admin.from('clients').select('*').eq('id', body.clientId).maybeSingle()
    if (!client) return send(res, 404, { error: 'Client not found' })
    const { booking, snapshot } = await statementFor(admin, client, body)
    if (!booking.lines.length) return send(res, 400, { error: 'Add prices to the booking before invoicing' })
    const { data: invoice, error } = await admin
      .from('invoices')
      .insert({ client_id: client.id, due_on: snapshot.due_on, note: snapshot.note, snapshot, created_by: user.id })
      .select()
      .single()
    if (error) {
      console.error('invoice insert failed', error)
      return send(res, 500, { error: 'Could not create the invoice' })
    }
    const result = await emailInvoice(admin, invoice, client)
    return send(res, 200, { invoice, ...result })
  }

  return send(res, 400, { error: 'Unknown action' })
}
