// Timeline maths — pure module (no JSX). A timeline is columns (artists /
// artists) of stacked "bricks" (one person's service, or a gap). Times are never
// typed by hand: they fall out of the order, each brick's minutes, and one
// anchor — either "everyone ready by" (work backwards) or "start at".
//
// content = {
//   version: 1,
//   mode: 'ready_by' | 'start_at',
//   anchor: 'HH:MM',          // ready-by time, or start time
//   buffer: 30,               // ready_by only: minutes kept free at the end for touch-ups
//   brideEarly: 90,           // auto-build: the bride is done this long before the ready time
//   columns: [{ id, name, bestAt?: 'hair' | 'makeup' | 'both' }],
//   bricks: [{ id, column: columnId | null (tray), kind: 'person' | 'gap',
//              name, relation, side: 'bride' | 'groom' | '', service: 'hair' | 'makeup' | 'both' | null,
//              minutes, vip, bride, member_id, note, label }],
//   notes: ['…'],
// }

import { hasHair, hasMakeup, isStarredRelation, sideForRelation } from './services.js'

// every service is one hour unless Arsh sets otherwise (Bhagesh, 2026-09-26)
export const SERVICE_MINUTES = 60
export const DEFAULT_MINUTES = { hair: 60, makeup: 60, both: 60 }
export const BRIDE_MINUTES = { hair: 60, makeup: 60, both: 60 }

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
    buffer: 30,
    brideEarly: 90,
    columns: [{ id: uid('c'), name: 'Arsh', bestAt: 'hair' }],
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
    brideEarly: Number.isFinite(Number(content.brideEarly)) ? Number(content.brideEarly) : 90,
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

// Same person booked with two artists at overlapping times → warning list.
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
        out.push({ ids: [a.id, b.id], message: `${a.name || 'Someone'} is with two artists at once (${a.colName} & ${b.colName}).` })
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
          service: l.service, minutes: l.minutes || BRIDE_MINUTES[l.service] || SERVICE_MINUTES, vip: true, bride: true,
          member_id: bride?.id || null, note: '', label: l.label,
        })
        continue
      }
      // exact service match first, then someone booked for both (a "both"
      // guest can fill a makeup-only slot at the Mehndi), then anyone unset
      const free = attending.filter((m) => !used.has(m.id))
      const match =
        free.find((m) => m.services === l.service) ||
        free.find((m) => m.services === 'both' && l.service !== 'both') ||
        free.find((m) => !m.services)
      if (match) used.add(match.id)
      out.push({
        id: uid(), column: null, kind: 'person',
        name: match?.name || `${l.label}${count > 1 ? ` ${n + 1}` : ''}`,
        relation: match?.relation || '', side: sideForRelation(match?.relation) || 'bride', service: l.service,
        minutes: l.minutes || DEFAULT_MINUTES[l.service] || SERVICE_MINUTES, vip: isStarredRelation(match?.relation), bride: false,
        member_id: match?.id || null, note: '', label: l.label, placeholder: !match,
      })
    }
  }
  return out
}

// Arrange bricks onto a template's columns.
//   single → everyone with the first artist, bride last
//   split  → bride last with the first artist, everyone else load-balanced
//   teams  → a Hair artist and a Makeup artist; "both" people get one brick with each
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
        out.push({ ...b, id: uid(), column: hairCol.id, service: 'hair', minutes: b.service === 'both' ? SERVICE_MINUTES : b.minutes })
      }
      if (hasMakeup(b.service)) {
        out.push({ ...b, id: uid(), column: makeupCol.id, service: 'makeup', minutes: b.service === 'both' ? SERVICE_MINUTES : b.minutes })
      }
      return out
    }
    // bride: hair opens the hair artist's day, makeup closes the makeup artist's.
    // everyone else rotates (A's makeup runs while B's hair is done).
    const brideParts = brides.flatMap(split)
    const otherParts = others.flatMap(split)
    const hairOthers = otherParts.filter((b) => b.column === hairCol.id)
    const makeupOthers = otherParts.filter((b) => b.column === makeupCol.id)
    const rotated = makeupOthers.length > 1 ? [...makeupOthers.slice(1), makeupOthers[0]] : makeupOthers
    placed.push(...brideParts.filter((b) => b.column === hairCol.id), ...hairOthers)
    placed.push(...rotated, ...brideParts.filter((b) => b.column === makeupCol.id))
  } else if (template.strategy === 'split' && columns.length > 1) {
    // balance the load: each person goes to the artist with the least booked
    // time so far; the bride's time counts against the first artist up front.
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

// Share everyone out between the artists already on the timeline (keeps their
// names/ids): the bride stays with the first artist and finishes last; everyone
// else goes to whoever has the least booked time so far. Breaks stay put.
export function shareOut(columns, bricks) {
  if (!columns.length) return bricks
  const people = bricks.filter((b) => b.kind !== 'gap')
  const brides = people.filter((b) => b.bride)
  const others = people.filter((b) => !b.bride)
  const load = columns.map((_, i) => (i === 0 ? brides.reduce((s, b) => s + brickMinutes(b), 0) : 0))
  const placed = []
  for (const b of others) {
    const i = load.indexOf(Math.min(...load))
    load[i] += brickMinutes(b)
    placed.push({ ...b, column: columns[i].id })
  }
  for (const b of brides) placed.push({ ...b, column: columns[0].id })
  return [...bricks.filter((b) => b.kind === 'gap'), ...placed]
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

// ---- Auto-build: Arsh's rules for a getting-ready day (Bhagesh, 2026-09-26) --
// • every service is one hour — hair and makeup are separate hours
// • a person's two services sit as close together as the day allows (not
//   forced back to back, either order — makeup then hair is preferred, as the
//   dupatta is pinned into the hair last) and everyone finishes as close to
//   their target time as the artists allow, so nobody sits around
// • the bride is done by the best artist for each part (each artist's
//   "best at") and finishes `brideEarly` minutes before the ready time, in
//   time for first-look photos (0 = done with everyone else, before touch-ups)
// • important people get ready alongside her and are done around the same
//   time (1–2 hours early), not at the very end
// • the last `buffer` minutes stay free for touch-ups
export const ARTIST_SKILLS = ['hair', 'makeup', 'both']

// an artist's "best at" — unset: the first artist (Arsh) is hair, the second makeup
export function artistSkill(col, index) {
  if (ARTIST_SKILLS.includes(col?.bestAt)) return col.bestAt
  return index === 0 ? 'hair' : index === 1 ? 'makeup' : 'both'
}

export function autoPlan(content, { serviceMinutes = SERVICE_MINUTES } = {}) {
  const readyBy = parseTime(content.anchor) ?? 540
  const touchUp = Math.max(0, Number(content.buffer) || 0)
  // what Arsh picked (0 = same as the ready time) is saved as-is; for planning the
  // bride still finishes before the touch-up window, like everyone else
  const brideChoice = Math.max(0, Number(content.brideEarly ?? 90) || 0)
  const brideEarly = Math.max(touchUp, brideChoice)
  const end = readyBy - touchUp
  const brideEnd = readyBy - brideEarly
  const artists = content.columns.map((c, i) => ({ id: c.id, skill: artistSkill(c, i), busy: [] }))
  if (!artists.length) return content

  // one entry per person — bricks of the same person (split hair / makeup) merge
  const people = []
  const byKey = new Map()
  for (const b of content.bricks) {
    if (b.kind === 'gap' || !b.service) continue
    const k = personKey(b) || b.id
    let p = byKey.get(k)
    if (!p) {
      p = { base: b, hair: false, makeup: false }
      byKey.set(k, p)
      people.push(p)
    }
    if (hasHair(b.service)) p.hair = true
    if (hasMakeup(b.service)) p.makeup = true
    if (b.bride) p.base = { ...p.base, bride: true, vip: true }
  }

  const fits = (a, from, to) => a.busy.every((iv) => to <= iv.start || from >= iv.end)
  // start times that end by `deadline` without clashing, latest first (only the
  // deadline itself or the start of a booked slot can be a "latest" end)
  const freeStarts = (a, deadline) =>
    [...new Set([deadline, ...a.busy.map((iv) => iv.start).filter((t) => t <= deadline)])]
      .sort((x, y) => y - x)
      .map((e) => e - serviceMinutes)
      .filter((s) => fits(a, s, s + serviceMinutes))
  const skillScore = (a, service) => (a.skill === service ? 2 : a.skill === 'both' ? 1 : 0)

  const bride = people.find((p) => p.base.bride)
  // important people first (they finish closest to the ready time), then anyone
  // having both services (their two hours need to sit together), then booking order
  const weight = (p) => (p.base.vip ? 2 : 0) + (p.hair && p.makeup ? 1 : 0)
  const others = people.filter((p) => p !== bride).sort((a, b) => weight(b) - weight(a))

  // seeded randomness — the same booking always gives the same plan
  let seed = 20260926
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
  const shuffled = (list) => {
    const out = [...list]
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  // One greedy pass for a given order. Per person, a wait BETWEEN their two
  // services costs 1.5× (kept close, not forced together); finishing early
  // costs once (3× for important people); the artist's "best at" breaks ties.
  const plan = (order, skillTie, jitter) => {
    for (const a of artists) a.busy = []
    const tasks = []
    let score = 0
    const book = (a, start, service, p) => {
      a.busy.push({ start, end: start + serviceMinutes })
      tasks.push({ person: p, service, column: a.id, start })
    }
    // the bride: only the best tier that exists for each part
    const tier = (service, bestOnly) =>
      !bestOnly
        ? artists
        : [artists.filter((a) => a.skill === service), artists.filter((a) => a.skill === 'both')].find((t) => t.length) || artists
    const schedule = (p, deadline, bestOnly) => {
      const late = p.base.vip ? 3 : 1
      if (p.hair && p.makeup) {
        // either order; the later service is placed first (we plan backwards)
        let best = null
        for (const [last, first, orderCost] of [['hair', 'makeup', 0], ['makeup', 'hair', 20]]) {
          for (const a of tier(last, bestOnly)) {
            for (const ls of freeStarts(a, deadline).slice(0, 8)) {
              for (const b of tier(first, bestOnly)) {
                const fs = freeStarts(b, ls)[0]
                if (fs == null) continue
                const cost =
                  1.5 * (ls - fs - serviceMinutes) + late * (deadline - ls - serviceMinutes) + orderCost - skillTie * (skillScore(a, last) + skillScore(b, first))
                if (!best || cost < best.cost - 1e-9 || (jitter && cost < best.cost + 1e-9 && rand() < 0.5)) best = { cost, a, ls, last, b, fs, first }
              }
            }
          }
        }
        book(best.b, best.fs, best.first, p)
        book(best.a, best.ls, best.last, p)
        score += best.cost
        return
      }
      const service = p.hair ? 'hair' : 'makeup'
      let best = null
      for (const a of tier(service, bestOnly)) {
        const s = freeStarts(a, deadline)[0]
        const cost = late * (deadline - s - serviceMinutes) - skillTie * skillScore(a, service)
        if (!best || cost < best.cost - 1e-9 || (jitter && cost < best.cost + 1e-9 && rand() < 0.5)) best = { cost, a, s }
      }
      book(best.a, best.s, service, p)
      score += best.cost
    }
    if (bride) schedule(bride, brideEnd, true)
    // important people: done around the bride's time; everyone else: before the touch-ups
    for (const p of order) schedule(p, p.base.vip ? brideEnd : end, false)
    // the day as a whole: artists standing idle between clients costs double,
    // and an earlier first start costs a little (nobody wants a 4:30 AM call)
    let idle = 0
    for (const a of artists) {
      if (!a.busy.length) continue
      const worked = a.busy.reduce((sum, iv) => sum + (iv.end - iv.start), 0)
      idle += end - Math.min(...a.busy.map((iv) => iv.start)) - worked
    }
    const first = Math.min(...tasks.map((t) => t.start), end)
    return { tasks, score: score + 2 * idle + 1.5 * (end - first) }
  }

  // Try the natural order plus seeded shuffles and keep the calmest day.
  const orders = [others, [...others].reverse(), ...Array.from({ length: others.length > 1 ? 60 : 0 }, () => shuffled(others))]
  let bestPlan = null
  for (const [i, order] of orders.entries()) {
    for (const tie of [0.1, 0, -0.1]) {
      const r = plan(order, tie, i > 1) // equal choices break randomly on the shuffled runs
      if (!bestPlan || r.score < bestPlan.score - 1e-9) bestPlan = r
    }
  }
  const tasks = bestPlan.tasks

  const bricks = []
  for (const a of artists) {
    const mine = tasks.filter((t) => t.column === a.id).sort((x, y) => x.start - y.start)
    mine.forEach((t, i) => {
      const { id: _drop, placeholder, ...who } = t.person.base
      bricks.push({ ...who, placeholder, id: uid(), column: a.id, kind: 'person', service: t.service, minutes: serviceMinutes })
      const until = mine[i + 1]?.start ?? end
      const idle = until - (t.start + serviceMinutes)
      if (idle > 0) bricks.push({ id: uid(), column: a.id, kind: 'gap', name: 'Break', minutes: idle })
    })
  }
  // anyone without a service stays in the tray
  const unplaced = content.bricks.filter((b) => b.kind !== 'gap' && !b.service).map((b) => ({ ...b, column: null }))
  return { ...content, mode: 'ready_by', buffer: touchUp, brideEarly: brideChoice, bricks: [...bricks, ...unplaced] }
}
