import { useMemo } from 'react'
import { Field, Select, TextArea, FormSection, Btn, money, fmtShortDate, cellInputClass, labelClass } from '../../../shared/ui'
import { EVENT_TYPES, SERVICE_LABELS } from '../../../shared/booking/services.js'
import { summarizeBooking, lineAmount, RETAINER_PERCENT } from '../../../shared/booking/pricing.js'

// Editable booking = [{ id?, key, name, event_type, event_date, start_time, ready_time,
//   address, party_size, client_note, lines: [{ id?, key, kind, code, label, qty,
//   unit_price, service, for_bride, minutes }] }]
// Saved through the admin_save_booking() RPC (see OverviewTab / create-client).

const key = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()))
const QUICK_EVENTS = ['Mehndi', 'Jaggo', 'Sangeet', 'Maiyan', 'Wedding', 'Reception']

export function newEvent(name = 'Wedding') {
  const type = EVENT_TYPES.includes(name) ? name : 'Other'
  return {
    key: key(), name, event_type: type, event_date: '', start_time: '', ready_time: '', address: '',
    party_size: '', client_note: '', lines: [],
  }
}

// DB rows → editable shape
export function toEditable(events = [], lines = []) {
  return [...events]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((e) => ({
      id: e.id, key: e.id, name: e.name || '', event_type: e.event_type || 'Wedding',
      event_date: e.event_date || '', start_time: (e.start_time || '').slice(0, 5), ready_time: (e.ready_time || '').slice(0, 5),
      address: e.address || '', party_size: e.party_size ?? '', client_note: e.client_note || '',
      lines: lines
        .filter((l) => l.event_id === e.id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((l) => ({ ...l, key: l.id, qty: Number(l.qty), unit_price: Number(l.unit_price) })),
    }))
}

// editable shape → RPC payload
export function toPayload(events) {
  return events.map((e) => ({
    id: e.id || null,
    name: (e.name || '').trim() || e.event_type || 'Event',
    event_type: e.event_type || 'Other',
    event_date: e.event_date || '',
    start_time: e.start_time || '',
    ready_time: e.ready_time || '',
    address: e.address || '',
    party_size: e.party_size === '' || e.party_size == null ? '' : String(e.party_size),
    client_note: e.client_note || '',
    lines: e.lines
      .filter((l) => (l.label || '').trim() && (l.kind === 'service' || Number(l.unit_price) > 0))
      .map((l) => ({
        id: l.id || null, kind: l.kind, code: l.code || '', label: l.label.trim(),
        qty: String(l.qty === '' || l.qty == null ? 1 : l.qty),
        unit_price: String(l.unit_price === '' || l.unit_price == null ? 0 : l.unit_price),
        service: l.kind === 'service' ? l.service || '' : '',
        for_bride: l.kind === 'service' ? !!l.for_bride : false,
        minutes: l.minutes == null || l.minutes === '' ? '' : String(l.minutes),
      })),
  }))
}

// editable shape → rows shaped like the DB (for summarizeBooking)
function asRows(events) {
  const evs = events.map((e, i) => ({ ...e, id: e.key, sort_order: i }))
  const lines = events.flatMap((e) =>
    e.lines
      .filter((l) => l.kind === 'service' || Number(l.unit_price) > 0)
      .map((l, j) => ({ ...l, event_id: e.key, sort_order: j, qty: Number(l.qty) || 0, unit_price: Number(l.unit_price) || 0 })),
  )
  return { evs, lines }
}

function SmallLabel({ children }) {
  return <span className="text-[10px] tracking-[0.2em] uppercase text-[#8A7A70]">{children}</span>
}

function RemoveBtn({ onClick, label = 'Remove' }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="text-[#8A7A70] hover:text-[#8a3a2a] text-lg leading-none px-1 cursor-pointer">
      ×
    </button>
  )
}

function EventEditor({ event, index, count, priceList, onChange, onRemove, onMove, onDuplicate }) {
  const set = (patch) => onChange({ ...event, ...patch })
  const setLine = (k, patch) => set({ lines: event.lines.map((l) => (l.key === k ? { ...l, ...patch } : l)) })
  const removeLine = (k) => set({ lines: event.lines.filter((l) => l.key !== k) })
  const addLine = (line) => set({ lines: [...event.lines, { key: key(), qty: 1, unit_price: '', ...line }] })

  const services = event.lines.filter((l) => l.kind === 'service')
  const fees = event.lines.filter((l) => l.kind === 'fee')
  const discounts = event.lines.filter((l) => l.kind === 'discount')
  const serviceOptions = priceList.filter((p) => p.kind === 'service')
  const standardFees = priceList.filter((p) => p.kind === 'fee' && p.code !== 'other_fee')

  const { evs, lines } = asRows([event])
  const summary = summarizeBooking(evs, lines)
  const ev = summary.events[0]

  function pickService(lineKey, code) {
    if (code === '__custom') return setLine(lineKey, { code: '', label: '', service: 'both', for_bride: false })
    const p = priceList.find((x) => x.code === code)
    if (!p) return
    const cur = event.lines.find((l) => l.key === lineKey)
    setLine(lineKey, {
      code: p.code, label: p.label, service: p.service, for_bride: !!p.for_bride, minutes: p.minutes ?? null,
      unit_price: cur?.unit_price === '' || cur?.unit_price == null ? (p.price ?? '') : cur.unit_price,
    })
  }

  function feeFor(code) {
    return fees.find((l) => l.code === code)
  }
  function setStandardFee(p, patch) {
    const existing = feeFor(p.code)
    if (existing) setLine(existing.key, patch)
    else addLine({ kind: 'fee', code: p.code, label: p.label, unit_price: '', ...patch })
  }

  const title = (event.name || event.event_type || 'Event').trim()

  return (
    <div className="border-t-2 border-dark pt-6 mb-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold">Event {index + 1} of {count}</p>
          <h3 className="font-heading text-2xl text-dark mt-1">
            {title} <span className="text-base text-[#8A7A70]">· {fmtShortDate(event.event_date)}</span>
          </h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="px-2 py-1 text-[#8A7A70] hover:text-gold disabled:opacity-30 cursor-pointer">↑ Up</button>
          <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} className="px-2 py-1 text-[#8A7A70] hover:text-gold disabled:opacity-30 cursor-pointer">↓ Down</button>
          <button type="button" onClick={onDuplicate} className="px-2 py-1 text-[#8A7A70] hover:text-gold cursor-pointer">Duplicate</button>
          <button type="button" onClick={onRemove} className="px-2 py-1 text-[#8a3a2a] hover:underline cursor-pointer">Remove</button>
        </div>
      </div>

      <FormSection title="Event details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Select
            label="Event type"
            options={EVENT_TYPES.map((t) => ({ value: t, label: t }))}
            value={event.event_type}
            onChange={(e) => {
              const t = e.target.value
              const renamed = !event.name || event.name === event.event_type
              set({ event_type: t, ...(renamed && t !== 'Other' ? { name: t } : {}) })
            }}
          />
          <Field label="Event name" value={event.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Simran’s Mehndi" />
          <Field label="Event date" type="date" value={event.event_date} onChange={(e) => set({ event_date: e.target.value })} />
          <Field label="Party size (people styled)" type="number" min="0" value={event.party_size} onChange={(e) => set({ party_size: e.target.value })} placeholder={`${ev.hairCount || ev.makeupCount ? Math.max(ev.hairCount, ev.makeupCount) : ''}`} />
          <Field label="Artist arrives / start time" type="time" value={event.start_time} onChange={(e) => set({ start_time: e.target.value })} />
          <Field label="Everyone ready by" type="time" value={event.ready_time} onChange={(e) => set({ ready_time: e.target.value })} />
        </div>
        <Field label="Getting-ready address" value={event.address} onChange={(e) => set({ address: e.target.value })} placeholder="Street, city" />
        <TextArea label="Note for the client (she sees this)" rows={2} value={event.client_note} onChange={(e) => set({ client_note: e.target.value })} placeholder="e.g. Please have good natural light near a window." />
      </FormSection>

      <FormSection
        title="Services booked"
        hint="What’s booked and for how many people. Prices go in the next section."
        action={
          (ev.hairCount > 0 || ev.makeupCount > 0) && (
            <span className="text-[11px] text-dark">
              Hair <strong>{ev.hairCount}</strong> · Makeup <strong>{ev.makeupCount}</strong>
            </span>
          )
        }
      >
        {services.length === 0 && <p className="text-sm text-[#A89080]">No services yet.</p>}
        {services.map((l) => {
          const custom = !l.code
          return (
            <div key={l.key} className="flex flex-col gap-3 border-b border-[#EFE6DA] pb-4">
              <div className="flex items-end gap-3">
                <label className="flex-1 min-w-0 flex flex-col gap-1">
                  <SmallLabel>Service</SmallLabel>
                  <select
                    className={cellInputClass + ' cursor-pointer'}
                    value={custom ? '__custom' : l.code}
                    onChange={(e) => pickService(l.key, e.target.value)}
                  >
                    {serviceOptions.map((p) => (
                      <option key={p.code} value={p.code}>{p.label}</option>
                    ))}
                    <option value="__custom">Custom service…</option>
                  </select>
                </label>
                <label className="w-20 flex flex-col gap-1">
                  <SmallLabel>How many</SmallLabel>
                  <input className={cellInputClass} type="number" min="0" step="1" inputMode="numeric" value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} />
                </label>
                <RemoveBtn onClick={() => removeLine(l.key)} />
              </div>
              {custom && (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                  <label className="flex flex-col gap-1">
                    <SmallLabel>Name of service</SmallLabel>
                    <input className={cellInputClass} value={l.label} onChange={(e) => setLine(l.key, { label: e.target.value })} placeholder="e.g. Saree draping + hair" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <SmallLabel>Type</SmallLabel>
                    <select className={cellInputClass + ' cursor-pointer'} value={l.service || ''} onChange={(e) => setLine(l.key, { service: e.target.value || null })}>
                      <option value="hair">Hair</option>
                      <option value="makeup">Makeup</option>
                      <option value="both">Hair & Makeup</option>
                      <option value="">Neither (add-on)</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-dark pb-2 cursor-pointer">
                    <input type="checkbox" className="accent-[#7A5A32]" checked={!!l.for_bride} onChange={(e) => setLine(l.key, { for_bride: e.target.checked })} />
                    For the bride
                  </label>
                </div>
              )}
            </div>
          )
        })}
        <div className="flex flex-wrap gap-2">
          <Btn type="button" variant="outline" className="!px-4 !py-2.5" onClick={() => {
            const first = serviceOptions.find((p) => !p.for_bride) || serviceOptions[0]
            addLine({ kind: 'service', code: first?.code || '', label: first?.label || '', service: first?.service ?? 'both', for_bride: !!first?.for_bride, minutes: first?.minutes ?? null, unit_price: first?.price ?? '' })
          }}>
            + Add service
          </Btn>
        </div>
      </FormSection>

      <FormSection title="Service prices" hint="Price per person for each service above.">
        {services.length === 0 && <p className="text-sm text-[#A89080]">Add a service above to price it.</p>}
        {services.map((l) => (
          <div key={l.key} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 items-end border-b border-[#EFE6DA] pb-3">
            <div className="min-w-0">
              <p className="text-sm text-dark truncate">{l.label || 'Custom service'}</p>
              <p className="text-[11px] text-[#8A7A70]">
                {[SERVICE_LABELS[l.service], l.for_bride ? 'Bride' : null, `× ${l.qty || 0}`].filter(Boolean).join(' · ')}
              </p>
            </div>
            <label className="w-28 flex flex-col gap-1">
              <SmallLabel>Each ($)</SmallLabel>
              <input className={cellInputClass} type="number" min="0" step="0.01" inputMode="decimal" value={l.unit_price} onChange={(e) => setLine(l.key, { unit_price: e.target.value })} placeholder="0.00" />
            </label>
            <p className="col-span-2 sm:col-span-1 sm:w-24 text-right text-sm text-dark pb-2">{money(lineAmount({ qty: Number(l.qty) || 0, unit_price: Number(l.unit_price) || 0 }))}</p>
          </div>
        ))}
      </FormSection>

      <FormSection title="Additional fees" hint="Leave a fee blank if it doesn’t apply.">
        {standardFees.map((p) => {
          const l = feeFor(p.code)
          return (
            <div key={p.code} className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1 items-end border-b border-[#EFE6DA] pb-3">
              <p className="text-sm text-dark pb-2">{p.label}</p>
              <label className="w-16 flex flex-col gap-1">
                <SmallLabel>Qty</SmallLabel>
                <input className={cellInputClass} type="number" min="0" step="1" value={l?.qty ?? 1} onChange={(e) => setStandardFee(p, { qty: e.target.value })} />
              </label>
              <label className="w-28 flex flex-col gap-1">
                <SmallLabel>Amount ($)</SmallLabel>
                <input className={cellInputClass} type="number" min="0" step="0.01" inputMode="decimal" value={l?.unit_price ?? ''} onChange={(e) => setStandardFee(p, { unit_price: e.target.value })} placeholder="—" />
              </label>
              <p className="col-span-3 sm:col-span-1 sm:w-24 text-right text-sm text-dark pb-2">{l && Number(l.unit_price) > 0 ? money(lineAmount({ qty: Number(l.qty) || 0, unit_price: Number(l.unit_price) })) : '—'}</p>
            </div>
          )
        })}
        {fees.filter((l) => !standardFees.some((p) => p.code === l.code)).map((l) => (
          <div key={l.key} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-end border-b border-[#EFE6DA] pb-3">
            <label className="flex flex-col gap-1 min-w-0">
              <SmallLabel>Other fee</SmallLabel>
              <input className={cellInputClass} value={l.label} onChange={(e) => setLine(l.key, { label: e.target.value })} placeholder="e.g. Hotel stay" />
            </label>
            <label className="w-16 flex flex-col gap-1">
              <SmallLabel>Qty</SmallLabel>
              <input className={cellInputClass} type="number" min="0" step="1" value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} />
            </label>
            <label className="w-28 flex flex-col gap-1">
              <SmallLabel>Amount ($)</SmallLabel>
              <input className={cellInputClass} type="number" min="0" step="0.01" inputMode="decimal" value={l.unit_price} onChange={(e) => setLine(l.key, { unit_price: e.target.value })} placeholder="0.00" />
            </label>
            <RemoveBtn onClick={() => removeLine(l.key)} />
          </div>
        ))}
        <Btn type="button" variant="outline" className="self-start !px-4 !py-2.5" onClick={() => addLine({ kind: 'fee', code: 'other_fee', label: '' })}>
          + Add another fee
        </Btn>

        <div className="grid grid-cols-[1fr_auto] gap-x-4 items-end pt-2">
          <label className="flex flex-col gap-1 min-w-0">
            <SmallLabel>Discount (optional)</SmallLabel>
            <input
              className={cellInputClass}
              value={discounts[0]?.label ?? 'Discount'}
              onChange={(e) => (discounts[0] ? setLine(discounts[0].key, { label: e.target.value }) : addLine({ kind: 'discount', code: 'discount', label: e.target.value }))}
            />
          </label>
          <label className="w-28 flex flex-col gap-1">
            <SmallLabel>Amount off ($)</SmallLabel>
            <input
              className={cellInputClass}
              type="number" min="0" step="0.01" inputMode="decimal" placeholder="—"
              value={discounts[0]?.unit_price ?? ''}
              onChange={(e) => (discounts[0] ? setLine(discounts[0].key, { unit_price: e.target.value }) : addLine({ kind: 'discount', code: 'discount', label: 'Discount', unit_price: e.target.value }))}
            />
          </label>
        </div>
      </FormSection>

      <FormSection title="Event total">
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between"><span className="text-[#7A6355]">Services</span><span>{money(ev.services)}</span></div>
          <div className="flex justify-between"><span className="text-[#7A6355]">Additional fees</span><span>{money(ev.fees)}</span></div>
          {ev.discounts > 0 && <div className="flex justify-between"><span className="text-[#7A6355]">Discount</span><span className="text-[#4a6741]">− {money(ev.discounts)}</span></div>}
          <div className="flex justify-between border-t border-dark pt-2 mt-1"><span className="font-heading text-base">{title} total</span><span className="font-heading text-lg">{money(ev.subtotal)}</span></div>
        </div>
      </FormSection>
    </div>
  )
}

export function BookingSummary({ events, payments = [] }) {
  const { evs, lines } = useMemo(() => asRows(events), [events])
  const s = summarizeBooking(evs, lines, payments)
  const Row = ({ label, value, muted, strong }) => (
    <div className={`flex justify-between gap-4 py-1.5 text-sm ${strong ? 'border-t border-dark pt-3 mt-1' : ''}`}>
      <span className={strong ? 'font-heading text-base text-dark' : muted ? 'text-[#8A7A70]' : 'text-[#7A6355]'}>{label}</span>
      <span className={strong ? 'font-heading text-lg text-dark' : 'text-dark'}>{value}</span>
    </div>
  )
  return (
    <div>
      {s.events.map((e, i) => (
        <Row key={e.id || i} label={`${e.name || e.event_type || 'Event'} · ${fmtShortDate(e.event_date)}`} value={money(e.subtotal)} muted />
      ))}
      <Row label="Services" value={money(s.services)} />
      <Row label="Additional fees" value={money(s.fees)} />
      {s.discounts > 0 && <Row label="Discounts" value={`− ${money(s.discounts)}`} />}
      <Row label="Total booking" value={money(s.total)} strong />
      <Row label={`Retainer (${RETAINER_PERCENT}%)${s.retainerReceived ? ' — received' : ''}`} value={money(s.retainer)} muted />
      {s.installments > 0 && <Row label="Other payments received" value={money(s.installments)} muted />}
      <Row label="Balance due before the event" value={money(s.balance)} muted />
      <Row label="Paid to date" value={money(s.paid)} muted />
      <Row label="Outstanding" value={money(s.outstanding)} />
    </div>
  )
}

// The whole Events + pricing editor.
export default function BookingEditor({ events, onChange, priceList }) {
  const setEvent = (i, ev) => onChange(events.map((e, j) => (j === i ? ev : e)))
  const removeEvent = (i) => {
    const e = events[i]
    const hasData = e.lines.length || e.event_date || e.address
    const msg = e.id
      ? `Remove ${e.name || 'this event'}? Its prices and its timeline are deleted when you save.`
      : `Remove ${e.name || 'this event'}?`
    if (hasData && !window.confirm(msg)) return
    onChange(events.filter((_, j) => j !== i))
  }
  const move = (i, d) => {
    const next = [...events]
    const [x] = next.splice(i, 1)
    next.splice(i + d, 0, x)
    onChange(next)
  }
  const duplicate = (i) => {
    const e = events[i]
    const copy = { ...e, id: undefined, key: key(), name: `${e.name} (copy)`, lines: e.lines.map((l) => ({ ...l, id: undefined, key: key() })) }
    const next = [...events]
    next.splice(i + 1, 0, copy)
    onChange(next)
  }

  return (
    <div>
      <FormSection
        title="Events"
        hint="Every event she has booked you for — each gets its own details, services, prices and timeline."
      >
        <div className="flex items-center gap-4 flex-wrap">
          <span className={labelClass}>Number of events</span>
          <div className="flex items-center border border-[#A89080]">
            <button type="button" className="w-10 h-10 text-lg text-dark hover:bg-beige-card cursor-pointer disabled:opacity-30" disabled={events.length <= 1} onClick={() => removeEvent(events.length - 1)} aria-label="One fewer event">−</button>
            <span className="w-10 text-center font-heading text-lg">{events.length}</span>
            <button type="button" className="w-10 h-10 text-lg text-dark hover:bg-beige-card cursor-pointer disabled:opacity-30" disabled={events.length >= 20} onClick={() => onChange([...events, { ...newEvent('Other'), name: `Event ${events.length + 1}` }])} aria-label="One more event">+</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#8A7A70] mr-1">Quick add</span>
          {QUICK_EVENTS.map((name) => (
            <button key={name} type="button" onClick={() => onChange([...events, newEvent(name)])} className="px-3 py-2 text-[11px] tracking-[0.12em] uppercase border border-[#A89080] text-dark hover:border-gold hover:text-gold cursor-pointer">
              + {name}
            </button>
          ))}
        </div>
        <ol className="flex flex-col gap-1">
          {events.map((e, i) => (
            <li key={e.key} className="flex items-center gap-3 text-sm">
              <span className="w-5 h-5 border border-gold rotate-45 flex items-center justify-center shrink-0"><span className="-rotate-45 text-[10px] text-gold">{i + 1}</span></span>
              <input
                className={cellInputClass + ' max-w-xs'}
                value={e.name}
                onChange={(ev) => setEvent(i, { ...e, name: ev.target.value })}
                placeholder="Event name"
                aria-label={`Event ${i + 1} name`}
              />
              <span className="text-xs text-[#8A7A70] whitespace-nowrap">{fmtShortDate(e.event_date)}</span>
            </li>
          ))}
        </ol>
      </FormSection>

      {events.map((e, i) => (
        <EventEditor
          key={e.key}
          event={e}
          index={i}
          count={events.length}
          priceList={priceList}
          onChange={(ev) => setEvent(i, ev)}
          onRemove={() => removeEvent(i)}
          onMove={(d) => move(i, d)}
          onDuplicate={() => duplicate(i)}
        />
      ))}
    </div>
  )
}
