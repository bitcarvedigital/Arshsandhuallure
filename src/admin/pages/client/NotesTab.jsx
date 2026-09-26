import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { Btn, FormSection } from '../../../shared/ui'

export default function NotesTab({ notes, clientId }) {
  const [text, setText] = useState(notes?.notes || '')
  const [msg, setMsg] = useState('')
  return (
    <FormSection title="Private notes" hint="Only you see this — never the client.">
      <textarea
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Preferences, reminders, anything worth remembering…"
        className="bg-[#FBF8F4] border border-[#C8B8AC] p-4 text-sm text-dark focus:outline-none focus:border-gold resize-y max-w-xl"
      />
      {msg && <p className="text-gold text-sm">{msg}</p>}
      <Btn
        className="self-start"
        onClick={async () => {
          const { error } = await supabase.from('admin_notes').update({ notes: text }).eq('client_id', clientId)
          setMsg(error ? 'Could not save.' : 'Saved ✓')
        }}
      >
        Save notes
      </Btn>
    </FormSection>
  )
}
