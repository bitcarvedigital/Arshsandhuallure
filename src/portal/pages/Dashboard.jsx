import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../AuthProvider'
import { loadPortalBundle } from '../lib/data'
import { deriveJourney } from '../lib/journey'
import PortalShell from '../../shared/PortalShell'
import { StatusChip, Spinner, DiamondRule, fmtDate } from '../../shared/ui'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

function StepCard({ step, index }) {
  const locked = step.state === 'locked'
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`flex gap-4 p-5 border transition-colors ${
        locked
          ? 'border-[#DDD2C4] bg-transparent'
          : 'border-[#C8B8AC] bg-[#FBF8F4] hover:border-gold'
      }`}
    >
      <div
        className={`w-9 h-9 shrink-0 rotate-45 border flex items-center justify-center ${
          step.state === 'done'
            ? 'border-gold bg-gold'
            : locked
              ? 'border-[#C8B8AC]'
              : 'border-gold'
        }`}
      >
        <span
          className={`-rotate-45 font-heading text-sm ${
            step.state === 'done' ? 'text-beige' : locked ? 'text-[#A89080]' : 'text-gold'
          }`}
        >
          {step.state === 'done' ? '✓' : step.n}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h3 className={`font-heading text-lg ${locked ? 'text-[#A89080]' : 'text-dark'}`}>{step.title}</h3>
          <StatusChip status={step.state === 'draft' ? 'draft' : step.state} />
        </div>
        <p className={`text-sm mt-1 ${locked ? 'text-[#B8A090]' : 'text-[#7A6355]'}`}>{step.desc}</p>
      </div>
    </motion.div>
  )
  return locked ? inner : <Link to={step.to}>{inner}</Link>
}

export default function Dashboard() {
  const { client, signOut } = useAuth()
  const [bundle, setBundle] = useState(null)

  useEffect(() => {
    loadPortalBundle().then(setBundle)
  }, [])

  return (
    <PortalShell title="Your Journey" nav={NAV} onSignOut={signOut}>
      <div className="mb-10">
        <p className="text-gold text-[10px] tracking-[0.35em] uppercase mb-2">Welcome</p>
        <h1 className="font-heading text-3xl md:text-4xl text-dark">
          {(client?.full_name || '').split(' ')[0]}
        </h1>
        {client?.event_date && (
          <p className="text-sm text-[#7A6355] mt-2">
            {client.event_type ? `${client.event_type} · ` : ''}
            {fmtDate(client.event_date)}
          </p>
        )}
        <DiamondRule className="mt-6" />
      </div>
      {!bundle ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-3">
          {deriveJourney(bundle).map((step, i) => (
            <StepCard key={step.key} step={step} index={i} />
          ))}
        </div>
      )}
    </PortalShell>
  )
}
