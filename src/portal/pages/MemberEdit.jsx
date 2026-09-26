import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import { uploadMemberPhoto, signedPhotoUrl } from '../lib/data'
import PortalShell from '../../shared/PortalShell'
import MemberProfileForm from '../../shared/MemberProfileForm'
import { Btn, ErrorNote, Spinner, StatusChip, MicroLabel, btnClass, softNote, emptyNote } from '../../shared/ui'
import { bookingServices, allowedServiceOptions, stripIrrelevant } from '../../shared/booking/services.js'
import { sortEvents } from '../../shared/booking/pricing.js'
import { markSaved } from '../../shared/booking/intake.js'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

export default function MemberEdit() {
  const { memberId } = useParams()
  const { client, signOut } = useAuth()
  const navigate = useNavigate()
  const [member, setMember] = useState(undefined)
  const [events, setEvents] = useState([])
  const [lines, setLines] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('party_members').select('*').eq('id', memberId).maybeSingle(),
      supabase.from('events').select('*'),
      supabase.from('event_line_items').select('*'),
    ]).then(([m, ev, li]) => {
      setMember(m.data || null)
      setEvents(sortEvents(ev.data || []))
      setLines(li.data || [])
    })
  }, [memberId])

  // tapping an auto-filled field confirms it immediately (never re-queues review)
  async function acknowledge(field) {
    if (!member?.autofill?.[field]) return
    const autofill = { ...member.autofill }
    delete autofill[field]
    setMember((m) => ({ ...m, autofill }))
    await supabase.from('party_members').update({ autofill }).eq('id', member.id)
  }

  async function save() {
    setError('')
    if (!member.name?.trim()) return setError('Please add a name.')
    if (!member.services) return setError('Please choose a service.')
    setBusy(true)
    const clean = stripIrrelevant({ ...member, autofill: markSaved(member.autofill) })
    const { id, client_id, is_bride, source, status, submitted_at, created_at, updated_at, ...fields } = clean
    const { error: err } = await supabase.from('party_members').update(fields).eq('id', id)
    setBusy(false)
    if (err) return setError('We couldn’t save — please try again.')
    navigate('/portal/intake')
  }

  async function remove() {
    if (!window.confirm(`Remove ${member.name || 'this person'} from your party?`)) return
    await supabase.from('party_members').delete().eq('id', member.id)
    navigate('/portal/intake')
  }

  if (member === undefined) {
    return (
      <PortalShell title="Profile" nav={NAV} onSignOut={signOut}>
        <Spinner />
      </PortalShell>
    )
  }
  if (!member) {
    return (
      <PortalShell title="Profile" nav={NAV} onSignOut={signOut}>
        <div className={emptyNote}>
          <p>This profile no longer exists.</p>
          <Link to="/portal/intake" className={`${btnClass('outline', 'sm')} mt-5`}>
            Back to your intake
          </Link>
        </div>
      </PortalShell>
    )
  }

  const booked = member.is_bride ? bookingServices(lines, { forBrideOnly: true }) : bookingServices(lines)
  const allowed = allowedServiceOptions(booked.itemised ? booked : bookingServices(lines))

  return (
    <PortalShell title={member.is_bride ? 'Your Profile' : member.name || 'Party Profile'} nav={NAV} onSignOut={signOut}>
      <div className="mb-6 print:hidden">
        <Link to="/portal/intake" className="inline-block py-3 -my-3 text-[11px] tracking-[0.2em] uppercase text-faint hover:text-gold transition-colors">
          ← Your intake
        </Link>
      </div>
      <MicroLabel className="mb-2">{member.is_bride ? 'Your Profile' : 'Party Profile'}</MicroLabel>
      <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
        <h1 className="font-heading text-3xl text-dark break-words min-w-0">{member.is_bride ? 'Your look' : member.name || 'New person'}</h1>
        <StatusChip status={member.status} />
      </div>
      <p className="text-sm text-muted max-w-lg mt-2">The more you share, the more perfectly we prepare — photos help the most.</p>
      {member.status === 'approved' && (
        <p className={`${softNote} max-w-lg mt-5`}>
          This profile is confirmed — saving changes sends it back to Arsh for a quick re-check.
        </p>
      )}
      <div className="mt-10">
        <MemberProfileForm
          value={member}
          onChange={setMember}
          hideRelation={member.is_bride}
          allowedServices={allowed}
          events={events}
          showEvents={!member.is_bride}
          autofill={member.autofill}
          onAcknowledge={acknowledge}
          uploadFile={(slot, file) => uploadMemberPhoto(client.id, member.id, slot, file)}
          resolveUrl={signedPhotoUrl}
        />
      </div>
      <div role="status" aria-live="polite" className="empty:hidden mb-3">
        <ErrorNote>{error}</ErrorNote>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4">
        <Btn onClick={save} disabled={busy} className="w-full sm:w-auto">{busy ? 'Saving…' : 'Save profile'}</Btn>
        <Link to="/portal/intake" className={`${btnClass('outline')} w-full sm:w-auto`}>Cancel</Link>
        {!member.is_bride && (
          <button
            type="button"
            onClick={remove}
            className="self-center sm:ml-auto min-h-[40px] px-2 text-[11px] tracking-[0.2em] uppercase text-danger hover:underline cursor-pointer"
          >
            Remove from party
          </button>
        )}
      </div>
    </PortalShell>
  )
}
