import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { FormSection } from '../../../shared/ui'

const DOC_LABELS = {
  agreement: 'Service agreement (signed copy)',
  timeline: 'Getting-ready timeline',
  hair_guide: 'Hair preparation guide',
  skin_guide: 'Skin preparation guide',
}

export default function DocsTab({ client, docs, reload }) {
  const [msg, setMsg] = useState('')
  const timelineDoc = docs.find((d) => d.doc_type === 'timeline')

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
        hint="Guides publish automatically when the retainer arrives — only the ones that match what she booked. You can always override here."
      >
        <div className="flex flex-col gap-3">
          {['agreement', 'timeline', 'hair_guide', 'skin_guide'].map((type) => {
            const doc = docs.find((d) => d.doc_type === type)
            if (!doc) return null
            return (
              <div key={type} className="flex items-center justify-between gap-3 border-b border-[#EFE6DA] pb-3">
                <span className="text-sm text-dark">{DOC_LABELS[type]}</span>
                <button
                  onClick={async () => {
                    await supabase.from('client_documents').update({ visible: !doc.visible }).eq('id', doc.id)
                    reload()
                  }}
                  className={`px-4 py-2 text-[10px] tracking-[0.2em] uppercase border transition-colors cursor-pointer ${
                    doc.visible ? 'border-gold bg-gold text-beige' : 'border-[#A89080] text-[#8A7A70]'
                  }`}
                >
                  {doc.visible ? 'Visible' : 'Hidden'}
                </button>
              </div>
            )
          })}
        </div>
      </FormSection>

      <FormSection title="Timeline as a PDF (optional)" hint="Prefer your own document? Attach it here instead of building one in the Timeline tab.">
        <label className="text-xs tracking-[0.15em] uppercase text-[#8A7A70] cursor-pointer hover:text-gold self-start">
          {timelineDoc?.file_path ? 'Replace attached PDF' : 'Attach a PDF'}
          <input type="file" accept="application/pdf" className="hidden" onChange={uploadPdf} />
        </label>
        {msg && <p className="text-gold text-sm">{msg}</p>}
      </FormSection>
    </div>
  )
}
