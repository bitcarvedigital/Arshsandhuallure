import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import PortalShell from '../../shared/PortalShell'
import {
  Field, Btn, ErrorNote, Spinner, StatusChip, DiamondRule, SectionHeading, MicroLabel, FormSection, AutofillWrap,
  InfoRow, fmtShortDate,
} from '../../shared/ui'
import { SERVICE_LABELS } from '../../shared/booking/services.js'
import { sortEvents } from '../../shared/booking/pricing.js'
import {
  newPayload, upgradePayload, mergeBookingEvents, markSaved, pendingChecks, eventKey, EVENT_FIELD_LABELS,
} from '../../shared/booking/intake.js'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export default function Intake() {
  const { client, signOut } = useAuth()
  const navigate = useNavigate()
  const [intake, setIntake] = useState(undefined)
  const [members, setMembers] = useState([])
  const [events, setEvents] = useState([])
  const [saved, setSaved] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const timer = useRef(null)
  const intakeRef = useRef(null)
  useEffect(() => {
    intakeRef.current = intake
  }, [intake])

  const editable = intake && intake.status === 'draft'

  const load = useCallback(async () => {
    const [{ data: intakes }, { data: mems }, { data: evs }] = await Promise.all([
      supabase.from('intakes').select('*').neq('status', 'superseded').order('version', { ascending: false }),
      supabase.from('party_members').select('*').order('is_bride', { ascending: false }).order('created_at'),
      supabase.from('events').select('*'),
    ])
    const booking = sortEvents(evs || [])
    let current = (intakes || [])[0] || null
    if (!current) {
      // first visit — start the draft pre-filled from Arsh's booking, every value flagged to check
      const { data: created, error: err } = await supabase
        .from('intakes')
        .insert({ client_id: client.id, payload: newPayload(client, booking) })
        .select()
        .single()
      if (!err) current = created
    } else {
      const upgraded = upgradePayload(current.payload, booking)
      const merged = current.status === 'draft' ? mergeBookingEvents(upgraded, booking) : upgraded
      if (current.status === 'draft' && !sameJson(merged, current.payload)) {
        await supabase.from('intakes').update({ payload: merged }).eq('id', current.id)
      }
      current = { ...current, payload: merged }
    }
    setEvents(booking)
    setIntake(current)
    setMembers(mems || [])
  }, [client])

  useEffect(() => {
    load()
  }, [load])

  const persist = useCallback(async (delay = 1200) => {
    setSaved(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const cur = intakeRef.current
      if (!cur) return
      const { error: err } = await supabase.from('intakes').update({ payload: cur.payload }).eq('id', cur.id)
      setSaved(!err)
    }, delay)
  }, [])

  function updatePayload(fn) {
    setIntake((cur) => ({ ...cur, payload: fn(cur.payload) }))
    setMsg('')
    persist()
  }

  // clicking / focusing an auto-filled field = she has checked it
  const acknowledge = (key) => () => {
    if (!editable || !intake?.payload?._autofill?.[key]) return
    updatePayload((p) => {
      const af = { ...(p._autofill || {}) }
      delete af[key]
      return { ...p, _autofill: af }
    })
  }

  const setProfile = (field) => (e) =>
    updatePayload((p) => {
      const af = { ...(p._autofill || {}) }
      delete af[`profile.${field}`]
      return { ...p, profile: { ...(p.profile || {}), [field]: e.target.value }, _autofill: af }
    })

  const setEventField = (eventId, field) => (e) =>
    updatePayload((p) => {
      const af = { ...(p._autofill || {}) }
      delete af[eventKey(eventId, field)]
      return {
        ...p,
        events: (p.events || []).map((ev) => (ev.event_id === eventId ? { ...ev, [field]: e.target.value } : ev)),
        _autofill: af,
      }
    })

  async function saveProgress() {
    clearTimeout(timer.current)
    const payload = { ...intake.payload, _autofill: markSaved(intake.payload._autofill) }
    setIntake((cur) => ({ ...cur, payload }))
    const { error: err } = await supabase.from('intakes').update({ payload }).eq('id', intake.id)
    setSaved(!err)
    setMsg(err ? 'We couldn’t save — please try again.' : pendingChecks(payload._autofill) ? 'Saved ✓ — the highlighted answers are still waiting for a quick check.' : 'Saved ✓')
  }

  async function revise() {
    setBusy(true)
    if (intake.status === 'changes_requested') {
      const { data } = await supabase.from('intakes').update({ status: 'draft' }).eq('id', intake.id).select().single()
      if (data) setIntake({ ...data, payload: mergeBookingEvents(upgradePayload(data.payload, events), events), review_message: intake.review_message })
    } else {
      // approved → new version, same answers
      const { data } = await supabase.from('intakes').insert({ client_id: client.id, payload: intake.payload }).select().single()
      if (data) setIntake(data)
    }
    setBusy(false)
  }

  async function submitAll() {
    setError('')
    const bride = members.find((m) => m.is_bride)
    if (!bride || !bride.name) return setError('Please complete your own profile before submitting.')
    const unchecked = pendingChecks(intake.payload._autofill)
    if (unchecked && !window.confirm(`${unchecked} auto-filled answer${unchecked === 1 ? '' : 's'} haven’t been checked yet. Send anyway? They’ll stay highlighted for Arsh.`)) return
    setBusy(true)
    clearTimeout(timer.current)
    const payload = { ...intake.payload, _autofill: markSaved(intake.payload._autofill) }
    const { error: e1 } = await supabase.from('intakes').update({ payload, status: 'pending' }).eq('id', intake.id)
    const draftIds = members.filter((m) => m.status === 'draft' && m.name).map((m) => m.id)
    if (draftIds.length) await supabase.from('party_members').update({ status: 'pending' }).in('id', draftIds)
    setBusy(false)
    if (e1) return setError('We couldn’t submit — please try again.')
    await load()
    window.scrollTo({ top: 0 })
  }

  async function removeMember(m) {
    if (!window.confirm(`Remove ${m.name || 'this person'} from your party?`)) return
    await supabase.from('party_members').delete().eq('id', m.id)
    setMembers((cur) => cur.filter((x) => x.id !== m.id))
  }

  async function addMember() {
    const { data } = await supabase.from('party_members').insert({ client_id: client.id, name: '' }).select().single()
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
  const af = p._autofill || {}
  const bride = members.find((m) => m.is_bride)
  const party = members.filter((m) => !m.is_bride)
  const byEvent = Object.fromEntries((p.events || []).map((e) => [e.event_id, e]))
  const brideChecks = Object.keys(bride?.autofill || {}).length
  const eventName = (id) => events.find((e) => e.id === id)?.name

  return (
    <PortalShell title="Client Intake" nav={NAV} onSignOut={signOut}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <SectionHeading eyebrow="Client Intake Form" title="You & your party" />
        <div className="flex items-center gap-3">
          {editable && (
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#8A7A70]">{saved ? 'Saved ✓' : 'Saving…'}</span>
          )}
          <StatusChip status={intake?.status || 'draft'} />
        </div>
      </div>
      <p className="text-sm text-[#7A6355] max-w-lg">
        We’ve filled in what we already know from your booking — anything highlighted just needs a quick check.
        Tap it to confirm, or change it if something’s off.
      </p>

      {intake?.status === 'changes_requested' && (
        <div className="border-l-2 border-[#8a3a2a] bg-[#F6E8E2] px-5 py-4 mt-6">
          <MicroLabel className="mb-1">A note from Arsh</MicroLabel>
          <p className="text-sm text-[#5A2A1A]">{intake.review_message}</p>
          <Btn variant="outline" className="mt-4" onClick={revise} disabled={busy}>Revise my answers</Btn>
        </div>
      )}
      {intake?.status === 'approved' && (
        <div className="border-l-2 border-gold bg-beige-card px-5 py-4 mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#5A4030]">Your intake is confirmed. Need to change something?</p>
          <Btn variant="outline" onClick={revise} disabled={busy}>Make changes</Btn>
        </div>
      )}
      {intake?.status === 'pending' && (
        <div className="border-l-2 border-gold bg-beige-card px-5 py-4 mt-6">
          <p className="text-sm text-[#5A4030]">Submitted — Arsh is reviewing it. You’ll see it confirmed here shortly.</p>
        </div>
      )}

      <DiamondRule className="my-10" />

      <FormSection title="1 · About you">
        <div>
          <InfoRow label="Name" value={client?.full_name} />
          <InfoRow label="Email" value={client?.email} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <AutofillWrap state={af['profile.phone']} onAcknowledge={acknowledge('profile.phone')}>
            <Field label="Phone" type="tel" value={p.profile?.phone || ''} onChange={setProfile('phone')} disabled={!editable} />
          </AutofillWrap>
          <Field label="How did you hear about us?" value={p.profile?.referral_source || ''} onChange={setProfile('referral_source')} placeholder="Instagram, a friend…" disabled={!editable} />
        </div>
        <p className="text-xs text-[#8A7A70] -mt-2">Need a different name or email? Just message Arsh — she’ll update it for you.</p>
      </FormSection>

      <FormSection title="2 · Your events" hint="Where and when we’ll be getting everyone ready.">
        {events.length === 0 && <p className="text-sm text-[#A89080]">Arsh is still setting up your events.</p>}
        {events.map((b) => {
          const ev = byEvent[b.id] || {}
          const fieldProps = (field, extra = {}) => ({
            value: ev[field] ?? '',
            onChange: setEventField(b.id, field),
            disabled: !editable,
            ...extra,
          })
          const wrap = (field, input) => (
            <AutofillWrap state={af[eventKey(b.id, field)]} onAcknowledge={acknowledge(eventKey(b.id, field))}>
              {input}
            </AutofillWrap>
          )
          return (
            <div key={b.id} className="flex flex-col gap-6">
              <h3 className="font-heading text-xl text-dark border-b border-[#E0D2C2] pb-2">
                {b.name || b.event_type}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {wrap('event_date', <Field label={EVENT_FIELD_LABELS.event_date} type="date" {...fieldProps('event_date')} />)}
                {wrap('ready_time', <Field label={EVENT_FIELD_LABELS.ready_time} type="time" {...fieldProps('ready_time')} />)}
              </div>
              {wrap('address', <Field label={EVENT_FIELD_LABELS.address} {...fieldProps('address', { placeholder: 'Where we set up' })} />)}
              {wrap('party_size', <Field label={EVENT_FIELD_LABELS.party_size} type="number" min="0" {...fieldProps('party_size')} />)}
            </div>
          )
        })}
      </FormSection>

      <FormSection title="3 · Your look">
        {bride && (
          <Link
            to={`/portal/intake/member/${bride.id}`}
            className={`flex items-center justify-between gap-3 border p-5 transition-colors hover:border-gold ${brideChecks ? 'border-gold bg-[#F4E9DA]' : 'border-[#C8B8AC] bg-[#FBF8F4]'}`}
          >
            <div>
              <h3 className="font-heading text-lg text-dark">{bride.name || 'Your look'}</h3>
              <p className="text-xs text-[#8A7A70] mt-1">
                {bride.services ? `${SERVICE_LABELS[bride.services]} · ` : ''}Your preferences & inspiration photos
              </p>
              {brideChecks > 0 && (
                <p className="text-[11px] text-gold mt-1">
                  {brideChecks} auto-filled answer{brideChecks === 1 ? '' : 's'} to check
                </p>
              )}
            </div>
            <StatusChip status={bride.status} />
          </Link>
        )}
      </FormSection>

      <FormSection
        title={`4 · Your party (${party.length})`}
        hint="Add each person yourself, or share your party link so everyone fills in their own details — their profiles appear here automatically."
        action={
          <div className="flex gap-2">
            <Btn variant="gold" className="!px-4 !py-2.5" onClick={addMember}>+ Add person</Btn>
            <Link to="/portal/party-link"><Btn variant="outline" className="!px-4 !py-2.5">Share a link</Btn></Link>
          </div>
        }
      >
        {party.length === 0 && (
          <p className="text-sm text-[#A89080] border border-dashed border-[#C8B8AC] p-6 text-center">
            No one here yet — add your first person or share your party link.
          </p>
        )}
        {party.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 border-b border-[#EFE6DA] pb-3">
            <Link to={`/portal/intake/member/${m.id}`} className="flex-1 min-w-0">
              <h3 className="font-heading text-base text-dark truncate">{m.name || 'Unnamed'}</h3>
              <p className="text-xs text-[#8A7A70] truncate">
                {[m.relation, SERVICE_LABELS[m.services], ...(m.event_ids || []).map(eventName).filter(Boolean)].filter(Boolean).join(' · ') || 'Tap to fill in'}
              </p>
            </Link>
            <StatusChip status={m.status} />
            <button onClick={() => removeMember(m)} aria-label="Remove" className="text-[#8A7A70] hover:text-[#8a3a2a] text-lg px-1 cursor-pointer">×</button>
          </div>
        ))}
      </FormSection>

      {(editable || members.some((m) => m.status === 'draft')) && (
        <FormSection title="5 · Review & send to Arsh">
          <p className="text-sm text-[#7A6355] max-w-md">
            Save as you go, and send it over once you’re happy — Arsh reviews it personally and confirms. You can
            still make changes afterwards.
            {pendingChecks(af) > 0 && (
              <span className="block mt-2 text-gold">
                {pendingChecks(af)} highlighted answer{pendingChecks(af) === 1 ? '' : 's'} still to check.
              </span>
            )}
          </p>
          <ErrorNote>{error}</ErrorNote>
          {msg && <p className="text-gold text-sm">{msg}</p>}
          <div className="flex flex-wrap gap-3">
            {editable && <Btn variant="outline" onClick={saveProgress}>Save progress</Btn>}
            <Btn onClick={submitAll} disabled={busy}>{busy ? 'Sending…' : 'Submit to Arsh'}</Btn>
          </div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-[#8A7A70]">
            Events: {events.map((e) => `${e.name || e.event_type} (${fmtShortDate(e.event_date)})`).join(' · ') || '—'}
          </p>
        </FormSection>
      )}
    </PortalShell>
  )
}
