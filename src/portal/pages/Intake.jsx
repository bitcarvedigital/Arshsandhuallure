import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import PortalShell from '../../shared/PortalShell'
import { Field, Btn, ErrorNote, Spinner, StatusChip, MicroLabel, FormSection, AutofillWrap, InfoRow, btnClass, softNote, emptyNote, rowLine, rowLink } from '../../shared/ui'
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
      <PortalShell title="Client Intake" nav={NAV} onSignOut={signOut}>
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
      <MicroLabel className="mb-2">Client Intake</MicroLabel>
      <h1 className="font-heading text-3xl text-dark">You &amp; your party</h1>
      {editable && (
        <p className="text-sm text-muted max-w-lg mt-2">
          We’ve filled in what we already know from your booking — anything highlighted just needs a quick check.
          Tap it to confirm, or change it if something’s off.
        </p>
      )}
      <div className="flex items-center gap-3 mt-4">
        <StatusChip status={intake?.status || 'draft'} />
        {editable && (
          <span role="status" aria-live="polite" className="text-[10px] tracking-[0.2em] uppercase text-faint">
            {saved ? 'Saved ✓' : 'Saving…'}
          </span>
        )}
      </div>

      {intake?.status === 'changes_requested' && (
        <div className={`${softNote} mt-6`}>
          <MicroLabel className="mb-1.5">A note from Arsh</MicroLabel>
          <p className="leading-relaxed whitespace-pre-line">{intake.review_message}</p>
          <Btn variant="outline" size="sm" className="mt-4" onClick={revise} disabled={busy}>Revise my answers</Btn>
        </div>
      )}
      {intake?.status === 'approved' && (
        <div className={`${softNote} mt-6 flex flex-wrap items-center justify-between gap-3`}>
          <p>Your intake is confirmed. Need to change something?</p>
          <Btn variant="outline" size="sm" onClick={revise} disabled={busy}>Make changes</Btn>
        </div>
      )}
      {intake?.status === 'pending' && (
        <p role="status" className={`${softNote} mt-6`}>
          Submitted — Arsh is reviewing it. You’ll see it confirmed here shortly.
        </p>
      )}

      <div className="mt-10">
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
          <p className="text-xs text-faint -mt-2">Need a different name or email? Just message Arsh — she’ll update it for you.</p>
        </FormSection>

        <FormSection title="2 · Your events" hint="Where and when we’ll be getting everyone ready.">
          {events.length === 0 && <p className={emptyNote}>Arsh is still setting up your events.</p>}
          {events.length > 0 && (
            <div className="flex flex-col gap-12">
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
                    <h3 className="font-heading text-xl text-dark">{b.name || b.event_type}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {wrap('event_date', <Field label={EVENT_FIELD_LABELS.event_date} type="date" {...fieldProps('event_date')} />)}
                      {wrap('ready_time', <Field label={EVENT_FIELD_LABELS.ready_time} type="time" {...fieldProps('ready_time')} />)}
                    </div>
                    {wrap('address', <Field label={EVENT_FIELD_LABELS.address} {...fieldProps('address', { placeholder: 'Where we set up' })} />)}
                    {wrap('party_size', <Field label={EVENT_FIELD_LABELS.party_size} type="number" min="0" inputMode="numeric" {...fieldProps('party_size')} />)}
                  </div>
                )
              })}
            </div>
          )}
        </FormSection>

        <FormSection title="3 · Your look">
          {bride && (
            <Link
              to={`/portal/intake/member/${bride.id}`}
              className={`rounded-2xl flex items-center justify-between gap-4 px-5 py-5 transition-colors ${brideChecks ? 'bg-soft/70 hover:bg-soft' : 'bg-surface hover:bg-soft/50'}`}
            >
              <div className="min-w-0">
                <h3 className="font-heading text-lg text-dark">{bride.name || 'Your look'}</h3>
                <p className="text-sm text-muted mt-0.5">
                  {bride.services ? `${SERVICE_LABELS[bride.services]} · ` : ''}Your preferences &amp; inspiration photos
                </p>
                {brideChecks > 0 && (
                  <p className="text-xs text-gold mt-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" aria-hidden="true" />
                    {brideChecks} auto-filled answer{brideChecks === 1 ? '' : 's'} to check
                  </p>
                )}
              </div>
              <span className="shrink-0">
                <StatusChip status={bride.status} />
              </span>
            </Link>
          )}
        </FormSection>

        <FormSection
          title={`4 · Your party (${party.length})`}
          hint="Add each person yourself, or share your party link so everyone fills in their own details — their profiles appear here automatically."
        >
          {party.length === 0 ? (
            <p className={emptyNote}>No one here yet — add your first person or share your party link.</p>
          ) : (
            <div>
              {party.map((m) => (
                <div key={m.id} className={`${rowLine} flex items-center gap-2`}>
                  <Link to={`/portal/intake/member/${m.id}`} className={`${rowLink} flex-1 min-w-0`}>
                    <span className="min-w-0">
                      <span className="block font-heading text-lg text-dark truncate">{m.name || 'Unnamed'}</span>
                      <span className="block text-xs text-faint mt-0.5 truncate">
                        {[m.relation, SERVICE_LABELS[m.services], ...(m.event_ids || []).map(eventName).filter(Boolean)].filter(Boolean).join(' · ') || 'Tap to fill in'}
                      </span>
                    </span>
                    <span className="shrink-0">
                      <StatusChip status={m.status} />
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeMember(m)}
                    aria-label={`Remove ${m.name || 'this person'}`}
                    className="shrink-0 w-10 h-10 -mr-2 flex items-center justify-center rounded-full text-faint hover:text-danger hover:bg-soft/70 transition-colors cursor-pointer"
                  >
                    <svg aria-hidden="true" viewBox="0 0 12 12" className="w-3 h-3">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Btn variant="outline" size="sm" onClick={addMember}>+ Add a person</Btn>
            <Link to="/portal/party-link" className={btnClass('outline', 'sm')}>Share a link</Link>
          </div>
        </FormSection>

        {(editable || members.some((m) => m.status === 'draft')) && (
          <FormSection title="5 · Review & send to Arsh">
            <div className="max-w-md">
              <p className="text-sm text-muted leading-relaxed">
                Save as you go, and send it over once you’re happy — Arsh reviews it personally and confirms. You can
                still make changes afterwards.
              </p>
              {pendingChecks(af) > 0 && (
                <p className="text-sm text-gold mt-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" aria-hidden="true" />
                  {pendingChecks(af)} highlighted answer{pendingChecks(af) === 1 ? '' : 's'} still to check.
                </p>
              )}
            </div>
            <div role="status" aria-live="polite" className="empty:hidden">
              <ErrorNote>{error}</ErrorNote>
              {msg && <p className="text-gold text-sm">{msg}</p>}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Btn onClick={submitAll} disabled={busy} className="w-full sm:w-auto">{busy ? 'Sending…' : 'Submit to Arsh'}</Btn>
              {editable && <Btn variant="outline" onClick={saveProgress} className="w-full sm:w-auto">Save progress</Btn>}
            </div>
          </FormSection>
        )}
      </div>
    </PortalShell>
  )
}
