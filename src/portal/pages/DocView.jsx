import { useEffect, useState } from 'react'
import { Navigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import { signedPhotoUrl } from '../lib/data'
import PortalShell from '../../shared/PortalShell'
import GuidePage from '../../shared/GuidePage'
import { hairGuide, skinGuide } from '../../shared/content/guides'
import { Spinner, emptyNote } from '../../shared/ui'
import TimelineView from '../../shared/booking/TimelineView'
import { sortEvents } from '../../shared/booking/pricing.js'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

export default function DocView() {
  const { docType } = useParams()
  const { client, signOut } = useAuth()
  const [doc, setDoc] = useState(undefined)
  const [timeline, setTimeline] = useState({ events: [], byEvent: {} })

  useEffect(() => {
    supabase
      .from('client_documents')
      .select('*')
      .eq('doc_type', docType)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setDoc(data || null))
    if (docType === 'timeline') {
      Promise.all([
        supabase.from('events').select('*'),
        supabase.from('event_timelines').select('*'), // RLS: published only
      ]).then(([ev, tl]) => {
        setTimeline({
          events: sortEvents(ev.data || []),
          byEvent: Object.fromEntries((tl.data || []).map((t) => [t.event_id, t.content])),
        })
      })
    }
  }, [docType])

  if (docType === 'agreement') return <Navigate to="/portal/agreement" replace />

  const titles = { timeline: 'Timeline', hair_guide: 'Hair Prep', skin_guide: 'Skin Prep' }

  return (
    <PortalShell title={titles[docType] || 'Document'} nav={NAV} onSignOut={signOut}>
      <div className="mb-6 print:hidden">
        <Link to="/portal/docs" className="inline-block py-3 -my-3 text-[11px] tracking-[0.2em] uppercase text-faint hover:text-gold transition-colors">
          ← All documents
        </Link>
      </div>
      {doc === undefined ? (
        <Spinner />
      ) : !doc ? (
        <p className={emptyNote}>This document isn’t available yet — it unlocks as your journey progresses.</p>
      ) : docType === 'hair_guide' ? (
        <GuidePage guide={hairGuide} />
      ) : docType === 'skin_guide' ? (
        <GuidePage guide={skinGuide} />
      ) : docType === 'timeline' ? (
        <TimelineView
          clientName={client?.full_name}
          events={timeline.events}
          timelines={timeline.byEvent}
          legacy={doc}
          resolveUrl={signedPhotoUrl}
        />
      ) : (
        <Navigate to="/portal/docs" replace />
      )}
    </PortalShell>
  )
}
