import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Btn, cellInputClass } from '../../shared/ui'
import { parsePriceList } from '../../shared/booking/services.js'

function SmallLabel({ children }) {
  return <span className="text-[10px] tracking-[0.2em] uppercase text-[#8A7A70]">{children}</span>
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
    ['service', 'Services (price per person)'],
    ['fee', 'Fees'],
    ['discount', 'Discounts'],
  ]

  return (
    <div className="flex flex-col gap-8">
      {groups.map(([kind, title]) => (
        <div key={kind}>
          <p className="text-[10px] tracking-[0.25em] uppercase text-gold mb-2">{title}</p>
          {list.map((x, i) =>
            x.kind !== kind ? null : (
              <div key={x.code || i} className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 gap-y-1 items-end border-b border-[#EFE6DA] py-2">
                <label className="flex flex-col gap-1 min-w-0">
                  <SmallLabel>Name</SmallLabel>
                  <input className={cellInputClass} value={x.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="e.g. Party Makeup" />
                </label>
                {kind === 'service' && (
                  <label className="w-28 hidden sm:flex flex-col gap-1">
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
                  <label className="w-16 hidden sm:flex flex-col gap-1">
                    <SmallLabel>Mins</SmallLabel>
                    <input className={cellInputClass} type="number" min="0" step="5" value={x.minutes ?? ''} onChange={(e) => set(i, { minutes: e.target.value })} />
                  </label>
                )}
                <label className="w-24 flex flex-col gap-1">
                  <SmallLabel>{kind === 'discount' ? 'Default off' : 'Price ($)'}</SmallLabel>
                  <input className={cellInputClass} type="number" min="0" step="0.01" inputMode="decimal" value={x.price ?? ''} onChange={(e) => set(i, { price: e.target.value })} placeholder="—" />
                </label>
                <button type="button" onClick={() => remove(i)} aria-label={`Remove ${x.label}`} className="text-[#8A7A70] hover:text-[#8a3a2a] text-lg px-1 pb-2 cursor-pointer">×</button>
              </div>
            ),
          )}
          <button type="button" onClick={() => add(kind)} className="mt-2 text-[10px] tracking-[0.2em] uppercase text-gold hover:underline cursor-pointer">
            + Add {kind === 'service' ? 'a service' : kind === 'fee' ? 'a fee' : 'a discount'}
          </button>
        </div>
      ))}
      {msg && <p className="text-gold text-sm">{msg}</p>}
      <Btn className="self-start" onClick={save}>Save price list</Btn>
    </div>
  )
}
