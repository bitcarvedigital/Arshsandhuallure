import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../portal/AuthProvider'
import { AdminShell } from '../AdminShell'
import { Field, Btn, ErrorNote, DiamondRule, SectionHeading, MicroLabel, PasswordField } from '../../shared/ui'

export default function AdminSettings() {
  const { session } = useAuth()
  const [etransfer, setEtransfer] = useState('')
  const [notify, setNotify] = useState('')
  const [bizMsg, setBizMsg] = useState('')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['etransfer_email', 'notification_email'])
      .then(({ data }) => {
        for (const row of data || []) {
          if (row.key === 'etransfer_email') setEtransfer(row.value)
          if (row.key === 'notification_email') setNotify(row.value)
        }
      })
  }, [])

  async function saveBiz(e) {
    e.preventDefault()
    setBizMsg('')
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('app_settings').upsert({ key: 'etransfer_email', value: etransfer.trim() }),
      supabase.from('app_settings').upsert({ key: 'notification_email', value: notify.trim() }),
    ])
    setBizMsg(e1 || e2 ? 'Could not save.' : 'Saved ✓')
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwErr('')
    setPwMsg('')
    if (next.length < 8) return setPwErr('New password must be at least 8 characters.')
    if (next !== confirm) return setPwErr('The two new passwords don’t match.')
    setBusy(true)
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: session.user.email,
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
    <AdminShell title="Settings">
      <SectionHeading eyebrow="Studio Settings" title="How the portal runs" className="mb-8" />

      <form onSubmit={saveBiz} className="max-w-md flex flex-col gap-6">
        <MicroLabel>Business</MicroLabel>
        <Field
          label="E-transfer address shown to clients"
          type="email"
          value={etransfer}
          onChange={(e) => setEtransfer(e.target.value)}
          placeholder="payments@…"
        />
        <Field
          label="Where submission alerts are emailed"
          type="email"
          value={notify}
          onChange={(e) => setNotify(e.target.value)}
          placeholder="you@…"
        />
        {bizMsg && <p className="text-gold text-sm">{bizMsg}</p>}
        <Btn type="submit" className="self-start">Save</Btn>
      </form>

      <DiamondRule className="my-10 max-w-md" />

      <form onSubmit={changePassword} className="max-w-md flex flex-col gap-6">
        <MicroLabel>Change your password</MicroLabel>
        <PasswordField label="Current password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        <PasswordField label="New password" required value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <PasswordField label="Confirm new password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        <ErrorNote>{pwErr}</ErrorNote>
        {pwMsg && <p className="text-gold text-sm">{pwMsg}</p>}
        <Btn type="submit" disabled={busy} className="self-start">
          {busy ? 'Updating…' : 'Update password'}
        </Btn>
      </form>
    </AdminShell>
  )
}
