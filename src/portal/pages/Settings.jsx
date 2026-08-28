import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import PortalShell from '../../shared/PortalShell'
import { Field, Btn, ErrorNote, DiamondRule, SectionHeading, MicroLabel } from '../../shared/ui'

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
      <SectionHeading eyebrow="Settings" title="Your details" className="mb-8" />

      <form onSubmit={saveContact} className="max-w-md flex flex-col gap-6">
        <MicroLabel>Contact</MicroLabel>
        <Field label="Name" value={client?.full_name || ''} disabled />
        <Field label="Email" value={client?.email || ''} disabled />
        <p className="text-xs text-[#8A7A70] -mt-4">
          Need a different name or email? Just message Arsh — she’ll update it for you.
        </p>
        <Field label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (000) 000-0000" />
        {contactMsg && <p className="text-gold text-sm">{contactMsg}</p>}
        <Btn type="submit" className="self-start">Save contact</Btn>
      </form>

      <DiamondRule className="my-10 max-w-md" />

      <form onSubmit={changePassword} className="max-w-md flex flex-col gap-6">
        <MicroLabel>Change password</MicroLabel>
        <Field label="Current password" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        <Field label="New password" type="password" required value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <Field label="Confirm new password" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        <ErrorNote>{pwErr}</ErrorNote>
        {pwMsg && <p className="text-gold text-sm">{pwMsg}</p>}
        <Btn type="submit" disabled={busy} className="self-start">
          {busy ? 'Updating…' : 'Update password'}
        </Btn>
      </form>
    </PortalShell>
  )
}
