import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { AdminShell } from '../AdminShell'
import { Btn, Spinner, StatusChip, DiamondRule, SectionHeading, fmtTime } from '../../shared/ui'

const DIFF_DOT = { easy: 'bg-[#7a9070]', medium: 'bg-[#c9a25e]', hard: 'bg-[#a45a48]' }

function ClientCard({ client }) {
  const notes = Array.isArray(client.admin_notes) ? client.admin_notes[0] : client.admin_notes
  const days =
    client.event_date != null
      ? Math.ceil((new Date(`${client.event_date}T00:00:00`) - new Date()) / 86400000)
      : null
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
        <p className="text-xs text-[#8A7A70] mt-1 truncate">
          {[
            client.event_type,
            client.event_date,
            client.booked_time ? fmtTime(client.booked_time) : null,
            client.party_size ? `${client.party_size} people` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'No event details yet'}
        </p>
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
      .select('*, admin_notes ( difficulty )')
      .order('event_date', { ascending: true, nullsFirst: false })
      .then(({ data }) => setClients(data || []))
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const active = (clients || []).filter((c) => c.status !== 'archived')
  const upcoming = active.filter((c) => !c.event_date || c.event_date >= today)
  const past = active.filter((c) => c.event_date && c.event_date < today)
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
