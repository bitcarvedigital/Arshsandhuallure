import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Btn, cellInputClass, metaLabelClass } from '../../shared/ui'
import { parsePriceList } from '../../shared/booking/services.js'
import { SaveNote, isFailure, iconRemoveBtn } from '../adminUi'

// column labels: shown once as a header row on wider screens, per row on a phone
function SmallLabel({ children }) {
  return <span className={`${metaLabelClass} sm:sr-only`}>{children}</span>
}

// same grid for the header row and every item row, so the columns line up
const GRID = {
  service: 'grid-cols-[minmax(0,1fr)_6rem_2.25rem] sm:grid-cols-[minmax(0,1fr)_7.5rem_4.5rem_6.5rem_2.25rem]',
  other: 'grid-cols-[minmax(0,1fr)_6rem_2.25rem] sm:grid-cols-[minmax(0,1fr)_6.5rem_2.25rem]',
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'item'

// Arsh's standard prices. They pre-fill new bookings; every booking can still
// be priced individually.
export default function PriceListEditor() {
  const [list, setList] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'price_list')
      .maybeSingle()
      .then(({ data }) => setList(parsePriceList(data?.value)))
  }, [])

  if (!list) return null
  const set = (i, patch) => {
    setMsg('')
    setList((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  }
  const remove = (i) => setList((l) => l.filter((_, j) => j !== i))
  const add = (kind) =>
    setList((l) => [...l, { code: `custom_${Date.now().toString(36)}`, label: '', kind, service: kind === 'service' ? 'both' : null, for_bride: false, minutes: kind === 'service' ? 45 : null, price: null }])

  async function save() {
    const clean = list
      .filter((x) => (x.label || '').trim())
      .map((x) => ({
        ...x,
        label: x.label.trim(),
        code: x.code || slug(x.label),
        price: x.price === '' || x.price == null ? null : Number(x.price),
        minutes: x.minutes === '' || x.minutes == null ? null : Number(x.minutes),
      }))
    const { error } = await supabase.from('app_settings').upsert({ key: 'price_list', value: JSON.stringify(clean) })
    setMsg(error ? 'Could not save.' : 'Price list saved ✓')
  }

  const groups = [
    ['service', 'Services', 'price per person'],
    ['fee', 'Fees', null],
    ['discount', 'Discounts', null],
  ]

  return (
    <div className="flex flex-col gap-10">
      {groups.map(([kind, title, sub]) => {
        const rows = list.map((x, i) => [x, i]).filter(([x]) => x.kind === kind)
        const grid = kind === 'service' ? GRID.service : GRID.other
        const priceLabel = kind === 'discount' ? 'Amount off ($)' : 'Price ($)'
        return (
          <div key={kind}>
            <h3 className="font-heading text-lg text-dark">
              {title}
              {sub && <span className="font-body text-sm text-faint"> · {sub}</span>}
            </h3>
            {rows.length > 0 && (
              <div className={`hidden sm:grid ${grid} gap-x-4 mt-4 pb-2 border-b border-line`} aria-hidden="true">
                <span className={metaLabelClass}>Name</span>
                {kind === 'service' && <span className={metaLabelClass}>Type</span>}
                {kind === 'service' && <span className={metaLabelClass}>Mins</span>}
                <span className={metaLabelClass}>{priceLabel}</span>
                <span />
              </div>
            )}
            {rows.length === 0 && <p className="text-sm text-faint mt-3">None yet.</p>}
            {rows.map(([x, i]) => (
              <div key={x.code || i} className={`grid ${grid} gap-x-4 gap-y-3 items-end border-b border-line py-3`}>
                <label className="flex flex-col gap-1 min-w-0">
                  <SmallLabel>Name</SmallLabel>
                  <input className={cellInputClass} value={x.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="e.g. Party Makeup" />
                </label>
                {kind === 'service' && (
                  <label className="flex flex-col gap-1 min-w-0 order-1 sm:order-none">
                    <SmallLabel>Type</SmallLabel>
                    <select className={cellInputClass + ' cursor-pointer'} value={x.service || ''} onChange={(e) => set(i, { service: e.target.value || null })}>
                      <option value="hair">Hair</option>
                      <option value="makeup">Makeup</option>
                      <option value="both">Both</option>
                      <option value="">Add-on</option>
                    </select>
                  </label>
                )}
                {kind === 'service' && (
                  <label className="flex flex-col gap-1 min-w-0 order-1 sm:order-none">
                    <SmallLabel>Mins</SmallLabel>
                    <input className={cellInputClass} type="number" min="0" step="5" inputMode="numeric" value={x.minutes ?? ''} onChange={(e) => set(i, { minutes: e.target.value })} />
                  </label>
                )}
                <label className="flex flex-col gap-1 min-w-0">
                  <SmallLabel>{priceLabel}</SmallLabel>
                  <input className={cellInputClass + ' tabular-nums'} type="number" min="0" step="0.01" inputMode="decimal" value={x.price ?? ''} onChange={(e) => set(i, { price: e.target.value })} placeholder="—" />
                </label>
                <button type="button" onClick={() => remove(i)} aria-label={`Remove ${x.label || 'this item'}`} className={`${iconRemoveBtn} justify-self-end -mr-2`}>
                  ×
                </button>
              </div>
            ))}
            <Btn type="button" variant="outline" size="sm" className="mt-4" onClick={() => add(kind)}>
              + Add {kind === 'service' ? 'a service' : kind === 'fee' ? 'a fee' : 'a discount'}
            </Btn>
          </div>
        )
      })}
      <div className="flex items-center gap-4 flex-wrap">
        <Btn size="sm" onClick={save}>Save price list</Btn>
        <SaveNote error={isFailure(msg)}>{msg}</SaveNote>
      </div>
    </div>
  )
}
