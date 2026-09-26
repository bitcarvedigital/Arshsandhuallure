import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, authedFetch } from '../../lib/supabaseClient'
import { AdminShell } from '../AdminShell'
import { Field, Btn, ErrorNote, MicroLabel, FormSection, fieldClass, softPanel } from '../../shared/ui'
import { PageHeader } from '../adminUi'
import { parsePriceList } from '../../shared/booking/services.js'
import BookingEditor, { BookingSummary, newEvent, toPayload } from './client/BookingEditor'

export default function ClientNew() {
  const [details, setDetails] = useState({ fullName: '', email: '', phone: '' })
  const [events, setEvents] = useState([newEvent('Wedding')])
  const [priceList, setPriceList] = useState(parsePriceList(null))
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'price_list')
      .maybeSingle()
      .then(({ data }) => setPriceList(parsePriceList(data?.value)))
  }, [])

  const set = (k) => (e) => setDetails((d) => ({ ...d, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await authedFetch('/api/admin/create-client', { ...details, events: toPayload(events) })
      setResult(res)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* input below is selectable */ }
  }

  if (result) {
    const firstName = details.fullName.trim().split(' ')[0] || 'her'
    return (
      <AdminShell title="Client Created">
        <div className="max-w-lg mx-auto text-center py-6 sm:py-10">
          <MicroLabel className="mb-3">Client created</MicroLabel>
          <h1 className="font-heading text-3xl text-dark">{details.fullName}</h1>
          <p className="text-sm text-muted mt-3 leading-relaxed">
            Share this personal link with {firstName} — she opens it, sets a password, and her portal is live. It was
            also emailed to her, and it expires in 7 days.
          </p>
          <div className={`${softPanel} mt-8 px-5 py-5`}>
            <label htmlFor="invite-url" className="text-[10px] tracking-[0.2em] uppercase text-faint">
              Her invite link
            </label>
            <input
              id="invite-url"
              readOnly
              value={result.inviteUrl}
              onFocus={(e) => e.target.select()}
              className={`${fieldClass} text-center`}
            />
          </div>
          <div className="flex justify-center flex-wrap gap-3 mt-8">
            <Btn onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</Btn>
            <Btn variant="outline" onClick={() => navigate(`/admin/clients/${result.clientId}`)}>Open client</Btn>
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="New Client">
      <PageHeader
        back={{ to: '/admin', label: 'All clients' }}
        eyebrow="New client"
        title="Add a booking"
        intro="Her details and everything she’s booked. She gets an invite to her portal the moment you create her."
      />
      <form onSubmit={submit} className="max-w-3xl">
        <FormSection title="Client details" hint="She receives her invite at this email — it becomes her login.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="Full name" required value={details.fullName} onChange={set('fullName')} placeholder="Bride's full name" />
            <Field label="Phone" type="tel" value={details.phone} onChange={set('phone')} placeholder="+1 (000) 000-0000" />
          </div>
          <Field label="Email" type="email" required value={details.email} onChange={set('email')} placeholder="her@email.com" />
        </FormSection>

        <BookingEditor events={events} onChange={setEvents} priceList={priceList} />

        <FormSection title="Booking summary">
          <BookingSummary events={events} />
        </FormSection>

        <div className="flex flex-col items-start gap-3">
          <ErrorNote>{error}</ErrorNote>
          <Btn type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create client & send invite'}
          </Btn>
          <p className="text-xs text-faint">You can change events and prices any time from her Overview.</p>
        </div>
      </form>
    </AdminShell>
  )
}
