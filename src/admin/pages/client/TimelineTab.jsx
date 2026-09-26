import { useState } from 'react'
import { fmtShortDate, emptyNote } from '../../../shared/ui'
import { sortEvents } from '../../../shared/booking/pricing.js'
import TimelineBuilder from '../../timeline/TimelineBuilder'

export default function TimelineTab({ client, events, lines, members, timelines, docs, reload }) {
  const sorted = sortEvents(events)
  const [activeId, setActiveId] = useState(sorted[0]?.id)
  const event = sorted.find((e) => e.id === activeId) || sorted[0]
  const byEvent = Object.fromEntries(timelines.map((t) => [t.event_id, t]))
  const legacyEntries = docs.find((d) => d.doc_type === 'timeline')?.content?.entries || []

  if (!event) {
    return <p className={emptyNote}>Add an event in the Overview first.</p>
  }

  return (
    <div>
      {sorted.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-12" role="group" aria-label="Choose an event">
          {sorted.map((e) => {
            const t = byEvent[e.id]
            const state = t?.visible ? 'Published' : t ? 'Draft' : 'Not started'
            const active = e.id === event.id
            return (
              <button
                key={e.id}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveId(e.id)}
                className={`text-left rounded-2xl px-4 py-2.5 transition-colors cursor-pointer ${
                  active ? 'bg-dark text-beige' : 'bg-beige-card/70 text-dark hover:bg-[#E3D6C8]'
                }`}
              >
                <span className="block font-heading text-base">{e.name || e.event_type}</span>
                <span className={`flex items-center gap-1.5 text-[11px] mt-0.5 ${active ? 'text-beige/75' : 'text-muted'}`}>
                  {fmtShortDate(e.event_date)} ·
                  {t?.visible && (
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-gold-light' : 'bg-success'}`} aria-hidden="true" />
                  )}
                  {state}
                </span>
              </button>
            )
          })}
        </div>
      )}
      <TimelineBuilder
        key={`${event.id}:${byEvent[event.id]?.updated_at || 'new'}`}
        client={client}
        event={event}
        row={byEvent[event.id]}
        lines={lines}
        members={members}
        legacyEntries={legacyEntries}
        onSaved={reload}
      />
    </div>
  )
}
