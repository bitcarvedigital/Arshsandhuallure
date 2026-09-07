import { useState } from 'react'

// Shared portal primitives — mirrors the marketing site's form language
// (see src/pages/BookingPage.jsx) without importing from it.

export const fieldClass =
  'bg-transparent border-b border-[#A89080] py-3 text-dark placeholder-[#8A7060] text-sm focus:outline-none focus:border-gold transition-colors duration-300 w-full'
export const labelClass = 'text-xs tracking-[0.2em] uppercase text-dark'

export function MicroLabel({ children, className = '' }) {
  return (
    <p className={`text-gold text-[10px] tracking-[0.35em] uppercase ${className}`}>{children}</p>
  )
}

export function DiamondRule({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="flex-1 h-px bg-[#C8B8AC]" />
      <span className="w-1.5 h-1.5 border border-gold rotate-45" />
      <span className="flex-1 h-px bg-[#C8B8AC]" />
    </div>
  )
}

export function SectionHeading({ eyebrow, title, className = '' }) {
  return (
    <div className={className}>
      {eyebrow && <MicroLabel className="mb-2">{eyebrow}</MicroLabel>}
      <h2 className="font-heading text-2xl md:text-3xl text-dark">{title}</h2>
    </div>
  )
}

export function Field({ label, required, ...props }) {
  return (
    <div className="flex flex-col gap-2">
      <label className={labelClass}>
        {label}
        {required ? ' *' : ''}
      </label>
      <input className={fieldClass} {...props} />
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
export function PasswordField({ label, required, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <label className={labelClass}>
        {label}
        {required ? ' *' : ''}
      </label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} className={fieldClass + ' pr-10'} {...props} />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[#8A7A70] hover:text-gold transition-colors cursor-pointer"
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  )
}

export function TextArea({ label, required, rows = 3, ...props }) {
  return (
    <div className="flex flex-col gap-2">
      <label className={labelClass}>
        {label}
        {required ? ' *' : ''}
      </label>
      <textarea rows={rows} className={fieldClass + ' resize-none'} {...props} />
    </div>
  )
}

export function Select({ label, required, options, placeholder, ...props }) {
  return (
    <div className="flex flex-col gap-2">
      <label className={labelClass}>
        {label}
        {required ? ' *' : ''}
      </label>
      <select className={fieldClass + ' cursor-pointer'} {...props}>
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
      <span className={labelClass}>{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value === o.value ? null : o.value)}
            className={`px-4 py-2.5 text-xs tracking-[0.15em] uppercase border transition-colors duration-200 ${
              value === o.value
                ? 'border-gold bg-gold text-beige'
                : 'border-[#A89080] text-dark hover:border-gold'
            } ${disabled ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Btn({ children, variant = 'solid', className = '', ...props }) {
  const base =
    'text-xs tracking-[0.25em] uppercase px-8 py-4 transition-colors duration-300 disabled:opacity-40 disabled:cursor-default cursor-pointer text-center'
  const styles = {
    solid: 'bg-dark text-beige hover:bg-btn-dark',
    outline: 'border border-dark text-dark hover:bg-dark hover:text-beige',
    gold: 'border border-gold text-gold hover:bg-gold hover:text-beige',
    danger: 'border border-[#8a3a2a] text-[#8a3a2a] hover:bg-[#8a3a2a] hover:text-beige',
  }
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

const CHIP_STYLES = {
  locked: 'text-[#8A7A70] border-[#C8B8AC]',
  draft: 'text-[#7A6355] border-[#A89080]',
  available: 'text-gold border-gold',
  pending: 'text-[#7A5A32] border-gold bg-[#F1E8DC]',
  approved: 'text-[#4a6741] border-[#4a6741]',
  done: 'text-[#4a6741] border-[#4a6741]',
  changes_requested: 'text-[#8a3a2a] border-[#8a3a2a]',
  due: 'text-[#7A6355] border-[#A89080]',
  received: 'text-[#4a6741] border-[#4a6741]',
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
      className={`inline-block border px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase whitespace-nowrap ${
        CHIP_STYLES[status] || CHIP_STYLES.draft
      }`}
    >
      {label || CHIP_LABELS[status] || status}
    </span>
  )
}

export function ErrorNote({ children }) {
  if (!children) return null
  return <p className="text-[#8a3a2a] text-sm py-2">{children}</p>
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-3 h-3 border border-gold rotate-45 animate-pulse" />
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
