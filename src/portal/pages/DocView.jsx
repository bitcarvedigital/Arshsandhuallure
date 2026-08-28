import { useEffect, useState } from 'react'
import { Navigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import { signedPhotoUrl } from '../lib/data'
import PortalShell from '../../shared/PortalShell'
import GuidePage from '../../shared/GuidePage'
import { hairGuide, skinGuide } from '../../shared/content/guides'
import { Btn, Spinner, MicroLabel, fmtDate, fmtTime } from '../../shared/ui'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

export function TimelineView({ client, doc }) {
  const entries = doc?.content?.entries || []
  const notes = doc?.content?.notes || []
  const artists = [...new Set(entries.map((e) => e.artist).filter(Boolean))]
  const [fileUrl, setFileUrl] = useState('')

  useEffect(() => {
    if (doc?.file_path) signedPhotoUrl(doc.file_path).then(setFileUrl)
  }, [doc])

  return (
    <article className="bg-[#FBF8F4] border border-[#E5D9CC] px-6 py-10 md:px-12 md:py-14 print:border-0 print:px-0">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="w-8 h-px bg-gold" />
          <MicroLabel>Getting-Ready Timeline</MicroLabel>
          <span className="w-8 h-px bg-gold" />
        </div>
        <h1 className="font-heading italic text-3xl md:text-4xl text-dark">{client?.full_name}</h1>
        <p className="text-sm text-[#8A7A70] mt-3">
          {fmtDate(client?.event_date)}
          {client?.ready_time ? ` · Ready by ${fmtTime(client.ready_time)}` : ''}
        </p>
      </div>

      {entries.length > 0 ? (
        <div className="mb-10">
          {artists.map((artist) => (
            <section key={artist} className="mb-8">
              <div className="flex items-baseline gap-3 border-b border-[#E0D2C2] pb-2 mb-3">
                <h2 className="font-heading text-lg text-dark">{artist}</h2>
              </div>
              <ul>
                {entries
                  .filter((e) => e.artist === artist)
                  .map((e, i) => (
                    <li key={i} className="flex gap-4 py-2.5 border-b border-[#EFE6DA] last:border-0 text-sm">
                      <span className="text-gold w-28 shrink-0 whitespace-nowrap">{e.time}</span>
                      <span className="text-dark flex-1">{e.person}</span>
                      <span className="text-[#8A7A70] uppercase tracking-[0.15em] text-[10px] self-center">
                        {e.service}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      ) : fileUrl ? (
        <div className="text-center mb-10">
          <a href={fileUrl} target="_blank" rel="noreferrer">
            <Btn variant="gold">Open your timeline (PDF)</Btn>
          </a>
        </div>
      ) : (
        <p className="text-sm text-[#A89080] text-center mb-10">Your timeline is being crafted.</p>
      )}

      {notes.length > 0 && (
        <aside className="border-l-2 border-gold bg-beige-card px-6 py-5 mb-10">
          <h3 className="font-heading italic text-gold text-lg mb-3">Notes for a smooth morning</h3>
          <ul className="flex flex-col gap-2">
            {notes.map((n, i) => (
              <li key={i} className="text-sm leading-relaxed text-[#5A4030] flex gap-2">
                <span>—</span> {n}
              </li>
            ))}
          </ul>
        </aside>
      )}

      <div className="text-center border-t border-[#E0D2C2] pt-8">
        <p className="text-[10px] tracking-[0.3em] uppercase text-dark">Arsh Sandhu Allure</p>
        <p className="text-[10px] text-[#8A7A70] mt-2 tracking-wider">
          +1 (437) 221-0004 · arshsandhuallure@gmail.com · @arshsandhuallure
        </p>
      </div>
      {entries.length > 0 && (
        <div className="mt-8 text-center print:hidden">
          <Btn variant="outline" onClick={() => window.print()}>
            Print / Save as PDF
          </Btn>
        </div>
      )}
    </article>
  )
}

export default function DocView() {
  const { docType } = useParams()
  const { client, signOut } = useAuth()
  const [doc, setDoc] = useState(undefined)

  useEffect(() => {
    supabase
      .from('client_documents')
      .select('*')
      .eq('doc_type', docType)
      .maybeSingle()
      .then(({ data }) => setDoc(data || null))
  }, [docType])

  if (docType === 'agreement') return <Navigate to="/portal/agreement" replace />

  const titles = { timeline: 'Timeline', hair_guide: 'Hair Prep', skin_guide: 'Skin Prep' }

  return (
    <PortalShell title={titles[docType] || 'Document'} nav={NAV} onSignOut={signOut}>
      <div className="mb-6 print:hidden">
        <Link to="/portal/docs" className="text-xs tracking-[0.2em] uppercase text-[#8A7A70] hover:text-gold">
          ← All documents
        </Link>
      </div>
      {doc === undefined ? (
        <Spinner />
      ) : !doc ? (
        <p className="text-sm text-[#A89080] border border-dashed border-[#C8B8AC] p-8 text-center">
          This document isn’t available yet — it unlocks as your journey progresses.
        </p>
      ) : docType === 'hair_guide' ? (
        <GuidePage guide={hairGuide} />
      ) : docType === 'skin_guide' ? (
        <GuidePage guide={skinGuide} />
      ) : docType === 'timeline' ? (
        <TimelineView client={client} doc={doc} />
      ) : (
        <Navigate to="/portal/docs" replace />
      )}
    </PortalShell>
  )
}
