import { useEffect, useRef } from 'react'
import { Btn, ChoiceRow, cellInputClass, labelClass } from '../../shared/ui'
import { RELATIONS, SERVICE_LABELS } from '../../shared/booking/services.js'

function SmallLabel({ children }) {
  return <span className={labelClass}>{children}</span>
}

// Modal editor for one brick. `members` = party profiles (name picker),
// `columns` = chairs for the "Move to" fallback (works without dragging).
export default function BrickEditor({ brick, columns, members, onChange, onClose, onDelete, onDuplicate }) {
  const set = (patch) => onChange({ ...brick, ...patch })
  const first = useRef(null)
  const gap = brick.kind === 'gap'

  useEffect(() => {
    first.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function pickMember(name) {
    const m = members.find((x) => x.name === name)
    if (m) {
      set({
        name: m.name,
        member_id: m.id,
        relation: m.is_bride ? 'Bride' : m.relation || brick.relation,
        bride: m.is_bride || brick.bride,
        vip: m.is_bride || brick.vip,
        placeholder: false,
        ...(m.services && !brick.service ? { service: m.services } : {}),
      })
    } else {
      set({ name, member_id: null, placeholder: false })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-dark/40 p-0 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={gap ? 'Edit break' : 'Edit person'}
        className="w-full sm:max-w-md bg-beige border border-[#C8B8AC] max-h-[92vh] overflow-y-auto px-6 py-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <p className="text-gold text-[10px] tracking-[0.35em] uppercase">{gap ? 'Break' : 'Who’s getting ready'}</p>
          <button onClick={onClose} className="text-[#8A7A70] hover:text-dark text-xl leading-none cursor-pointer" aria-label="Close">×</button>
        </div>

        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1">
            <SmallLabel>{gap ? 'Label' : 'Name'}</SmallLabel>
            <input
              ref={first}
              className={cellInputClass}
              list="brick-members"
              value={brick.name || ''}
              onChange={(e) => pickMember(e.target.value)}
              placeholder={gap ? 'e.g. Lunch / touch-ups' : 'Type or pick from her party'}
            />
            {!gap && (
              <datalist id="brick-members">
                {members.map((m) => <option key={m.id} value={m.name} />)}
              </datalist>
            )}
          </label>

          {!gap && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1">
                  <SmallLabel>Relation</SmallLabel>
                  <input className={cellInputClass} list="brick-relations" value={brick.relation || ''} onChange={(e) => set({ relation: e.target.value })} placeholder="e.g. Sister" />
                  <datalist id="brick-relations">
                    {RELATIONS.map((r) => <option key={r} value={r} />)}
                  </datalist>
                </label>
                <label className="flex flex-col gap-1">
                  <SmallLabel>Side</SmallLabel>
                  <select className={cellInputClass + ' cursor-pointer'} value={brick.side || 'bride'} onChange={(e) => set({ side: e.target.value })}>
                    <option value="bride">Bride’s side</option>
                    <option value="groom">Groom’s side</option>
                  </select>
                </label>
              </div>

              <ChoiceRow
                label="Service"
                options={Object.entries(SERVICE_LABELS).map(([value, label]) => ({ value, label }))}
                value={brick.service}
                onChange={(v) => set({ service: v })}
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => set({ vip: !brick.vip })}
                  className={`px-4 py-2.5 text-xs tracking-[0.15em] uppercase border cursor-pointer ${brick.vip ? 'border-btn-dark bg-btn-dark text-beige' : 'border-[#A89080] text-dark'}`}
                >
                  {brick.vip ? '◆ Important person' : 'Mark as important'}
                </button>
                <button
                  type="button"
                  onClick={() => set({ bride: !brick.bride, vip: !brick.bride ? true : brick.vip, relation: !brick.bride ? 'Bride' : brick.relation })}
                  className={`px-4 py-2.5 text-xs tracking-[0.15em] uppercase border cursor-pointer ${brick.bride ? 'border-gold bg-gold text-beige' : 'border-[#A89080] text-dark'}`}
                >
                  {brick.bride ? 'The bride ✓' : 'This is the bride'}
                </button>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <SmallLabel>Minutes</SmallLabel>
              <input className={cellInputClass} type="number" min="5" max="600" step="5" value={brick.minutes || ''} onChange={(e) => set({ minutes: Number(e.target.value) || 0 })} />
            </label>
            <label className="flex flex-col gap-1">
              <SmallLabel>Chair</SmallLabel>
              <select className={cellInputClass + ' cursor-pointer'} value={brick.column || ''} onChange={(e) => set({ column: e.target.value || null })}>
                <option value="">Not placed yet</option>
                {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>

          {!gap && (
            <label className="flex flex-col gap-1">
              <SmallLabel>Note (optional)</SmallLabel>
              <input className={cellInputClass} value={brick.note || ''} onChange={(e) => set({ note: e.target.value })} placeholder="e.g. Nose ring on after makeup" />
            </label>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-8">
          <Btn onClick={onClose} className="!px-6 !py-3">Done</Btn>
          <Btn variant="outline" onClick={onDuplicate} className="!px-4 !py-3">Duplicate</Btn>
          <Btn variant="danger" onClick={onDelete} className="!px-4 !py-3">Delete</Btn>
        </div>
      </div>
    </div>
  )
}
