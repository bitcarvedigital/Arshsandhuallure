import { money, fmtShortDate } from '../ui'
import { eventTitle } from './EventCards'

const qtyText = (l) => {
  const q = Number(l.qty)
  if (l.kind !== 'service' && q === 1) return ''
  return `${Number.isInteger(q) ? q : q.toFixed(2)} × ${money(l.unit_price)}`
}

function LineRow({ l }) {
  const neg = l.kind === 'discount'
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-[#EFE6DA] text-sm">
      <span className="flex-1 min-w-0 text-dark">{l.label}</span>
      <span className="text-xs text-[#8A7A70] whitespace-nowrap">{qtyText(l)}</span>
      <span className={`w-24 text-right whitespace-nowrap ${neg ? 'text-[#4a6741]' : 'text-dark'}`}>
        {neg ? `− ${money(l.amount)}` : money(l.amount)}
      </span>
    </div>
  )
}

function TotalRow({ label, value, strong, muted, negative }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2 text-sm ${strong ? 'border-t border-dark mt-1 pt-3' : ''}`}>
      <span className={strong ? 'font-heading text-base text-dark' : muted ? 'text-[#8A7A70]' : 'text-[#7A6355]'}>{label}</span>
      <span className={`${strong ? 'font-heading text-lg text-dark' : negative ? 'text-[#4a6741]' : 'text-dark'} whitespace-nowrap`}>
        {negative ? `− ${money(value)}` : money(value)}
      </span>
    </div>
  )
}

// Per-event price breakdown + booking totals. `events` carry `lines` (with
// `amount`) and `subtotal`; `totals` = { services, fees, discounts, total,
// retainer, retainer_percent|retainerPercent, balance }.
export default function FeeSchedule({ events = [], totals = {}, showRetainer = true }) {
  const pct = totals.retainer_percent ?? totals.retainerPercent ?? 30
  const priced = events.filter((e) => (e.lines || []).length)
  if (!priced.length) {
    return <p className="text-sm text-[#A89080]">Your quote is being prepared — it will appear here.</p>
  }
  return (
    <div className="flex flex-col gap-8">
      {priced.map((e, i) => {
        const services = e.lines.filter((l) => l.kind === 'service')
        const extras = e.lines.filter((l) => l.kind === 'fee')
        const discounts = e.lines.filter((l) => l.kind === 'discount')
        return (
          <div key={e.id || i}>
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
              <h3 className="font-heading text-base text-dark">{eventTitle(e)}</h3>
              <span className="text-[10px] tracking-[0.2em] uppercase text-[#8A7A70]">{fmtShortDate(e.event_date)}</span>
            </div>
            {services.length > 0 && (
              <p className="text-[10px] tracking-[0.25em] uppercase text-gold mt-3">Services</p>
            )}
            {services.map((l, j) => <LineRow key={l.id || j} l={l} />)}
            {extras.length > 0 && (
              <p className="text-[10px] tracking-[0.25em] uppercase text-gold mt-4">Additional fees</p>
            )}
            {extras.map((l, j) => <LineRow key={l.id || j} l={l} />)}
            {discounts.length > 0 && (
              <p className="text-[10px] tracking-[0.25em] uppercase text-gold mt-4">Discount</p>
            )}
            {discounts.map((l, j) => <LineRow key={l.id || j} l={l} />)}
            <div className="flex justify-between gap-4 pt-2 text-sm">
              <span className="text-[#7A6355]">Event total</span>
              <span className="text-dark font-medium">{money(e.subtotal)}</span>
            </div>
          </div>
        )
      })}

      <div className="bg-beige-card/60 border border-[#E0D2C2] px-5 py-4">
        <TotalRow label="Services" value={totals.services} />
        <TotalRow label="Additional fees" value={totals.fees} />
        {Number(totals.discounts) > 0 && <TotalRow label="Discounts" value={totals.discounts} negative />}
        <TotalRow label="Total booking" value={totals.total} strong />
        {showRetainer && (
          <>
            <TotalRow label={`Non-refundable retainer (${pct}%) — secures every date above`} value={totals.retainer} muted />
            <TotalRow label="Balance due on or before the event" value={totals.balance} muted />
          </>
        )}
      </div>
    </div>
  )
}
