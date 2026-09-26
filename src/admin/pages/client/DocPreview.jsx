import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import { signedPhotoUrl } from '../../../portal/lib/data'
import { AdminShell } from '../../AdminShell'
import { PageHeader } from '../../adminUi'
import GuidePage from '../../../shared/GuidePage'
import { hairGuide, skinGuide } from '../../../shared/content/guides'
import TimelineView from '../../../shared/booking/TimelineView'
import { Spinner, StatusChip, emptyNote, softNote } from '../../../shared/ui'
import { sortEvents } from '../../../shared/booking/pricing.js'

const TITLES = { timeline: 'Getting-ready timeline', hair_guide: 'Hair preparation guide', skin_guide: 'Skin preparation guide' }

// The studio's "View" for a document: exactly what the bride sees in her
// portal, plus whether she can see it yet.
export default function DocPreview() {
  const { id, docType } = useParams()
  const [state, setState] = useState(null)

  useEffect(() => {
    if (!TITLES[docType]) return
    Promise.all([
      supabase.from('clients').select('id, full_name').eq('id', id).maybeSingle(),
      supabase.from('client_documents').select('*').eq('client_id', id).eq('doc_type', docType).maybeSingle(),
      docType === 'timeline' ? supabase.from('events').select('*').eq('client_id', id) : Promise.resolve({ data: [] }),
      docType === 'timeline'
        ? supabase.from('event_timelines').select('*').eq('client_id', id).eq('visible', true) // what she sees: published only
        : Promise.resolve({ data: [] }),
    ]).then(([c, d, ev, tl]) =>
      setState({
        client: c.data,
        doc: d.data,
        events: sortEvents(ev.data || []),
        timelines: Object.fromEntries((tl.data || []).map((t) => [t.event_id, t.content])),
      }),
    )
  }, [id, docType])

  if (docType === 'agreement') return <Navigate to={`/admin/clients/${id}?tab=agreement`} replace />
  if (!TITLES[docType]) return <Navigate to={`/admin/clients/${id}?tab=docs`} replace />

  const first = (state?.client?.full_name || '').split(' ')[0] || 'She'
  const hidden = state && !state.doc?.visible

  return (
    <AdminShell title={TITLES[docType]}>
      <PageHeader
        back={{ to: `/admin/clients/${id}?tab=docs`, label: state?.client?.full_name || 'Documents' }}
        eyebrow="Preview"
        title={TITLES[docType]}
        intro={`Exactly what ${first} sees in her portal.`}
        action={state && <StatusChip status={hidden ? 'locked' : 'done'} label={hidden ? 'Hidden from her' : 'Visible to her'} />}
      />
      {!state ? (
        <Spinner />
      ) : (
        <>
          {hidden && (
            <p className={`${softNote} mb-8`}>
              {first} can’t see this yet — turn it on in the Documents tab when you’re ready.
            </p>
          )}
          {docType === 'hair_guide' ? (
            <GuidePage guide={hairGuide} />
          ) : docType === 'skin_guide' ? (
            <GuidePage guide={skinGuide} />
          ) : state.events.some((e) => state.timelines[e.id]) || state.doc?.file_path || state.doc?.content ? (
            <TimelineView
              clientName={state.client?.full_name}
              events={state.events}
              timelines={state.timelines}
              legacy={state.doc}
              resolveUrl={signedPhotoUrl}
            />
          ) : (
            <p className={emptyNote}>No timeline published yet — build and publish one in the Timeline tab.</p>
          )}
        </>
      )}
    </AdminShell>
  )
}
