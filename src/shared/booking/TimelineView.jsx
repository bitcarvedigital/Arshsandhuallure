import { useEffect, useMemo, useState } from 'react'
import { Btn, MicroLabel, btnClass, emptyNote, fmtShortDate } from '../ui'
import { ContactLine } from '../GuidePage'
import { layoutTimeline, normalizeTimeline, formatMinutes, parseTime } from './timeline.js'
import { brickClasses, SERVICE_SHORT, LEGEND } from './brickStyles.js'
import { sideLabel } from './services.js'
import { eventTitle } from './EventCards'

const PX_PER_MIN = 1.4

// the brick colours carry meaning (see the legend), so let them print
const printColors = 'print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]'

// The "important" mark — a solid gold star next to the name, big enough to
// spot at a glance on both the sage and blush bricks.
export function StarMark({ className = '' }) {
  return (
    <span role="img" aria-label="Important person" title="Important person" className={`text-[22px] leading-none text-gold shrink-0 ${className}`}>
      ★
    </span>
  )
}

// on a brick: pinned to the right edge, centred from top to bottom
export function BrickStar() {
  return <StarMark className="absolute right-2.5 top-1/2 -translate-y-1/2 drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]" />
}

// Phone: a tidy two-column key. From `sm:` up: one wrapping row.
export function Legend({ className = '' }) {
  return (
    <div className={`grid grid-cols-[auto_auto] gap-x-6 gap-y-2.5 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-2 ${printColors} ${className}`}>
      {LEGEND.map((l) => (
        <span key={l.key} className="flex items-center gap-2 text-xs text-muted whitespace-nowrap">
          {l.star ? (
            <span className="inline-flex w-5 justify-center" aria-hidden="true"><StarMark className="!text-[18px]" /></span>
          ) : (
            <span className={`inline-block w-5 h-3.5 shrink-0 rounded-[3px] ${l.swatch}`} aria-hidden="true" />
          )}
          {l.label}
        </span>
      ))}
    </div>
  )
}

function BrickFace({ brick, start, end, compact }) {
  const cls = brickClasses(brick)
  const star = brick.kind !== 'gap' && (brick.vip || brick.bride)
  return (
    <div className={`relative h-full overflow-hidden rounded-lg ${cls.box}`}>
      {cls.stripe && <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${cls.stripe}`} aria-hidden="true" />}
      {star && <BrickStar />}
      <div className={`h-full ${cls.stripe ? 'pl-3.5' : 'pl-2.5'} ${star ? 'pr-10' : 'pr-2'} py-1.5 flex flex-col justify-start min-w-0`}>
        <p className="text-[10px] tracking-[0.12em] uppercase tabular-nums lining-nums opacity-75">
          {formatMinutes(start)} – {formatMinutes(end)}
        </p>
        <p className="text-sm leading-tight font-medium flex items-center gap-1.5 min-w-0">
          <span className="truncate min-w-0">{brick.kind === 'gap' ? brick.name || 'Break' : brick.name || 'Guest'}</span>
        </p>
        {!compact && brick.kind !== 'gap' && (
          <p className="text-[11px] leading-tight truncate mt-0.5 opacity-80">
            {[brick.relation, sideLabel(brick), SERVICE_SHORT[brick.service]].filter(Boolean).join(' · ')}
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
    <div className={`flex gap-2 ${printColors}`}>
      <div className="relative w-16 shrink-0" style={{ height: height + 28 }}>
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute right-2 text-[11px] text-faint whitespace-nowrap tabular-nums lining-nums -translate-y-1/2"
            style={{ top: 28 + (t - start) * pxPerMin }}
          >
            {formatMinutes(t)}
          </span>
        ))}
      </div>
      <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${layout.columns.length}, minmax(0, 1fr))` }}>
        {layout.columns.map((col) => (
          <div key={col.id}>
            <p className="h-7 text-[11px] tracking-[0.2em] uppercase text-dark text-center truncate">{col.name}</p>
            <div className="relative rounded-xl bg-soft/50" style={{ height }}>
              {ticks.map((t) => (
                <span key={t} className="absolute left-0 right-0 border-t border-line/70" style={{ top: (t - start) * pxPerMin }} />
              ))}
              {layout.readyBy != null && (
                <span className="absolute left-0 right-0 border-t-2 border-gold z-10" style={{ top: (layout.readyBy - start) * pxPerMin }} />
              )}
              {/* the minutes kept free before the ready time are for touch-ups — say so */}
              {layout.readyBy != null && Number(content.buffer) >= 15 && (
                <span
                  className="absolute left-0 right-0 flex items-center justify-center text-[11px] tracking-[0.15em] uppercase text-faint"
                  style={{ top: (layout.readyBy - Number(content.buffer) - start) * pxPerMin, height: Number(content.buffer) * pxPerMin }}
                >
                  Touch-ups
                </span>
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
    <div className={`flex flex-col gap-10 ${printColors}`}>
      {layout.columns
        .filter((c) => c.items.length)
        .map((col) => (
          <section key={col.id}>
            <h3 className="font-heading text-lg leading-snug text-dark border-b border-line pb-2 mb-3 break-words">{col.name}</h3>
            <div className="flex flex-col gap-2">
              {col.items.map((it) => (
                <div key={it.brick.id} className="min-h-[58px] break-inside-avoid">
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
        <a href={fileUrl} target="_blank" rel="noreferrer" className={btnClass('gold')}>
          Open your timeline (PDF)
        </a>
      </div>
    ) : (
      <p className={`${emptyNote} mb-10`}>Your timeline is being crafted.</p>
    )
  }
  return (
    <div className="mb-10">
      {artists.map((artist) => (
        <section key={artist} className="mb-10 last:mb-0">
          <h2 className="font-heading text-lg leading-snug text-dark border-b border-line pb-2 mb-1 break-words">{artist}</h2>
          <ul>
            {entries
              .filter((e) => e.artist === artist)
              .map((e, i) => (
                <li key={i} className="flex items-baseline gap-4 py-3 border-b border-line last:border-0 text-sm">
                  <span className="w-24 sm:w-32 shrink-0 text-muted tabular-nums lining-nums">{e.time}</span>
                  <span className="text-dark flex-1 min-w-0 break-words">{e.person}</span>
                  {e.service && (
                    <span className="shrink-0 text-faint uppercase tracking-[0.15em] text-[10px]">{e.service}</span>
                  )}
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
    <aside className="rounded-xl bg-soft/70 px-5 py-5 sm:px-6 my-10 print:bg-transparent print:border print:border-line">
      <h3 className="font-heading italic text-dark text-lg leading-snug mb-3">Notes for a smooth morning</h3>
      <ul className="flex flex-col gap-2.5">
        {notes.map((n, i) => (
          <li key={i} className="text-sm leading-relaxed text-body flex gap-3">
            <span className="w-1 h-1 mt-[9px] rounded-full bg-muted/50 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{n}</span>
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
  // same "6:30 AM" style as the bricks, so the page reads as one document
  const readyBy = event?.ready_time ? formatMinutes(parseTime(event.ready_time)) : null

  return (
    <article className="rounded-2xl bg-surface px-5 py-10 md:px-10 md:py-12 print:px-0">
      <header className="text-center mb-10">
        <MicroLabel className="mb-4">Getting-Ready Timeline</MicroLabel>
        <h1 className="font-heading italic text-3xl md:text-4xl leading-tight text-dark break-words">{clientName}</h1>
        {event && (
          <>
            <p className="text-sm text-muted mt-3">
              {eventTitle(event)} · {fmtShortDate(event.event_date)}
            </p>
            {readyBy && (
              <p className="mt-2 text-[10px] tracking-[0.25em] uppercase text-gold tabular-nums lining-nums">Ready by {readyBy}</p>
            )}
          </>
        )}
      </header>

      {withTimeline.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mb-10 print:hidden" role="group" aria-label="Choose an event">
          {withTimeline.map((e) => {
            const on = event?.id === e.id
            return (
              <button
                key={e.id}
                type="button"
                aria-pressed={on}
                onClick={() => setActive(e.id)}
                className={`rounded-full px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase transition-colors duration-200 cursor-pointer ${
                  on ? 'bg-dark text-beige' : 'bg-beige-card/70 text-dark hover:bg-beige-card'
                }`}
              >
                {eventTitle(e)}
              </button>
            )
          })}
        </div>
      )}

      {content ? (
        <>
          <Legend className="justify-center mb-10" />
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

      <footer className="text-center border-t border-line pt-8 mt-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-dark">Arsh Sandhu Allure</p>
        <ContactLine items={['+1 (437) 221-0004', 'arshsandhuallure@gmail.com', '@arshsandhuallure']} />
      </footer>
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
