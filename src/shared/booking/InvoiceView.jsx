import { money, fmtShortDate, MicroLabel, StatusChip } from '../ui'
import FeeSchedule from './FeeSchedule'
import PaymentsLedger from './PaymentsLedger'

// soft callout that still reads as a box on paper (backgrounds don't print)
const callout = 'rounded-xl bg-soft/70 px-4 py-4 sm:px-5 print:bg-transparent print:border print:border-line'

// The on-screen invoice (studio preview + client portal). Renders the frozen
// snapshot from `invoices.snapshot` — same data the PDF is drawn from.
export default function InvoiceView({ invoice, snapshot }) {
  const s = snapshot || invoice?.snapshot || {}
  const t = s.totals || {}
  const billContact = [s.bill_to?.email, s.bill_to?.phone].filter(Boolean)
  return (
    <article className="rounded-2xl bg-surface px-6 py-10 md:px-12 md:py-12 print:px-0">
      <header className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between mb-10">
        <div className="min-w-0">
          <p className="font-heading text-2xl leading-tight text-dark">Arsh Sandhu Allure</p>
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold mt-2">Luxury Bridal Hair & Makeup</p>
          <div className="text-xs text-faint mt-4 leading-relaxed">
            <p>Mississauga · Greater Toronto Area</p>
            <p className="tabular-nums">+1 (437) 221-0004</p>
            <p className="break-words">arshsandhuallure@gmail.com</p>
          </div>
        </div>
        <div className="border-t border-line pt-6 sm:border-0 sm:pt-0 sm:text-right shrink-0">
          <h1 className="font-heading text-3xl leading-none text-dark">Invoice</h1>
          <p className="text-sm text-dark tracking-wide tabular-nums lining-nums mt-2">{invoice?.number || 'Preview'}</p>
          <div className="text-xs text-faint mt-3 leading-relaxed">
            <p>
              Issued <span className="text-dark">{fmtShortDate(invoice?.issued_on || new Date().toLocaleDateString('en-CA'))}</span>
            </p>
            {s.due_on && (
              <p>
                Due <span className="text-dark">{fmtShortDate(s.due_on)}</span>
              </p>
            )}
          </div>
          {invoice?.status === 'void' && (
            <div className="mt-3">
              <StatusChip status="changes_requested" label="Void" />
            </div>
          )}
        </div>
      </header>

      <section className="mb-10">
        <MicroLabel className="mb-2">Billed to</MicroLabel>
        <p className="font-heading text-lg text-dark break-words">{s.bill_to?.name}</p>
        {billContact.length > 0 && (
          <div className="text-xs text-faint mt-1 leading-relaxed">
            {billContact.map((c) => (
              <p key={c} className="break-words">
                {c}
              </p>
            ))}
          </div>
        )}
      </section>

      <section>
        <MicroLabel>Services & fees</MicroLabel>
        <div className="h-px bg-line mt-2 mb-6" />
        <FeeSchedule events={s.events || []} totals={t} showRetainer={false} />
      </section>

      <section className="mt-12">
        <MicroLabel>Payments received</MicroLabel>
        <div className="h-px bg-line mt-2 mb-4" />
        <PaymentsLedger history={s.payments || []} total={t.total} paid={t.paid} outstanding={t.outstanding} />
      </section>

      <div className="mt-10 rounded-2xl bg-btn-dark text-beige px-5 py-5 sm:px-6 flex items-center justify-between gap-x-4 gap-y-2 flex-wrap print:bg-transparent print:text-dark print:rounded-none print:px-0 print:border-y-2 print:border-dark">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold-light print:text-gold">Amount due</p>
          {s.due_on && <p className="text-xs text-[#D9CBB9] mt-1 print:text-faint">by {fmtShortDate(s.due_on)}</p>}
        </div>
        <p className="font-heading text-3xl tabular-nums lining-nums whitespace-nowrap">{money(s.amount_due)}</p>
      </div>

      {s.etransfer_email && Number(s.amount_due) > 0 && (
        <div className={`mt-6 ${callout}`}>
          <MicroLabel className="mb-2">How to pay</MicroLabel>
          <p className="text-sm text-body leading-relaxed">
            Send an Interac e-Transfer to{' '}
            <span className="text-dark font-medium select-all break-words">{s.etransfer_email}</span> with{' '}
            <span className="text-dark font-medium whitespace-nowrap">{invoice?.number || 'your invoice number'}</span> in the message.
          </p>
        </div>
      )}

      {s.note && (
        <p className={`mt-4 text-sm text-body leading-relaxed whitespace-pre-line break-words ${callout}`}>{s.note}</p>
      )}

      <p className="mt-12 text-center font-heading italic text-body leading-relaxed">
        Thank you for letting us be part of your celebration.
      </p>
    </article>
  )
}
