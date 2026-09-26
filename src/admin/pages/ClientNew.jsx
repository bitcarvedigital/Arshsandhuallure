import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, authedFetch } from '../../lib/supabaseClient'
import { AdminShell } from '../AdminShell'
import { Field, Btn, ErrorNote, DiamondRule, SectionHeading, MicroLabel, FormSection } from '../../shared/ui'
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
    return (
      <AdminShell title="Client Created">
        <div className="max-w-lg mx-auto text-center py-10">
          <MicroLabel className="mb-3">Client created</MicroLabel>
          <h1 className="font-heading text-3xl text-dark mb-6">{details.fullName}</h1>
          <DiamondRule className="mb-8" />
          <p className="text-sm text-[#7A6355] mb-4">
            Share this personal link with her — she opens it, sets a password, and her portal is live. It was
            also emailed to her, and it expires in 7 days.
          </p>
          <input readOnly value={result.inviteUrl} onFocus={(e) => e.target.select()} className="w-full bg-transparent border-b border-[#A89080] py-2 text-sm text-dark focus:outline-none text-center" />
          <div className="flex justify-center gap-3 mt-6">
            <Btn onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</Btn>
            <Btn variant="outline" onClick={() => navigate(`/admin/clients/${result.clientId}`)}>Open client</Btn>
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="New Client">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <SectionHeading eyebrow="New Client" title="Add a booking" />
        <Link to="/admin" className="text-xs tracking-[0.2em] uppercase text-[#8A7A70] hover:text-gold">← All clients</Link>
      </div>
      <DiamondRule className="my-8" />
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

        <ErrorNote>{error}</ErrorNote>
        <Btn type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create client & send invite'}
        </Btn>
        <p className="text-xs text-[#8A7A70] mt-3">You can change events and prices any time from her Overview.</p>
      </form>
    </AdminShell>
  )
}
