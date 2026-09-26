// Timeline maths — pure module (no JSX). A timeline is columns (artists /
// chairs) of stacked "bricks" (one person's service, or a gap). Times are never
// typed by hand: they fall out of the order, each brick's minutes, and one
// anchor — either "everyone ready by" (work backwards) or "start at".
//
// content = {
//   version: 1,
//   mode: 'ready_by' | 'start_at',
//   anchor: 'HH:MM',          // ready-by time, or start time
//   buffer: 15,               // ready_by only: finish this many minutes early
//   columns: [{ id, name }],
//   bricks: [{ id, column: columnId | null (tray), kind: 'person' | 'gap',
//              name, relation, side: 'bride' | 'groom' | '', service: 'hair' | 'makeup' | 'both' | null,
//              minutes, vip, bride, member_id, note, label }],
//   notes: ['…'],
// }

import { hasHair, hasMakeup } from './services.js'

export const DEFAULT_MINUTES = { hair: 45, makeup: 45, both: 90 }
export const BRIDE_MINUTES = { hair: 60, makeup: 90, both: 150 }

let seq = 0
export function uid(prefix = 'b') {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function parseTime(t) {
  if (!t || typeof t !== 'string') return null
  const m = t.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

// minutes-from-midnight (may be negative / past 24h) → "6:30 AM"
export function formatMinutes(mins) {
  if (mins == null || Number.isNaN(mins)) return '—'
  const m = ((Math.round(mins) % 1440) + 1440) % 1440
  const h24 = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${mm} ${h24 < 12 ? 'AM' : 'PM'}`
}

export function emptyTimeline(event = {}) {
  return {
    version: 1,
    mode: event.ready_time ? 'ready_by' : 'start_at',
    anchor: (event.ready_time || event.start_time || '09:00').slice(0, 5),
    buffer: 15,
    columns: [{ id: uid('c'), name: 'Arsh' }],
    bricks: [],
    notes: [],
  }
}

export function normalizeTimeline(content, event) {
  if (!content || !Array.isArray(content.columns) || !content.columns.length) {
    const base = emptyTimeline(event)
    return content && Array.isArray(content.bricks) ? { ...base, ...content, columns: base.columns } : base
  }
  return {
    version: 1,
    mode: content.mode === 'start_at' ? 'start_at' : 'ready_by',
    anchor: content.anchor || (event?.ready_time || '09:00').slice(0, 5),
    buffer: Number.isFinite(Number(content.buffer)) ? Number(content.buffer) : 15,
    columns: content.columns,
    bricks: Array.isArray(content.bricks) ? content.bricks : [],
    notes: Array.isArray(content.notes) ? content.notes : [],
  }
}

const brickMinutes = (b) => Math.max(5, Number(b.minutes) || 0)

// → { columns: [{ id, name, items: [{ brick, start, end }], start, end }], start, end, tray }
export function layoutTimeline(content) {
  const anchor = parseTime(content.anchor) ?? 540
  const buffer = content.mode === 'ready_by' ? Math.max(0, Number(content.buffer) || 0) : 0
  const columns = content.columns.map((col) => {
    const bricks = content.bricks.filter((b) => b.column === col.id)
    const total = bricks.reduce((s, b) => s + brickMinutes(b), 0)
    let t = content.mode === 'ready_by' ? anchor - buffer - total : anchor
    const items = bricks.map((b) => {
      const start = t
      t += brickMinutes(b)
      return { brick: b, start, end: t }
    })
    return { ...col, items, start: items[0]?.start ?? null, end: items.length ? t : null }
  })
  const starts = columns.map((c) => c.start).filter((v) => v != null)
  const ends = columns.map((c) => c.end).filter((v) => v != null)
  return {
    columns,
    start: starts.length ? Math.min(...starts) : null,
    end: ends.length ? Math.max(...ends) : null,
    readyBy: content.mode === 'ready_by' ? anchor : null,
    tray: content.bricks.filter((b) => !b.column || !content.columns.some((c) => c.id === b.column)),
  }
}

const personKey = (b) => b.member_id || (b.name || '').trim().toLowerCase()

// Same person booked in two chairs at overlapping times → warning list.
export function detectConflicts(layout) {
  const seen = []
  for (const col of layout.columns) {
    for (const it of col.items) {
      if (it.brick.kind === 'gap') continue
      const key = personKey(it.brick)
      if (!key) continue
      seen.push({ key, col: col.id, colName: col.name, name: it.brick.name, start: it.start, end: it.end, id: it.brick.id })
    }
  }
  const out = []
  for (let i = 0; i < seen.length; i += 1) {
    for (let j = i + 1; j < seen.length; j += 1) {
      const a = seen[i]
      const b = seen[j]
      if (a.key === b.key && a.col !== b.col && a.start < b.end && b.start < a.end) {
        out.push({ ids: [a.id, b.id], message: `${a.name || 'Someone'} is in two chairs at once (${a.colName} & ${b.colName}).` })
      }
    }
  }
  return out
}

// Unplaced bricks for everyone booked at this event: one brick per person per
// service line (qty 3 party makeup → 3 bricks). Party members attending the
// event pre-fill names where their service matches.
export function bricksFromBooking(event, lines = [], members = []) {
  const attending = members.filter(
    (m) => !m.is_bride && (!Array.isArray(m.event_ids) || !m.event_ids.length || m.event_ids.includes(event.id)),
  )
  const bride = members.find((m) => m.is_bride)
  const used = new Set()
  const out = []
  const own = lines
    .filter((l) => l.event_id === event.id && l.kind === 'service' && l.service && Number(l.qty) > 0)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  for (const l of own) {
    const count = Math.max(1, Math.round(Number(l.qty)))
    for (let n = 0; n < count; n += 1) {
      if (l.for_bride) {
        out.push({
          id: uid(), column: null, kind: 'person', name: bride?.name || 'Bride', relation: 'Bride', side: 'bride',
          service: l.service, minutes: l.minutes || BRIDE_MINUTES[l.service] || 90, vip: true, bride: true,
          member_id: bride?.id || null, note: '', label: l.label,
        })
        continue
      }
      const match = attending.find((m) => !used.has(m.id) && (!m.services || m.services === l.service))
      if (match) used.add(match.id)
      out.push({
        id: uid(), column: null, kind: 'person',
        name: match?.name || `${l.label}${count > 1 ? ` ${n + 1}` : ''}`,
        relation: match?.relation || '', side: 'bride', service: l.service,
        minutes: l.minutes || DEFAULT_MINUTES[l.service] || 45, vip: false, bride: false,
        member_id: match?.id || null, note: '', label: l.label, placeholder: !match,
      })
    }
  }
  return out
}

// Arrange bricks onto a template's columns.
//   single → everyone in the first chair, bride last
//   split  → bride last in the first chair, everyone else round-robin
//   teams  → a Hair chair and a Makeup chair; "both" people get one brick in each
export function arrange(template, bricks) {
  const columns = template.columns.map((name) => ({ id: uid('c'), name }))
  const brides = bricks.filter((b) => b.bride)
  const others = bricks.filter((b) => !b.bride)
  const placed = []
  if (template.strategy === 'teams' && columns.length >= 2) {
    const [hairCol, makeupCol] = columns
    const split = (b) => {
      const out = []
      if (hasHair(b.service)) {
        out.push({ ...b, id: uid(), column: hairCol.id, service: 'hair', minutes: b.service === 'both' ? Math.max(30, Math.round((b.minutes * 0.4) / 5) * 5) : b.minutes })
      }
      if (hasMakeup(b.service)) {
        out.push({ ...b, id: uid(), column: makeupCol.id, service: 'makeup', minutes: b.service === 'both' ? Math.max(30, Math.round((b.minutes * 0.6) / 5) * 5) : b.minutes })
      }
      return out
    }
    // bride: hair opens the hair chair, makeup closes the makeup chair.
    // everyone else rotates (A's makeup runs while B's hair is done).
    const brideParts = brides.flatMap(split)
    const otherParts = others.flatMap(split)
    const hairOthers = otherParts.filter((b) => b.column === hairCol.id)
    const makeupOthers = otherParts.filter((b) => b.column === makeupCol.id)
    const rotated = makeupOthers.length > 1 ? [...makeupOthers.slice(1), makeupOthers[0]] : makeupOthers
    placed.push(...brideParts.filter((b) => b.column === hairCol.id), ...hairOthers)
    placed.push(...rotated, ...brideParts.filter((b) => b.column === makeupCol.id))
  } else if (template.strategy === 'split' && columns.length > 1) {
    // balance the load: each person goes to the chair with the least booked
    // time so far; the bride's time counts against the first chair up front.
    const load = columns.map((_, i) => (i === 0 ? brides.reduce((s, b) => s + brickMinutes(b), 0) : 0))
    for (const b of others) {
      const i = load.indexOf(Math.min(...load))
      load[i] += brickMinutes(b)
      placed.push({ ...b, column: columns[i].id })
    }
    for (const b of brides) placed.push({ ...b, column: columns[0].id })
  } else {
    for (const b of others) placed.push({ ...b, column: columns[0].id })
    for (const b of brides) placed.push({ ...b, column: columns[0].id })
  }
  return { columns, bricks: placed }
}

// Legacy free-text rows { time, artist, person, service } → bricks.
export function fromLegacyEntries(entries = []) {
  const names = [...new Set(entries.map((e) => (e.artist || '').trim() || 'Arsh'))]
  const columns = names.map((name) => ({ id: uid('c'), name }))
  const colFor = (e) => columns[names.indexOf((e.artist || '').trim() || 'Arsh')].id
  let earliest = null
  const bricks = entries.map((e) => {
    const svcText = String(e.service || '').toLowerCase()
    const service = /hair/.test(svcText) && /make/.test(svcText) ? 'both' : /hair/.test(svcText) ? 'hair' : /make/.test(svcText) ? 'makeup' : null
    const range = parseRange(e.time)
    if (range && (earliest == null || range.start < earliest)) earliest = range.start
    const isBride = /bride/i.test(e.person || '')
    return {
      id: uid(), column: colFor(e), kind: 'person',
      name: String(e.person || '').replace(/\s*\((bride)\)\s*/i, '').trim() || 'Guest',
      relation: isBride ? 'Bride' : '', side: 'bride', service,
      minutes: range ? Math.max(5, range.end - range.start) : 60,
      vip: isBride, bride: isBride, member_id: null, note: '', label: e.service || '',
    }
  })
  return { columns, bricks, anchor: earliest != null ? formatHHMM(earliest) : null }
}

function formatHHMM(mins) {
  const m = ((mins % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// "6:30 – 7:30 am", "6:30am-7:30am", "10:00 - 11:00 AM"
function parseRange(text) {
  const s = String(text || '').toLowerCase()
  const parts = [...s.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g)].filter((m) => m[0].trim())
  if (parts.length < 2) return null
  const trailing = parts[parts.length - 1][3] || parts[0][3] || null
  const toMin = (m, fallbackMer) => {
    let h = Number(m[1]) % 12
    const mer = m[3] || fallbackMer
    if (mer === 'pm') h += 12
    return h * 60 + Number(m[2] || 0)
  }
  const start = toMin(parts[0], trailing)
  let end = toMin(parts[1], trailing)
  if (end <= start) end += parts[1][3] ? 0 : 12 * 60
  if (end <= start) return null
  return { start, end }
}
