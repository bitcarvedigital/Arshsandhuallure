import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'
import { layoutTimeline, formatMinutes } from '../../src/shared/booking/timeline.js'
import { sideLabel } from '../../src/shared/booking/services.js'

// The getting-ready timeline as a PDF — the same calendar the bride sees in her
// portal: artists side by side on one time axis, sage = hair, blush = makeup,
// a gold ★ for important people, the ready-by line and the touch-up window.
// Fonts ship in api/_assets/fonts (OFL) — vercel.json includeFiles bundles them.

const font = (f) => fileURLToPath(new URL(`../_assets/fonts/${f}`, import.meta.url))
const FONTS = {
  display: font('PlayfairDisplay-Regular.ttf'),
  italic: font('PlayfairDisplay-Italic.ttf'),
  body: font('Inter-Regular.ttf'),
  medium: font('Inter-Medium.ttf'),
  semibold: font('Inter-SemiBold.ttf'),
}

const GOLD = '#7A5A32'
const INK = '#1A1A1A'
const MUTED = '#6B5D53'
const FAINT = '#786A60'
const LINE = '#E6DACD'
const SOFT = '#F3EDE6'

const FILL = { hair: '#E4E8DC', makeup: '#F1DACA', none: '#EFE6DA' }
const STRIPE = { hair: '#7D8B6A', makeup: '#B9826A', none: '#C8B8AC' }
const TEXT = { hair: '#33402A', makeup: '#4E2F22', both: '#2E241C', none: INK }
const SERVICE = { hair: 'Hair', makeup: 'Makeup', both: 'Hair & Makeup' }

const M = 40

function shortDate(d) {
  if (!d) return 'Date TBC'
  return new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

function star(doc, cx, cy, r, color = GOLD) {
  const pts = []
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)])
  }
  doc.polygon(...pts).fill(color)
}

export function renderTimelinePdf({ client = {}, event = {}, content }) {
  const layout = layoutTimeline(content)
  const cols = layout.columns
  const doc = new PDFDocument({
    size: 'LETTER',
    layout: cols.length > 3 ? 'landscape' : 'portrait',
    margins: { top: M, bottom: M, left: M, right: M },
    font: FONTS.body,
    bufferPages: true,
    info: { Title: `Getting-ready timeline — ${client.full_name || ''}`.trim(), Author: 'Arsh Sandhu Allure' },
  })
  for (const [name, path] of Object.entries(FONTS)) doc.registerFont(name, path)
  const chunks = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const W = doc.page.width
  const H = doc.page.height
  const CW = W - M * 2
  const center = (text, y, opts = {}) => doc.text(text, M, y, { width: CW, align: 'center', lineBreak: false, ...opts })

  // ---- header ----------------------------------------------------------------
  doc.font('semibold').fontSize(7.5).fillColor(GOLD)
  center('GETTING-READY TIMELINE', M + 4, { characterSpacing: 2 })
  doc.font('italic').fontSize(24).fillColor(INK)
  center(client.full_name || 'Timeline', M + 20)
  doc.font('body').fontSize(10).fillColor(INK)
  center(`${event.name || event.event_type || 'Event'} · ${shortDate(event.event_date)}`, M + 54)
  let y = M + 72
  if (layout.readyBy != null) {
    doc.font('semibold').fontSize(7.5).fillColor(GOLD)
    center(`READY BY ${formatMinutes(layout.readyBy)}`, y, { characterSpacing: 1.6 })
    y += 18
  }

  // ---- legend ------------------------------------------------------------------
  const legend = [['hair', 'Hair'], ['makeup', 'Makeup'], ['both', 'Hair & Makeup'], ['star', 'Important'], ['gap', 'Break']]
  doc.font('body').fontSize(8)
  const itemW = legend.map(([, l]) => 16 + doc.widthOfString(l) + 16)
  let lx = M + (CW - itemW.reduce((s, w) => s + w, 0)) / 2
  y += 6
  for (const [i, [k, l]] of legend.entries()) {
    if (k === 'star') star(doc, lx + 5, y + 4.5, 5)
    else if (k === 'gap') doc.roundedRect(lx, y, 11, 9, 2).dash(1.5, { space: 1.5 }).lineWidth(0.6).strokeColor('#B8A898').stroke().undash()
    else if (k === 'both') {
      doc.save().roundedRect(lx, y, 11, 9, 2).clip()
      doc.polygon([lx, y], [lx + 11, y], [lx, y + 9]).fill(FILL.hair)
      doc.polygon([lx + 11, y], [lx + 11, y + 9], [lx, y + 9]).fill(FILL.makeup)
      doc.restore()
    } else {
      doc.roundedRect(lx, y, 11, 9, 2).fill(FILL[k])
      doc.rect(lx, y, 2, 9).fill(STRIPE[k])
    }
    doc.font('body').fontSize(8).fillColor(MUTED).text(l, lx + 16, y + 0.5, { lineBreak: false })
    lx += itemW[i]
  }
  y += 28

  // ---- the grid ----------------------------------------------------------------
  if (layout.start == null) {
    doc.font('body').fontSize(10).fillColor(FAINT)
    center('No one is placed on this timeline yet.', y + 20)
  } else {
    const notesH = (content.notes || []).length ? 30 + content.notes.length * 16 : 0
    const footerH = 46
    const start = Math.floor(layout.start / 30) * 30
    const end = Math.ceil(Math.max(layout.end, layout.readyBy ?? layout.end) / 30) * 30
    const headH = 20
    const avail = H - M - footerH - notesH - y - headH
    const ppm = Math.max(0.75, Math.min(2.2, avail / Math.max(60, end - start))) // points per minute
    const axisW = 52
    const gap = 8
    const gx = M + axisW
    const colW = (CW - axisW - gap * (cols.length - 1)) / cols.length
    const top = y + headH
    const yAt = (t) => top + (t - start) * ppm

    // artist names
    cols.forEach((c, i) => {
      doc.font('semibold').fontSize(8).fillColor(INK)
      doc.text(String(c.name || '').toUpperCase(), gx + i * (colW + gap), y + 4, { width: colW, align: 'center', characterSpacing: 1.4, lineBreak: false, ellipsis: true })
    })
    // half-hour lines + hour labels
    for (let t = start; t <= end; t += 30) {
      doc.moveTo(gx, yAt(t)).lineTo(M + CW, yAt(t)).lineWidth(0.4).strokeColor(LINE).stroke()
      if ((t - start) % 60 === 0 || t === start) {
        doc.font('body').fontSize(7.5).fillColor(FAINT).text(formatMinutes(t), M, yAt(t) - 3.5, { width: axisW - 8, align: 'right', lineBreak: false })
      }
    }
    // touch-up window + ready-by line
    const buffer = Number(content.buffer) || 0
    if (layout.readyBy != null) {
      if (content.mode === 'ready_by' && buffer >= 15) {
        cols.forEach((_, i) => {
          const x = gx + i * (colW + gap)
          doc.rect(x, yAt(layout.readyBy - buffer), colW, buffer * ppm).fill(SOFT)
          doc.font('semibold').fontSize(6.5).fillColor(FAINT)
          doc.text('TOUCH-UPS', x, yAt(layout.readyBy - buffer / 2) - 3, { width: colW, align: 'center', characterSpacing: 1.2, lineBreak: false })
        })
      }
      doc.moveTo(gx, yAt(layout.readyBy)).lineTo(M + CW, yAt(layout.readyBy)).lineWidth(1.4).strokeColor(GOLD).stroke()
    }
    // bricks
    cols.forEach((c, i) => {
      const x = gx + i * (colW + gap)
      for (const it of c.items) {
        const b = it.brick
        const by = yAt(it.start) + 1
        const bh = Math.max(10, (it.end - it.start) * ppm - 2)
        if (b.kind === 'gap') {
          doc.roundedRect(x, by, colW, bh, 5).dash(2, { space: 2 }).lineWidth(0.6).strokeColor('#B8A898').stroke().undash()
          if (bh >= 14) doc.font('body').fontSize(7.5).fillColor(FAINT).text(b.name || 'Break', x + 8, by + Math.min(6, bh / 2 - 4), { width: colW - 16, lineBreak: false, ellipsis: true })
          continue
        }
        const svc = b.service === 'both' ? 'both' : FILL[b.service] ? b.service : 'none'
        doc.save().roundedRect(x, by, colW, bh, 5).clip()
        if (svc === 'both') {
          doc.polygon([x, by], [x + colW, by], [x, by + bh]).fill(FILL.hair)
          doc.polygon([x + colW, by], [x + colW, by + bh], [x, by + bh]).fill(FILL.makeup)
          doc.rect(x, by, 3.5, bh / 2).fill(STRIPE.hair)
          doc.rect(x, by + bh / 2, 3.5, bh / 2).fill(STRIPE.makeup)
        } else {
          doc.rect(x, by, colW, bh).fill(FILL[svc])
          doc.rect(x, by, 3.5, bh).fill(STRIPE[svc])
        }
        doc.restore()
        const important = b.vip || b.bride
        const textW = colW - 16 - (important ? 20 : 0)
        const color = TEXT[svc] || INK
        let ty = by + 5
        if (bh >= 30) {
          doc.font('medium').fontSize(6.5).fillColor(color).opacity(0.75)
          doc.text(`${formatMinutes(it.start)} – ${formatMinutes(it.end)}`, x + 9, ty, { width: textW, characterSpacing: 0.6, lineBreak: false })
          doc.opacity(1)
          ty += 10
        }
        doc.font('medium').fontSize(bh >= 22 ? 9.5 : 8).fillColor(color)
        doc.text(b.name || 'Guest', x + 9, ty, { width: textW, lineBreak: false, ellipsis: true })
        ty += 12
        const meta = [b.relation, sideLabel(b), SERVICE[b.service]].filter(Boolean).join(' · ')
        if (bh >= 44 && meta) doc.font('body').fontSize(7.5).fillColor(color).opacity(0.8).text(meta, x + 9, ty, { width: textW, lineBreak: false, ellipsis: true }).opacity(1)
        if (important) star(doc, x + colW - 13, by + bh / 2, Math.min(7.5, bh / 2 - 2))
      }
    })
    y = yAt(end) + 22

    // ---- notes -------------------------------------------------------------------
    if ((content.notes || []).length) {
      doc.font('semibold').fontSize(7.5).fillColor(GOLD).text('NOTES FOR A SMOOTH MORNING', M, y, { characterSpacing: 1.6, lineBreak: false })
      y += 16
      for (const n of content.notes) {
        doc.circle(M + 2, y + 4.5, 1.4).fill(GOLD)
        doc.font('body').fontSize(9).fillColor('#4A3828').text(String(n), M + 10, y, { width: CW - 10 })
        y = doc.y + 4
      }
    }
  }

  // ---- footer on every page ------------------------------------------------------
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i)
    const keep = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    doc.font('semibold').fontSize(7).fillColor(INK)
    doc.text('ARSH SANDHU ALLURE', M, H - M - 12, { width: CW, align: 'center', characterSpacing: 2, lineBreak: false })
    doc.font('body').fontSize(7.5).fillColor(FAINT)
    doc.text('+1 (437) 221-0004 · arshsandhuallure@gmail.com · @arshsandhuallure', M, H - M + 1, { width: CW, align: 'center', lineBreak: false })
    doc.page.margins.bottom = keep
  }

  doc.end()
  return done
}

// keep what the studio sends small and well-formed before it reaches pdfkit
export function cleanTimelineContent(content) {
  const txt = (v, n) => String(v ?? '').slice(0, n)
  const c = content && typeof content === 'object' ? content : {}
  const columns = (Array.isArray(c.columns) ? c.columns : []).slice(0, 8).map((col) => ({ id: txt(col.id, 60), name: txt(col.name, 40) }))
  const ids = new Set(columns.map((col) => col.id))
  const bricks = (Array.isArray(c.bricks) ? c.bricks : []).slice(0, 150).map((b) => ({
    id: txt(b.id, 60),
    column: ids.has(b.column) ? b.column : null,
    kind: b.kind === 'gap' ? 'gap' : 'person',
    name: txt(b.name, 60),
    relation: txt(b.relation, 40),
    side: b.side === 'groom' ? 'groom' : 'bride',
    service: ['hair', 'makeup', 'both'].includes(b.service) ? b.service : null,
    minutes: Math.min(600, Math.max(5, Number(b.minutes) || 60)),
    vip: !!b.vip,
    bride: !!b.bride,
  }))
  return {
    mode: c.mode === 'start_at' ? 'start_at' : 'ready_by',
    anchor: /^\d{1,2}:\d{2}/.test(String(c.anchor || '')) ? String(c.anchor).slice(0, 5) : '09:00',
    buffer: Math.min(240, Math.max(0, Number(c.buffer) || 0)),
    columns,
    bricks,
    notes: (Array.isArray(c.notes) ? c.notes : []).slice(0, 20).map((n) => txt(n, 300)),
  }
}

