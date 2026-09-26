import { Btn, StatusChip, FormSection, InfoRow, money } from '../../../shared/ui'
import { summarizeBooking } from '../../../shared/booking/pricing.js'
import FeeSchedule from '../../../shared/booking/FeeSchedule'
import EventCards from '../../../shared/booking/EventCards'
import { review } from './review'

export default function AgreementTab({ agreement, events, lines, client, reload }) {
  if (!agreement) {
    const summary = summarizeBooking(events, lines, [])
    return (
      <div>
        <p className="text-sm text-[#A89080] border border-dashed border-[#C8B8AC] p-6 text-center mb-10">
          Not signed yet — she signs in her portal. Below is exactly what she will see.
        </p>
        <FormSection title="Her booking">
          <EventCards events={summary.events} />
        </FormSection>
        <FormSection title="Fee schedule">
          <FeeSchedule
            events={summary.events}
            totals={{ ...summary, total: client.amount_total ?? summary.total, retainer: client.amount_retainer ?? summary.retainer, balance: client.amount_balance ?? summary.balance }}
          />
        </FormSection>
      </div>
    )
  }

  const s = agreement.snapshot || {}
  const v2 = s.schema === 2
  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
        <p className="text-[10px] tracking-[0.35em] uppercase text-gold">Signed agreement · v{agreement.version}</p>
        <StatusChip
          status={agreement.status === 'approved' ? 'done' : 'pending'}
          label={agreement.status === 'approved' ? 'Confirmed' : 'Awaiting your confirmation'}
        />
      </div>

      <FormSection title="Signature record">
        <div>
          <InfoRow label="Signed by" value={<span className="font-heading italic">{agreement.signed_name}</span>} />
          <InfoRow label="Signed at" value={new Date(agreement.signed_at).toLocaleString('en-CA')} />
          <InfoRow label="Photo consent" value={agreement.photo_consent === 'agrees' ? 'Agrees' : 'Does not agree'} />
          <InfoRow label="IP address" value={agreement.ip_address || '—'} />
        </div>
      </FormSection>

      <FormSection title="What she agreed to">
        {v2 ? (
          <FeeSchedule events={s.events || []} totals={s.totals || {}} />
        ) : (
          <div>
            <InfoRow label="Professional services" value={money(s.amount_services)} />
            <InfoRow label="Travel" value={money(s.amount_travel)} />
            <InfoRow label="Total" value={money(s.amount_total)} />
            <InfoRow label="Retainer (30%)" value={money(s.amount_retainer)} />
            <InfoRow label="Balance" value={money(s.amount_balance)} />
          </div>
        )}
      </FormSection>

      {agreement.status !== 'approved' && (
        <Btn
          variant="gold"
          onClick={async () => {
            await review('agreement', agreement.id, 'approved')
            reload()
          }}
        >
          Confirm agreement
        </Btn>
      )}
    </div>
  )
}
