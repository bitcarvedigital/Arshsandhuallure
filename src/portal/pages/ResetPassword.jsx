import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { Btn, ErrorNote, DiamondRule, MicroLabel, PasswordField } from '../../shared/ui'
import { resolveRole } from '../AuthProvider'

// Landing page for Supabase recovery links (session arrives via the URL hash).
// Afterwards each account goes to its own portal (studio or client) — older
// reset emails all point at /portal/reset, so the role decides, not the URL.
export default function ResetPassword({ admin }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('The two passwords don’t match.')
    setBusy(true)
    const { data, error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setBusy(false)
      setError('This reset link may have expired — please request a new one from the login page.')
      return
    }
    const role = await resolveRole(data.user?.id)
    setBusy(false)
    navigate(role.isAdmin && (admin || !role.client) ? '/admin' : '/portal', { replace: true })
  }

  return (
    <div className="min-h-screen bg-beige flex items-center justify-center px-5 font-body">
      <Helmet>
        <title>Reset Password | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="font-heading text-2xl text-dark">Arsh Sandhu Allure</p>
          <MicroLabel className="mt-3">{admin ? 'Studio · ' : ''}Choose a new password</MicroLabel>
          <DiamondRule className="mt-6" />
        </div>
        <form onSubmit={submit} className="flex flex-col gap-6">
          <PasswordField label="New password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <PasswordField label="Confirm new password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          <ErrorNote>{error}</ErrorNote>
          <Btn type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save & Sign In'}</Btn>
        </form>
      </div>
    </div>
  )
}
