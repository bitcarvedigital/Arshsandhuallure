import { fmtShortDate, fmtTime, softNote } from '../ui'

export function eventTitle(e) {
  const name = (e.name || e.event_type || 'Event').trim()
  return name
}

// Event name + date. On a phone the date sits under the name (never a ragged
// wrap); from `sm:` up they share one line. Shared with FeeSchedule.
export function EventHeading({ event, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 ${className}`}>
      <h3 className="font-heading text-lg leading-snug text-dark break-words min-w-0">{eventTitle(event)}</h3>
      <span className="text-[10px] tracking-[0.2em] uppercase text-gold whitespace-nowrap">{fmtShortDate(event.event_date)}</span>
    </div>
  )
}

// A detail row. Short values sit to the right of their label; `stack` rows
// (addresses) put the value under the label on a phone so it reads as a line
// of text instead of a narrow right-aligned column.
function DetailRow({ label, value, stack = false }) {
  return (
    <div
      className={`py-2.5 border-b border-line text-sm ${
        stack
          ? 'flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6'
          : 'flex items-baseline justify-between gap-6'
      }`}
    >
      <span className="text-muted min-w-0">{label}</span>
      <span
        className={`text-dark break-words min-w-0 ${
          stack ? 'sm:max-w-[60%] sm:text-right' : 'max-w-[60%] text-right'
        }`}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}

// Read-only per-event details (agreement, client dashboard, admin previews).
// `events` are summary events (pricing.eventSummary) or snapshot events.
export default function EventCards({ events = [], showCounts = true }) {
  if (!events.length) {
    return <p className="text-sm text-faint">Event details coming soon.</p>
  }
  return (
    <div className="flex flex-col gap-10">
      {events.map((e, i) => {
        const hair = e.hairCount ?? e.hair_count ?? 0
        const makeup = e.makeupCount ?? e.makeup_count ?? 0
        return (
          <div key={e.id || i}>
            <EventHeading event={e} className="border-b border-line pb-2.5" />
            {e.start_time && <DetailRow label="Artist arrives" value={fmtTime(e.start_time)} />}
            {e.ready_time && <DetailRow label="Ready by" value={fmtTime(e.ready_time)} />}
            {e.address && <DetailRow label="Getting-ready location" value={e.address} stack />}
            {e.party_size != null && e.party_size !== '' && <DetailRow label="People being styled" value={e.party_size} />}
            {showCounts && (hair > 0 || makeup > 0) && (
              <DetailRow
                label="Services booked"
                value={[hair ? `Hair × ${hair}` : null, makeup ? `Makeup × ${makeup}` : null].filter(Boolean).join(' · ')}
              />
            )}
            {e.client_note && (
              <p className={`${softNote} mt-4 leading-relaxed whitespace-pre-line break-words print:bg-transparent print:border print:border-line`}>
                {e.client_note}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
