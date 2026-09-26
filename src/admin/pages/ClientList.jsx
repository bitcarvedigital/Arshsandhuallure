import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { AdminShell } from '../AdminShell'
import { Btn, Spinner, StatusChip, DiamondRule, SectionHeading } from '../../shared/ui'

const DIFF_DOT = { easy: 'bg-[#7a9070]', medium: 'bg-[#c9a25e]', hard: 'bg-[#a45a48]' }

const today = () => new Date().toLocaleDateString('en-CA')
const short = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })

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
  return (
    <Link
      to={`/admin/clients/${client.id}`}
      className="flex items-center gap-4 border border-[#C8B8AC] bg-[#FBF8F4] hover:border-gold transition-colors p-5"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {notes?.difficulty && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${DIFF_DOT[notes.difficulty]}`} />
          )}
          <h3 className="font-heading text-lg text-dark truncate">{client.full_name}</h3>
        </div>
        {events.length ? (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {events.map((e, i) => (
              <span key={i} className="text-[10px] tracking-[0.12em] uppercase border border-[#D8C8BA] px-2 py-0.5 text-[#5A4A40]">
                {e.name || e.event_type}{e.event_date ? ` · ${short(e.event_date)}` : ''}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#8A7A70] mt-1">No event details yet</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {client.status === 'invited' && <StatusChip status="draft" label="Invite pending" />}
        {days != null && days >= 0 && client.status !== 'archived' && (
          <span className="text-[10px] tracking-[0.2em] uppercase text-gold">
            {days === 0 ? 'Today' : `In ${days} day${days === 1 ? '' : 's'}`}
          </span>
        )}
      </div>
    </Link>
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

  return (
    <AdminShell title="Clients">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <SectionHeading eyebrow="Studio" title="Your clients" />
        <Link to="/admin/clients/new">
          <Btn>+ New client</Btn>
        </Link>
      </div>
      <DiamondRule className="my-8" />
      {!clients ? (
        <Spinner />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {upcoming.length === 0 && (
              <p className="text-sm text-[#A89080] border border-dashed border-[#C8B8AC] p-8 text-center">
                No upcoming clients — add your first one.
              </p>
            )}
            {upcoming.map((c) => (
              <ClientCard key={c.id} client={c} />
            ))}
          </div>
          {(past.length > 0 || archived.length > 0) && (
            <button
              onClick={() => setShowPast((s) => !s)}
              className="mt-8 text-xs tracking-[0.2em] uppercase text-[#8A7A70] hover:text-gold cursor-pointer"
            >
              {showPast ? '− Hide' : '+ Show'} past & archived ({past.length + archived.length})
            </button>
          )}
          {showPast && (
            <div className="flex flex-col gap-3 mt-4 opacity-75">
              {[...past, ...archived].map((c) => (
                <ClientCard key={c.id} client={c} />
              ))}
            </div>
          )}
        </>
      )}
    </AdminShell>
  )
}
