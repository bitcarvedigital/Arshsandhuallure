import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import { uploadMemberPhoto, signedPhotoUrl } from '../lib/data'
import PortalShell from '../../shared/PortalShell'
import MemberProfileForm from '../../shared/MemberProfileForm'
import { Btn, ErrorNote, Spinner, StatusChip, DiamondRule, SectionHeading } from '../../shared/ui'
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
        <p className="text-sm text-[#7A6355]">
          This profile no longer exists.{' '}
          <Link to="/portal/intake" className="text-gold underline">Back to your intake</Link>
        </p>
      </PortalShell>
    )
  }

  const booked = member.is_bride ? bookingServices(lines, { forBrideOnly: true }) : bookingServices(lines)
  const allowed = allowedServiceOptions(booked.itemised ? booked : bookingServices(lines))

  return (
    <PortalShell title={member.is_bride ? 'Your Profile' : member.name || 'Party Profile'} nav={NAV} onSignOut={signOut}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <SectionHeading eyebrow={member.is_bride ? 'Your Profile' : 'Party Profile'} title={member.is_bride ? 'Your look' : member.name || 'New person'} />
        <StatusChip status={member.status} />
      </div>
      <p className="text-sm text-[#7A6355] max-w-lg">The more you share, the more perfectly we prepare — photos help the most.</p>
      {member.status === 'approved' && (
        <p className="text-xs text-[#8A7A70] mt-3">This profile is confirmed — saving changes sends it back to Arsh for a quick re-check.</p>
      )}
      <DiamondRule className="my-10" />
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
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-wrap gap-3 pb-4">
        <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</Btn>
        <Link to="/portal/intake"><Btn variant="outline">Cancel</Btn></Link>
        {!member.is_bride && <Btn variant="danger" onClick={remove}>Remove</Btn>}
      </div>
    </PortalShell>
  )
}
