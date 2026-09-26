import { useMemo, useState } from 'react'
import { supabase, authedFetch, authedDownload } from '../../../lib/supabaseClient'
import { Btn, ErrorNote, FormSection, StatusChip, money, fmtShortDate, fmtDateTime, cellInputClass, metaLabelClass } from '../../../shared/ui'
import { backLinkClass, quietBtn, quietDangerBtn, SaveNote } from '../../adminUi'
import { buildStatement, sortEvents } from '../../../shared/booking/pricing.js'
import InvoiceView from '../../../shared/booking/InvoiceView'

function SmallLabel({ children }) {
  return <span className={metaLabelClass}>{children}</span>
}

const todayIso = () => new Date().toLocaleDateString('en-CA')

export default function InvoicePanel({ client, events, lines, payments, invoices, etransferEmail, summary, reload }) {
  const upcoming = sortEvents(events).find((e) => e.event_date && e.event_date >= todayIso())
  const retainer = payments.find((p) => p.kind === 'retainer')
  const suggestDue = retainer && retainer.status !== 'received' ? retainer.amount : summary.outstanding
  const [dueOn, setDueOn] = useState(upcoming?.event_date || '')
  const [amountDue, setAmountDue] = useState(suggestDue ?? '')
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const draft = useMemo(
    () => buildStatement({ client, events, lines, payments, amountDue, dueOn, note, etransferEmail }),
    [client, events, lines, payments, amountDue, dueOn, note, etransferEmail],
  )
  const noQuote = summary.total == null

  async function send() {
    setErr('')
    setMsg('')
    if (!window.confirm(`Email this invoice to ${client.email}? A copy comes to you too.`)) return
    setBusy(true)
    try {
      const res = await authedFetch('/api/invoice', { action: 'send', clientId: client.id, dueOn, amountDue, note })
      setMsg(res.emailed ? `Invoice ${res.invoice.number} sent to ${client.email} ✓` : `Invoice ${res.invoice.number} saved — the email could not be sent (${res.reason || 'email not configured'}).`)
      setPreview(false)
      setNote('')
      reload()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function resend(inv) {
    if (!window.confirm(`Re-send ${inv.number} to ${client.email}?`)) return
    setBusy(true)
    setErr('')
    try {
      const res = await authedFetch('/api/invoice', { action: 'resend', invoiceId: inv.id })
      setMsg(res.emailed ? `${inv.number} re-sent ✓` : `Could not email ${inv.number} (${res.reason || 'email not configured'}).`)
      reload()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function voidInvoice(inv) {
    if (!window.confirm(`Void ${inv.number}? She will no longer see it. This can’t be undone.`)) return
    await supabase.from('invoices').update({ status: 'void' }).eq('id', inv.id)
    reload()
  }

  async function download(body, filename) {
    setErr('')
    try {
      await authedDownload('/api/invoice', body, filename)
    } catch (e) {
      setErr(e.message)
    }
  }

  if (viewing) {
    return (
      <FormSection
        title={`Invoice ${viewing.number}`}
        action={
          <button type="button" onClick={() => setViewing(null)} className={backLinkClass}>
            <span aria-hidden="true">←</span> All invoices
          </button>
        }
      >
        <InvoiceView invoice={viewing} />
      </FormSection>
    )
  }

  return (
    <>
      <FormSection
        title="New invoice"
        hint="A branded PDF invoice, emailed to her from the portal with a copy to you. It also appears on her payments page."
      >
        {noQuote ? (
          <p className="text-sm text-faint">Add prices in the Overview first — the invoice is built from them.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1"><SmallLabel>Amount due now ($)</SmallLabel>
                <input className={cellInputClass + ' tabular-nums'} type="number" min="0" step="0.01" inputMode="decimal" value={amountDue ?? ''} onChange={(e) => setAmountDue(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1"><SmallLabel>Due by</SmallLabel>
                <input className={cellInputClass} type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
              </label>
            </div>
            <p className="text-xs text-faint -mt-3">
              Outstanding on the booking: {money(summary.outstanding)}
              {retainer && retainer.status !== 'received' ? ` · retainer not yet received (${money(retainer.amount)})` : ''}
            </p>
            <label className="flex flex-col gap-1"><SmallLabel>Note on the invoice (optional)</SmallLabel>
              <textarea rows={2} className={cellInputClass + ' resize-none'} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Thank you! The retainer secures all three dates." />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Btn variant="outline" size="sm" aria-expanded={preview} onClick={() => setPreview((p) => !p)}>
                {preview ? 'Hide preview' : 'Preview'}
              </Btn>
              <Btn variant="outline" size="sm" onClick={() => download({ action: 'preview', clientId: client.id, dueOn, amountDue, note }, `Invoice-preview-${client.full_name}.pdf`)}>
                Preview PDF
              </Btn>
              <Btn size="sm" onClick={send} disabled={busy}>
                {busy ? 'Sending…' : `Send to ${client.full_name.split(' ')[0]}`}
              </Btn>
            </div>
            {preview && <InvoiceView snapshot={draft} />}
          </>
        )}
        <ErrorNote>{err}</ErrorNote>
        <SaveNote error={/could not/i.test(msg)}>{msg}</SaveNote>
      </FormSection>

      <FormSection title={`Invoices sent (${invoices.length})`}>
        {invoices.length === 0 && <p className="text-sm text-faint">No invoices yet.</p>}
        {invoices.length > 0 && (
          <div className="-mt-3">
            {invoices.map((inv) => {
              const isVoid = inv.status === 'void'
              return (
                <div key={inv.id} className="flex items-center gap-x-4 gap-y-2 flex-wrap py-4 border-b border-line">
                  <div className={`flex-1 min-w-[14rem] ${isVoid ? 'opacity-60' : ''}`}>
                    <p className="text-sm text-dark flex items-center gap-2 flex-wrap">
                      <span className="tabular-nums">{inv.number}</span>
                      <span className="text-muted">· {money(inv.snapshot?.amount_due)} due{inv.due_on ? ` by ${fmtShortDate(inv.due_on)}` : ''}</span>
                      {isVoid && <StatusChip status="changes_requested" label="Void" />}
                    </p>
                    <p className="text-xs text-faint mt-0.5">
                      Issued {fmtShortDate(inv.issued_on)}
                      {inv.sent_at ? ` · emailed ${fmtDateTime(inv.sent_at)}` : ' · not emailed'}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-wrap -ml-3 sm:ml-0 sm:-mr-3">
                    <button type="button" className={quietBtn} onClick={() => setViewing(inv)}>View</button>
                    <button type="button" className={quietBtn} onClick={() => download({ action: 'download', invoiceId: inv.id }, `${inv.number}.pdf`)}>PDF</button>
                    {!isVoid && (
                      <>
                        <button type="button" className={quietBtn} disabled={busy} onClick={() => resend(inv)}>Re-send</button>
                        <button type="button" className={quietDangerBtn} onClick={() => voidInvoice(inv)}>Void</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </FormSection>
    </>
  )
}
