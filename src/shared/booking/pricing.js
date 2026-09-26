// Booking maths — imported by the browser AND by /api. Pure module (no JSX,
// no import.meta.env, explicit .js imports). Mirrors refresh_client_booking()
// in migration 7 exactly: every line is rounded to the cent on its own
// (half away from zero, like Postgres numeric), then summed.

import { hasHair, hasMakeup } from './services.js'

export const RETAINER_PERCENT = 30

const toHundredths = (v) => Math.round((Number(v) || 0) * 100)

// qty × unit price in integer cents, rounded like Postgres round(numeric, 2)
export function lineCents(line) {
  const p = toHundredths(line.qty) * toHundredths(line.unit_price) // 1/10000 dollars, exact
  return Math.sign(p) * Math.floor((Math.abs(p) + 50) / 100)
}

export const lineAmount = (line) => lineCents(line) / 100
const dollars = (cents) => Math.round(cents) / 100

export function eventSummary(event, lines = []) {
  const own = lines
    .filter((l) => l.event_id === event.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  let svc = 0
  let fee = 0
  let disc = 0
  let hairCount = 0
  let makeupCount = 0
  for (const l of own) {
    const c = lineCents(l)
    if (l.kind === 'service') {
      svc += c
      const q = Number(l.qty) || 0
      if (hasHair(l.service)) hairCount += q
      if (hasMakeup(l.service)) makeupCount += q
    } else if (l.kind === 'fee') fee += c
    else if (l.kind === 'discount') disc += c
  }
  return {
    ...event,
    lines: own.map((l) => ({ ...l, amount: lineAmount(l) })),
    services: dollars(svc),
    fees: dollars(fee),
    discounts: dollars(disc),
    subtotal: dollars(Math.max(svc + fee - disc, 0)),
    hairCount,
    makeupCount,
  }
}

export function sortEvents(events = []) {
  return [...events].sort((a, b) => {
    if (a.event_date && b.event_date && a.event_date !== b.event_date) return a.event_date < b.event_date ? -1 : 1
    if (a.event_date && !b.event_date) return -1
    if (!a.event_date && b.event_date) return 1
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })
}

// Full booking picture. `payments` may be omitted (quote-only views).
export function summarizeBooking(events = [], lines = [], payments = []) {
  const evs = sortEvents(events).map((e) => eventSummary(e, lines))
  let svc = 0
  let fee = 0
  let disc = 0
  for (const l of lines) {
    const c = lineCents(l)
    if (l.kind === 'service') svc += c
    else if (l.kind === 'fee') fee += c
    else if (l.kind === 'discount') disc += c
  }
  const hasLines = lines.length > 0
  const totalC = hasLines ? Math.max(svc + fee - disc, 0) : null

  const retainer = payments.find((p) => p.kind === 'retainer')
  const retainerReceived = retainer?.status === 'received'
  const retainerC =
    retainerReceived ? toHundredths(retainer.amount)
    : totalC == null ? null
    : Math.round((totalC * RETAINER_PERCENT) / 100)

  const received = payments.filter((p) => p.status === 'received' && p.amount != null)
  const installmentsC = received.filter((p) => p.kind === 'installment').reduce((s, p) => s + toHundredths(p.amount), 0)
  const paidC = received.reduce((s, p) => s + toHundredths(p.amount), 0)
  const balanceC = totalC == null ? null : Math.max(totalC - (retainerC || 0) - installmentsC, 0)
  const outstandingC = totalC == null ? null : Math.max(totalC - paidC, 0)

  return {
    events: evs,
    hasLines,
    services: dollars(svc),
    fees: dollars(fee),
    discounts: dollars(disc),
    total: totalC == null ? null : dollars(totalC),
    retainerPercent: RETAINER_PERCENT,
    retainer: retainerC == null ? null : dollars(retainerC),
    retainerReceived,
    installments: dollars(installmentsC),
    balance: balanceC == null ? null : dollars(balanceC),
    paid: dollars(paidC),
    outstanding: outstandingC == null ? null : dollars(outstandingC),
    hairCount: evs.reduce((s, e) => s + e.hairCount, 0),
    makeupCount: evs.reduce((s, e) => s + e.makeupCount, 0),
  }
}

const PAYMENT_LABELS = { retainer: 'Retainer', final: 'Final balance', installment: 'Payment' }
export const METHOD_LABELS = { etransfer: 'E-transfer', cash: 'Cash', cheque: 'Cheque', card: 'Card', other: 'Other' }

// Received payments, oldest first, each labelled with what it paid for.
export function paymentHistory(payments = [], events = []) {
  const byId = Object.fromEntries(events.map((e) => [e.id, e]))
  return payments
    .filter((p) => p.status === 'received' && p.amount != null)
    .sort((a, b) => String(a.received_at || '').localeCompare(String(b.received_at || '')))
    .map((p) => ({
      id: p.id,
      kind: p.kind,
      label: p.label || PAYMENT_LABELS[p.kind] || 'Payment',
      appliesTo:
        p.event_id && byId[p.event_id] ? byId[p.event_id].name || byId[p.event_id].event_type
        : p.kind === 'retainer' ? 'Secures every event in this booking'
        : p.kind === 'final' ? 'Remaining balance'
        : 'Whole booking',
      method: METHOD_LABELS[p.method] || p.method || '',
      date: p.received_at ? String(p.received_at).slice(0, 10) : null,
      amount: Number(p.amount),
    }))
}

function snapshotEvents(summary) {
  return summary.events.map((e) => ({
    id: e.id,
    name: e.name,
    event_type: e.event_type,
    event_date: e.event_date,
    start_time: e.start_time,
    ready_time: e.ready_time,
    address: e.address,
    party_size: e.party_size,
    hair_count: e.hairCount,
    makeup_count: e.makeupCount,
    subtotal: e.subtotal,
    lines: e.lines.map((l) => ({
      kind: l.kind,
      label: l.label,
      qty: Number(l.qty),
      unit_price: Number(l.unit_price),
      amount: l.amount,
      service: l.service || null,
    })),
  }))
}

// What the bride signs. Totals come from the DB-derived client columns (the
// single source of truth); the breakdown comes from the line items.
export function buildAgreementSnapshot(client, events = [], lines = []) {
  const summary = summarizeBooking(events, lines, [])
  return {
    schema: 2,
    full_name: client.full_name,
    email: client.email,
    phone: client.phone,
    events: snapshotEvents(summary),
    totals: {
      services: summary.services,
      fees: summary.fees,
      discounts: summary.discounts,
      total: client.amount_total == null ? summary.total : Number(client.amount_total),
      retainer_percent: RETAINER_PERCENT,
      retainer: client.amount_retainer == null ? summary.retainer : Number(client.amount_retainer),
      balance: client.amount_balance == null ? summary.balance : Number(client.amount_balance),
    },
    // legacy flat keys — older readers of the snapshot keep working
    event_type: client.event_type,
    event_date: client.event_date,
    ready_time: client.ready_time,
    getting_ready_address: client.getting_ready_address,
    services: client.services,
    party_size: client.party_size,
    amount_services: client.amount_services,
    amount_travel: client.amount_travel,
    amount_total: client.amount_total,
    amount_retainer: client.amount_retainer,
    amount_balance: client.amount_balance,
  }
}

// What an invoice freezes. amountDue defaults to what is still outstanding.
export function buildStatement({ client, events = [], lines = [], payments = [], amountDue, dueOn, note, etransferEmail }) {
  const summary = summarizeBooking(events, lines, payments)
  const history = paymentHistory(payments, events)
  const due = amountDue == null || amountDue === '' ? summary.outstanding : Math.max(Number(amountDue) || 0, 0)
  return {
    schema: 1,
    bill_to: { name: client.full_name, email: client.email, phone: client.phone || '' },
    events: snapshotEvents(summary),
    totals: {
      services: summary.services,
      fees: summary.fees,
      discounts: summary.discounts,
      total: summary.total,
      paid: summary.paid,
      outstanding: summary.outstanding,
    },
    payments: history,
    amount_due: due == null ? 0 : Math.round(due * 100) / 100,
    due_on: dueOn || null,
    note: note || '',
    etransfer_email: etransferEmail || '',
  }
}

// A client created before events existed (flat columns only) → an editable
// single-event booking the studio can save.
export function bookingFromLegacyClient(client) {
  const lines = []
  if (client.amount_services != null) {
    lines.push({ kind: 'service', label: 'Professional services', qty: 1, unit_price: Number(client.amount_services), service: client.services || null, for_bride: !!client.services })
  }
  if (Number(client.amount_travel) > 0) {
    lines.push({ kind: 'fee', code: 'travel', label: 'Travel', qty: 1, unit_price: Number(client.amount_travel) })
  }
  return [{
    name: client.event_type || 'Wedding',
    event_type: client.event_type || 'Wedding',
    event_date: client.event_date || '',
    start_time: client.booked_time || '',
    ready_time: client.ready_time || '',
    address: client.getting_ready_address || '',
    party_size: client.party_size ?? '',
    client_note: '',
    lines,
  }]
}
