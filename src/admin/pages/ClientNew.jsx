import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authedFetch } from '../../lib/supabaseClient'
import { AdminShell } from '../AdminShell'
import { Field, Select, Btn, ErrorNote, DiamondRule, SectionHeading, MicroLabel } from '../../shared/ui'

const SERVICES = [
  { value: 'hair', label: 'Hair' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'both', label: 'Hair & Makeup' },
]

const EMPTY = {
  fullName: '',
  email: '',
  phone: '',
  eventType: 'Wedding',
  eventDate: '',
  readyTime: '',
  bookedTime: '',
  address: '',
  services: 'both',
  partySize: '',
  amountServices: '',
  amountTravel: '',
}

export default function ClientNew() {
  const [form, setForm] = useState(EMPTY)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const total = (Number(form.amountServices) || 0) + (Number(form.amountTravel) || 0)
  const retainer = Math.round(total * 0.3 * 100) / 100
  const balance = Math.round((total - retainer) * 100) / 100

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await authedFetch('/api/admin/create-client', {
        ...form,
        amountTotal: total || '',
        amountRetainer: retainer || '',
        amountBalance: balance || '',
      })
      setResult(res)
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
          <h1 className="font-heading text-3xl text-dark mb-6">{form.fullName}</h1>
          <DiamondRule className="mb-8" />
          <p className="text-sm text-[#7A6355] mb-4">
            Share this personal link with her — she opens it, sets a password, and her portal is live. It was
            also emailed to her, and it expires in 7 days.
          </p>
          <input
            readOnly
            value={result.inviteUrl}
            onFocus={(e) => e.target.select()}
            className="w-full bg-transparent border-b border-[#A89080] py-2 text-sm text-dark focus:outline-none text-center"
          />
          <div className="flex justify-center gap-3 mt-6">
            <Btn onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</Btn>
            <Btn variant="outline" onClick={() => navigate(`/admin/clients/${result.clientId}`)}>
              Open client
            </Btn>
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="New Client">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <SectionHeading eyebrow="New Client" title="Add a booking" />
        <Link to="/admin" className="text-xs tracking-[0.2em] uppercase text-[#8A7A70] hover:text-gold">
          ← All clients
        </Link>
      </div>
      <DiamondRule className="my-8" />
      <form onSubmit={submit} className="max-w-2xl flex flex-col gap-10">
        <div>
          <MicroLabel className="mb-4">Client</MicroLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="Full name" required value={form.fullName} onChange={set('fullName')} placeholder="Bride's full name" />
            <Field label="Email" type="email" required value={form.email} onChange={set('email')} placeholder="her@email.com" />
            <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 (000) 000-0000" />
            <Select label="Services" options={SERVICES} value={form.services} onChange={set('services')} />
          </div>
        </div>
        <div>
          <MicroLabel className="mb-4">Event</MicroLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="Event type" value={form.eventType} onChange={set('eventType')} placeholder="Wedding" />
            <Field label="Event date" type="date" value={form.eventDate} onChange={set('eventDate')} />
            <Field label="Booked / call time" type="time" value={form.bookedTime} onChange={set('bookedTime')} />
            <Field label="Ready-by time" type="time" value={form.readyTime} onChange={set('readyTime')} />
            <Field label="Getting-ready address" value={form.address} onChange={set('address')} placeholder="Street, city" />
            <Field label="Party size" type="number" min="1" value={form.partySize} onChange={set('partySize')} placeholder="e.g. 9" />
          </div>
        </div>
        <div>
          <MicroLabel className="mb-4">Quote</MicroLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="Professional services ($)" type="number" step="0.01" min="0" value={form.amountServices} onChange={set('amountServices')} placeholder="0.00" />
            <Field label="Travel ($)" type="number" step="0.01" min="0" value={form.amountTravel} onChange={set('amountTravel')} placeholder="0.00" />
          </div>
          {total > 0 && (
            <p className="text-xs text-[#8A7A70] mt-4">
              Total ${total.toFixed(2)} · Retainer (30%) ${retainer.toFixed(2)} · Balance ${balance.toFixed(2)}
            </p>
          )}
        </div>
        <ErrorNote>{error}</ErrorNote>
        <Btn type="submit" disabled={busy} className="self-start">
          {busy ? 'Creating…' : 'Create client & invite link'}
        </Btn>
      </form>
    </AdminShell>
  )
}
