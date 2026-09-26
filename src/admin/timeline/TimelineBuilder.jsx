import { useMemo, useRef, useState } from 'react'
import {
  DndContext, DragOverlay, closestCorners, MouseSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, rectSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../../lib/supabaseClient'
import { Btn, FormSection, StatusChip, cellInputClass, labelClass, fmtShortDate, fmtTime } from '../../shared/ui'
import {
  layoutTimeline, normalizeTimeline, bricksFromBooking, arrange, fromLegacyEntries,
  detectConflicts, formatMinutes, parseTime, uid, DEFAULT_MINUTES,
} from '../../shared/booking/timeline.js'
import { brickClasses, SERVICE_SHORT } from '../../shared/booking/brickStyles.js'
import TimelineView, { Legend } from '../../shared/booking/TimelineView'
import { TEMPLATES } from './templates'
import BrickEditor from './BrickEditor'

const TRAY = 'tray'
const PX = 1.1 // px per minute in the builder
const MIN_H = 40

function BrickCard({ brick, start, end, overlay, warn }) {
  const cls = brickClasses(brick)
  const dark = brick.vip || brick.bride
  const h = start != null ? Math.max(MIN_H, (end - start) * PX) : MIN_H + 8
  return (
    <div
      className={`relative overflow-hidden select-none ${cls.box} ${overlay ? 'shadow-xl rotate-1' : ''} ${warn ? 'outline outline-2 outline-[#8a3a2a]' : ''}`}
      style={{ height: h }}
    >
      {cls.stripe && <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${cls.stripe}`} />}
      <div className={`h-full ${cls.stripe ? 'pl-3.5' : 'pl-2.5'} pr-2 py-1 flex flex-col min-w-0`}>
        <p className={`text-[10px] tracking-[0.1em] uppercase leading-tight ${dark ? 'text-gold-light' : 'opacity-70'}`}>
          {start != null ? `${formatMinutes(start)} – ${formatMinutes(end)}` : `${brick.minutes} min`}
        </p>
        <p className="text-[13px] leading-tight truncate font-medium flex items-center gap-1">
          {dark && <span className="w-1.5 h-1.5 border border-gold-light rotate-45 shrink-0" aria-hidden="true" />}
          {brick.kind === 'gap' ? brick.name || 'Break' : brick.name || 'Unnamed'}
          {brick.placeholder && <span className="text-[9px] tracking-[0.15em] uppercase opacity-60 ml-1">tap to name</span>}
        </p>
        {h >= 52 && brick.kind !== 'gap' && (
          <p className={`text-[11px] leading-tight truncate ${dark ? 'text-[#D9CBB9]' : 'opacity-75'}`}>
            {[brick.relation, brick.side === 'groom' ? 'Groom’s side' : null, SERVICE_SHORT[brick.service]].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>
  )
}

function SortableBrick({ brick, start, end, onOpen, warn }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: brick.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(brick.id)}
      className="cursor-grab active:cursor-grabbing touch-manipulation"
      aria-label={`${brick.name || 'Brick'} — press to edit, or drag to move`}
    >
      <BrickCard brick={brick} start={start} end={end} warn={warn} />
    </div>
  )
}

function Lane({ id, title, children, empty, top = 0, tray }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className={tray ? '' : 'min-w-[150px] flex-1'}>
      <div className="h-8 flex items-center justify-center">{title}</div>
      <div
        ref={setNodeRef}
        className={`relative flex ${tray ? 'flex-row flex-wrap' : 'flex-col'} gap-1 p-1 min-h-[120px] transition-colors ${
          isOver ? 'bg-[#EFE3D2]' : tray ? 'bg-transparent border border-dashed border-[#C8B8AC]' : 'bg-[#F6F0E8]'
        }`}
      >
        {!tray && top > 0 && <div style={{ height: top }} aria-hidden="true" />}
        {children}
        {empty}
      </div>
    </div>
  )
}

export default function TimelineBuilder({ client, event, row, lines, members, legacyEntries, onSaved }) {
  const [content, setContent] = useState(() => normalizeTimeline(row?.content, event))
  const [editingId, setEditingId] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const lastDrag = useRef(0)
  const openBrick = (id) => {
    if (Date.now() - lastDrag.current > 250) setEditingId(id)
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const update = (fn) => {
    setContent((c) => (typeof fn === 'function' ? fn(c) : fn))
    setDirty(true)
    setMsg('')
  }
  const setBrick = (b) => update((c) => ({ ...c, bricks: c.bricks.map((x) => (x.id === b.id ? b : x)) }))

  const layout = useMemo(() => layoutTimeline(content), [content])
  const conflicts = useMemo(() => detectConflicts(layout), [layout])
  const warnIds = new Set(conflicts.flatMap((c) => c.ids))
  const timeOf = Object.fromEntries(layout.columns.flatMap((c) => c.items.map((it) => [it.brick.id, it])))
  const bookingBricks = () => bricksFromBooking(event, lines, members)
  const containerOf = (id) => (id === TRAY || content.columns.some((c) => c.id === id) ? id : content.bricks.find((b) => b.id === id)?.column || TRAY)

  function onDragOver({ active, over }) {
    if (!over) return
    const from = containerOf(active.id)
    const to = containerOf(over.id)
    if (from === to) return
    update((c) => {
      const bricks = c.bricks.map((b) => (b.id === active.id ? { ...b, column: to === TRAY ? null : to } : b))
      const oldIndex = bricks.findIndex((b) => b.id === active.id)
      const overIndex = bricks.findIndex((b) => b.id === over.id)
      return { ...c, bricks: overIndex >= 0 ? arrayMove(bricks, oldIndex, overIndex) : bricks }
    })
  }

  function onDragEnd({ active, over }) {
    setActiveId(null)
    lastDrag.current = Date.now()
    if (!over || active.id === over.id) return
    if (containerOf(active.id) !== containerOf(over.id)) return
    update((c) => {
      const oldIndex = c.bricks.findIndex((b) => b.id === active.id)
      const newIndex = c.bricks.findIndex((b) => b.id === over.id)
      return newIndex < 0 ? c : { ...c, bricks: arrayMove(c.bricks, oldIndex, newIndex) }
    })
  }

  function applyTemplate(t) {
    if (content.bricks.length && !window.confirm(`Start over with “${t.name}”? The current bricks are replaced.`)) return
    const fromBooking = bookingBricks()
    const source = fromBooking.length
      ? fromBooking
      : t.sample.map((s, i) => ({
          id: uid(), column: null, kind: 'person', name: s.bride ? members.find((m) => m.is_bride)?.name || 'Bride' : `Guest ${i + 1}`,
          relation: s.bride ? 'Bride' : '', side: 'bride', service: s.service, minutes: s.minutes, vip: !!s.bride,
          bride: !!s.bride, member_id: null, note: '', placeholder: !s.bride,
        }))
    const { columns, bricks } = arrange(t, source)
    update((c) => ({
      ...c,
      mode: t.mode,
      anchor: (t.mode === 'ready_by' ? event.ready_time || c.anchor : event.start_time || c.anchor).slice(0, 5),
      columns,
      bricks,
    }))
  }

  function fillFromBooking() {
    const add = bookingBricks()
    if (!add.length) return setMsg('No services priced for this event yet — add them in the Overview.')
    if (content.bricks.length && !window.confirm(`Add ${add.length} people from the booking to “Not placed yet”?`)) return
    update((c) => ({ ...c, bricks: [...c.bricks, ...add] }))
  }

  function importLegacy() {
    const { columns, bricks, anchor } = fromLegacyEntries(legacyEntries)
    update((c) => ({ ...c, mode: 'start_at', anchor: anchor || c.anchor, columns, bricks }))
  }

  const addBrick = (kind) => {
    const b = kind === 'gap'
      ? { id: uid(), column: content.columns[0]?.id || null, kind: 'gap', name: 'Break', minutes: 15 }
      : { id: uid(), column: null, kind: 'person', name: '', relation: '', side: 'bride', service: 'both', minutes: DEFAULT_MINUTES.both, vip: false, bride: false, member_id: null, note: '' }
    update((c) => ({ ...c, bricks: [...c.bricks, b] }))
    setEditingId(b.id)
  }

  async function save(visible) {
    setBusy(true)
    const patch = { event_id: event.id, client_id: client.id, content }
    if (visible === true) {
      patch.visible = true
      patch.published_at = new Date().toISOString()
    } else if (visible === false) patch.visible = false
    const { error } = await supabase.from('event_timelines').upsert(patch, { onConflict: 'event_id' })
    setBusy(false)
    if (error) return setMsg(`Could not save — ${error.message}`)
    setDirty(false)
    setMsg(visible === true ? 'Published — she can see it now ✓' : visible === false ? 'Hidden from her ✓' : 'Draft saved ✓')
    onSaved()
  }

  const editing = content.bricks.find((b) => b.id === editingId)
  const active = content.bricks.find((b) => b.id === activeId)
  const published = !!row?.visible

  if (preview) {
    return (
      <div>
        <button onClick={() => setPreview(false)} className="text-xs tracking-[0.2em] uppercase text-[#8A7A70] hover:text-gold cursor-pointer mb-6">
          ← Back to building
        </button>
        <TimelineView clientName={client.full_name} events={[event]} timelines={{ [event.id]: content }} />
      </div>
    )
  }

  return (
    <div className="pb-24">
      <FormSection
        title="Start from a sample"
        hint="Pick a layout — the people booked for this event are arranged onto it automatically. Then drag to fine-tune."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => applyTemplate(t)} className="text-left border border-[#C8B8AC] bg-[#FBF8F4] hover:border-gold p-4 cursor-pointer transition-colors">
              <p className="font-heading text-base text-dark">{t.name}</p>
              <p className="text-xs text-[#8A7A70] mt-1 leading-relaxed">{t.desc}</p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-gold mt-2">{t.columns.join(' · ')}</p>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" className="!px-4 !py-2.5" onClick={fillFromBooking}>+ Add everyone from the booking</Btn>
          {legacyEntries?.length > 0 && (
            <Btn variant="outline" className="!px-4 !py-2.5" onClick={importLegacy}>Import the earlier timeline</Btn>
          )}
        </div>
      </FormSection>

      <FormSection title="Timing" hint="Times are worked out for you from the order of the bricks and each person’s minutes.">
        <div className="flex flex-wrap gap-2">
          {[['ready_by', 'Work back from ready-by'], ['start_at', 'Start at a set time']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => update((c) => ({ ...c, mode: v, anchor: (v === 'ready_by' ? event.ready_time || c.anchor : event.start_time || c.anchor).slice(0, 5) }))}
              className={`px-4 py-2.5 text-xs tracking-[0.15em] uppercase border cursor-pointer ${content.mode === v ? 'border-gold bg-gold text-beige' : 'border-[#A89080] text-dark'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>{content.mode === 'ready_by' ? 'Everyone ready by' : 'First chair starts at'}</span>
            <input className={cellInputClass} type="time" value={content.anchor} onChange={(e) => update((c) => ({ ...c, anchor: e.target.value }))} />
          </label>
          {content.mode === 'ready_by' && (
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Finish early by (min)</span>
              <input className={cellInputClass} type="number" min="0" step="5" value={content.buffer} onChange={(e) => update((c) => ({ ...c, buffer: Number(e.target.value) || 0 }))} />
            </label>
          )}
        </div>
      </FormSection>

      <FormSection
        title="Chairs"
        hint="One column per artist or chair."
        action={<button type="button" onClick={() => update((c) => ({ ...c, columns: [...c.columns, { id: uid('c'), name: `Chair ${c.columns.length + 1}` }] }))} className="text-[10px] tracking-[0.2em] uppercase text-gold hover:underline cursor-pointer">+ Add chair</button>}
      >
        <div className="flex flex-wrap gap-3">
          {content.columns.map((col) => (
            <div key={col.id} className="flex items-center gap-2">
              <input className={cellInputClass + ' w-36'} value={col.name} onChange={(e) => update((c) => ({ ...c, columns: c.columns.map((x) => (x.id === col.id ? { ...x, name: e.target.value } : x)) }))} aria-label="Chair name" />
              {content.columns.length > 1 && (
                <button type="button" aria-label={`Remove ${col.name}`} className="text-[#8A7A70] hover:text-[#8a3a2a] text-lg cursor-pointer"
                  onClick={() => update((c) => ({ ...c, columns: c.columns.filter((x) => x.id !== col.id), bricks: c.bricks.map((b) => (b.column === col.id ? { ...b, column: null } : b)) }))}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection
        title="Build the day"
        hint="Drag bricks between chairs and up or down to reorder. Tap a brick to set who it is, their service, and whether they’re important."
        action={<Legend />}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={({ active: a }) => setActiveId(a.id)}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext id={TRAY} items={layout.tray.map((b) => b.id)} strategy={rectSortingStrategy}>
            <Lane
              id={TRAY}
              tray
              title={<span className="text-[10px] tracking-[0.25em] uppercase text-[#8A7A70]">Not placed yet ({layout.tray.length})</span>}
              empty={layout.tray.length === 0 && <p className="text-xs text-[#A89080] p-3">Everyone is placed.</p>}
            >
              {layout.tray.map((b) => (
                <div key={b.id} className="w-[150px]">
                  <SortableBrick brick={b} onOpen={openBrick} />
                </div>
              ))}
            </Lane>
          </SortableContext>

          <div className="flex gap-2 overflow-x-auto mt-6 pb-2">
            <div className="w-14 shrink-0 hidden sm:block">
              <div className="h-8" />
              {layout.start != null && (
                <div className="relative" style={{ height: (layout.end - layout.start) * PX + 60 }}>
                  {Array.from({ length: Math.floor((layout.end - layout.start) / 60) + 1 }, (_, i) => layout.start + i * 60).map((t) => (
                    <span key={t} className="absolute right-1 text-[10px] text-[#8A7A70]" style={{ top: (t - layout.start) * PX + 4 }}>{formatMinutes(t)}</span>
                  ))}
                </div>
              )}
            </div>
            {layout.columns.map((col) => (
              <SortableContext key={col.id} id={col.id} items={col.items.map((it) => it.brick.id)} strategy={verticalListSortingStrategy}>
                <Lane
                  id={col.id}
                  top={col.start != null && layout.start != null ? (col.start - layout.start) * PX : 0}
                  title={
                    <span className="text-[11px] tracking-[0.2em] uppercase text-dark truncate">
                      {col.name}
                      {col.start != null && <span className="text-[#8A7A70] normal-case tracking-normal"> · {formatMinutes(col.start)}</span>}
                    </span>
                  }
                  empty={col.items.length === 0 && <p className="text-xs text-[#A89080] p-3 text-center">Drag people here</p>}
                >
                  {col.items.map((it) => (
                    <SortableBrick key={it.brick.id} brick={it.brick} start={it.start} end={it.end} onOpen={openBrick} warn={warnIds.has(it.brick.id)} />
                  ))}
                </Lane>
              </SortableContext>
            ))}
          </div>

          <DragOverlay>
            {active ? <BrickCard brick={active} start={timeOf[active.id]?.start} end={timeOf[active.id]?.end} overlay /> : null}
          </DragOverlay>
        </DndContext>

        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" className="!px-4 !py-2.5" onClick={() => addBrick('person')}>+ Add person</Btn>
          <Btn variant="outline" className="!px-4 !py-2.5" onClick={() => addBrick('gap')}>+ Add break</Btn>
        </div>

        {layout.readyBy != null && layout.start != null && (
          <p className="text-sm text-dark">
            First brush at <strong>{formatMinutes(layout.start)}</strong> · everyone ready by{' '}
            <strong>{formatMinutes(layout.readyBy)}</strong>
            {event.start_time && parseTime(event.start_time) > layout.start && (
              <span className="text-[#8a3a2a]"> — earlier than the booked arrival ({fmtTime(event.start_time)}). Consider an early-start fee.</span>
            )}
          </p>
        )}
        {conflicts.map((c, i) => (
          <p key={i} className="text-sm text-[#8a3a2a]">◆ {c.message}</p>
        ))}
      </FormSection>

      <FormSection title="Notes for a smooth morning" hint="Shown to her under the timeline.">
        {content.notes.map((n, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-[#4A3828]">
            <span>—</span>
            <span className="flex-1">{n}</span>
            <button onClick={() => update((c) => ({ ...c, notes: c.notes.filter((_, j) => j !== i) }))} className="text-[#8A7A70] hover:text-[#8a3a2a] cursor-pointer" aria-label="Remove note">×</button>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please wear a button-up top." className={cellInputClass + ' flex-1'} />
          <button onClick={() => { if (note.trim()) { update((c) => ({ ...c, notes: [...c.notes, note.trim()] })); setNote('') } }} className="text-[10px] tracking-[0.2em] uppercase text-gold cursor-pointer">Add</button>
        </div>
      </FormSection>

      {editing && (
        <BrickEditor
          brick={editing}
          columns={content.columns}
          members={members}
          onChange={setBrick}
          onClose={() => setEditingId(null)}
          onDelete={() => {
            update((c) => ({ ...c, bricks: c.bricks.filter((b) => b.id !== editing.id) }))
            setEditingId(null)
          }}
          onDuplicate={() => {
            const copy = { ...editing, id: uid(), member_id: null, name: editing.name ? `${editing.name} (2)` : '' }
            update((c) => {
              const i = c.bricks.findIndex((b) => b.id === editing.id)
              const next = [...c.bricks]
              next.splice(i + 1, 0, copy)
              return { ...c, bricks: next }
            })
            setEditingId(copy.id)
          }}
        />
      )}

      <div className="fixed bottom-0 inset-x-0 z-30 bg-[#EDE5DD]/95 backdrop-blur border-t border-[#C8B8AC] print:hidden">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <StatusChip status={published ? 'done' : 'draft'} label={published ? 'Published' : 'Draft'} />
            <p className="text-xs text-[#7A6355] truncate">{msg || (dirty ? 'Unsaved changes' : `${event.name || event.event_type} · ${fmtShortDate(event.event_date)}`)}</p>
          </div>
          <div className="flex gap-2">
            <Btn variant="outline" className="!px-4 !py-2.5" onClick={() => setPreview(true)}>Preview</Btn>
            <Btn variant="outline" className="!px-4 !py-2.5" onClick={() => save(null)} disabled={busy}>Save draft</Btn>
            {published ? (
              <>
                <Btn variant="outline" className="!px-4 !py-2.5" onClick={() => save(false)} disabled={busy}>Hide</Btn>
                <Btn variant="gold" className="!px-4 !py-2.5" onClick={() => save(true)} disabled={busy || !dirty}>Update</Btn>
              </>
            ) : (
              <Btn variant="gold" className="!px-4 !py-2.5" onClick={() => save(true)} disabled={busy || !content.bricks.some((b) => b.column)}>Publish</Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

