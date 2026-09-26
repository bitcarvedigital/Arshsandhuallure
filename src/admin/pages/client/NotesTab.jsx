import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { Btn, FormSection } from '../../../shared/ui'
import { SaveNote } from '../../adminUi'

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
        aria-label="Private notes"
        className="w-full max-w-2xl rounded-2xl bg-surface px-5 py-4 text-sm leading-relaxed text-dark placeholder-faint focus:outline-none focus:ring-1 focus:ring-gold/40 resize-y"
      />
      <div className="flex items-center gap-4 flex-wrap">
        <Btn
          size="sm"
          onClick={async () => {
            const { error } = await supabase.from('admin_notes').update({ notes: text }).eq('client_id', clientId)
            setMsg(error ? 'Could not save.' : 'Saved ✓')
          }}
        >
          Save notes
        </Btn>
        <SaveNote error={msg === 'Could not save.'}>{msg}</SaveNote>
      </div>
    </FormSection>
  )
}
