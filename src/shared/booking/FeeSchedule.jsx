import { money } from '../ui'
import { EventHeading } from './EventCards'

const qtyText = (l) => {
  const q = Number(l.qty)
  if (l.kind !== 'service' && q === 1) return ''
  return `${Number.isInteger(q) ? q : q.toFixed(2)} × ${money(l.unit_price)}`
}

// money columns: right-aligned, tabular + lining figures so every row lines up
const num = 'text-right whitespace-nowrap tabular-nums lining-nums'

// Phone: label left, amount right, "2 × $150.00" as a small faint line under
// the label. From `sm:` up: label | qty × unit | amount on one line.
function LineRow({ l }) {
  const neg = l.kind === 'discount'
  const qty = qtyText(l)
  return (
    <div className="flex items-baseline gap-4 py-2.5 border-b border-line text-sm">
      <div className="flex-1 min-w-0">
        <p className="text-dark break-words">{l.label}</p>
        {qty && <p className="sm:hidden text-xs text-faint mt-0.5 tabular-nums lining-nums">{qty}</p>}
      </div>
      {qty && <span className={`hidden sm:block shrink-0 text-xs text-faint ${num}`}>{qty}</span>}
      <span className={`shrink-0 sm:w-28 ${num} ${neg ? 'text-success' : 'text-dark'}`}>
        {neg ? `− ${money(l.amount)}` : money(l.amount)}
      </span>
    </div>
  )
}

function GroupLabel({ children, first }) {
  return (
    <p className={`text-[10px] tracking-[0.25em] uppercase text-faint ${first ? 'mt-4' : 'mt-6'} mb-0.5`}>{children}</p>
  )
}

function TotalRow({ label, value, strong, muted, negative }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 text-sm ${
        strong ? 'border-t border-dark mt-2 pt-3 pb-2' : 'py-1.5'
      }`}
    >
      <span className={`min-w-0 ${strong ? 'font-heading text-base text-dark' : muted ? 'text-faint' : 'text-muted'}`}>
        {label}
      </span>
      <span
        className={`shrink-0 ${num} ${
          strong ? 'font-heading text-lg text-dark' : negative ? 'text-success' : 'text-dark'
        }`}
      >
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
    return <p className="text-sm text-faint">Your quote is being prepared — it will appear here.</p>
  }
  return (
    <div className="flex flex-col gap-10">
      {priced.map((e, i) => {
        const services = e.lines.filter((l) => l.kind === 'service')
        const extras = e.lines.filter((l) => l.kind === 'fee')
        const discounts = e.lines.filter((l) => l.kind === 'discount')
        return (
          <div key={e.id || i}>
            <EventHeading event={e} />
            {services.length > 0 && <GroupLabel first>Services</GroupLabel>}
            {services.map((l, j) => <LineRow key={l.id || j} l={l} />)}
            {extras.length > 0 && <GroupLabel first={!services.length}>Additional fees</GroupLabel>}
            {extras.map((l, j) => <LineRow key={l.id || j} l={l} />)}
            {discounts.length > 0 && <GroupLabel first={!services.length && !extras.length}>Discount</GroupLabel>}
            {discounts.map((l, j) => <LineRow key={l.id || j} l={l} />)}
            <div className="flex items-baseline justify-between gap-4 pt-3 text-sm">
              <span className="text-dark font-medium">Event total</span>
              <span className={`shrink-0 sm:w-28 text-dark font-medium ${num}`}>{money(e.subtotal)}</span>
            </div>
          </div>
        )
      })}

      <div className="rounded-2xl bg-soft/60 px-4 py-3 sm:px-6 sm:py-4 print:bg-transparent print:px-0">
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
