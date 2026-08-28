import { useEffect, useState } from 'react'
import { useAuth } from '../AuthProvider'
import { loadPortalBundle } from '../lib/data'
import PortalShell from '../../shared/PortalShell'
import { Spinner, StatusChip, DiamondRule, SectionHeading, MicroLabel, money } from '../../shared/ui'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

function PaymentCard({ title, desc, payment, etransferEmail, locked }) {
  return (
    <div className={`border p-6 ${locked ? 'border-[#DDD2C4]' : 'border-[#C8B8AC] bg-[#FBF8F4]'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <h2 className={`font-heading text-xl ${locked ? 'text-[#A89080]' : 'text-dark'}`}>{title}</h2>
        <StatusChip status={locked ? 'locked' : payment?.status || 'due'} />
      </div>
      <p className="text-sm text-[#7A6355] mb-5">{desc}</p>
      <div className="flex items-baseline gap-3">
        <span className="font-heading text-3xl text-dark">{money(payment?.amount)}</span>
        <span className="text-xs tracking-[0.15em] uppercase text-[#8A7A70]">CAD</span>
      </div>
      {!locked && payment?.status !== 'received' && (
        <div className="mt-5 border-t border-[#EFE6DA] pt-5">
          <MicroLabel className="mb-2">Send by Interac e-Transfer to</MicroLabel>
          <p className="text-dark text-sm font-medium select-all">{etransferEmail || '—'}</p>
          <p className="text-xs text-[#8A7A70] mt-3 leading-relaxed">
            Please use your full name in the transfer message. Once it arrives, Arsh confirms it and this
            step completes automatically — no screenshot needed.
          </p>
        </div>
      )}
      {payment?.status === 'received' && payment?.received_at && (
        <p className="text-xs text-[#8A7A70] mt-4">
          Received {new Date(payment.received_at).toLocaleDateString('en-CA')} — thank you.
        </p>
      )}
    </div>
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

  return (
    <PortalShell title="Payments" nav={NAV} onSignOut={signOut}>
      <SectionHeading eyebrow="Payments" title="Securing your date" className="mb-2" />
      <p className="text-sm text-[#7A6355] max-w-lg">
        Your non-refundable retainer confirms your booking; the balance is due before your event day.
      </p>
      <DiamondRule className="my-8" />
      {!bundle ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-5">
          <PaymentCard
            title="Retainer — 30%"
            desc={signed ? 'Secures your date. Applied toward your final balance.' : 'Unlocks once your agreement is signed.'}
            payment={retainer}
            etransferEmail={bundle.etransferEmail}
            locked={!signed}
          />
          <PaymentCard
            title="Final balance"
            desc="Due in full on or before your event day, prior to services."
            payment={final}
            etransferEmail={bundle.etransferEmail}
            locked={!signed || retainer?.status !== 'received'}
          />
        </div>
      )}
    </PortalShell>
  )
}
