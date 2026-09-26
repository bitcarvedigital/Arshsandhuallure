import { InfoRow, fmtShortDate, fmtTime } from '../ui'

export function eventTitle(e) {
  const name = (e.name || e.event_type || 'Event').trim()
  return name
}

// Read-only per-event details (agreement, client dashboard, admin previews).
// `events` are summary events (pricing.eventSummary) or snapshot events.
export default function EventCards({ events = [], showCounts = true }) {
  if (!events.length) {
    return <p className="text-sm text-[#A89080]">Event details coming soon.</p>
  }
  return (
    <div className="flex flex-col gap-8">
      {events.map((e, i) => {
        const hair = e.hairCount ?? e.hair_count ?? 0
        const makeup = e.makeupCount ?? e.makeup_count ?? 0
        return (
          <div key={e.id || i}>
            <div className="flex items-baseline justify-between gap-3 flex-wrap border-b border-[#E0D2C2] pb-2 mb-1">
              <h3 className="font-heading text-lg text-dark">{eventTitle(e)}</h3>
              <span className="text-[11px] tracking-[0.15em] uppercase text-gold">{fmtShortDate(e.event_date)}</span>
            </div>
            {e.start_time && <InfoRow label="Artist arrives" value={fmtTime(e.start_time)} />}
            {e.ready_time && <InfoRow label="Ready by" value={fmtTime(e.ready_time)} />}
            {e.address && <InfoRow label="Getting-ready location" value={e.address} />}
            {e.party_size != null && e.party_size !== '' && <InfoRow label="People being styled" value={e.party_size} />}
            {showCounts && (hair > 0 || makeup > 0) && (
              <InfoRow
                label="Services booked"
                value={[hair ? `Hair × ${hair}` : null, makeup ? `Makeup × ${makeup}` : null].filter(Boolean).join(' · ')}
              />
            )}
            {e.client_note && (
              <p className="text-sm text-[#5A4030] bg-beige-card border-l-2 border-gold px-4 py-3 mt-3 leading-relaxed">
                {e.client_note}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
