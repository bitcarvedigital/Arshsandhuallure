import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import PortalShell from '../../shared/PortalShell'
import { Field, Select, Btn, ErrorNote, Spinner, StatusChip, DiamondRule, SectionHeading, MicroLabel, labelClass } from '../../shared/ui'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

const EVENT_TYPES = ['Wedding', 'Reception', 'Engagement', 'Party', 'Editorial', 'Other'].map((v) => ({
  value: v,
  label: v,
}))

export default function Intake() {
  const { client, signOut } = useAuth()
  const navigate = useNavigate()
  const [intake, setIntake] = useState(undefined)
  const [members, setMembers] = useState([])
  const [saved, setSaved] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const timer = useRef(null)
  const intakeRef = useRef(null)
  useEffect(() => {
    intakeRef.current = intake
  }, [intake])

  const editable = intake && intake.status === 'draft'

  const load = useCallback(async () => {
    const [{ data: intakes }, { data: mems }] = await Promise.all([
      supabase.from('intakes').select('*').neq('status', 'superseded').order('version', { ascending: false }),
      supabase.from('party_members').select('*').order('is_bride', { ascending: false }).order('created_at'),
    ])
    let current = (intakes || [])[0] || null
    if (!current) {
      // first visit — start the draft prefilled from the booking
      const { data: created, error: err } = await supabase
        .from('intakes')
        .insert({
          client_id: client.id,
          payload: {
            event_type: client.event_type || '',
            event_date: client.event_date || '',
            getting_ready_address: client.getting_ready_address || '',
            call_time: client.booked_time || '',
            phone: client.phone || '',
            email: client.email || '',
            referral_source: '',
          },
        })
        .select()
        .single()
      if (!err) current = created
    }
    setIntake(current)
    setMembers(mems || [])
  }, [client])

  useEffect(() => {
    load()
  }, [load])

  function setPayload(patch) {
    setIntake((cur) => ({ ...cur, payload: { ...cur.payload, ...patch } }))
    setSaved(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const cur = intakeRef.current
      if (!cur) return
      const { error: err } = await supabase.from('intakes').update({ payload: cur.payload }).eq('id', cur.id)
      setSaved(!err)
    }, 1500)
  }

  async function revise() {
    setBusy(true)
    if (intake.status === 'changes_requested') {
      const { data } = await supabase
        .from('intakes')
        .update({ status: 'draft' })
        .eq('id', intake.id)
        .select()
        .single()
      if (data) setIntake({ ...data, review_message: intake.review_message })
    } else {
      // approved → new version, same answers
      const { data } = await supabase
        .from('intakes')
        .insert({ client_id: client.id, payload: intake.payload })
        .select()
        .single()
      if (data) setIntake(data)
    }
    setBusy(false)
  }

  async function submitAll() {
    setError('')
    const p = intake.payload || {}
    if (!p.event_date) return setError('Please add your event date before submitting.')
    const bride = members.find((m) => m.is_bride)
    if (!bride || !bride.name) return setError('Please complete your own profile before submitting.')
    setBusy(true)
    const { error: e1 } = await supabase.from('intakes').update({ status: 'pending' }).eq('id', intake.id)
    const draftIds = members.filter((m) => m.status === 'draft' && m.name).map((m) => m.id)
    if (draftIds.length) {
      await supabase.from('party_members').update({ status: 'pending' }).in('id', draftIds)
    }
    setBusy(false)
    if (e1) {
      setError('We couldn’t submit — please try again.')
      return
    }
    await load()
    window.scrollTo({ top: 0 })
  }

  async function removeMember(m) {
    if (!window.confirm(`Remove ${m.name || 'this person'} from your party?`)) return
    await supabase.from('party_members').delete().eq('id', m.id)
    setMembers((cur) => cur.filter((x) => x.id !== m.id))
  }

  async function addMember() {
    const { data } = await supabase
      .from('party_members')
      .insert({ client_id: client.id, name: '' })
      .select()
      .single()
    if (data) navigate(`/portal/intake/member/${data.id}`)
  }

  if (intake === undefined) {
    return (
      <PortalShell title="Intake" nav={NAV} onSignOut={signOut}>
        <Spinner />
      </PortalShell>
    )
  }

  const p = intake?.payload || {}
  const bride = members.find((m) => m.is_bride)
  const party = members.filter((m) => !m.is_bride)

  return (
    <PortalShell title="Client Intake" nav={NAV} onSignOut={signOut}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <SectionHeading eyebrow="Client Intake Form" title="You & your party" />
        <div className="flex items-center gap-3">
          {editable && (
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#8A7A70]">
              {saved ? 'Saved ✓' : 'Saving…'}
            </span>
          )}
          <StatusChip status={intake?.status === 'draft' ? 'draft' : intake?.status || 'draft'} />
        </div>
      </div>
      <p className="text-sm text-[#7A6355] max-w-lg">
        Everything we need to craft each look — fill it at your own pace, it saves as you go.
      </p>

      {intake?.status === 'changes_requested' && (
        <div className="border-l-2 border-[#8a3a2a] bg-[#F6E8E2] px-5 py-4 mt-6">
          <MicroLabel className="mb-1">A note from Arsh</MicroLabel>
          <p className="text-sm text-[#5A2A1A]">{intake.review_message}</p>
          <Btn variant="outline" className="mt-4" onClick={revise} disabled={busy}>
            Revise my answers
          </Btn>
        </div>
      )}
      {intake?.status === 'approved' && (
        <div className="border-l-2 border-gold bg-beige-card px-5 py-4 mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#5A4030]">Your intake is confirmed. Need to change something?</p>
          <Btn variant="outline" onClick={revise} disabled={busy}>
            Make changes
          </Btn>
        </div>
      )}
      {intake?.status === 'pending' && (
        <div className="border-l-2 border-gold bg-beige-card px-5 py-4 mt-6">
          <p className="text-sm text-[#5A4030]">
            Submitted — Arsh is reviewing it. You’ll see it confirmed here shortly.
          </p>
        </div>
      )}

      <DiamondRule className="my-8" />

      {/* Section 1 — event details */}
      <MicroLabel className="mb-4">1 · Event & Booking Details</MicroLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
        <Select label="Event type" options={EVENT_TYPES} value={p.event_type || ''} onChange={(e) => setPayload({ event_type: e.target.value })} disabled={!editable} />
        <Field label="Event date" type="date" value={p.event_date || ''} onChange={(e) => setPayload({ event_date: e.target.value })} disabled={!editable} />
        <Field label="Getting-ready address" value={p.getting_ready_address || ''} onChange={(e) => setPayload({ getting_ready_address: e.target.value })} placeholder="Where we set up" disabled={!editable} />
        <Field label="Call time / start time" type="time" value={p.call_time || ''} onChange={(e) => setPayload({ call_time: e.target.value })} disabled={!editable} />
        <Field label="Phone" type="tel" value={p.phone || ''} onChange={(e) => setPayload({ phone: e.target.value })} disabled={!editable} />
        <Field label="How did you hear about us?" value={p.referral_source || ''} onChange={(e) => setPayload({ referral_source: e.target.value })} placeholder="Instagram, a friend…" disabled={!editable} />
      </div>

      {/* Section 2 — bride's own profile */}
      <MicroLabel className="mb-4">2 · Your Profile</MicroLabel>
      {bride && (
        <Link
          to={`/portal/intake/member/${bride.id}`}
          className="flex items-center justify-between gap-3 border border-[#C8B8AC] bg-[#FBF8F4] hover:border-gold transition-colors p-5 mb-12"
        >
          <div>
            <h3 className="font-heading text-lg text-dark">{bride.name || 'Your look'}</h3>
            <p className="text-xs text-[#8A7A70] mt-1">Your services, preferences & inspiration photos</p>
          </div>
          <StatusChip status={bride.status} />
        </Link>
      )}

      {/* Section 3 — the party */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <MicroLabel>3 · Your Party ({party.length})</MicroLabel>
        <div className="flex gap-2">
          <Btn variant="gold" className="!px-4 !py-2.5" onClick={addMember}>
            + Add person
          </Btn>
          <Link to="/portal/party-link">
            <Btn variant="outline" className="!px-4 !py-2.5">Share a link</Btn>
          </Link>
        </div>
      </div>
      <p className="text-xs text-[#8A7A70] mb-4 max-w-lg">
        Add each person yourself, or share your party link so everyone fills in their own details — their
        profiles appear here automatically.
      </p>
      <div className="flex flex-col gap-3 mb-12">
        {party.length === 0 && (
          <p className="text-sm text-[#A89080] border border-dashed border-[#C8B8AC] p-6 text-center">
            No one here yet — add your first person or share your party link.
          </p>
        )}
        {party.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 border border-[#C8B8AC] bg-[#FBF8F4] p-4">
            <Link to={`/portal/intake/member/${m.id}`} className="flex-1 min-w-0">
              <h3 className="font-heading text-base text-dark truncate">{m.name || 'Unnamed'}</h3>
              <p className="text-xs text-[#8A7A70] truncate">
                {[m.relation, m.services && m.services.charAt(0).toUpperCase() + m.services.slice(1)]
                  .filter(Boolean)
                  .join(' · ') || 'Tap to fill in'}
              </p>
            </Link>
            <StatusChip status={m.status} />
            <button
              onClick={() => removeMember(m)}
              aria-label="Remove"
              className="text-[#8A7A70] hover:text-[#8a3a2a] text-lg px-1 cursor-pointer"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Section 4 — submit */}
      {(editable || members.some((m) => m.status === 'draft')) && (
        <div className="border-t border-[#E0D2C2] pt-8 text-center">
          <MicroLabel className="mb-3">4 · Send to Arsh</MicroLabel>
          <p className="text-sm text-[#7A6355] max-w-md mx-auto mb-5">
            Once you’re happy with everything above, send it over — Arsh reviews it personally and confirms.
            You can still make changes afterwards.
          </p>
          <ErrorNote>{error}</ErrorNote>
          <Btn onClick={submitAll} disabled={busy}>
            {busy ? 'Sending…' : 'Submit to Arsh'}
          </Btn>
        </div>
      )}
    </PortalShell>
  )
}
