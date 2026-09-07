import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, publicFetch } from '../../lib/supabaseClient'
import { Field, Btn, ErrorNote, DiamondRule, MicroLabel, Spinner, PasswordField } from '../../shared/ui'

// Invite registration: email prefilled & read-only, password entered twice.
export default function Join() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [info, setInfo] = useState(undefined)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    publicFetch('/api/invite-info', { token })
      .then(setInfo)
      .catch(() => setInfo({ valid: false }))
  }, [token])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('The two passwords don’t match.')
    setBusy(true)
    try {
      const { email } = await publicFetch('/api/accept-invite', { token, password })
      await supabase.auth.signInWithPassword({ email, password })
      navigate('/portal', { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-beige flex items-center justify-center px-5 font-body">
      <Helmet>
        <title>Welcome | Arsh Sandhu Allure</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="w-full max-w-sm py-16">
        <div className="text-center mb-10">
          <p className="font-heading text-2xl text-dark">Arsh Sandhu Allure</p>
          <MicroLabel className="mt-3">Your Client Portal</MicroLabel>
          <DiamondRule className="mt-6" />
        </div>

        {info === undefined ? (
          <Spinner />
        ) : !info.valid ? (
          <div className="text-center">
            <p className="text-sm text-[#7A6355] leading-relaxed">
              {info.registered
                ? 'Your portal is already set up — you can sign in below.'
                : 'This link is no longer active. Please ask Arsh for a fresh one — it only takes her a tap.'}
            </p>
            <Link to="/portal/login">
              <Btn variant="outline" className="mt-6">Go to Sign In</Btn>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-[#7A6355] mb-8 leading-relaxed">
              Welcome, <span className="font-heading italic text-dark">{info.firstName}</span> — choose a
              password and your portal is ready.
            </p>
            <form onSubmit={submit} className="flex flex-col gap-6">
              <Field label="Email" value={info.email} disabled />
              <PasswordField label="Choose a password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              <PasswordField label="Confirm password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              <ErrorNote>{error}</ErrorNote>
              <Btn type="submit" disabled={busy}>
                {busy ? 'Setting up…' : 'Create My Login'}
              </Btn>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
