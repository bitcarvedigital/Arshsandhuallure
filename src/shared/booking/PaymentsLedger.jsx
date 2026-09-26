import { money, fmtShortDate } from '../ui'

const num = 'text-right whitespace-nowrap tabular-nums lining-nums'

// Payments received so far, each with what it paid for, plus what is left.
// `history` comes from pricing.paymentHistory().
export default function PaymentsLedger({ history = [], total, paid, outstanding, emptyText }) {
  return (
    <div>
      {history.length === 0 ? (
        <p className="rounded-xl bg-soft/60 px-4 py-3 text-sm text-muted print:bg-transparent print:px-0">
          {emptyText || 'No payments received yet.'}
        </p>
      ) : (
        <div>
          {history.map((p) => {
            const meta = [p.appliesTo, p.method].filter(Boolean).join(' · ')
            const date = p.date ? fmtShortDate(p.date) : null
            return (
              <div key={p.id} className="flex items-baseline gap-4 py-2.5 border-b border-line text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-dark break-words">{p.label}</p>
                  {(meta || date) && (
                    <p className="text-xs text-faint mt-0.5 leading-snug break-words">
                      {meta}
                      {meta && date ? ' · ' : ''}
                      {/* the date never splits across lines */}
                      {date && <span className="whitespace-nowrap">{date}</span>}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 sm:w-28 text-dark ${num}`}>{money(p.amount)}</span>
              </div>
            )
          })}
        </div>
      )}
      {total != null && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
            <span className="text-muted">Total booking</span>
            <span className={`shrink-0 text-dark ${num}`}>{money(total)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
            <span className="text-muted">Paid to date</span>
            <span className={`shrink-0 text-success ${num}`}>{money(paid)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-dark mt-2 pt-3 pb-1 text-sm">
            <span className="font-heading text-base text-dark">Outstanding</span>
            <span className={`shrink-0 font-heading text-lg text-dark ${num}`}>{money(outstanding)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
