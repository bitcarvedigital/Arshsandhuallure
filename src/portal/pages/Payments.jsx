import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthProvider'
import { loadPortalBundle } from '../lib/data'
import PortalShell from '../../shared/PortalShell'
import { Spinner, StatusChip, MicroLabel, FormSection, money, fmtShortDate, softPanel, metaLabelClass, rowLine, rowLink } from '../../shared/ui'
import { summarizeBooking, paymentHistory, RETAINER_PERCENT } from '../../shared/booking/pricing.js'
import PaymentsLedger from '../../shared/booking/PaymentsLedger'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

function PaymentCard({ title, desc, payment, etransferEmail, locked }) {
  const received = payment?.status === 'received'
  return (
    <FormSection title={title} action={<StatusChip status={locked ? 'locked' : payment?.status || 'due'} />}>
      <p className={`text-sm leading-relaxed ${locked ? 'text-faint' : 'text-muted'}`}>{desc}</p>
      <div className="flex items-baseline gap-3">
        <span className={`font-heading text-3xl ${locked ? 'text-faint' : 'text-dark'}`}>{money(payment?.amount)}</span>
        <span className="text-xs tracking-[0.15em] uppercase text-faint">CAD</span>
      </div>
      {!locked && !received && (
        <div className={`${softPanel} px-5 py-5`}>
          <MicroLabel className="mb-2">Send by Interac e-Transfer to</MicroLabel>
          <p className="text-dark text-[15px] font-medium select-all break-words">{etransferEmail || '—'}</p>
          <p className="text-xs text-faint mt-3 leading-relaxed">
            Please use your full name in the transfer message. Once it arrives, Arsh confirms it and this step
            completes automatically — no screenshot needed.
          </p>
        </div>
      )}
      {received && payment?.received_at && (
        <p className="text-sm text-muted">Received {fmtShortDate(payment.received_at)} — thank you.</p>
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
      <MicroLabel className="mb-2">Payments</MicroLabel>
      <h1 className="font-heading text-3xl text-dark">Securing your date</h1>
      <p className="text-sm text-muted max-w-lg mt-2">
        Your non-refundable retainer confirms your booking; the balance is due on or before your event.
      </p>
      {!bundle ? (
        <Spinner />
      ) : (
        <div className="mt-10">
          {/* short labels keep all three figures on one line; ~100px a column at 390px fits "$12,345.00" */}
          <section aria-label="Payment summary" className={`${softPanel} px-4 pt-6 pb-3 sm:px-8 mb-12`}>
            <dl className="grid grid-cols-3 gap-2 sm:gap-6">
              {[
                ['Total', summary.total],
                ['Paid', summary.paid],
                ['To pay', summary.outstanding],
              ].map(([l, v]) => (
                <div key={l} className="min-w-0">
                  <dt className={`${metaLabelClass} whitespace-nowrap`}>{l}</dt>
                  <dd className="font-heading text-lg sm:text-2xl text-dark mt-1.5 whitespace-nowrap">{money(v)}</dd>
                </div>
              ))}
            </dl>
            <Link
              to="/portal/agreement"
              className="inline-block mt-3 py-3 text-[11px] tracking-[0.2em] uppercase text-gold hover:underline"
            >
              See the full price breakdown →
            </Link>
          </section>

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
              <p className="text-sm text-faint">No invoices yet — they’ll appear here when Arsh sends one.</p>
            ) : (
              <div>
                {bundle.invoices.map((inv) => (
                  <div key={inv.id} className={rowLine}>
                    <Link to={`/portal/invoice/${inv.id}`} className={rowLink}>
                      <span className="min-w-0">
                        <span className="block text-sm text-dark">{inv.number}</span>
                        <span className="block text-xs text-faint mt-0.5">Issued {fmtShortDate(inv.issued_on)}</span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-sm text-dark">
                        {money(inv.snapshot?.amount_due)}
                        <span className="text-gold ml-2" aria-hidden="true">→</span>
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </FormSection>
        </div>
      )}
    </PortalShell>
  )
}
