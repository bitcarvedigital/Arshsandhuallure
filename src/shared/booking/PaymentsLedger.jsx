import { money, fmtShortDate } from '../ui'

// Payments received so far, each with what it paid for, plus what is left.
// `history` comes from pricing.paymentHistory().
export default function PaymentsLedger({ history = [], total, paid, outstanding, emptyText }) {
  return (
    <div>
      {history.length === 0 ? (
        <p className="text-sm text-[#A89080] py-2">{emptyText || 'No payments received yet.'}</p>
      ) : (
        <div>
          {history.map((p) => (
            <div key={p.id} className="flex items-start gap-3 py-2.5 border-b border-[#EFE6DA] text-sm">
              <div className="flex-1 min-w-0">
                <p className="text-dark">{p.label}</p>
                <p className="text-xs text-[#8A7A70] mt-0.5">
                  {[p.appliesTo, p.method, p.date ? fmtShortDate(p.date) : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span className="text-dark whitespace-nowrap">{money(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
      {total != null && (
        <div className="mt-3">
          <div className="flex justify-between gap-4 py-1.5 text-sm">
            <span className="text-[#7A6355]">Total booking</span>
            <span className="text-dark">{money(total)}</span>
          </div>
          <div className="flex justify-between gap-4 py-1.5 text-sm">
            <span className="text-[#7A6355]">Paid to date</span>
            <span className="text-[#4a6741]">{money(paid)}</span>
          </div>
          <div className="flex justify-between gap-4 py-2 text-sm border-t border-dark mt-1">
            <span className="font-heading text-base text-dark">Outstanding</span>
            <span className="font-heading text-lg text-dark">{money(outstanding)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
