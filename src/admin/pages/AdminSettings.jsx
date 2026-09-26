import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../portal/AuthProvider'
import { AdminShell } from '../AdminShell'
import { Field, Btn, ErrorNote, FormSection, PasswordField } from '../../shared/ui'
import { PageHeader, SaveNote, isFailure } from '../adminUi'
import PriceListEditor from './PriceListEditor'

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
      <PageHeader
        eyebrow="Settings"
        title="How the portal runs"
        intro="Payment details, where alerts go, your standard prices, and your password."
      />

      <div className="max-w-2xl">
        <form onSubmit={saveBiz}>
          <FormSection title="Business">
            <Field
              label="E-transfer address shown to clients"
              type="email"
              value={etransfer}
              onChange={(e) => setEtransfer(e.target.value)}
              placeholder="payments@…"
            />
            <div className="flex flex-col gap-3">
              <Field
                label="Where submission alerts are emailed"
                type="email"
                value={notify}
                onChange={(e) => setNotify(e.target.value)}
                placeholder="you@…"
              />
              <p className="text-xs text-faint">New submissions and your copy of every invoice go here.</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <Btn type="submit" size="sm">Save</Btn>
              <SaveNote error={isFailure(bizMsg)}>{bizMsg}</SaveNote>
            </div>
          </FormSection>
        </form>

        <FormSection
          title="Price list"
          hint="Your standard prices. They fill in automatically when you add a service to a booking — you can still change any price per client."
        >
          <PriceListEditor />
        </FormSection>

        <form onSubmit={changePassword}>
          <FormSection title="Change your password">
            <PasswordField label="Current password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
            <PasswordField label="New password" required value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            <PasswordField label="Confirm new password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            <ErrorNote>{pwErr}</ErrorNote>
            <div className="flex items-center gap-4 flex-wrap">
              <Btn type="submit" size="sm" disabled={busy}>
                {busy ? 'Updating…' : 'Update password'}
              </Btn>
              <SaveNote>{pwMsg}</SaveNote>
            </div>
          </FormSection>
        </form>
      </div>
    </AdminShell>
  )
}
