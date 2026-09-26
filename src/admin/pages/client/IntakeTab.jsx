import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import { signedPhotoUrl } from '../../../portal/lib/data'
import MemberProfileForm from '../../../shared/MemberProfileForm'
import { TextArea, Btn, StatusChip, FormSection, InfoRow, fmtShortDate, fmtTime, AUTOFILL_COPY } from '../../../shared/ui'
import {
  SERVICE_LABELS, bookingServices, allowedServiceOptions, relevantSections, stripIrrelevant,
} from '../../../shared/booking/services.js'
import { sortEvents } from '../../../shared/booking/pricing.js'
import { upgradePayload, eventDiffs, eventKey, EVENT_FIELDS, EVENT_FIELD_LABELS } from '../../../shared/booking/intake.js'
import { review } from './review'

const show = (field, v) => {
  if (v == null || v === '') return '—'
  if (field === 'event_date') return fmtShortDate(v)
  if (field === 'ready_time') return fmtTime(v)
  return String(v)
}

function Flag({ tone = 'gold', children }) {
  return (
    <p className={`text-[11px] mt-1 flex items-start gap-1.5 ${tone === 'red' ? 'text-[#8a3a2a]' : 'text-gold'}`}>
      <span className={`w-1.5 h-1.5 border rotate-45 shrink-0 mt-1 ${tone === 'red' ? 'border-[#8a3a2a]' : 'border-gold'}`} aria-hidden="true" />
      {children}
    </p>
  )
}

function MemberSummary({ m, events }) {
  const sec = relevantSections(m.services)
  const attending = events.filter((e) => (m.event_ids || []).includes(e.id))
  const parts = [
    SERVICE_LABELS[m.services] || 'Service not chosen',
    sec.hair && m.hair_length ? `Hair ${m.hair_length.replace('_', '-')}` : null,
    sec.hair && m.hair_texture ? m.hair_texture : null,
    sec.makeup && m.skin_type ? `${m.skin_type} skin` : null,
    m.allergies ? 'Allergies noted' : null,
  ].filter(Boolean)
  return (
    <>
      <p className="text-xs text-[#8A7A70] truncate">{[m.relation, ...parts].filter(Boolean).join(' · ')}</p>
      {attending.length > 0 && (
        <p className="text-[10px] tracking-[0.12em] uppercase text-gold mt-1 truncate">
          {attending.map((e) => e.name || e.event_type).join(' · ')}
        </p>
      )}
    </>
  )
}

export default function IntakeTab({ client, intake, members, events, lines, reload }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const memberId = searchParams.get('member')
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')
  const [askChanges, setAskChanges] = useState(false)
  const [msg, setMsg] = useState('')

  const sorted = sortEvents(events)
  const booked = bookingServices(lines)
  const allowed = allowedServiceOptions(booked)
  const selected = members.find((m) => m.id === memberId)

  useEffect(() => {
    setEditing(selected ? { ...selected } : null)
  }, [memberId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveMember() {
    const { id, client_id, created_at, updated_at, submitted_at, ...fields } = stripIrrelevant(editing)
    await supabase.from('party_members').update(fields).eq('id', id)
    setSearchParams({ tab: 'intake' })
    reload()
  }

  if (selected && editing) {
    return (
      <div>
        <button onClick={() => setSearchParams({ tab: 'intake' })} className="text-xs tracking-[0.2em] uppercase text-[#8A7A70] hover:text-gold cursor-pointer mb-6">
          ← All profiles
        </button>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <h3 className="font-heading text-2xl text-dark">
            {selected.name || 'Unnamed'} {selected.is_bride && '· Bride'}
          </h3>
          <StatusChip status={selected.status} />
        </div>
        <MemberProfileForm
          value={editing}
          onChange={setEditing}
          hideRelation={selected.is_bride}
          allowedServices={allowed}
          events={sorted}
          showEvents={!selected.is_bride}
          autofill={selected.autofill}
          studio
          uploadFile={async (slot, file) => {
            const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
            const path = `${client.id}/members/${selected.id}/${slot}/${crypto.randomUUID()}.${ext}`
            const { error } = await supabase.storage.from('client-uploads').upload(path, file, { contentType: file.type })
            if (error) throw new Error('Upload failed')
            return { path }
          }}
          resolveUrl={signedPhotoUrl}
        />
        <div className="flex flex-wrap gap-3">
          <Btn onClick={saveMember}>Save profile</Btn>
          {selected.status === 'pending' && (
            <Btn
              variant="gold"
              onClick={async () => {
                await review('party_member', selected.id, 'approved')
                setSearchParams({ tab: 'intake' })
                reload()
              }}
            >
              Approve
            </Btn>
          )}
        </div>
      </div>
    )
  }

  const p = intake ? upgradePayload(intake.payload, sorted) : null
  const af = p?._autofill || {}
  const byEvent = Object.fromEntries((p?.events || []).map((e) => [e.event_id, e]))
  const changed = sorted
    .map((b) => ({ b, diffs: eventDiffs(byEvent[b.id], b) }))
    .filter((x) => x.diffs.length)

  async function applyChanges() {
    if (!window.confirm('Copy her corrections into the booking? Dates, times, addresses and party sizes she changed will replace yours.')) return
    for (const { b, diffs } of changed) {
      const patch = {}
      for (const d of diffs) {
        if (d.field === 'party_size') patch.party_size = d.client === '' || d.client == null ? null : Number(d.client)
        else if (d.field === 'address') patch.address = d.client || ''
        else patch[d.field] = d.client || null
      }
      await supabase.from('events').update(patch).eq('id', b.id)
    }
    setMsg('Booking updated with her answers ✓')
    reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
        <p className="text-[10px] tracking-[0.35em] uppercase text-gold">Client intake{intake ? ` · v${intake.version}` : ''}</p>
        {intake ? <StatusChip status={intake.status} /> : <StatusChip status="draft" label="Not started" />}
      </div>

      {intake?.status === 'pending' && (
        <FormSection title="Review">
          {askChanges ? (
            <>
              <TextArea label="What should she change?" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Could you double-check the Jaggo address?" />
              <div className="flex gap-3">
                <Btn
                  variant="outline"
                  onClick={async () => {
                    await review('intake', intake.id, 'changes_requested', message)
                    setAskChanges(false)
                    reload()
                  }}
                  disabled={!message.trim()}
                >
                  Send request
                </Btn>
                <Btn variant="outline" onClick={() => setAskChanges(false)}>Cancel</Btn>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Btn variant="gold" onClick={async () => { await review('intake', intake.id, 'approved'); reload() }}>Approve intake</Btn>
              <Btn variant="outline" onClick={() => setAskChanges(true)}>Request changes</Btn>
            </div>
          )}
        </FormSection>
      )}

      {p && (
        <FormSection
          title="Event details"
          hint="Her answers. Anything she changed from your booking is flagged, and so is anything auto-filled she hasn’t checked yet."
          action={changed.length > 0 && (
            <Btn variant="gold" className="!px-4 !py-2" onClick={applyChanges}>Apply her changes to the booking</Btn>
          )}
        >
          {sorted.map((b) => {
            const mine = byEvent[b.id]
            const diffs = Object.fromEntries(eventDiffs(mine, b).map((d) => [d.field, d]))
            return (
              <div key={b.id}>
                <h3 className="font-heading text-lg text-dark border-b border-[#E0D2C2] pb-2">
                  {b.name || b.event_type} <span className="text-sm text-[#8A7A70]">· {fmtShortDate(b.event_date)}</span>
                </h3>
                {EVENT_FIELDS.map((f) => (
                  <div key={f} className="py-2 border-b border-[#EFE6DA] text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-[#7A6355]">{EVENT_FIELD_LABELS[f]}</span>
                      <span className="text-dark text-right">{show(f, mine?.[f])}</span>
                    </div>
                    {diffs[f] && <Flag tone="red">Changed by client — your booking says {show(f, diffs[f].booking)}</Flag>}
                    {af[eventKey(b.id, f)] && <Flag>{AUTOFILL_COPY.admin}</Flag>}
                  </div>
                ))}
              </div>
            )
          })}
          {msg && <p className="text-gold text-sm">{msg}</p>}
        </FormSection>
      )}

      {p && (
        <FormSection title="About her">
          <div>
            <InfoRow label="Phone" value={p.profile?.phone || '—'} />
            {af['profile.phone'] && <Flag>{AUTOFILL_COPY.admin}</Flag>}
            <InfoRow label="Heard about us" value={p.profile?.referral_source || '—'} />
          </div>
        </FormSection>
      )}

      <FormSection
        title={`Profiles (${members.length})`}
        hint={booked.hair || booked.makeup ? `This booking includes ${[booked.hair && 'hair', booked.makeup && 'makeup'].filter(Boolean).join(' and ')} — profiles only ask what applies.` : null}
      >
        <div className="flex flex-col gap-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 border-b border-[#EFE6DA] pb-3">
              <button onClick={() => setSearchParams({ tab: 'intake', member: m.id })} className="flex-1 min-w-0 text-left cursor-pointer">
                <h4 className="font-heading text-base text-dark truncate">
                  {m.name || 'Unnamed'} {m.is_bride && '· Bride'}
                </h4>
                <MemberSummary m={m} events={sorted} />
                {Object.keys(m.autofill || {}).length > 0 && <Flag>{AUTOFILL_COPY.admin}</Flag>}
              </button>
              <StatusChip status={m.status} />
              {m.status === 'pending' && (
                <Btn variant="gold" className="!px-3 !py-2" onClick={async () => { await review('party_member', m.id, 'approved'); reload() }}>
                  Approve
                </Btn>
              )}
            </div>
          ))}
        </div>
        {members.some((m) => m.status === 'pending') && (
          <Btn
            className="self-start"
            onClick={async () => {
              for (const m of members.filter((x) => x.status === 'pending')) await review('party_member', m.id, 'approved')
              reload()
            }}
          >
            Approve all pending profiles
          </Btn>
        )}
      </FormSection>
    </div>
  )
}
