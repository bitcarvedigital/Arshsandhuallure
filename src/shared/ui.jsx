import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'

// Shared portal primitives — mirrors the marketing site's form language
// (see src/pages/BookingPage.jsx) without importing from it.

export const fieldClass =
  'bg-transparent border-b border-[#A89080] py-3 text-dark placeholder-[#8A7060] text-base sm:text-sm focus:outline-none focus:border-gold transition-colors duration-300 w-full'
export const labelClass = 'text-xs tracking-[0.2em] uppercase text-dark'

export function MicroLabel({ children, className = '' }) {
  return (
    <p className={`text-gold text-[10px] tracking-[0.35em] uppercase ${className}`}>{children}</p>
  )
}

// small uppercase meta label that isn't a section heading (dates, column heads)
export const metaLabelClass = 'text-[10px] tracking-[0.2em] uppercase text-faint'

// kept for old imports: now just a plain hairline (no diamond — the portal is minimal)
export function DiamondRule({ className = '' }) {
  return <div className={`h-px bg-line ${className}`} />
}

export function SectionHeading({ eyebrow, title, className = '' }) {
  return (
    <div className={className}>
      {eyebrow && <MicroLabel className="mb-2">{eyebrow}</MicroLabel>}
      <h2 className="font-heading text-2xl md:text-3xl text-dark">{title}</h2>
    </div>
  )
}

// A page section: small gold subheading + hairline, optional one-line hint,
// then the questions that belong to it. Pages read top to bottom as a stack of
// these (Bhagesh, 2026-09-25: "small subheading, questions listed below").
export function FormSection({ title, hint, action, children, className = '' }) {
  return (
    <section className={`mb-12 ${className}`}>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <MicroLabel>{title}</MicroLabel>
        {action}
      </div>
      <div className="h-px bg-line mt-2" />
      {hint && <p className="text-xs text-faint mt-3 max-w-xl leading-relaxed">{hint}</p>}
      <div className="flex flex-col gap-6 mt-6">{children}</div>
    </section>
  )
}

// Collapsible blocks (Bhagesh, 2026-09-26: only the big ones — each event on
// the Overview). useSectionOpen remembers the choice for this browser tab so a
// save doesn't fold everything back; <SectionsToggle> opens/closes them all.
export function Chevron({ open, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 10"
      className={`w-2.5 h-2.5 shrink-0 text-gold transition-transform duration-200 self-center ${open ? 'rotate-90' : ''} ${className}`}
    >
      <path d="M3 1.5 6.5 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const SectionSignal = createContext(null)

export function SectionsProvider({ children }) {
  const [signal, setSignal] = useState(null)
  return <SectionSignal.Provider value={{ signal, setSignal }}>{children}</SectionSignal.Provider>
}

export function SectionsToggle({ label = 'all', className = '' }) {
  const ctx = useContext(SectionSignal)
  if (!ctx) return null
  const btn = 'min-h-8 px-2 text-[11px] tracking-[0.15em] uppercase text-faint hover:text-gold cursor-pointer'
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button type="button" className={btn} onClick={() => ctx.setSignal({ open: true, at: Date.now() })}>Open {label}</button>
      <span className="text-ghost" aria-hidden="true">·</span>
      <button type="button" className={btn} onClick={() => ctx.setSignal({ open: false, at: Date.now() })}>Close {label}</button>
    </div>
  )
}

export function useSectionOpen(id, defaultOpen = true, enabled = true) {
  const storeKey = id ? `section:${id}` : null
  const ctx = useContext(SectionSignal)
  const signal = ctx?.signal
  // the newest choice wins: this section's own toggle, or a later "Open/Close all"
  const [open, setOpenState] = useState(() => {
    if (!enabled) return defaultOpen
    let stored = null
    try {
      const [v, at] = (storeKey && sessionStorage.getItem(storeKey)?.split(':')) || []
      if (v != null) stored = { open: v === '1', at: Number(at) || 0 }
    } catch {
      /* private mode — nothing remembered */
    }
    if (stored && signal && signal.at > stored.at) return signal.open
    return stored ? stored.open : defaultOpen
  })
  const setOpen = useCallback(
    (v) => {
      setOpenState(v)
      if (!storeKey) return
      try {
        sessionStorage.setItem(storeKey, `${v ? 1 : 0}:${Date.now()}`)
      } catch {
        /* private mode — the choice just won't be remembered */
      }
    },
    [storeKey],
  )
  // follow "Open all / Close all" clicked while this section is on screen
  const seen = useRef(signal?.at)
  useEffect(() => {
    if (enabled && signal && signal.at !== seen.current) {
      seen.current = signal.at
      setOpen(signal.open)
    }
  }, [signal, enabled, setOpen])
  return [open, setOpen]
}

export function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-line text-sm">
      <span className="text-muted shrink-0">{label}</span>
      <span className="text-dark text-right break-words min-w-0">{value ?? '—'}</span>
    </div>
  )
}

// The portal look (Bhagesh, 2026-09-26: "D with C's soft corners"): no outlined
// boxes. Lists are rows split by thin lines; the few things that need a surface
// get a soft cream panel with rounded corners; labels are soft rounded pills.
export const softPanel = 'rounded-2xl bg-surface'
export const softNote = 'rounded-xl bg-soft/70 px-4 py-3 text-sm text-body'
export const emptyNote = 'rounded-2xl bg-soft/60 px-6 py-10 text-center text-sm text-faint'
export const listRow = 'flex items-center justify-between gap-4 py-5 border-b border-line'
// a tappable row inside a lined list: wrap it in <div className={rowLine}> so the line stays straight
export const rowLine = 'border-b border-line'
export const rowLink = 'flex items-center justify-between gap-4 py-5 px-2 -mx-2 rounded-xl hover:bg-surface transition-colors'

export function Pill({ children, className = '' }) {
  return (
    <span className={`inline-block rounded-full bg-beige-card/80 px-3 py-1 text-xs text-body whitespace-nowrap ${className}`}>
      {children}
    </span>
  )
}

export const AUTOFILL_COPY = {
  new: 'Auto-filled from your booking — tap to check it’s correct.',
  saved: 'This was auto-filled — please double-check it.',
  admin: 'Auto-filled — not checked by the client yet',
}

// Wraps any field that was pre-filled from the booking. The highlight and note
// stay until the person clicks / focuses into the field (onAcknowledge), which
// removes the marker for good. `state` is 'new' | 'saved' | undefined.
export function AutofillWrap({ state, onAcknowledge, readOnly, children }) {
  if (!state) return children
  const ack = () => {
    if (!readOnly && onAcknowledge) onAcknowledge()
  }
  return (
    <div
      onFocusCapture={ack}
      onClickCapture={ack}
      className="[&_label]:text-gold [&_input]:border-gold/70 [&_select]:border-gold/70 [&_textarea]:border-gold/70"
    >
      {children}
      <p className="text-[11px] leading-snug text-gold mt-2 flex items-start gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-[5px]" aria-hidden="true" />
        {readOnly ? AUTOFILL_COPY.admin : AUTOFILL_COPY[state] || AUTOFILL_COPY.new}
      </p>
    </div>
  )
}

// every label is tied to its input (useId) so screen readers announce it
export function Field({ label, required, id, ...props }) {
  const auto = useId()
  const fid = id || auto
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fid} className={labelClass}>
        {label}
        {required ? ' *' : ''}
      </label>
      <input id={fid} aria-required={required || undefined} className={fieldClass} {...props} />
    </div>
  )
}

function EyeIcon({ open }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  )
}

// Password input with a show/hide toggle. Same look as Field.
export function PasswordField({ label, required, id, ...props }) {
  const [show, setShow] = useState(false)
  const auto = useId()
  const fid = id || auto
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fid} className={labelClass}>
        {label}
        {required ? ' *' : ''}
      </label>
      <div className="relative">
        <input id={fid} aria-required={required || undefined} type={show ? 'text' : 'password'} className={fieldClass + ' pr-10'} {...props} />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-faint hover:text-gold transition-colors cursor-pointer"
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  )
}

export function TextArea({ label, required, rows = 3, id, ...props }) {
  const auto = useId()
  const fid = id || auto
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fid} className={labelClass}>
        {label}
        {required ? ' *' : ''}
      </label>
      <textarea id={fid} aria-required={required || undefined} rows={rows} className={fieldClass + ' resize-none'} {...props} />
    </div>
  )
}

export function Select({ label, required, options, placeholder, id, ...props }) {
  const auto = useId()
  const fid = id || auto
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fid} className={labelClass}>
        {label}
        {required ? ' *' : ''}
      </label>
      <select id={fid} aria-required={required || undefined} className={fieldClass + ' cursor-pointer'} {...props}>
        <option value="">{placeholder || 'Select…'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// horizontal pill choice (skin type, hair length, …) — 44px touch targets
export function ChoiceRow({ label, options, value, onChange, disabled }) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className={labelClass}>{label}</span>}
      <div className="flex flex-wrap gap-2" role="group" aria-label={label || undefined}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            disabled={disabled}
            onClick={() => onChange(value === o.value ? null : o.value)}
            className={`rounded-full px-4 py-2.5 text-sm transition-colors duration-200 ${
              value === o.value
                ? 'bg-dark text-beige'
                : 'bg-beige-card/70 text-dark hover:bg-[#E3D6C8]'
            } ${disabled ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const BTN_BASE =
  'inline-block rounded-full uppercase transition-colors duration-300 disabled:opacity-40 disabled:cursor-default cursor-pointer text-center'
const BTN_SIZES = {
  md: 'text-xs tracking-[0.25em] px-8 py-4',
  sm: 'text-[11px] tracking-[0.2em] px-5 py-3',
}
const BTN_STYLES = {
  solid: 'bg-dark text-beige hover:bg-btn-dark',
  outline: 'border border-dark text-dark hover:bg-dark hover:text-beige',
  gold: 'border border-gold text-gold hover:bg-gold hover:text-beige',
  danger: 'border border-danger text-danger hover:bg-danger hover:text-beige',
}
// for a <Link> that should look like a button (a link can't wrap a <button>)
export const btnClass = (variant = 'solid', size = 'md') => `${BTN_BASE} ${BTN_SIZES[size]} ${BTN_STYLES[variant]}`

export function Btn({ children, variant = 'solid', size = 'md', className = '', ...props }) {
  return (
    <button className={`${btnClass(variant, size)} ${className}`} {...props}>
      {children}
    </button>
  )
}

const CHIP_STYLES = {
  locked: 'bg-soft text-ghost',
  draft: 'bg-soft text-muted',
  available: 'bg-dark text-beige',
  pending: 'bg-[#EFE3D3] text-[#7A5A32]',
  approved: 'bg-[#E6EADF] text-success',
  done: 'bg-[#E6EADF] text-success',
  changes_requested: 'bg-[#F3E1DA] text-danger',
  due: 'bg-soft text-muted',
  received: 'bg-[#E6EADF] text-success',
}

export const CHIP_LABELS = {
  locked: 'Locked',
  draft: 'Draft',
  available: 'To do',
  pending: 'Awaiting review',
  approved: 'Approved',
  done: 'Done',
  changes_requested: 'Changes requested',
  due: 'Due',
  received: 'Received',
}

export function StatusChip({ status, label }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs whitespace-nowrap ${
        CHIP_STYLES[status] || CHIP_STYLES.draft
      }`}
    >
      {label || CHIP_LABELS[status] || status}
    </span>
  )
}

export function ErrorNote({ children }) {
  if (!children) return null
  return <p className="text-danger text-sm py-2">{children}</p>
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16" role="status" aria-label="Loading">
      <div className="w-2 h-2 rounded-full bg-gold/60 animate-pulse" />
    </div>
  )
}

export function money(v) {
  if (v == null || v === '') return '—'
  return `$${Number(v).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(`${d}T00:00:00`)
  return dt.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export function fmtTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const dt = new Date()
  dt.setHours(Number(h), Number(m))
  return dt.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
}

export function fmtShortDate(d) {
  if (!d) return 'Date TBC'
  const dt = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  return dt.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// "Sep 25, 2026 · 3:57 p.m." for timestamps (submitted, sent, signed…)
export function fmtDateTime(ts) {
  if (!ts) return '—'
  const dt = new Date(ts)
  const date = dt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = dt.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

// compact input for tables (qty, prices) — same underline language as Field
export const cellInputClass =
  'bg-transparent border-b border-[#C8B8AC] py-2 text-dark text-base sm:text-sm focus:outline-none focus:border-gold transition-colors w-full'
