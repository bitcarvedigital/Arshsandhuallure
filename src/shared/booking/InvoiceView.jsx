import { money, fmtShortDate, MicroLabel, StatusChip } from '../ui'
import FeeSchedule from './FeeSchedule'
import PaymentsLedger from './PaymentsLedger'

// The on-screen invoice (studio preview + client portal). Renders the frozen
// snapshot from `invoices.snapshot` — same data the PDF is drawn from.
export default function InvoiceView({ invoice, snapshot }) {
  const s = snapshot || invoice?.snapshot || {}
  const t = s.totals || {}
  return (
    <article className="bg-[#FBF8F4] border border-[#E5D9CC] px-6 py-10 md:px-12 md:py-12 print:border-0 print:px-0">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-10">
        <div>
          <p className="font-heading text-2xl text-dark">Arsh Sandhu Allure</p>
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold mt-1">Luxury Bridal Hair & Makeup</p>
          <p className="text-xs text-[#8A7A70] mt-3 leading-relaxed">
            Mississauga · Greater Toronto Area
            <br />
            +1 (437) 221-0004 · arshsandhuallure@gmail.com
          </p>
        </div>
        <div className="text-left sm:text-right">
          <h1 className="font-heading text-3xl text-dark">Invoice</h1>
          <p className="text-sm text-dark mt-1">{invoice?.number || 'Preview'}</p>
          <p className="text-xs text-[#8A7A70] mt-2">Issued {fmtShortDate(invoice?.issued_on || new Date().toISOString())}</p>
          {s.due_on && <p className="text-xs text-[#8A7A70]">Due {fmtShortDate(s.due_on)}</p>}
          {invoice?.status === 'void' && (
            <div className="mt-2">
              <StatusChip status="changes_requested" label="Void" />
            </div>
          )}
        </div>
      </div>

      <div className="mb-10">
        <MicroLabel className="mb-2">Billed to</MicroLabel>
        <p className="text-sm text-dark">{s.bill_to?.name}</p>
        <p className="text-xs text-[#8A7A70]">{[s.bill_to?.email, s.bill_to?.phone].filter(Boolean).join(' · ')}</p>
      </div>

      <MicroLabel className="mb-4">Services & fees</MicroLabel>
      <FeeSchedule events={s.events || []} totals={t} showRetainer={false} />

      <div className="mt-10">
        <MicroLabel className="mb-3">Payments received</MicroLabel>
        <PaymentsLedger history={s.payments || []} total={t.total} paid={t.paid} outstanding={t.outstanding} />
      </div>

      <div className="mt-10 bg-btn-dark text-beige px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold-light">Amount due</p>
          {s.due_on && <p className="text-xs text-[#D9CBB9] mt-1">by {fmtShortDate(s.due_on)}</p>}
        </div>
        <p className="font-heading text-3xl">{money(s.amount_due)}</p>
      </div>

      {s.etransfer_email && Number(s.amount_due) > 0 && (
        <div className="mt-6 text-sm text-[#5A4030] leading-relaxed">
          <MicroLabel className="mb-2">How to pay</MicroLabel>
          Send an Interac e-Transfer to <span className="text-dark font-medium select-all">{s.etransfer_email}</span> with{' '}
          <span className="text-dark font-medium">{invoice?.number || 'your invoice number'}</span> in the message.
        </div>
      )}

      {s.note && (
        <p className="mt-6 text-sm text-[#5A4030] bg-beige-card border-l-2 border-gold px-4 py-3 leading-relaxed whitespace-pre-line">
          {s.note}
        </p>
      )}

      <p className="text-center font-heading italic text-gold mt-12">Thank you for letting us be part of your celebration.</p>
    </article>
  )
}
