import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'

// Branded invoice PDF in Arsh's palette: white page (prints cleanly), beige
// letterhead band, Playfair Display headings, Inter body, gold hairlines.
// Fonts ship in api/_assets/fonts (OFL) — vercel.json includeFiles bundles them.

const font = (f) => fileURLToPath(new URL(`../_assets/fonts/${f}`, import.meta.url))
const FONTS = {
  display: font('PlayfairDisplay-Regular.ttf'),
  italic: font('PlayfairDisplay-Italic.ttf'),
  body: font('Inter-Regular.ttf'),
  medium: font('Inter-Medium.ttf'),
  semibold: font('Inter-SemiBold.ttf'),
}

const BEIGE = '#F5EFEA'
const CARD = '#EAE0D6'
const GOLD = '#7A5A32'
const GOLD_LIGHT = '#B08A5A'
const INK = '#1A1A1A'
const DARK = '#2B2521'
const MUTED = '#8A7A70'
const BODY = '#4A3828'
const RULE = '#E0D2C2'

const M = 54 // margin

const money = (v) =>
  v == null || v === '' ? '—' : `$${Number(v).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function shortDate(d) {
  if (!d) return 'Date TBC'
  const dt = new Date(`${String(d).slice(0, 10)}T12:00:00Z`)
  return dt.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function renderInvoicePdf({ invoice = {}, snapshot = {} }) {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: M, bottom: M, left: M, right: M },
    font: FONTS.body,
    bufferPages: true,
    info: { Title: `Invoice ${invoice.number || ''}`.trim(), Author: 'Arsh Sandhu Allure' },
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
  const bottom = H - M - 20
  let y = 0

  const ensure = (need) => {
    if (y + need > bottom) {
      doc.addPage()
      y = M
    }
  }
  const rule = (color = RULE, width = 0.6) => {
    doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(width).strokeColor(color).stroke()
  }
  const micro = (text, x, yy, opts = {}) =>
    doc.font('semibold').fontSize(7).fillColor(opts.color || GOLD).text(text.toUpperCase(), x, yy, { characterSpacing: 1.6, lineBreak: false, ...opts })

  // ---- letterhead band ------------------------------------------------------
  doc.rect(0, 0, W, 132).fill(BEIGE)
  doc.font('display').fontSize(22).fillColor(INK).text('Arsh Sandhu Allure', M, 42, { lineBreak: false })
  micro('Luxury Bridal Hair & Makeup', M, 72)
  doc.font('body').fontSize(8).fillColor(MUTED)
    .text('Mississauga · Greater Toronto Area', M, 88, { lineBreak: false })
    .text('+1 (437) 221-0004 · arshsandhuallure@gmail.com', M, 100, { lineBreak: false })

  doc.font('display').fontSize(26).fillColor(INK).text('Invoice', M, 38, { width: CW, align: 'right' })
  doc.font('medium').fontSize(9).fillColor(INK).text(invoice.number || 'PREVIEW', M, 72, { width: CW, align: 'right' })
  doc.font('body').fontSize(8).fillColor(MUTED)
    .text(`Issued ${shortDate(invoice.issued_on || new Date().toISOString())}`, M, 88, { width: CW, align: 'right' })
  if (snapshot.due_on) doc.text(`Due ${shortDate(snapshot.due_on)}`, M, 100, { width: CW, align: 'right' })
  doc.moveTo(M, 132).lineTo(M + CW, 132).lineWidth(1).strokeColor(GOLD).stroke()

  // ---- billed to ------------------------------------------------------------
  y = 156
  micro('Billed to', M, y)
  y += 14
  const bill = snapshot.bill_to || {}
  doc.font('medium').fontSize(10.5).fillColor(INK).text(bill.name || '', M, y)
  y += 15
  doc.font('body').fontSize(8.5).fillColor(MUTED).text([bill.email, bill.phone].filter(Boolean).join(' · '), M, y)
  y += 28

  // ---- events ---------------------------------------------------------------
  const colQty = M + CW - 190
  const colAmt = M + CW - 80
  const lineRow = (l) => {
    const labelH = doc.font('body').fontSize(9).heightOfString(l.label, { width: colQty - M - 12 })
    ensure(labelH + 10)
    doc.font('body').fontSize(9).fillColor(INK).text(l.label, M, y, { width: colQty - M - 12 })
    const q = Number(l.qty)
    const qtyText = l.kind !== 'service' && q === 1 ? '' : `${Number.isInteger(q) ? q : q.toFixed(2)} × ${money(l.unit_price)}`
    doc.font('body').fontSize(8).fillColor(MUTED).text(qtyText, colQty, y + 1, { width: 105, align: 'right' })
    const amt = l.kind === 'discount' ? `− ${money(l.amount)}` : money(l.amount)
    doc.font('body').fontSize(9).fillColor(l.kind === 'discount' ? '#4a6741' : INK).text(amt, colAmt, y, { width: 80, align: 'right' })
    y += Math.max(labelH, 11) + 6
    doc.moveTo(M, y - 3).lineTo(M + CW, y - 3).lineWidth(0.4).strokeColor('#EFE6DA').stroke()
  }

  for (const ev of snapshot.events || []) {
    if (!(ev.lines || []).length) continue
    ensure(70)
    doc.font('display').fontSize(13).fillColor(INK).text(ev.name || ev.event_type || 'Event', M, y, { lineBreak: false })
    micro(shortDate(ev.event_date), M, y + 4, { width: CW, align: 'right', color: MUTED })
    y += 20
    rule(GOLD, 0.6)
    y += 8
    const services = ev.lines.filter((l) => l.kind === 'service')
    const extras = ev.lines.filter((l) => l.kind === 'fee')
    const discounts = ev.lines.filter((l) => l.kind === 'discount')
    if (services.length) {
      micro('Services', M, y)
      y += 13
      services.forEach(lineRow)
    }
    if (extras.length) {
      ensure(24)
      y += 2
      micro('Additional fees', M, y)
      y += 13
      extras.forEach(lineRow)
    }
    if (discounts.length) {
      ensure(24)
      y += 2
      micro('Discount', M, y)
      y += 13
      discounts.forEach(lineRow)
    }
    ensure(20)
    doc.font('body').fontSize(9).fillColor(BODY).text('Event total', M, y)
    doc.font('medium').fontSize(9.5).fillColor(INK).text(money(ev.subtotal), colAmt, y, { width: 80, align: 'right' })
    y += 26
  }

  // ---- totals ---------------------------------------------------------------
  const t = snapshot.totals || {}
  const rows = [
    ['Services', money(t.services)],
    ['Additional fees', money(t.fees)],
    ...(Number(t.discounts) > 0 ? [['Discounts', `− ${money(t.discounts)}`]] : []),
  ]
  ensure(40 + rows.length * 16 + 60)
  const boxY = y
  const boxH = rows.length * 16 + 78
  doc.rect(M + CW / 2 - 10, boxY, CW / 2 + 10, boxH).fill(CARD)
  let ty = boxY + 12
  const tx = M + CW / 2 + 4
  const tw = CW / 2 - 18
  for (const [l, v] of rows) {
    doc.font('body').fontSize(9).fillColor(BODY).text(l, tx, ty, { lineBreak: false })
    doc.text(v, tx, ty, { width: tw, align: 'right' })
    ty += 16
  }
  doc.moveTo(tx, ty + 2).lineTo(tx + tw, ty + 2).lineWidth(0.8).strokeColor(INK).stroke()
  ty += 9
  doc.font('display').fontSize(12).fillColor(INK).text('Total booking', tx, ty, { lineBreak: false })
  doc.text(money(t.total), tx, ty, { width: tw, align: 'right' })
  ty += 20
  doc.font('body').fontSize(9).fillColor(BODY).text('Paid to date', tx, ty, { lineBreak: false })
  doc.fillColor('#4a6741').text(money(t.paid), tx, ty, { width: tw, align: 'right' })
  ty += 15
  doc.fillColor(BODY).text('Outstanding', tx, ty, { lineBreak: false })
  doc.fillColor(INK).text(money(t.outstanding), tx, ty, { width: tw, align: 'right' })
  y = boxY + boxH + 24

  // ---- payments received ----------------------------------------------------
  const pays = snapshot.payments || []
  if (pays.length) {
    ensure(40)
    micro('Payments received', M, y)
    y += 14
    for (const p of pays) {
      ensure(24)
      doc.font('body').fontSize(9).fillColor(INK).text(p.label, M, y, { width: CW - 100 })
      doc.font('body').fontSize(9).fillColor(INK).text(money(p.amount), colAmt, y, { width: 80, align: 'right' })
      y += 12
      doc.font('body').fontSize(7.5).fillColor(MUTED).text([p.appliesTo, p.method, p.date ? shortDate(p.date) : null].filter(Boolean).join(' · '), M, y, { width: CW - 100 })
      y += 16
    }
    y += 6
  }

  // ---- amount due band --------------------------------------------------------
  ensure(70)
  doc.rect(M, y, CW, 56).fill(DARK)
  micro('Amount due', M + 18, y + 16, { color: GOLD_LIGHT })
  if (snapshot.due_on) doc.font('body').fontSize(8).fillColor('#D9CBB9').text(`by ${shortDate(snapshot.due_on)}`, M + 18, y + 30, { lineBreak: false })
  doc.font('display').fontSize(22).fillColor(BEIGE).text(money(snapshot.amount_due), M, y + 15, { width: CW - 18, align: 'right' })
  y += 76

  // ---- how to pay + note ----------------------------------------------------
  if (snapshot.etransfer_email && Number(snapshot.amount_due) > 0) {
    ensure(46)
    micro('How to pay', M, y)
    y += 13
    doc.font('body').fontSize(9).fillColor(BODY).text(
      `Send an Interac e-Transfer to ${snapshot.etransfer_email} with ${invoice.number || 'your invoice number'} in the message.`,
      M, y, { width: CW },
    )
    y = doc.y + 14
  }
  if (snapshot.note) {
    const h = doc.font('body').fontSize(9).heightOfString(snapshot.note, { width: CW - 28 })
    ensure(h + 24)
    doc.rect(M, y, 2, h + 14).fill(GOLD)
    doc.font('body').fontSize(9).fillColor(BODY).text(snapshot.note, M + 14, y + 7, { width: CW - 28 })
    y += h + 28
  }

  ensure(40)
  doc.font('italic').fontSize(12).fillColor(GOLD).text('Thank you for letting us be part of your celebration.', M, y + 8, { width: CW, align: 'center' })

  // ---- footer on every page -------------------------------------------------
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i)
    // writing below the bottom margin makes pdfkit add a page — lift it for the footer
    const keep = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    doc.font('body').fontSize(7).fillColor(MUTED).text(
      `Arsh Sandhu Allure · Where Elegance Meets Artistry${range.count > 1 ? ` · Page ${i + 1} of ${range.count}` : ''}`,
      M, H - M + 8, { width: CW, align: 'center', lineBreak: false },
    )
    doc.page.margins.bottom = keep
  }

  doc.end()
  return done
}
