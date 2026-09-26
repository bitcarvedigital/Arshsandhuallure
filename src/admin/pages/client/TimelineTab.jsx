import { useState } from 'react'
import { fmtShortDate } from '../../../shared/ui'
import { sortEvents } from '../../../shared/booking/pricing.js'
import TimelineBuilder from '../../timeline/TimelineBuilder'

export default function TimelineTab({ client, events, lines, members, timelines, docs, reload }) {
  const sorted = sortEvents(events)
  const [activeId, setActiveId] = useState(sorted[0]?.id)
  const event = sorted.find((e) => e.id === activeId) || sorted[0]
  const byEvent = Object.fromEntries(timelines.map((t) => [t.event_id, t]))
  const legacyEntries = docs.find((d) => d.doc_type === 'timeline')?.content?.entries || []

  if (!event) {
    return <p className="text-sm text-[#A89080] border border-dashed border-[#C8B8AC] p-8 text-center">Add an event in the Overview first.</p>
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-10">
        {sorted.map((e) => {
          const t = byEvent[e.id]
          const state = t?.visible ? 'Published' : t ? 'Draft' : 'Not started'
          return (
            <button
              key={e.id}
              onClick={() => setActiveId(e.id)}
              className={`text-left px-4 py-2.5 border transition-colors cursor-pointer ${
                e.id === event.id ? 'border-gold bg-[#FBF8F4]' : 'border-[#C8B8AC] hover:border-gold'
              }`}
            >
              <span className="block font-heading text-base text-dark">{e.name || e.event_type}</span>
              <span className="block text-[10px] tracking-[0.15em] uppercase text-[#8A7A70]">
                {fmtShortDate(e.event_date)} · <span className={t?.visible ? 'text-[#4a6741]' : ''}>{state}</span>
              </span>
            </button>
          )
        })}
      </div>
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
