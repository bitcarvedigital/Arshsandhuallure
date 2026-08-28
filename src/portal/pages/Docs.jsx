import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import PortalShell from '../../shared/PortalShell'
import { Spinner, DiamondRule, SectionHeading } from '../../shared/ui'

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
      <SectionHeading eyebrow="Your Documents" title="Everything in one place" className="mb-2" />
      <p className="text-sm text-[#7A6355] max-w-lg">
        Documents appear here as your journey unfolds — Arsh unlocks each one at the right moment.
      </p>
      <DiamondRule className="my-8" />
      {!docs ? (
        <Spinner />
      ) : docs.length === 0 ? (
        <p className="text-sm text-[#A89080] border border-dashed border-[#C8B8AC] p-8 text-center">
          Nothing here yet — your documents unlock as each step completes.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {docs
            .filter((d) => DOC_META[d.doc_type])
            .map((d) => (
              <Link
                key={d.doc_type}
                to={DOC_META[d.doc_type].to}
                className="border border-[#C8B8AC] bg-[#FBF8F4] hover:border-gold transition-colors p-6"
              >
                <span className="inline-block w-2 h-2 border border-gold rotate-45 mb-3" />
                <h3 className="font-heading text-lg text-dark">{DOC_META[d.doc_type].title}</h3>
                <p className="text-xs text-[#8A7A70] mt-1">{DOC_META[d.doc_type].desc}</p>
              </Link>
            ))}
        </div>
      )}
    </PortalShell>
  )
}
