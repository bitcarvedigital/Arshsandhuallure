import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import PortalShell from '../../shared/PortalShell'
import { Field, Btn, ErrorNote, MicroLabel, FormSection, InfoRow, PasswordField } from '../../shared/ui'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

export default function Settings() {
  const { client, signOut, reloadClient } = useAuth()
  const [phone, setPhone] = useState(client?.phone || '')
  const [contactMsg, setContactMsg] = useState('')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function saveContact(e) {
    e.preventDefault()
    setContactMsg('')
    const { error } = await supabase.from('clients').update({ phone }).eq('id', client.id)
    if (error) setContactMsg('Could not save — please try again.')
    else {
      setContactMsg('Saved ✓')
      reloadClient()
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwErr('')
    setPwMsg('')
    if (next.length < 8) return setPwErr('New password must be at least 8 characters.')
    if (next !== confirm) return setPwErr('The two new passwords don’t match.')
    setBusy(true)
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: client.email,
      password: current,
    })
    if (reauthErr) {
      setBusy(false)
      return setPwErr('Your current password is incorrect.')
    }
    const { error } = await supabase.auth.updateUser({ password: next })
    setBusy(false)
    if (error) return setPwErr('Could not change the password — please try again.')
    setPwMsg('Password changed ✓')
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  return (
    <PortalShell title="Settings" nav={NAV} onSignOut={signOut}>
      <MicroLabel className="mb-2">Settings</MicroLabel>
      <h1 className="font-heading text-3xl text-dark">Your details</h1>

      <div className="mt-10 max-w-md">
        <form onSubmit={saveContact}>
          <FormSection title="Contact">
            <div>
              <InfoRow label="Name" value={client?.full_name || '—'} />
              <InfoRow label="Email" value={client?.email || '—'} />
              <p className="text-xs text-faint mt-3">
                Need a different name or email? Just message Arsh — she’ll update it for you.
              </p>
            </div>
            <Field label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (000) 000-0000" autoComplete="tel" />
            <div role="status" aria-live="polite" className="empty:hidden -my-2">
              {contactMsg && <p className="text-gold text-sm">{contactMsg}</p>}
            </div>
            <Btn type="submit" variant="outline" className="w-full sm:w-auto sm:self-start">Save phone</Btn>
          </FormSection>
        </form>

        <form onSubmit={changePassword}>
          <FormSection title="Change password" hint="At least 8 characters.">
            <PasswordField label="Current password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
            <PasswordField label="New password" required value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            <PasswordField label="Confirm new password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            <div role="status" aria-live="polite" className="empty:hidden -my-2">
              <ErrorNote>{pwErr}</ErrorNote>
              {pwMsg && <p className="text-gold text-sm py-2">{pwMsg}</p>}
            </div>
            <Btn type="submit" variant="outline" disabled={busy} className="w-full sm:w-auto sm:self-start">
              {busy ? 'Updating…' : 'Update password'}
            </Btn>
          </FormSection>
        </form>
      </div>
    </PortalShell>
  )
}
