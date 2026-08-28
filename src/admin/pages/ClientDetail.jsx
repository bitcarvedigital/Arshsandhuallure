import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase, authedFetch } from '../../lib/supabaseClient'
import { AdminShell } from '../AdminShell'
import { signedPhotoUrl } from '../../portal/lib/data'
import MemberProfileForm from '../../shared/MemberProfileForm'
import { TimelineView } from '../../portal/pages/DocView'
import { Field, Select, TextArea, ChoiceRow, Btn, ErrorNote, Spinner, StatusChip, DiamondRule, MicroLabel, money, fmtTime, labelClass } from '../../shared/ui'

const TABS = ['overview', 'intake', 'agreement', 'timeline', 'docs', 'payments', 'notes']
const SERVICES = [
  { value: 'hair', label: 'Hair' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'both', label: 'Hair & Makeup' },
]

// Review a pending submission; falls back to a direct update when a record
// has no pending queue row (e.g. Arsh edits long after approval).
async function review(kind, refId, status, message) {
  const { data: sub } = await supabase
    .from('submissions')
    .select('id')
    .eq('kind', kind)
    .eq('ref_id', refId)
    .eq('status', 'pending')
    .maybeSingle()
  if (sub) {
    await supabase.from('submissions').update({ status, message: message || null }).eq('id', sub.id)
    return
  }
  const table = kind === 'intake' ? 'intakes' : kind === 'party_member' ? 'party_members' : 'agreements'
  const patch = { status }
  if (kind === 'intake' && status === 'changes_requested') patch.review_message = message || null
  await supabase.from(table).update(patch).eq('id', refId)
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-[#EFE6DA] text-sm">
      <span className="text-[#7A6355] shrink-0">{label}</span>
      <span className="text-dark text-right break-words min-w-0">{value ?? '—'}</span>
    </div>
  )
}

/* ------------------------------- Overview ------------------------------- */

function OverviewTab({ client, notes, reload }) {
  const [form, setForm] = useState(client)
  const [difficulty, setDifficulty] = useState(notes?.difficulty || null)
  const [msg, setMsg] = useState('')
  const [invite, setInvite] = useState(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save() {
    setMsg('')
    const total = (Number(form.amount_services) || 0) + (Number(form.amount_travel) || 0)
    const retainer = Math.round(total * 0.3 * 100) / 100
    const patch = {
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      event_type: form.event_type,
      event_date: form.event_date || null,
      booked_time: form.booked_time || null,
      ready_time: form.ready_time || null,
      getting_ready_address: form.getting_ready_address,
      services: form.services || null,
      party_size: form.party_size === '' ? null : Number(form.party_size),
      amount_services: form.amount_services === '' ? null : Number(form.amount_services),
      amount_travel: form.amount_travel === '' ? null : Number(form.amount_travel),
      amount_total: total || null,
      amount_retainer: retainer || null,
      amount_balance: total ? Math.round((total - retainer) * 100) / 100 : null,
    }
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('clients').update(patch).eq('id', client.id),
      supabase.from('admin_notes').update({ difficulty }).eq('client_id', client.id),
    ])
    setMsg(e1 || e2 ? 'Could not save.' : 'Saved ✓')
    if (!e1 && !e2) reload()
  }

  async function reissue() {
    setBusy(true)
    try {
      const res = await authedFetch('/api/admin/create-client', { reissue: true, clientId: client.id })
      setInvite(res.registered ? { registered: true } : res)
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function archive() {
    const to = client.status === 'archived' ? 'active' : 'archived'
    await supabase
      .from('clients')
      .update({ status: to, archived_at: to === 'archived' ? new Date().toISOString() : null })
      .eq('id', client.id)
    reload()
  }

  async function hardDelete() {
    if (!window.confirm(`Permanently delete ${client.full_name}? Every form, photo, and login is erased.`)) return
    if (!window.confirm('This cannot be undone. Delete for good?')) return
    setBusy(true)
    try {
      await authedFetch('/api/admin/delete-client', { clientId: client.id })
      navigate('/admin')
    } catch (err) {
      setMsg(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="border border-[#C8B8AC] bg-[#FBF8F4] p-5">
        <MicroLabel className="mb-3">Portal access</MicroLabel>
        {client.user_id ? (
          <p className="text-sm text-[#4a6741]">Registered — she can sign in ✓</p>
        ) : invite?.inviteUrl ? (
          <div>
            <input
              readOnly
              value={invite.inviteUrl}
              onFocus={(e) => e.target.select()}
              className="w-full bg-transparent border-b border-[#A89080] py-2 text-sm text-dark focus:outline-none"
            />
            <Btn
              className="mt-3 !px-4 !py-2.5"
              onClick={() => navigator.clipboard.writeText(invite.inviteUrl).catch(() => {})}
            >
              Copy link
            </Btn>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-[#7A6355]">Not registered yet.</p>
            <Btn variant="gold" className="!px-4 !py-2.5" onClick={reissue} disabled={busy}>
              {busy ? '…' : 'New invite link'}
            </Btn>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Field label="Full name" value={form.full_name || ''} onChange={set('full_name')} />
        <Field label="Email" value={form.email || ''} onChange={set('email')} disabled={!!client.user_id} />
        <Field label="Phone" value={form.phone || ''} onChange={set('phone')} />
        <Select label="Services" options={SERVICES} value={form.services || ''} onChange={set('services')} />
        <Field label="Event type" value={form.event_type || ''} onChange={set('event_type')} />
        <Field label="Event date" type="date" value={form.event_date || ''} onChange={set('event_date')} />
        <Field label="Booked / call time" type="time" value={form.booked_time || ''} onChange={set('booked_time')} />
        <Field label="Ready-by time" type="time" value={form.ready_time || ''} onChange={set('ready_time')} />
        <Field label="Getting-ready address" value={form.getting_ready_address || ''} onChange={set('getting_ready_address')} />
        <Field label="Party size" type="number" value={form.party_size ?? ''} onChange={set('party_size')} />
        <Field label="Professional services ($)" type="number" step="0.01" value={form.amount_services ?? ''} onChange={set('amount_services')} />
        <Field label="Travel ($)" type="number" step="0.01" value={form.amount_travel ?? ''} onChange={set('amount_travel')} />
      </div>
      {client.user_id && (
        <p className="text-xs text-[#8A7A70] -mt-6">
          Email is her login and can’t be edited after registration. Amounts already signed for stay frozen in
          the agreement.
        </p>
      )}

      <ChoiceRow
        label="Client type"
        options={[
          { value: 'easy', label: 'Easy' },
          { value: 'medium', label: 'Medium' },
          { value: 'hard', label: 'Hard' },
        ]}
        value={difficulty}
        onChange={setDifficulty}
      />

      {msg && <p className="text-gold text-sm">{msg}</p>}
      <div className="flex flex-wrap gap-3">
        <Btn onClick={save}>Save changes</Btn>
        <Btn variant="outline" onClick={archive}>
          {client.status === 'archived' ? 'Restore client' : 'Archive client'}
        </Btn>
        <Btn variant="danger" onClick={hardDelete} disabled={busy}>
          Delete permanently
        </Btn>
      </div>
    </div>
  )
}

/* -------------------------------- Intake -------------------------------- */

function IntakeTab({ client, intake, members, reload }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const memberId = searchParams.get('member')
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')
  const [askChanges, setAskChanges] = useState(false)

  const selected = members.find((m) => m.id === memberId)

  useEffect(() => {
    setEditing(selected ? { ...selected } : null)
  }, [memberId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveMember() {
    const { id, client_id, created_at, updated_at, submitted_at, ...fields } = editing
    await supabase.from('party_members').update(fields).eq('id', id)
    setSearchParams({ tab: 'intake' })
    reload()
  }

  if (selected && editing) {
    return (
      <div>
        <button
          onClick={() => setSearchParams({ tab: 'intake' })}
          className="text-xs tracking-[0.2em] uppercase text-[#8A7A70] hover:text-gold cursor-pointer mb-6"
        >
          ← All profiles
        </button>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <h3 className="font-heading text-xl text-dark">
            {selected.name || 'Unnamed'} {selected.is_bride && '· Bride'}
          </h3>
          <StatusChip status={selected.status} />
        </div>
        <MemberProfileForm
          value={editing}
          onChange={setEditing}
          uploadFile={async (slot, file) => {
            const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
            const path = `${client.id}/members/${selected.id}/${slot}/${crypto.randomUUID()}.${ext}`
            const { error } = await supabase.storage.from('client-uploads').upload(path, file, { contentType: file.type })
            if (error) throw new Error('Upload failed')
            return { path }
          }}
          resolveUrl={signedPhotoUrl}
        />
        <div className="flex flex-wrap gap-3 mt-8">
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

  const p = intake?.payload || {}
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <MicroLabel>Event & booking details</MicroLabel>
          {intake ? <StatusChip status={intake.status} /> : <StatusChip status="draft" label="Not started" />}
        </div>
        <InfoRow label="Event type" value={p.event_type} />
        <InfoRow label="Event date" value={p.event_date} />
        <InfoRow label="Getting-ready address" value={p.getting_ready_address} />
        <InfoRow label="Call time" value={p.call_time ? fmtTime(p.call_time) : '—'} />
        <InfoRow label="Phone" value={p.phone} />
        <InfoRow label="Heard about us" value={p.referral_source} />
      </div>

      {intake?.status === 'pending' && (
        <div className="border border-[#C8B8AC] bg-[#FBF8F4] p-5">
          <MicroLabel className="mb-3">Review this intake</MicroLabel>
          {askChanges ? (
            <div className="flex flex-col gap-3">
              <TextArea
                label="What should she change?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Could you double-check the getting-ready address?"
              />
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
                <Btn variant="outline" onClick={() => setAskChanges(false)}>
                  Cancel
                </Btn>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Btn
                variant="gold"
                onClick={async () => {
                  await review('intake', intake.id, 'approved')
                  reload()
                }}
              >
                Approve intake
              </Btn>
              <Btn variant="outline" onClick={() => setAskChanges(true)}>
                Request changes
              </Btn>
            </div>
          )}
        </div>
      )}

      <div>
        <MicroLabel className="mb-3">Profiles ({members.length})</MicroLabel>
        <div className="flex flex-col gap-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 border border-[#C8B8AC] bg-[#FBF8F4] p-4">
              <button
                onClick={() => setSearchParams({ tab: 'intake', member: m.id })}
                className="flex-1 min-w-0 text-left cursor-pointer"
              >
                <h4 className="font-heading text-base text-dark truncate">
                  {m.name || 'Unnamed'} {m.is_bride && '· Bride'}
                </h4>
                <p className="text-xs text-[#8A7A70] truncate">
                  {[m.relation, m.services].filter(Boolean).join(' · ') || '—'}
                </p>
              </button>
              <StatusChip status={m.status} />
              {m.status === 'pending' && (
                <Btn
                  variant="gold"
                  className="!px-3 !py-2"
                  onClick={async () => {
                    await review('party_member', m.id, 'approved')
                    reload()
                  }}
                >
                  Approve
                </Btn>
              )}
            </div>
          ))}
        </div>
        {members.some((m) => m.status === 'pending') && (
          <Btn
            className="mt-4"
            onClick={async () => {
              for (const m of members.filter((x) => x.status === 'pending')) {
                await review('party_member', m.id, 'approved')
              }
              reload()
            }}
          >
            Approve all pending profiles
          </Btn>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ Agreement ------------------------------- */

function AgreementTab({ agreement, reload }) {
  if (!agreement) {
    return <p className="text-sm text-[#A89080] border border-dashed border-[#C8B8AC] p-8 text-center">Not signed yet — she signs in her portal.</p>
  }
  const s = agreement.snapshot || {}
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <MicroLabel>Signed agreement · v{agreement.version}</MicroLabel>
        <StatusChip
          status={agreement.status === 'approved' ? 'done' : 'pending'}
          label={agreement.status === 'approved' ? 'Confirmed' : 'Awaiting your confirmation'}
        />
      </div>
      <div>
        <InfoRow label="Signed by" value={<span className="font-heading italic">{agreement.signed_name}</span>} />
        <InfoRow label="Signed at" value={new Date(agreement.signed_at).toLocaleString('en-CA')} />
        <InfoRow label="Photo consent" value={agreement.photo_consent === 'agrees' ? 'Agrees' : 'Does not agree'} />
        <InfoRow label="IP / device" value={`${agreement.ip_address || '—'}`} />
        <InfoRow label="Total" value={money(s.amount_total)} />
        <InfoRow label="Retainer" value={money(s.amount_retainer)} />
        <InfoRow label="Balance" value={money(s.amount_balance)} />
      </div>
      {agreement.status !== 'approved' && (
        <Btn
          variant="gold"
          className="self-start"
          onClick={async () => {
            await review('agreement', agreement.id, 'approved')
            reload()
          }}
        >
          Confirm agreement
        </Btn>
      )}
    </div>
  )
}

/* ------------------------------- Timeline ------------------------------- */

function TimelineTab({ client, doc, reload }) {
  const empty = { time: '', artist: '', person: '', service: '' }
  const [entries, setEntries] = useState(doc?.content?.entries?.length ? doc.content.entries : [{ ...empty }])
  const [notes, setNotes] = useState(doc?.content?.notes || [])
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState(false)

  const setEntry = (i, k, v) => setEntries((cur) => cur.map((e, j) => (j === i ? { ...e, [k]: v } : e)))

  async function save(visible) {
    const content = { entries: entries.filter((e) => e.time || e.person || e.artist), notes }
    const patch = { content }
    if (visible != null) patch.visible = visible
    const { error } = await supabase.from('client_documents').update(patch).eq('id', doc.id)
    setMsg(error ? 'Could not save.' : visible ? 'Saved & published ✓' : 'Saved ✓')
    reload()
  }

  async function uploadPdf(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const path = `${client.id}/docs/timeline-${Date.now()}.pdf`
    const { error } = await supabase.storage.from('client-uploads').upload(path, file, { contentType: 'application/pdf' })
    if (error) setMsg('PDF upload failed.')
    else {
      await supabase.from('client_documents').update({ file_path: path }).eq('id', doc.id)
      setMsg('PDF attached ✓')
      reload()
    }
  }

  if (preview) {
    return (
      <div>
        <button onClick={() => setPreview(false)} className="text-xs tracking-[0.2em] uppercase text-[#8A7A70] hover:text-gold cursor-pointer mb-6">
          ← Back to editing
        </button>
        <TimelineView client={client} doc={{ ...doc, content: { entries, notes } }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <MicroLabel>The morning, artist by artist</MicroLabel>
        <StatusChip status={doc?.visible ? 'done' : 'draft'} label={doc?.visible ? 'Visible to client' : 'Hidden from client'} />
      </div>

      <div className="flex flex-col gap-4">
        {entries.map((e, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end border-b border-[#EFE6DA] pb-4">
            <Field label="Time" value={e.time} onChange={(ev) => setEntry(i, 'time', ev.target.value)} placeholder="7:00 – 8:00 am" />
            <Field label="Artist" value={e.artist} onChange={(ev) => setEntry(i, 'artist', ev.target.value)} placeholder="Arsh" />
            <Field label="Person" value={e.person} onChange={(ev) => setEntry(i, 'person', ev.target.value)} placeholder="Maddy (Bride)" />
            <Field label="Service" value={e.service} onChange={(ev) => setEntry(i, 'service', ev.target.value)} placeholder="Hair / Makeup" />
            <button
              onClick={() => setEntries((cur) => cur.filter((_, j) => j !== i))}
              aria-label="Remove row"
              className="text-[#8A7A70] hover:text-[#8a3a2a] text-lg pb-3 cursor-pointer"
            >
              ×
            </button>
          </div>
        ))}
        <Btn variant="outline" className="self-start !px-4 !py-2.5" onClick={() => setEntries((c) => [...c, { ...empty }])}>
          + Add row
        </Btn>
      </div>

      <div>
        <span className={labelClass}>Notes for a smooth morning</span>
        <div className="flex flex-col gap-2 mt-3">
          {notes.map((n, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-[#4A3828]">
              <span>—</span>
              <span className="flex-1">{n}</span>
              <button onClick={() => setNotes((c) => c.filter((_, j) => j !== i))} className="text-[#8A7A70] hover:text-[#8a3a2a] cursor-pointer">×</button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
              className="bg-transparent border-b border-[#C8B8AC] py-2 text-sm text-dark flex-1 focus:outline-none focus:border-gold"
            />
            <button
              onClick={() => {
                if (note.trim()) {
                  setNotes((c) => [...c, note.trim()])
                  setNote('')
                }
              }}
              className="text-[10px] tracking-[0.2em] uppercase text-gold cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {msg && <p className="text-gold text-sm">{msg}</p>}
      <div className="flex flex-wrap gap-3">
        <Btn onClick={() => save(null)}>Save draft</Btn>
        <Btn variant="gold" onClick={() => save(true)}>Save & publish to client</Btn>
        {doc?.visible && (
          <Btn variant="outline" onClick={() => save(false)}>Hide from client</Btn>
        )}
        <Btn variant="outline" onClick={() => setPreview(true)}>Preview</Btn>
      </div>
      <div className="border-t border-[#EFE6DA] pt-5">
        <label className="text-xs tracking-[0.15em] uppercase text-[#8A7A70] cursor-pointer hover:text-gold">
          {doc?.file_path ? 'Replace attached PDF' : 'Or attach a PDF instead'}
          <input type="file" accept="application/pdf" className="hidden" onChange={uploadPdf} />
        </label>
      </div>
    </div>
  )
}

/* --------------------------------- Docs --------------------------------- */

const DOC_LABELS = {
  agreement: 'Service agreement (signed copy)',
  timeline: 'Getting-ready timeline',
  hair_guide: 'Hair preparation guide',
  skin_guide: 'Skin preparation guide',
}

function DocsTab({ docs, reload }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[#7A6355] mb-2">
        What she can see in her portal right now. Guides publish automatically when the retainer arrives — you
        can always override here.
      </p>
      {['agreement', 'timeline', 'hair_guide', 'skin_guide'].map((type) => {
        const doc = docs.find((d) => d.doc_type === type)
        if (!doc) return null
        return (
          <div key={type} className="flex items-center justify-between gap-3 border border-[#C8B8AC] bg-[#FBF8F4] p-4">
            <span className="text-sm text-dark">{DOC_LABELS[type]}</span>
            <button
              onClick={async () => {
                await supabase.from('client_documents').update({ visible: !doc.visible }).eq('id', doc.id)
                reload()
              }}
              className={`px-4 py-2 text-[10px] tracking-[0.2em] uppercase border transition-colors cursor-pointer ${
                doc.visible ? 'border-gold bg-gold text-beige' : 'border-[#A89080] text-[#8A7A70]'
              }`}
            >
              {doc.visible ? 'Visible' : 'Hidden'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------- Payments -------------------------------- */

function PaymentsTab({ payments, reload }) {
  const [amounts, setAmounts] = useState(
    Object.fromEntries(payments.map((p) => [p.id, p.amount ?? '']))
  )
  return (
    <div className="flex flex-col gap-5">
      {['retainer', 'final'].map((kind) => {
        const p = payments.find((x) => x.kind === kind)
        if (!p) return null
        return (
          <div key={kind} className="border border-[#C8B8AC] bg-[#FBF8F4] p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h3 className="font-heading text-lg text-dark">{kind === 'retainer' ? 'Retainer (30%)' : 'Final balance'}</h3>
              <StatusChip status={p.status} />
            </div>
            <div className="flex items-end gap-4 flex-wrap">
              <Field
                label="Amount ($)"
                type="number"
                step="0.01"
                value={amounts[p.id]}
                onChange={(e) => setAmounts((a) => ({ ...a, [p.id]: e.target.value }))}
              />
              <Btn
                variant="outline"
                className="!px-4 !py-3"
                onClick={async () => {
                  await supabase
                    .from('payments')
                    .update({ amount: amounts[p.id] === '' ? null : Number(amounts[p.id]) })
                    .eq('id', p.id)
                  reload()
                }}
              >
                Save amount
              </Btn>
              {p.status === 'due' ? (
                <Btn
                  variant="gold"
                  className="!px-4 !py-3"
                  onClick={async () => {
                    await supabase
                      .from('payments')
                      .update({ status: 'received', received_at: new Date().toISOString() })
                      .eq('id', p.id)
                    reload()
                  }}
                >
                  Mark received
                </Btn>
              ) : (
                <Btn
                  variant="outline"
                  className="!px-4 !py-3"
                  onClick={async () => {
                    await supabase.from('payments').update({ status: 'due', received_at: null }).eq('id', p.id)
                    reload()
                  }}
                >
                  Undo
                </Btn>
              )}
            </div>
            {p.received_at && (
              <p className="text-xs text-[#8A7A70] mt-3">Received {new Date(p.received_at).toLocaleString('en-CA')}</p>
            )}
          </div>
        )
      })}
      <p className="text-xs text-[#8A7A70]">
        Marking the retainer received completes her payment step and unlocks the prep guides automatically.
      </p>
    </div>
  )
}

/* --------------------------------- Notes --------------------------------- */

function NotesTab({ notes, clientId }) {
  const [text, setText] = useState(notes?.notes || '')
  const [msg, setMsg] = useState('')
  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <p className="text-xs text-[#8A7A70]">Only you see this — never the client.</p>
      <textarea
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Preferences, reminders, anything worth remembering…"
        className="bg-[#FBF8F4] border border-[#C8B8AC] p-4 text-sm text-dark focus:outline-none focus:border-gold resize-y"
      />
      {msg && <p className="text-gold text-sm">{msg}</p>}
      <Btn
        className="self-start"
        onClick={async () => {
          const { error } = await supabase.from('admin_notes').update({ notes: text }).eq('client_id', clientId)
          setMsg(error ? 'Could not save.' : 'Saved ✓')
        }}
      >
        Save notes
      </Btn>
    </div>
  )
}

/* --------------------------------- Page ---------------------------------- */

export default function ClientDetail() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [client, notes, intakes, members, agreement, docs, payments] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).maybeSingle(),
      supabase.from('admin_notes').select('*').eq('client_id', id).maybeSingle(),
      supabase.from('intakes').select('*').eq('client_id', id).neq('status', 'superseded').order('version', { ascending: false }).limit(1),
      supabase.from('party_members').select('*').eq('client_id', id).order('is_bride', { ascending: false }).order('created_at'),
      supabase.from('agreements').select('*').eq('client_id', id).in('status', ['signed', 'approved']).order('version', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('client_documents').select('*').eq('client_id', id),
      supabase.from('payments').select('*').eq('client_id', id),
    ])
    if (!client.data) {
      setError('Client not found.')
      return
    }
    setData({
      client: client.data,
      notes: notes.data,
      intake: (intakes.data || [])[0] || null,
      members: members.data || [],
      agreement: agreement.data || null,
      docs: docs.data || [],
      payments: payments.data || [],
    })
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <AdminShell title="Client">
        <p className="text-sm text-[#7A6355]">{error} <Link to="/admin" className="text-gold underline">Back to clients</Link></p>
      </AdminShell>
    )
  }
  if (!data) {
    return (
      <AdminShell title="Client">
        <Spinner />
      </AdminShell>
    )
  }

  const { client } = data
  const timelineDoc = data.docs.find((d) => d.doc_type === 'timeline')

  return (
    <AdminShell title={client.full_name}>
      <div className="mb-2">
        <Link to="/admin" className="text-xs tracking-[0.2em] uppercase text-[#8A7A70] hover:text-gold">
          ← All clients
        </Link>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="font-heading text-3xl text-dark">{client.full_name}</h1>
        {client.status === 'archived' && <StatusChip status="locked" label="Archived" />}
      </div>
      <p className="text-sm text-[#7A6355] mt-1">
        {[client.event_type, client.event_date, client.email].filter(Boolean).join(' · ')}
      </p>

      <div className="flex gap-1 mt-8 border-b border-[#C8B8AC] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setSearchParams({ tab: t })}
            className={`px-4 py-3 text-[11px] tracking-[0.2em] uppercase whitespace-nowrap transition-colors cursor-pointer ${
              tab === t ? 'text-gold border-b-2 border-gold -mb-px' : 'text-[#8A7A70] hover:text-dark'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="py-8">
        {tab === 'overview' && <OverviewTab client={client} notes={data.notes} reload={load} />}
        {tab === 'intake' && <IntakeTab client={client} intake={data.intake} members={data.members} reload={load} />}
        {tab === 'agreement' && <AgreementTab agreement={data.agreement} reload={load} />}
        {tab === 'timeline' && timelineDoc && (
          <TimelineTab key={timelineDoc.updated_at} client={client} doc={timelineDoc} reload={load} />
        )}
        {tab === 'docs' && <DocsTab docs={data.docs} reload={load} />}
        {tab === 'payments' && <PaymentsTab key={data.payments.map((p) => p.status).join()} payments={data.payments} reload={load} />}
        {tab === 'notes' && <NotesTab notes={data.notes} clientId={client.id} />}
      </div>
    </AdminShell>
  )
}
