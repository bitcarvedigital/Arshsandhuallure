import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { Btn, StatusChip, FormSection, ErrorNote, money, fmtShortDate, cellInputClass } from '../../../shared/ui'
import { summarizeBooking, paymentHistory, METHOD_LABELS, RETAINER_PERCENT } from '../../../shared/booking/pricing.js'
import PaymentsLedger from '../../../shared/booking/PaymentsLedger'
import InvoicePanel from './InvoicePanel'

const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
const noonIso = (d) => new Date(`${d}T12:00:00`).toISOString()

function SmallLabel({ children }) {
  return <span className="text-[10px] tracking-[0.2em] uppercase text-[#8A7A70]">{children}</span>
}

function MethodSelect({ value, onChange }) {
  return (
    <select className={cellInputClass + ' cursor-pointer'} value={value} onChange={(e) => onChange(e.target.value)}>
      {Object.entries(METHOD_LABELS).map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  )
}

function ReceiveForm({ payment, onDone }) {
  const [amount, setAmount] = useState(payment.amount ?? '')
  const [date, setDate] = useState(today())
  const [method, setMethod] = useState(payment.method || 'etransfer')
  const [err, setErr] = useState('')
  async function save() {
    setErr('')
    if (!(Number(amount) > 0)) return setErr('Enter the amount you received.')
    const { error } = await supabase
      .from('payments')
      .update({ status: 'received', amount: Number(amount), received_at: noonIso(date), method })
      .eq('id', payment.id)
    if (error) return setErr('Could not save — please try again.')
    onDone()
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3 items-end">
        <label className="flex flex-col gap-1"><SmallLabel>Amount ($)</SmallLabel>
          <input className={cellInputClass} type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1"><SmallLabel>Date</SmallLabel>
          <input className={cellInputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1"><SmallLabel>Method</SmallLabel>
          <MethodSelect value={method} onChange={setMethod} />
        </label>
      </div>
      <ErrorNote>{err}</ErrorNote>
      <Btn variant="gold" className="self-start !px-4 !py-2.5" onClick={save}>Mark received</Btn>
    </div>
  )
}

function PaymentBlock({ title, hint, payment, reload }) {
  const [open, setOpen] = useState(false)
  if (!payment) return null
  const received = payment.status === 'received'
  return (
    <FormSection
      title={title}
      hint={hint}
      action={<StatusChip status={payment.status} />}
    >
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <span className="font-heading text-2xl text-dark">{money(payment.amount)}</span>
        {received ? (
          <span className="text-xs text-[#8A7A70]">
            Received {fmtShortDate(payment.received_at)} · {METHOD_LABELS[payment.method] || payment.method}
          </span>
        ) : (
          <span className="text-xs text-[#8A7A70]">Worked out from the booking total</span>
        )}
      </div>
      {received ? (
        <Btn
          variant="outline"
          className="self-start !px-4 !py-2.5"
          onClick={async () => {
            if (!window.confirm('Mark this payment as not received?')) return
            await supabase.from('payments').update({ status: 'due', received_at: null }).eq('id', payment.id)
            reload()
          }}
        >
          Undo
        </Btn>
      ) : open ? (
        <ReceiveForm payment={payment} onDone={reload} />
      ) : (
        <Btn variant="gold" className="self-start !px-4 !py-2.5" onClick={() => setOpen(true)}>
          Record as received…
        </Btn>
      )}
    </FormSection>
  )
}

function InstallmentForm({ client, events, reload }) {
  const [label, setLabel] = useState('')
  const [eventId, setEventId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [method, setMethod] = useState('etransfer')
  const [err, setErr] = useState('')
  async function add() {
    setErr('')
    if (!(Number(amount) > 0)) return setErr('Enter the amount received.')
    const ev = events.find((e) => e.id === eventId)
    const { error } = await supabase.from('payments').insert({
      client_id: client.id,
      kind: 'installment',
      status: 'received',
      amount: Number(amount),
      received_at: noonIso(date),
      method,
      event_id: eventId || null,
      label: label.trim() || (ev ? `${ev.name || ev.event_type} payment` : 'Payment'),
    })
    if (error) return setErr('Could not record it — please try again.')
    setLabel('')
    setAmount('')
    setEventId('')
    reload()
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1"><SmallLabel>What it’s for</SmallLabel>
          <input className={cellInputClass} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Mehndi balance" />
        </label>
        <label className="flex flex-col gap-1"><SmallLabel>Event (optional)</SmallLabel>
          <select className={cellInputClass + ' cursor-pointer'} value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Whole booking</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name || e.event_type} · {fmtShortDate(e.event_date)}</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3 items-end">
        <label className="flex flex-col gap-1"><SmallLabel>Amount ($)</SmallLabel>
          <input className={cellInputClass} type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1"><SmallLabel>Date</SmallLabel>
          <input className={cellInputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1"><SmallLabel>Method</SmallLabel>
          <MethodSelect value={method} onChange={setMethod} />
        </label>
      </div>
      <ErrorNote>{err}</ErrorNote>
      <Btn variant="outline" className="self-start !px-4 !py-2.5" onClick={add}>+ Record payment</Btn>
    </div>
  )
}

export default function PaymentsTab(props) {
  const { client, payments, events, lines, reload } = props
  const summary = summarizeBooking(events, lines, payments)
  const retainer = payments.find((p) => p.kind === 'retainer')
  const final = payments.find((p) => p.kind === 'final')
  const installments = payments.filter((p) => p.kind === 'installment')
  const history = paymentHistory(payments, events)

  return (
    <div>
      <FormSection title="Summary">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            ['Total booking', summary.total],
            ['Paid to date', summary.paid],
            ['Outstanding', summary.outstanding],
            ['Final balance due', final?.status === 'received' ? 0 : final?.amount],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#8A7A70]">{l}</p>
              <p className="font-heading text-xl text-dark mt-1">{money(v)}</p>
            </div>
          ))}
        </div>
      </FormSection>

      <PaymentBlock
        title={`Retainer (${RETAINER_PERCENT}%)`}
        hint="Marking it received completes her payment step and reveals the prep guides that match her booking."
        payment={retainer}
        reload={reload}
      />
      <PaymentBlock
        title="Final balance"
        hint="Whatever is left after the retainer and any other payments."
        payment={final}
        reload={reload}
      />

      <FormSection title="Other payments" hint="Part-payments, cash on the day, a balance for one event — each one comes off the final balance.">
        {installments.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-b border-[#EFE6DA] pb-3 text-sm">
            <div className="flex-1 min-w-0">
              <p className="text-dark">{p.label}</p>
              <p className="text-xs text-[#8A7A70]">{fmtShortDate(p.received_at)} · {METHOD_LABELS[p.method] || p.method}</p>
            </div>
            <span>{money(p.amount)}</span>
            <button
              onClick={async () => {
                if (!window.confirm(`Delete “${p.label}” (${money(p.amount)})?`)) return
                await supabase.from('payments').delete().eq('id', p.id)
                reload()
              }}
              className="text-[#8A7A70] hover:text-[#8a3a2a] text-lg px-1 cursor-pointer"
              aria-label="Delete payment"
            >
              ×
            </button>
          </div>
        ))}
        <InstallmentForm client={client} events={events} reload={reload} />
      </FormSection>

      <FormSection title="Payment history" hint="Exactly what she sees on her agreement and payments page.">
        <PaymentsLedger history={history} total={summary.total} paid={summary.paid} outstanding={summary.outstanding} />
      </FormSection>

      <InvoicePanel {...props} summary={summary} />
    </div>
  )
}
