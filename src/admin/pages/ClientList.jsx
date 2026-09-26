import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { AdminShell } from '../AdminShell'
import { PageHeader } from '../adminUi'
import { Spinner, StatusChip, Pill, Chevron, btnClass, emptyNote, rowLine, rowLink } from '../../shared/ui'

const DIFF_DOT = { easy: 'bg-[#7a9070]', medium: 'bg-[#c9a25e]', hard: 'bg-[#a45a48]' }
const DIFF_LABEL = { easy: 'Easy client', medium: 'Medium client', hard: 'Hard client' }

const today = () => new Date().toLocaleDateString('en-CA')
// "Sep 25" this year, "Sep 25, 2027" otherwise — short enough for a pill, never ambiguous
const short = (d) => {
  const dt = new Date(`${d}T00:00:00`)
  const sameYear = dt.getFullYear() === new Date().getFullYear()
  return dt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}

// next upcoming event date, else the last one; and the last date overall
function eventDates(client) {
  const dates = (client.events || []).map((e) => e.event_date).filter(Boolean).sort()
  if (!dates.length && client.event_date) dates.push(client.event_date)
  const t = today()
  return { next: dates.find((d) => d >= t) || null, last: dates[dates.length - 1] || null }
}

function ClientCard({ client }) {
  const notes = Array.isArray(client.admin_notes) ? client.admin_notes[0] : client.admin_notes
  const { next } = eventDates(client)
  const days = next != null ? Math.round((new Date(`${next}T00:00:00`) - new Date(`${today()}T00:00:00`)) / 86400000) : null
  const events = [...(client.events || [])].sort((a, b) => String(a.event_date || '9999').localeCompare(String(b.event_date || '9999')))
  const archived = client.status === 'archived'
  return (
    <div className={rowLine}>
      <Link to={`/admin/clients/${client.id}`} className={rowLink}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            {notes?.difficulty && (
              <span
                role="img"
                aria-label={DIFF_LABEL[notes.difficulty]}
                title={DIFF_LABEL[notes.difficulty]}
                className={`w-2 h-2 rounded-full shrink-0 ${DIFF_DOT[notes.difficulty]}`}
              />
            )}
            <h3 className="font-heading text-xl text-dark truncate">{client.full_name}</h3>
          </div>
          {events.length ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {events.map((e, i) => (
                <Pill key={i} className="!px-2.5 !py-0.5">
                  {e.name || e.event_type}{e.event_date ? ` · ${short(e.event_date)}` : ''}
                </Pill>
              ))}
            </div>
          ) : (
            <p className="text-xs text-faint mt-1.5">No event details yet</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {archived && <StatusChip status="locked" label="Archived" />}
          {client.status === 'invited' && <StatusChip status="draft" label="Invite pending" />}
          {days != null && days >= 0 && !archived && (
            <span className="text-sm text-dark whitespace-nowrap">
              {days === 0 ? 'Today' : `in ${days} day${days === 1 ? '' : 's'}`}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}

export default function ClientList() {
  const [clients, setClients] = useState(null)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    supabase
      .from('clients')
      .select('*, admin_notes ( difficulty ), events ( name, event_type, event_date )')
      .order('event_date', { ascending: true, nullsFirst: false })
      .then(({ data }) => setClients(data || []))
  }, [])

  const t = today()
  const active = (clients || []).filter((c) => c.status !== 'archived')
  const nextKey = (c) => eventDates(c).next || '9999-12-31'
  // upcoming until her LAST event has passed; ordered by her next event
  const upcoming = active.filter((c) => !eventDates(c).last || eventDates(c).last >= t).sort((a, b) => nextKey(a).localeCompare(nextKey(b)))
  const past = active.filter((c) => eventDates(c).last && eventDates(c).last < t)
  const archived = (clients || []).filter((c) => c.status === 'archived')
  const olderCount = past.length + archived.length

  return (
    <AdminShell title="Clients">
      <PageHeader
        eyebrow="Studio"
        title="Your clients"
        intro={clients && upcoming.length > 0 ? `${upcoming.length} upcoming, soonest first.` : null}
        action={
          <Link to="/admin/clients/new" className={btnClass('solid', 'sm')}>
            + New client
          </Link>
        }
      />
      {!clients ? (
        <Spinner />
      ) : (
        <>
          {upcoming.length === 0 ? (
            <p className={emptyNote}>
              {clients.length === 0
                ? 'No clients yet — add your first booking to get started.'
                : 'No upcoming bookings right now.'}
            </p>
          ) : (
            <div className="border-t border-line">
              {upcoming.map((c) => (
                <ClientCard key={c.id} client={c} />
              ))}
            </div>
          )}
          {olderCount > 0 && (
            <div className="mt-10">
              <button
                type="button"
                onClick={() => setShowPast((s) => !s)}
                aria-expanded={showPast}
                className="inline-flex items-center gap-2.5 min-h-8 text-[11px] tracking-[0.2em] uppercase text-faint hover:text-gold transition-colors cursor-pointer"
              >
                <Chevron open={showPast} />
                Past & archived <span className="tracking-normal">({olderCount})</span>
              </button>
              {showPast && (
                <div className="border-t border-line mt-3 opacity-80">
                  {[...past, ...archived].map((c) => (
                    <ClientCard key={c.id} client={c} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </AdminShell>
  )
}
