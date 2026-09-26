import { useMemo, useRef, useState } from 'react'
import {
  DndContext, DragOverlay, closestCorners, MouseSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, rectSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../../lib/supabaseClient'
import { Btn, Chevron, FormSection, StatusChip, cellInputClass, labelClass, metaLabelClass, softNote, fmtShortDate, fmtTime } from '../../shared/ui'
import { backLinkClass, quietBtn, iconRemoveBtn, segmentClass } from '../adminUi'
import {
  layoutTimeline, normalizeTimeline, bricksFromBooking, arrange, fromLegacyEntries,
  detectConflicts, formatMinutes, parseTime, uid, DEFAULT_MINUTES, autoPlan, artistSkill,
} from '../../shared/booking/timeline.js'
import { brickClasses, SERVICE_SHORT } from '../../shared/booking/brickStyles.js'
import { sideLabel } from '../../shared/booking/services.js'
import TimelineView, { Legend, StarMark, BrickStar } from '../../shared/booking/TimelineView'
import { TEMPLATES } from './templates'
import BrickEditor from './BrickEditor'

const TRAY = 'tray'
const PX = 1.1 // px per minute in the builder
const MIN_H = 40

function BrickCard({ brick, start, end, overlay, warn }) {
  const cls = brickClasses(brick)
  const star = brick.kind !== 'gap' && (brick.vip || brick.bride)
  const h = start != null ? Math.max(MIN_H, (end - start) * PX) : MIN_H + 8
  return (
    <div
      className={`relative overflow-hidden select-none rounded-lg ${cls.box} ${overlay ? 'shadow-xl rotate-1' : ''} ${warn ? 'outline outline-2 outline-danger' : ''}`}
      style={{ height: h }}
    >
      {cls.stripe && <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${cls.stripe}`} />}
      {star && <BrickStar />}
      <div className={`h-full ${cls.stripe ? 'pl-3.5' : 'pl-2.5'} ${star ? 'pr-10' : 'pr-2'} py-1 flex flex-col min-w-0`}>
        <p className="text-[10px] tracking-[0.1em] uppercase leading-tight opacity-70">
          {start != null ? `${formatMinutes(start)} – ${formatMinutes(end)}` : `${brick.minutes} min`}
        </p>
        <p className="text-[13px] leading-tight truncate font-medium flex items-center gap-1">
          <span className="truncate min-w-0">{brick.kind === 'gap' ? brick.name || 'Break' : brick.name || 'Unnamed'}</span>
          {brick.placeholder && <span className="text-[10px] tracking-[0.12em] uppercase opacity-60 ml-1 shrink-0">tap to name</span>}
        </p>
        {h >= 52 && brick.kind !== 'gap' && (
          <p className="text-[11px] leading-tight truncate opacity-75">
            {[brick.relation, sideLabel(brick), SERVICE_SHORT[brick.service]].filter(Boolean).join(' · ')}
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
      <div className={`h-8 flex items-center ${tray ? '' : 'justify-center'} min-w-0`}>{title}</div>
      <div
        ref={setNodeRef}
        className={`relative flex ${tray ? 'flex-row flex-wrap gap-2 p-2' : 'flex-col gap-1 p-1'} ${tray ? 'min-h-[56px]' : 'min-h-[120px]'} rounded-xl transition-colors ${
          isOver ? 'bg-soft' : tray ? 'bg-soft/50' : 'bg-surface'
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
  const bookedCount = useMemo(() => bricksFromBooking(event, lines, members).length, [event, lines, members])
  const [samplesOpen, setSamplesOpen] = useState(false) // hidden until asked for

  // everyone getting ready at this event — one row per person, however many bricks they have
  const guests = useMemo(() => {
    const byKey = new Map()
    for (const b of content.bricks) {
      if (b.kind === 'gap') continue
      const k = b.member_id || (b.placeholder ? b.id : (b.name || '').trim().toLowerCase()) || b.id
      const g = byKey.get(k)
      if (g) {
        g.ids.push(b.id)
        g.services.add(b.service)
        g.star = g.star || !!(b.vip || b.bride)
      } else {
        byKey.set(k, { key: k, first: b, ids: [b.id], services: new Set([b.service]), star: !!(b.vip || b.bride) })
      }
    }
    return [...byKey.values()]
  }, [content.bricks])
  const guestService = (g) => {
    const hair = [...g.services].some((sv) => sv === 'hair' || sv === 'both')
    const makeup = [...g.services].some((sv) => sv === 'makeup' || sv === 'both')
    return hair && makeup ? 'Hair & Makeup' : hair ? 'Hair' : makeup ? 'Makeup' : 'No service yet'
  }
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

  // Arsh's rules, all at once (see autoPlan in shared/booking/timeline.js)
  function autoBuild() {
    const hasPeople = (list) => list.some((b) => b.kind !== 'gap' && b.service)
    const source = hasPeople(content.bricks) ? content.bricks : bookingBricks()
    if (!hasPeople(source)) return setMsg('No one to plan yet — add this event’s services in the Overview, or add people below.')
    if (content.bricks.some((b) => b.column) && !window.confirm('Auto-build rearranges everyone on this timeline. Continue?')) return
    update((c) =>
      autoPlan({
        ...c,
        mode: 'ready_by',
        anchor: (c.mode === 'ready_by' ? c.anchor : event.ready_time || c.anchor).slice(0, 5),
        columns: c.columns.map((col, i) => ({ ...col, bestAt: artistSkill(col, i) })),
        bricks: source,
      }),
    )
    setMsg('Generated with your rules — drag anyone to fine-tune.')
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

  // Two separate buttons: "Save as PDF" downloads the timeline exactly as it is
  // on screen (saved or not); "Email to studio" sends that same PDF to the studio's inbox.
  async function timelinePdf(email) {
    if (!content.bricks.some((b) => b.column)) return setMsg('Place someone on the timeline first.')
    setBusy(true)
    setMsg('')
    try {
      const { data } = await supabase.auth.getSession()
      const resp = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
        body: JSON.stringify({ action: 'timeline', clientId: client.id, eventId: event.id, content, email }),
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        throw new Error(j.error || `status ${resp.status}`)
      }
      if (email) {
        const { emailedTo } = await resp.json()
        setMsg(`PDF emailed to ${emailedTo} ✓`)
        return
      }
      const url = URL.createObjectURL(await resp.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `Timeline - ${client.full_name} - ${event.name || event.event_type || 'event'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setMsg('PDF saved ✓')
    } catch (e) {
      setMsg(`Could not ${email ? 'email' : 'make'} the PDF — ${e.message}`)
    } finally {
      setBusy(false)
    }
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

  const earlyStart = layout.readyBy != null && layout.start != null && event.start_time && parseTime(event.start_time) > layout.start
  const addNote = () => {
    if (note.trim()) {
      update((c) => ({ ...c, notes: [...c.notes, note.trim()] }))
      setNote('')
    }
  }

  const editing = content.bricks.find((b) => b.id === editingId)
  const active = content.bricks.find((b) => b.id === activeId)
  const published = !!row?.visible

  if (preview) {
    return (
      <div>
        <button type="button" onClick={() => setPreview(false)} className={`${backLinkClass} mb-6`}>
          <span aria-hidden="true">←</span> Back to building
        </button>
        <TimelineView clientName={client.full_name} events={[event]} timelines={{ [event.id]: content }} />
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* 1 · quick start with a sample — folded away until she wants it */}
      <section className="mb-12">
        <button
          type="button"
          onClick={() => setSamplesOpen((v) => !v)}
          aria-expanded={samplesOpen}
          className="group flex items-center gap-2.5 w-full text-left cursor-pointer min-h-10"
        >
          <Chevron open={samplesOpen} />
          <span className="text-gold text-[10px] tracking-[0.35em] uppercase group-hover:text-dark transition-colors">Quick start with a sample</span>
        </button>
        <div className="h-px bg-line mt-2" />
        {samplesOpen && (
          <div className="flex flex-col gap-4 mt-6">
            <p className="text-xs text-faint max-w-xl leading-relaxed">Pick a layout — the people booked for this event are arranged onto it. Then drag to fine-tune.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => applyTemplate(t)} className="text-left rounded-2xl bg-surface hover:bg-soft/60 px-5 py-4 cursor-pointer transition-colors">
                  <p className="font-heading text-base text-dark">{t.name}</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{t.desc}</p>
                  <p className="text-[11px] text-faint mt-2">{t.columns.join(' · ')}</p>
                </button>
              ))}
            </div>
            {legacyEntries?.length > 0 && (
              <Btn variant="outline" size="sm" className="self-start" onClick={importLegacy}>Import the earlier timeline</Btn>
            )}
          </div>
        )}
      </section>

      {/* 2 · artists */}
      <FormSection
        title={`Artists (${content.columns.length})`}
        hint="Everyone working this event — each gets their own column and works at the same time as the others. “Best at” decides who does the bride’s hair and makeup."
      >
        <div className="flex flex-col -mt-2">
          {content.columns.map((col, i) => (
            <div key={col.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 border-b border-line last:border-0">
              <input className={`${cellInputClass} !w-40`} value={col.name} onChange={(e) => update((c) => ({ ...c, columns: c.columns.map((x) => (x.id === col.id ? { ...x, name: e.target.value } : x)) }))} aria-label="Artist name" placeholder="Artist name" />
              <div className="flex items-center gap-1.5" role="group" aria-label={`${col.name || 'Artist'} is best at`}>
                <span className="text-[11px] text-faint mr-1">Best at</span>
                {[['hair', 'Hair'], ['makeup', 'Makeup'], ['both', 'Both']].map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={artistSkill(col, i) === v}
                    onClick={() => update((c) => ({ ...c, columns: c.columns.map((x) => (x.id === col.id ? { ...x, bestAt: v } : x)) }))}
                    className={`rounded-full px-3 py-1.5 text-xs transition-colors cursor-pointer ${artistSkill(col, i) === v ? 'bg-dark text-beige' : 'bg-beige-card/70 text-dark hover:bg-[#E3D6C8]'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {content.columns.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove ${col.name || 'this artist'}`}
                  title="Remove artist (their people go back to “not placed yet”)"
                  className={`${iconRemoveBtn} ml-auto`}
                  onClick={() => update((c) => ({ ...c, columns: c.columns.filter((x) => x.id !== col.id), bricks: c.bricks.map((b) => (b.column === col.id ? { ...b, column: null } : b)) }))}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`${quietBtn} self-start -ml-3`}
          onClick={() => update((c) => ({ ...c, columns: [...c.columns, { id: uid('c'), name: `Artist ${c.columns.length + 1}` }] }))}
        >
          + Add artist
        </button>
      </FormSection>

      {/* 3 · guests, with the timing that applies to them */}
      <FormSection title={`Guests (${guests.length})`} hint="Everyone getting ready at this event. Tap someone to edit them; the ★ marks who’s important.">
        {guests.length === 0 ? (
          <div className="flex flex-wrap items-center gap-3 -mt-2">
            <p className="text-sm text-faint">No guests yet.</p>
            {bookedCount > 0 && (
              <Btn variant="outline" size="sm" onClick={fillFromBooking}>Add everyone booked ({bookedCount})</Btn>
            )}
          </div>
        ) : (
          <div className="flex flex-col -mt-2">
            {guests.map((g) => (
              <div key={g.key} className="flex items-center gap-2 border-b border-line last:border-0">
                <button type="button" onClick={() => setEditingId(g.first.id)} className="flex-1 min-w-0 flex items-center gap-3 py-3 text-left cursor-pointer group">
                  <span className="min-w-0">
                    <span className="block text-sm text-dark truncate group-hover:text-gold transition-colors">
                      {g.first.name || 'Unnamed'}
                      {g.first.placeholder && <span className="ml-2 text-[10px] tracking-[0.12em] uppercase text-faint">tap to name</span>}
                    </span>
                    <span className="block text-xs text-faint truncate">{[g.first.relation, sideLabel(g.first), guestService(g)].filter(Boolean).join(' · ')}</span>
                  </span>
                  {g.star && <StarMark className="ml-auto" />}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${g.first.name || 'this guest'}`}
                  className={iconRemoveBtn}
                  onClick={() => update((c) => ({ ...c, bricks: c.bricks.filter((b) => !g.ids.includes(b.id)) }))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <button type="button" className={`${quietBtn} self-start -ml-3`} onClick={() => addBrick('person')}>+ Add guest</button>

        <div className="flex flex-col gap-4 pt-2">
          <span className={metaLabelClass}>Timing</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="How times are worked out">
            {[['ready_by', 'Work back from ready-by'], ['start_at', 'Start at a set time']].map(([v, l]) => (
              <button
                key={v}
                type="button"
                aria-pressed={content.mode === v}
                onClick={() => update((c) => ({ ...c, mode: v, anchor: (v === 'ready_by' ? event.ready_time || c.anchor : event.start_time || c.anchor).slice(0, 5) }))}
                className={segmentClass(content.mode === v)}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 max-w-xl">
            <label className="flex flex-col gap-2">
              <span className={labelClass}>{content.mode === 'ready_by' ? 'Everyone ready by' : 'First artist starts at'}</span>
              <input className={cellInputClass} type="time" value={content.anchor} onChange={(e) => update((c) => ({ ...c, anchor: e.target.value }))} />
            </label>
            {content.mode === 'ready_by' && (
              <label className="flex flex-col gap-2">
                <span className={labelClass}>Touch-ups at the end (min)</span>
                <input className={cellInputClass} type="number" min="0" step="5" value={content.buffer} onChange={(e) => update((c) => ({ ...c, buffer: Number(e.target.value) || 0 }))} />
              </label>
            )}
          </div>
          {content.mode === 'ready_by' && (
            <div className="flex flex-col gap-2">
              <span className={labelClass}>Bride done before the ready time</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Bride done before the ready time">
                {[0, 60, 90, 120].map((m) => (
                  <button key={m} type="button" aria-pressed={(content.brideEarly ?? 90) === m} onClick={() => update((c) => ({ ...c, brideEarly: m }))} className={segmentClass((content.brideEarly ?? 90) === m)}>
                    {m === 0 ? 'Same as ready time' : m === 60 ? '1 hour' : m === 90 ? '1½ hours' : '2 hours'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </FormSection>

      {/* 4 · one button: Arsh's rules, all at once */}
      <div className="mb-14">
        <Btn onClick={autoBuild} className="w-full sm:w-auto">Auto generate</Btn>
      </div>

      <FormSection
        title="Build the day"
        hint="Drag bricks between artists and up or down to reorder. Tap a brick to set who it is, their service, and whether they’re important."
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
              title={<span className={metaLabelClass}>Not placed yet ({layout.tray.length})</span>}
              empty={layout.tray.length === 0 && <p className="text-xs text-faint p-2">Everyone is placed.</p>}
            >
              {layout.tray.map((b) => (
                <div key={b.id} className="w-[150px]">
                  <SortableBrick brick={b} onOpen={openBrick} />
                </div>
              ))}
            </Lane>
          </SortableContext>

          <div className="flex gap-2 overflow-x-auto mt-6 pb-2">
            <div className="w-16 shrink-0 hidden sm:block">
              <div className="h-8" />
              {layout.start != null && (
                <div className="relative" style={{ height: (layout.end - layout.start) * PX + 60 }}>
                  {Array.from({ length: Math.floor((layout.end - layout.start) / 60) + 1 }, (_, i) => layout.start + i * 60).map((t) => (
                    <span key={t} className="absolute right-2 text-[11px] text-faint tabular-nums whitespace-nowrap" style={{ top: (t - layout.start) * PX + 4 }}>{formatMinutes(t)}</span>
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
                    <span className="text-[11px] tracking-[0.2em] uppercase text-dark truncate px-1">
                      {col.name}
                      {col.start != null && <span className="text-faint normal-case tracking-normal"> · {formatMinutes(col.start)}</span>}
                    </span>
                  }
                  empty={col.items.length === 0 && <p className="text-xs text-faint p-3 text-center">Drag people here</p>}
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
          <Btn variant="outline" size="sm" onClick={() => addBrick('gap')}>+ Add break</Btn>
        </div>

        {layout.readyBy != null && layout.start != null && (
          <p className="text-sm text-body">
            First brush at <span className="text-dark font-medium">{formatMinutes(layout.start)}</span> · everyone ready by{' '}
            <span className="text-dark font-medium">{formatMinutes(layout.readyBy)}</span>
          </p>
        )}
        {(earlyStart || conflicts.length > 0) && (
          <ul className={`${softNote} flex flex-col gap-1.5`} aria-label="Things to check">
            {earlyStart && (
              <li className="flex items-start gap-2.5 text-danger">
                <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0 mt-[7px]" aria-hidden="true" />
                First brush is earlier than the booked arrival ({fmtTime(event.start_time)}). Consider an early-start fee.
              </li>
            )}
            {conflicts.map((c, i) => (
              <li key={i} className="flex items-start gap-2.5 text-danger">
                <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0 mt-[7px]" aria-hidden="true" />
                {c.message}
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      <FormSection title="Notes for a smooth morning" hint="Shown to her under the timeline.">
        {content.notes.length > 0 && (
          <ul className="-mt-2">
            {content.notes.map((n, i) => (
              <li key={i} className="flex items-center gap-3 py-1.5 border-b border-line text-sm text-body">
                <span className="flex-1 min-w-0">{n}</span>
                <button
                  type="button"
                  onClick={() => update((c) => ({ ...c, notes: c.notes.filter((_, j) => j !== i) }))}
                  className={`${iconRemoveBtn} -mr-2`}
                  aria-label={`Remove note: ${n}`}
                  title="Remove note"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addNote()
              }
            }}
            placeholder="e.g. Please wear a button-up top."
            aria-label="New note"
            className={cellInputClass + ' flex-1'}
          />
          <Btn variant="outline" size="sm" className="shrink-0" onClick={addNote} disabled={!note.trim()}>
            Add
          </Btn>
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

      <div className="fixed bottom-0 inset-x-0 z-30 bg-beige/95 backdrop-blur border-t border-line print:hidden">
        <div className="max-w-6xl mx-auto px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-x-4 gap-y-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <StatusChip status={published ? 'done' : 'draft'} label={published ? 'Published' : 'Draft'} />
            <p className="text-xs truncate flex items-center gap-2" role="status">
              {msg ? (
                <span className={/could not/i.test(msg) ? 'text-danger' : 'text-muted'}>{msg}</span>
              ) : dirty ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" aria-hidden="true" />
                  <span className="text-dark">Unsaved changes</span>
                </>
              ) : (
                <span className="text-muted truncate">{`${event.name || event.event_type} · ${fmtShortDate(event.event_date)}`}</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-1 gap-y-2 sm:gap-x-2 ml-auto">
            <button type="button" className={quietBtn} onClick={() => setPreview(true)}>Preview</button>
            <button type="button" className={quietBtn} onClick={() => timelinePdf(false)} disabled={busy}>
              Save as PDF
            </button>
            <button type="button" className={quietBtn} onClick={() => timelinePdf(true)} disabled={busy} title="Emails this timeline as a PDF to the studio’s email">
              Email to studio
            </button>
            {published && (
              <button type="button" className={quietBtn} onClick={() => save(false)} disabled={busy}>
                Hide<span className="hidden sm:inline">&nbsp;from her</span>
              </button>
            )}
            <Btn variant="outline" size="sm" onClick={() => save(null)} disabled={busy}>Save draft</Btn>
            {published ? (
              <Btn size="sm" onClick={() => save(true)} disabled={busy || !dirty}>Update</Btn>
            ) : (
              <Btn size="sm" onClick={() => save(true)} disabled={busy || !content.bricks.some((b) => b.column)}>Publish</Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

