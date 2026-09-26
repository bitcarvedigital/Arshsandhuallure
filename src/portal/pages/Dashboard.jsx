import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthProvider'
import { loadPortalBundle } from '../lib/data'
import { deriveJourney } from '../lib/journey'
import PortalShell from '../../shared/PortalShell'
import { btnClass, MicroLabel, Pill, Spinner, softPanel, fmtDate } from '../../shared/ui'
import { sortEvents } from '../../shared/booking/pricing.js'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

// "Jun 10" — short enough for three event pills to share a line on a phone
const monthDay = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : 'Date TBC'

// the button says what it does
const ACTION_LABEL = {
  agreement: 'Read & sign',
  retainer: 'See how to pay',
  intake: 'Start',
  guides: 'Open guides',
  timeline: 'View timeline',
  final: 'See how to pay',
}
const actionLabel = (step) =>
  step.state === 'draft' ? 'Continue' : step.state === 'changes_requested' ? 'See what to change' : ACTION_LABEL[step.key] || 'Open'

const ACTIONABLE = ['available', 'draft', 'changes_requested']
const STATE_WORD = {
  done: 'Done',
  pending: 'In review',
  draft: 'Started',
  changes_requested: 'Needs changes',
  available: 'To do',
  locked: 'Later',
}

// One clear thing to do, in a soft panel, with a single button.
function NextStep({ steps }) {
  const next = steps.find((s) => ACTIONABLE.includes(s.state))
  const waiting = steps.find((s) => s.state === 'pending')
  const allDone = steps.every((s) => s.state === 'done')
  return (
    <div className={`${softPanel} px-6 py-7`}>
      {next ? (
        <>
          <MicroLabel>{next.state === 'changes_requested' ? 'Arsh asked for a change' : 'Your next step'}</MicroLabel>
          <h2 className="font-heading text-2xl text-dark mt-2">{next.title}</h2>
          <p className="text-sm text-muted mt-1.5">{next.desc}</p>
          <Link to={next.to} className={`${btnClass()} w-full sm:w-auto mt-6`}>
            {actionLabel(next)}
          </Link>
        </>
      ) : allDone ? (
        <>
          <MicroLabel>All set</MicroLabel>
          <h2 className="font-heading text-2xl text-dark mt-2">You’re ready for the big day</h2>
          <p className="text-sm text-muted mt-1.5">Everything is done — your documents are always here if you need them.</p>
        </>
      ) : (
        <>
          <MicroLabel>Nothing to do right now</MicroLabel>
          <h2 className="font-heading text-2xl text-dark mt-2">{waiting ? 'Arsh is reviewing your details' : 'You’re all caught up'}</h2>
          <p className="text-sm text-muted mt-1.5">We’ll let you know by email when the next step opens.</p>
        </>
      )}
    </div>
  )
}

// The whole journey on one quiet line per step — tap any open step.
function Progress({ steps }) {
  const next = steps.find((s) => ACTIONABLE.includes(s.state))
  return (
    <div className="relative">
      {/* the thread behind the dots — outside the <ol> so the list only holds <li>s */}
      <span className="absolute left-[7px] top-4 bottom-4 w-px bg-[#E0D2C2]" aria-hidden="true" />
      <ol>
        {steps.map((s) => {
          const locked = s.state === 'locked'
          const isNext = s === next
          const row = (
            <div className="relative flex items-center gap-4 py-3">
              <span
                aria-hidden="true"
                className={`relative z-10 w-[15px] h-[15px] shrink-0 rounded-full flex items-center justify-center text-[9px] leading-none ${
                  s.state === 'done'
                    ? 'bg-gold text-beige'
                    : isNext
                      ? 'bg-beige border-2 border-dark'
                      : s.state === 'pending'
                        ? 'bg-beige border border-gold'
                        : 'bg-beige border border-[#D8C8BA]'
                }`}
              >
                {s.state === 'done' ? '✓' : ''}
              </span>
              <span className={`flex-1 text-[15px] ${locked ? 'text-ghost' : 'text-dark'} ${isNext ? 'font-medium' : ''}`}>
                {s.title}
              </span>
              <span className={`text-xs whitespace-nowrap ${s.state === 'done' ? 'text-gold' : isNext ? 'text-dark' : locked ? 'text-ghost' : 'text-faint'}`}>
                {isNext ? 'Now' : STATE_WORD[s.state] || ''}
              </span>
            </div>
          )
          return (
            <li key={s.key}>
              {locked ? row : <Link to={s.to} className="block rounded-xl -mx-2 px-2 hover:bg-surface transition-colors">{row}</Link>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default function Dashboard() {
  const { client, signOut } = useAuth()
  const [bundle, setBundle] = useState(null)

  useEffect(() => {
    loadPortalBundle().then(setBundle)
  }, [])

  const steps = bundle ? deriveJourney(bundle) : null

  return (
    <PortalShell title="Your Journey" nav={NAV} onSignOut={signOut}>
      <div className="mb-10">
        <MicroLabel className="mb-2">Welcome</MicroLabel>
        <h1 className="font-heading text-3xl md:text-4xl text-dark">
          {(client?.full_name || '').split(' ')[0]}
        </h1>
        {bundle?.events?.length > 1 ? (
          <div className="flex flex-wrap gap-2 mt-3">
            {sortEvents(bundle.events).map((e) => (
              <Pill key={e.id}>
                {e.name || e.event_type} · {monthDay(e.event_date)}
              </Pill>
            ))}
          </div>
        ) : (
          client?.event_date && (
            <p className="text-sm text-muted mt-2">
              {client.event_type ? `${client.event_type} · ` : ''}
              {fmtDate(client.event_date)}
            </p>
          )
        )}
      </div>
      {!bundle ? (
        <Spinner />
      ) : (
        <>
          <NextStep steps={steps} />
          <MicroLabel className="mt-12 mb-3">Your journey</MicroLabel>
          <Progress steps={steps} />
        </>
      )}
    </PortalShell>
  )
}
