import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import { FormSection, btnClass } from '../../../shared/ui'
import { SaveNote, isFailure, quietBtn } from '../../adminUi'

const DOC_LABELS = {
  agreement: 'Service agreement (signed copy)',
  timeline: 'Getting-ready timeline',
  hair_guide: 'Hair preparation guide',
  skin_guide: 'Skin preparation guide',
}

// on/off switch: dark track when she can see it, soft track when hidden
function VisibleSwitch({ on, label, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label} — ${on ? 'visible to her' : 'hidden from her'}`}
      onClick={onToggle}
      className="flex items-center gap-3 min-h-9 shrink-0 cursor-pointer group"
    >
      <span className={`text-xs w-12 text-right ${on ? 'text-dark' : 'text-faint'}`}>{on ? 'Visible' : 'Hidden'}</span>
      <span
        className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
          on ? 'bg-dark' : 'bg-beige-card group-hover:bg-[#E3D6C8]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-surface shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </span>
    </button>
  )
}

export default function DocsTab({ client, docs, reload }) {
  const [msg, setMsg] = useState('')
  const timelineDoc = docs.find((d) => d.doc_type === 'timeline')
  const shown = ['agreement', 'timeline', 'hair_guide', 'skin_guide']
    .map((type) => ({ type, doc: docs.find((d) => d.doc_type === type) }))
    .filter((x) => x.doc)

  async function uploadPdf(e) {
    const file = e.target.files?.[0]
    if (!file || !timelineDoc) return
    const path = `${client.id}/docs/timeline-${Date.now()}.pdf`
    const { error } = await supabase.storage.from('client-uploads').upload(path, file, { contentType: 'application/pdf' })
    if (error) return setMsg('PDF upload failed.')
    await supabase.from('client_documents').update({ file_path: path }).eq('id', timelineDoc.id)
    setMsg('PDF attached ✓ — she sees it when no event timeline is published.')
    reload()
  }

  return (
    <div>
      <FormSection
        title="What she can see"
        hint="Guides publish automatically when the retainer arrives — only the ones that match what she booked. Tap View to see a document exactly as she does; the switch decides whether she can."
      >
        {shown.length === 0 ? (
          <p className="text-sm text-faint">No documents yet.</p>
        ) : (
          <div className="-mt-3">
            {shown.map(({ type, doc }) => (
              <div key={type} className="flex items-center justify-between gap-4 py-3 border-b border-line">
                <span className="text-sm text-dark min-w-0 flex-1">{DOC_LABELS[type]}</span>
                <Link
                  to={type === 'agreement' ? `/admin/clients/${client.id}?tab=agreement` : `/admin/clients/${client.id}/docs/${type}`}
                  className={quietBtn}
                  aria-label={`View ${DOC_LABELS[type].toLowerCase()}`}
                >
                  View
                </Link>
                <VisibleSwitch
                  on={!!doc.visible}
                  label={DOC_LABELS[type]}
                  onToggle={async () => {
                    await supabase.from('client_documents').update({ visible: !doc.visible }).eq('id', doc.id)
                    reload()
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection title="Timeline as a PDF (optional)" hint="Prefer your own document? Attach it here instead of building one in the Timeline tab.">
        {timelineDoc?.file_path && <p className="text-sm text-muted">A PDF is attached.</p>}
        <label className={`${btnClass('outline', 'sm')} self-start focus-within:ring-2 focus-within:ring-gold/40`}>
          {timelineDoc?.file_path ? 'Replace attached PDF' : 'Attach a PDF'}
          <input type="file" accept="application/pdf" className="sr-only" onChange={uploadPdf} />
        </label>
        <SaveNote error={isFailure(msg)}>{msg}</SaveNote>
      </FormSection>
    </div>
  )
}
