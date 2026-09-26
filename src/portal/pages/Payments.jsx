import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthProvider'
import { loadPortalBundle } from '../lib/data'
import PortalShell from '../../shared/PortalShell'
import { Spinner, StatusChip, DiamondRule, SectionHeading, MicroLabel, FormSection, money, fmtShortDate } from '../../shared/ui'
import { summarizeBooking, paymentHistory, RETAINER_PERCENT } from '../../shared/booking/pricing.js'
import PaymentsLedger from '../../shared/booking/PaymentsLedger'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

function PaymentCard({ title, desc, payment, etransferEmail, locked }) {
  return (
    <FormSection title={title} action={<StatusChip status={locked ? 'locked' : payment?.status || 'due'} />}>
      <p className={`text-sm ${locked ? 'text-[#A89080]' : 'text-[#7A6355]'}`}>{desc}</p>
      <div className="flex items-baseline gap-3">
        <span className={`font-heading text-3xl ${locked ? 'text-[#A89080]' : 'text-dark'}`}>{money(payment?.amount)}</span>
        <span className="text-xs tracking-[0.15em] uppercase text-[#8A7A70]">CAD</span>
      </div>
      {!locked && payment?.status !== 'received' && (
        <div className="border-t border-[#EFE6DA] pt-5">
          <MicroLabel className="mb-2">Send by Interac e-Transfer to</MicroLabel>
          <p className="text-dark text-sm font-medium select-all">{etransferEmail || '—'}</p>
          <p className="text-xs text-[#8A7A70] mt-3 leading-relaxed">
            Please use your full name in the transfer message. Once it arrives, Arsh confirms it and this step
            completes automatically — no screenshot needed.
          </p>
        </div>
      )}
      {payment?.status === 'received' && payment?.received_at && (
        <p className="text-xs text-[#8A7A70]">Received {fmtShortDate(payment.received_at)} — thank you.</p>
      )}
    </FormSection>
  )
}

export default function Payments() {
  const { signOut } = useAuth()
  const [bundle, setBundle] = useState(null)

  useEffect(() => {
    loadPortalBundle().then(setBundle)
  }, [])

  const retainer = bundle?.payments.find((p) => p.kind === 'retainer')
  const final = bundle?.payments.find((p) => p.kind === 'final')
  const signed = !!bundle?.agreement
  const summary = bundle ? summarizeBooking(bundle.events, bundle.lines, bundle.payments) : null
  const history = bundle ? paymentHistory(bundle.payments, bundle.events) : []

  return (
    <PortalShell title="Payments" nav={NAV} onSignOut={signOut}>
      <SectionHeading eyebrow="Payments" title="Securing your date" className="mb-2" />
      <p className="text-sm text-[#7A6355] max-w-lg">
        Your non-refundable retainer confirms your booking; the balance is due on or before your event.
      </p>
      <DiamondRule className="my-8" />
      {!bundle ? (
        <Spinner />
      ) : (
        <div>
          <FormSection title="Summary">
            <div className="grid grid-cols-3 gap-4">
              {[
                ['Total booking', summary.total],
                ['Paid so far', summary.paid],
                ['Still to pay', summary.outstanding],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#8A7A70]">{l}</p>
                  <p className="font-heading text-xl text-dark mt-1">{money(v)}</p>
                </div>
              ))}
            </div>
            <Link to="/portal/agreement" className="text-[10px] tracking-[0.2em] uppercase text-gold hover:underline self-start">
              See the full price breakdown →
            </Link>
          </FormSection>

          <PaymentCard
            title={`Retainer — ${RETAINER_PERCENT}%`}
            desc={signed ? 'Secures every date in your booking. Applied toward your final balance.' : 'Unlocks once your agreement is signed.'}
            payment={retainer}
            etransferEmail={bundle.etransferEmail}
            locked={!signed}
          />
          <PaymentCard
            title="Final balance"
            desc="Whatever is left after your retainer and any other payments — due on or before your event."
            payment={final}
            etransferEmail={bundle.etransferEmail}
            locked={!signed || retainer?.status !== 'received'}
          />

          <FormSection title="Payment history">
            <PaymentsLedger history={history} emptyText="No payments received yet." />
          </FormSection>

          <FormSection title="Invoices">
            {bundle.invoices.length === 0 ? (
              <p className="text-sm text-[#A89080]">No invoices yet — they appear here when Arsh sends one.</p>
            ) : (
              bundle.invoices.map((inv) => (
                <Link key={inv.id} to={`/portal/invoice/${inv.id}`} className="flex items-center justify-between gap-3 border-b border-[#EFE6DA] pb-3 hover:text-gold">
                  <span className="text-sm text-dark">
                    {inv.number} <span className="text-[#8A7A70]">· issued {fmtShortDate(inv.issued_on)}</span>
                  </span>
                  <span className="text-sm">{money(inv.snapshot?.amount_due)}</span>
                </Link>
              ))
            )}
          </FormSection>
        </div>
      )}
    </PortalShell>
  )
}
