import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import PortalShell from '../../shared/PortalShell'
import { Spinner, MicroLabel, emptyNote, rowLine, rowLink } from '../../shared/ui'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

const DOC_META = {
  agreement: {
    title: 'Service Agreement',
    desc: 'Your signed agreement, safe in one place.',
    to: '/portal/agreement',
  },
  timeline: {
    title: 'Getting-Ready Timeline',
    desc: 'Your wedding-morning schedule, artist by artist.',
    to: '/portal/docs/timeline',
  },
  hair_guide: {
    title: 'Hair Preparation Guide',
    desc: 'How to prep your hair the night before & morning of.',
    to: '/portal/docs/hair_guide',
  },
  skin_guide: {
    title: 'Skin Preparation Guide',
    desc: 'Gentle skin prep for makeup that lasts and glows.',
    to: '/portal/docs/skin_guide',
  },
}

export default function Docs() {
  const { signOut } = useAuth()
  const [docs, setDocs] = useState(null)

  useEffect(() => {
    // RLS only returns rows Arsh has made visible
    supabase.from('client_documents').select('*').then(({ data }) => setDocs(data || []))
  }, [])

  return (
    <PortalShell title="Documents" nav={NAV} onSignOut={signOut}>
      <MicroLabel className="mb-2">Your Documents</MicroLabel>
      <h1 className="font-heading text-3xl text-dark">Everything in one place</h1>
      <p className="text-sm text-muted max-w-lg mt-2">
        Documents appear here as your journey unfolds — Arsh unlocks each one at the right moment.
      </p>
      {!docs ? (
        <Spinner />
      ) : docs.length === 0 ? (
        <p className={`${emptyNote} mt-10`}>Nothing here yet — your documents unlock as each step completes.</p>
      ) : (
        <div className="mt-10 border-t border-line">
          {docs
            .filter((d) => DOC_META[d.doc_type])
            .map((d) => (
              <div key={d.doc_type} className={rowLine}>
                <Link to={DOC_META[d.doc_type].to} className={rowLink}>
                  <span className="min-w-0">
                    <span className="block font-heading text-lg text-dark">{DOC_META[d.doc_type].title}</span>
                    <span className="block text-sm text-muted mt-0.5">{DOC_META[d.doc_type].desc}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-sm text-gold" aria-hidden="true">Open →</span>
                </Link>
              </div>
            ))}
        </div>
      )}
    </PortalShell>
  )
}
