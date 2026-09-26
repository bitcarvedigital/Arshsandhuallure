import { Link } from 'react-router-dom'
import { MicroLabel } from '../shared/ui'

// Studio-only presentation helpers (2026-09-26 polish). They sit on top of
// src/shared/ui.jsx so every studio page reads the same way: eyebrow → title →
// one-line intro → content, quiet text actions with real hit areas, and one
// small status note after a save.

export const backLinkClass =
  'inline-flex items-center gap-2 min-h-8 text-[11px] tracking-[0.2em] uppercase text-faint hover:text-gold transition-colors cursor-pointer'

// Page header: optional back link, gold eyebrow, h1, one-line intro, and an
// optional action that sits beside the title (wraps under it on a phone).
export function PageHeader({ eyebrow, title, intro, action, back, meta, className = '' }) {
  return (
    <header className={`mb-10 ${className}`}>
      {back && (
        <Link to={back.to} className={`${backLinkClass} mb-5`}>
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      )}
      <div className="flex items-end justify-between gap-x-6 gap-y-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && <MicroLabel className="mb-2">{eyebrow}</MicroLabel>}
          <h1 className="font-heading text-3xl text-dark break-words">{title}</h1>
          {intro && <p className="text-sm text-muted mt-2 max-w-lg leading-relaxed">{intro}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {meta}
    </header>
  )
}

// Small text-only actions in rows and toolbars (View, Re-send, Duplicate…):
// ≥32px tall, soft hover, never a box.
const QUIET =
  'inline-flex items-center justify-center gap-1.5 min-h-8 px-3 rounded-full text-[11px] tracking-[0.15em] uppercase whitespace-nowrap transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent'
export const quietBtn = `${QUIET} text-body hover:text-dark hover:bg-soft/70`
export const quietDangerBtn = `${QUIET} text-danger hover:bg-soft/70`

// Icon-only buttons (×, ↑, ↓). Always pass an aria-label.
export const iconBtn =
  'inline-flex items-center justify-center size-9 shrink-0 rounded-full text-lg leading-none text-faint hover:text-dark hover:bg-soft/70 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent'
export const iconRemoveBtn =
  'inline-flex items-center justify-center size-9 shrink-0 rounded-full text-lg leading-none text-faint hover:text-danger hover:bg-soft/70 transition-colors cursor-pointer'

// "Saved ✓" / "Could not save." after an action — green when it worked, red when not.
export function SaveNote({ children, error = false, className = '' }) {
  if (!children) return null
  return (
    <p role="status" className={`text-sm ${error ? 'text-danger' : 'text-success'} ${className}`}>
      {children}
    </p>
  )
}

// most studio messages that report a failure start with "Could not…"
export const isFailure = (msg) => /^(could not|couldn’t|pdf upload failed)/i.test(String(msg || '').trim())

// Soft segmented choice (Timing mode, etc.): selected = dark pill, others = soft pills.
export function segmentClass(selected) {
  return `rounded-full px-4 py-2.5 text-sm transition-colors duration-200 cursor-pointer ${
    selected ? 'bg-dark text-beige' : 'bg-beige-card/70 text-dark hover:bg-[#E3D6C8]'
  }`
}
