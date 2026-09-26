import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { Btn, ErrorNote, PasswordField } from '../../shared/ui'
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
    <div className="portal-ui min-h-screen bg-beige font-body flex flex-col items-center justify-center px-6 py-14">
      <Helmet>
        <title>Reset Password | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="w-full max-w-[360px]">
        {/* same header as the Login page */}
        <header className="text-center">
          <Link
            to="/"
            className="inline-block font-heading text-[20px] leading-tight tracking-[0.08em] pl-[0.08em] text-dark hover:text-gold transition-colors duration-300"
          >
            Arsh Sandhu Allure
          </Link>
          <h1 className="font-heading text-[2.6rem] leading-none text-dark mt-0">
            <em className="text-gold">New</em> Password
          </h1>
          <p className="text-sm text-muted mt-8">
            {admin ? 'Studio account — at least 8 characters.' : 'Use at least 8 characters.'}
          </p>
        </header>

        <form onSubmit={submit} className="mt-12 flex flex-col gap-7">
          <PasswordField label="New password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <PasswordField label="Confirm new password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          {error && (
            <div className="-my-2" role="status" aria-live="polite">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
          <Btn type="submit" disabled={busy} className="w-full mt-1">
            {busy ? 'Saving…' : 'Save & sign in'}
          </Btn>
        </form>
      </div>
    </div>
  )
}
