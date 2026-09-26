import { getCaller } from './_lib/auth.js'
import { send, methodGuard, getBody } from './_lib/http.js'
import { isUuid, str } from './_lib/validate.js'
import { loadBooking } from './_lib/booking.js'
import { renderInvoicePdf } from './_lib/invoicePdf.js'
import { buildStatement } from '../src/shared/booking/pricing.js'

function sendPdf(res, buf, filename) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^\w.-]+/g, '-')}"`)
  res.setHeader('Cache-Control', 'private, no-store')
  res.end(buf)
}

// Invoice PDF download — the studio (any invoice, or a live preview) or the
// client the invoice belongs to (issued invoices only).
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return
  const { user, admin } = await getCaller(req)
  if (!user) return send(res, 401, { error: 'Not signed in' })
  const { data: adminRow } = await admin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  const isAdmin = !!adminRow
  const body = getBody(req)

  if (body.preview) {
    if (!isAdmin) return send(res, 401, { error: 'Not authorized' })
    if (!isUuid(body.clientId)) return send(res, 400, { error: 'Invalid client' })
    const { data: client } = await admin.from('clients').select('*').eq('id', body.clientId).maybeSingle()
    if (!client) return send(res, 404, { error: 'Client not found' })
    const booking = await loadBooking(admin, client.id)
    const { data: et } = await admin.from('app_settings').select('value').eq('key', 'etransfer_email').maybeSingle()
    const amountDue = body.amountDue === '' || body.amountDue == null || isNaN(Number(body.amountDue)) ? null : Number(body.amountDue)
    const snapshot = buildStatement({
      client, ...booking, amountDue,
      dueOn: /^\d{4}-\d{2}-\d{2}$/.test(body.dueOn || '') ? body.dueOn : null,
      note: str(body.note, 2000), etransferEmail: et?.value || '',
    })
    const buf = await renderInvoicePdf({ invoice: { number: 'PREVIEW' }, snapshot })
    return sendPdf(res, buf, 'Invoice-preview.pdf')
  }

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
