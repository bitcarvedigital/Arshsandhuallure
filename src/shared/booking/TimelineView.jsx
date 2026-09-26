import { useEffect, useMemo, useState } from 'react'
import { Btn, MicroLabel, fmtShortDate, fmtTime } from '../ui'
import { layoutTimeline, normalizeTimeline, formatMinutes } from './timeline.js'
import { brickClasses, SERVICE_SHORT, LEGEND } from './brickStyles.js'
import { eventTitle } from './EventCards'

const PX_PER_MIN = 1.4

export function Legend({ className = '' }) {
  return (
    <div className={`flex flex-wrap gap-x-5 gap-y-2 ${className}`}>
      {LEGEND.map((l) => (
        <span key={l.key} className="flex items-center gap-2 text-[11px] text-[#7A6355]">
          <span className={`inline-block w-5 h-3.5 ${l.swatch}`} />
          {l.label}
        </span>
      ))}
    </div>
  )
}

function BrickFace({ brick, start, end, compact }) {
  const cls = brickClasses(brick)
  const dark = brick.vip || brick.bride
  return (
    <div className={`relative h-full overflow-hidden ${cls.box}`}>
      {cls.stripe && <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${cls.stripe}`} />}
      <div className={`h-full ${cls.stripe ? 'pl-3.5' : 'pl-2.5'} pr-2 py-1.5 flex flex-col justify-start min-w-0`}>
        <p className={`text-[10px] tracking-[0.12em] uppercase ${dark ? 'text-gold-light' : 'opacity-75'}`}>
          {formatMinutes(start)} – {formatMinutes(end)}
        </p>
        <p className="text-sm leading-tight truncate font-medium flex items-center gap-1.5">
          {dark && <span className="w-1.5 h-1.5 border border-gold-light rotate-45 shrink-0" aria-hidden="true" />}
          {brick.kind === 'gap' ? brick.name || 'Break' : brick.name || 'Guest'}
        </p>
        {!compact && brick.kind !== 'gap' && (
          <p className={`text-[11px] leading-tight truncate ${dark ? 'text-[#D9CBB9]' : 'opacity-80'}`}>
            {[brick.relation, brick.side === 'groom' ? "Groom's side" : null, SERVICE_SHORT[brick.service]].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>
  )
}

// Calendar grid: artists side by side on one shared time axis (md and up).
export function TimelineGrid({ content, pxPerMin = PX_PER_MIN }) {
  const layout = useMemo(() => layoutTimeline(content), [content])
  if (layout.start == null) return null
  const start = Math.floor(layout.start / 30) * 30
  const end = Math.ceil(Math.max(layout.end, layout.readyBy ?? layout.end) / 30) * 30
  const height = (end - start) * pxPerMin
  const ticks = []
  for (let t = start; t <= end; t += 30) ticks.push(t)
  return (
    <div className="flex gap-2">
      <div className="relative w-16 shrink-0" style={{ height: height + 28 }}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-2 text-[10px] text-[#8A7A70] -translate-y-1/2" style={{ top: 28 + (t - start) * pxPerMin }}>
            {formatMinutes(t)}
          </span>
        ))}
      </div>
      <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${layout.columns.length}, minmax(0, 1fr))` }}>
        {layout.columns.map((col) => (
          <div key={col.id}>
            <p className="h-7 text-[11px] tracking-[0.2em] uppercase text-dark text-center truncate">{col.name}</p>
            <div className="relative bg-[#F6F0E8]" style={{ height }}>
              {ticks.map((t) => (
                <span key={t} className="absolute left-0 right-0 border-t border-[#EDE3D6]" style={{ top: (t - start) * pxPerMin }} />
              ))}
              {layout.readyBy != null && (
                <span className="absolute left-0 right-0 border-t-2 border-gold z-10" style={{ top: (layout.readyBy - start) * pxPerMin }} />
              )}
              {col.items.map((it) => (
                <div
                  key={it.brick.id}
                  className="absolute left-1 right-1"
                  style={{ top: (it.start - start) * pxPerMin + 1, height: Math.max(26, (it.end - it.start) * pxPerMin - 2) }}
                >
                  <BrickFace brick={it.brick} start={it.start} end={it.end} compact={(it.end - it.start) * pxPerMin < 46} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Phone view: one list per artist.
function TimelineList({ content }) {
  const layout = useMemo(() => layoutTimeline(content), [content])
  return (
    <div className="flex flex-col gap-8">
      {layout.columns
        .filter((c) => c.items.length)
        .map((col) => (
          <section key={col.id}>
            <h3 className="font-heading text-lg text-dark border-b border-[#E0D2C2] pb-2 mb-3">{col.name}</h3>
            <div className="flex flex-col gap-2">
              {col.items.map((it) => (
                <div key={it.brick.id} className="min-h-[58px]">
                  <BrickFace brick={it.brick} start={it.start} end={it.end} />
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  )
}

function LegacyTimeline({ doc, fileUrl }) {
  const entries = doc?.content?.entries || []
  const artists = [...new Set(entries.map((e) => e.artist).filter(Boolean))]
  if (!entries.length) {
    return fileUrl ? (
      <div className="text-center mb-10">
        <a href={fileUrl} target="_blank" rel="noreferrer">
          <Btn variant="gold">Open your timeline (PDF)</Btn>
        </a>
      </div>
    ) : (
      <p className="text-sm text-[#A89080] text-center mb-10">Your timeline is being crafted.</p>
    )
  }
  return (
    <div className="mb-10">
      {artists.map((artist) => (
        <section key={artist} className="mb-8">
          <h2 className="font-heading text-lg text-dark border-b border-[#E0D2C2] pb-2 mb-3">{artist}</h2>
          <ul>
            {entries
              .filter((e) => e.artist === artist)
              .map((e, i) => (
                <li key={i} className="flex gap-4 py-2.5 border-b border-[#EFE6DA] last:border-0 text-sm">
                  <span className="text-gold w-28 shrink-0 whitespace-nowrap">{e.time}</span>
                  <span className="text-dark flex-1">{e.person}</span>
                  <span className="text-[#8A7A70] uppercase tracking-[0.15em] text-[10px] self-center">{e.service}</span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Notes({ notes }) {
  if (!notes?.length) return null
  return (
    <aside className="border-l-2 border-gold bg-beige-card px-6 py-5 my-10">
      <h3 className="font-heading italic text-gold text-lg mb-3">Notes for a smooth morning</h3>
      <ul className="flex flex-col gap-2">
        {notes.map((n, i) => (
          <li key={i} className="text-sm leading-relaxed text-[#5A4030] flex gap-2">
            <span>—</span> {n}
          </li>
        ))}
      </ul>
    </aside>
  )
}

// events: the client's events (sorted); timelines: { [event_id]: content } —
// only published ones for the client, drafts for an admin preview.
// legacy: the old client_documents timeline row (content.entries / file_path).
export default function TimelineView({ clientName, events = [], timelines = {}, legacy, resolveUrl }) {
  const withTimeline = events.filter((e) => timelines[e.id])
  const [active, setActive] = useState(withTimeline[0]?.id)
  const [fileUrl, setFileUrl] = useState('')
  useEffect(() => {
    if (!withTimeline.length && legacy?.file_path && resolveUrl) resolveUrl(legacy.file_path).then(setFileUrl)
  }, [legacy, resolveUrl, withTimeline.length])

  const event = withTimeline.find((e) => e.id === active) || withTimeline[0]
  const content = event ? normalizeTimeline(timelines[event.id], event) : null
  const readyLabel = event?.ready_time ? ` · Ready by ${fmtTime(event.ready_time)}` : ''

  return (
    <article className="bg-[#FBF8F4] border border-[#E5D9CC] px-5 py-10 md:px-10 md:py-12 print:border-0 print:px-0">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="w-8 h-px bg-gold" />
          <MicroLabel>Getting-Ready Timeline</MicroLabel>
          <span className="w-8 h-px bg-gold" />
        </div>
        <h1 className="font-heading italic text-3xl md:text-4xl text-dark">{clientName}</h1>
        {event && (
          <p className="text-sm text-[#8A7A70] mt-3">
            {eventTitle(event)} · {fmtShortDate(event.event_date)}
            {readyLabel}
          </p>
        )}
      </div>

      {withTimeline.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8 print:hidden">
          {withTimeline.map((e) => (
            <button
              key={e.id}
              onClick={() => setActive(e.id)}
              className={`px-4 py-2 text-[11px] tracking-[0.2em] uppercase border transition-colors cursor-pointer ${
                event?.id === e.id ? 'border-gold bg-gold text-beige' : 'border-[#A89080] text-dark hover:border-gold'
              }`}
            >
              {eventTitle(e)}
            </button>
          ))}
        </div>
      )}

      {content ? (
        <>
          <Legend className="justify-center mb-8" />
          <div className="hidden md:block">
            <TimelineGrid content={content} />
          </div>
          <div className="md:hidden">
            <TimelineList content={content} />
          </div>
          <Notes notes={content.notes} />
        </>
      ) : (
        <>
          <LegacyTimeline doc={legacy} fileUrl={fileUrl} />
          <Notes notes={legacy?.content?.notes} />
        </>
      )}

      <div className="text-center border-t border-[#E0D2C2] pt-8 mt-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-dark">Arsh Sandhu Allure</p>
        <p className="text-[10px] text-[#8A7A70] mt-2 tracking-wider">
          +1 (437) 221-0004 · arshsandhuallure@gmail.com · @arshsandhuallure
        </p>
      </div>
      {(content || legacy?.content?.entries?.length > 0) && (
        <div className="mt-8 text-center print:hidden">
          <Btn variant="outline" onClick={() => window.print()}>
            Print / Save as PDF
          </Btn>
        </div>
      )}
    </article>
  )
}
