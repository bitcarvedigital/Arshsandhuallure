import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, authedFetch } from '../../../lib/supabaseClient'
import { Field, ChoiceRow, Btn, FormSection, SectionsProvider, money, softNote, fieldClass } from '../../../shared/ui'
import { bookingFromLegacyClient } from '../../../shared/booking/pricing.js'
import BookingEditor, { BookingSummary, toEditable, toPayload } from './BookingEditor'

const withKeys = (events) =>
  events.map((e) => ({ ...e, key: crypto.randomUUID(), lines: e.lines.map((l) => ({ ...l, key: crypto.randomUUID() })) }))

export default function OverviewTab({ client, notes, events, lines, payments, agreement, priceList, reload }) {
  const initialEvents = useMemo(
    () => (events.length ? toEditable(events, lines) : withKeys(bookingFromLegacyClient(client))),
    [events, lines, client],
  )
  const [details, setDetails] = useState({ full_name: client.full_name || '', email: client.email || '', phone: client.phone || '' })
  const [difficulty, setDifficulty] = useState(notes?.difficulty || null)
  const [booking, setBooking] = useState(initialEvents)
  const [dirty, setDirty] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [invite, setInvite] = useState(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  const touch = (fn) => (...args) => {
    setDirty(true)
    setMsg('')
    fn(...args)
  }
  const setDetail = (k) => touch((e) => setDetails((d) => ({ ...d, [k]: e.target.value })))

  const signedTotal = agreement?.snapshot?.totals?.total ?? agreement?.snapshot?.amount_total
  const changedSinceSigning =
    agreement && signedTotal != null && client.amount_total != null && Number(signedTotal) !== Number(client.amount_total)

  async function save() {
    setErr('')
    setMsg('')
    if (!details.full_name.trim()) return setErr('Please add the client’s name.')
    setBusy(true)
    const { error: e1 } = await supabase
      .from('clients')
      .update({ full_name: details.full_name.trim(), phone: details.phone.trim(), ...(client.user_id ? {} : { email: details.email.trim().toLowerCase() }) })
      .eq('id', client.id)
    const { error: e2 } = await supabase.from('admin_notes').update({ difficulty }).eq('client_id', client.id)
    const { error: e3 } = await supabase.rpc('admin_save_booking', { p_client_id: client.id, p_events: toPayload(booking) })
    setBusy(false)
    if (e1 || e2 || e3) {
      console.error(e1 || e2 || e3)
      setErr(`Could not save — ${(e1 || e2 || e3).message || 'please try again'}.`)
      return
    }
    setDirty(false)
    setMsg('Saved ✓')
    reload()
  }

  async function reissue() {
    setBusy(true)
    try {
      const res = await authedFetch('/api/admin/create-client', { reissue: true, clientId: client.id })
      setInvite(res.registered ? { registered: true } : res)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function archive() {
    const to = client.status === 'archived' ? 'active' : 'archived'
    await supabase.from('clients').update({ status: to, archived_at: to === 'archived' ? new Date().toISOString() : null }).eq('id', client.id)
    reload()
  }

  async function hardDelete() {
    if (!window.confirm(`Permanently delete ${client.full_name}? Every form, photo, and login is erased.`)) return
    if (!window.confirm('This cannot be undone. Delete for good?')) return
    setBusy(true)
    try {
      await authedFetch('/api/admin/delete-client', { clientId: client.id })
      navigate('/admin')
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }


  const firstName = client.full_name.split(' ')[0]

  return (
    <SectionsProvider>
      <div className="pb-24">
        {changedSinceSigning && (
          <div className={`${softNote} mb-12 flex items-start gap-3`} role="note">
            <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0 mt-2" aria-hidden="true" />
            <p>
              <span className="text-dark">The booking total has changed since {firstName} signed her agreement</span>{' '}
              ({money(signedTotal)} → {money(client.amount_total)}). Her signed agreement still shows the earlier amount —
              let her know about the change.
            </p>
          </div>
        )}

        <FormSection title="Client details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="Full name" required value={details.full_name} onChange={setDetail('full_name')} />
            <Field label="Phone" type="tel" value={details.phone} onChange={setDetail('phone')} placeholder="+1 (000) 000-0000" />
          </div>
          <div className="flex flex-col gap-3">
            <Field label="Email" type="email" value={details.email} onChange={setDetail('email')} disabled={!!client.user_id} />
            {client.user_id && (
              <p className="text-xs text-faint">Her email is her login, so it can’t be changed after she registers.</p>
            )}
          </div>
        </FormSection>

        <FormSection title="Portal access">
          {client.user_id ? (
            <p className="text-sm text-success">Registered — she can sign in ✓</p>
          ) : invite?.inviteUrl ? (
            <div className="flex flex-col gap-3">
              <label htmlFor="reissued-invite" className="text-xs text-faint">
                New invite link — also emailed to her, valid for 7 days.
              </label>
              <input id="reissued-invite" readOnly value={invite.inviteUrl} onFocus={(e) => e.target.select()} className={fieldClass} />
              <Btn
                size="sm"
                variant="outline"
                className="self-start"
                onClick={() =>
                  navigator.clipboard
                    .writeText(invite.inviteUrl)
                    .then(() => {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    })
                    .catch(() => {})
                }
              >
                {copied ? 'Copied ✓' : 'Copy link'}
              </Btn>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted">Not registered yet.</p>
              <Btn variant="outline" size="sm" onClick={reissue} disabled={busy}>
                {busy ? '…' : 'New invite link'}
              </Btn>
            </div>
          )}
        </FormSection>

        <FormSection title="Client type" hint="Only you see this.">
          <ChoiceRow
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ]}
            value={difficulty}
            onChange={touch(setDifficulty)}
          />
        </FormSection>

        <BookingEditor events={booking} onChange={touch(setBooking)} priceList={priceList} scope={client.id} collapseEvents />

        <FormSection title="Booking summary" hint="All events together. Updates as you type; saved when you press Save.">
          <BookingSummary events={booking} payments={payments} />
        </FormSection>

        <FormSection
          title="Manage client"
          hint="Archiving moves her out of your upcoming list — you can restore her any time. Deleting erases everything for good."
        >
          <div className="flex flex-wrap gap-3">
            <Btn variant="outline" size="sm" onClick={archive}>
              {client.status === 'archived' ? 'Restore client' : 'Archive client'}
            </Btn>
            <Btn variant="danger" size="sm" onClick={hardDelete} disabled={busy}>
              Delete permanently
            </Btn>
          </div>
        </FormSection>

        <div className="fixed bottom-0 inset-x-0 z-30 bg-beige/95 backdrop-blur border-t border-line print:hidden">
          <div className="max-w-4xl mx-auto px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-4">
            <p className="text-xs min-w-0 flex items-center gap-2" role="status">
              {err ? (
                <span className="text-danger">{err}</span>
              ) : dirty ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" aria-hidden="true" />
                  <span className="text-dark">Unsaved changes</span>
                </>
              ) : (
                <span className="text-muted">{msg || 'All changes saved'}</span>
              )}
            </p>
            <Btn size="sm" onClick={save} disabled={busy || !dirty} className="shrink-0">
              {busy ? 'Saving…' : 'Save booking'}
            </Btn>
          </div>
        </div>
      </div>
    </SectionsProvider>
  )
}
