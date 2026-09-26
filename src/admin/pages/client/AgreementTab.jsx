import { Btn, StatusChip, FormSection, InfoRow, MicroLabel, money, softNote, fmtDateTime } from '../../../shared/ui'
import { summarizeBooking } from '../../../shared/booking/pricing.js'
import FeeSchedule from '../../../shared/booking/FeeSchedule'
import EventCards from '../../../shared/booking/EventCards'
import { review } from './review'

export default function AgreementTab({ agreement, events, lines, client, reload }) {
  if (!agreement) {
    const summary = summarizeBooking(events, lines, [])
    return (
      <div>
        <p className={`${softNote} mb-12`}>
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
  const confirmed = agreement.status === 'approved'
  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-10">
        <MicroLabel>Signed agreement · v{agreement.version}</MicroLabel>
        <StatusChip status={confirmed ? 'done' : 'pending'} label={confirmed ? 'Confirmed' : 'Awaiting your confirmation'} />
      </div>

      <FormSection title="Signature record">
        <div className="-mt-2">
          <InfoRow label="Signed by" value={<span className="font-heading italic">{agreement.signed_name}</span>} />
          <InfoRow label="Signed at" value={fmtDateTime(agreement.signed_at)} />
          <InfoRow label="Photo consent" value={agreement.photo_consent === 'agrees' ? 'Agrees' : 'Does not agree'} />
          <InfoRow label="IP address" value={agreement.ip_address || '—'} />
        </div>
      </FormSection>

      <FormSection title="What she agreed to">
        {v2 ? (
          <FeeSchedule events={s.events || []} totals={s.totals || {}} />
        ) : (
          <div className="-mt-2">
            <InfoRow label="Professional services" value={money(s.amount_services)} />
            <InfoRow label="Travel" value={money(s.amount_travel)} />
            <InfoRow label="Total" value={money(s.amount_total)} />
            <InfoRow label="Retainer (30%)" value={money(s.amount_retainer)} />
            <InfoRow label="Balance" value={money(s.amount_balance)} />
          </div>
        )}
      </FormSection>

      {!confirmed && (
        <div className="flex flex-col items-start gap-3">
          <Btn
            onClick={async () => {
              await review('agreement', agreement.id, 'approved')
              reload()
            }}
          >
            Confirm agreement
          </Btn>
          <p className="text-xs text-faint">Her portal then shows it as signed &amp; confirmed.</p>
        </div>
      )}
    </div>
  )
}
