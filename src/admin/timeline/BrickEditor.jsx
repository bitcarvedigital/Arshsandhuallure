import { useEffect, useRef } from 'react'
import { Btn, ChoiceRow, MicroLabel, cellInputClass, labelClass } from '../../shared/ui'
import { iconBtn, segmentClass } from '../adminUi'
import { RELATIONS, SERVICE_LABELS, isStarredRelation, sideForRelation } from '../../shared/booking/services.js'

function SmallLabel({ children }) {
  return <span className={labelClass}>{children}</span>
}

// Modal editor for one brick. `members` = party profiles (name picker),
// `columns` = artists for the "Move to" fallback (works without dragging).
export default function BrickEditor({ brick, columns, members, onChange, onClose, onDelete, onDuplicate }) {
  const set = (patch) => onChange({ ...brick, ...patch })
  const first = useRef(null)
  const gap = brick.kind === 'gap'

  // Runs once when the editor opens. (It used to re-run on every change, which
  // pulled the cursor back to the name box and jumped the editor to the top.)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    // with a mouse, start typing the name straight away; on a phone don't pop the keyboard
    if (window.matchMedia?.('(pointer: fine)').matches) first.current?.focus({ preventScroll: true })
    const onKey = (e) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // picking a relation stars the bride, groom, both mothers and the maid of honour
  // (moving away from one of those takes the automatic star off again) and puts
  // the person on the right side — bride's people on hers, groom's on his
  const setRelation = (relation) =>
    set({
      relation,
      bride: relation === 'Bride',
      vip: isStarredRelation(relation) ? true : isStarredRelation(brick.relation) ? false : !!brick.vip,
      side: sideForRelation(relation) || brick.side || 'bride',
    })

  function pickMember(name) {
    const m = members.find((x) => x.name === name)
    if (m) {
      set({
        name: m.name,
        member_id: m.id,
        relation: m.is_bride ? 'Bride' : m.relation || brick.relation,
        bride: m.is_bride || brick.bride,
        vip: m.is_bride || isStarredRelation(m.relation) || brick.vip,
        side: m.is_bride ? 'bride' : sideForRelation(m.relation) || brick.side || 'bride',
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
        className="w-full sm:max-w-md bg-beige rounded-t-2xl sm:rounded-2xl shadow-[0_30px_80px_-30px_rgba(26,26,26,0.45)] max-h-[92vh] overflow-y-auto px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-6">
          <MicroLabel>{gap ? 'Break' : 'Who’s getting ready'}</MicroLabel>
          <button type="button" onClick={onClose} className={`${iconBtn} text-xl -mr-2`} aria-label="Close">×</button>
        </div>

        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <SmallLabel>{gap ? 'Label' : 'Name'}</SmallLabel>
            <div className="flex items-center gap-2">
              <input
                ref={first}
                className={`${cellInputClass} flex-1`}
                value={brick.name || ''}
                onChange={(e) => pickMember(e.target.value)}
                placeholder={gap ? 'e.g. Lunch / touch-ups' : 'Type a name, or tap one below'}
              />
              {!gap && (
                <button
                  type="button"
                  aria-pressed={!!brick.vip}
                  aria-label={brick.vip ? 'Important — tap to unmark' : 'Mark as important'}
                  title={brick.vip ? 'Important' : 'Mark as important'}
                  onClick={() => set({ vip: !brick.vip })}
                  className={`w-10 h-10 shrink-0 rounded-full text-2xl leading-none transition-colors cursor-pointer hover:bg-soft/70 ${brick.vip ? 'text-gold' : 'text-ghost'}`}
                >
                  {brick.vip ? '★' : '☆'}
                </button>
              )}
            </div>
            {/* the star's confirmation — so it's clear the person is actually marked */}
            {!gap && (
              <p role="status" aria-live="polite" className={`text-xs min-h-4 ${brick.vip ? 'text-gold' : 'text-faint'}`}>
                {brick.vip ? '★ Marked as an important person' : 'Tap the star to mark this person as important'}
              </p>
            )}
          </label>
          {/* her party as tap-to-pick names (a <datalist> pops up detached on some browsers) */}
          {!gap && members.length > 0 && (
            <div className="flex flex-col gap-2 -mt-3">
              <span className="text-[11px] text-faint">From her party</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Pick someone from her party">
                {members.map((m) => (
                  <button key={m.id} type="button" aria-pressed={brick.member_id === m.id} onClick={() => pickMember(m.name)} className={segmentClass(brick.member_id === m.id)}>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!gap && (
            <>
              <div className="flex flex-col gap-2">
                <SmallLabel>Relation</SmallLabel>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Relation">
                  {RELATIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={brick.relation === r}
                      onClick={() => setRelation(brick.relation === r ? '' : r)}
                      className={segmentClass(brick.relation === r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  className={cellInputClass}
                  aria-label="Other relation"
                  value={RELATIONS.includes(brick.relation) ? '' : brick.relation || ''}
                  onChange={(e) => setRelation(e.target.value)}
                  placeholder="Other — type it here"
                />
              </div>
              <div className="flex flex-col gap-2">
                <SmallLabel>Side</SmallLabel>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Side">
                  {[['bride', 'Bride’s side'], ['groom', 'Groom’s side']].map(([v, l]) => (
                    <button key={v} type="button" aria-pressed={(brick.side || 'bride') === v} onClick={() => set({ side: v })} className={segmentClass((brick.side || 'bride') === v)}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <ChoiceRow
                label="Service"
                options={Object.entries(SERVICE_LABELS).map(([value, label]) => ({ value, label }))}
                value={brick.service}
                onChange={(v) => set({ service: v })}
              />

            </>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-6">
            <label className="flex flex-col gap-2">
              <SmallLabel>Minutes</SmallLabel>
              <input className={cellInputClass} inputMode="numeric" type="number" min="5" max="600" step="5" value={brick.minutes || ''} onChange={(e) => set({ minutes: Number(e.target.value) || 0 })} />
            </label>
            <label className="flex flex-col gap-2">
              <SmallLabel>Artist</SmallLabel>
              <select className={cellInputClass + ' cursor-pointer'} value={brick.column || ''} onChange={(e) => set({ column: e.target.value || null })}>
                <option value="">Not placed yet</option>
                {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>

          {!gap && (
            <label className="flex flex-col gap-2">
              <SmallLabel>Note (optional)</SmallLabel>
              <input className={cellInputClass} value={brick.note || ''} onChange={(e) => set({ note: e.target.value })} placeholder="e.g. Nose ring on after makeup" />
            </label>
          )}
        </div>

        <div className="flex items-center gap-2 mt-10">
          <Btn size="sm" onClick={onClose}>Done</Btn>
          <Btn variant="outline" size="sm" onClick={onDuplicate}>Duplicate</Btn>
          <Btn variant="danger" size="sm" className="ml-auto" onClick={onDelete}>Delete</Btn>
        </div>
      </div>
    </div>
  )
}
